/**
 * spine — the agency descent's readings on the Obsmetrologia spine. Each reading is one
 * spine stage (articulating, predicating, positing, settling) and its work lives in that
 * stage's closure regime (`Stage.regime`): a reading states its stage, and its regime is
 * read off it.
 */
import { closureRegimeName, regimeOfStage } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";

/** A descent reading's spine coordinates: its stage and the regime that stage's work lives in. */
export const spineCoordinates = (stage) => ({ regime: closureRegimeName(regimeOfStage(stage)), stage });

/** The carrier properties fixing a descent reading at a spine stage. */
export function spineProperties(stage) {
  const { regime } = spineCoordinates(stage);
  return { regime: { const: regime }, stage: { const: stage } };
}
