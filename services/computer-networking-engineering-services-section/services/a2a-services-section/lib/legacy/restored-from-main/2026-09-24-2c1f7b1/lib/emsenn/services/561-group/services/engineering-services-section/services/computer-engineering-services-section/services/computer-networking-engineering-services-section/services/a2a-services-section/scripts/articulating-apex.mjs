import { articulate, mark, utterance } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";

export const ARTICULATE_OPERATION = "articulate-utterance";
export const ARTICULATING_REQUEST_KIND = "obsmetrologia.articulating.request";
export const ARTICULATING_RECEIPT_KIND = "obsmetrologia.articulating.receipt";
export const MAX_ARTICULATING_INPUT_BYTES = 65_536;

export const ARTICULATING_LANGUAGE_IDENTIFIERS = Object.freeze({
  operation: ARTICULATE_OPERATION,
  node: "@red-cup-engineering/sign-cell#articulate",
  lean: "Obsmetrologia.Articulating.Cell.initial",
  solidity: "ArticulationCell.seat",
});

export const ARTICULATING_APEX_BODY = Object.freeze({
  kind: "obsmetrologia.articulating.operation-apex",
  version: 1,
  operation: ARTICULATE_OPERATION,
  precondition: ARTICULATING_REQUEST_KIND,
  postcondition: ARTICULATING_RECEIPT_KIND,
  implementations: ARTICULATING_LANGUAGE_IDENTIFIERS,
});
export const ARTICULATING_APEX = identifyJsonSemanticContent({
  objectKind: "semantic.operation-apex",
  value: ARTICULATING_APEX_BODY,
  witnessRoot: EMPTY_WITNESS_ROOT,
}).token;

function object(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function bounded(value) {
  const input = object(value, "articulate-utterance input");
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > MAX_ARTICULATING_INPUT_BYTES) {
    throw new RangeError(`articulate-utterance input exceeds ${MAX_ARTICULATING_INPUT_BYTES} bytes`);
  }
  if (input.apex !== undefined && input.apex !== ARTICULATING_APEX) {
    throw new TypeError("articulate-utterance input is bound to a different apex");
  }
  if (!Object.hasOwn(input, "tokenMark") || !Object.hasOwn(input, "claimMark")) {
    throw new TypeError("articulate-utterance requires tokenMark and claimMark");
  }
  return input;
}

export function executeArticulateUtterance(value) {
  const input = bounded(value);
  const requestNi = identifyJsonSemanticContent({ objectKind: ARTICULATING_REQUEST_KIND, value: input, witnessRoot: EMPTY_WITNESS_ROOT }).token;
  const carrier = utterance(mark(input.tokenMark), mark(input.claimMark));
  // The law uses the real Mark/Utterance constructors.  Its boundary reading is
  // then copied into an own-property relational value so canonical RMN never
  // attempts to serialize host-language class prototypes.
  const cell = structuredClone(articulate(carrier));
  const body = Object.freeze({
    kind: ARTICULATING_RECEIPT_KIND,
    apex: ARTICULATING_APEX,
    operation: ARTICULATE_OPERATION,
    requestNi,
    identifiers: ARTICULATING_LANGUAGE_IDENTIFIERS,
    cell,
  });
  const id = identifyJsonSemanticContent({ objectKind: ARTICULATING_RECEIPT_KIND, value: body, witnessRoot: EMPTY_WITNESS_ROOT }).token;
  return Object.freeze({ ...body, id });
}

export const articulateUtteranceAction = Object.freeze({
  verb: ARTICULATE_OPERATION,
  inputFormat: "json",
  outputFormat: "json",
  summary: "Open one admitted token/claim utterance as an Obsmetrologia articulation cell.",
  run: executeArticulateUtterance,
});

export const articulatingApex = Object.freeze({
  packageName: "@red-cup-engineering/a2a-services-section",
  basePath: "/articulating",
  apex: ARTICULATING_APEX,
  actions: Object.freeze([articulateUtteranceAction]),
  resource: ARTICULATING_APEX_BODY,
});
