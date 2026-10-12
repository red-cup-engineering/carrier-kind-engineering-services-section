//! Harness — substrate vocabulary for publishing `.claude/` layouts.
//!
//! # What a harness is
//!
//! A **harness** is an external tooling integration — specifically
//! the `.claude/` directory structure that Claude Code and the
//! Claude Agent SDK consume. Substrate claims declare skills,
//! commands, agents, rules, hooks, settings, and docs; a publisher
//! port writes the corresponding files to disk.
//!
//! This module declares the vocabulary and a typed extraction view
//! ([`HarnessCollector`]). Actual file serialization (YAML
//! frontmatter, JSON hooks, JSON settings) is subprocess-binary
//! work — the library stays off-disk and serde-free.
//!
//! # Layout the publisher emits (reference)
//!
//! | Component subject | Path | Content |
//! |---|---|---|
//! | `harness-skill:<slug>` | `.claude/skills/<slug>/SKILL.md` | YAML frontmatter + markdown body |
//! | `harness-command:<slug>` | `.claude/commands/<slug>.md` | same shape |
//! | `harness-agent:<slug>` | `.claude/agents/<slug>.md` | same shape |
//! | `harness-rule:<slug>` | `.claude/rules/<slug>.md` | same shape |
//! | `harness-hook:<slug>` | `.claude/hooks/<slug>.json` | JSON (matcher, trigger, command) |
//! | `harness-setting:<key>` | merged into `.claude/settings.json` | JSON value |
//! | `harness-doc:<slug>` | project-root path from `has-deploy-path` | markdown body |

use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::path::PathBuf;

use async_trait::async_trait;
use mash_engine::algebra::Value;
use mash_engine::sdk::agent::{Agent, Projection};
use mash_engine::sdk::client::Claim;
use sha2::{Digest, Sha256};

use crate::foundation::{IS_A_PREDICATE, IS_A_TERM, QUALITY, RELATION, SPECIALIZES_AS};
use crate::operation::worker::{IS_READY_TO_RUN_ON_FILE, USES_FILE_WORKER};
use crate::operation::{FILE_FUNCTION, HAS_ARGUMENT, HAS_FUNCTION, OPERATION};
use crate::storage::{
    EXPECTS_OP_COUNT, FILE, FILE_CONTENT_KIND_UTF8, FILE_ENSEMBLE, FILE_MODE_OVERWRITE,
    HAS_CONTENT_KIND, HAS_INTENDED_SHA256, PART_OF_ENSEMBLE, TARGETS_FILE, WRITES_BODY,
    WRITES_MODE,
};

/// Owner identity.
pub const IDENTITY: &str = "mash-library-harness";

// ─────────────────────────────────────────────────────────────────────
// Terms
// ─────────────────────────────────────────────────────────────────────

/// A Claude Code skill. Subject form `harness-skill:<slug>`.
pub const HARNESS_SKILL: &str = "harness-skill";

/// A Claude Code slash-command.
pub const HARNESS_COMMAND: &str = "harness-command";

/// A Claude Code agent.
pub const HARNESS_AGENT: &str = "harness-agent";

/// A Claude Code rule / policy.
pub const HARNESS_RULE: &str = "harness-rule";

/// A Claude Code hook (matcher + trigger + command).
pub const HARNESS_HOOK: &str = "harness-hook";

/// A Claude Code settings key. Subject form
/// `harness-setting:<key>`.
pub const HARNESS_SETTING: &str = "harness-setting";

/// A project-root document deployed via the publisher.
pub const HARNESS_DOC: &str = "harness-doc";

// ─────────────────────────────────────────────────────────────────────
// Predicates
// ─────────────────────────────────────────────────────────────────────

/// `(component, has-name, string)` — display name. Defaults to slug
/// when absent. Canonical in [`crate::container`].
pub use crate::container::HAS_NAME;

/// `(component, has-description, string)` — one-line description.
/// Canonical in [`crate::container`].
pub use crate::container::HAS_DESCRIPTION;

/// `(component, has-body, markdown-string)` — body text.
pub const HAS_BODY: &str = "has-body";

/// `(component, has-allowed-tool, tool-name)` — multi-valued;
/// emitted sorted into frontmatter `allowed_tools`.
pub const HAS_ALLOWED_TOOL: &str = "has-allowed-tool";

