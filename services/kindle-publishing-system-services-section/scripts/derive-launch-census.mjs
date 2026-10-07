#!/usr/bin/env node
/**
 * Take the publisher's launch census (src/launch-census.mjs): read every version-2 PublicationLaunchPlan in the
 * launch directories and the latest channel profiles, and write the census the publisher's enterprise derives its
 * launch requests from. --retain commits and pushes the census alone. Needs nobody at the node.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { workingTreeOf } from "@red-cup-engineering/computer-code-development-engine/git/working-tree";
import { deriveLaunchCensus } from "../src/launch-census.mjs";
import { readChannelProfiles } from "../src/launch-plan.mjs";

const SERVICES = "lib/emsenn/services/561-group/services";
const DEFAULTS = {
  launches: [`${SERVICES}/public-services-section/services/public-media-services-section/services/public-fiction-media-services-section/data/records/launches`],
  profiles: `${SERVICES}/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/business-science-services-section/services/marketing-science-services-section/data/records/retail-channel-profiles`,
  out: `${SERVICES}/public-services-section/services/public-media-services-section/services/public-fiction-media-services-section/data/records/launches/census.json`,
  poster: "causeway-publishing",
};
const USAGE = "usage: derive-launch-census [--launches <dir>]... [--profiles <dir>] [--out <census.json>] [--poster <enterprise>] [--today YYYY-MM-DD] [--check] [--retain]\n"
  + "  Paths are repository-relative. --check exits 1 when the census on disk differs from today's; --retain commits and pushes it.";

// The repository the census is read from and retained in: the node's working tree under its job's custody, or the checkout it runs in.
const tree = workingTreeOf(import.meta.url);
const repository = tree.root;
const posix = (path) => relative(repository, resolve(repository, path)).split(sep).join("/");

export async function main(argv, { output = process.stdout } = {}) {
  const { values } = parseArgs({
    args: argv,
    options: { launches: { type: "string", multiple: true }, profiles: { type: "string" }, out: { type: "string" }, poster: { type: "string" }, today: { type: "string" }, check: { type: "boolean" }, retain: { type: "boolean" }, help: { type: "boolean" } },
  });
  if (values.help) { output.write(`${USAGE}\n`); return 0; }
  const today = values.today ?? new Date().toISOString().slice(0, 10);
  const plans = [];
  for (const directory of values.launches ?? DEFAULTS.launches) {
    for (const name of (await readdir(resolve(repository, directory))).filter((entry) => entry.endsWith(".json")).sort()) {
      const path = posix(join(directory, name));
      const plan = JSON.parse(await readFile(resolve(repository, path), "utf8"));
      if (plan?.type === "PublicationLaunchPlan" && plan.version === 2) plans.push({ path, plan });
    }
  }
  const profiles = await readChannelProfiles(resolve(repository, values.profiles ?? DEFAULTS.profiles));
  const census = deriveLaunchCensus({ plans, profiles, today, poster: values.poster ?? DEFAULTS.poster });
  const out = posix(values.out ?? DEFAULTS.out);
  const text = `${JSON.stringify(census, null, 2)}\n`;
  const held = await readFile(resolve(repository, out), "utf8").catch(() => null);
  const summary = { census: out, date: today, plans: census.calendars.length, refused: census.refused.length, openings: census.openings.length };
  if (values.check) { output.write(`${JSON.stringify({ ...summary, current: held === text }, null, 2)}\n`); return held === text ? 0 : 1; }
  if (held !== text) await writeFile(resolve(repository, out), text);
  let retained = {};
  if (values.retain && held !== text) {
    const { committed, pushed, obstructions } = tree.retain({ paths: [out], message: `Launch census ${today}: the publisher's launch requests coming due` });
    retained = { committed, pushed, ...(obstructions ? { obstructions } : {}) };
  }
  output.write(`${JSON.stringify({ ...summary, changed: held !== text, ...retained }, null, 2)}\n`);
  return census.refused.length > 0 || retained.obstructions ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await main(process.argv.slice(2));
