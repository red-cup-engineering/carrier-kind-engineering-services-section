/**
 * The projection of the science section's carrier-kind schemas into this package: each
 * `<kind>.schema.json` of the source directory is copied, and one whose `$id` is not
 * `carriers/<kind>` is refused rather than published under a name it does not claim.
 * @packageDocumentation
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";

/**
 * @param {{source: string, destination: string}} directories the science section's
 *   `schemas/carriers` and this package's
 * @param {{list?: Function, read?: Function, write?: Function}} [operations]
 */
export async function projectCarrierKindSchemas({ source, destination }, operations = {}) {
  if (typeof source !== "string" || typeof destination !== "string") throw new TypeError("source and destination are required");
  const files = (operations.list ?? readdirSync)(source).filter((name) => name.endsWith(".schema.json")).sort();
  const projected = [];
  for (const file of files) {
    const text = (operations.read ?? readFileSync)(join(source, file), "utf8");
    const schema = JSON.parse(text);
    const kind = file.slice(0, -".schema.json".length);
    if (schema?.$id !== `carriers/${kind}`) throw new TypeError(`${file} claims $id ${JSON.stringify(schema?.$id)}, not carriers/${kind}`);
    projected.push({ file, kind, text });
  }
  for (const { file, text } of projected) await (operations.write ?? writeFileText)(join(destination, file), text);
  return Object.freeze({ source, destination, kinds: Object.freeze(projected.map(({ kind }) => kind)) });
}
