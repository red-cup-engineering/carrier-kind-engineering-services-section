import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { eavtRow } from "./admit-row.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({ type: "object", required: ["row"] });
export const outputSchema = Object.freeze({
  type: "object",
  required: ["identity"],
});
/** A row's identity is its semiotic content address. */
export function identifyContentAddressedRow({ row } = {}) {
  return { identity: semanticId(eavtRow(row)) };
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(identifyContentAddressedRow(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
