---
name: the-internal-web-server
description: How TAB grows a browser face without growing a second world-writer — the web is a THIRD transport on the existing single-writer daemon (alongside disk and TCP). A zero-dependency node:http layer (scripts/web.mjs) serves a paneled browser client, takes commands over POST /input (which only ENQUEUE on the same disk inbox the daemon drains), and streams the world back over two Server-Sent-Event channels: a per-session output+state mirror (/stream) and a topic-filtered structured world-event FIREHOSE (/events). Because the browser only enqueues, the single-writer invariant holds and packet arrival freezes into drain order exactly like TCP — replay stays byte-for-byte; SSE is a read-only mirror that cannot perturb the world. Grounded in scripts/web.mjs, scripts/serve.mjs (the sink/onEvent/runtime changes), scripts/_substrate.mjs (onAppend), being/doing/observing/streaming/scripts/events.mjs (#events), and the scripts/webclient/ client.
---

# The internal web server — a third transport on the single writer

## The idea

A MUD is an app, not a website. So when TAB grows a browser face, it does not become a web
app sitting in front of a game; it ships its own zero-dependency HTTP layer as a subsystem.
`scripts/web.mjs` opens the comment with that framing: web is "simply a THIRD transport on
the existing single-writer daemon (`serve.mjs`), alongside disk and TCP."

The diagram the file draws for itself:

```
browser  --POST /input-->  the same disk inbox the daemon drains  --tick/drain-->  world
browser  <--SSE /stream--  the session's output + perception (an attached output SINK)
anyone   <--SSE /events--  a structured world-event FIREHOSE (#events), topic-filtered
```

The whole design turns on one invariant, stated in the file's own words: "Because the browser
only ENQUEUES to the same queue the daemon drains, the single-writer invariant holds and packet
arrival is frozen into drain order exactly like TCP — replay stays byte-for-byte. SSE is a
read-only mirror; it cannot perturb the world."

That is the key idea. The browser never writes the world. It drops a line on
`.inbox/<session>.jsonl` — the same file a `telnet` client's line lands in — and the daemon, the
**sole world-writer** (the framing from [the living server](the-living-server.md)), drains it in
the same fixed total order it already uses. Everything flowing the other way — out over SSE — is
a read of state the daemon already settled. A connected browser, a connected bot, a thousand
dashboards: none of them can move HEAD. The only nondeterministic input (packet arrival) is frozen
into the drain order once, exactly as it was for TCP, so the web changes nothing about replay.

## The HTTP surface

`webServe({ root, httpPort, ... })` wraps `serve()` and adds a `node:http` server. Zero
dependencies: `node:http` / `fs` / `crypto` only. The surface is small:

- **`GET /`, `/app.js`, `/style.css`, `/favicon.ico`** — the static browser client, served from
  `scripts/webclient/` with a path-traversal guard and an in-memory file cache.
- **`POST /session`** `{ name, secret? }` — resume-or-create a player via the daemon's `login`,
  and mint an in-memory token. Returns `{ session, token }`.
- **`POST /input`** `{ token, line }` — look the token up to its session id, then `enqueue` the
  line on that session's disk inbox. Returns `202`. This is the only write path, and it writes
  nothing to the world — it appends to the queue the daemon drains.
- **`GET /stream?token=…`** — the per-session SSE channel (below).
- **`GET /events?topics=…`** — the world-event firehose SSE channel (below).

The programmatic form `webServe({ root, httpPort, autostart:false })` keeps the HTTP listener up
but lets a caller drive `server.drainOnce()` by hand — that is how `tests/prove-web.mjs` exercises
the whole thing deterministically over real HTTP.

## The two SSE channels

There are two different streams, and the distinction matters.

### `/stream` — the session's own output + structured state

This is the channel a player's browser holds open. It carries two event kinds:

- **`out`** — each line of the session's command output and its perception delta, the same lines a
  `telnet` client would see. It is wired in as an **output SINK**: `{ kind:"sse", send(lines) }`,
  registered in the daemon's mirror exactly like a TCP socket (see the sink generalization below).
  On connect the client also gets an initial `out` that renders the room as prose (`renderRoom`), so
  a connecting player immediately *sees* where they are.
- **`state`** — a structured snapshot of the session's situation (room / exits / people / things /
  inventory / vitals), via `makeSession.snapshot()` surfaced as `server.snapshotState`. It refreshes
  after every output burst and on a periodic keep-alive, so the panels track the world even as
  vitals decay between commands.

`/stream` is per-token and read-only: it mirrors what the daemon already wrote for that one session.

### `/events` — the structured world-event firehose

This is the omniscient channel. `GET /events?topics=market,combat` opens an SSE stream of
**structured world-events** — not one player's view, but the world reacting. Each cycle the daemon
hands the web server the rows it appended; the server projects them through `#events`
(`worldEvents`) into JSON events, and fans each to every subscriber whose topic filter matches (an
empty filter means everything). A subscriber filters on the coarse `topic` (`world` / `chat` /
`combat` / `market`) or on a fine `type`.

This is the door. A trading bot subscribes to `/events?topics=market` for the price/coin signals
and acts by `POST /input` — no browser, no scraping, just the same two endpoints the client uses.
`scripts/web-bot-example.mjs` is exactly that, in ~80 lines, zero deps: it logs in, watches the
market firehose, and buys on a timer, proving the door swings. The same machinery is the seam for
dashboards, and — designed but **not built** — an MCP surface: an agent over `/events` + `/input` is
the same shape as the bot.

## The structured event taxonomy (`#events`)

`being/doing/observing/streaming/scripts/events.mjs` is the **wire format**. It nests under
`observing/` as a sibling of `storylog` and `perceiving`: it reads being's residue (the rows a tick
appended) into a derived view and **adds no column, appends no row**. Where `storylog` ranks a whole
world's tellable incidents and `perceive` renders one observer's "you see / you hear" delta,
`worldEvents` is the **omniscient** projection of a single cycle's rows.

