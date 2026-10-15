/**
 * cast — the agency read as the cast of the house's concurrent game: who plays, wearing what.
 *
 * A player is a BEARER wearing a MASK (./kinds.mjs). The bearer is a character or a body; the mask
 * is the face it turns to the arena — an office it is seated in, a persona it or a body it belongs
 * to wears, a role, or a body's own face. An account is only the hand that plays a move. So the
 * question "who may play as X" is no longer "who holds office X": an office is one mask among
 * several, and a body's members may play wearing the body's face or a persona the body wears (the
 * incumbent of Causeway Publishing's lead office plays as Sigrid Song because the enterprise wears
 * that pen name and the incumbency makes them its member).
 *
 * A character is not a substance the masks hang off: it is the gluing of its masks
 * (playing/character-agent `identity`) and the union of its plays (`performedSelf`). Each mask
 * commits FOUR readings on named claims; the claims of all a character's masks are its loci, each
 * mask a design over them, and two masks committing opposite readings on one claim are the
 * character's identity drift — held as ⊤ (paraconsistent), named, never exploded.
 */
import { subjectOf } from "@red-cup-engineering/computer-networking-engineering-services-section/identity/subject";
import { characterAgent, identity, performedSelf } from "@red-cup-engineering/playing/character-agent";
import { design } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/design";
import { locus, locusKey } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/locus";

import { accountabilityOf } from "./control.mjs";
import { houseSectionOf } from "../enterprise/work-arena.mjs";
import { agencyKey, bearersHandedBy, bodiesOf, bodyMembers, bodyOf, canonicalPlayer, headsOf, officeReading, resolve, seatOf } from "./index.mjs";
import { BODY_KINDS, recordedPlayerOf } from "./kinds.mjs";
import { bodyNatural, carrierSource, embodiedPlayers, organsOf } from "./organs.mjs";

const named = (record, ref) => ref === record.id || ref === record.key || ref === record.name;

/** How a micro-enterprise is named as a player in the work arena (its plain id); any other body by key. */
const faceOf = (agency, body) => (agency.enterprises.get(body.key) === body ? body.id : body.key);

/** Every mask `bearer` (a character or body id or key, or an account) can be read wearing, wearable or
 *  not: its office seats (wearable at dignitas), the personas and roles worn by it, and — for each body
 *  it is a recognized member of whose face its kind lets it bear — the body's own face and the personas
 *  the body wears. */
export function masksOf(agency, bearer) {
  const masks = [];
  for (const incumbency of agency.incumbencies.values()) {
    if (incumbency.holder !== bearer) continue;
    const { office, state } = seatOf(agency, incumbency);
    if (office === undefined) continue;
    masks.push({ kind: "office", key: incumbency.key, by: office, state, wearable: state === "dignitas" });
  }
  const worn = (wearer, through) => {
    for (const mask of agency.masks.values()) {
      if (mask.wornBy.some((ref) => named(wearer, ref) || ref === wearer)) {
        masks.push({ kind: mask.kind, key: mask.key, by: mask.key, name: mask.name, carrier: carrierSource(mask), wearable: true, ...(through ? { through } : {}) });
      }
    }
  };
  const self = resolve(agency, "characters", bearer) ?? bodyOf(agency, bearer)?.body;
  worn(self ?? { id: bearer, key: bearer, name: bearer });
  const bears = (body, kind) => BODY_KINDS[kind].plays && (BODY_KINDS[kind].face === "members"
    || (BODY_KINDS[kind].face === "head" && headsOf(agency, body).some((head) => head === bearer || (self !== undefined && named(self, head)))));
  for (const key of bodiesOf(agency, self?.id ?? bearer)) {
    const { body, kind } = bodyOf(agency, key);
    if (!bears(body, kind)) continue;
    masks.push({ kind: "face", key: body.key, by: faceOf(agency, body), name: body.name, wearable: true, through: body.key });
    worn(body, body.key);
  }
  return Object.freeze(masks.map((mask) => Object.freeze(mask)));
}

/** The players `bearer` may play as: each wearable mask, named as the work arena names its player. */
export function playersOf(agency, bearer) {
  return Object.freeze([...new Map(masksOf(agency, bearer).filter((mask) => mask.wearable)
    .map((mask) => [mask.by, Object.freeze({ by: mask.by, bearer, mask: mask.key, kind: mask.kind, ...(mask.through ? { through: mask.through } : {}) })])).values()]);
}

/** Every bearer that may play as `maskRef` (a mask, office or body, by key, id or the name the arena
 *  plays it under): characters by id, micro-enterprises by id and other bodies by key, those the mask
 *  record names as wearing it first. */
