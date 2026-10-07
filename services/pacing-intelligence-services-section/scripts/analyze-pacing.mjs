#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { analyzePacing } from "../src/pacing-intelligence.mjs";

/**
 * Reads a JSON file of biometric observations and prints analyzePacing()'s
 * result as JSON to stdout -- the only I/O boundary in this package. The
 * input file is `{ observations: [...], windowDays?: number, metricIds?:
 * object }`; `windowDays` and `metricIds` may also be given as top-level
 * fields of that same object and are passed through unchanged.
 *
 * @param {string} filePath - path to a JSON file shaped `{ observations, windowDays?, metricIds? }`
 * @returns {Promise<object>} the analyzePacing() result
 * @throws {Error} if the file cannot be read or does not parse as JSON
 */
export async function analyzePacingFile(filePath) {
  const raw = await readFile(filePath, "utf8");
  const input = JSON.parse(raw);
  const { observations, ...options } = input;
  return analyzePacing(observations, options);
}

if (import.meta.main) {
  const filePath = process.argv[2];
  if (!filePath) {
    process.stderr.write("usage: node scripts/analyze-pacing.mjs <observations.json>\n");
    process.exitCode = 1;
  } else {
    try {
      const result = await analyzePacingFile(filePath);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`analyze-pacing: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  }
}
