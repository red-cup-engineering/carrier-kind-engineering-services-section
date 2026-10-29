#!/usr/bin/env node
/**
 * Operations Manifold statusLine — the idiomatic live HUD, per session.
 *
 * Claude Code invokes a statusLine command each render with a JSON payload on
 * stdin (session_id, model, workspace). Gamification is per-session — an operator
 * runs several Claude sessions at once — so this renders THIS session's play-state
 * (level, xp, Caillois mode, flow regime) from the small per-session play file the
 * suit projects, plus the session's open bound work. It reads only small projected
 * JSON (never the full ledger) so it stays fast, and degrades to a quiet line on
 * any error so it can never break the terminal.
 */
import fs from "node:fs";
import path from "node:path";

import { readSessionPlay } from "../src/play-state.mts";
import { repoRootFromModule } from "../src/runtime.mts";
import { readStdin } from "../src/script-stdio.mts";

const WORK_STATE = "sites/ops.561.group/data/state/work.json";

function sessionIdFrom(text) {
  try {
    const payload = JSON.parse(text);
    return typeof payload?.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}

function openWorkForSession(repoRoot, session) {
  try {
    const work = JSON.parse(fs.readFileSync(path.join(repoRoot, WORK_STATE), "utf8"));
    const items = Array.isArray(work?.items) ? work.items : [];
    if (session === null) return items.filter((item) => item?.status !== "complete").length;
    return items.filter((item) => item?.session === session && item?.status !== "complete").length;
  } catch {
    return 0;
  }
}

if (process.argv[1]?.endsWith("statusline.mjs")) {
  try {
    const repoRoot = repoRootFromModule(import.meta.url);
    const session = sessionIdFrom(await readStdin());
    const open = openWorkForSession(repoRoot, session);
    const play = session === null ? null : readSessionPlay(repoRoot, session);
    if (play === null) {
      process.stdout.write(`⛬ ops-manifold · work ${open} open\n`);
      process.exit(0);
    }
    const badges = Array.isArray(play.badges) ? play.badges.length : 0;
    const line = [
      `⛬ L${play.level} · ${play.experience}xp (${play.toNext}→)`,
      `${play.mode}/${play.flow}`,
      `${badges}🏅`,
      `work ${open} open`,
    ].join(" · ");
    process.stdout.write(`${line}\n`);
    process.exit(0);
  } catch {
    process.stdout.write("⛬ ops-manifold\n");
    process.exit(0);
  }
}
