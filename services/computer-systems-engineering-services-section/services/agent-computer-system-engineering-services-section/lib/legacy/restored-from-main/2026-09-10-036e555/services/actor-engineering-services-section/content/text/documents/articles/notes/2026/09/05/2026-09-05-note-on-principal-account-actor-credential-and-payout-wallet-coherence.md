---
title: "Principal, Account, Actor, Credential, and Payout-Wallet Coherence"
description: "One reconciled model for user/account/principal/key/credential/actor/payout-wallet, drawn from the existing glossary and actor law, applied first to the x402 money surfaces."
date-created: 2026-09-05
type: notes
name: 2026-09-05-note-on-principal-account-actor-credential-and-payout-wallet-coherence
authors:
  - emsenn
  - claude-sonnet-5
keywords:
  - identity
  - principal
  - account
  - actor
  - credential
  - key
  - payout-wallet
  - x402
---

# Principal, account, actor, credential, and payout-wallet coherence

Founder movement (2026-09-05): these terms are scattered and incoherent
across the repo — inconsistent env-var names, duplicate coinages, credential
files in varied places, unclear distinctions between a user, an account, a
principal, a key, a credential, an actor, and a payout wallet. This note
states one model built entirely from terms already ruled elsewhere in the
tree — no new vocabulary is coined here — and records where the money
surfaces were brought into line with it on 2026-09-05.

Nothing below restates a definition that already lives at its owning
carrier; each term below cites that carrier and states only its
relationship to the others.

## The model