export function wearersOf(agency, maskRef) {
  const mask = resolve(agency, "masks", maskRef);
  const target = mask?.key ?? maskRef;
  const named = (mask?.wornBy ?? []).map((ref) => resolve(agency, "characters", ref, mask.sectionPath)?.id
    ?? (bodyOf(agency, ref, mask.sectionPath) && faceOf(agency, bodyOf(agency, ref, mask.sectionPath).body)) ?? ref);
  const everyone = [...new Set([...named, ...[...agency.characters.values()].map((c) => c.id),
    ...[...agency.bodies.values(), ...agency.enterprises.values()].map((body) => faceOf(agency, body))])];
  return Object.freeze(everyone.filter((bearer) => playersOf(agency, bearer).some((p) => p.mask === target || p.by === target)));
}

/**
 * One play cast: the player (`by`, as the arena names it) a bearer wearing `maskRef` plays as through
 * `hand`, or why no one may. The hand settles the bearer: an account some organ makes the hand of a
 * bearer (./index.mjs bearersHandedBy) is played by that bearer; a hand of the mask itself (a persona's
 * carrier presence, by organ key, `platform:account` or account) by whoever wears the mask; with no hand,
 * by `bearer` or else the wearers. Of those, the bearer is the first that answers for the mask to a
 * captain (./control.mjs accountabilityOf, condition 1): a hand playing a mask no accountable bearer
 * wears is the play the theory forbids, and comes back an obstruction naming who wears it.
 */
export function castPlay(agency, maskRef, { hand, bearer } = {}) {
  const mask = resolve(agency, "masks", maskRef);
  const target = mask?.key ?? maskRef;
  const organ = hand === undefined || mask === undefined ? undefined
    : organsOf(agency, mask.key).find((o) => o.key === hand || `${o.platform}:${o.account}` === hand || o.account === hand);
  const handed = hand === undefined ? [] : bearersHandedBy(agency, hand);
  const wearers = wearersOf(agency, maskRef);
  const candidates = bearer !== undefined ? [bearer] : handed.length > 0 ? handed : hand === undefined || organ !== undefined ? wearers : [];
  const obstruction = (reason) => Object.freeze({ kind: "organizing.agency.cast-obstruction", mask: target, ...(hand === undefined ? {} : { hand }), reason, wearers });
  if (candidates.length === 0) return obstruction(hand === undefined ? "no bearer wears the mask" : `${hand} is the hand of no bearer and no organ of the mask`);
  const tried = [];
  for (const candidate of candidates) {
    const player = playersOf(agency, candidate).find((p) => p.mask === target || p.by === target);
    if (player === undefined) { tried.push(`${candidate} does not wear it`); continue; }
    const accountability = accountabilityOf(agency, candidate, target);
    if (accountability.reading !== "potential") { tried.push(`${candidate} answers to no captain for it (${accountability.reading})`); continue; }
    return Object.freeze({
      kind: "organizing.agency.play", by: player.by, mask: player.mask, bearer: candidate,
      ...(hand === undefined ? {} : { hand }), ...(organ === undefined ? {} : { organ: organ.key }),
      captains: accountability.captains,
    });
  }
  return obstruction(tried.join("; "));
}

/** The claims a mask commits, claim → FOUR reading: an office seat commits its duties, powers,
 *  immunities and liberties (held at dignitas, both under repair); a persona or role its authored
 *  commitments; a body's face the body's. */
function commitmentsOf(agency, mask) {
  if (mask.kind === "office") {
    const reading = mask.state === "dignitas" ? "potential" : mask.state === "repair" ? "stable" : undefined;
    if (reading === undefined) return {};
    const office = officeReading(agency, mask.by);
    return Object.fromEntries([
      ...(office.duties ?? []).map((duty) => `bears:${duty.id}`), ...(office.powers ?? []).map((p) => `power:${p}`),
      ...(office.immunities ?? []).map((i) => `immunity:${i}`), ...(office.liberties ?? []).map((l) => `liberty:${l}`),
    ].map((claim) => [claim, reading]));
  }
  if (mask.kind === "face") return { ...(bodyOf(agency, mask.key)?.body.commits ?? {}) };
  return { ...(agency.masks.get(mask.key)?.commits ?? {}) };
}

