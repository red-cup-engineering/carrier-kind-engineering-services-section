import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { renderAdvanceReaderCopy } from "@red-cup-engineering/ebook-production-services-section/advance-reader-rendition";
import { referencedReviewCopyId, reviewCopyPointerKey, stagedReviewCopyPointer } from "@red-cup-engineering/digital-goods-storefront-services-section/review-copy";

/**
 * Giving one reader a review copy, end to end, under Causeway Publishing's three rulings (the 2026-10-02 note on
 * the pre-release period of a publication):
 *
 *   invitation admitted → grant id from the reference → stamped copy rendered from the release-accepted EPUB and
 *   validated → copy and pointer staged in the shop's goods bucket → grant recorded at /api/review-copies, expiring
 *   when the plan's advance-reading window closes → material-connection record written.
 *
 * Every step is repeatable. The grant id derives from the giver and the reference, a stamped copy already rendered
 * for the grant is reused, the shop answers a repeated grant as a duplicate, and an existing material-connection
 * record is kept with its first date.
 *
 * The reader's name, address and any invitation text that names them stay in the private ledger (`stateDir`, 0600),
 * never in the material-connection record. The record carries the grant id, digests, the date and the invitation.
 */

export const REVIEW_TERMS = "A review is welcome and never required. If you post one, please say you received a free copy.";
export const REVIEW_COPY_CHANNELS = Object.freeze(["advance-reader-team", "outreach"]);

const DAY = 86_400_000;
const addDays = (isoDate, days) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const longDate = (isoDate) => new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * The three rulings as checks on one invitation's text. Ruling 1: no review is required, no rating is suggested,
 * nothing is offered beyond the copy; and a reviewer who posts is asked to mention the free copy. Ruling 3: nothing
 * says the sender is human. (Ruling 2, no house persona reviews a house book, binds reviewers, not invitations.)
 */
const RULES = Object.freeze([
  { id: "review-unconditioned", must: true, test: /\breview is welcome and (never|not) required\b/iu, says: "say that a review is welcome and not required" },
  { id: "mention-the-copy", must: true, test: /\b(say|mention|note|disclose)\b[^.]{0,80}\bfree copy\b/iu, says: "ask a reviewer who posts to mention the free copy" },
  { id: "no-review-obligation", must: false, test: /\b(in exchange for|in return for)\b[^.]{0,40}\breview|\bno obligation (other than|beyond|except)\b|\b(please|must|need to|required to) (leave|post|write) (a|an|your) (honest )?review\b/iu, says: "make a review the condition of the copy" },
  { id: "no-rating-suggested", must: false, test: /\b([1-5]|one|two|three|four|five)[- ]stars?\b|\b(positive|good|great|glowing|favou?rable) (review|rating)s?\b/iu, says: "suggest a rating or a favourable review" },
  { id: "nothing-beyond-the-copy", must: false, test: /\b(gift card|giveaway|raffle|prize|cash|payment|paid|compensat\w*|discount code|coupon)\b/iu, says: "offer anything beyond the copy" },
  { id: "never-claims-human", must: false, test: /\b(I am|I'm|we are|we're) (a )?(real|human|actual) (person|people|author|human)?\b|\bnot (an? )?(AI|bot)\b/iu, says: "claim the sender is human" },
]);

/** Check an invitation against the rulings. */
export function admitInvitation(text) {
  if (typeof text !== "string" || !text.trim()) return Object.freeze({ admitted: false, findings: Object.freeze([{ rule: "text", says: "an invitation has text" }]) });
  const findings = RULES.filter((rule) => rule.test.test(text) !== rule.must).map((rule) => ({ rule: rule.id, says: `the invitation must ${rule.must ? "" : "not "}${rule.says}` }));
  return Object.freeze({ admitted: findings.length === 0, findings: Object.freeze(findings), checked: Object.freeze(RULES.map(({ id }) => id)) });
}

/** The house invitation: the copy's link, how long it works, the review terms and the contact. */
export function reviewInvitation({ title, author, publisher, onSale, today, url, readableThrough, contact }) {
  for (const [name, value] of Object.entries({ title, author, publisher, onSale, today, url, readableThrough, contact })) if (!value) throw new TypeError(`an invitation needs ${name}`);
  const out = onSale > today ? `comes out ${longDate(onSale)}` : "is out now";
  return [
    `${title}, by ${author}, ${out}. Here is a free copy for you to read: ${url}`,
    "",
    `The link works through ${longDate(readableThrough)}. The copy is marked for you; please don't share it.`,
    "",
    `${REVIEW_TERMS} If you do review it, we'd be glad to hear where.`,
    "",
    `Questions: ${contact}`,
    publisher,
  ].join("\n");
}

