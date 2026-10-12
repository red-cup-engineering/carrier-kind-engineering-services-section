/**
 * articulation/utterance — the base object and base morphism.
 *
 * `Mark` is the opaque atom: an immutable object wrapping one present value.
 * Core code never inspects a Mark's payload as ordinary data — only a codec
 * boundary may. A `Token` (left hand) and a `Claim` (right hand) each carry a
 * Mark; an `Utterance = (Token, Claim)` is the base admission object; and
 * `articulate` opens the aperiodic articulation category at its potential cell.
 * Every public morphism of metroplat normalizes back through `Mark → Utterance →
 * articulate`; this module is where that base lives.
 *
 * `UtteranceObject` is derived from the plain schema literal. The schema is the object's identity and runtime
 * law; this module supplies the declaration, constructors, and morphisms over it.
 */
import type { FromSchema } from "../../schema/contract.mts";

/** The raw mark-admission boundary before token/claim pairing. */
export const markBoundarySchema = {
  $id: "metroplat/articulation/mark-boundary",
  type: "object",
  required: ["kind", "value"],
  properties: {
    kind: { const: "utterance.mark" },
    value: {},
  },
  additionalProperties: false,
  title: "MarkBoundary",
  description: "The opaque raw mark boundary admitted before token/claim pairing.",
} as const;

/** The two relational mark roles: identity-bearing token and content-bearing claim. */
export type MarkKind = "token" | "claim";

export const markKinds: readonly MarkKind[] = Object.freeze(["token", "claim"]);

/** Decide membership in the two-element mark-kind set. */
export const isMarkKind = (kind: unknown): kind is MarkKind =>
  kind === "token" || kind === "claim";

/** The mark shape, reused wherever a downstream object embeds a Mark inline (not standalone-addressable; see `markBoundarySchema` for that). */
export const MarkSchema = {
  type: "object",
  required: ["kind", "value"],
  properties: {
    kind: { const: "utterance.mark" },
    value: {},
  },
  additionalProperties: false,
} as const;

export const TokenSchema = {
  type: "object",
  required: ["kind", "hand", "mark"],
  properties: {
    kind: { const: "utterance.token" },
    hand: { const: "left" },
    mark: MarkSchema,
  },
  additionalProperties: false,
} as const;

export const ClaimSchema = {
  type: "object",
  required: ["kind", "hand", "mark"],
  properties: {
    kind: { const: "utterance.claim" },
    hand: { const: "right" },
    mark: MarkSchema,
  },
  additionalProperties: false,
} as const;

/** The base admission schema shape: token + claim, each carrying a Mark. */
const utteranceShape = {
  kind: { const: "utterance.object" },
  token: TokenSchema,
  claim: ClaimSchema,
};

/** The base admission schema contract: one plain JSON-Schema literal with a bare `$id`. */
export const utteranceSchema = {
  $id: "metroplat/articulation/utterance",
  type: "object",
  required: ["kind", "token", "claim"],
  properties: utteranceShape,
  additionalProperties: false,
  title: "UtteranceObject",
  description: "The base admission object: a token and a claim, each carrying a Mark.",
} as const;

/** The base admission object type, derived from `utteranceSchema`. */
export type UtteranceObject = FromSchema<typeof utteranceSchema>;

/** The articulation cell schema shape opened from an utterance. */
const articulationCellShape = {
  kind: { const: "utterance.articulation.cell" },
  potentialAperiodicArticulationCell: {
    type: "array",
    items: [
      utteranceSchema,
      {
        type: "array",
        items: [
          { type: "array", items: [], minItems: 0, maxItems: 0, additionalItems: false },
          { type: "array", items: [], minItems: 0, maxItems: 0, additionalItems: false },
        ],
        minItems: 2,
        maxItems: 2,
        additionalItems: false,
      },
    ],
    minItems: 2,
    maxItems: 2,
    additionalItems: false,
  },
};

/** The articulation cell schema contract opened from an utterance. */
export const articulationCellSchema = {
  $id: "metroplat/articulation/articulation-cell",
  type: "object",
  required: ["kind", "potentialAperiodicArticulationCell"],
  properties: articulationCellShape,
  additionalProperties: false,
  title: "ArticulationCell",
  description: "An utterance opened at its potential aperiodic articulation cell.",
} as const;

/** A mark: an immutable object wrapping a single present value. The opaque atom. */
export class Mark {
  readonly kind = "utterance.mark" as const;
  readonly value: unknown;

  constructor(value: unknown) {
    if (value === undefined) throw new TypeError("Mark: value must be present");
    this.value = value;
    Object.freeze(this);
  }
}

/** A token: the immutable left-hand utterance object holding one mark. */
export class Token {
  readonly kind = "utterance.token" as const;
  readonly hand = "left" as const;
  readonly mark: Mark;

