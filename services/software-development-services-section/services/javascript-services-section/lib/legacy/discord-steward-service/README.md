# @emsenn/app-discord-steward

The parameterized, runnable form of `@emsenn/organizing-with-discord`.
Give it a **server name, bot name, bot key, and admin username** and it goes online in that server, answers from a settled memory, measures and de-encloses the server's political economy, and keeps the §12 automate/keep-human boundary — deferring conflict, care, bans, and governance to the named admin.

## What it takes to run in a real server

Three things — two are one-time human setup on Discord, one is config:

1. **Create the bot** (once, on Discord's side):
   - Go to <https://discord.com/developers/applications> → New Application.
   - Add a **Bot**, copy its **token** (this is your "key"), and copy the
     **Application ID** (the "client id", for the invite URL).
   - Under the bot settings, enable the two **privileged intents** the steward
     needs: **MESSAGE CONTENT** and **SERVER MEMBERS**.
2. **Invite it to your server** (once, as the server admin):
   ```
   discord-steward invite --client-id <application id>
   ```
Open the printed URL, pick your server, authorize.
The URL requests exactly the permissions your configured capabilities need — nothing more.
3. **Configure and run:**
   ```
   cp steward.config.example.json steward.config.json   # fill in serverName, token, admin…
   discord-steward check  --config steward.config.json  # validate token + inference key + config
   discord-steward run    --config steward.config.json  # go online and tend the server
   ```
An inference key must be present in the environment (`NVIDIA_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, or `OPENAI_API_KEY`).

That's it — the bot is then in the server, responds to messages, answers from its memory, opens/keeps channels, eases onboarding, and surfaces + reduces enclosure.

## How it answers "from its memories"

Each pulse is grounded in a **context suit** — the same mechanism the 561 Group Operations Manifold uses to ground its agents: a **budget-bounded, relevance-ranked, tiered** assembly (not a transcript), with provenance and explicit omission.
The tiers:

- **sense** — live perception (this pulse's measurement, the open questions in the channel now),
- **rememberContexted-sense** — recalled durable memory, **settled** via `@emsenn/organizing-with-agents` `settleFindings` (per-subject bilattice status), ranked by relevance to the incoming message,
- **learning** — consolidated lessons (the inward `dreamFindings` regime).

Sources are admitted by descending weight until the token budget is spent; the rest are reported as omitted.
So the steward answers from what it has actually seen, under a budget — never blind, never flooded.

## Config

| key | meaning |
| --- | --- |
| `serverName` | the server's NAME (resolved to a guild id at startup) |
| `botName` | the bot's display name (used in its charter) |
| `token` | the bot key (or set `DISCORD_BOT_TOKEN`) |
| `adminUsername` | the human the steward defers governance/care to |
| `charter` | what the server is for — the steward's standing goal |
| `endpoint` / `model` | inference endpoint/model (defaults to first key present) |
| `capabilities` | the granted "appropriate permissions" (subset → less power) |
| `gate` | the §12 boundary: `enforce` (default), `advise`, or `off` |
| `dataRoot` | where memory is kept (default `./data`) |
| `contextBudget` | context-suit token budget per pulse |

Config precedence is **flags > env > file**.
The same `discord-steward` bin runs `run`, `invite`, and `check`.

## Safety

The steward never executes the human-reserved actions (`kick`/`ban`/`timeout`/ `bulk_delete`/`delete_role`/`delete_channel`) under the default `enforce` gate — it turns them into recommendations to the admin.
It defaults to suppressing `@everyone`/`@here`, and it ignores other bots to avoid feedback loops.
