/** Playing's typed RMN programs. Fixed records use direct product projection; variable collections are homogeneous lists. */
import { tm, ty, type Tm, type Ty } from "@red-cup-engineering/relation-model-notation";
import { booleanDescriptor, listTy, numberDescriptor, objectTerm, objectTy, projectField, stringDescriptor, stringTerm, typedListTerm } from "@red-cup-engineering/relation-model-notation-json-codec";

const scalarTy = ty.prod(ty.base(), ty.base());
const chargeTy: Ty = ["charge"];
const locusTy = listTy(scalarTy);
const actEntryTy = objectTy(["locus", "act"], { locus: locusTy, act: scalarTy });
const entryTy = objectTy(["locus", "charge"], { locus: locusTy, charge: scalarTy });
const entriesTy = listTy(entryTy);
const designTy = objectTy(["entries"], { entries: entriesTy });
const designInputTy = objectTy(["entries"], { entries: listTy(actEntryTy) });
const interactionInputTy = objectTy(["designA", "designB"], { designA: designTy, designB: designTy });
const meetingTy = objectTy(["daimonized", "joined", "left", "locus", "right"], { daimonized: scalarTy, joined: scalarTy, left: scalarTy, locus: locusTy, right: scalarTy });
const interactionTy = objectTy(["kind", "daimonLoci", "meetings", "normalForm"], { kind: scalarTy, daimonLoci: listTy(locusTy), meetings: listTy(meetingTy), normalForm: designTy });
const ann = (term: Tm, type: Ty): Tm => Object.freeze(["ascribe", type, term]);
const lam = (from: Ty, to: Ty, body: Tm): Tm => ann(tm.lam(body), ty.arrow(from, to));
const nil = (item: Ty): Tm => typedListTerm(item, []);
const cons = (head: Tm, tail: Tm): Tm => Object.freeze(["cons", head, tail]);
const fld = (names: readonly string[], key: string, term: Tm): Tm => projectField(names, key, term);
const entry = (key: "locus" | "charge", term: Tm): Tm => fld(["locus", "charge"], key, term);
const act = (key: "locus" | "act", term: Tm): Tm => fld(["locus", "act"], key, term);
const entries = (term: Tm): Tm => fld(["entries"], "entries", term);
const input = (key: "designA" | "designB", term: Tm): Tm => fld(["designA", "designB"], key, term);
const unknown = tm.charge("unknown"), contested = tm.charge("contested");
const sameString = (term: Tm, value: string): Tm => tm.coincide(term, stringTerm(value));
const sameCharge = (term: Tm, value: "unknown" | "held" | "denied" | "contested"): Tm => tm.coincide(term, tm.charge(value));
const jsonTrue: Tm = tm.pair(tm.mark('"rmn.json.boolean"'), tm.mark("true"));
const jsonFalse: Tm = tm.pair(tm.mark('"rmn.json.boolean"'), tm.mark("false"));
const boolJson = (test: Tm): Tm => tm.cond(test, jsonTrue, jsonFalse);
const chargeOfAct = (value: Tm): Tm => tm.cond(sameString(value, "proponent"), tm.charge("held"), tm.cond(sameString(value, "opponent"), tm.charge("denied"), tm.cond(sameString(value, "daimon"), contested, unknown)));
const chargeOfName = (value: Tm): Tm => tm.cond(sameString(value, "potential"), tm.charge("held"), tm.cond(sameString(value, "active"), tm.charge("denied"), tm.cond(sameString(value, "stable"), contested, unknown)));
const nameOfCharge = (value: Tm): Tm => tm.cond(sameCharge(value, "held"), stringTerm("potential"), tm.cond(sameCharge(value, "denied"), stringTerm("active"), tm.cond(sameCharge(value, "contested"), stringTerm("stable"), stringTerm("absurd"))));

const reverseEntriesTerm = lam(entriesTy, entriesTy, tm.fold(lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy, cons(tm.var(0), tm.var(1)))), nil(entryTy), tm.var(0)));
const reverseEntries = (value: Tm): Tm => tm.app(reverseEntriesTerm, value);
const appendEntriesTerm = lam(entriesTy, ty.arrow(entriesTy, entriesTy), lam(entriesTy, entriesTy, tm.fold(lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy, cons(tm.var(0), tm.var(1)))), tm.var(0), reverseEntries(tm.var(1)))));
const appendEntries = (left: Tm, right: Tm): Tm => tm.app(tm.app(appendEntriesTerm, left), right);