  constructor(mark: Mark) {
    this.mark = mark;
    Object.freeze(this);
  }
}

/** A claim: the immutable right-hand utterance object holding one mark. */
export class Claim {
  readonly kind = "utterance.claim" as const;
  readonly hand = "right" as const;
  readonly mark: Mark;

  constructor(mark: Mark) {
    this.mark = mark;
    Object.freeze(this);
  }
}

/** The token-side slot of an aperiodic articulation cell. */
export type TokenArticulationSlot = readonly [] | readonly [Token];

/** The claim-side slot of an aperiodic articulation cell. */
export type ClaimArticulationSlot = readonly [] | readonly [Claim];

/** The pairing term of an aperiodic articulation cell. */
export type AperiodicArticulationPairing = readonly [TokenArticulationSlot, ClaimArticulationSlot];

/** An aperiodic articulation cell: an utterance object plus its two slots. */
export type AperiodicArticulationCell = readonly [UtteranceObject, AperiodicArticulationPairing];

/** The potential aperiodic articulation cell: both slots empty (the initial object). */
export type PotentialAperiodicArticulationCell = readonly [UtteranceObject, readonly [readonly [], readonly []]];

/** The articulation cell `articulate` opens, carrying the potential aperiodic cell. */
export type ArticulationCell = FromSchema<typeof articulationCellSchema> & {
  readonly potentialAperiodicArticulationCell: PotentialAperiodicArticulationCell;
};

export interface ArticulatingUtter {
  readonly kind: "articulating.utter";
  readonly utterance: UtteranceObject;
}

export interface ArticulatingPair {
  readonly kind: "articulating.pair";
  readonly utterance: UtteranceObject;
  readonly articulating: Articulating;
}

export type Articulating = ArticulatingUtter | ArticulatingPair;

/** A witness that two marks coincide. */
export interface MarkCoincidenceWitness<SchemaContract> {
  readonly kind: "utterance.coincidence:witness";
  readonly left: SchemaContract;
  readonly right: SchemaContract;
  readonly observation?: MarkObservationReport;
}

/** An obstruction to two marks coinciding. */
export interface MarkCoincidenceObstruction<SchemaContract> {
  readonly kind: "utterance.coincidence-obstruction";
  readonly left: SchemaContract;
  readonly right: SchemaContract;
  readonly observation?: MarkObservationReport;
}

export type MarkObservationAuthority =
  | "boundary-admission"
  | "coincidence-witness"
  | "projection-lens"
  | "opacity-violation";

export interface MarkObservationReport {
  readonly kind: "utterance.mark-observation";
  readonly authority: MarkObservationAuthority;
  readonly permitted: boolean;
  readonly lens?: string;
  readonly witness?: string;
  readonly reason: string;
}

/** The result of judging two token/claim objects coincident. */
export type TokenIdentityJudgment = MarkCoincidenceWitness<Token> | MarkCoincidenceObstruction<Token>;
/** The result of judging two claim objects coincident. */
export type ClaimIdentityJudgment = MarkCoincidenceWitness<Claim> | MarkCoincidenceObstruction<Claim>;

/** Constructs a Mark wrapping the given value. */
export function mark(value: unknown): Mark {
  return new Mark(value);
}

/** Constructs a Token from the given mark. */
export function token(markObject: Mark): Token {
  return new Token(markObject);
}

/** Constructs a Claim from the given mark. */
export function claim(markObject: Mark): Claim {
  return new Claim(markObject);
}

/** Constructs an utterance object from two marks: left becomes a token, right a claim. */
export function utterance(left: Mark, right: Mark): UtteranceObject {
  return Object.freeze({ kind: "utterance.object" as const, token: token(left), claim: claim(right) });
}

export function articulatingUtter(utteranceValue: UtteranceObject): ArticulatingUtter {
  return Object.freeze({ kind: "articulating.utter" as const, utterance: utteranceValue });
}

export function articulatingPair(utteranceValue: UtteranceObject, nested: Articulating): ArticulatingPair {
  return Object.freeze({ kind: "articulating.pair" as const, utterance: utteranceValue, articulating: nested });
}

export function articulatingHead(articulating: Articulating): UtteranceObject {
  return articulating.utterance;
}

export function articulatingDepth(articulating: Articulating): number {
  return articulating.kind === "articulating.utter" ? 0 : articulatingDepth(articulating.articulating) + 1;
}

export function articulatingFloor(articulating: Articulating): UtteranceObject {
  return articulating.kind === "articulating.utter" ? articulating.utterance : articulatingFloor(articulating.articulating);
}

export function articulatingUtterNePair(_u: UtteranceObject, _v: UtteranceObject, _a: Articulating): true {
  return true;
}