/// `(agent, has-model, model-tier-string)` — agent's model tier.
pub const HAS_MODEL: &str = "has-model";

/// `(skill, has-activation, activation-string)` — skill activation
/// phrase / kind.
pub const HAS_ACTIVATION: &str = "has-activation";

/// `(hook, has-matcher, regex-or-glob)` — hook's matcher.
pub const HAS_MATCHER: &str = "has-matcher";

/// `(hook, has-trigger-event, event-name)` — hook's trigger event.
pub const HAS_TRIGGER_EVENT: &str = "has-trigger-event";

/// `(hook, has-command, shell-string)` — hook's command.
pub const HAS_COMMAND: &str = "has-command";

/// `(setting, has-setting-value, string)` — setting value. Stored
/// as a string; the publisher emits it as a JSON string.
pub const HAS_SETTING_VALUE: &str = "has-setting-value";

/// `(doc, has-deploy-path, path-string)` — relative filesystem path
/// within the project root where the doc should be written.
pub const HAS_DEPLOY_PATH: &str = "has-deploy-path";

// ─────────────────────────────────────────────────────────────────────
// Owner-agent
// ─────────────────────────────────────────────────────────────────────

/// Owner-agent declaring the harness vocabulary.
#[derive(Debug, Clone, Copy, Default)]
pub struct Harness;

#[async_trait]
impl Agent for Harness {
    fn identity(&self) -> &'static str {
        IDENTITY
    }

    fn claims(&self) -> Vec<Claim> {
        let mut out = Vec::new();
        for t in [
            HARNESS_SKILL,
            HARNESS_COMMAND,
            HARNESS_AGENT,
            HARNESS_RULE,
            HARNESS_HOOK,
            HARNESS_SETTING,
            HARNESS_DOC,
        ] {
            out.push(Claim::new(t, IS_A_TERM, IDENTITY));
        }
        // HAS_NAME and HAS_DESCRIPTION declared canonically by
        // crate::container; not redeclared here.
        for p in [
            HAS_BODY,
            HAS_ALLOWED_TOOL,
            HAS_MODEL,
            HAS_ACTIVATION,
            HAS_MATCHER,
            HAS_TRIGGER_EVENT,
            HAS_COMMAND,
            HAS_SETTING_VALUE,
            HAS_DEPLOY_PATH,
        ] {
            out.push(Claim::new(p, IS_A_PREDICATE, IDENTITY));
        }
        // OQRA.
        for p in [HAS_ALLOWED_TOOL, HAS_TRIGGER_EVENT] {
            out.push(Claim::new(p, SPECIALIZES_AS, RELATION));
        }
        for p in [
            HAS_BODY,
            HAS_MODEL,
            HAS_ACTIVATION,
            HAS_MATCHER,
            HAS_COMMAND,
            HAS_SETTING_VALUE,
            HAS_DEPLOY_PATH,
        ] {
            out.push(Claim::new(p, SPECIALIZES_AS, QUALITY));
        }
        out
    }
}

// ─────────────────────────────────────────────────────────────────────
// Typed component view
// ─────────────────────────────────────────────────────────────────────

/// Typed classification of a harness subject.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HarnessKind {
    /// `.claude/skills/<slug>/SKILL.md`.
    Skill,
    /// `.claude/commands/<slug>.md`.
    Command,
    /// `.claude/agents/<slug>.md`.
    Agent,
    /// `.claude/rules/<slug>.md`.
    Rule,
    /// `.claude/hooks/<slug>.json`.
    Hook,
    /// Merged into `.claude/settings.json`.
    Setting,
    /// Written to the project root at `has-deploy-path`.
    Doc,
}

impl HarnessKind {
    /// Infer from a subject's prefix.
    #[must_use]
    pub fn from_subject(subject: &str) -> Option<Self> {
        let prefix = subject.split(':').next()?;
        match prefix {
            "harness-skill" => Some(Self::Skill),
            "harness-command" => Some(Self::Command),
            "harness-agent" => Some(Self::Agent),
            "harness-rule" => Some(Self::Rule),
            "harness-hook" => Some(Self::Hook),
            "harness-setting" => Some(Self::Setting),
            "harness-doc" => Some(Self::Doc),
            _ => None,
        }
    }

