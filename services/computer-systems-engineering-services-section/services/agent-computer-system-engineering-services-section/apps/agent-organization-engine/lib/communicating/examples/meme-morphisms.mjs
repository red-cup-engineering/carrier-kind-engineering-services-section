/** Demonstrate the closed meme-operation surface. */
import {
  communicateAction,
  negateAction,
  semioseAction,
  illocuteAction,
  quoteAction,
  referAction,
  presupposeAction,
  composeAction,
  modalizeAction,
  translateAction,
} from "@red-cup-engineering/communicating";
import { memeCarrier } from "@red-cup-engineering/relating";
import { cell } from "@red-cup-engineering/signcell/cell";

const value = cell("Alice", "predicate:says", "hello", { for: ["w"] });

const results = [
  communicateAction.execute(value, {}),
  negateAction.execute(value, {}),
  semioseAction.execute(value, {}),
  illocuteAction.execute({ meme: value, force: "assertive" }, {}),
  quoteAction.execute({ meme: value, position: "subject" }, {}),
  referAction.execute({ meme: value, entity: "alice", position: "subject" }, {}),
  presupposeAction.execute({ meme: value, trigger: "factive" }, {}),
  composeAction.execute({ meme: value, with: value }, {}),
  modalizeAction.execute({ meme: value, mode: "evidential", witness: "source" }, {}),
  translateAction.execute({ meme: value, target: "french-discourse" }, {}),
];

if (!results.every((result) => memeCarrier.validate(result))) {
  throw new Error("communicating example: an operation escaped the meme carrier");
}
console.log(`all ${results.length} demonstrated operations return admitted memes`);