/** Whether two mark payloads coincide: identical primitives, or structurally
 *  equal plain JSON. This is the only place core code reads a Mark payload, and
 *  it reads it only to judge coincidence — never to branch on its content.
 *
 *  Structural (value) coincidence, not reference identity: this package is
 *  boundary-first, so utterance objects are routinely reconstructed from JSON with no
 *  shared references. Coincidence must survive a transport round-trip; reference
 *  identity would not. (This is the one deliberate divergence from the prior
 *  reference-identity object coincidence.) */
export function coincides(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => coincides(item, right[index]));
  }
  const leftKeys = Object.keys(left as Record<string, unknown>).sort();
  const rightKeys = Object.keys(right as Record<string, unknown>).sort();
  if (leftKeys.length !== rightKeys.length || !leftKeys.every((key, index) => key === rightKeys[index])) return false;
  return leftKeys.every((key) => coincides((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}

export function markObservationReport(options: {
  readonly authority: MarkObservationAuthority;
  readonly lens?: string;
  readonly witness?: string;
  readonly reason?: string;
}): MarkObservationReport {
  const permitted = options.authority !== "opacity-violation" &&
    (options.authority !== "projection-lens" || options.lens !== undefined) &&
    (options.authority !== "coincidence-witness" || options.witness !== undefined);
  return Object.freeze({
    kind: "utterance.mark-observation" as const,
    authority: options.authority,
    permitted,
    ...(options.lens === undefined ? {} : { lens: options.lens }),
    ...(options.witness === undefined ? {} : { witness: options.witness }),
    reason: options.reason ?? (
      options.authority === "boundary-admission"
        ? "raw encounter is admitted as an opaque Mark"
        : options.authority === "coincidence-witness"
          ? "mark payload is read only to produce a coincidence witness or obstruction"
          : options.authority === "projection-lens"
            ? "mark payload is observed through an explicit projection lens"
            : "mark payload is read without boundary, lens, or coincidence authority"
    ),
  });
}

/** Structural guard for a Mark object. Boundary-first: a Mark rehydrated from JSON
 *  is a plain object, not a class instance, so membership is judged by shape (kind +
 *  a present value), the same stance `coincides` takes — never by `instanceof`, which
 *  would not survive a transport round-trip. */
export function isMark(value: unknown): value is Mark {
  return typeof value === "object" && value !== null
    && (value as { kind?: unknown }).kind === "utterance.mark"
    && "value" in value;
}

/** Judges whether two tokens coincide: a witness when their marks coincide, else an obstruction. */
export function tokenIdentity(left: Token, right: Token): TokenIdentityJudgment {
  const observation = markObservationReport({
    authority: "coincidence-witness",
    witness: "utterance.token.identity",
  });
  return coincides(left.mark.value, right.mark.value)
    ? Object.freeze({ kind: "utterance.coincidence:witness" as const, left, right, observation })
    : Object.freeze({ kind: "utterance.coincidence-obstruction" as const, left, right, observation });
}

/** Judges whether two claims coincide: a witness when their marks coincide, else an obstruction. */
export function claimIdentity(left: Claim, right: Claim): ClaimIdentityJudgment {
  const observation = markObservationReport({
    authority: "coincidence-witness",
    witness: "utterance.claim.identity",
  });
  return coincides(left.mark.value, right.mark.value)
    ? Object.freeze({ kind: "utterance.coincidence:witness" as const, left, right, observation })
    : Object.freeze({ kind: "utterance.coincidence-obstruction" as const, left, right, observation });
}

/**
 * Articulates an utterance object: opens the aperiodic articulation category at
 * its potential cell. The token and claim are fixed by the utterance object; neither slot
 * is filled at this initial object. This is the base morphism.
 */
export function articulate(utteranceValue: UtteranceObject): ArticulationCell {
  const pairing = Object.freeze([Object.freeze([]), Object.freeze([])]) as readonly [readonly [], readonly []];
  return Object.freeze({
    kind: "utterance.articulation.cell" as const,
    potentialAperiodicArticulationCell: Object.freeze([utteranceValue, pairing]) as PotentialAperiodicArticulationCell,
  });
}

/** Type guard: the aperiodic articulation shape with a potential cell whose slots are empty. */
export function isArticulationCell(value: object): value is ArticulationCell {
  const kind = "kind" in value ? value.kind : undefined;
  const cell = "potentialAperiodicArticulationCell" in value ? value.potentialAperiodicArticulationCell : undefined;
  return kind === "utterance.articulation.cell"
    && Array.isArray(cell)
    && cell.length === 2
    && typeof cell[0] === "object"
    && cell[0] !== null
    && "kind" in cell[0]
    && cell[0].kind === "utterance.object"
    && Array.isArray(cell[1])
    && cell[1].length === 2
    && Array.isArray(cell[1][0])
    && cell[1][0].length === 0
    && Array.isArray(cell[1][1])
    && cell[1][1].length === 0;
}
