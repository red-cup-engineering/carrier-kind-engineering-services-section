import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";

/**
 * ONIX code list 64 (publishing status), by name. A channel the plan intends with a date is `forthcoming`;
 * `unspecified` is a channel the title is not yet planned for, and it has no milestones until it gets its own date.
 */
export const PUBLISHING_STATUSES = Object.freeze({
  unspecified: "00", cancelled: "01", forthcoming: "02", "postponed-indefinitely": "03", active: "04",
  "no-longer-our-product": "05", "out-of-stock-indefinitely": "06", "out-of-print": "07", inactive: "08",
  unknown: "09", remaindered: "10", "withdrawn-from-sale": "11", recalled: "12",
  "temporarily-withdrawn-from-sale": "16", "permanently-withdrawn-from-sale": "17",
});

/** Statuses that say when the title is or will be on sale there (ONIX list 64: 02 carries an expected date, 04 a publication date). */
export const DATED_STATUSES = Object.freeze(["forthcoming", "active"]);

const date = { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" };

export const publicationLaunchPlanType = defineSchemaType({
  $id: "org.561-group.publishing.publication-launch-plan.v2", title: "Publication launch plan",
  description: "When and where a publication goes on sale: its on-sale and announce dates, pre-order choice per channel, advance-reading window, and each channel's ONIX publishing status. The calendar is derived from it.",
  type: "object", additionalProperties: true,
  required: ["type", "version", "work", "plannedAt", "onSale", "announce", "preorder", "advanceReading", "channels"],
  properties: {
    type: { const: "PublicationLaunchPlan" }, version: { const: 2 }, work: { type: "string", minLength: 1 }, title: { type: "string", minLength: 1 }, plannedAt: date,
    onSale: { type: "object", additionalProperties: false, required: ["date"], properties: { date, channels: { type: "object", additionalProperties: date } } },
    announce: date,
    preorder: { type: "object", additionalProperties: { type: "boolean" } },
    advanceReading: {
      oneOf: [{ type: "null" }, {
        type: "object", additionalProperties: false, required: ["opens", "closes", "teamSize", "rendition"],
        properties: { opens: date, closes: date, teamSize: { type: "integer", minimum: 1 }, rendition: { const: "advance-reader-v1" }, edition: { type: "string" } },
      }],
    },
    channels: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["id", "status", "notes"],
        properties: {
          id: { type: "string", minLength: 1 }, profile: { type: "string" },
          status: { enum: Object.keys(PUBLISHING_STATUSES) },
          remoteId: { type: "string" }, where: { type: "string" }, edition: { type: "string" },
          notes: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
});

const ownDate = (plan, channel) => Object.hasOwn(plan.onSale.channels ?? {}, channel);
/** A channel's on-sale date: its own when the plan states one (null included), else the plan's. */
const onSaleOf = (plan, channel) => ownDate(plan, channel) ? plan.onSale.channels[channel] : plan.onSale.date;

/**
 * Admit a version-2 plan as a content-addressed cell, or throw with the refusal. Beyond the schema: each channel
 * appears once, has a pre-order choice (and the choices name no other channel), and has an on-sale date (its own
 * or the plan's) when its status is one that carries a date.
 */
export function admitLaunchPlan(plan) {
  const admitted = createTypedMark(publicationLaunchPlanType, plan);
  if (!admitted.ok) throw new TypeError(admitted.refusal.message);
  const ids = plan.channels.map(({ id }) => id);
  for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) throw new TypeError(`channel ${id} appears twice`);
  for (const id of ids) if (!Object.hasOwn(plan.preorder, id)) throw new TypeError(`channel ${id} has no pre-order choice (plan.preorder.${id})`);
  for (const id of Object.keys(plan.preorder)) if (!ids.includes(id)) throw new TypeError(`plan.preorder names ${id}, which is not one of the plan's channels`);
  for (const { id, status } of plan.channels) {
    if (DATED_STATUSES.includes(status) && !onSaleOf(plan, id)) throw new TypeError(`channel ${id} is ${status} (ONIX list 64, code ${PUBLISHING_STATUSES[status]}) and needs an on-sale date`);
  }
  return admitted.value;
}

/**
 * How an admitted plan releases its title on one channel: `{ preorder: false }`, on sale once the channel lists it, or
 * `{ preorder: true, date }`, taking orders until the channel's on-sale date. A channel already active takes no
 * pre-orders, whatever the plan chose for it before it went on sale.
 */
export function channelRelease(plan, channel) {
  admitLaunchPlan(plan);
  const planned = plan.channels.find(({ id }) => id === channel);
  if (!planned) throw new TypeError(`${plan.work}'s launch plan has no ${channel} channel`);
  if (!plan.preorder[channel] || planned.status === "active") return Object.freeze({ preorder: false });
  const date = onSaleOf(plan, channel);
  if (!date) throw new TypeError(`${plan.work}'s launch plan takes pre-orders on ${channel} but gives it no on-sale date`);
  return Object.freeze({ preorder: true, date });
}

/**
 * Version 1 kept prose per channel; version 2 keeps that prose as notes under a typed status the migrator states.
 * Version 1 had no pre-orders, so a channel's choice is false unless the migrator states one.
 */
export function migrateLaunchPlan(v1, { onSale = { date: null }, announce = null, preorder = {}, advanceReading = null, channels = {} } = {}) {
  if (v1?.type !== "PublicationLaunchPlan" || v1.version !== 1) throw new TypeError("migrateLaunchPlan needs a version-1 PublicationLaunchPlan");
  const { channels: v1Channels = [], version, ...kept } = v1;
  return {
    ...kept, version: 2, onSale, announce, preorder: Object.fromEntries(v1Channels.map(({ id }) => [id, preorder[id] ?? false])), advanceReading,
    channels: v1Channels.map(({ id, state, blockedOn, where, edition }) => ({
      id, status: "unspecified", ...(where ? { where } : {}), ...(edition ? { edition } : {}),
      notes: [state, blockedOn].filter(Boolean), ...channels[id],
    })),
  };
}

const parse = (value) => { const [y, m, d] = value.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const format = (value) => value.toISOString().slice(0, 10);
const addDays = (value, days) => { const next = parse(value); next.setUTCDate(next.getUTCDate() + days); return format(next); };
const addMonths = (value, months) => { const next = parse(value); next.setUTCMonth(next.getUTCMonth() + months); return format(next); };
const subtractBusinessDays = (value, count) => {
  const next = parse(value);
  for (let left = count; left > 0;) { next.setUTCDate(next.getUTCDate() - 1); if (![0, 6].includes(next.getUTCDay())) left -= 1; }
  return format(next);
};

/** The date a profile's final-file rule falls on; hours round up to whole days, business days skip weekends only. */
export function finalFileDueDate(onSale, due) {
  if (due.businessDays) return subtractBusinessDays(onSale, due.businessDays);
  return addDays(onSale, -((due.days ?? 0) + Math.ceil((due.hours ?? 0) / 24)));
}

const ruleText = (due) => due.businessDays ? `${due.businessDays} business days before on-sale` : due.days ? `${due.days} days before on-sale` : `${due.hours} hours before on-sale`;

/**
 * Every dated milestone of a plan with the rule it came from. Pure: the same plan and profiles give the same calendar.
 * Profiles are the dated RetailChannelProfile records (by `channel`) and one AdvanceReadingProfile.
 * `conflicts` names what the plan asks that its profiles forbid; a conflicting plan still yields its other milestones.
 */
export function launchCalendar(plan, profiles) {
  const retail = new Map(profiles.filter(({ type }) => type === "RetailChannelProfile").map((profile) => [profile.channel, profile]));
  const reading = profiles.find(({ type }) => type === "AdvanceReadingProfile");
  const milestones = [], conflicts = [];
  const add = (milestone) => milestones.push(Object.freeze({ work: plan.work, ...milestone, id: [plan.work, milestone.kind, milestone.channel].filter(Boolean).join(":") }));

  if (plan.announce) add({ kind: "announce", date: plan.announce, rule: "plan.announce" });
  for (const channel of plan.channels) {
    const profile = retail.get(channel.profile ?? channel.id), onSale = onSaleOf(plan, channel.id);
    if (channel.status === "unspecified" && !ownDate(plan, channel.id)) continue;
    if (!onSale && channel.status === "forthcoming") conflicts.push({ channel: channel.id, says: "a forthcoming channel needs an expected on-sale date (ONIX list 64, code 02)" });
    if (!onSale || ["cancelled", "withdrawn-from-sale", "permanently-withdrawn-from-sale", "no-longer-our-product"].includes(channel.status)) continue;
    add({ kind: "on-sale", channel: channel.id, date: onSale, rule: ownDate(plan, channel.id) ? "plan.onSale.channels" : "plan.onSale.date" });
    if (!profile) { conflicts.push({ channel: channel.id, says: `no retail channel profile for ${channel.profile ?? channel.id}` }); continue; }
    const sources = profile.sources ?? [];
    if (profile.finalFileDue && channel.status !== "active") add({ kind: "final-file-due", channel: channel.id, date: finalFileDueDate(onSale, profile.finalFileDue), rule: `${profile.name}: final file ${ruleText(profile.finalFileDue)}`, profile: `${profile.channel}@${profile.observedOn}`, sources });
    if (plan.preorder[channel.id] && channel.status !== "active") {
      const opensFrom = plan.announce ?? plan.plannedAt;
      if (!opensFrom) conflicts.push({ channel: channel.id, says: "a pre-order needs an announce date to open on" });
      else {
        const earliest = profile.preorderMaxAhead ? addMonths(onSale, -profile.preorderMaxAhead.months) : null;
        if (earliest && opensFrom < earliest) conflicts.push({ channel: channel.id, says: `pre-order cannot open before ${earliest}, ${profile.preorderMaxAhead.months} months ahead of on-sale` });
        if (opensFrom >= onSale) conflicts.push({ channel: channel.id, says: "the pre-order would open on or after its on-sale date" });
        add({
          kind: "preorder-create", channel: channel.id, date: opensFrom, sources, profile: `${profile.channel}@${profile.observedOn}`,
          rule: profile.titleSlots ? `${profile.name}: a pre-order spends a weekly title slot at creation (${profile.titleSlots.perFormatPerWeek} per format, reset ${profile.titleSlots.resetsAt})` : "pre-order opens at announcement",
        });
      }
    }
  }
  if (plan.announce && plan.onSale.date && plan.announce > plan.onSale.date) conflicts.push({ says: "announce falls after on-sale" });
  if (plan.advanceReading) {
    const { opens, closes } = plan.advanceReading, onSale = plan.onSale.date;
    add({ kind: "advance-reading-opens", date: opens, rule: "plan.advanceReading.opens; invitations go out" });
    add({ kind: "advance-reading-closes", date: closes, rule: "plan.advanceReading.closes; claims expire" });
    if (closes < opens) conflicts.push({ says: "advance reading closes before it opens" });
    if (onSale && reading) {
      const cite = { profile: `advance-reading@${reading.observedOn}`, sources: reading.sources ?? [] };
      const beforeRelease = opens <= onSale;
      add({
        kind: "advance-reading-reminder", ...cite,
        date: beforeRelease ? addDays(onSale, reading.reminder.onSaleOffsetDays) : addDays(closes, -7),
        rule: beforeRelease ? "advance readers are reminded on release day" : "a window opened after release reminds its readers a week before it closes",
      });
      add({ kind: "review-readout", date: addDays(beforeRelease ? onSale : opens, reading.reviewReadout.onSaleOffsetDays), rule: `review readout ${reading.reviewReadout.onSaleOffsetDays} days after ${beforeRelease ? "on-sale" : "a post-release window opens"}`, ...cite });
      if (opens > onSale && !plan.channels.some(({ status }) => status === "active")) conflicts.push({ says: "advance reading opens after on-sale" });
    }
  }
  const firstRead = plan.readout?.firstReadAfterDays ?? reading?.launchReadout?.onSaleOffsetDays;
  if (plan.onSale.date && firstRead !== undefined) add({ kind: "launch-readout", date: addDays(plan.onSale.date, firstRead), rule: plan.readout?.firstReadAfterDays !== undefined ? "plan.readout.firstReadAfterDays" : "advance-reading profile launch readout" });
  milestones.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return Object.freeze({ work: plan.work, milestones: Object.freeze(milestones), conflicts: Object.freeze(conflicts) });
}

/** Milestones due on or before `today` that are not yet past their own date by more than `graceDays`. */
export function dueMilestones(calendar, today, { graceDays = 0 } = {}) {
  return calendar.milestones.filter(({ date: when }) => when <= today && addDays(when, graceDays) >= today);
}

/** The latest profile per channel from a directory of dated profile records. */
export async function readChannelProfiles(directory) {
  const latest = new Map();
  for (const name of (await readdir(directory)).filter((entry) => entry.endsWith(".json")).sort()) {
    const record = JSON.parse(await readFile(join(directory, name), "utf8"));
    const key = record.type === "AdvanceReadingProfile" ? "advance-reading" : record.channel;
    if (!latest.has(key) || latest.get(key).observedOn <= record.observedOn) latest.set(key, record);
  }
  return Object.freeze([...latest.values()]);
}
