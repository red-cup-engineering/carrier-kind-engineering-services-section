#!/usr/bin/env node
/**
 * Give review copies of one work through shop.561.group (src/review-copy-grants.mjs): one reader with --name,
 * --email and --reference, or every row of a private roster (a JSON array of {name, email, reference, invitation?},
 * kept outside git). Each copy is stamped, validated with the release EPUBCheck profile, staged in the shop's goods
 * bucket, recorded at /api/review-copies and written up as a material-connection record. Repeating a run gives
 * nothing twice.
 *
 * Reads the shop's gift-agent key (shop.561.group/gift-agent.key) and the R2 token (API_KEY_CLOUDFLARE_R2_EDIT in
 * house-env.env) from the host's rendered credentials. Readers and invitations stay in the private ledger
 * under the work's section, data/state/review-copy-state (its reader.json and stamped copies are never committed);
 * the material-connection records go to data/records/review-copy-records. Prints grant ids and links, never addresses.
 */
import { credentialPath } from "@red-cup-engineering/credential-custody-service/keep";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createR2RestClient, r2RestConfiguration } from "@red-cup-engineering/cloudflare-r2-services-section/r2-rest";
import { validateEpub } from "@red-cup-engineering/ebook-engineering-services-section/kindle-validation";
import { grantReviewCopy } from "../src/review-copy-grants.mjs";

const usage = "usage: grant-review-copies.mjs --plan <launch.json> --release-acceptance <json> --epub <accepted.epub> --title <title> --channel advance-reader-team|outreach (--roster <private.json> | --name <name> --email <address> --reference <ref> [--invitation-file <text>]) [--campaign <id>] [--offering <id>] [--records <dir>] [--state <dir>] [--origin <url>] [--today YYYY-MM-DD]";
const { values } = parseArgs({ options: Object.fromEntries(["plan", "release-acceptance", "epub", "title", "channel", "roster", "name", "email", "reference", "invitation-file", "campaign", "offering", "records", "state", "origin", "today"].map((name) => [name, { type: "string" }])) });
for (const name of ["plan", "release-acceptance", "epub", "title", "channel"]) if (!values[name]) throw new Error(`--${name} is required\n${usage}`);
if (Boolean(values.roster) === Boolean(values.name || values.email || values.reference)) throw new Error(`give --roster, or --name, --email and --reference\n${usage}`);

const home = process.env.HOME ?? homedir();
if (!process.env.API_KEY_CLOUDFLARE_R2_EDIT) process.loadEnvFile(credentialPath("house-env.env"));
process.env.EPUBCHECK_5_3_JAR ??= join(home, ".local", "share", "epubcheck", "epubcheck-5.3.0", "epubcheck.jar");

const planPath = resolve(values.plan);
const plan = JSON.parse(await readFile(planPath, "utf8"));
const work = (plan.content ?? plan).work;
const readers = values.roster
  ? JSON.parse(await readFile(resolve(values.roster), "utf8"))
  : [{ name: values.name, email: values.email, reference: values.reference, invitation: values["invitation-file"] ? await readFile(resolve(values["invitation-file"]), "utf8") : null }];
const deps = {
  giver: "press@561.group", contact: "press@561.group",
  stateDir: resolve(values.state ?? join(dirname(planPath), "..", "..", "state", "review-copy-state")),
  recordsDir: resolve(values.records ?? join(dirname(planPath), "..", "review-copy-records", work)),
  shop: { origin: values.origin ?? "https://shop.561.group", key: (await readFile(credentialPath("shop.561.group/gift-agent.key"), "utf8")).trim() },
  goods: createR2RestClient({ ...r2RestConfiguration({ ...process.env, CLOUDFLARE_R2_BUCKET: "shop-561-group-goods" }), bucket: "shop-561-group-goods" }),
  validate: (path) => validateEpub(path, { evidenceRoot: join(dirname(path), "validation-evidence") }),
};
// A reader's name and address, and the stamped copies the shop already holds, are kept in the state directory but
// never committed; the grants' renditions are.
await mkdir(deps.stateDir, { recursive: true });
if (!existsSync(join(deps.stateDir, ".gitignore"))) await writeFile(join(deps.stateDir, ".gitignore"), "reader.json\n*.epub\n");
const shared = {
  plan, releaseAcceptance: JSON.parse(await readFile(resolve(values["release-acceptance"]), "utf8")), acceptedEpub: resolve(values.epub),
  offering: values.offering ?? work, title: values.title, channel: values.channel, campaign: values.campaign ?? null,
  today: values.today ?? new Date().toISOString().slice(0, 10),
};
const given = [];
for (const reader of readers) {
  const result = await grantReviewCopy({ ...shared, reader: { name: reader.name, email: reader.email }, reference: reader.reference, invitation: reader.invitation ?? null }, deps);
  given.push({ grant: result.grant, url: result.url, disposition: result.disposition, record: result.recordPath });
}
process.stdout.write(`${JSON.stringify({ work, channel: shared.channel, given }, null, 2)}\n`);
