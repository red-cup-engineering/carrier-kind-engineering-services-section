# ops.561.group MCP gateway service

This package is the deployment-specific admission and reverse-proxy membrane for the MetroPlat MCP resource at `https://ops.561.group/mcp`. It admits an allowlist of principals — the bootstrap Google identity, Hive Keychain accounts, and any further human or machine principal in `principals.json` — and transparently proxies admitted requests to the loopback-only MetroPlat provider. It is not itself an ERP, an orchestration engine, or a generic MCP transport library.

`/login` renders a chooser offering **Sign in with Hive Keychain first**; Google remains reachable at `/login/google` but is never the default, and a deployment may configure either login path or both (see `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` below).

The reusable HTTP server, OAuth, guard, response, and composition behavior remains in the existing `@red-cup-engineering/*` packages. This package composes those pieces around the `ops.561.group` deployment boundary recovered from Cold Red Gate.

## Contract

- OAuth registration, authorization, callback, token, revocation, and discovery metadata remain public.
- `/healthz` is public and contains no credentials or operator identity.
- `/mcp` and descendants require a bearer token whose principal is admitted. Two principal kinds
  are admitted:
  - **email** — a human, authenticated through the existing Google authorization_code+PKCE
    browser flow, whose verified email is `OPS_MCP_ALLOWED_EMAIL` or a `{kind:"email", email}`
    entry in `principals.json`.
  - **client** — a machine actor, authenticated with the `client_credentials` grant
    (`POST /oauth/token`, `client_secret_post`) against a `{kind:"client", clientId, actor,
    secretHash, secretSalt}` entry in `principals.json`. The minted bearer token carries an
    `actor` claim (an `actor:` URN) instead of an email, and the same bearer guard admits it
    alongside the email path — both kinds gate every guarded route identically.
