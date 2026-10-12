import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { reconcileDerivedOpenings } from "@red-cup-engineering/organizing/enterprise";
import { deriveLaunchCensus, LAUNCH_CENSUS_KIND } from "../src/launch-census.mjs";
import { readChannelProfiles } from "../src/launch-plan.mjs";

const profilesDirectory = fileURLToPath(new URL("../../../../../../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/business-science-services-section/services/marketing-science-services-section/data/records/retail-channel-profile-records", import.meta.url));
const iceOut = fileURLToPath(new URL("../../../../../../../../../../../../public-services-section/services/public-media-services-section/services/public-fiction-media-services-section/data/records/launch-records/2026-09-27-ice-out-launch.json", import.meta.url));
const LAUNCHES = "lib/emsenn/services/561-group/services/public-services-section/services/public-media-services-section/services/public-fiction-media-services-section/data/records/launch-records";

// A pre-order on KDP only, unless the override states the choices.
const withChoices = (plan) => ({ ...plan, preorder: plan.preorder ?? Object.fromEntries(plan.channels.map(({ id }) => [id, id === "kdp"])) });
const forthcoming = (overrides = {}) => withChoices({
  type: "PublicationLaunchPlan", version: 2, work: "next-title", title: "Next Title", plannedAt: "2026-10-20",
  onSale: { date: "2026-12-08" }, announce: "2026-11-03",
  advanceReading: { opens: "2026-11-10", closes: "2026-12-22", teamSize: 30, rendition: "advance-reader-v1" },
  channels: ["kdp", "kobo"].map((id) => ({ id, status: "forthcoming", notes: [] })),
  readout: { firstReadAfterDays: 30 },
  ...overrides,
});
const poster = "causeway-publishing";

test("a census asks for each milestone from its lead window until its grace runs out, as admissible requests", async () => {
  const profiles = await readChannelProfiles(profilesDirectory);
  const census = deriveLaunchCensus({ plans: [{ path: `${LAUNCHES}/next.json`, plan: forthcoming() }], profiles, today: "2026-11-01", poster });
  assert.equal(census.kind, LAUNCH_CENSUS_KIND);
  assert.deepEqual(census.window, { from: "2026-10-29", until: "2026-11-15" });
  assert.deepEqual(census.openings.map(({ milestone }) => milestone), ["next-title:announce", "next-title:preorder-create:kdp", "next-title:advance-reading-opens"]);
  for (const { opening } of census.openings) {
    assert.equal(opening.move, "request");
    assert.equal(opening.by, poster);
    assert.match(opening.need, /^Next Title/u);
    assert.ok(opening.scope.includes("publication:next-title"));
    assert.equal(opening.requirements[0].priority, "must");
  }
  const preorder = census.openings.find(({ milestone }) => milestone === "next-title:preorder-create:kdp").opening;
  assert.match(preorder.need, /up for pre-order on .+ from 2026-11-03/u);
  assert.ok(preorder.scope.includes("retail-channel:kdp"));
  assert.ok(preorder.sources.some(({ kind }) => kind === "channel-profile"));
});

test("a request keeps its thread while the date holds, and a moved date withdraws the old one", async () => {
  const profiles = await readChannelProfiles(profilesDirectory);
  const plans = [{ path: `${LAUNCHES}/next.json`, plan: forthcoming() }];
  const opens = (census) => census.openings.find(({ milestone }) => milestone === "next-title:advance-reading-opens").opening;
  const first = opens(deriveLaunchCensus({ plans, profiles, today: "2026-11-01", poster }));
  assert.equal(opens(deriveLaunchCensus({ plans, profiles, today: "2026-11-02", poster })).id, first.id);

  const moved = deriveLaunchCensus({ plans: [{ path: `${LAUNCHES}/next.json`, plan: forthcoming({ advanceReading: { ...forthcoming().advanceReading, opens: "2026-11-12" } }) }], profiles, today: "2026-11-02", poster });
  const board = { threads: [{ id: first.id, opening: first, standing: "open", deliveries: [] }] };
  const plan = reconcileDerivedOpenings(board, { poster, openings: moved.openings.map(({ opening }) => opening), evidence: "launches/census.json" });
  assert.deepEqual(plan.settle.map(({ move, thread }) => [move, thread]), [["withdraw", first.id]]);
  assert.ok(plan.open.some(({ need }) => /from 2026-11-12/u.test(need)));
});

test("a plan conflict asks until the plan resolves it; an inadmissible plan is refused, not guessed at, and asks to be made admissible", async () => {
  const profiles = await readChannelProfiles(profilesDirectory);
  const iceOutPlan = JSON.parse(await readFile(iceOut, "utf8"));
  // Ice Out's shop channel as it stood before its on-sale date was recorded: forthcoming, undated, which ONIX code 02 forbids.
  const undated = { ...iceOutPlan, onSale: { ...iceOutPlan.onSale, channels: { ...iceOutPlan.onSale.channels, shop: null } },
    channels: iceOutPlan.channels.map((channel) => (channel.id === "shop" ? { ...channel, status: "forthcoming" } : channel)) };
  // A plan whose KDP pre-order would open more than 18 months ahead of its on-sale date: admissible, but KDP forbids it.
  const early = forthcoming({ work: "far-title", title: "Far Title", announce: "2026-05-01", onSale: { date: "2027-12-08" } });
  const census = deriveLaunchCensus({
    plans: [
      { path: `${LAUNCHES}/ice-out.json`, plan: undated },
      { path: `${LAUNCHES}/far.json`, plan: early },
      { path: `${LAUNCHES}/broken.json`, plan: { ...forthcoming(), channels: "kdp" } },
    ],
    profiles, today: "2026-10-02", poster,
  });
  assert.deepEqual(census.refused.map(({ path }) => path), [`${LAUNCHES}/broken.json`, `${LAUNCHES}/ice-out.json`]);
  assert.match(census.refused[1].reason, /channel shop is forthcoming \(ONIX list 64, code 02\) and needs an on-sale date/u);
  const refusal = census.openings.find(({ refused }) => refused === `${LAUNCHES}/ice-out.json`).opening;
  assert.match(refusal.need, /^Ice Out's launch plan is admissible: channel shop is forthcoming/u);
  assert.deepEqual(refusal.tags, ["launch", "launch-plan-refused"]);
  assert.ok(refusal.scope.includes("section:services/public-services-section/services/public-media-services-section/services/public-fiction-media-services-section"));
  const conflict = census.openings.find(({ conflict }) => conflict === "far-title:kdp").opening;
  assert.match(conflict.need, /^Far Title's launch plan holds on .+ without conflict: pre-order cannot open before 2026-06-08/u);
  assert.deepEqual(conflict.tags, ["launch", "launch-plan-conflict"]);
  assert.equal(census.openings.some(({ milestone }) => milestone?.startsWith("ice-out:")), false, "a refused plan has no milestones");
});