**Principal** (`semiotic-computer-system-services-section/content/text/glossary/concepts/principal.md`)
is the unifying abstraction: an authenticated entity that holds capability
and admits substrate content, structured as an [identity-key](../../../../computer-engineering-services-section/services/computer-systems-engineering-services-section/services/semiotic-computer-system-services-section/content/text/glossary/concepts/identity-key.md) holder. Its
named kinds are User principal (a human with an account), Agent principal
(an LLM agent or automated process — a session), Federation-peer principal,
and Device-substrate principal. **A session is an Agent principal, never a
User and never a customer** (`inference-dispatch` MCP server instructions:
"the stable customer Actor is `actor:bZH6KBOlPVWbYpqp04izN_Xtwykn0XgsMBStm_FkPPw`;
a session is never a customer").

**Actor** (`@red-cup-engineering/actor`, `actor-engineering-services-section`)
is how the org realizes a Principal durably: constituting an actor
(`constituteActor`) births an EAVT entity of kind `"actor"`, giving it the
address form `actor:<ni-digest>`. A harness seat, a service, a team, or any
other principal instantiation is an actor by carrying a plain-noun
attributes object (`{host,harness,office,character,incumbency}` for a
seat; `{service:"<npm name>"}` for a service; `{team:"<slug>"}` for a
team) — there is no per-kind schema. This is the *one* canonical actor-id
form. The ActivityPub `Actor` term
(`science-services-section/.../activitypub-services-section/content/text/glossary/terms/actor.md`:
"an addressable entity ... a user account, a bot, a service ... with an
inbox and an outbox") names the *protocol-level projection* of the same
identity when it federates — not a second identity system.

**Superseded identifiers.** `@red-cup-engineering/actor`'s `supersedeRow`
attaches a *retired* identifier to a current `actor:<digest>` address as a
row (`{e: address, a: "superseding", v: supersededId, t}`); its own
worked example is `"urn:ame:bare-cedar-fog-codex"`. **`urn:ame:*` is
therefore, by the actor law's own documentation, the coinage the org
retired — a superseded-identifier value, never a fresh mint.** This
confirms the standing ruling: do not revive `urn:ame:*` as a live actor
identity. (Finding, below: one section still does.)

**Character and incumbency** (cited as settled anchors, per session
bootstrap: "characters and incumbencies are org-owned and harness-neutral")
are the actor law's own machinery for seating: an office is held through
one incumbency (`seatIncumbency`/`readIncumbency`), whose state is a
Belnap charge (`vacant`, `recognition-only`, `munus-only`, `dignitas`,
`repair`, `failed`) read over the office's recognition/induction
settlement (`incumbencyCharge`, `incumbencyState`). A harness seat's
`character` attribute names who holds the office; the incumbency names the
holding itself. Neither is redefined here — this note only places them
relative to Principal/Actor: a Principal seated at an office is read
through its incumbency, and the seat is one more actor.

**Key.** An identity-key
(`semiotic-computer-system-services-section/.../concepts/identity-key.md`)
is the keypair a Principal holds: the public half is substrate content
(part of the actor's identity record); the private half stays in
identity-key-custody, off-substrate. A payout wallet's on-chain or
on-chain-adjacent key (an EVM signer, a Hive posting/active key) is the
same shape applied to a financial venue: the public half is the address
(`0x...`, a Hive account name); the private half is a credential-loaded
secret, never substrate content, never logged, never embedded in source.

**Credential.** The mechanism that lets running code exercise a key or act
as a principal, without the code (or this note, or any carrier) ever
containing the secret value itself. Two credential-loading conventions
already stand in this tree and are the only two this model recognizes:
- **`.env`** (in-tree, never read/printed/copied by any session or tool):
  provider API keys, CDP facilitator keys (`CDP_API_KEY_ID`,
  `CDP_API_KEY_SECRET`), payout addresses (`X402_PAY_TO`), and other
  runtime secrets, loaded by runtime code only.
- **`~/.config/561-group/ops-mcp-client.env`** (outside the tree): the
  production ops MCP `client_credentials` grant, reached only through the
  gateway's stdio bridge.

A credential names *where* a secret lives (an env-var name, a file path);
it is never the secret's value inline in code, a script, a record, or this
note. Every fix below is a rename of a *name*, never a value.

**Account — two distinct, non-conflated senses.** The word is genuinely
overloaded in the corpus, and both senses are independently ruled
elsewhere, so this note keeps them apart rather than picking one:

1. **Ledger account** (`accounting-services-section/.../terms/account.md`):
   "a stable classification address that accumulates selected effects of
   admitted transactions" — what a Beancount posting debits or credits
   (e.g. `Assets:Crypto:Base:Sigmund`). Governed by a chart of accounts.
2. **Holding/wallet account**: a specific keyed identity that holds value
   on a venue or chain — a Hive account (`emsenn0`, `michael561`,
   `sigmund-vexler`, plus the dust accounts `help-fund`, `essiebee`,
   `marshian`) or a Base EVM address (named wallets `sigmund`, `yanagi`,
   and eight unnamed auxiliary wallets), per
   `561-group-finance-operations-services-section`'s 2026-09-04 finance-stack
   note. This is a Principal's (or the org's) holding, addressed by a
   public key, secured by a credential-loaded private key.

A **payout wallet** is sense (2): the specific holding an x402 seller
names as its settlement destination. The ledger then books settlement
against the ledger account (sense 1) that names that wallet. The two
senses are related, never identical — a wallet is a thing that holds
value; a ledger account is an address in the books that classifies flows
into or out of it.

**User** is the human case of Principal — the founder is the org's
paradigm User principal, operating an account (sense 2's application
form) through sessions; a User is never realized as an Agent principal or
a session, and a session is never realized as the customer Actor (see
Principal, above).

## Relationships, in one line each

- Principal --(kind)--> User | Agent | Federation-peer | Device-substrate.
- Principal --(holds)--> Identity-Key (public content + private custody).
- Principal --(authenticates via)--> Credential (proves the key without exposing it).
- Principal --(constituted in EAVT as)--> Actor, address `actor:<digest>`.
- Actor --(seated at an Office through one)--> Incumbency, naming a Character.
- Actor --(holds)--> Account in the holding/wallet sense (a Hive account, a Base address).
- Account (wallet sense) --(classified in the books by)--> Account in the ledger sense.
- Payout wallet = the Account (wallet sense) an x402-selling Actor names as settlement destination.

## Applied to the money surfaces (2026-09-05)

**Found:** three x402 sellers each coined their own gateway-specific
override name for "the account identity to record when witnessing a
settlement, if different from the bare payout address" — all three
optional, all three defaulting to `X402_PAY_TO`, all three undocumented
outside their own file:

| gateway | old name |
|---|---|
| `astrology-emphemeris-services-section` (paid-ephemeris-gateway) | `PAID_EPHEMERIS_ACCOUNT` |
| `pacing-services-section/paid-pacing-intelligence-gateway` | `PAID_PACING_ACCOUNT` |
| `blockchain-trashpanda-services-section` | `TRASHPANDA_SETTLEMENT_ACCOUNT` |

This is exactly the account/payout-wallet ambiguity above, un-reconciled:
each name tried to say "the ledger-facing (often CAIP-2-qualified, e.g.
`eip155:8453:0x...`) identity for this wallet," but named it three
different ways instead of once. **Fixed (staged):** all three renamed to
one shared name in the existing `X402_*` env-var family (alongside
`X402_NETWORK`, `X402_FACILITATOR`, `X402_PAY_TO`): `X402_SETTLEMENT_ACCOUNT`,
still optional, still falling back to `X402_PAY_TO`. Touched:
- `astrology-emphemeris-services-section/src/settlement-witness.mjs`
- `astrology-emphemeris-services-section/lib/cloud-run/deploy.sh` (the
  live Cloud Run deploy sets this var; renamed to keep behavior identical
  on the next deploy)
- `pacing-services-section/services/paid-pacing-intelligence-gateway/src/settlement-witness.mjs`
- `blockchain-trashpanda-services-section/src/x402-settlement-witness.mjs`
  and its test

`X402_PAY_TO` itself was already coherent everywhere it is used (every
gateway requires it with no default, per the "no default is provided on
purpose" safety) and was not touched. `CDP_API_KEY_ID`/`CDP_API_KEY_SECRET`
were already coherent everywhere and were not touched.

**Filed, not fixed (out of this lot's safe bounds):**

1. `blockchain-trashpanda-services-section/src/admit-channel-readiness.mjs`
   cannot load: it imports `createYanagiX402Service`, `X402_NETWORK`,
   `X402_PAY_TO`, and `X402_PRICE` from `./x402-service.mjs`, none of
   which that module exports (its real exports are
   `createTrashpandaX402Service`, `X402_TEST_NETWORK`/`X402_MAINNET_NETWORK`,
   and `X402_DEFAULT_PRICE`), and `recordSettlementRecord` from
   `./settlement-witness.mjs`, which only exports
   `createTrashpandaSettlementWitness`. A sibling test
   ("publishes a Base-mainnet Trashpanda Services challenge with no
   Yanagi branding") shows this is a stale leftover from an earlier
   Yanagi-to-Trashpanda rename that this one script never received. This
   script is not on the live payment path (`server.mjs` imports the
   correct current names); the finding is that this specific admission
   script is dead code today.
2. The same section mints and hardcodes `urn:ame:blockchain-trashpanda`
   as its actor identity across 11 files (`admit-channel-readiness.mjs`,
   `admit-formation-receipt.mjs`, `admit-formation-economics.mjs`,
   `admit-product-conformance.mjs`, `admit-commercial-pilot-authorization.mjs`,
   `admit-den-gate.mjs`, `admit-founding-manifest.mjs`,
   `market-action-admission.mjs`, `virtuals-commercial-pilot-runtime.mjs`,
   `virtuals-commercial-pilot-guard.mjs`, `settlement-witness.mjs`, the
   last of which hardcodes an equality check against that exact string),
   plus an already-recorded evidence file under that identity. Per the
   model above, `urn:ame:*` is the retired/superseded form, not a live
   identity; migrating this section onto `actor:<digest>` via
   `@red-cup-engineering/actor` (mint a genesis, rewire the hardcoded
   equality check, update every admission script and its recorded
   evidence) is a real, multi-file migration — filed as follow-on work,
   not attempted in this lot.
3. Tree-wide, 637 non-legacy `.mjs` files still use `urn:ame:*` as a live
   identity string (measured 2026-09-05, `grep -rl "urn:ame:"`). This note
   settles the model those files should migrate to; the migration itself
   is out of this lot's bound ("a full repo-wide rename of every
   consumer is filed as follow-on work").
4. `semiotic-computer-system-services-section/content/text/glossary/concepts/principal.md`
   links `../theories/interactive-application-platform/concepts/account.md`
   for the "User principal has an account" claim; that file does not
   exist on disk. Broken cross-reference, unrelated to the money-surface
   fix; filed for the glossary's own owner.

## Verification

Every touched package's tests were run fresh, in the foreground, after the
edits (see the 2026-09-05 session record). No `.env` or credential value
was read, printed, copied, or echoed at any point — only names (env-var
identifiers, file paths) were read or changed.