/**
 * When a copy given today stops working, and whether it is an advance or a review copy. A grant is refused after
 * the plan's advance-reading window closes; an advance-reader-team grant is also refused before it opens, while an
 * outreach copy may go out early.
 */
export function reviewCopyWindow(plan, today, channel) {
  const reading = (plan?.content ?? plan)?.advanceReading, onSale = (plan?.content ?? plan)?.onSale?.date;
  if (!reading) throw new Error("the launch plan has no advance-reading window, so it gives no review copies");
  if (!REVIEW_COPY_CHANNELS.includes(channel)) throw new TypeError(`a review copy goes out through ${REVIEW_COPY_CHANNELS.join(" or ")}`);
  if (today > reading.closes) throw new Error(`advance reading closed ${reading.closes}`);
  if (channel === "advance-reader-team" && today < reading.opens) throw new Error(`advance reading opens ${reading.opens}`);
  if (!onSale) throw new Error("the launch plan has no on-sale date to print on the copy");
  return Object.freeze({ readableThrough: reading.closes, expiresAt: `${addDays(reading.closes, 1)}T00:00:00.000Z`, status: today >= onSale ? "review" : "advance", onSale });
}

const sha256Hex = { type: "string", pattern: "^[0-9a-f]{64}$" };
const digest = { type: "string", pattern: "^ni:///sha-256;[A-Za-z0-9_-]{43}$" };

export const materialConnectionType = defineSchemaType({
  $id: "org.561-group.publishing.material-connection.v1", title: "Material connection",
  description: "One free copy given to one reader for review (16 CFR 255 and 465): the grant, the edition and the stamped copy's digests, the date, the channel, and the invitation it was given under, checked against Causeway Publishing's rulings. It names no reader.",
  type: "object", additionalProperties: false,
  required: ["type", "version", "work", "offering", "grant", "giver", "channel", "campaign", "givenOn", "expiresAt", "edition", "rendition", "stampedSha256", "consideration", "reviewRequired", "invitation"],
  properties: {
    type: { const: "MaterialConnection" }, version: { const: 1 },
    work: { type: "string", minLength: 1 }, offering: { type: "string", minLength: 1 },
    grant: { type: "string", pattern: "^review-[0-9a-f-]{36}$" }, giver: { type: "string", minLength: 3 },
    channel: { enum: REVIEW_COPY_CHANNELS }, campaign: { type: ["string", "null"] },
    givenOn: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, expiresAt: { type: "string", minLength: 20 },
    edition: digest, rendition: digest, stampedSha256: sha256Hex,
    consideration: { const: "the copy only" }, reviewRequired: { const: false },
    invitation: {
      type: "object", additionalProperties: false, required: ["sha256", "text", "rulings"],
      properties: {
        sha256: sha256Hex,
        text: { type: ["string", "null"], description: "The invitation as sent, or null when it names the reader; the private ledger keeps it then." },
        rulings: { type: "object", additionalProperties: false, required: ["admitted", "checked"], properties: { admitted: { const: true }, checked: { type: "array", items: { type: "string" } } } },
      },
    },
  },
});

async function readJson(path) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
async function writePrivate(path, text) { await writeFile(path, text, { mode: 0o600 }); await chmod(path, 0o600); }

/**
 * Give one reader a review copy. See the module comment for the steps.
 * @param {object} input
 * @param {object} input.plan the work's PublicationLaunchPlan (v2), with its advance-reading window and byline
 * @param {object} input.releaseAcceptance the KindleReleaseAcceptance cell naming the accepted EPUB's bytes
 * @param {string} input.acceptedEpub path to those bytes
 * @param {string} input.offering the shop offering id
 * @param {string} input.title the book's title, for the invitation
 * @param {{name: string, email: string}} input.reader
 * @param {string} input.reference the publisher's reference for this invitation, unique per reader in the campaign
 * @param {"advance-reader-team"|"outreach"} input.channel
 * @param {string|null} [input.campaign]
 * @param {string|null} [input.invitation] the outreach message as it will be sent; the house invitation when absent
 * @param {string} input.today YYYY-MM-DD
 * @param {object} deps
 * @param {string} deps.giver the shop's gift-agent address the grant is recorded under
 * @param {string} deps.contact the publisher's contact address printed on the copy
 * @param {string} deps.stateDir the private ledger's root
 * @param {string} deps.recordsDir where material-connection records are written
 * @param {{origin: string, key: string, fetch?: typeof fetch}} deps.shop
 * @param {{putCurrent: Function}} deps.goods the shop's goods bucket (cloudflare-r2-services-section's REST client)
 * @param {Function} deps.validate EPUB validator for the stamped copy
 */