/**
 * A character read as the theory has it: its masks, each a design over the claims they commit; its two
 * bodies — the bodies politic it belongs to and its body natural (its organs, ./organs.mjs); each
 * player embodied (the mask's face met with the body natural, as gaming's I/O mask); its identity (the
 * gluing of its masks, drift named by claim); and its performed self (the union of `plays`, its
 * chronicles in the arena). `disciplines` and `skills` are playing's designs where the caller has them;
 * `admitted` is the provider testimony of what bearers can actuate (bearer → capabilities).
 */
export function characterReading(agency, characterRef, { plays = [], disciplines = [], skills = [], admitted = {} } = {}) {
  const character = resolve(agency, "characters", characterRef);
  if (character === undefined) return Object.freeze({ kind: "organizing.agency.character-obstruction", character: characterRef, reason: "no such character, or ambiguous" });
  const masks = masksOf(agency, character.id).map((mask) => ({ ...mask, commits: commitmentsOf(agency, mask) }));
  const claims = [...new Set(masks.flatMap((mask) => Object.keys(mask.commits)))].sort();
  const at = new Map(claims.map((claim, index) => [claim, locusKey(locus([index]))]));
  const claimAt = new Map([...at].map(([claim, key]) => [key, claim]));
  const personas = masks.map((mask) => design(Object.entries(mask.commits).map(([claim, reading]) => ({ locusKey: at.get(claim), reading }))));
  const agent = characterAgent(character.name, { personas, disciplines, skills, plays });
  const glued = identity(agent);
  return Object.freeze({
    kind: "organizing.agency.character",
    character: character.key,
    name: character.name,
    masks: Object.freeze(masks.map((mask) => Object.freeze(mask))),
    players: playersOf(agency, character.id),
    bodies: Object.freeze(bodiesOf(agency, character.id)),
    organs: organsOf(agency, character.key, { admitted }),
    body: bodyNatural(agency, character.key, { admitted }),
    embodied: embodiedPlayers(agency, character.key, masks, { admitted }),
    identity: Object.freeze({ coherent: glued.coherent, drift: Object.freeze(glued.driftLoci.map((key) => claimAt.get(key))), cohomology: glued.cohomology }),
    performed: performedSelf(agent),
    agent,
  });
}

/**
 * The whole cast: every character's and body's players, every body's members, and the ways the
 * records contradict the theory — a mask worn by no bearer, a body part of a body that is not
 * there, a band made part of anything (a band is the rhizome, never a culm's part), and a body
 * serving something other than a band or body it can name.
 */
export function castCensus(agency) {
  const problems = [];
  for (const mask of agency.masks.values()) {
    const unworn = mask.wornBy.filter((ref) => resolve(agency, "characters", ref, mask.sectionPath) === undefined && bodyOf(agency, ref, mask.sectionPath) === undefined);
    if (mask.wornBy.length === 0 || unworn.length > 0) problems.push({ record: mask.key, reason: `mask worn by no bearer the registry names${unworn.length ? `: ${unworn.join(", ")}` : ""}` });
  }
  for (const body of agency.bodies.values()) {
    for (const ref of body.partOf) {
      const part = bodyOf(agency, ref, body.sectionPath);
      if (part === undefined) problems.push({ record: body.key, reason: `part of ${ref}, which no body names` });
    }
    if (body.kind === "band" && body.partOf.length > 0) problems.push({ record: body.key, reason: "a band is made part of a body: the rhizome is never a culm's part" });
    if (body.serves !== undefined && bodyOf(agency, body.serves, body.sectionPath) === undefined) problems.push({ record: body.key, reason: `serves ${body.serves}, which no body names` });
  }
  const bearers = [...new Set([...agency.characters.values()].map((c) => c.id))];
  const bodies = [...agency.bodies.values(), ...agency.enterprises.values()];
  return Object.freeze({
    kind: "organizing.agency.cast",
    players: Object.freeze(Object.fromEntries(bearers.map((id) => [id, playersOf(agency, id)]).filter(([, players]) => players.length > 0))),
    bodies: Object.freeze(Object.fromEntries(bodies.map((body) => [agencyKey(body), Object.freeze({
      kind: agency.enterprises.get(body.key) === body ? "micro-enterprise" : body.kind,
      members: bodyMembers(agency, body.key),
    })]))),
    problems: Object.freeze(problems.map((p) => Object.freeze(p))),
  });
}


/** An office key's section, as the house spells it (`<section>#<office>`). */
const sectionOfOffice = (office) => houseSectionOf(office.split("#")[0]) ?? office.split("#")[0];

/**
 * The mask an account plays a move as, read off the offices it holds (`held`: `[{ office }]`, in the
 * canonical registry spelling). One held office is the mask. With several, the one `as` names (it must be
 * held, or the call is refused), else the office seated deepest over the sections the move is about
 * (`sections`: the longest-prefix reading that derives a thread's home); several and no such reading is
 * refused rather than guessed. An account holding none is an outside party and plays in its own name.
 */
