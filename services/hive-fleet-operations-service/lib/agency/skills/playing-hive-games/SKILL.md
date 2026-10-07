---
name: playing-hive-games
description: "Claim a Hive game's ready rewards, or run its one admitted action this tick, for whichever fleet account the strategy config carries that game's lane."
closure-kind: process
requires-capabilities:
  - hive-game-holozing-rewards
  - hive-game-terracore-cycle
  - hive-game-dcrops-cycle
  - hive-game-workerbee-pool-audit
---

# Play the fleet's Hive games on schedule

1. Read a game's live position first: call the verb with `executeOne` omitted (or `false`). The
   operating account is resolved from `aagaard.config.json`'s per-account `lanes` — never name an
   account in code that calls these verbs.
2. When the read reports a ready claim, an eligible plant/harvest, or the one available battle,
   call the same verb again with `executeOne: true`.
3. Every claim, plant/harvest, and battle already reconciles against at least two independently
   observed chain providers before it reports success (`claimed-confirmed`, `confirmed`,
   `battle-won-confirmed`); a receipt with any other status did not change on-chain state and is
   not done.
4. This skill grants no vial-opening, no Splinterlands battle submission, and no dCity/HashKings
   NFT liquidation — those stay outside every verb this skill grants, because the underlying game
   packages (`holozing-services-section`, `splinterlands-services-section`, `dcity-services-section`,
   `hashkings-services-section`) never expose them in the first place.
5. `hive-game-workerbee-pool-audit` is read-only: it reports whether the pool has settled a new
   BEE distribution to the fleet's existing WORKERBEE delegation. It never stakes or delegates.

The historical timers wrote separate game JSONL files. On 2026-10-06, inspection found the remaining Workerbee timer inactive and its `aagaard/current` release missing; deployment must not be inferred from this skill.

`scripts/journal-game-tick.mjs --journal-root <persistent fleet data directory> --game <name> --account <account> -- <command>` receives a command result into the shared semantic journal under `aagaard.game-command.<game>`. The explicit root is host-owned. It preserves output and exit status; neither establishes settled income. Unparseable output remains unclassified, rather than being called a no-op. Old `--journal <jsonl>` launchers require migration before activation. Retain their existing files until necessary evidence has been received and verified. Receipt-specific settlement categories and retry prohibitions remain distinct from command observations.