export async function grantReviewCopy(input, deps) {
  const plan = input.plan?.content ?? input.plan;
  const window = reviewCopyWindow(plan, input.today, input.channel);
  if (!input.reader?.name || !input.reader?.email) throw new TypeError("a review copy is given to a named reader at an address");
  if (!input.reference) throw new TypeError("a review copy needs the publisher's reference, so repeating it never gives twice");
  const grant = await referencedReviewCopyId(deps.giver, `${plan.work}/${input.channel}/${input.reference}`);
  const url = `${deps.shop.origin}/review-copies/${grant}`;
  const invitation = input.invitation ?? reviewInvitation({
    title: input.title, author: plan.byline?.author, publisher: plan.byline?.publisher, onSale: window.onSale, today: input.today, url, readableThrough: window.readableThrough, contact: deps.contact,
  });
  const ruling = admitInvitation(invitation);
  if (!ruling.admitted) throw new Error(`the invitation breaks Causeway Publishing's rulings: ${ruling.findings.map(({ says }) => says).join("; ")}`);
  if (input.invitation && !input.invitation.includes(url)) throw new Error(`an outreach invitation carries the copy's link, ${url}`);

  const ledger = join(deps.stateDir, plan.work, grant);
  await mkdir(ledger, { recursive: true, mode: 0o700 });
  await chmod(ledger, 0o700);
  const copyPath = join(ledger, "copy.epub"), renditionPath = join(ledger, "rendition.json");
  let rendition = await readJson(renditionPath);
  const kept = rendition && await readFile(copyPath).then((bytes) => sha256(bytes) === rendition.content.artifactSha256, () => false);
  if (!kept) {
    await rm(copyPath, { force: true });
    rendition = await renderAdvanceReaderCopy({
      book: plan.work, acceptedEpub: input.acceptedEpub, releaseAcceptance: input.releaseAcceptance, outPath: copyPath,
      notice: { status: window.status, onSale: window.onSale, contact: deps.contact, uncorrected: false },
      stamp: { preparedFor: input.reader.name, grant },
    }, { validate: deps.validate });
    if (rendition.content.validation?.outcome !== "pass") throw new Error(`the stamped copy was not validated (${rendition.content.validation?.outcome ?? "no validator"}); a copy leaves the house only validated`);
    await writePrivate(renditionPath, `${JSON.stringify(rendition, null, 2)}\n`);
  }
  const bytes = await readFile(copyPath);
  const pointer = stagedReviewCopyPointer(rendition, input.offering, { sha256: sha256(bytes), bytes: bytes.byteLength });
  await writePrivate(join(ledger, "reader.json"), `${JSON.stringify({ grant, name: input.reader.name, email: input.reader.email, reference: input.reference, channel: input.channel, campaign: input.campaign ?? null, url, invitation }, null, 2)}\n`);

  await deps.goods.putCurrent(pointer.bundle.key, { body: bytes, mediaType: pointer.bundle.contentType });
  await deps.goods.putCurrent(reviewCopyPointerKey(input.offering, grant), { body: Buffer.from(JSON.stringify(pointer)), mediaType: "application/json" });

  const response = await (deps.shop.fetch ?? fetch)(`${deps.shop.origin}/api/review-copies`, {
    method: "POST", headers: { authorization: `Bearer ${deps.shop.key}`, "content-type": "application/json" },
    body: JSON.stringify({ id: grant, offering: input.offering, email: input.reader.email, release: pointer.release, artifactSha256: pointer.bundle.sha256, expiresAt: window.expiresAt }),
  });
  const recorded = await response.json().catch(() => ({}));
  if (response.status !== 201 && response.status !== 200) throw new Error(`the shop refused the review copy (${response.status}): ${recorded.error ?? "no reason given"}`);

  const recordPath = join(deps.recordsDir, `${grant}.json`);
  let record = await readJson(recordPath);
  if (!record) {
    const namesReader = [input.reader.name, input.reader.email].some((value) => invitation.toLowerCase().includes(value.toLowerCase()));
    const cell = createTypedMark(materialConnectionType, {
      type: "MaterialConnection", version: 1, work: plan.work, offering: input.offering, grant, giver: deps.giver,
      channel: input.channel, campaign: input.campaign ?? null, givenOn: input.today, expiresAt: window.expiresAt,
      edition: pointer.release, rendition: rendition.id, stampedSha256: pointer.bundle.sha256,
      consideration: "the copy only", reviewRequired: false,
      invitation: { sha256: sha256(invitation), text: namesReader ? null : invitation, rulings: { admitted: true, checked: [...ruling.checked] } },
    });
    if (!cell.ok) throw new TypeError(cell.refusal.message);
    record = cell.value;
    await mkdir(deps.recordsDir, { recursive: true });
    await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
  }
  return Object.freeze({ grant, url, disposition: recorded.disposition ?? "granted", invitation, record, recordPath, ledger });
}
