import { claim, mark, token } from "../../records/utterance/utterance.mts";
import { charge, chargeValue, isChargeValueName, valueOf, type ChargeValueName } from "../../values/index.mts";
import { meme, type Meme } from "../../logic/predicating/evidence/fiber.mts";
import { cell, predicateOfClaim } from "../../logic/predicating/predication.mts";
import {
  compiledBundleFromLanguageManifest,
  type LanguageBundleSpec,
} from "../presentation.mts";

const fieldSeparator = "|";

function assertToyField(value: unknown, slot: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`identity-line bundle requires a non-empty string ${slot}`);
  }
  if (value.includes(fieldSeparator) || value.includes("\n") || value.includes("\r")) {
    throw new TypeError(`identity-line bundle field ${slot} contains a line delimiter`);
  }
  return value;
}

function memeFromLine(line: string): Meme {
  const fields = line.split(fieldSeparator);
  if (fields.length !== 4) {
    throw new TypeError(`identity-line bundle expected subject|predicate|object|chargeName`);
  }
  const [subject, predicate, object, chargeName] = fields;
  if (
    subject === undefined
    || predicate === undefined
    || object === undefined
    || chargeName === undefined
    || !isChargeValueName(chargeName)
  ) {
    throw new TypeError(`identity-line bundle expected a FOUR charge name`);
  }
  return meme(
    cell(token(mark(assertToyField(subject, "subject"))), predicateOfClaim(claim(mark(assertToyField(predicate, "predicate")))), token(mark(assertToyField(object, "object")))),
    charge(chargeValue(chargeName)),
  );
}

export function readIdentityLineMemes(text: string): readonly Meme[] {
  if (text.length === 0) return Object.freeze([]);
  return Object.freeze(text.split(/\r?\n/u).filter((line) => line.length > 0).map(memeFromLine));
}

function markString(value: unknown, slot: string): string {
  return assertToyField(value, slot);
}

export function writeIdentityLineMemes(memes: readonly Meme[]): string {
  return memes.map((meme) => {
    const subject = markString(meme.cell.subject.mark.value, "subject");
    const predicate = markString(meme.cell.predicate.claim.mark.value, "predicate");
    const object = markString(meme.cell.object.mark.value, "object");
    const chargeName: ChargeValueName = valueOf(meme.charge).name;
    return [subject, predicate, object, chargeName].join(fieldSeparator);
  }).join("\n");
}

export const identityLineLanguageBundleSpec = Object.freeze({
  manifest: Object.freeze({
    id: "metroplat.language.identity-line-memes",
    name: "Identity line memes",
    version: "0.1.0",
  }),
  corner: "assertion",
  rung: "identity",
  readings: Object.freeze({ read: readIdentityLineMemes }),
  writings: Object.freeze({ write: writeIdentityLineMemes }),
} satisfies LanguageBundleSpec);

export const identityLineLanguageBundle = compiledBundleFromLanguageManifest(identityLineLanguageBundleSpec);
