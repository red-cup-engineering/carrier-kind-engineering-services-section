#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const SECTION_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Meet-then-beat competitive record for the hosted-world-tenancy arena
 * (the "landlord" product this section's tier catalog and provisioning plan
 * are engineering for): incumbent portfolio, live-measured evidence rows,
 * the MEET contract, and the BEAT hypothesis, per the meet-then-beat skill's
 * spec-stage application (this surface is spec-stage: tier catalog +
 * provisioning plan built, no tenant-facing public face yet).
 *
 * Written 2026-09-02 as the arena's first competitive-evidence pass.
 * @returns {ReturnType<ReturnType<typeof createSemanticRecordJournal>["record"]>}
 */
export function recordMeetThenBeatEvidence() {
  const journal = createSemanticRecordJournal({
    root: SECTION_ROOT,
    objectKind: "world-hosting.meet-then-beat-evidence.record",
  });
  return journal.record({
    category: "meet-then-beat-evidence",
    recordedAt: new Date().toISOString(),
    charge: { support: true, refutation: false },
    record: {
      arena: "hosted-world tenancy (the landlord product): a community leader pays a monthly fee for a running, persistent, backed-up multiplayer text world (a MUD) run by the 561 Group, without operating server infrastructure themselves.",
      receiverSentence: "A community leader who wants their own persistent multiplayer text world run for them entrusts the 561 Group with hosted-world tenancy -- sign up, pay a monthly fee, get a running world reachable at a URL for their community -- compared against other turnkey game/MUD-server-hosting products a community leader could choose instead (Minecraft-server hosts as the named capability class, plus any live MUD-specific host found), never against the underlying hosting infrastructure or MUD engine software itself.",
      realWaitingCustomer: "None named in the 2026-09-02-0140 goal-stack roadmap or this section's own records as of this pass; the closest carrier is this section's own customerFunnelChannels() list (MUD Coders Guild Discord/Slack marked recommendedFirst) -- a channel, not a named customer #1.",

      portfolio: [
        { product: "Apex Hosting (apexminecrafthosting.com)", role: "same-job-incumbent", why: "Named in the task brief as a live Minecraft-hosting comparable; a community leader shopping for turnkey persistent-world hosting evaluates it as a direct alternative." },
        { product: "Shockbyte (shockbyte.com)", role: "same-job-incumbent", why: "Named in the task brief; same capability class as Apex Hosting." },
        { product: "GenesisMuds (genesismuds.com)", role: "same-job-incumbent", why: "Live, first-party-fetched MUD-specific hosting product -- a closer same-job substitute than the Minecraft class, found this pass (the house's own 2026-08-31 mudday survey, cited in src/world-hosting.mjs's tier rationale, claimed no verified MUD-hosting monthly rate existed; this is now falsified)." },
        { product: "PocketMUD (pocketmud.com)", role: "same-job-incumbent", why: "Live, first-party-fetched MUD-specific hosting product, same reason as GenesisMuds." },
        { product: "Dune Internet (dune.net / secure.dune.net)", role: "same-job-incumbent", why: "Live, long-running MUD/MOO/MUSH/MUCK host found this pass; detailed tier chart lives on a subpage not fetched this bounded pass (see evidence row unknown_reason)." },
        { product: "@red-cup-engineering/feltos", role: "upstream-provider", why: "The MUD engine this section's provisioning composes (createWorld/snapshotWorld); a bounded dependency, never the same-job incumbent for the hosting/landlord customer experience." },
        { product: "Grapevine (grapevine.haus)", role: "complement", why: "A MUD directory/listing site, already named in this section's own customerFunnelChannels() -- discovery channel, not a hosting substitute." },
        { product: "Evennia (evennia.com)", role: "reference-implementation", why: "A self-hosted Python MUD-creation framework, not a hosted-tenancy SaaS product -- evidence of how the underlying engine capability can be built, not a same-job incumbent for the landlord product; not measured further this pass (out of arena scope, usage-bounded)." },
      ],

      evidenceRows: [
        {
          arena: "hosted-world tenancy", product: "GenesisMuds", productRole: "same-job-incumbent",
          capability: "entry-tier monthly price + resources", normalizedValue: 6, unit: "USD/month",
          sourceLanguage: "Coder: $6/month | $15.30/quarter ($5.10/mo, 15% off) | $54/year ($4.50/mo, 25% off) | $0 setup -- 5% CPU, 30MB RAM, 400MB game disk, 100MB web space -- \"Closed to the public\", 10 ports, 2 logins, \"Daily Backup\"",
          sourceUrl: "https://www.genesismuds.com/packages/", sourceTitle: "Genesis MUD Hosting Packages",
          disclosureClass: "product/pricing page", publishedDate: "unknown", effectiveDate: "unknown",
          observedAt: "2026-09-02T07:07:00Z", evidenceKind: "documented", assayMode: "public", result: "6 tiers, $6-$30/mo, all six include \"Daily Backup\"", confidence: "high", conflicts: "none",
        },
        {
          arena: "hosted-world tenancy", product: "GenesisMuds", productRole: "same-job-incumbent",
          capability: "top-tier monthly price + resources", normalizedValue: 30, unit: "USD/month",
          sourceLanguage: "Paramount: $30/month | $76.50/quarter | $270/year | $0 setup -- 35% CPU, 150MB RAM, 4000MB game disk, 1000MB web space -- 100 ports, 20 logins, 10 MySQL databases, \"Daily Backup\"",
          sourceUrl: "https://www.genesismuds.com/packages/", sourceTitle: "Genesis MUD Hosting Packages",
          disclosureClass: "product/pricing page", publishedDate: "unknown", effectiveDate: "unknown",
          observedAt: "2026-09-02T07:07:00Z", evidenceKind: "documented", assayMode: "public", result: "documented", confidence: "high", conflicts: "none",
        },
        {
          arena: "hosted-world tenancy", product: "PocketMUD", productRole: "same-job-incumbent",
          capability: "entry-tier monthly price + backup disclosure", normalizedValue: 9, unit: "USD/month",
          sourceLanguage: "\"Grande MUD Server -- $9/month with first month free\" -- \"our least expensive plan, with no offsite backups\"",
          sourceUrl: "https://pocketmud.com/index.php/mud-hosting", sourceTitle: "MUD Hosting Plans (PocketMUD)",
          disclosureClass: "product/pricing page", publishedDate: "unknown", effectiveDate: "unknown",
          observedAt: "2026-09-02T07:08:00Z", evidenceKind: "documented", assayMode: "public",
          result: "cheapest tier explicitly has NO offsite backups -- a real failure-mode disclosure: even a MUD-hosting incumbent does not guarantee data-safety at entry price", confidence: "high", conflicts: "none",
        },
        {
          arena: "hosted-world tenancy", product: "PocketMUD", productRole: "same-job-incumbent",
          capability: "cancellation/refund path", normalizedValue: null, unit: "policy text",
          sourceLanguage: "Venti MUD Server ($17/month, \"our default plan\"): \"Cancel before the end of the month and pay nothing else\"",
          sourceUrl: "https://pocketmud.com/index.php/mud-hosting", sourceTitle: "MUD Hosting Plans (PocketMUD)",
          disclosureClass: "product/pricing page", publishedDate: "unknown", effectiveDate: "unknown",
          observedAt: "2026-09-02T07:08:00Z", evidenceKind: "documented", assayMode: "public", result: "documented mid-cycle cancel-and-owe-nothing policy on default tier", confidence: "high", conflicts: "none",
        },
        {
          arena: "hosted-world tenancy", product: "PocketMUD", productRole: "same-job-incumbent",
          capability: "top-tier monthly price", normalizedValue: 42, unit: "USD/month",
          sourceLanguage: "\"Maxi MUD Server -- $42/month\" -- \"our enhanced plan\"; separately, \"One-time $15 fee\" for operator-assisted self-host setup; a required subscription is stated \"If you want to keep your server after 3/25/2026\"",
          sourceUrl: "https://pocketmud.com/index.php/mud-hosting", sourceTitle: "MUD Hosting Plans (PocketMUD)",
          disclosureClass: "product/pricing page", publishedDate: "unknown", effectiveDate: "2026-03-25 (stated deadline for a policy PocketMUD's page did not fully specify)",
          observedAt: "2026-09-02T07:08:00Z", evidenceKind: "documented", assayMode: "public", result: "documented", confidence: "medium", conflicts: "none",
        },
        {
          arena: "hosted-world tenancy", product: "Dune Internet", productRole: "same-job-incumbent",
          capability: "entry price + discount structure", normalizedValue: 6, unit: "USD/month (\"as low as\")",
          sourceLanguage: "\"as low as $6.00 per month\" for a basic account; \"15% discount\" for one-year prepayment; \"extra disk space\" for six-month prepayment; \"Fully upgradable with no setup fees\"",
          sourceUrl: "https://secure.dune.net/mud/", sourceTitle: "Dune Internet -- Mud Hosting Services",
          disclosureClass: "product/pricing page", publishedDate: "unknown", effectiveDate: "unknown",
          observedAt: "2026-09-02T07:19:00Z", evidenceKind: "documented", assayMode: "public",
          result: "top-level page only; detailed tier chart lives on a linked subpage (plan-chart/plan-list) not fetched this pass", confidence: "low",
          unknown_reason: "bounded measurement -- subpage not fetched this pass", next_evidence: "fetch the plan-chart/plan-list subpage linked from https://secure.dune.net/mud/", owner: "world-hosting-services-section",
        },
        {
          arena: "hosted-world tenancy (Minecraft-hosting capability class)", product: "Apex Hosting", productRole: "same-job-incumbent",
          capability: "entry-tier monthly price", normalizedValue: null, unit: "USD/month",
          sourceLanguage: "Direct WebFetch of apexminecrafthosting.com (root, /pricing/, /games/minecraft-server-hosting/) returned HTTP 403 Forbidden on every attempt this pass. Only WebSearch's AI-generated summaries of third-party aggregator pages were reachable, and those summaries conflicted with each other: one gave a 1GB entry tier at \"$5.99 per month,\" another gave \"Apex Hosting's Minecraft server pricing ranges from $7.99 to $90.99 a month by RAM.\"",
          sourceUrl: "https://apexminecrafthosting.com/pricing/ (inaccessible)", sourceTitle: "Apex Hosting pricing (not retrieved)",
          disclosureClass: "third-party aggregator, via WebSearch AI summary -- NOT first-party", publishedDate: "unknown", effectiveDate: "unknown",
          observedAt: "2026-09-02T07:10:00Z", evidenceKind: "documented", assayMode: "public",
          result: "inaccessible for direct first-party verification; conflicting third-party-summarized entry price ($5.99 vs $7.99/mo) recorded as a discovery lead only, not a verified current claim",
          confidence: "low", conflicts: "$5.99/mo vs $7.99/mo entry price, both from third-party summaries, neither first-party",
          unknown_reason: "first-party site returns 403 Forbidden to this tool (bot-protection); web.archive.org also inaccessible to this tool", next_evidence: "fetch apexminecrafthosting.com/pricing/ with a tool/session not blocked by its bot protection", owner: "world-hosting-services-section",
        },
        {
          arena: "hosted-world tenancy (Minecraft-hosting capability class)", product: "Shockbyte", productRole: "same-job-incumbent",
          capability: "entry-tier monthly price", normalizedValue: null, unit: "USD/month",
          sourceLanguage: "Direct WebFetch of shockbyte.com (root and /games/budget-minecraft-server-hosting) returned HTTP 403 Forbidden on every attempt this pass. WebSearch summary of third-party pages: \"plans start at $2.50/month for the Dirt tier (1 GB RAM)\", \"pricing increased from $2.50 per GB per month to $2.99\" starting \"June 3rd, 2024\" (per a Shockbyte blog post title reachable only as a search snippet, not fetched first-party).",
          sourceUrl: "https://shockbyte.com/games/budget-minecraft-server-hosting (inaccessible)", sourceTitle: "Shockbyte pricing (not retrieved)",
          disclosureClass: "third-party aggregator, via WebSearch AI summary -- NOT first-party", publishedDate: "unknown", effectiveDate: "2024-06-03 (per unfetched blog-post title only, not confirmed first-party)",
          observedAt: "2026-09-02T07:10:00Z", evidenceKind: "documented", assayMode: "public",
          result: "inaccessible for direct first-party verification this pass",
          confidence: "low", conflicts: "none observed (single third-party figure), but source itself unverified",
          unknown_reason: "first-party site returns 403 Forbidden to this tool (bot-protection); web.archive.org also inaccessible to this tool", next_evidence: "fetch shockbyte.com pricing pages with a tool/session not blocked by its bot protection", owner: "world-hosting-services-section",
        },
        {
          arena: "hosted-world tenancy", product: "561 Group / world-hosting-services-section (us)", productRole: "self",
          capability: "tier catalog + quoting", normalizedValue: 9, unit: "USD/month (Starter tier)",
          sourceLanguage: "listHostingTiers()/quoteHostingTenant() actually run this pass: `node scripts/quote-hosting-tenant.mjs --tier Community --players 30` returned {\"tier\":\"Community\",\"monthlyUsd\":24,...,\"fitsWithinCeiling\":true}",
          sourceUrl: "src/world-hosting.mjs, scripts/quote-hosting-tenant.mjs", sourceTitle: "world-hosting source + live run",
          disclosureClass: "source + live execution", publishedDate: "2026-09-01", effectiveDate: "unknown (not billed anywhere yet)",
          observedAt: "2026-09-02T07:14:00Z", evidenceKind: "assayed", assayMode: "sandbox", result: "tested: quoting logic runs correctly; no payment/billing integration exists in package.json dependencies", confidence: "high", conflicts: "none",
        },
        {
          arena: "hosted-world tenancy", product: "561 Group / world-hosting-services-section (us)", productRole: "self",
          capability: "tenant-workspace provisioning (world creation + snapshot + receipt)", normalizedValue: null, unit: "n/a",
          sourceLanguage: "`node scripts/provision-tenant-workspace.mjs --tenant acme-guild --tier Starter --data-root <scratchpad>` actually run this pass: produced a real workspace directory, a real FeltOS world-snapshot.json, and a journaled receipt (ni:///sha-256;pEP8sSrTqxZBgoyFcbvs2nx6nAb05H4qFPYKiInFXH8), all under a caller-supplied dataRoot outside the git tree.",
          sourceUrl: "scripts/provision-tenant-workspace.mjs", sourceTitle: "provision-tenant-workspace.mjs live run",
          disclosureClass: "source + live execution", publishedDate: "2026-09-01", effectiveDate: "unknown",
          observedAt: "2026-09-02T07:16:00Z", evidenceKind: "assayed", assayMode: "sandbox",
          result: "tested end-to-end for one tenant's initial workspace; NOT tested: recurring/scheduled backups (tier catalog marks \"backup/restore automation\" needs-building for Flagship), multi-tenant isolation on one running process (filed gap: FeltOS's MudServer serves exactly one world per process lifetime), custom domain routing and admin dashboard (needs-building on every tier)",
          confidence: "high", conflicts: "none",
        },
        {
          arena: "hosted-world tenancy (runtime substrate)", product: "561 Group / world-hosting-services-section (us)", productRole: "self",
          capability: "world-host runtime deployed and reachable", normalizedValue: 200, unit: "HTTP status",
          sourceLanguage: "`curl https://farstone.561.group/` -> HTTP 200; `curl https://farstone.561.group/health` -> {\"status\":\"ok\"}. Sibling `curl https://tidepool.561.group/` -> HTTP 503 (Cloud Run origin dead with billing off, per the world-host-runtime note).",
          sourceUrl: "https://farstone.561.group/", sourceTitle: "farstone.561.group live curl",
          disclosureClass: "observed (live production endpoint)", publishedDate: "unknown", effectiveDate: "unknown",
          observedAt: "2026-09-02T07:18:12Z", evidenceKind: "observed", assayMode: "live",
          result: "the world-host runtime this section owns is genuinely deployed and live for the house's own game world (farstone); it is NOT yet deployed for any paying third-party tenant -- this is evidence for the underlying substrate, not for the landlord/tenancy product itself, which has no public tenant-facing face (README: \"public: absent\")",
          confidence: "high", conflicts: "none",
        },
      ],

      meetGaps: [
        {
          capability: "Self-serve signup + payment (a community leader completes signup-to-running-world on a public URL with no operator in the loop)",
          incumbentBaseline: "Apex Hosting, Shockbyte, GenesisMuds, and PocketMUD each run a self-serve web storefront (plan -> payment -> provisioned server); GenesisMuds and PocketMUD confirmed live via direct first-party fetch this pass, Apex/Shockbyte per third-party-summarized search results only (direct fetch blocked, see evidence rows).",
          ourEvidence: "absent", owner: "world-hosting-services-section (public face + billing)",
          acceptanceAssay: "A community leader who has never talked to an operator completes signup-to-running-world entirely through a public URL.",
        },
        {
          capability: "Published, billable monthly pricing",
          incumbentBaseline: "GenesisMuds $6-$30/mo across 6 tiers (live, first-party); PocketMUD $9-$42/mo across 3 tiers (live, first-party); Apex/Shockbyte roughly $2.50-$90/mo per third-party-summarized, unverified search results.",
          ourEvidence: "tested", owner: "world-hosting-services-section",
          acceptanceAssay: "A real invoice is issued and collected from a paying tenant at a published rate; quoteHostingTenant() already runs correctly (verified live this pass) but nothing charges money yet.",
        },
        {
          capability: "Recurring/scheduled backup automation (not just an initial provisioning snapshot)",
          incumbentBaseline: "GenesisMuds includes \"Daily Backup\" at every tier including its cheapest $6/mo Coder tier (documented, live fetch). PocketMUD's cheapest tier explicitly has NO offsite backups -- so even incumbents don't uniformly guarantee this at entry price.",
          ourEvidence: "absent", owner: "world-hosting-services-section (Flagship tier catalog entry already admits this: \"backup/restore automation\", status needs-building)",
          acceptanceAssay: "A tenant's world is automatically snapshotted on a schedule (not just at provisioning) and a tenant can self-serve restore to a prior checkpoint.",
        },
        {
          capability: "Multi-tenant isolation: many worlds served from one host with tenant lifecycle admin (create/suspend/delete)",
          incumbentBaseline: "Implicit at all four measured hosting incumbents' scale -- each customer gets an isolated server instance under one shared operator, at prices from $6-$90/mo.",
          ourEvidence: "absent", owner: "world-hosting-services-section (already filed: data/records/service-records/world-hosting-gap-finding-journal, category multi-tenancy-provisioning-gap, 2026-09-01)",
          acceptanceAssay: "Two distinct tenants' worlds run simultaneously, isolated, from infrastructure the house administers as one fleet, with an admin action that can suspend one tenant without affecting the other.",
        },
        {
          capability: "Custom domain routing per tenant",
          incumbentBaseline: "GenesisMuds includes multiple \"hosted domains\" and \"DNS aliases\" per tier, even at its cheapest $6/mo tier (1 hosted domain, 1 DNS alias).",
          ourEvidence: "absent", owner: "world-hosting-services-section (marked needs-building on all three tiers in src/world-hosting.mjs)",
          acceptanceAssay: "A tenant's world is reachable at a domain the tenant supplies, not only a house-owned subdomain.",
        },
        {
          capability: "Deployed, publicly reachable world-host runtime",
          incumbentBaseline: "Not disclosed as an uptime %/SLA by any of the four measured incumbents in the pages fetched this pass (all rows: not disclosed).",
          ourEvidence: "deployed", owner: "world-hosting-services-section",
          acceptanceAssay: "farstone.561.group already meets this for the house's own world (HTTP 200, /health ok, verified live this pass); closing the gap for the landlord product means the same is true for a paying third party's own tenant world, which does not exist yet.",
        },
      ],

      beatHypothesis: {
        structuralFact: "FeltOS worlds are deterministic and event-sourced: every state change is an immutable append-only assertion (world.mjs#tell), and persistence.mjs#snapshotWorld/checkpointWorld can reconstruct exact state from that trace -- verified in source, exercised by this section's own passing tests (62/62, run this pass) and a live provisioning run that produced a real snapshot + journaled receipt. Agent NPCs (npc.mjs#chooseNpcAction) are a platform primitive every tenant world gets by default, not something a tenant must build.",
        outcome: "A hosted tenant's world history is provably replayable to any past point (not merely restorable to the latest snapshot), and every hosted world ships with working agent NPCs by default -- receiver-visible as \"my world's full history is auditable and my world already has agent-driven inhabitants.\" None of the five measured incumbents (Apex Hosting, Shockbyte, GenesisMuds, PocketMUD, Dune Internet) disclosed either capability as host-provided in the pages fetched this pass; each sells hosting/compute for a customer-supplied MUD or Minecraft codebase, not an engine-level replay or NPC guarantee.",
        assay: "For a real tenant world, replay its full stored assertion trace from genesis (not the latest snapshot) and confirm the reconstructed engine state matches the live engine byte-for-byte; separately confirm none of the five measured incumbents' fetched pages/control-panel descriptions mention trace-level replay or an included agent-NPC feature. This remains a RESEARCH HYPOTHESIS, not a demonstrated advantage: it has not yet been run against a real paying tenant's world (only against the house's own farstone/test worlds), and none of the four Minecraft/MUD-hosting incumbents' actual admin panels were inspected (only their public pricing/marketing pages) -- an undisclosed capability is not a proven absence.",
      },

      proposedWedge: {
        what: "Provision and deploy one real tenant world end-to-end (provisionTenantWorkspace -> a running serveWorldHost process on cold-red-gate with a public URL), even with fully manual/concierge onboarding (no payment automation yet) -- completing the first real signup-to-running-world handoff and giving one real community leader a URL to check.",
        assay: "curl the tenant's public URL/health endpoint across several days to confirm continuous uptime, then reconstruct that tenant's world state by replaying its full assertion trace (not just the latest snapshot) and diff it byte-for-byte against the live engine's current state, witnessed by the tenant themselves.",
        owner: "world-hosting-services-section",
      },

      surprises: "The house's own tier-catalog pricing rationale (src/world-hosting.mjs) states \"no verified MUD-hosting monthly rate was found as of the 2026-08-31 mudday survey\" and cites only generic third-party Minecraft-cost blogs (wisehosting.com, dathost.com, 3lifehosting.com, hostadvice.com) as comparables -- none of which are first-party evidence for Apex Hosting's or Shockbyte's own current pricing either. This pass found two live, first-party-fetchable MUD-specific hosting incumbents within minutes (GenesisMuds $6-$30/mo, PocketMUD $9-$42/mo) plus a third (Dune Internet, thinner evidence) -- a real MUD-hosting capability class exists and should replace the Minecraft-analogy framing as the tier catalog's primary comparable. Separately, the two Minecraft-hosting incumbents actually named in the task brief (Apex Hosting, Shockbyte) both returned HTTP 403 to this tool on every direct-fetch attempt (root, pricing subpages, and archive.org as a fallback), so their evidence rows here are honestly downgraded to third-party-summarized/unverified rather than fabricated as first-party.",
    },
  });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "record-meet-then-beat-evidence", description: "Meet-then-beat competitive record for the hosted-world-tenancy arena (the \"landlord\" product this section's tier catalog and provisioning plan are engineering for): incumbent portfolio, live-measured evidence rows, the MEET contract, and the BEAT hypothesis, per the meet-then-beat skill's spec-stage application (this surface is spec-stage: tier catalog + provisioning plan built, no tenant-facing public face yet).", operation: recordMeetThenBeatEvidence }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
