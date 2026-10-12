#!/usr/bin/env node
/**
 * Read-only: record the form controls of a retailer portal's pages in a
 * browser the founder supervises. Clicks and saves nothing.
 *
 * usage: retailer-discover.mjs <retailer> [--out <file>] [--walk [--start <url>] | <portal page url>...]
 *
 * With page URLs it loads each one. With --walk (the default when no URL is
 * given) the founder moves through the portal and clicks Record on each form.
 */
import { parseArgs } from "node:util";
import { RETAILER_ACCOUNTS } from "../src/retailer-accounts.mjs";
import { discoverRetailerForms, walkRetailerForms } from "../src/retail-discovery.mjs";

const usage = `usage: retailer-discover.mjs <${Object.keys(RETAILER_ACCOUNTS).join("|")}> [--out <file>] [--walk [--start <url>] | <portal page url>...]`;
const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, walk: { type: "boolean", default: false }, start: { type: "string" } } });
const [retailer, ...pages] = positionals;
if (!retailer || (values.walk && pages.length) || (values.start && pages.length)) throw new Error(usage);
const options = { ...(values.out ? { out: values.out } : {}) };
const result = pages.length
  ? await discoverRetailerForms(retailer, { ...options, pages })
  : await walkRetailerForms(retailer, { ...options, ...(values.start ? { start: values.start } : {}) });
process.stdout.write(`${JSON.stringify(result)}\n`);
