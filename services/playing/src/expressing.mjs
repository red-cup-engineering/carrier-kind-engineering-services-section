/** Playing's typed SEN programs. Fixed records use direct product projection; variable collections are homogeneous lists. */
import { tm, ty } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { booleanDescriptor, listTy, numberDescriptor, objectTerm, objectTy, projectField, stringDescriptor, stringTerm, typedListTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";

const scalarTy = ty.prod(ty.base(), ty.base());
const readingTy = ty.base();
const locusTy = listTy(scalarTy);
const actEntryTy = objectTy(["locus", "act"], { locus: locusTy, act: scalarTy });
const entryTy = objectTy(["locus", "reading"], { locus: locusTy, reading: scalarTy });
const entriesTy = listTy(entryTy);
const designTy = objectTy(["entries"], { entries: entriesTy });
const designInputTy = objectTy(["entries"], { entries: listTy(actEntryTy) });
const interactionInputTy = objectTy(["designA", "designB"], { designA: designTy, designB: designTy });
const meetingTy = objectTy(["daimonized", "joined", "left", "locus", "right"], { daimonized: scalarTy, joined: scalarTy, left: scalarTy, locus: locusTy, right: scalarTy });
const interactionTy = objectTy(["kind", "daimonLoci", "meetings", "normalForm"], { kind: scalarTy, daimonLoci: listTy(locusTy), meetings: listTy(meetingTy), normalForm: designTy });
// Binder types document each program; the typer judges a lambda where it is applied or folded.
const lam = (from, to, body) => { void from; void to; return tm.lam(body); };
const nil = (item) => typedListTerm(item, []);
const cons = (head, tail) => tm.consArray(head, tail);
const fld = (names, key, term) => projectField(names, key, term);
const entry = (key, term) => fld(["locus", "reading"], key, term);
const act = (key, term) => fld(["locus", "act"], key, term);
const entries = (term) => fld(["entries"], "entries", term);
const input = (key, term) => fld(["designA", "designB"], key, term);
const unknown = tm.reading("unknown"), contested = tm.reading("contested");
const sameString = (term, value) => tm.coincide(term, stringTerm(value));
const sameReading = (term, value) => tm.coincide(term, tm.reading(value));
const jsonTrue = tm.pair(tm.mark('"sen.json.boolean"'), tm.mark("true"));
const jsonFalse = tm.pair(tm.mark('"sen.json.boolean"'), tm.mark("false"));
const boolJson = (test) => tm.cond(test, jsonTrue, jsonFalse);
const readingOfAct = (value) => tm.cond(sameString(value, "proponent"), tm.reading("held"), tm.cond(sameString(value, "opponent"), tm.reading("denied"), tm.cond(sameString(value, "daimon"), contested, unknown)));
const readingOfName = (value) => tm.cond(sameString(value, "potential"), tm.reading("held"), tm.cond(sameString(value, "active"), tm.reading("denied"), tm.cond(sameString(value, "stable"), contested, unknown)));
const nameOfReading = (value) => tm.cond(sameReading(value, "held"), stringTerm("potential"), tm.cond(sameReading(value, "denied"), stringTerm("active"), tm.cond(sameReading(value, "contested"), stringTerm("stable"), stringTerm("absurd"))));

const reverseEntriesTerm = lam(entriesTy, entriesTy, tm.fold(lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy, cons(tm.var(0), tm.var(1)))), nil(entryTy), tm.var(0)));
const reverseEntries = (value) => tm.app(reverseEntriesTerm, value);
const appendEntriesTerm = lam(entriesTy, ty.arrow(entriesTy, entriesTy), lam(entriesTy, entriesTy, tm.fold(lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy, cons(tm.var(0), tm.var(1)))), tm.var(0), reverseEntries(tm.var(1)))));
const appendEntries = (left, right) => tm.app(tm.app(appendEntriesTerm, left), right);