    /// The slug portion of the subject (after the first `:`).
    #[must_use]
    pub fn slug(subject: &str) -> Option<&str> {
        subject.splitn(2, ':').nth(1)
    }
}

/// A fully-resolved harness component's typed contents.
///
/// Subscription ordering is irrelevant — [`HarnessCollector`]
/// accumulates cells for each subject into the appropriate field;
/// producing the [`HarnessComponent`] for a subject is deterministic
/// given its settled claim set.
#[derive(Debug, Clone, Default)]
pub struct HarnessComponent {
    /// `has-name` — falls back to slug if absent.
    pub name: Option<String>,
    /// `has-description`.
    pub description: Option<String>,
    /// `has-body` — markdown body text.
    pub body: Option<String>,
    /// `has-allowed-tool` — multi-valued; stored sorted.
    pub allowed_tools: BTreeSet<String>,
    /// `has-model` — agent-only.
    pub model: Option<String>,
    /// `has-activation` — skill-only.
    pub activation: Option<String>,
    /// `has-matcher` — hook-only.
    pub matcher: Option<String>,
    /// `has-trigger-event` — hook-only.
    pub trigger_event: Option<String>,
    /// `has-command` — hook-only.
    pub command: Option<String>,
    /// `has-setting-value` — setting-only.
    pub setting_value: Option<String>,
    /// `has-deploy-path` — doc-only.
    pub deploy_path: Option<String>,
}

/// A rendered harness artifact ready for a publisher to materialize.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RenderedHarnessFile {
    /// Source harness subject, e.g. `harness-doc:claude`.
    pub subject: String,
    /// Root-relative output path.
    pub path: PathBuf,
    /// Text content to write.
    pub body: String,
    /// SHA-256 of [`Self::body`], rendered as lowercase hex.
    pub sha256: String,
}

/// A harness component that could not be rendered.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HarnessRenderError {
    /// Source harness subject, reconstructed from kind + slug.
    pub subject: String,
    /// Human-readable reason.
    pub reason: String,
}

/// Rendered files plus non-fatal render errors.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct HarnessRenderReport {
    /// Files ready for publication.
    pub files: Vec<RenderedHarnessFile>,
    /// Components skipped because required fields were missing or
    /// the kind has not been implemented by the renderer yet.
    pub errors: Vec<HarnessRenderError>,
}

/// One file write that a harness publication intends to perform.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HarnessPublicationArtifact {
    /// Source harness subject, e.g. `harness-command:mash-orient`.
    pub source_subject: String,
    /// Deterministic storage file subject.
    pub file_subject: String,
    /// Deterministic operation subject for this write.
    pub operation_subject: String,
    /// Root-relative output path.
    pub path: PathBuf,
    /// Text content to write.
    pub body: String,
    /// SHA-256 of [`Self::body`].
    pub sha256: String,
}

/// A substrate-level publication intent for a harness snapshot.
///
/// The plan is still pure: it does not read or write disk. Its
/// `claims` are the important part: they model publication as file
/// operations inside a file ensemble, so the existing storage ports
/// can observe completion and content drift.
#[derive(Debug, Clone)]
pub struct HarnessPublicationPlan {
    /// Caller-supplied publication identity, usually an epoch or run id.
    pub publication_id: String,
    /// File ensemble that groups all artifact writes.
    pub ensemble_subject: String,
    /// Rendered artifacts with deterministic file/op identities.
    pub artifacts: Vec<HarnessPublicationArtifact>,
    /// Substrate claims declaring the publication intent.
    pub claims: Vec<Claim>,
    /// Non-fatal render errors from the source snapshot.
    pub errors: Vec<HarnessRenderError>,
}

/// Render a collector snapshot into root-relative files.
///
/// The renderer is pure: it does not inspect the filesystem and does
/// not write. A publisher binary decides whether and where to
/// materialize the returned files.
#[must_use]
pub fn render_components(
    components: &BTreeMap<(String, String), HarnessComponent>,
) -> HarnessRenderReport {
    let mut report = HarnessRenderReport::default();
    for ((kind, slug), component) in components {
        match render_component(kind, slug, component) {
            Ok(file) => report.files.push(file),
            Err(error) => report.errors.push(error),
        }
    }
    report
}

