import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { admitLaunchPlan, dueMilestones, finalFileDueDate, launchCalendar, migrateLaunchPlan, readChannelProfiles } from "../src/launch-plan.mjs";

const profilesDirectory = fileURLToPath(new URL("../../../../../../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/business-science-services-section/services/marketing-science-services-section/data/records/retail-channel-profile-records", import.meta.url));
const iceOut = fileURLToPath(new URL("../../../../../../../../../../../../public-services-section/services/public-media-services-section/services/public-fiction-media-services-section/data/records/launch-records/2026-09-27-ice-out-launch.json", import.meta.url));

// A pre-order on KDP only, unless the override states the choices.
const withChoices = (plan) => ({ ...plan, preorder: plan.preorder ?? Object.fromEntries(plan.channels.map(({ id }) => [id, id === "kdp"])) });
const forthcoming = (overrides = {}) => withChoices({
  type: "PublicationLaunchPlan", version: 2, work: "next-title", plannedAt: "2026-10-20",
  onSale: { date: "2026-12-08" }, announce: "2026-11-03",
  advanceReading: { opens: "2026-11-10", closes: "2026-12-22", teamSize: 30, rendition: "advance-reader-v1" },
  channels: ["kdp", "apple-books", "google-play-books", "kobo", "bn-press", "shop"].map((id) => ({ id, status: "forthcoming", notes: [] })),
  readout: { firstReadAfterDays: 30 },
  ...overrides,
});

test("final-file rules: hours round to days, business days skip weekends", () => {
  assert.equal(finalFileDueDate("2026-12-08", { hours: 72 }), "2026-12-05");
  assert.equal(finalFileDueDate("2026-12-08", { days: 3 }), "2026-12-05");
  assert.equal(finalFileDueDate("2026-12-08", { businessDays: 3 }), "2026-12-03");
  assert.equal(finalFileDueDate("2026-12-08", { businessDays: 10 }), "2026-11-24");
});

test("a pre-release plan derives every channel deadline, the pre-order and the reading window from cited profiles", async () => {
  const profiles = await readChannelProfiles(profilesDirectory);
  const plan = forthcoming(); admitLaunchPlan(plan);
  const calendar = launchCalendar(plan, profiles);
  assert.deepEqual(calendar.conflicts, []);
  const on = Object.fromEntries(calendar.milestones.map(({ id, date }) => [id, date]));
  assert.equal(on["next-title:final-file-due:kdp"], "2026-12-05");
  assert.equal(on["next-title:final-file-due:apple-books"], "2026-11-24");
  assert.equal(on["next-title:final-file-due:kobo"], "2026-12-03");
  assert.equal(on["next-title:preorder-create:kdp"], "2026-11-03");
  assert.equal(on["next-title:advance-reading-reminder"], "2026-12-08");
  assert.equal(on["next-title:review-readout"], "2026-12-22");
  assert.equal(on["next-title:launch-readout"], "2027-01-07");
  assert.equal(on["next-title:preorder-create:apple-books"], undefined, "pre-order is chosen per channel");
  assert.ok(calendar.milestones.find(({ id }) => id === "next-title:final-file-due:kdp").sources.some((source) => source.includes("kdp.amazon.com")));
  assert.deepEqual(launchCalendar(plan, profiles), calendar, "pure");
  assert.deepEqual(dueMilestones(calendar, "2026-11-03").map(({ id }) => id), ["next-title:announce", "next-title:preorder-create:kdp"]);
});

test("a plan asking what a channel forbids names the conflict", async () => {
  const profiles = await readChannelProfiles(profilesDirectory);
  const early = launchCalendar(forthcoming({ announce: "2026-05-01", onSale: { date: "2027-12-08" } }), profiles);
  assert.match(early.conflicts.find(({ channel }) => channel === "kdp").says, /cannot open before 2026-06-08/u);
  const undated = launchCalendar(forthcoming({ onSale: { date: "2026-12-08", channels: { shop: null } } }), profiles);
  assert.match(undated.conflicts.find(({ channel }) => channel === "shop").says, /expected on-sale date/u);
  assert.equal(launchCalendar(forthcoming({ channels: [{ id: "smashwords", status: "forthcoming", notes: [] }] }), profiles).conflicts[0].channel, "smashwords");
});

test("admission refuses a plan without an on-sale date, a channel state outside ONIX list 64, or a pre-order choice", () => {
  admitLaunchPlan(forthcoming());
  const { onSale, ...undated } = forthcoming();
  assert.throws(() => admitLaunchPlan(undated), /onSale/u);
  assert.throws(() => admitLaunchPlan(forthcoming({ onSale: { date: null } })), /channel kdp is forthcoming \(ONIX list 64, code 02\) and needs an on-sale date/u);
  assert.throws(() => admitLaunchPlan(forthcoming({ onSale: { date: "2026-12-08", channels: { shop: null } } })), /channel shop is forthcoming/u);
  admitLaunchPlan(forthcoming({ onSale: { date: null }, channels: [{ id: "kdp", status: "unspecified", notes: [] }] }));
  assert.throws(() => admitLaunchPlan(forthcoming({ channels: [{ id: "kdp", status: "coming-soon", notes: [] }] })));
  assert.throws(() => admitLaunchPlan(forthcoming({ preorder: { kdp: true } })), /channel apple-books has no pre-order choice/u);
  assert.throws(() => admitLaunchPlan(forthcoming({ channels: [{ id: "kdp", status: "forthcoming", notes: [] }], preorder: { kdp: true, kobo: false } })), /names kobo/u);
  assert.throws(() => admitLaunchPlan(forthcoming({ preorder: { ...forthcoming().preorder, kdp: "yes" } })));
});

test("a channel the title is not planned for has no milestones", async () => {
  const profiles = await readChannelProfiles(profilesDirectory);
  const plan = forthcoming({ channels: [{ id: "kdp", status: "forthcoming", notes: [] }, { id: "kobo", status: "unspecified", notes: [] }] });
  assert.ok(!launchCalendar(plan, profiles).milestones.some(({ channel }) => channel === "kobo"));
});

test("version 1 prose becomes notes under a status the migrator states, and Ice Out's record is version 2", async () => {
  const v2 = migrateLaunchPlan({ type: "PublicationLaunchPlan", version: 1, work: "w", plannedAt: "2026-09-27", hypotheses: [], channels: [{ id: "kdp", where: "KDP", state: "kdp-live: ASIN X" }] }, { onSale: { date: "2026-10-02" }, channels: { kdp: { status: "active", remoteId: "X" } } });
  assert.deepEqual(v2.channels[0], { id: "kdp", status: "active", where: "KDP", notes: ["kdp-live: ASIN X"], remoteId: "X" });
  assert.deepEqual(v2.preorder, { kdp: false }, "version 1 had no pre-orders");
  admitLaunchPlan(v2);
  const record = JSON.parse(await readFile(iceOut, "utf8"));
  admitLaunchPlan(record);
  assert.equal(record.channels.find(({ id }) => id === "kdp").remoteId, "B0HLRR2KNZ");
  const calendar = launchCalendar(record, await readChannelProfiles(profilesDirectory));
  assert.equal(calendar.milestones.find(({ kind }) => kind === "advance-reading-reminder").date, "2026-10-25");
  assert.throws(() => admitLaunchPlan({ ...record, channels: [...record.channels, record.channels[0]] }), /twice/u);
});
