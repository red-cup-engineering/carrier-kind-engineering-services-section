#!/usr/bin/env node
// Publishes content-addressed media into Google Drive, one folder per consumer, so people and
// Gemini Notebook read what the house made where they already work:
//   node publish-media.mjs --journal <generations.jsonl, or ~/...> --source <name>
//     [--remote "gdrive:561 Group/Media"] [--dry-run]
// A journal line (a MediaArtifactWorkCompletion) names its consumer and the file it produced as its
// resource ({ path, sha256, model, aspect }, with its media type on output); a line without a
// content-addressed file is skipped. Each consumer's files are copied to <remote>/<source>/<consumer>/ under their
// content-addressed names, and rclone skips a file Drive already holds, so a run is idempotent
// and costs only what is new. Beside them, manifest.jsonl lists each file with what made it
// (prompt, model, aspect, recordedAt), rewritten whole on each run that copied anything.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import process from "node:process";

const CONSUMER = /^[a-z0-9][a-z0-9-]*$/u;

/** The journal's publishable artifacts, grouped by consumer: the newest line per file wins. */
export function artifactsByConsumer(lines) {
  const byConsumer = new Map();
  for (const line of lines) {
    if (!line.trim()) continue;
    let record;
    try { record = JSON.parse(line); } catch { continue; }
    const output = record.resource;
    if (!CONSUMER.test(String(record.consumer ?? "")) || typeof output?.path !== "string" || !/^[0-9a-f]{64}$/u.test(String(output.sha256 ?? ""))) continue;
    if (!byConsumer.has(record.consumer)) byConsumer.set(record.consumer, new Map());
    byConsumer.get(record.consumer).set(output.sha256, {
      file: basename(output.path),
      path: output.path,
      sha256: output.sha256,
      ...(record.promptText ?? record.prompt ? { prompt: record.promptText ?? record.prompt } : {}),
      ...(output.model ? { model: output.model } : {}),
      ...(output.aspect ? { aspect: output.aspect } : {}),
      ...(record.output?.mimeType ? { mimeType: record.output.mimeType } : {}),
      ...(record.recordedAt ? { recordedAt: record.recordedAt } : {}),
    });
  }
  return byConsumer;
}

function rclone(args, run) {
  const result = run("rclone", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`rclone ${args[0]} exited ${result.status}: ${String(result.stderr ?? "").trim().split("\n").slice(-3).join(" | ")}`);
  return String(result.stderr ?? "") + String(result.stdout ?? "");
}

/** Copy each consumer's present files and its manifest to Drive; returns what each consumer sent. */
export function publishMediaToDrive({ journal, source, remote = "gdrive:561 Group/Media", dryRun = false, run = spawnSync }) {
  if (!CONSUMER.test(String(source ?? ""))) throw new TypeError("--source must name the media's source, such as flow");
  const byConsumer = artifactsByConsumer(readFileSync(journal, "utf8").split("\n"));
  const staging = mkdtempSync(join(tmpdir(), "drive-publish-"));
  const sent = [];
  try {
    for (const [consumer, artifacts] of byConsumer) {
      const present = [...artifacts.values()].filter((artifact) => existsSync(artifact.path));
      if (present.length === 0) continue;
      const roots = [...new Set(present.map((artifact) => dirname(artifact.path)))];
      const target = `${remote}/${source}/${consumer}`;
      let copied = 0;
      for (const root of roots) {
        const list = join(staging, `${consumer}.files`);
        writeFileSync(list, present.filter((artifact) => dirname(artifact.path) === root).map((artifact) => artifact.file).join("\n") + "\n");
        const said = rclone(["copy", root, target, "--files-from-raw", list, "--stats-one-line", "-v", ...(dryRun ? ["--dry-run"] : [])], run);
        copied += (said.match(/: Copied \(new\)|: Copied \(replaced/gu) ?? []).length;
      }
      if (copied > 0 && !dryRun) {
        const manifest = join(staging, "manifest.jsonl");
        writeFileSync(manifest, present.map(({ path: _path, ...entry }) => JSON.stringify(entry)).join("\n") + "\n");
        rclone(["copyto", manifest, `${target}/manifest.jsonl`], run);
      }
      sent.push({ consumer, target, files: present.length, copied });
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  return sent;
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

// A node job expands only {release}, so a journal under the host's home is named from "~/".
const homePath = (value) => value?.startsWith("~/") ? join(homedir(), value.slice(2)) : value;

if (import.meta.main) {
  const journal = homePath(option("--journal"));
  if (!journal) throw new Error("usage: publish-media.mjs --journal <generations.jsonl> --source <name> [--remote <rclone path>] [--dry-run]");
  const sent = publishMediaToDrive({ journal, source: option("--source"), remote: option("--remote"), dryRun: process.argv.includes("--dry-run") });
  process.stdout.write(`${JSON.stringify({ sent, copied: sent.reduce((total, entry) => total + entry.copied, 0) })}\n`);
}
