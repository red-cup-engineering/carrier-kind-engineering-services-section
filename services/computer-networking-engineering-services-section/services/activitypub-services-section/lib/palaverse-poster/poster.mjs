#!/usr/bin/env node
// poster.mjs -- Palaverse daily poster for the 561 Group game actors on ap.561.group
// (crucible@ap.561.group, ruinfold@ap.561.group). Vision doc §5d: each game is an
// ActivityPub actor posting its daily seed, results, and replay links.
//
// Two job kinds, run by systemd user timers (see the .timer/.service units this ships with):
//
//   node poster.mjs crucible morning   one per UTC day, once the day's seed exists
//   node poster.mjs ruinfold morning   (dailySeed(today) is computable with no run needed)
//   node poster.mjs ruinfold evening   once the day closes -- reads the real public
//                                      leaderboard; unreachable/empty means skip-and-log,
//                                      never a fabricated or stale post (crucible has no
//                                      shared leaderboard yet, so no evening job for it)
//
// The morning job's seed computation is a PURE function of the UTC date string -- no
// game-server dependency, exactly the posture each game's own dailySeed() takes (house
// doctrine: never read the clock inside domain logic; the one clock read happens once, here,
// at the top of morningPost/eveningResults, matching crucible-service's daily.mts and
// ruinfold's engine/daily.mts). The formulas below are PORTED, not imported -- both games are
// private, unpublished apps with no package boundary to depend on; this follows the same
// vendoring discipline replay-spectacle's adapters/vendor/* headers and play.561.group's own
// js/today.mjs already use for the identical formulas. Provenance:
//
//   crucibleDailySeed  <- crucible-service/src/daily.mts:33 (`crucible-daily:<date>`, no hash)
//   ruinfoldDailySeed  <- ruinfold apps/ruinfold/src/engine/daily.mts:9-12 (sha256, first 4
//                         bytes big-endian)
//   ruinfoldFloorCount <- play.561.group/js/today.mjs:49-52's own port of
//                         apps/ruinfold/src/engine/{prng.mts,dungeon.mts} (mulberry32 + the
//                         first intBetween(rng,0,3) draw) -- verified there against a live
//                         GET /daily response (seed 0x8b8ad99c -> floorCount 6, 2026-08-19),
//                         copied here verbatim, same verified formula.
//
// Outbox mechanism: each actor's process (src/local-server.mjs from
// @red-cup-engineering/activitypub-services-section) now runs a LIVE outbox store
// (src/outbox-store.mjs) instead of the old static-file-read-once-at-boot loader, and exposes
// an authenticated publish route the store backs: POST /actors/{identifier}/outbox
// (provider.mjs's `publish()`). So "publish" here means: authenticate with the actor's own
// inbox bearer token (the same 0600 file src/server.mjs's readBearerToken / local-server.mjs's
// resolveBearerToken already persist at <dirname(ACTIVITYPUB_SQLITE_PATH)>/bearer-token) and
// POST one signed-shape Create{Note} to that route. The route appends it to the actor's durable
// outbox -- idempotent by activity id (`<actor>/posts/daily-<date>` or
// `<actor>/posts/results-<date>`), so running twice in one day is a no-op, not a duplicate post
// -- and, when the actor has followers, broadcasts the Create to every one of their inboxes
// (provider.mjs's sendActivityToFollowers, Fedify's own signing/queue/retry machinery). No
// systemd restart: the actor process serves the freshly published post immediately. This
// closes both gaps the live-deploy runbook's "Known limitations" section used to document --
// this file used to append to a local outbox JSON file directly and restart the actor's
// systemd unit to force a re-read, which neither delivered to followers nor made the post's own
// id dereferencable on its own (only the object dispatcher, wired in provider.mjs, does that).

import { sha256 } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/hash";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ACTIVITYSTREAMS_PUBLIC } from "../../src/activitystreams.mjs";

const ORIGIN = process.env.PALAVERSE_ORIGIN ?? "https://ap.561.group";
// Root of each actor's own state directory (keys, SQLite state, and the inbox/outbox bearer
// token) -- see the live-deploy runbook's "Actors" table and ops/palaverse-poster/README.md's
// own table for the exact box paths this defaults to.
const STATE_DIR_ROOT = process.env.PALAVERSE_STATE_DIR_ROOT
  ?? "/home/emsenn/info/lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-computer-services-section/services/computer-machine-services-section/services/persistent-computer-machine-services-section/services/bare-cedar-fog-services-section/data/runtime/share/emsenn";

