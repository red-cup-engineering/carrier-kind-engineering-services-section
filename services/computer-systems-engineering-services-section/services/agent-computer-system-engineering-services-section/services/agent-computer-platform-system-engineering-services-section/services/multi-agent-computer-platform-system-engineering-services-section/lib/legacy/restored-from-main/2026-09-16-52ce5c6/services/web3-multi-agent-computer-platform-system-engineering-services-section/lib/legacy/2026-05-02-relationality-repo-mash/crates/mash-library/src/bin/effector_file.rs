//! File effector — consumes ready file operations and materializes
//! their intended body under a configured repository root.
//!
//! # Configuration
//!
//! - `MASH_SOCKET` — hub socket path. Default `.mash/sock`.
//! - `MASH_FILE_ROOT` — root directory for relative file arguments.
//!   Default current directory.
//!
//! # Contract
//!
//! The effector subscribes to file operation intent:
//!
//! - `(op, has-argument, <root-relative-path>)`
//! - `(op, targets-file, <file-subject>)`
//! - `(op, writes-body, <utf8-body>)`
//! - `(op, writes-mode, file-mode:overwrite)`
//! - `(op, is-ready-to-run-on-file, <file-subject>)`
//!
//! Once all required cells are known, it writes via temp-file +
//! rename, then witnesses `has-intended-sha256`, `was-written-at`,
//! `is-completed`, and standard operation result cells. It rejects
//! absolute paths and parent-directory escapes.

use std::collections::{HashMap, HashSet};
use std::path::{Component, Path, PathBuf};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, bail, Context, Result};
use mash_engine::algebra::Value;
use mash_engine::sdk::client::{ClientConfig, Connection, Handle, InboundEvent};
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

use mash_library::operation::worker::IS_READY_TO_RUN_ON_FILE;
use mash_library::operation::{
    COMPLETED_AT, EXITED_WITH_CODE, HAS_ARGUMENT, IS_COMPLETED, IS_FAILED, IS_RUNNING,
    WROTE_STDERR, WROTE_STDOUT,
};
use mash_library::storage::{
    FILE_MODE_OVERWRITE, HAS_BYTE_LENGTH, HAS_INTENDED_SHA256, TARGETS_FILE, WAS_WRITTEN_AT,
    WRITES_BODY, WRITES_MODE,
};

#[derive(Debug, Clone, Default)]
struct FileIntent {
    path: Option<String>,
    file_subject: Option<String>,
    body: Option<String>,
    mode: Option<String>,
    ready: bool,
}

impl FileIntent {
    fn ready_job(&self) -> Option<FileJob> {
        if !self.ready {
            return None;
        }
        Some(FileJob {
            path: self.path.clone()?,
            file_subject: self.file_subject.clone()?,
            body: self.body.clone()?,
            mode: self.mode.clone()?,
        })
    }
}

#[derive(Debug, Clone)]
struct FileJob {
    path: String,
    file_subject: String,
    body: String,
    mode: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let socket_path =
        std::env::var_os("MASH_SOCKET").map_or_else(|| PathBuf::from(".mash/sock"), PathBuf::from);
    let root = std::env::var_os("MASH_FILE_ROOT").map_or_else(PathBuf::new, PathBuf::from);

    let client = ClientConfig {
        socket_path,
        identity: "mash-effector-file".to_owned(),
        version: env!("CARGO_PKG_VERSION").to_owned(),
        subscriptions: vec![
            HAS_ARGUMENT.to_owned(),
            TARGETS_FILE.to_owned(),
            WRITES_BODY.to_owned(),
            WRITES_MODE.to_owned(),
            IS_READY_TO_RUN_ON_FILE.to_owned(),
        ],
    };
    let mut connection = Connection::open(client)
        .await
        .context("open hub connection")?;
    let handle = connection.handle();
    info!(
        hub_session = connection.session(),
        root = %display_root(&root),
        "mash-effector-file ready"
    );

    let intents: Arc<Mutex<HashMap<String, FileIntent>>> = Arc::new(Mutex::new(HashMap::new()));
    let started: Arc<Mutex<HashSet<String>>> = Arc::new(Mutex::new(HashSet::new()));

    while let Some(event) = connection.next_event_or_shutdown().await {
        match event {
            InboundEvent::Settled { claim, .. } => {
                if claim.value != Value::True {
                    continue;
                }
                let op = claim.subject.clone();
                let maybe_job = {
                    let mut intents = intents.lock().await;
                    let intent = intents.entry(op.clone()).or_default();
                    if claim.predicate == HAS_ARGUMENT {
                        intent.path = Some(claim.object);
                    } else if claim.predicate == TARGETS_FILE {
                        intent.file_subject = Some(claim.object);
                    } else if claim.predicate == WRITES_BODY {
                        intent.body = Some(claim.object);
                    } else if claim.predicate == WRITES_MODE {
                        intent.mode = Some(claim.object);
                    } else if claim.predicate == IS_READY_TO_RUN_ON_FILE {
                        intent.ready = true;
                        if intent.file_subject.is_none() {
                            intent.file_subject = Some(claim.object);
                        }
                    }
                    intent.ready_job()
                };

                let Some(job) = maybe_job else {
                    continue;
                };
                if !started.lock().await.insert(op.clone()) {
                    continue;
                }

                let handle = handle.clone();
                let root = root.clone();
                tokio::spawn(async move {
                    run_op(&handle, &root, &op, job).await;
                });
            }
            InboundEvent::HubError { code, message } => {
                warn!(%code, %message, "hub reported error");
            }
            InboundEvent::Closed => break,
        }
    }
    Ok(())
}