/// Render components and express the result as storage operations.
#[must_use]
pub fn plan_publication(
    components: &BTreeMap<(String, String), HarnessComponent>,
    publication_id: &str,
) -> HarnessPublicationPlan {
    let report = render_components(components);
    let ensemble_subject = format!("file-ensemble:harness-publish:{publication_id}");
    let mut artifacts = Vec::new();
    let mut claims = Vec::new();
    claims.push(Claim::new(&ensemble_subject, SPECIALIZES_AS, FILE_ENSEMBLE));
    claims.push(Claim::new(
        &ensemble_subject,
        EXPECTS_OP_COUNT,
        report.files.len().to_string(),
    ));

    for file in report.files {
        let path_key = file.path.to_string_lossy();
        let path_hash = sha256_hex(path_key.as_bytes());
        let file_subject = format!("file:harness:{path_hash}");
        let operation_subject = format!("op:harness-publish:{publication_id}:{path_hash}");

        claims.extend([
            Claim::new(&file_subject, SPECIALIZES_AS, FILE),
            Claim::new(&file_subject, HAS_CONTENT_KIND, FILE_CONTENT_KIND_UTF8),
            Claim::new(&file_subject, HAS_INTENDED_SHA256, &file.sha256),
            Claim::new(&operation_subject, SPECIALIZES_AS, OPERATION),
            Claim::new(&operation_subject, HAS_FUNCTION, FILE_FUNCTION),
            Claim::new(&operation_subject, HAS_ARGUMENT, path_key.as_ref()),
            Claim::new(&operation_subject, TARGETS_FILE, &file_subject),
            Claim::new(&operation_subject, USES_FILE_WORKER, &file_subject),
            Claim::new(&operation_subject, WRITES_BODY, &file.body),
            Claim::new(&operation_subject, WRITES_MODE, FILE_MODE_OVERWRITE),
            Claim::new(&operation_subject, PART_OF_ENSEMBLE, &ensemble_subject),
            Claim::new(&operation_subject, IS_READY_TO_RUN_ON_FILE, &file_subject),
        ]);

        artifacts.push(HarnessPublicationArtifact {
            source_subject: file.subject,
            file_subject,
            operation_subject,
            path: file.path,
            body: file.body,
            sha256: file.sha256,
        });
    }

    HarnessPublicationPlan {
        publication_id: publication_id.to_owned(),
        ensemble_subject,
        artifacts,
        claims,
        errors: report.errors,
    }
}

fn render_component(
    kind: &str,
    slug: &str,
    component: &HarnessComponent,
) -> Result<RenderedHarnessFile, HarnessRenderError> {
    let subject = subject_for(kind, slug);
    let path = match kind {
        "Skill" => PathBuf::from(format!(".claude/skills/{slug}/SKILL.md")),
        "Command" => PathBuf::from(format!(".claude/commands/{slug}.md")),
        "Agent" => PathBuf::from(format!(".claude/agents/{slug}.md")),
        "Rule" => PathBuf::from(format!(".claude/rules/{slug}.md")),
        "Doc" => component
            .deploy_path
            .as_ref()
            .map(PathBuf::from)
            .ok_or_else(|| HarnessRenderError {
                subject: subject.clone(),
                reason: "missing has-deploy-path".to_owned(),
            })?,
        "Hook" | "Setting" => {
            return Err(HarnessRenderError {
                subject,
                reason: "renderer does not yet support hooks/settings".to_owned(),
            });
        }
        other => {
            return Err(HarnessRenderError {
                subject,
                reason: format!("unknown harness kind {other}"),
            });
        }
    };

    let body = match kind {
        "Doc" => component.body.clone().ok_or_else(|| HarnessRenderError {
            subject: subject.clone(),
            reason: "missing has-body".to_owned(),
        })?,
        _ => render_frontmatter_markdown(slug, component),
    };
    let sha256 = sha256_hex(body.as_bytes());
    Ok(RenderedHarnessFile {
        subject,
        path,
        body,
        sha256,
    })
}

