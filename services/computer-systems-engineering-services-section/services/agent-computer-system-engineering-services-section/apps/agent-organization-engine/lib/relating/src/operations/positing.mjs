/**
 * apps/infograph/operations/positing — the reading-algebra operation family: relating's conflation
 * of a reading, exposed as a FeltOS operation.
 */
import { actions } from "@red-cup-engineering/relating/actions";
import { operationAs } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const adopt = (verb, as) => operationAs(actions.find((action) => action.verb === verb), as);

export const conflateReadingOperation = adopt("conflate-reading");

export const positingOperations = Object.freeze([conflateReadingOperation]);
