/**
 * Per-session play-state projection.
 *
 * Gamification is per-session, not shared: an operator runs several Claude
 * sessions at once, so a single world-aggregated level/xp is meaningless to any
 * one of them. The suit computes each session's game (its own operation slice
 * through `gameFor`) and projects it here as a small per-session state file, so
 * the statusLine and any reader gets this session's standing cheaply without
 * folding the whole 1.9MB operation ledger on every render. This is the
 * log→state shape: the ledger is the boundary, this is the bulk it determines,
 * scoped to one session.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { OperationLedgerGame } from "./operating/recording/operations/gaming/library/operation-ledger-game.mts";
import { slug } from "./records.mts";

const PLAY_STATE_DIR = "sites/ops.561.group/data/state/play";

export type SessionPlayState = Readonly<{
  kind: "operations-manifold.session.play";
  session: string;
  generatedAt: string;
  level: number;
  experience: number;
  toNext: number;
  mode: OperationLedgerGame["mode"];
  flow: OperationLedgerGame["flow"];
  badges: readonly string[];
  challenges: readonly string[];
  moves: number;
  ctxTokens: number;
}>;

export function sessionPlayPath(repoRoot: string, session: string): string {
  return path.join(repoRoot, PLAY_STATE_DIR, `${slug(session, "session", 80)}.json`);
}

export function writeSessionPlay(repoRoot: string, state: SessionPlayState): void {
  const file = sessionPlayPath(repoRoot, state.session);
  const tmp = `${file}.${process.pid}.tmp`;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(tmp, file);
}

export function readSessionPlay(repoRoot: string, session: string): SessionPlayState | null {
  try {
    return JSON.parse(readFileSync(sessionPlayPath(repoRoot, session), "utf8")) as SessionPlayState;
  } catch {
    return null;
  }
}
