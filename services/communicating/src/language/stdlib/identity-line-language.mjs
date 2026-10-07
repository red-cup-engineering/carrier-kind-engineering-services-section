import { witnessedReading } from "@red-cup-engineering/signchain/bilattice";
import { cell, knowledgeReading } from "@red-cup-engineering/signcell/cell";
const isReadingInKnowledge = (name) => isReading(name, "knowledge");

import {
  compiledBundleFromLanguageManifest,

} from "../presentation.mjs";
import { isReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const fieldSeparator = "|";

function assertToyField(value, slot) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`identity-line bundle requires a non-empty string ${slot}`);
  }
  if (value.includes(fieldSeparator) || value.includes("\n") || value.includes("\r")) {
    throw new TypeError(`identity-line bundle field ${slot} contains a line delimiter`);
  }
  return value;
}

function memeFromLine(line) {
  const fields = line.split(fieldSeparator);
  if (fields.length !== 4) {
    throw new TypeError(`identity-line bundle expected subject|predicate|object|readingName`);
  }
  const [subject, predicate, object, readingName] = fields;
  if (
    subject === undefined
    || predicate === undefined
    || object === undefined
    || readingName === undefined
    || !isReadingInKnowledge(readingName)
  ) {
    throw new TypeError(`identity-line bundle expected a FOUR reading name`);
  }
  return cell(assertToyField(subject, "subject"), assertToyField(predicate, "predicate"), assertToyField(object, "object"),
    witnessedReading(readingName, IDENTITY_LINE_WITNESS));
}

/** An identity line witnesses the reading it writes. */
const IDENTITY_LINE_WITNESS = "identity-line";

export function readIdentityLineMemes(text) {
  if (text.length === 0) return Object.freeze([]);
  return Object.freeze(text.split(/\r?\n/u).filter((line) => line.length > 0).map(memeFromLine));
}

function markString(value, slot) {
  return assertToyField(value, slot);
}

export function writeIdentityLineMemes(memes) {
  return memes.map((meme) => {
    const subject = markString(meme.subject, "subject");
    const predicate = markString(meme.predicate, "predicate");
    const object = markString(meme.object, "object");
    const readingName = knowledgeReading(meme);
    return [subject, predicate, object, readingName].join(fieldSeparator);
  }).join("\n");
}

export const identityLineLanguageBundleSpec = Object.freeze({
  manifest: Object.freeze({
    id: "metroplat.language.identity-line-memes",
    name: "Identity line memes",
    version: "0.1.0",
  }),
  corner: "assertion",
  rung: "strict",
  readings: Object.freeze({ read: readIdentityLineMemes }),
  writings: Object.freeze({ write: writeIdentityLineMemes }),
});

export const identityLineLanguageBundle = compiledBundleFromLanguageManifest(identityLineLanguageBundleSpec);