fn render_frontmatter_markdown(slug: &str, component: &HarnessComponent) -> String {
    let mut out = String::new();
    out.push_str("---\n");
    let name = component.name.as_deref().unwrap_or(slug);
    out.push_str("name: ");
    out.push_str(&yaml_string(name));
    out.push('\n');
    if let Some(description) = &component.description {
        out.push_str("description: ");
        out.push_str(&yaml_string(description));
        out.push('\n');
    }
    if let Some(model) = &component.model {
        out.push_str("model: ");
        out.push_str(&yaml_string(model));
        out.push('\n');
    }
    if let Some(activation) = &component.activation {
        out.push_str("activation: ");
        out.push_str(&yaml_string(activation));
        out.push('\n');
    }
    if !component.allowed_tools.is_empty() {
        out.push_str("allowed_tools:\n");
        for tool in &component.allowed_tools {
            out.push_str("  - ");
            out.push_str(&yaml_string(tool));
            out.push('\n');
        }
    }
    out.push_str("---\n\n");
    if let Some(body) = &component.body {
        out.push_str(body);
        if !body.ends_with('\n') {
            out.push('\n');
        }
    }
    out
}

fn subject_for(kind: &str, slug: &str) -> String {
    let prefix = match kind {
        "Skill" => "harness-skill",
        "Command" => "harness-command",
        "Agent" => "harness-agent",
        "Rule" => "harness-rule",
        "Hook" => "harness-hook",
        "Setting" => "harness-setting",
        "Doc" => "harness-doc",
        _ => "harness-unknown",
    };
    format!("{prefix}:{slug}")
}

fn yaml_string(s: &str) -> String {
    let escaped = s.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{escaped}\"")
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

/// Collector projection — accumulates harness cells into typed
/// `(kind, slug) → HarnessComponent` entries.
///
/// Consumers read [`HarnessCollector::components`] to get the current
/// snapshot. The publisher subprocess then serializes each entry to
/// its on-disk shape.
pub struct HarnessCollector {
    // `subject → HarnessComponent`.
    components: HashMap<String, HarnessComponent>,
}

impl Default for HarnessCollector {
    fn default() -> Self {
        Self::new()
    }
}

impl HarnessCollector {
    /// Fresh collector.
    #[must_use]
    pub fn new() -> Self {
        Self {
            components: HashMap::new(),
        }
    }

    /// Snapshot of every accumulated component, grouped by
    /// `(kind, slug)`. Sorted deterministically by kind + slug.
    #[must_use]
    pub fn components(&self) -> BTreeMap<(String, String), HarnessComponent> {
        let mut out: BTreeMap<(String, String), HarnessComponent> = BTreeMap::new();
        for (subject, comp) in &self.components {
            let Some(kind) = HarnessKind::from_subject(subject) else {
                continue;
            };
            let Some(slug) = HarnessKind::slug(subject) else {
                continue;
            };
            let kind_str = format!("{kind:?}");
            out.insert((kind_str, slug.to_owned()), comp.clone());
        }
        out
    }

    /// Retrieve the component for a given subject.
    #[must_use]
    pub fn component_for(&self, subject: &str) -> Option<&HarnessComponent> {
        self.components.get(subject)
    }

    fn apply(&mut self, subject: &str, predicate: &str, object: &str) {
        let entry = self.components.entry(subject.to_owned()).or_default();
        if predicate == HAS_NAME {
            entry.name = Some(object.to_owned());
        } else if predicate == HAS_DESCRIPTION {
            entry.description = Some(object.to_owned());
        } else if predicate == HAS_BODY {
            entry.body = Some(object.to_owned());
        } else if predicate == HAS_ALLOWED_TOOL {
            entry.allowed_tools.insert(object.to_owned());
        } else if predicate == HAS_MODEL {
            entry.model = Some(object.to_owned());
        } else if predicate == HAS_ACTIVATION {
            entry.activation = Some(object.to_owned());
        } else if predicate == HAS_MATCHER {
            entry.matcher = Some(object.to_owned());
        } else if predicate == HAS_TRIGGER_EVENT {
            entry.trigger_event = Some(object.to_owned());
        } else if predicate == HAS_COMMAND {
            entry.command = Some(object.to_owned());
        } else if predicate == HAS_SETTING_VALUE {
            entry.setting_value = Some(object.to_owned());
        } else if predicate == HAS_DEPLOY_PATH {
            entry.deploy_path = Some(object.to_owned());
        }
    }
}

impl Projection for HarnessCollector {
    fn identity(&self) -> &str {
        "mash-library-harness-collector"
    }

