/**
 * enterprise/settings — the points a micro-enterprise holds on its grey bands (Huidu glossary:
 * huidu, fa). Each axis the enterprise declares has two poles, a unit, a default and what it means;
 * a setting record chooses a point on it, says who chose it and why, and when it is to be looked
 * at again. The current setting of an axis is its latest record, else the declared default. A
 * setting is a held judgment, never a rule: rules (BCP 14 records) are what does not move.
 *
 * So a point is due until it is judged and again once its revisit date passes. A declared default
 * is nobody's judgment. A record must say when it is to be looked at again (`checkJudgment`),
 * because a judgment that is never revisited is a rule that has stopped being a judgment.
 *
 * No point waits for someone to own it. Each due point is judged by the enterprise's own turn
 * (`derivedJudgmentsOf`): it looks at the point against what its flow measures and holds it there,
 * saying so, until the flow window has passed again. Any of its doers (organizing/agency governing
 * `doersOf`) may choose another point with its own reasons; the latest record stands.
 * @packageDocumentation
 */

/** A setting value checked against its axis's poles. */
export function checkSetting(axis, value) {
  if (!Number.isFinite(value)) throw new TypeError(`${axis.axis}: a setting is a number`);
  const [low, high] = axis.poles ?? [-Infinity, Infinity];
  if (value < Math.min(low, high) || value > Math.max(low, high)) throw new TypeError(`${axis.axis}: ${value} is outside its band ${low} to ${high}`);
  return value;
}

/** A setting record checked as a held judgment: it says why, and when after it is made it is revisited. */
export function checkJudgment(record, now = Date.now()) {
  if (typeof record.because !== "string" || record.because.trim() === "") throw new TypeError(`${record.axis}: a setting says why it was chosen`);
  const revisit = Date.parse(record.revisitBy ?? "");
  if (!Number.isFinite(revisit)) throw new TypeError(`${record.axis}: a setting says when it is to be looked at again (revisitBy); a point never revisited is a rule, not a judgment`);
  if (revisit <= now) throw new TypeError(`${record.axis}: revisitBy ${record.revisitBy} is not after the setting is made`);
  return record;
}

/**
 * The current point on every declared axis, with who set it, why, since when, whether an office has
 * judged it, and whether it is due: unjudged, or judged without a revisit date, or past it.
 */
export function currentSettings(enterprise, records, { now = Date.now() } = {}) {
  return Object.freeze(enterprise.settings.map((axis) => {
    const mine = records.filter((r) => r.enterprise === enterprise.id && r.axis === axis.axis).sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)));
    const last = mine.at(-1);
    return Object.freeze({
      axis: axis.axis,
      means: axis.means ?? null,
      unit: axis.unit ?? null,
      poles: axis.poles ?? null,
      value: last ? last.value : axis.default,
      setBy: last?.by ?? "declared default",
      because: last?.because ?? axis.because ?? null,
      since: last?.recordedAt ?? null,
      revisitBy: last?.revisitBy ?? null,
      judged: last !== undefined,
      due: last === undefined || !(Date.parse(last.revisitBy ?? "") > now),
      history: mine.length,
    });
  }));
}

/** The current settings as a plain map from axis to value, for code that reads them. */
export const settingValues = (enterprise, records, options) => Object.freeze(Object.fromEntries(currentSettings(enterprise, records, options).map((s) => [s.axis, s.value])));

/** The measured flow a derived judgment cites, as one sentence. */
const flowText = ({ windowDays, delivered, open, held, unheld, capacity, limit }) =>
  `in the last ${windowDays} days it delivered ${delivered} thread${delivered === 1 ? "" : "s"}; it is home to ${open} open, ${held} held and ${unheld} held by no one; it has capacity for ${capacity} requirements in progress and may take ${limit} more this turn`;

/**
 * The enterprise's own turn's judgment of each due point (`currentSettings` `due`): a setting record
 * holding the point where it stands, because of what its flow measures, to be looked at again once the
 * flow window (its `flow-window` setting, in days) has passed. It is played as the enterprise itself
 * (`by`), so a doer's later choice replaces it. Points not due are left as judged.
 * @param {object} enterprise the enterprise (constitution `enterpriseOf`)
 * @param {ReadonlyArray<object>} current its current settings (`currentSettings`)
 * @param {{ windowDays: number, delivered: number, open: number, held: number, unheld: number, capacity: number, limit: number }} flow
 * @param {{ at: string }} options
 */
export function derivedJudgmentsOf(enterprise, current, flow, { at }) {
  const windowDays = Math.max(1, Math.round(current.find((setting) => setting.axis === "flow-window")?.value ?? flow.windowDays ?? 14));
  const revisitBy = new Date(Date.parse(at) + windowDays * 86_400_000).toISOString();
  const measured = flowText({ ...flow, windowDays });
  return Object.freeze(current.filter((setting) => setting.due).map((setting) => Object.freeze({
    enterprise: enterprise.id, axis: setting.axis, value: setting.value,
    because: `held at ${setting.value} ${setting.unit ?? ""}`.trimEnd() + ` by ${enterprise.id}'s own turn on its measured flow: ${measured}. ${setting.judged ? `Its last judgment (${setting.setBy}, ${setting.since}) came due` : "No one had chosen it"}; any of its doers may choose another point.`,
    revisitBy, by: enterprise.id,
  })));
}