- The browser session cookie (`__Host-ops_session`) admits the HTML control-plane views
  (`/tasks/view`, `/books/view`) through either of two independent sign-in paths, both landing on
  the same session cookie:
  - **Hive Keychain** (`GET /login/hive`, offered first at `/login`) — a server-rendered,
    no-external-assets page that mints a one-time nonce (persisted under
    `OPS_MCP_STATE_DIR/hive-login-nonces.json`) and asks the Hive Keychain browser extension
    (`window.hive_keychain.requestSignBuffer`) to sign a login challenge
    (`{username, type:"login", app:"ops.561.group", expiry, nonce}`, SHA-256 of the UTF-8 text,
    per Hive Keychain's own `signBuffer` convention). `POST /login/hive/callback` consumes the
    nonce exactly once, verifies the signature and the account's live posting/active authority
    through `@red-cup-engineering/verify-hive-signed-message-service` (cross-read from two public
    Hive JSON-RPC nodes), and — only for an account already admitted as a `{kind:"hive", account}`
    entry in `principals.json` — establishes the session cookie; otherwise a bounded `403` names
    the refusal reason. Keychain injects `window.hive_keychain` asynchronously after the page's
    `load` event fires, not while it parses, so the page waits for `load` and then polls for the
    global every 100ms for up to 3s before enabling the sign-in button — the same wait-then-poll
    shape (there tuned 500ms/15s) as the `hive-keychain` org's own `keychain-sdk-playground`
    (`waitForKeychain`, `src/utils/utils.ts`: "Waits for Keychain to be injected (hive_keychain on
    window). Polls at intervals to handle mobile webview where injection can be delayed."),
    https://github.com/hive-keychain/keychain-sdk-playground/blob/main/src/utils/utils.ts,
    observed 2026-09-05.
  - **Google** (`GET /login/google`, reachable from the `/login` chooser but never the default) —
    the existing Google authorization_code+PKCE browser flow, admitting `OPS_MCP_ALLOWED_EMAIL` or
    a `{kind:"email", email}` `principals.json` entry.
  - `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are all-or-none, like the ActivityPub settings below,
    and are no longer unconditionally required: a deployment configures Google credentials, an
    admitted Hive principal in `principals.json`, or both — never neither. `scripts/admit-principal.mjs
    --hive <account>` admits a Hive account the same way `--email`/`--actor` admit the other kinds.
  `principals.json` lives in `OPS_MCP_STATE_DIR`, alongside OAuthServer's own `clients.json` and
  `tokens.json`; `scripts/admit-principal.mjs` and `scripts/revoke-principal.mjs` are the only
  writers. `OPS_MCP_ALLOWED_EMAIL` remains the bootstrap human principal on its own, with no
  `principals.json` entry required, so an existing deployment keeps working unchanged.
- `/oauth/token` advertises and accepts `authorization_code`, `refresh_token`, and
  `client_credentials`; dynamic client registration (`/oauth/register`) stays public-PKCE-client
  only — a confidential machine client is admitted only through `admit-principal.mjs`, never
  through dynamic registration.
- `/operations` is the same bearer-gated HTTP-only operation surface. Its fixed bootstrap allowlist exposes descriptors and executes only those descriptors; callers cannot import modules or register operations. MetroPlat’s MCP apex remains its own induced operation family (`apps/metroplat/src/apps/infograph/catalog.mts`); this gateway preserves the existing `/mcp` proxy rather than adding a second JSON-RPC server.
- The upstream must be an uncredentialed HTTP origin on `127.0.0.1` or `::1`.
- The proxy removes bearer credentials, hop-by-hop headers, and headers nominated by `Connection`; response bodies remain streamed.
- No operator email, client secret, or bearer token has a source-code default. A machine client's
  secret is shown once, at admission time, and only its scrypt hash is ever persisted.
- ActivityPub is disabled by default. When all five explicit actor settings (`ACTIVITYPUB_ORIGIN`,
  `ACTIVITYPUB_IDENTIFIER`, `ACTIVITYPUB_ACTOR_NAME`, `ACTIVITYPUB_ACTOR_SUMMARY`, and
  `ACTIVITYPUB_KEYS_PATH`) are present, the gateway mounts the provider's exact WebFinger,
  NodeInfo, inbox, actor, outbox, follower, and post routes on this same listener before the
  OAuth-guarded routes. Fedify owns those responses and its queue worker; this gateway neither
  implements the protocol nor opens a second listener. Its SQLite runtime defaults to
  `OPS_MCP_STATE_DIR/activitypub.sqlite`, and partial ActivityPub configuration refuses startup.
- This package mounts the MetroPlat work reading, gated by the exact same bearer check as `/mcp`:
  - `GET /tasks` — canonical `{ endeavor, campaign, project, plan, task, work-item }` hierarchy, dependencies, structural readiness, coordination, duties, and milestone state read on demand through the same loopback MetroPlat MCP provider. The gateway calls the provider's `agent-work-dispatch`, `work-item`, and `milestone` tools; it does not infer tasks from prose or maintain a second task database.
  - `GET /tasks/view` — the same canonical reading as a server-rendered HTML work-spine and milestone page.
  - `GET /books` — the standard set of ledger readings (balance sheet, income statement, the reconcile worklist, stats, accounts) read on demand through the same loopback MetroPlat MCP provider's `ledger-readings` tool. The reconcile worklist carries the house's five verdicts (agreed, mismatch, posted-only, asserted-only, inactive) — the beat over Fava, which only reports errors.
  - `GET /books/view` — the same ledger reading as a server-rendered HTML books page: the reconcile verdict counts first, then the balance sheet and income statement account trees, then stats.
  - `GET /books/report?report=<name>` — one named Farolfi report (`balance`, `balance-sheet`, `income-statement`, `cashflow`, `register`, `accounts`, `stats`, `lots`, `valuation`, `reconcile`, `check`), with optional `begin`, `end`, `account`, and `depth` query parameters, read through the same provider's `ledger-report` tool; an unknown `report` is refused with `400`.
  - An unavailable, malformed, or refusing MetroPlat provider produces a bounded `502`; it is never represented as an empty successful task list or ledger reading.
- When `OPS_DATA_DIR` is set, this package additionally mounts the filesystem-backed read-only rooms:
  - `GET /world` — the distinct entity addresses in `OPS_DATA_DIR/world.eavt`.
  - `GET /world/:address` — that subject's settled `fold` as JSON.
  - `GET /records` — a recursive relative-path index of `OPS_DATA_DIR/records/*.json`.
  - `GET /records/<path>` — that record file's parsed JSON content (path-traversal hardened: the path resolves against `OPS_DATA_DIR/records` and is refused with `400` if it would land outside it).
  - No route in this package ever writes to `OPS_DATA_DIR`.
- `scripts/push-ops-data.mjs` is the one writer of `OPS_DATA_DIR` on Cold Red Gate: it rsyncs LAGOON's `world.eavt`, the newest `*goal-stack-roadmap.json`, the 561 Group org-machines record, and the whole `561-group-services-section/data/logs/ledgers/` directory (the main ledger plus its glob-included `*.beancount` sidecars) to `<dest>/world.eavt`, `<dest>/records/`, and `<dest>/ledgers/` respectively. Dry run by default; `--apply` performs the real transfer.

Copy `.env.example` to the protected environment-file path described in `content/deployment/systemd-user/cold-red-gate/README.md`, replace every placeholder, and make it readable only by the service user. Validate without starting the listener:

```sh
npm ci
npm run check
npm test
node scripts/preflight.mjs --probe
```

The repository contains a non-activating systemd projection. Its presence records a reviewed deployment shape; it does not prove installation, Caddy routing, DNS, OAuth-console configuration, service activation, or a successful external client session.

## Machine actors (agent sessions)

An agent session (Claude Code, Codex, or another house actor) reaches the gateway without a
Google browser consent by holding a `client_credentials` credential instead of a human session.

Admit one on the deployment host:

```sh
node scripts/admit-principal.mjs --state-dir "$OPS_MCP_STATE_DIR" --actor "actor:<the actor URN>" --client-name "<label>"
```

This prints the new `client_id` and the plaintext `client_secret` exactly once; store the secret
in the harness's own secret carrier immediately, never in this repository or in a log. To admit a
secret generated elsewhere (e.g. copied from another host over `scp` into a mode-0600 file) rather
than one this script mints, pass `--secret-file <path>`: the client is admitted with that file's
plaintext, and the CLI never prints it. Revoke with:

```sh
node scripts/revoke-principal.mjs --state-dir "$OPS_MCP_STATE_DIR" --client-id "<client_id>"
```

`scripts/serve-ops-mcp-stdio.mjs` is the stdio bridge a harness launches as its MCP server
process: it reads `OPS_MCP_ORIGIN` (default `https://ops.561.group`), `OPS_MCP_CLIENT_ID`, and
`OPS_MCP_CLIENT_SECRET` from the environment, exchanges them for a bearer token at
`/oauth/token`, refreshes it before expiry, and proxies MCP JSON-RPC between the harness's stdio
transport and the remote Streamable HTTP `/mcp` endpoint using the `@modelcontextprotocol/sdk`
transports on both ends — this package supplies no JSON-RPC framing of its own.

## Recovery evidence

`content/provenance/cold-red-gate-recovery.json` records the captured source hashes and Git revisions. The recovered source was useful as behavioral evidence, but its obsolete package imports, hard-coded personal admission default, response buffering, and machine-specific paths were not promoted into this package.

## Competitive census

`content/competitive-census/incumbent-capability-census.md` measures OpenClaw, Honcho, Hermes Agent, Asana, and Odoo against this package's live `/tasks` surface (per `.claude/skills/meet-then-beat/SKILL.md`), derives the ranked MEET gap list, and names the BEAT differentiators (receipts-native, human-and-agent symmetric actors, MUD-native operation, the internal compute market, EAVT rows under everything).
