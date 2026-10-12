import {
  classifyWork,

} from "@red-cup-engineering/animating/becoming/doing/working/governing/work-classification";
import { conflicts } from "@red-cup-engineering/relating/running/session";

export function workType(determination) {
  return classifyWork(determination);
}

export const TRANSPORT_WORK = {
  "request-response": { operation: "open", inputsAndPath: "settled" },
  "event-stream": { operation: "settled", inputsAndPath: "settled" },
  "claim-session": { operation: "settled", inputsAndPath: "open" },
  "open-session": { operation: "open", inputsAndPath: "open" },
};

export function sessionWork(session) {
  return { operation: "settled", inputsAndPath: conflicts(session).length === 0 ? "settled" : "open" };
}
