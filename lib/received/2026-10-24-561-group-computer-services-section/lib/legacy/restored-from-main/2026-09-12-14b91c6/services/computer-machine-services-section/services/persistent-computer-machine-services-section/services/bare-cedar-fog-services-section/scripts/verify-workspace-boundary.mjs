#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const home = homedir();
const violations = [];

const retiredHomeEntries = [
  "561",
  "aagaard",
  "backups",
  "backups-from-git",
  "dev",
  "info-history-backup.git",
  "infomaterial-live-backup-20260630-010840",
  "infomaterial-repair-20260630-010019",
  "ops",
  "sites",
  "src",
];

const retiredStateEntries = [
  [".config", "561-group"],
  [".config", "blockchain"],
  [".config", "red-cup-engineering"],
  [".local", "share", "561-group"],
  [".local", "share", "emsenn"],
  [".local", "share", "red-cup-engineering"],
  [".local", "state", "561-group"],
  [".local", "state", "emsenn"],
  [".local", "state", "union"],
];

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

for (const entry of retiredHomeEntries) {
  const path = join(home, entry);
  if (await exists(path)) violations.push(path);
}

for (const segments of retiredStateEntries) {
  const path = join(home, ...segments);
  if (await exists(path)) violations.push(path);
}

const userUnitDirectory = join(home, ".config", "systemd", "user");
if (await exists(userUnitDirectory)) {
  for (const entry of await readdir(userUnitDirectory, { withFileTypes: true })) {
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;
    const path = join(userUnitDirectory, entry.name);
    let text;
    try {
      text = await readFile(path, "utf8");
    } catch {
      continue;
    }
    if (/561-group|bare-cedar-fog|verdaccio|scheduled-activity-delivery/i.test(`${entry.name}\n${text}`)) {
      violations.push(path);
    }
  }
}

if (violations.length > 0) {
  console.error("Workspace-boundary violations:\n" + violations.map((path) => `- ${path}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Workspace boundary intact: no retired project-owned home state or installed project user units.");
}
