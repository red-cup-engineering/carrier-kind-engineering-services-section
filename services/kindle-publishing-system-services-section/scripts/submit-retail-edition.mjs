#!/usr/bin/env node
/**
 * Submit one accepted house edition to one retail channel through its gates
 * (src/retail-channels.mjs), with the book's listing for that channel from
 * the derived retail listings record and the founder's declarations receipt.
 *
 * An ebook channel is given the signed validation, the release acceptance,
 * the EPUB and the cover, and KDP the book's launch plan, which sets its
 * release: on publish, or a pre-order released on the plan's KDP date; the KDP paperback is given the print acceptance and
 * the interior and cover PDFs.
 *
 * --live drives the retailer's portal in a visible browser that a person
 * supervises: the publish click, and any sign-in or challenge, are theirs.
 * --rehearse shows a guided channel's panels over a blank page, headless, and
 * --fixtures drives KDP's saved pages; neither touches a portal, and both keep
 * their state apart from the live run's.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { retailChannel } from "../src/retail-channels.mjs";
import { runRetailSubmission } from "../src/retail-submission.mjs";

const usage = [
  "usage: submit-retail-edition.mjs --channel <id> --book <slug> --listings <book-retail-listings.json> --declarations <json> --data-root <dir> (--live | --rehearse | --fixtures <dir>)",
  "  ebook channels:    --validation <signed.json> --release-acceptance <json> --epub <file> --cover <file> [--launch-plan <json>]",
  "  kdp-paperback:     --print-acceptance <json> --interior <pdf> --print-cover <pdf>",
].join("\n");
const { values } = parseArgs({
  options: Object.fromEntries([
    ...["channel", "book", "listings", "declarations", "data-root", "fixtures", "validation", "release-acceptance", "epub", "cover", "launch-plan", "print-acceptance", "interior", "print-cover"].map((name) => [name, { type: "string" }]),
    ...["live", "rehearse"].map((name) => [name, { type: "boolean", default: false }]),
  ]),
});
const print = values.channel === "kdp-paperback";
const required = ["channel", "book", "listings", "declarations", "data-root", ...(print ? ["print-acceptance", "interior", "print-cover"] : ["validation", "release-acceptance", "epub", "cover"])];
for (const name of required) if (!values[name]) throw new Error(`missing --${name}\n${usage}`);
if ([values.live, values.rehearse, Boolean(values.fixtures)].filter(Boolean).length !== 1) throw new Error(`choose exactly one of --live, --rehearse and --fixtures\n${usage}`);
const channel = retailChannel(values.channel);
if (values.rehearse && !channel.rehearses) throw new Error(`${channel.name} has no rehearsal; use --fixtures`);

const json = async (path) => JSON.parse(await readFile(resolve(path), "utf8"));
const record = await json(values.listings);
const listing = record.books.find((book) => book.id === values.book || book.book === values.book)?.listings?.find((entry) => entry.channel === channel.id);
if (!listing) throw new Error(`the listings record has no ${channel.name} listing for ${values.book}`);

const edition = print
  ? { artifacts: { interior: resolve(values.interior), cover: resolve(values["print-cover"]) }, printAcceptance: await json(values["print-acceptance"]) }
  : { artifacts: { epub: resolve(values.epub), cover: resolve(values.cover) }, releaseAcceptance: await json(values["release-acceptance"]), validation: await json(values.validation) };
const state = await runRetailSubmission(channel, {
  book: values.book, listing, ...edition,
  declarationsReceipt: await json(values.declarations),
  ...(values["launch-plan"] ? { launchPlan: await json(values["launch-plan"]) } : {}),
  dataRoot: resolve(values["data-root"]),
  dryRun: !values.live,
  ...(values.fixtures ? { fixtureRoot: resolve(values.fixtures) } : {}),
}, { allowLive: values.live });
process.stdout.write(`${JSON.stringify({ channel: channel.id, status: state.status, completed: state.completed, blocker: state.blocker ?? null, remoteIdentifier: state.remoteIdentifier ?? null }, null, 2)}\n`);
if (!["submitted", "in-progress"].includes(state.status)) process.exitCode = 1;
