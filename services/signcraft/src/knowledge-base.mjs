/**
 * SignCraft — the knowledge base: a telling log with rules, settled on demand.
 *
 * Tellings accrete in SignChain's telling log. Articulating an utterance
 * (token, claim[, object]) tells its cell for, the token its own witness;
 * denying tells the same cell against. Settling reads the
 * log as its cell set over the site those cells generate and runs the
 * rules (with the site's specialization transport) to the least fixed point. Everything else is a reading of that
 * settlement: its section, consistent/paraconsistent split, cones and void, and
 * per-token and per-claim queries. This is the K of the MAPE-K loop.
 */
import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { TellingLog } from "@red-cup-engineering/signchain/log";
import { site, transportRules } from "@red-cup-engineering/signgraph/site";
import { evidenceAt } from "@red-cup-engineering/signgraph/valuation";
import { about, compare, cones, settleValuation, under, vanish } from "./settle.mjs";

const cellOf = (token, claim, object) => {
  if (token === undefined || claim === undefined) throw new TypeError("knowledge base: an utterance needs a token and a claim");
  return { subject: token, predicate: claim, object: object ?? token };
};

export class KnowledgeBase {
  #log = new TellingLog();
  #rules = [];
  #specializations = [];

  /** Tell an utterance for: its cell (token, claim, object ?? token), witnessed by its token. */
  articulate(token, claim, object) { this.#log.tell(cellOf(token, claim, object), token); return this; }

  /** Deny an utterance: tell its cell against, witnessed by its token. */
  deny(token, claim, object) { this.#log.deny(cellOf(token, claim, object), token); return this; }

  /** Tell a triple for, or against (tellAgainst), with an explicit witness. */
  tell(at, witness) { this.#log.tell(at, witness); return this; }
  tellAgainst(at, witness) { this.#log.deny(at, witness); return this; }

  /** Add SignChain rules, or specialization morphisms (SignGraph), to settle with. */
  withRules(...rules) { this.#rules.push(...rules); return this; }
  withSpecializations(...morphisms) { this.#specializations.push(...morphisms); return this; }

  /** The telling log. */
  get log() { return this.#log; }

  /** The site the told cells and specializations generate. */
  site() { return site(this.#log.cells(), this.#specializations); }

  /** Settle: the log's cells, under the rules and the site's transport, to their fixed point. */
  settle() {
    const at = this.site();
    return settleValuation(at, this.#log.cells(), [...this.#rules, ...transportRules(at)]);
  }

  /** The settled section (a cell set). */
  section() { return this.settle().settled; }

  /** The settled section split into consistent and paraconsistent cells. */
  compare() { return compare(this.section()); }

  /** The four cones per cell, and the void between settle and brim. */
  cones() { return cones(this.settle()); }
  vanish() { return vanish(this.settle()); }

  /** The settled knowledge reading of one utterance's cell. */
  readingAt(token, claim, object) { return knowledgeReading(evidenceAt(this.section(), cellOf(token, claim, object))); }

  /** The settled cells about a token (as subject), and under a claim (as predicate). */
  claimsFor(token) { return about(this.section(), token); }
  subjectsFor(claim) { return under(this.section(), claim); }
}
