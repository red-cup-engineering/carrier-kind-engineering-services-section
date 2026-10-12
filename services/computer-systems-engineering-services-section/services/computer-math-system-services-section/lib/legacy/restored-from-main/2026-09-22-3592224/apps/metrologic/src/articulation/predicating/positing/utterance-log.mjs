import { mark, utterance } from "./utterance.mjs";
import { chargeNameOfSides } from "./bilattice-charge.mjs";
export class UtteranceLog {
    #utterances;
    constructor(utterances = []){
        this.#utterances = [
            ...utterances
        ];
    }
    get utterances() {
        return Object.freeze([
            ...this.#utterances
        ]);
    }
    /** Number of admitted utterances, including repeated evidence. */
    get size() {
        return this.#utterances.length;
    }
    admit(...utterances) {
        this.#utterances.push(...utterances);
        return this;
    }
}
const contraryClaimValue = (predicate)=>Object.freeze({
        not: predicate
    });
const contraryReading = (claimValue)=>{
    if (typeof claimValue !== "object" || claimValue === null || Array.isArray(claimValue)) return undefined;
    const record = claimValue;
    if (Object.keys(record).length !== 1 || record.not === undefined) return undefined;
    return record;
};
export function isContraryUtterance(carrier) {
    return contraryReading(carrier.claim.mark.value) !== undefined;
}
export function factUtterances(cell, sides) {
    const tokenMark = mark({
        subject: cell.subject,
        object: cell.object
    });
    const out = [];
    if (sides[0]) out.push(utterance(tokenMark, mark(cell.predicate)));
    if (sides[1]) out.push(utterance(tokenMark, mark(contraryClaimValue(cell.predicate))));
    return out;
}
export function witness(log, cell, sides) {
    return log.admit(...factUtterances(cell, sides));
}
export function chargeOfUtterances(utterances) {
    let truth = false;
    let falsity = false;
    for (const carrier of utterances){
        if (isContraryUtterance(carrier)) falsity = true;
        else truth = true;
        if (truth && falsity) break;
    }
    return chargeNameOfSides(truth, falsity);
}
export function cellValues(carrier) {
    const tokenValue = carrier.token.mark.value;
    const pair = typeof tokenValue === "object" && tokenValue !== null && !Array.isArray(tokenValue) ? tokenValue : undefined;
    const claimValue = carrier.claim.mark.value;
    const contrary = contraryReading(claimValue);
    return {
        subject: pair !== undefined && "subject" in pair ? pair.subject : tokenValue,
        predicate: contrary === undefined ? claimValue : contrary.not,
        object: pair !== undefined && "object" in pair ? pair.object : tokenValue
    };
}
const valueCoincides = (left, right)=>webAddressValueIdentity(left, right);
function webAddressValueIdentity(left, right) {
    if (Object.is(left, right)) return true;
    if (typeof left !== typeof right) return false;
    if (left === null || right === null) return false;
    if (typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
        return left.every((entry, index)=>webAddressValueIdentity(entry, right[index]));
    }
    const leftRecord = left;
    const rightRecord = right;
    const leftKeys = Object.keys(leftRecord).sort();
    const rightKeys = Object.keys(rightRecord).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key, index)=>key === rightKeys[index] && webAddressValueIdentity(leftRecord[key], rightRecord[key]));
}
export function recallWhere(log, where) {
    return log.utterances.filter((carrier)=>{
        const values = cellValues(carrier);
        if ("subject" in where && !valueCoincides(values.subject, where.subject)) return false;
        if ("predicate" in where && !valueCoincides(values.predicate, where.predicate)) return false;
        if ("object" in where && !valueCoincides(values.object, where.object)) return false;
        return true;
    });
}
export function recallCell(log, cell) {
    return recallWhere(log, cell);
}
export function chargeAt(log, cell) {
    return chargeOfUtterances(recallCell(log, cell));
}