async fn run_op(handle: &Handle, root: &Path, op: &str, job: FileJob) {
    let _ = handle.witness(op, IS_RUNNING, op);
    match write_job(root, &job).await {
        Ok(report) => {
            let now = iso_now();
            let _ = handle.witness(&job.file_subject, HAS_INTENDED_SHA256, &report.sha256);
            let _ = handle.witness(
                &job.file_subject,
                HAS_BYTE_LENGTH,
                &report.bytes.to_string(),
            );
            let _ = handle.witness(&job.file_subject, WAS_WRITTEN_AT, &now);
            let _ = handle.witness(op, WROTE_STDOUT, &report.path);
            let _ = handle.witness(op, EXITED_WITH_CODE, "0");
            let _ = handle.witness(op, COMPLETED_AT, &now);
            let _ = handle.witness(op, IS_COMPLETED, op);
        }
        Err(e) => {
            warn!(%op, error = %e, "file write failed");
            let _ = handle.witness(op, EXITED_WITH_CODE, "file-effector-failed");
            let _ = handle.witness(op, WROTE_STDERR, &e.to_string());
            let _ = handle.witness(op, IS_FAILED, op);
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct WriteReport {
    path: String,
    sha256: String,
    bytes: usize,
}

async fn write_job(root: &Path, job: &FileJob) -> Result<WriteReport> {
    if job.mode != FILE_MODE_OVERWRITE {
        bail!("unsupported file write mode {}", job.mode);
    }
    let target = checked_target_path(root, Path::new(&job.path))?;
    if let Some(parent) = target.parent().filter(|p| !p.as_os_str().is_empty()) {
        tokio::fs::create_dir_all(parent)
            .await
            .with_context(|| format!("create {}", parent.display()))?;
    }

    if matches!(
        tokio::fs::read_to_string(&target).await,
        Ok(existing) if existing == job.body
    ) {
        return Ok(WriteReport {
            path: target.display().to_string(),
            sha256: sha256_hex(job.body.as_bytes()),
            bytes: job.body.len(),
        });
    }

    let filename = target
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| anyhow!("invalid output path {}", target.display()))?;
    let tmp = target.with_file_name(format!(".{filename}.mash-tmp"));
    tokio::fs::write(&tmp, &job.body)
        .await
        .with_context(|| format!("write {}", tmp.display()))?;
    tokio::fs::rename(&tmp, &target)
        .await
        .with_context(|| format!("rename {} to {}", tmp.display(), target.display()))?;

    Ok(WriteReport {
        path: target.display().to_string(),
        sha256: sha256_hex(job.body.as_bytes()),
        bytes: job.body.len(),
    })
}

fn checked_target_path(root: &Path, relative: &Path) -> Result<PathBuf> {
    if relative.is_absolute() {
        bail!(
            "file operation path must be relative: {}",
            relative.display()
        );
    }
    for component in relative.components() {
        if matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        ) {
            bail!("file operation path escapes root: {}", relative.display());
        }
    }
    Ok(root.join(relative))
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut hex = String::with_capacity(digest.len() * 2);
    use std::fmt::Write as _;
    for b in digest {
        let _ = write!(hex, "{b:02x}");
    }
    hex
}

fn iso_now() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}")
}

fn display_root(root: &Path) -> String {
    if root.as_os_str().is_empty() {
        ".".to_owned()
    } else {
        root.display().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ready_job_waits_for_complete_intent() {
        let mut intent = FileIntent {
            path: Some("CLAUDE.md".to_owned()),
            file_subject: Some("file:x".to_owned()),
            body: Some("body".to_owned()),
            mode: Some(FILE_MODE_OVERWRITE.to_owned()),
            ready: false,
        };
        assert!(intent.ready_job().is_none());
        intent.ready = true;
        let job = intent.ready_job().unwrap();
        assert_eq!(job.path, "CLAUDE.md");
        assert_eq!(job.file_subject, "file:x");
    }

    #[test]
    fn target_path_rejects_escapes() {
        assert!(checked_target_path(Path::new("."), Path::new("CLAUDE.md")).is_ok());
        assert!(checked_target_path(Path::new("."), Path::new("../CLAUDE.md")).is_err());
        assert!(checked_target_path(Path::new("."), Path::new("/tmp/CLAUDE.md")).is_err());
    }

    #[tokio::test]
    async fn write_job_overwrites_under_root() {
        let root = std::env::temp_dir().join(format!(
            "mash-effector-file-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        let job = FileJob {
            path: "nested/out.txt".to_owned(),
            file_subject: "file:x".to_owned(),
            body: "hello\n".to_owned(),
            mode: FILE_MODE_OVERWRITE.to_owned(),
        };
        let report = write_job(&root, &job).await.unwrap();
        assert_eq!(report.bytes, 6);
        assert_eq!(
            tokio::fs::read_to_string(root.join("nested/out.txt"))
                .await
                .unwrap(),
            "hello\n"
        );
        let _ = tokio::fs::remove_dir_all(root).await;
    }
}
