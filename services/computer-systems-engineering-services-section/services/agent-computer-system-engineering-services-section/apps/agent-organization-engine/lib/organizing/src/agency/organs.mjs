/**
 * organs — the body natural: what a bearer's and a mask's handedness binds to.
 *
 * The house has two bodies, as Kantorowicz's king does. The BODY POLITIC is a collective that answers
 * as one (./kinds.mjs BODY_KINDS, ./politic.mjs). The BODY NATURAL is an embodied participant's
 * sensors and actuators: "the actuator/sensor pair is the agent's body" (engineering note 2026-06-05,
 * seam: bodies & actuators). An LLM harness, a printer and an account are one kind of thing: an embodied
 * participant whose handedness h = (recv, send, actuate, observe) binds to different organs (the drone
 * swarm's embodied handedness; animating/handedness). The account is the hand: a signed-in
 * account acts as the bearer it is an organ of (./index.mjs bearersHandedBy), never as a bearer itself.
 *
 * Handedness is Player/Opponent duality: recv and observe take input (Opponent, the perceive side), send
 * and actuate commit output (Player, the act side); gaming's `mask` turns a handedness into the I/O face
 * a participant shows an arena. So a player in the work arena is read three ways:
 *
 *   - its mask's FACE, what the mask may take in and put out: an office receives from and assigns to
 *     its coordination boundary, actuates its skills' verbs and observes the works its duties are owed
 *     toward; a persona or body face takes and shows what its organs (its carrier's presences, its
 *     authored hands) can;
 *   - its bearer's BODY NATURAL, the knowledge join of the bearer's organs. A harness character is a
 *     whole body for taking in and putting out (its context bounded, its sends rate-limited, its reading
 *     partial), but what it can ACTUATE is never a record: "a Character record alone does not establish
 *     its current provider-admitted capabilities" (note on the missing allocation controller). Its
 *     actuate coordinate is the provider testimony `admitted` (bearer → capabilities): t when its held
 *     admissions command something, f when testimony shows it commands nothing, ⊥ with no testimony;
 *   - the EMBODIED handedness, their truth meet at each coordinate: a mask can only act through a body
 *     that can. A bearer the records give no body to reads ⊥ there — unknown, not refused.
 *
 * An office has no body of its own (PACE-S: "no body to supply Somatic"): it is a mask, and borrows its
 * incumbent's body natural for as long as the incumbency holds.
 */
