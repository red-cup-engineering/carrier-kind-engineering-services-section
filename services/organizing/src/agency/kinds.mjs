/**
 * kinds — the masks a bearer wears and the bodies bearers form, as the house's theory of work names
 * them (561 Group plan of record, 2026-10-02: from offices to the cast).
 *
 * The work arena's game is a concurrent game (Castellan–Clairambault–Winskel): its players are not
 * offices but bearers wearing masks. A BEARER is a durable locus — a character (kin-embedded, owned by
 * the org) or a body (a collective that answers as one). A MASK is the face a bearer turns to the
 * arena (Latin persona: the actor's mask; ludically a delocation, playing/persona). An office is one
 * kind of mask — the incumbent bears the office's persona (gerit personam civitatis) — so the office
 * regime is one recognition regime among several, not the only way anyone plays. An account is only a
 * hand.
 *
 * A body here is the BODY POLITIC — a collective that answers as one. The BODY NATURAL, a participant's
 * sensors and actuators (its organs; the account is a hand), is ./organs.mjs: Kantorowicz's two bodies.
 *
 * A body's KIND is its constitution: how its members are recognized (the relation its membership is
 * the least fixpoint of, from its seeds), how it decides (`rule`, executed by ./politic.mjs over
 * socializing/deciding), on what authority (`authority`, one of Weber's bases), and whether it plays. Each regime
 * reads membership as a FOUR value per member — recognized (t), withdrawn or expelled (f), both (⊤,
 * held, never exploded), or unknown (⊥).
 */

/** The kinds of mask. `derived` kinds are read off other records and may never be authored. */
export const MASK_KINDS = Object.freeze({
  persona: Object.freeze({ derived: false, doctrine: "a public face (a pen name, a byline, a channel host) worn by a character or a body; its presences live in its carrier" }),
  role: Object.freeze({ derived: false, doctrine: "a part in a troupe's situation" }),
  office: Object.freeze({ derived: true, doctrine: "an office's persona borne by its incumbent, read off the incumbency (recognition × induction)" }),
  session: Object.freeze({ derived: true, doctrine: "a harness session or signed-in account worn over a character; runtime testimony (MetroPlat's character-masks feed), never a record" }),
  face: Object.freeze({ derived: true, doctrine: "a body's own face, worn by its recognized members when the body plays" }),
});

/**
 * The kinds of body. `recognizes` names the relation membership is closed under: a listed member is
 * recognized when one of its `recognized-by` is already recognized, starting from `seeds`. `offices`
 * kinds derive membership from their offices' seats instead. `plays` says whether the body is a
 * player in the work arena at all, and `face` who wears its face (and the personas it wears): every
 * recognized member, only its `head` (a character, or an office whose incumbents at dignitas bear it —
 * a polity's persona is borne by its magistrate, not by every citizen), or no one. `rule` is who settles
 * a decision: every member who has not withdrawn (`withdrawal`, a dissenter withdraws rather than
 * blocks, and silence never blocks: ./band.mjs, ObsmetrologiaComputing.Band), its head (`head`), its founders' direction (`direction`), a majority of
 * its members (`assembly`), all of its members (`consensus`), or whoever does its work (`doers`: a
 * micro-enterprise is decided by the bearers whose hands did its work, nobody owning it; one doer's act
 * stands until another's later act replaces it, and silence never blocks). A sect's founders' charisma has
 * routinized into the lineage's tradition (Weber's routinization).
 */
export const BODY_KINDS = Object.freeze({
  /** A tiyóšpaye: kin recognizing kin. It is prior to every corporate structure and is extended only by
   *  living recognition, never by a record (corporate-culm doctrine), so records seed nothing and can
   *  only describe it; it decides by consensus, a member dissenting by withdrawing. It never plays:
   *  culm-ware serves it. The regime's law (membership, head standing, the council, fission,
   *  confederacy) is ./band.mjs, as ObsmetrologiaComputing.Band specifies it. */
  band: Object.freeze({ recognizes: "kin", seeds: [], plays: false, face: "none", decides: "consensus by withdrawal", rule: "withdrawal", authority: "traditional", fromRecords: false }),
  /** A sect (menpai): a discipline and a lineage. A disciple is recognized when a recognized member
   *  taught them; the founders seed the lineage; the lineage head decides. */
  sect: Object.freeze({ recognizes: "transmission", seeds: ["founders"], plays: true, face: "head", decides: "lineage head", rule: "head", authority: "traditional", fromRecords: true }),
  /** A troupe: cast from a camp for one situation; its roles are masks; it dissolves when the
   *  situation closes. */
  troupe: Object.freeze({ recognizes: "casting", seeds: ["founders"], plays: true, face: "members", decides: "direction", rule: "direction", authority: "charismatic", fromRecords: true }),
  /** A guild: player-formed, each member recognized by signing its covenant. */
  guild: Object.freeze({ recognizes: "covenant", seeds: ["members"], plays: true, face: "head", decides: "assembly", rule: "assembly", authority: "rational-legal", fromRecords: true }),
  /** A micro-enterprise (Rendanheyi): its own decision, personnel and distribution rights (sanquan),
   *  held because it is one and exercised by its governing acts (./governing.mjs); its members are
   *  whoever does its work: seated in its offices by record or by deed (./governing.mjs `doersOf`).
   *  Authored in the `enterprises` pool. */
  // Nobody owns it: those who do its work decide, each act standing until a later one replaces it, and
  // an enterprise nobody has worked in yet decides by its own turn's derivations.
  "micro-enterprise": Object.freeze({ recognizes: "offices", seeds: [], plays: true, face: "members", decides: "three rights, by those who do its work", rule: "doers", authority: "rational-legal", fromRecords: true, rights: Object.freeze(["decision", "personnel", "distribution"]) }),
  /** A polity: a charter and investiture; its members hold its seated offices at dignitas. */
  polity: Object.freeze({ recognizes: "offices", seeds: [], plays: true, face: "head", decides: "charter", rule: "head", authority: "rational-legal", fromRecords: true }),
});

/** The recorded player value, without consulting an authored registry or granting
 * a bearer authority. Shared by act reading and content-addressed outcomes. */
export function recordedPlayerOf(player) {
  if (player === undefined || player === null) return undefined;
  const told = (value) => typeof value === "string" && value.trim() !== "";
  if (!told(player.by)) throw new TypeError("a recorded player names the mask it was played as");
  return Object.freeze({ by: player.by, ...(told(player.bearer) ? { bearer: player.bearer } : {}), ...(told(player.hand) ? { hand: player.hand } : {}) });
}