const GAMES = Object.freeze({
  crucible: Object.freeze({
    identifier: "crucible",
    stateDir: path.join(STATE_DIR_ROOT, "activitypub-crucible"),
    playUrl: "https://crucible.561.group/web/index.html",
    displayName: "Crucible",
  }),
  ruinfold: Object.freeze({
    identifier: "ruinfold",
    stateDir: path.join(STATE_DIR_ROOT, "activitypub-ruinfold"),
    playUrl: "https://ruinfold.561.group/play",
    displayName: "Ruinfold Daily",
  }),
});

/** `YYYY-MM-DD` for `date`'s UTC calendar day -- timezone-independent by construction, the
 *  same formatter every game's own daily.mts uses. */
function utcDateString(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function crucibleDailySeed(dateStr) {
  return `crucible-daily:${dateStr}`;
}

function ruinfoldDailySeed(dateStr) {
  const digest = sha256(`ruinfold-daily:${dateStr}`);
  const seedInt = digest.readUInt32BE(0);
  return { hex: `0x${seedInt.toString(16).padStart(8, "0")}`, seedInt };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ruinfoldFloorCount(seedInt) {
  const rng = mulberry32(seedInt);
  return 4 + Math.floor(rng() * 4); // intBetween(rng, 0, 3), dungeon.mts's first draw
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function yesterdayOf(todayStr) {
  const d = new Date(`${todayStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDateString(d);
}

/** Honest, not assumed: only link yesterday's replay page if it is actually live right now.
 *  Omitted entirely (not a 404, not a guess) when it isn't -- per replay-spectacle's own
 *  README "Actor post shapes" spec. This is a check against the static replay storefront
 *  (play.561.group), not either game's own server -- the morning post's SEED computation
 *  above stays a pure, game-server-free function; this one optional enrichment is not that. */
async function liveReplayUrl(game, dateStr) {
  const url = `https://play.561.group/replays/${game}-daily-${dateStr}.html`;
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return response.ok ? url : null;
  } catch {
    return null;
  }
}

/** Read the actor's inbox/outbox bearer token fresh on every run (never cached, never logged) --
 *  the same 0600 file server.mjs's readBearerToken / local-server.mjs's resolveBearerToken
 *  persist at `<dirname(ACTIVITYPUB_SQLITE_PATH)>/bearer-token`. Reading it fresh means a
 *  rotated token (ACTIVITYPUB_ROTATE_BEARER_TOKEN, per the live-deploy runbook's "Bearer token"
 *  section) is picked up on the very next poster run with no separate config to update here. */
async function readBearerToken(stateDir) {
  const tokenPath = path.join(stateDir, "bearer-token");
  const token = (await readFile(tokenPath, "utf8")).trim();
  if (token.length < 32) throw new TypeError(`bearer token at ${tokenPath} is too short`);
  return token;
}

/** Publish one already-authored Create{Note} through the actor's own authenticated publish
 *  endpoint (@red-cup-engineering/activitypub-services-section's provider.mjs `publish()`,
 *  reached at `POST /actors/{identifier}/outbox`) -- not a local file write. That endpoint is
 *  the package's ONE place append-then-broadcast happens: it appends to the actor's durable
 *  outbox (idempotent by activity id) and, when the actor has followers, broadcasts the Create
 *  to every one of their inboxes, all before this function's response resolves. No systemd
 *  restart needed -- the actor process serves the freshly published post immediately. */
async function publishActivity({ identifier, stateDir, activity }) {
  const bearerToken = await readBearerToken(stateDir);
  const response = await fetch(`${ORIGIN}/actors/${identifier}/outbox`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${bearerToken}` },
    body: JSON.stringify(activity),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* non-JSON error body handled below */ }
  if (!response.ok) {
    throw new Error(`publish to ${identifier}'s outbox failed: HTTP ${response.status} ${text.slice(0, 500)}`);
  }
  if (body === null || typeof body.appended !== "boolean") {
    throw new TypeError(`publish to ${identifier}'s outbox returned an unexpected response: ${text.slice(0, 500)}`);
  }
  return body;
}

function buildCreateNote({ identifier, postId, publishedIso, contentHtml, url }) {
  const actor = `${ORIGIN}/actors/${identifier}`;
  const activityId = `${actor}/posts/${postId}`;
  const followers = `${actor}/followers`;
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: activityId,
    type: "Create",
    actor,
    published: publishedIso,
    to: [ACTIVITYSTREAMS_PUBLIC],
    cc: [followers],
    object: {
      id: `${activityId}#note`,
      type: "Note",
      attributedTo: actor,
      content: contentHtml,
      published: publishedIso,
      to: [ACTIVITYSTREAMS_PUBLIC],
      cc: [followers],
      ...(url === undefined ? {} : { url }),
    },
  };
}

async function morningPost(game) {
  const cfg = GAMES[game];
  if (!cfg) throw new TypeError(`unknown game: ${game}`);
  const today = utcDateString(new Date());
  const postId = `daily-${today}`;
  const publishedIso = new Date().toISOString();
  const replayUrl = await liveReplayUrl(game, yesterdayOf(today));
  const replayLine = replayUrl === undefined || replayUrl === null
    ? ""
    : `<p><a href="${replayUrl}">Yesterday's replay</a></p>`;

  let contentHtml;
  if (game === "crucible") {
    const seed = crucibleDailySeed(today);
    contentHtml = `<p><strong>Crucible &middot; ${today}</strong></p>`
      + `<p>Seed: <code>${escapeHtml(seed)}</code></p>`
      + `<p>Today's tangle is laid &mdash; fresh, unsettled, seed-locked. Settle it, or don't; the seed keeps either way.</p>`
      + `<p><a href="${cfg.playUrl}">Play</a></p>`
      + replayLine;
  } else if (game === "ruinfold") {
    const { hex, seedInt } = ruinfoldDailySeed(today);
    const floors = ruinfoldFloorCount(seedInt);
    contentHtml = `<p><strong>Ruinfold Daily &middot; ${today}</strong></p>`
      + `<p>Seed: <code>${escapeHtml(hex)}</code> &mdash; ${floors} floors down.</p>`
      + `<p>Floor one's open. Something's already awake. Go find out.</p>`
      + `<p><a href="${cfg.playUrl}">Play</a></p>`
      + replayLine;
  } else {
    throw new TypeError(`no morning-post template for ${game}`);
  }

  const activity = buildCreateNote({ identifier: cfg.identifier, postId, publishedIso, contentHtml, url: cfg.playUrl });
  const receipt = await publishActivity({ identifier: cfg.identifier, stateDir: cfg.stateDir, activity });
  return { game, mode: "morning", date: today, appended: receipt.appended, broadcast: receipt.broadcast, id: activity.id };
}

/** Results are for the day that JUST CLOSED, not whatever the clock reads right now -- per
 *  replay-spectacle's own spec: "Posted once the day is no longer 'today' ... the honest
 *  trigger is 'after UTC midnight, the next time anything touches the store'". This job is
 *  meant to run shortly after 00:00 UTC (see the shipped .timer unit), at which point
 *  yesterday-relative-to-the-clock IS the day that closed. */
async function eveningResults(game) {
  if (game !== "ruinfold") throw new TypeError("the evening-results job only exists for ruinfold (crucible has no shared leaderboard yet)");
  const cfg = GAMES.ruinfold;
  const target = yesterdayOf(utcDateString(new Date()));
  const postId = `results-${target}`;
  const publishedIso = new Date().toISOString();
  const boardUrl = `https://ruinfold.561.group/leaderboard/${target}`;

  let response;
  try {
    response = await fetch(boardUrl, { signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    return { game, mode: "evening", date: target, skipped: true, reason: `leaderboard unreachable: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (!response.ok) {
    return { game, mode: "evening", date: target, skipped: true, reason: `leaderboard returned HTTP ${response.status}` };
  }
  const body = await response.json();
  const entries = Array.isArray(body?.entries) ? body.entries : [];
  if (entries.length === 0) {
    return { game, mode: "evening", date: target, skipped: true, reason: "no scored runs that day" };
  }

  const top3 = [...entries].sort((a, b) => a.rank - b.rank).slice(0, 3);
  const lines = top3.map((e) => `<li>${escapeHtml(e.actor)} &mdash; ${e.score} (tick ${e.endedAtTick})</li>`).join("");
  const replayUrl = await liveReplayUrl(game, target);
  const replayLine = replayUrl === undefined || replayUrl === null
    ? ""
    : `<p><a href="${replayUrl}">Replay (#1)</a></p>`;
  const contentHtml = `<p><strong>Ruinfold &mdash; ${target} results</strong></p>`
    + `<ol>${lines}</ol>`
    + `<p><a href="${boardUrl}">Full board</a></p>`
    + replayLine;

  const activity = buildCreateNote({ identifier: cfg.identifier, postId, publishedIso, contentHtml, url: boardUrl });
  const receipt = await publishActivity({ identifier: cfg.identifier, stateDir: cfg.stateDir, activity });
  return { game, mode: "evening", date: target, appended: receipt.appended, broadcast: receipt.broadcast, id: activity.id };
}

async function main(argv) {
  const [game, mode] = argv;
  if (!game || !mode) {
    throw new TypeError("usage: poster.mjs <crucible|ruinfold> <morning|evening>");
  }
  const result = mode === "evening" ? await eveningResults(game) : await morningPost(game);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.skipped) process.exitCode = 0; // an honest skip is not a failure
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  utcDateString, crucibleDailySeed, ruinfoldDailySeed, ruinfoldFloorCount,
  morningPost, eveningResults, buildCreateNote, publishActivity, readBearerToken,
};