const designEntryFromAct = (value: Tm): Tm => objectTerm([["charge", nameOfCharge(chargeOfAct(act("act", value)))], ["locus", act("locus", value)]]);
const designReversedTerm = lam(listTy(actEntryTy), entriesTy, tm.fold(
  lam(entriesTy, ty.arrow(actEntryTy, entriesTy), lam(actEntryTy, entriesTy,
    tm.cond(sameString(act("act", tm.var(0)), "none"), tm.var(1), cons(designEntryFromAct(tm.var(0)), tm.var(1))))), nil(entryTy), tm.var(0)));
export const designTerm: Tm = lam(designInputTy, designTy, objectTerm([["entries", reverseEntries(tm.app(designReversedTerm, entries(tm.var(0))))]]));

const dualEntryTerm = lam(entryTy, entryTy, objectTerm([["charge", nameOfCharge(tm.negate(chargeOfName(entry("charge", tm.var(0)))))], ["locus", entry("locus", tm.var(0))]]));
const dualReversedTerm = lam(entriesTy, entriesTy, tm.fold(lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy, cons(tm.app(dualEntryTerm, tm.var(0)), tm.var(1)))), nil(entryTy), tm.var(0)));
export const dualizeTerm: Tm = lam(designTy, designTy, objectTerm([["entries", reverseEntries(tm.app(dualReversedTerm, entries(tm.var(0))))]]));

const hasLocusTerm = lam(locusTy, ty.arrow(entriesTy, chargeTy), lam(entriesTy, chargeTy, tm.fold(
  lam(chargeTy, ty.arrow(entryTy, chargeTy), lam(entryTy, chargeTy,
    tm.cond(tm.var(1), tm.bool(true), tm.coincide(entry("locus", tm.var(0)), tm.var(3))))), tm.bool(false), tm.var(0))));
const hasLocus = (list: Tm, locus: Tm): Tm => tm.app(tm.app(hasLocusTerm, locus), list);
const chargeAtTerm = lam(locusTy, ty.arrow(entriesTy, chargeTy), lam(entriesTy, chargeTy, tm.fold(
  lam(chargeTy, ty.arrow(entryTy, chargeTy), lam(entryTy, chargeTy,
    tm.cond(
      tm.coincide(entry("locus", tm.var(0)), tm.var(3)),
      chargeOfName(entry("charge", tm.var(0))),
      tm.var(1),
    ))), unknown, tm.var(0))));
const chargeAt = (list: Tm, locus: Tm): Tm => tm.app(tm.app(chargeAtTerm, locus), list);
const rightOnlyReversedTerm = lam(entriesTy, ty.arrow(entriesTy, entriesTy), lam(entriesTy, entriesTy, tm.fold(
  lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy,
    tm.cond(
      hasLocus(tm.var(3), entry("locus", tm.var(0))),
      tm.var(1),
      cons(tm.var(0), tm.var(1)),
    ))), nil(entryTy), tm.var(0))));
const unionEntries = (left: Tm, right: Tm): Tm => appendEntries(left, reverseEntries(tm.app(tm.app(rightOnlyReversedTerm, left), right)));
const normalEntry = (left: Tm, right: Tm, current: Tm): Tm => objectTerm([
  ["charge", nameOfCharge(tm.joinK(chargeAt(left, entry("locus", current)), chargeAt(right, entry("locus", current))))],
  ["locus", entry("locus", current)],
]);
const normalReversedTerm = lam(entriesTy, ty.arrow(entriesTy, entriesTy), lam(entriesTy, entriesTy, tm.fold(
  lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy,
    cons(normalEntry(tm.var(3), tm.var(2), tm.var(0)), tm.var(1)))),
  nil(entryTy), unionEntries(tm.var(1), tm.var(0)))));
