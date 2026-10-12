#!/usr/bin/env node
/**
 * Submit one accepted house edition to KDP through the gated submission loop:
 * the signed Kindle validation, the Kindle release acceptance, the declarations
 * receipt and the book's KDP listing (from the derived retail listings record).
 *
 * Without --live it drives the saved fixture pages. With --live it drives
 * kdp.amazon.com in a visible browser that a person supervises, and it stops
 * for them at any sign-in or challenge.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { runKdpSubmission } from "../src/kdp-submit.mjs";

const usage = "usage: submit-kdp-edition.mjs --book <slug> --listings <book-retail-listings.json> --validation <signed.json> --release-acceptance <json> --declarations <json> --epub <file> --cover <file> --data-root <dir> [--fixtures <dir> | --live]";
const { values } = parseArgs({ options: { book: { type: "string" }, listings: { type: "string" }, validation: { type: "string" }, "release-acceptance": { type: "string" }, declarations: { type: "string" }, epub: { type: "string" }, cover: { type: "string" }, "data-root": { type: "string" }, fixtures: { type: "string" }, live: { type: "boolean", default: false } } });
for (const name of ["book", "listings", "validation", "release-acceptance", "declarations", "epub", "cover", "data-root"]) if (!values[name]) throw new Error(usage);
if (values.live === Boolean(values.fixtures)) throw new Error(`choose exactly one of --fixtures and --live\n${usage}`);

const json = async (path) => JSON.parse(await readFile(resolve(path), "utf8"));
const record = await json(values.listings);
const listing = record.books.find((book) => book.id === values.book || book.book === values.book)?.listings?.find((entry) => entry.channel === "kdp");
if (!listing) throw new Error(`the listings record has no KDP listing for ${values.book}`);

const state = await runKdpSubmission({
  book: values.book,
  listing,
  artifacts: { epub: resolve(values.epub), cover: resolve(values.cover) },
  releaseAcceptance: await json(values["release-acceptance"]),
  validation: await json(values.validation),
  declarationsReceipt: await json(values.declarations),
  dataRoot: resolve(values["data-root"]),
  dryRun: !values.live,
  ...(values.fixtures ? { fixtureRoot: resolve(values.fixtures) } : {}),
}, { allowLive: values.live });
process.stdout.write(`${JSON.stringify({ status: state.status, completed: state.completed, blocker: state.blocker ?? null, remoteIdentifier: state.remoteIdentifier ?? null }, null, 2)}\n`);
if (!["submitted", "in-progress"].includes(state.status)) process.exitCode = 1;