const designEntryFromAct = (value) => objectTerm([["reading", nameOfReading(readingOfAct(act("act", value)))], ["locus", act("locus", value)]]);
const designReversedTerm = lam(listTy(actEntryTy), entriesTy, tm.fold(
  lam(entriesTy, ty.arrow(actEntryTy, entriesTy), lam(actEntryTy, entriesTy,
    tm.cond(sameString(act("act", tm.var(0)), "none"), tm.var(1), cons(designEntryFromAct(tm.var(0)), tm.var(1))))), nil(entryTy), tm.var(0)));
export const designTerm = lam(designInputTy, designTy, objectTerm([["entries", reverseEntries(tm.app(designReversedTerm, entries(tm.var(0))))]]));

const dualEntryTerm = lam(entryTy, entryTy, objectTerm([["reading", nameOfReading(tm.negate(readingOfName(entry("reading", tm.var(0)))))], ["locus", entry("locus", tm.var(0))]]));
const dualReversedTerm = lam(entriesTy, entriesTy, tm.fold(lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy, cons(tm.app(dualEntryTerm, tm.var(0)), tm.var(1)))), nil(entryTy), tm.var(0)));
export const dualizeTerm = lam(designTy, designTy, objectTerm([["entries", reverseEntries(tm.app(dualReversedTerm, entries(tm.var(0))))]]));

const hasLocusTerm = lam(locusTy, ty.arrow(entriesTy, readingTy), lam(entriesTy, readingTy, tm.fold(
  lam(readingTy, ty.arrow(entryTy, readingTy), lam(entryTy, readingTy,
    tm.cond(tm.var(1), tm.bool(true), tm.coincide(entry("locus", tm.var(0)), tm.var(3))))), tm.bool(false), tm.var(0))));
const hasLocus = (list, locus) => tm.app(tm.app(hasLocusTerm, locus), list);
const readingAtTerm = lam(locusTy, ty.arrow(entriesTy, readingTy), lam(entriesTy, readingTy, tm.fold(
  lam(readingTy, ty.arrow(entryTy, readingTy), lam(entryTy, readingTy,
    tm.cond(
      tm.coincide(entry("locus", tm.var(0)), tm.var(3)),
      readingOfName(entry("reading", tm.var(0))),
      tm.var(1),
    ))), unknown, tm.var(0))));
const readingAt = (list, locus) => tm.app(tm.app(readingAtTerm, locus), list);
const rightOnlyReversedTerm = lam(entriesTy, ty.arrow(entriesTy, entriesTy), lam(entriesTy, entriesTy, tm.fold(
  lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy,
    tm.cond(
      hasLocus(tm.var(3), entry("locus", tm.var(0))),
      tm.var(1),
      cons(tm.var(0), tm.var(1)),
    ))), nil(entryTy), tm.var(0))));
const unionEntries = (left, right) => appendEntries(left, reverseEntries(tm.app(tm.app(rightOnlyReversedTerm, left), right)));
const normalEntry = (left, right, current) => objectTerm([
  ["reading", nameOfReading(tm.joinK(readingAt(left, entry("locus", current)), readingAt(right, entry("locus", current))))],
  ["locus", entry("locus", current)],
]);
const normalReversedTerm = lam(entriesTy, ty.arrow(entriesTy, entriesTy), lam(entriesTy, entriesTy, tm.fold(
  lam(entriesTy, ty.arrow(entryTy, entriesTy), lam(entryTy, entriesTy,
    cons(normalEntry(tm.var(3), tm.var(2), tm.var(0)), tm.var(1)))),
  nil(entryTy), unionEntries(tm.var(1), tm.var(0)))));