Every event is `{ type, topic, ...fields, t }`. The fine types, read straight off the trace shapes
the rest of the engine already writes:

- **`tick`** (world) — a dimension's clock advanced.
- **`say`** (chat) — an utterance entity (`utt:…`), its `spoken-by` / `saying` / optional `told-to`
  / `located-in` cells grouped by the id they share.
- **`emote`** (chat) — an emote entity (`emote:…`).
- **`move`** (world) — an actor's `located-in`. Non-actor ids (`utt:` / `emote:` / `letter:` /
  `mbox:` / `corpse:` / `made:`) are filtered cheaply by prefix; with a `root` available it
  additionally confirms a `mover` cell so an item set down in a room is **not** narrated as a move.
- **`combat`** (combat) — an `injury:<part>` row, with the attacker recovered from the reified
  `enacted-by` row that attributes it.
- **`death`** (combat) — a `dead:true` row.
- **`price`** / **`coin`** (market) — `price` / `amount` / `coin` rows: the market signals a bot trades on.
- **`top`** (world) — *uniquely TAB.* When a `root` is given, each subject that got a row this cycle
  is settled, and any settled cell that `isTop` is streamed as a contradiction-as-a-value:
  `{ type:"top", entity, predicate, object }`. A contested cell is **⊤**, on the wire, as a first-class
  event — not an error.

`EVENT_TOPICS` is frozen, so the coarse vocabulary a subscriber filters on is fixed. And the whole
projection is **deterministic**: a pure function of the input rows (plus, with a root, a settle for ⊤
and the mover confirmation), no `Date.now` / `Math.random`, events returned in input order with ties
broken by type then entity — so the same cycle streams byte-identically on replay. The firehose is a
**fold over the append-only log**.

## What changed in the daemon (`serve.mjs`)

The web server adds almost no new mechanism; it generalizes what `serve.mjs` already had:

- **Sinks.** The TCP output mirror was generalized from "a socket" to a pluggable **sink**:
  `{ kind, send(lines), raw? }`. The drain mirrors each session's output to every attached sink; TCP
  and SSE both `attach` here. "A sink is the generalization of 'a socket'." The disk log stays the
  source of truth; sinks are a read-only mirror.
- **The `onEvent` firehose hook.** When (and only when) a watcher is registered, the daemon collects
  **every** row appended during a cycle and hands them to `onEvent({ tick, rows })` at the end of the
  cycle. With no watcher it costs nothing. A throwing watcher "must not break the world" — it is pure
  observation.
- **`onAppend` (`scripts/_substrate.mjs`).** The collection above rides a new read-only append
  listener: `onAppend(root, fn)` calls `fn(row)` for every row appended to a world and returns an
  unsubscribe. It is, in the file's words, "a pure side-effect: they never touch the log, so
  determinism and replay are unaffected (a replay simply doesn't register them)." It is a side-channel,
  not world state.
- **`snapshotState`.** `makeSession.snapshot()` surfaced on the server as `snapshotState(sessionId)` —
  the structured room/exits/people/things/inventory/vitals reading the `/stream` `state` event carries.
- **The runtime-view acceleration.** The daemon now registers the in-memory materialized runtime view
  (`loadRuntime`, via `useRuntime`) around its tick loop. The view is **derived** — the on-disk logs
  stay the single source of truth — so it is purely opt-in, and every test that registers no view hits
  disk exactly as before. With it registered the hot reads delegate to RAM, which is what makes a tick
  about 140ms instead of about 2s. (Dropped on stop; the disk log remains authoritative.)

## Token identity (RAM-only, replay-safe)

A browser proves identity by carrying a token. Tokens are an **in-memory** map `token -> sessionId`,
minted with `crypto.randomBytes`. They "live in RAM ONLY, never on the EAVT log, so they do not affect
determinism or replay." Login is the daemon's resume-or-create; the token is just a handle the browser
holds to address its session over HTTP. Because no token ever touches the trace, a replay is
byte-identical whether it was first driven by telnet, by curl, or by the browser.

## The browser client

`scripts/webclient/{index.html,app.js,style.css}` is a zero-build, paneled browser client on a
nautical theme: a vitals header with bars, a clickable room with its exits and the people in it,
inventory and character panels, and a "harbor-wire" ticker fed by the `/events` firehose. It speaks
only the surface above — `POST /session`, `POST /input`, and the two SSE streams — so it is no more
privileged than the example bot.

## What's uniquely TAB here

The firehose is not a message bus bolted on the side. It is a **fold over the append-only log**: the
rows a cycle appended, projected by a pure function into structured events. It is **deterministic** —
the same cycle streams byte-identically on replay. And it carries TAB's bilattice honestly to the
wire: a **contested cell is ⊤**, streamed as a first-class `top` event rather than collapsed or
errored. The web face inherits every property of the substrate because it never steps outside it.

## What's still thin / next (intent, not fact)

- **No MCP yet.** The MCP surface is *designed* — an agent over `/events` + `/input` is the same shape
  as `web-bot-example.mjs` — but it is **not built**. The seam exists; the adapter does not.
- **Auth is name-only.** `/session` takes a `name` and an optional `secret`, and `serve.mjs` leaves the
  `account` / hashed-`secret` hook, but nothing beyond the name gates a session today. Tokens are
  RAM-only and unsigned.
- **Combat is single-round.** A `combat` event is a strike resolved in one settling; sustained,
  multi-round fights are not part of this surface.
- **The drawn map is deferred.** The client renders the room, its exits, and who is present as text and
  clickable lists; an actual drawn map of the world is not built yet.