    fn subscriptions(&self) -> Vec<String> {
        vec![
            HAS_NAME.to_owned(),
            HAS_DESCRIPTION.to_owned(),
            HAS_BODY.to_owned(),
            HAS_ALLOWED_TOOL.to_owned(),
            HAS_MODEL.to_owned(),
            HAS_ACTIVATION.to_owned(),
            HAS_MATCHER.to_owned(),
            HAS_TRIGGER_EVENT.to_owned(),
            HAS_COMMAND.to_owned(),
            HAS_SETTING_VALUE.to_owned(),
            HAS_DEPLOY_PATH.to_owned(),
        ]
    }

    fn ingest(&mut self, subject: &str, predicate: &str, object: &str, value: Value) -> Vec<Claim> {
        if value != Value::True {
            return Vec::new();
        }
        // Only accumulate for subjects that look like harness
        // components. Other subjects using the same generic
        // predicates (e.g. the command module also has HAS_NAME via
        // grammar) don't belong here.
        if HarnessKind::from_subject(subject).is_none() {
            return Vec::new();
        }
        self.apply(subject, predicate, object);
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::operation::worker::{IS_READY_TO_RUN_ON_FILE, USES_FILE_WORKER};
    use crate::operation::{FILE_FUNCTION, HAS_ARGUMENT, HAS_FUNCTION};
    use crate::storage::{
        FileCounitPort, DIVERGED_BECAUSE, EXPECTS_OP_COUNT, HAS_DIVERGENCE_AT, HAS_INTENDED_SHA256,
        PART_OF_ENSEMBLE, TARGETS_FILE, WRITES_MODE,
    };

    fn has_claim(claims: &[Claim], subject: &str, predicate: &str, object: &str) -> bool {
        claims
            .iter()
            .any(|c| c.subject == subject && c.predicate == predicate && c.object == object)
    }

    #[test]
    fn vocabulary_declared() {
        let claims = Harness.claims();
        for t in [
            HARNESS_SKILL,
            HARNESS_COMMAND,
            HARNESS_AGENT,
            HARNESS_RULE,
            HARNESS_HOOK,
            HARNESS_SETTING,
            HARNESS_DOC,
        ] {
            assert!(
                claims
                    .iter()
                    .any(|c| c.subject == t && c.predicate == IS_A_TERM),
                "{t} missing"
            );
        }
    }

    #[test]
    fn kind_from_subject_infers_prefix() {
        assert_eq!(
            HarnessKind::from_subject("harness-skill:my-skill"),
            Some(HarnessKind::Skill)
        );
        assert_eq!(
            HarnessKind::from_subject("harness-hook:on-save"),
            Some(HarnessKind::Hook)
        );
        assert_eq!(HarnessKind::from_subject("unrelated:x"), None);
    }

    #[test]
    fn slug_extracts_after_first_colon() {
        assert_eq!(
            HarnessKind::slug("harness-skill:my-skill"),
            Some("my-skill")
        );
        assert_eq!(
            HarnessKind::slug("harness-setting:some-key"),
            Some("some-key")
        );
    }

    #[test]
    fn collector_accumulates_skill_fields() {
        let mut port = HarnessCollector::new();
        let subject = "harness-skill:test";
        let _ = port.ingest(subject, HAS_NAME, "Test Skill", Value::True);
        let _ = port.ingest(subject, HAS_DESCRIPTION, "A skill.", Value::True);
        let _ = port.ingest(subject, HAS_BODY, "body text", Value::True);
        let _ = port.ingest(subject, HAS_ALLOWED_TOOL, "Read", Value::True);
        let _ = port.ingest(subject, HAS_ALLOWED_TOOL, "Edit", Value::True);
        let _ = port.ingest(subject, HAS_ACTIVATION, "keyword", Value::True);
        let c = port.component_for(subject).unwrap();
        assert_eq!(c.name.as_deref(), Some("Test Skill"));
        assert_eq!(c.description.as_deref(), Some("A skill."));
        assert_eq!(c.body.as_deref(), Some("body text"));
        assert_eq!(c.activation.as_deref(), Some("keyword"));
        let tools: Vec<&String> = c.allowed_tools.iter().collect();
        assert_eq!(tools, vec![&"Edit".to_owned(), &"Read".to_owned()]);
    }

    #[test]
    fn collector_accumulates_hook_fields() {
        let mut port = HarnessCollector::new();
        let subject = "harness-hook:on-save";
        let _ = port.ingest(subject, HAS_MATCHER, "**/*.md", Value::True);
        let _ = port.ingest(subject, HAS_TRIGGER_EVENT, "PostToolUse", Value::True);
        let _ = port.ingest(subject, HAS_COMMAND, "format-md {file}", Value::True);
        let c = port.component_for(subject).unwrap();
        assert_eq!(c.matcher.as_deref(), Some("**/*.md"));
        assert_eq!(c.trigger_event.as_deref(), Some("PostToolUse"));
        assert_eq!(c.command.as_deref(), Some("format-md {file}"));
    }

    #[test]
    fn collector_accumulates_doc_deploy_path() {
        let mut port = HarnessCollector::new();
        let subject = "harness-doc:readme";
        let _ = port.ingest(subject, HAS_DEPLOY_PATH, "README.md", Value::True);
        let _ = port.ingest(subject, HAS_BODY, "# Hello", Value::True);
        let c = port.component_for(subject).unwrap();
        assert_eq!(c.deploy_path.as_deref(), Some("README.md"));
        assert_eq!(c.body.as_deref(), Some("# Hello"));
    }

    #[test]
    fn collector_ignores_non_harness_subjects() {
        let mut port = HarnessCollector::new();
        // `has-name` also used by grammar/talker; applied only to
        // harness-prefixed subjects.
        let _ = port.ingest("thing:42", HAS_NAME, "unrelated", Value::True);
        assert!(port.component_for("thing:42").is_none());
    }

    #[test]
    fn snapshot_groups_by_kind_and_slug() {
        let mut port = HarnessCollector::new();
        let _ = port.ingest("harness-skill:a", HAS_NAME, "A", Value::True);
        let _ = port.ingest("harness-command:b", HAS_NAME, "B", Value::True);
        let _ = port.ingest("harness-hook:c", HAS_COMMAND, "true", Value::True);
        let snap = port.components();
        assert!(snap.contains_key(&("Skill".to_owned(), "a".to_owned())));
        assert!(snap.contains_key(&("Command".to_owned(), "b".to_owned())));
        assert!(snap.contains_key(&("Hook".to_owned(), "c".to_owned())));
    }

    #[test]
    fn non_true_values_ignored() {
        let mut port = HarnessCollector::new();
        let _ = port.ingest("harness-skill:a", HAS_NAME, "A", Value::False);
        assert!(port.component_for("harness-skill:a").is_none());
    }

    #[test]
    fn render_doc_to_deploy_path() {
        let mut port = HarnessCollector::new();
        let _ = port.ingest(
            "harness-doc:claude",
            HAS_DEPLOY_PATH,
            "CLAUDE.md",
            Value::True,
        );
        let _ = port.ingest(
            "harness-doc:claude",
            HAS_BODY,
            "# Agent Guide\n",
            Value::True,
        );
        let report = render_components(&port.components());
        assert!(report.errors.is_empty());
        assert_eq!(report.files.len(), 1);
        let file = &report.files[0];
        assert_eq!(file.subject, "harness-doc:claude");
        assert_eq!(file.path, PathBuf::from("CLAUDE.md"));
        assert_eq!(file.body, "# Agent Guide\n");
        assert_eq!(file.sha256.len(), 64);
    }

    #[test]
    fn render_skill_frontmatter_with_sorted_tools() {
        let mut port = HarnessCollector::new();
        let subject = "harness-skill:repo-map";
        let _ = port.ingest(subject, HAS_NAME, "Repo Map", Value::True);
        let _ = port.ingest(subject, HAS_DESCRIPTION, "Find your way.", Value::True);
        let _ = port.ingest(subject, HAS_ALLOWED_TOOL, "Read", Value::True);
        let _ = port.ingest(subject, HAS_ALLOWED_TOOL, "Bash", Value::True);
        let _ = port.ingest(subject, HAS_BODY, "Use rg before grep.", Value::True);
        let report = render_components(&port.components());
        assert!(report.errors.is_empty());
        let body = &report.files[0].body;
        assert!(body.contains("name: \"Repo Map\""));
        assert!(body.contains("description: \"Find your way.\""));
        assert!(body.contains("  - \"Bash\"\n  - \"Read\""));
        assert!(body.ends_with("Use rg before grep.\n"));
    }

    #[test]
    fn render_doc_reports_missing_body() {
        let mut port = HarnessCollector::new();
        let _ = port.ingest(
            "harness-doc:claude",
            HAS_DEPLOY_PATH,
            "CLAUDE.md",
            Value::True,
        );
        let report = render_components(&port.components());
        assert!(report.files.is_empty());
        assert_eq!(report.errors.len(), 1);
        assert_eq!(report.errors[0].subject, "harness-doc:claude");
    }

    #[test]
    fn publication_plan_emits_storage_operation_claims() {
        let mut port = HarnessCollector::new();
        let _ = port.ingest(
            "harness-doc:claude",
            HAS_DEPLOY_PATH,
            "CLAUDE.md",
            Value::True,
        );
        let _ = port.ingest(
            "harness-doc:claude",
            HAS_BODY,
            "# Agent Guide\n",
            Value::True,
        );

        let plan = plan_publication(&port.components(), "run-1");

        assert!(plan.errors.is_empty());
        assert_eq!(plan.artifacts.len(), 1);
        assert_eq!(plan.ensemble_subject, "file-ensemble:harness-publish:run-1");
        assert!(has_claim(
            &plan.claims,
            &plan.ensemble_subject,
            EXPECTS_OP_COUNT,
            "1"
        ));

        let artifact = &plan.artifacts[0];
        assert_eq!(artifact.source_subject, "harness-doc:claude");
        assert_eq!(artifact.path, PathBuf::from("CLAUDE.md"));
        assert!(has_claim(
            &plan.claims,
            &artifact.operation_subject,
            HAS_FUNCTION,
            FILE_FUNCTION
        ));
        assert!(has_claim(
            &plan.claims,
            &artifact.operation_subject,
            HAS_ARGUMENT,
            "CLAUDE.md"
        ));
        assert!(has_claim(
            &plan.claims,
            &artifact.operation_subject,
            TARGETS_FILE,
            &artifact.file_subject
        ));
        assert!(has_claim(
            &plan.claims,
            &artifact.operation_subject,
            USES_FILE_WORKER,
            &artifact.file_subject
        ));
        assert!(has_claim(
            &plan.claims,
            &artifact.operation_subject,
            WRITES_MODE,
            FILE_MODE_OVERWRITE
        ));
        assert!(has_claim(
            &plan.claims,
            &artifact.operation_subject,
            IS_READY_TO_RUN_ON_FILE,
            &artifact.file_subject
        ));
        assert!(has_claim(
            &plan.claims,
            &artifact.operation_subject,
            PART_OF_ENSEMBLE,
            &plan.ensemble_subject
        ));
        assert!(has_claim(
            &plan.claims,
            &artifact.file_subject,
            HAS_INTENDED_SHA256,
            &artifact.sha256
        ));
    }

    #[test]
    fn publication_intent_composes_with_file_counit() {
        let mut collector = HarnessCollector::new();
        let _ = collector.ingest(
            "harness-doc:claude",
            HAS_DEPLOY_PATH,
            "CLAUDE.md",
            Value::True,
        );
        let _ = collector.ingest(
            "harness-doc:claude",
            HAS_BODY,
            "# Agent Guide\n",
            Value::True,
        );
        let plan = plan_publication(&collector.components(), "run-1");
        let artifact = &plan.artifacts[0];

        let mut counit = FileCounitPort::new().with_clock(|| "2026-04-29T00:00:00Z".to_owned());
        for claim in plan
            .claims
            .iter()
            .filter(|claim| claim.predicate == HAS_INTENDED_SHA256)
        {
            let _ = counit.ingest(&claim.subject, &claim.predicate, &claim.object, Value::True);
        }
        let out = counit.ingest(
            &artifact.file_subject,
            crate::storage::HAS_OBSERVED_SHA256,
            "definitely-not-the-rendered-hash",
            Value::True,
        );

        assert!(has_claim(
            &out,
            &artifact.file_subject,
            HAS_DIVERGENCE_AT,
            "2026-04-29T00:00:00Z"
        ));
        assert!(has_claim(
            &out,
            &artifact.file_subject,
            DIVERGED_BECAUSE,
            "content-hash-mismatch"
        ));
    }
}