const normalEntries = (left, right) => reverseEntries(tm.app(tm.app(normalReversedTerm, left), right));
const meeting = (left, right, locus) => { const a = readingAt(left, locus), b = readingAt(right, locus), joined = tm.joinK(a, b); return objectTerm([["daimonized", boolJson(tm.coincide(joined, contested))], ["joined", nameOfReading(joined)], ["left", nameOfReading(a)], ["locus", locus], ["right", nameOfReading(b)]]); };
const meetingsReversedTerm = lam(entriesTy, ty.arrow(entriesTy, listTy(meetingTy)), lam(entriesTy, listTy(meetingTy), tm.fold(
  lam(listTy(meetingTy), ty.arrow(entryTy, listTy(meetingTy)), lam(entryTy, listTy(meetingTy),
    tm.cond(hasLocus(tm.var(3), entry("locus", tm.var(0))), cons(meeting(tm.var(3), tm.var(2), entry("locus", tm.var(0))), tm.var(1)), tm.var(1)))), nil(meetingTy), tm.var(0))));
const reverseMeetingsTerm = lam(listTy(meetingTy), listTy(meetingTy), tm.fold(lam(listTy(meetingTy), ty.arrow(meetingTy, listTy(meetingTy)), lam(meetingTy, listTy(meetingTy), cons(tm.var(0), tm.var(1)))), nil(meetingTy), tm.var(0)));
const meetings = (left, right) => tm.app(reverseMeetingsTerm, tm.app(tm.app(meetingsReversedTerm, left), right));
const daimonReversedTerm = lam(entriesTy, ty.arrow(entriesTy, listTy(locusTy)), lam(entriesTy, listTy(locusTy), tm.fold(
  lam(listTy(locusTy), ty.arrow(entryTy, listTy(locusTy)), lam(entryTy, listTy(locusTy),
    tm.cond(hasLocus(tm.var(3), entry("locus", tm.var(0))), tm.cond(tm.coincide(tm.joinK(readingAt(tm.var(3), entry("locus", tm.var(0))), readingAt(tm.var(2), entry("locus", tm.var(0)))), contested), cons(entry("locus", tm.var(0)), tm.var(1)), tm.var(1)), tm.var(1)))), nil(locusTy), tm.var(0))));
const reverseLociTerm = lam(listTy(locusTy), listTy(locusTy), tm.fold(lam(listTy(locusTy), ty.arrow(locusTy, listTy(locusTy)), lam(locusTy, listTy(locusTy), cons(tm.var(0), tm.var(1)))), nil(locusTy), tm.var(0)));
const daimonLoci = (left, right) => tm.app(reverseLociTerm, tm.app(tm.app(daimonReversedTerm, left), right));
export const interactTerm = lam(interactionInputTy, interactionTy, objectTerm([["kind", stringTerm("playing.interaction")], ["daimonLoci", daimonLoci(entries(input("designA", tm.var(0))), entries(input("designB", tm.var(0))))], ["meetings", meetings(entries(input("designA", tm.var(0))), entries(input("designB", tm.var(0))))], ["normalForm", objectTerm([["entries", normalEntries(entries(input("designA", tm.var(0))), entries(input("designB", tm.var(0))))]])]]));

const designDescriptor = { kind: "record", fields: { entries: { kind: "list", item: { kind: "record", fields: { locus: { kind: "list", item: numberDescriptor }, reading: stringDescriptor } } } } };
export const playingDescriptors = Object.freeze({
  designInput: { kind: "record", fields: { entries: { kind: "list", item: { kind: "record", fields: { locus: { kind: "list", item: numberDescriptor }, act: stringDescriptor } } } } },
  design: designDescriptor,
  interaction: { kind: "record", fields: { kind: stringDescriptor, daimonLoci: { kind: "list", item: { kind: "list", item: numberDescriptor } }, meetings: { kind: "list", item: { kind: "record", fields: { daimonized: booleanDescriptor, joined: stringDescriptor, left: stringDescriptor, locus: { kind: "list", item: numberDescriptor }, right: stringDescriptor } } }, normalForm: designDescriptor } },
});
export const playingTerms = Object.freeze({ design: designTerm, dualize: dualizeTerm, interact: interactTerm });