import { handedness, handednessCoordinateNames } from "@red-cup-engineering/animating/becoming/doing/embodying/handedness";
import { knowledgeJoinAll, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { mask as gameMask, sides } from "@red-cup-engineering/gaming/mask";

import { bodyOf, officeCoordinationBoundary, officeReading, resolve } from "./index.mjs";

const COORDINATES = handednessCoordinateNames();
const provided = (present) => (present ? "potential" : "absurd");
/** Where a mask's carrier sits, from the registry's root: its `carrier` is relative to the mask's section. */
export const carrierSource = (mask) => (mask.sectionPath ? `${mask.sectionPath}/${mask.carrier}` : mask.carrier);

const joined = (hands) => handedness(Object.fromEntries(COORDINATES.map((c) => [c, knowledgeJoinAll(hands.map((h) => h[c] ?? "absurd"))])));

/** The record `ref` names among the bearers and masks: a character, a mask, or a body. */
function bearerRecord(agency, ref, fromSectionPath = "") {
  return resolve(agency, "characters", ref, fromSectionPath) ?? resolve(agency, "masks", ref, fromSectionPath) ?? bodyOf(agency, ref, fromSectionPath)?.body;
}

/** A persona carrier's presences, each a hand: every presence shows (send); one with an addressed account
 *  or an inbox can also be written to (recv). Read by shape, not by platform. The carrier is named from
 *  the mask's own section, so the mask reads the same hands whatever root the registry is read from. */
function carrierOrgans(agency, mask) {
  if (typeof mask.carrier !== "string") return [];
  let carrier;
  try { carrier = JSON.parse(agency.carrier(carrierSource(mask))); } catch { return []; }
  const presences = Array.isArray(carrier?.presences) ? carrier.presences : [];
  const hands = presences.filter((p) => p && typeof p === "object").map((p) => ({
    platform: p.platform, account: p.account ?? p.username ?? p.site ?? p.newsletter,
    handedness: handedness({ send: "potential", recv: provided(typeof (p.account ?? p.username) === "string") }),
  }));
  const email = carrier?.email;
  if (email && typeof email === "object") hands.push({ platform: email.provider ?? "email", account: [email.prefer ?? []].flat()[0], handedness: handedness({ send: "potential", recv: "potential" }) });
  return hands.map((hand) => ({ key: `${mask.key}:${hand.platform}`, of: mask.key, derived: "carrier", ...hand }));
}

/** The organs of a bearer, mask or body: its authored organs, a harness character's harness (its
 *  actuate read from `admitted`, the provider testimony, which it carries as `capabilities`) and a
 *  persona's carrier presences. An authored organ the runtime speaks for — `told`, organ key or id →
 *  handedness, as a device's (animating/embodying/device `deviceHandedness`, its actuate its safety gate)
 *  — reads as the truth meet of the record and the telling: it acts only where both allow, and a held
 *  safety contradiction stays held. */
export function organsOf(agency, ref, { admitted = {}, told = {} } = {}) {
  const record = bearerRecord(agency, ref);
  if (record === undefined) return Object.freeze([]);
  const organs = [...agency.organs.values()]
    .filter((organ) => organ.of.some((of) => bearerRecord(agency, of, organ.sectionPath)?.key === record.key))
    .map((organ) => {
      const authored = handedness(organ.handedness);
      const telling = told[organ.key] ?? told[organ.id];
      return { key: organ.key, of: record.key, platform: organ.platform, account: organ.account,
        ...(telling === undefined ? { handedness: authored } : { derived: "told", handedness: embodied(authored, handedness(telling)) }) };
    });
  if (agency.characters.get(record.key) === record && typeof record.harness === "string") {
    const testified = admitted[record.id] ?? admitted[record.key];
    const actuate = testified === undefined ? "absurd" : testified.length > 0 ? "potential" : "active";
    organs.push({ key: `${record.key}:harness`, of: record.key, platform: record.harness, account: record.host, derived: "harness",
      ...(testified === undefined ? {} : { capabilities: Object.freeze([...testified]) }),
      handedness: handedness({ recv: "potential", send: "potential", actuate, observe: "potential" }) });
  }
  if (agency.masks.get(record.key) === record) organs.push(...carrierOrgans(agency, record));
  return Object.freeze(organs.map((organ) => Object.freeze(organ)));
}

/** A bearer's body natural: the knowledge join of its organs' handedness. */
export const bodyNatural = (agency, bearer, options) => joined(organsOf(agency, bearer, options).map((organ) => organ.handedness));

/** The face a mask (as ./cast.mjs masksOf reads it) turns to the arena. An office's is its coordination
 *  boundary (recv: offices it receives from; send: offices it assigns to), its skills' verbs (actuate) and
 *  the works its duties are owed toward (observe); a persona's, role's or body face's is its organs'. */
export function maskFace(agency, mask, options) {
  if (mask.kind === "office") {
    const boundary = officeCoordinationBoundary(agency, mask.by);
    return handedness({
      recv: provided(boundary.receivesFrom.length > 0), send: provided(boundary.assignsTo.length > 0),
      actuate: provided(boundary.verbs.length > 0), observe: provided((officeReading(agency, mask.by).works ?? []).length > 0),
    });
  }
  return bodyNatural(agency, mask.kind === "face" ? mask.through ?? mask.key : mask.key, options);
}

/** A mask face played through a bearer's body natural: their truth meet at each coordinate. */
export const embodied = (face, body) => handedness(Object.fromEntries(COORDINATES.map((c) => [c, truthMeetReading(face[c], body[c])])));

/** A bearer's players (./cast.mjs playersOf), each with its mask's face, the bearer's body natural, the
 *  embodied handedness, and gaming's mask over it — the I/O face the work arena's game sees, partitioned
 *  into what it takes (Opponent side) and what it commits (Player side). */
export function embodiedPlayers(agency, bearer, masks, options) {
  const body = bodyNatural(agency, bearer, options);
  return Object.freeze(masks.filter((m) => m.wearable).map((m) => {
    const face = maskFace(agency, m, options);
    const hand = embodied(face, body);
    const game = gameMask(hand, m.by);
    return Object.freeze({ by: m.by, mask: m.key, kind: m.kind, face, body, handedness: hand, game, sides: sides(game) });
  }));
}
