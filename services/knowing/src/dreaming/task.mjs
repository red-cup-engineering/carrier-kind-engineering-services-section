// task.mts — a task is a cell (subject -predicate-> object) the knower holds, the
// unit dreaming recombines. Relating-only: a task is articulated relating data.


import { articulate, cell, claimValue, isUtterance, tokenValue, utterance } from "@red-cup-engineering/signcell/cell";

/** A task: the cell `subject -predicate-> object` a knower holds, carried with its
 *  articulating utterance — the unit dreaming observes and recombines. */

export function taskCell(taskCarrier) {
  return taskCarrier.cell;
}

export function task(input

) {
  if (isUtterance(input)) {
    const subject = tokenValue(input);
    const predicate = claimValue(input);
    return taskFromCell(input, cell(subject, predicate, subject));
  }
  if (isCellCarrier(input)) {
    return taskFromCell(undefined, input);
  }
  return taskFromCell(undefined, cell(input.subject, input.predicate, input.object ?? input.subject));
}

function taskFromCell(utteranceCarrier, taskCarrier) {
  const carrier = utteranceCarrier ?? utterance(taskCarrier.subject, taskCarrier.predicate);
  return Object.freeze({
    kind: "knowing.task",
    utterance: carrier,
    articulation: articulate(tokenValue(carrier), claimValue(carrier)),
    subject: taskCarrier.subject,
    predicate: taskCarrier.predicate,
    object: taskCarrier.object,
    cell: taskCarrier,
  });
}

function isCellCarrier(value) {
  return "subject" in value && "predicate" in value && "object" in value;
}