function maskAmong(agency, held, subject, as, sections) {
  const offices = [...new Set(held.map((entry) => canonicalPlayer(agency, entry.office)))];
  if (as !== undefined) {
    const named = resolve(agency, "offices", as)?.key ?? as;
    if (!offices.includes(named)) throw new TypeError(`${subject} does not hold ${named}; it holds ${offices.length === 0 ? "no office" : offices.join(", ")}`);
    return named;
  }
  if (offices.length === 0) return subject;
  if (offices.length === 1) return offices[0];
  const spelled = sections.map((section) => houseSectionOf(section) ?? section);
  const depth = (office) => Math.max(-1, ...spelled.map((section) => {
    const own = sectionOfOffice(office);
    return section === own || section.startsWith(`${own}/`) ? own.length : -1;
  }));
  const ranked = offices.map((office) => ({ office, depth: depth(office) })).filter((entry) => entry.depth >= 0).sort((a, b) => b.depth - a.depth);
  if (ranked.length > 0 && (ranked.length === 1 || ranked[0].depth > ranked[1].depth)) return ranked[0].office;
  throw new TypeError(`${subject} holds ${offices.join(", ")}; name the office the move is played as with as, or scope the move to a section one of them is seated over`);
}

/**
 * THE player of an act: the mask it was played as (`by`), the bearer wearing it and the hand it came
 * through. Every place that tells a player reads it here; `act` is one of three cases.
 *
 * - A recorded act (`{ invocation, decision }`: an RPC attempt and the decision that admitted it). The
 *   hand is the session or account the call arrived in (`invocation.caller.hand`, else the subject). The
 *   bearer is the subject's own: the uniquely associated character (`bearersHandedBy`: told hands, then authored),
 *   or the explicit `bearer` selected from those current associations; ambiguous association is
 *   refused rather than resolved by registry order. With no associated character, the subject itself (an authenticated character is its own hand). The mask
 *   is read off the grants that admitted it (`admitted-by:<issuer>` in the decision): an office's grant
 *   plays as that office, an allocation's as that allocation; with neither, the bearer plays as itself.
 *   `masks` keeps every admitting issuer, since a verb several held offices grant is admitted under each.
 *   Give the agency with told hands folded in (`withToldHands`) where the node has told some.
 * - A move played through a host (the same, with `held`: the account's offices as `[{ office }]`, and
 *   optionally `as` and `sections`). The mask is chosen among the held offices (`maskAmong`) rather than
 *   read off a decision.
 * - An act that already records its player (`{ player }`, as an outcome or a governing act does): the
 *   record is validated and normalised to `{ by, bearer?, hand? }`; none recorded is none (`undefined`).
 *   No agency is read, so `agency` may be undefined.
 */
export function playerOfAct(agency, act = {}) {
  if ("player" in act) return recordedPlayerOf(act.player);
  const { invocation, decision, held, as, sections = [] } = act;
  const subject = subjectOf(invocation);
  if (typeof subject !== "string" || subject === "") return undefined;
  const bearers = [...new Set(bearersHandedBy(agency, subject).filter((hand) => hand !== subject))];
  const selected = act.bearer;
  if (selected !== undefined && selected !== subject && !bearers.includes(selected)) {
    throw new TypeError(`${subject} is not a current hand of ${selected}`);
  }
  if (selected === undefined && bearers.length > 1) {
    throw new TypeError(`${subject} acts for ${bearers.join(", ")}; select the bearer for this act`);
  }
  const bearer = selected ?? bearers[0] ?? subject;
  const hand = typeof invocation.caller?.hand === "string" ? invocation.caller.hand : subject;
  const issuers = (decision?.evidence ?? []).filter((entry) => typeof entry === "string" && entry.startsWith("admitted-by:")).map((entry) => entry.slice("admitted-by:".length));
  const offices = [...new Set(issuers.filter((issuer) => issuer.startsWith("office:")).map((issuer) => issuer.slice("office:".length)))];
  const allocations = issuers.filter((issuer) => issuer.startsWith("allocation:"));
  const by = held !== undefined ? maskAmong(agency, held, subject, as, sections)
    : offices.length === 1 ? offices[0] : allocations.length === 1 && offices.length === 0 ? allocations[0] : bearer;
  return Object.freeze({ kind: "organizing.agency.act-player", by, bearer, hand, masks: Object.freeze(issuers) });
}
