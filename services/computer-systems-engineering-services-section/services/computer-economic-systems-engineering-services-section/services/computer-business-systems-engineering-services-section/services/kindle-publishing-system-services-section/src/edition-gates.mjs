import { credentialPath } from "@red-cup-engineering/credential-custody-service/keep";
import { createPublicKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { kindleReleaseAcceptanceType, verifyKindleValidationReceipt } from "@red-cup-engineering/ebook-engineering-services-section/kindle-validation";
import { sha256Bytes } from "./retail-submission.mjs";

/**
 * The gates a retail channel admits an edition through: exact artifact bytes
 * bound to the acceptances that stand for them. One gate per rendition, the
 * same for every retailer that sells it.
 */

/** The public half of the key that signs the house's EPUB validation receipts. */
// The house's Kindle validation public key, rendered from the credential store with this host's other credentials.
export const validationPublicKeyPath = (env = process.env) => credentialPath("keys/kindle-validation/public.pem", env);
export const validationPublicKey = async (path = validationPublicKeyPath()) => createPublicKey(await readFile(path, "utf8"));

function admittedReleaseAcceptance(value, book, epubSha256) {
  if (value?.type !== kindleReleaseAcceptanceType.id || value.content?.status !== "release-ready" || value.content.book !== book || value.content.rendition?.artifactSha256 !== epubSha256) return false;
  const admitted = createTypedMark(kindleReleaseAcceptanceType, value.content);
  return admitted.ok && admitted.value.id === value.id;
}

/**
 * An ebook: the signed passing validation of the exact EPUB and cover bytes,
 * the content-addressed release acceptance of that EPUB, and, where the
 * validation assays the retailer's reading systems, a passing assay.
 */
export async function admitAcceptedEbook(name, { book, artifacts, releaseAcceptance, validation }, publicKey, { portability } = {}) {
  if (!verifyKindleValidationReceipt(validation, publicKey)) throw new Error(`${name} gate requires a valid signed passing KindleValidationReceipt`);
  if (validation.cell.content.book !== book) throw new Error("Kindle validation receipt belongs to another book");
  const exact = validation.cell.content.artifacts;
  for (const [artifact, path] of [["epub", artifacts.epub], ["cover", artifacts.cover]]) {
    if (sha256Bytes(await readFile(path)) !== exact[artifact].sha256) throw new Error(`${name} ${artifact} bytes differ from the validated artifact`);
  }
  if (!admittedReleaseAcceptance(releaseAcceptance, book, exact.epub.sha256)) throw new Error(`${name} gate requires a content-addressed Kindle release acceptance for the exact EPUB`);
  if (portability && validation.cell.content.checks.portability?.[portability]?.passed !== true) throw new Error(`${name} gate requires the validated EPUB to pass the ${portability} portability assay`);
  return { exact, intent: { book, artifacts: exact, releaseAcceptance: releaseAcceptance.id } };
}

const hexOf = (value) => String(value ?? "").startsWith("ni:///sha-256;") ? Buffer.from(value.slice("ni:///sha-256;".length), "base64url").toString("hex") : String(value ?? "");

/**
 * A printed book: the accepted print edition (its layout proof closed) of the
 * exact interior and cover PDF bytes, made for this printer's profile.
 */
export async function admitAcceptedPrintEdition(name, { book, artifacts, printAcceptance }, { profile }) {
  if (printAcceptance?.type !== "PrintEditionAcceptance" || printAcceptance.version !== 1 || printAcceptance.status !== "accepted") throw new Error(`${name} gate requires an accepted PrintEditionAcceptance`);
  if (printAcceptance.book !== book) throw new Error("print edition acceptance belongs to another book");
  if (printAcceptance.profile !== profile) throw new Error(`${name} prints the ${profile} profile, not ${printAcceptance.profile}`);
  if (printAcceptance.preflight?.passed !== true || typeof printAcceptance.proof?.proofer !== "string") throw new Error(`${name} gate requires a preflighted, proofed print edition`);
  const exact = {};
  for (const artifact of ["interior", "cover"]) {
    const sha256 = sha256Bytes(await readFile(artifacts[artifact]));
    if (sha256 !== hexOf(printAcceptance[artifact]?.sha256)) throw new Error(`${name} ${artifact} bytes differ from the accepted print edition`);
    exact[artifact] = { sha256, bytes: printAcceptance[artifact].bytes };
  }
  return { exact, intent: { book, artifacts: exact, profile, editionInputDigest: printAcceptance.editionInputDigest, pages: printAcceptance.pages } };
}

/** The founder's declarations receipt covers a listing when it declares exactly the listing's answers for this book. */
export const declaresAnswers = (receipt, book, answers) => receipt?.type === "KdpDeclarationsReceipt" && receipt.version === 1 && receipt.book === book
  && receipt.acknowledged === true && typeof receipt.declaredAt === "string"
  && JSON.stringify(receipt.answers) === JSON.stringify(answers);
