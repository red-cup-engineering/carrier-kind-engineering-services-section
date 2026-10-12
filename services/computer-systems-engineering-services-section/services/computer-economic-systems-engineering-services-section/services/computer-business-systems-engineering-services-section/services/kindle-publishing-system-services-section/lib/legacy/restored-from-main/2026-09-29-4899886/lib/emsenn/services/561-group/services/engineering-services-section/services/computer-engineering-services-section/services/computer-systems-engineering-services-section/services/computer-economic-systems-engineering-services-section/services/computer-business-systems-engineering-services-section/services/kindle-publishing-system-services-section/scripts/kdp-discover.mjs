#!/usr/bin/env node
/**
 * Read-only: record the form controls of KDP title-setup pages in a browser
 * the founder supervises (they complete any sign-in). Clicks and saves nothing.
 * usage: kdp-discover.mjs --out <file> <kdp page url>...
 */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { discoverKdpForms } from "../src/kdp-discovery.mjs";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" } } });
if (!values.out || positionals.length === 0) throw new Error("usage: kdp-discover.mjs --out <file> <kdp page url>...");
if (!positionals.every((url) => new URL(url).hostname === "kdp.amazon.com")) throw new Error("kdp-discover reads kdp.amazon.com pages only");
process.stdout.write(`${JSON.stringify(await discoverKdpForms({ pages: positionals, out: resolve(values.out) }))}\n`);