const normalEntries = (left: Tm, right: Tm): Tm => reverseEntries(tm.app(tm.app(normalReversedTerm, left), right));
const meeting = (left: Tm, right: Tm, locus: Tm): Tm => { const a = chargeAt(left, locus), b = chargeAt(right, locus), joined = tm.joinK(a, b); return objectTerm([["daimonized", boolJson(tm.coincide(joined, contested))], ["joined", nameOfCharge(joined)], ["left", nameOfCharge(a)], ["locus", locus], ["right", nameOfCharge(b)]]); };
const meetingsReversedTerm = lam(entriesTy, ty.arrow(entriesTy, listTy(meetingTy)), lam(entriesTy, listTy(meetingTy), tm.fold(
  lam(listTy(meetingTy), ty.arrow(entryTy, listTy(meetingTy)), lam(entryTy, listTy(meetingTy),
    tm.cond(hasLocus(tm.var(3), entry("locus", tm.var(0))), cons(meeting(tm.var(3), tm.var(2), entry("locus", tm.var(0))), tm.var(1)), tm.var(1)))), nil(meetingTy), tm.var(0))));
const reverseMeetingsTerm = lam(listTy(meetingTy), listTy(meetingTy), tm.fold(lam(listTy(meetingTy), ty.arrow(meetingTy, listTy(meetingTy)), lam(meetingTy, listTy(meetingTy), cons(tm.var(0), tm.var(1)))), nil(meetingTy), tm.var(0)));
const meetings = (left: Tm, right: Tm): Tm => tm.app(reverseMeetingsTerm, tm.app(tm.app(meetingsReversedTerm, left), right));
const daimonReversedTerm = lam(entriesTy, ty.arrow(entriesTy, listTy(locusTy)), lam(entriesTy, listTy(locusTy), tm.fold(
  lam(listTy(locusTy), ty.arrow(entryTy, listTy(locusTy)), lam(entryTy, listTy(locusTy),
    tm.cond(hasLocus(tm.var(3), entry("locus", tm.var(0))), tm.cond(tm.coincide(tm.joinK(chargeAt(tm.var(3), entry("locus", tm.var(0))), chargeAt(tm.var(2), entry("locus", tm.var(0)))), contested), cons(entry("locus", tm.var(0)), tm.var(1)), tm.var(1)), tm.var(1)))), nil(locusTy), tm.var(0))));
const reverseLociTerm = lam(listTy(locusTy), listTy(locusTy), tm.fold(lam(listTy(locusTy), ty.arrow(locusTy, listTy(locusTy)), lam(locusTy, listTy(locusTy), cons(tm.var(0), tm.var(1)))), nil(locusTy), tm.var(0)));
const daimonLoci = (left: Tm, right: Tm): Tm => tm.app(reverseLociTerm, tm.app(tm.app(daimonReversedTerm, left), right));
export const interactTerm: Tm = lam(interactionInputTy, interactionTy, objectTerm([["kind", stringTerm("playing.interaction")], ["daimonLoci", daimonLoci(entries(input("designA", tm.var(0))), entries(input("designB", tm.var(0))))], ["meetings", meetings(entries(input("designA", tm.var(0))), entries(input("designB", tm.var(0))))], ["normalForm", objectTerm([["entries", normalEntries(entries(input("designA", tm.var(0))), entries(input("designB", tm.var(0))))]])]]));

const designDescriptor = { kind: "record", fields: { entries: { kind: "list", item: { kind: "record", fields: { locus: { kind: "list", item: numberDescriptor }, charge: stringDescriptor } } } } } as const;
export const playingDescriptors = Object.freeze({
  designInput: { kind: "record", fields: { entries: { kind: "list", item: { kind: "record", fields: { locus: { kind: "list", item: numberDescriptor }, act: stringDescriptor } } } } } as const,
  design: designDescriptor,
  interaction: { kind: "record", fields: { kind: stringDescriptor, daimonLoci: { kind: "list", item: { kind: "list", item: numberDescriptor } }, meetings: { kind: "list", item: { kind: "record", fields: { daimonized: booleanDescriptor, joined: stringDescriptor, left: stringDescriptor, locus: { kind: "list", item: numberDescriptor }, right: stringDescriptor } } }, normalForm: designDescriptor } } as const,
});
export const playingTerms = Object.freeze({ design: designTerm, dualize: dualizeTerm, interact: interactTerm } as const);
