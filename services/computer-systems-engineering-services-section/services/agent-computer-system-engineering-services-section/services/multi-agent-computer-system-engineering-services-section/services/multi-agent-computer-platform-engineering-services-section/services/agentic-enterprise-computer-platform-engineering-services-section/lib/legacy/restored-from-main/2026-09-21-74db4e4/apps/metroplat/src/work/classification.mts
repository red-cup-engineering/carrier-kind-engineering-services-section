import {
  classifyWork,
  type WorkDetermination,
  type WorkKind,
} from "@lenticule-science/work-science-services-section";
import { conflicts, type Session } from "../claims/session.mts";

export type WorkNuclei = WorkDetermination;
export type WorkType = WorkKind;

export function workType(determination: WorkNuclei): WorkType {
  return classifyWork(determination);
}

export type TransportKind = "request-response" | "event-stream" | "claim-session" | "open-session";

export const TRANSPORT_WORK: Readonly<Record<TransportKind, WorkNuclei>> = {
  "request-response": { operation: "open", inputsAndPath: "settled" },
  "event-stream": { operation: "settled", inputsAndPath: "settled" },
  "claim-session": { operation: "settled", inputsAndPath: "open" },
  "open-session": { operation: "open", inputsAndPath: "open" },
};

export function sessionWork(session: Session): WorkNuclei {
  return { operation: "settled", inputsAndPath: conflicts(session).length === 0 ? "settled" : "open" };
}
