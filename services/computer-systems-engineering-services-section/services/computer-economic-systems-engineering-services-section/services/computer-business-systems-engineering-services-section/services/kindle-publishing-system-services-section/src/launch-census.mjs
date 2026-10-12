import { houseSectionOf, openingOf } from "@red-cup-engineering/organizing/enterprise";
import { admitLaunchPlan, launchCalendar } from "./launch-plan.mjs";

/**
 * The publisher's launch census: every admitted launch plan's calendar, and a request on the work board for each
 * milestone coming due. It is a derivation (organizing/enterprise `reconcileDerivedOpenings`): the publisher's
 * enterprise lists the census under `derives`, and each turn of its loop opens the requests the board lacks and
 * settles its own requests the census no longer asks. A milestone asks from `leadDays` before its date until
 * `graceDays` after it; a moved date is a new request, and the old one is withdrawn. A plan conflict asks until
 * the plan resolves it, and so does a plan the census cannot admit.
 */

export const LAUNCH_CENSUS_KIND = "publication-launch-census.v1";

const parse = (value) => { const [y, m, d] = value.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (value, days) => { const next = parse(value); next.setUTCDate(next.getUTCDate() + days); return next.toISOString().slice(0, 10); };

/** What will be so when a milestone is met: an end state, never the activity (the taker chooses the means). */
const NEEDS = {
  "announce": ({ title, date, plan }) => `${title} is announced to readers by ${date}, with its ${plan.onSale.date} on-sale date and where to buy it.`,
  "on-sale": ({ title, date, channel }) => `${title} is on sale on ${channel} from ${date}.`,
  "final-file-due": ({ title, date, channel, channelId, plan }) => `${title}'s final file is in place on ${channel} by ${date}, ahead of its ${plan.onSale.channels?.[channelId] ?? plan.onSale.date} on-sale date.`,
  "preorder-create": ({ title, date, channel }) => `${title} is up for pre-order on ${channel} from ${date}.`,
  "advance-reading-opens": ({ title, date, plan }) => `${title}'s advance-reader team, up to ${plan.advanceReading.teamSize} readers, holds marked review copies from ${date}.`,
  "advance-reading-reminder": ({ title, date, plan }) => `${title}'s advance readers have been reminded by ${date} that their window closes ${plan.advanceReading.closes}.`,
  "advance-reading-closes": ({ title, date }) => `${title}'s advance-reading window is closed on ${date}, its unclaimed copies expired.`,
  "review-readout": ({ title, date }) => `${title}'s review readout, counting the reviews its advance readers posted, is on record by ${date}.`,
  "launch-readout": ({ title, date, plan }) => `${title}'s launch readout is on record${plan.readout?.record ? ` at ${plan.readout.record.replace("<date>", date)}` : ""} by ${date}.`,
};

/** The one conforming requirement a milestone carries: its date and the rule that set it. */
const requirementOf = (milestone) => ({ id: "dated", says: `The ${milestone.kind.replaceAll("-", " ")} milestone shall hold on ${milestone.date}, the date ${milestone.rule.split(";")[0]} sets.` });

/**
 * What a launch request is about: the publication and its channel, and the section of the house whose records hold
 * the plan. The board homes a request only by the sections it names (work-arena `homeOf`); a request naming none is
 * `unscoped` and no enterprise is at home with it.
 */
const scopeOf = (plan, channel, path) => {
  const section = houseSectionOf(path.slice(0, path.indexOf("/data/records/")));
  if (section === undefined) throw new TypeError(`a launch plan is a record of a section of the house (${path})`);
  return [...(typeof plan?.work === "string" ? [`publication:${plan.work}`] : []), ...(channel ? [`retail-channel:${channel}`] : []), `section:${section}`];
};

/** A milestone's request, the way the board will hold it. */
export function milestoneOpening({ plan, milestone, poster, today, path, channelName = (id) => id }) {
  const title = plan.title ?? plan.work;
  const need = NEEDS[milestone.kind]({ title, date: milestone.date, plan, channelId: milestone.channel, channel: milestone.channel === undefined ? undefined : channelName(milestone.channel) });
  return openingOf({
    move: "request",
    by: poster,
    need,
    requirements: [requirementOf(milestone)],
    conditions: [{ id: "observed", says: `The ${milestone.kind.replaceAll("-", " ")} is observed in place on its date, with a record of where.`, method: "inspection", verifies: ["dated"] }],
    scope: scopeOf(plan, milestone.channel, path),
    tags: ["launch", milestone.kind],
    sources: [{ kind: "launch-plan", locator: path }, ...(milestone.sources ?? []).map((locator) => ({ kind: "channel-profile", locator }))],
    at: `${today}T00:00:00.000Z`,
  });
}

/** A plan conflict's request: the plan says something its channel profiles forbid, or leaves a date out. */
export function conflictOpening({ plan, conflict, poster, today, path, channelName = (id) => id }) {
  const title = plan.title ?? plan.work;
  const where = conflict.channel === undefined ? "" : ` on ${channelName(conflict.channel)}`;
  return openingOf({
    move: "request",
    by: poster,
    need: `${title}'s launch plan holds${where} without conflict: ${conflict.says}.`,
    requirements: [{ id: "consistent", says: `The launch plan at ${path} shall admit a calendar with no conflict${where}.` }],
    conditions: [{ id: "derived", says: "The launch census derived from the plan lists no conflict here.", method: "inspection", verifies: ["consistent"] }],
    scope: scopeOf(plan, conflict.channel, path),
    tags: ["launch", "launch-plan-conflict"],
    sources: [{ kind: "launch-plan", locator: path }],
    at: `${today}T00:00:00.000Z`,
  });
}

/** An inadmissible plan's request: the plan's section makes it admissible; the census never guesses at it. */
export function refusalOpening({ plan, reason, poster, today, path }) {
  const title = typeof plan?.title === "string" ? plan.title : typeof plan?.work === "string" ? plan.work : path;
  return openingOf({
    move: "request",
    by: poster,
    need: `${title}'s launch plan is admissible: ${reason.replace(/\.$/u, "")}.`,
    requirements: [{ id: "admissible", says: `The launch plan at ${path} shall admit as a version 2 PublicationLaunchPlan.` }],
    conditions: [{ id: "derived", says: "The launch census admits the plan and lists it under no refusal.", method: "inspection", verifies: ["admissible"] }],
    scope: scopeOf(plan, undefined, path),
    tags: ["launch", "launch-plan-refused"],
    sources: [{ kind: "launch-plan", locator: path }],
    at: `${today}T00:00:00.000Z`,
  });
}

/**
 * The census of `plans` ([{path, plan}], paths repository-relative) on `today`. Plans that are not version-2
 * PublicationLaunchPlans are left out by the caller; an inadmissible plan is listed under `refused` and asks to be
 * made admissible.
 */
export function deriveLaunchCensus({ plans, profiles, today, poster, commit = null, leadDays = 14, graceDays = 3 }) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(today ?? "")) throw new TypeError("a launch census is taken on a date");
  const names = new Map(profiles.filter(({ type }) => type === "RetailChannelProfile").map((profile) => [profile.channel, profile.name ?? profile.channel]));
  const channelName = (id) => names.get(id) ?? id;
  const from = addDays(today, -graceDays), until = addDays(today, leadDays);
  const calendars = [], openings = [], refused = [];
  for (const { path, plan } of [...plans].sort((a, b) => a.path.localeCompare(b.path))) {
    try { admitLaunchPlan(plan); } catch (error) {
      refused.push(Object.freeze({ path, reason: error.message }));
      openings.push(Object.freeze({ refused: path, opening: refusalOpening({ plan, reason: error.message, poster, today, path }) }));
      continue;
    }
    const calendar = launchCalendar(plan, profiles);
    calendars.push(Object.freeze({ work: plan.work, ...(plan.title ? { title: plan.title } : {}), plan: path, milestones: calendar.milestones, conflicts: calendar.conflicts }));
    for (const milestone of calendar.milestones) {
      if (milestone.date < from || milestone.date > until) continue;
      openings.push(Object.freeze({ milestone: milestone.id, date: milestone.date, opening: milestoneOpening({ plan, milestone, poster, today, path, channelName }) }));
    }
    for (const conflict of calendar.conflicts) {
      openings.push(Object.freeze({ conflict: [plan.work, conflict.channel].filter(Boolean).join(":"), opening: conflictOpening({ plan, conflict, poster, today, path, channelName }) }));
    }
  }
  return Object.freeze({
    kind: LAUNCH_CENSUS_KIND, ...(commit ? { commit } : {}), date: today, poster,
    // Every opening it derives is tagged launch, so it settles only launch work its poster opened.
    domain: Object.freeze({ tags: Object.freeze(["launch"]) }),
    window: Object.freeze({ from, until }),
    calendars: Object.freeze(calendars), refused: Object.freeze(refused), openings: Object.freeze(openings),
  });
}
