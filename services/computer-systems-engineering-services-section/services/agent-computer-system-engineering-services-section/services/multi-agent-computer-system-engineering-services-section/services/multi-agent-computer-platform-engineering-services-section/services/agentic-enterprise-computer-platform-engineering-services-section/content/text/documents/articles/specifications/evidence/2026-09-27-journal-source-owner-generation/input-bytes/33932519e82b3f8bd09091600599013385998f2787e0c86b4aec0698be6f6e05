/** The JSON-lines projector: recognizes content whose nonblank lines each
 *  parse as JSON, reads each line as an independent carried value, writes one
 *  canonical line per item. The EAVT row projector restricts it. */
import { define } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { parseLines } from "./parse-jsonl.mjs";
import { serializeLines } from "./serialize-jsonl.mjs";

export const jsonlProjector = define({
  type: "jsonl",
  corner: "data",
  rung: "identity",
  recognize: (resource) => {
    try {
      parseLines(resource.content);
      return true;
    } catch {
      return false;
    }
  },
  read: (resource) => parseLines(resource.content),
  write: (items) => serializeLines(items),
});
