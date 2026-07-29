import { fileURLToPath } from "node:url";

import { canonical, parseJson, requireJsonValue } from "@emsenn/relating/writing";

import { repoRootFromModule } from "./runtime.mts";

export { isMainModule } from "./runtime.mts";

export type JsonStdioMorphism = (repoRoot: string, params: Readonly<Record<string, unknown>>) => unknown | Promise<unknown>;

export async function runJsonStdioScript(
  metaUrl: string,
  operation: string,
  resultName: string,
  morphism: JsonStdioMorphism,
): Promise<void> {
  try {
    const repoRoot = repoRootFromModule(metaUrl);
    const result = await morphism(repoRoot, paramsFromStdin(await readStdin(), operation));
    process.stdout.write(canonical(jsonResource(result, resultName)) + "\n");
  } catch (error) {
    process.stderr.write(`${operation}: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function paramsFromStdin(text: string, operation: string): Readonly<Record<string, unknown>> {
  const trimmed = text.trim();
  if (trimmed === "") return Object.freeze({});
  if (!trimmed.startsWith("{")) return Object.freeze({ __stdin: text, q: text });
  const parsed = parseJson(trimmed);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError(`${operation}: stdin JSON must be an object`);
  }
  return Object.freeze(parsed as Record<string, unknown>);
}

function jsonResource(value: unknown, name: string) {
  return requireJsonValue(JSON.parse(JSON.stringify(value)), name);
}
