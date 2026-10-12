// Shared argument-vector command declaration for the SignCraft inference scripts:
// read one JSON request (a file argument, else standard input), execute it, and answer
// {"ok":true,"result":...} (exit 0) or {"ok":false,"refusal":{code,message}} (exit 1).
// A declaration, not a process: javascript-node's runJavascriptNodeOperationModule runs it.

import { readFileSync } from "node:fs";

async function readAll(stdin) {
  const decoder = new TextDecoder("utf-8");
  let raw = "";
  for await (const chunk of stdin) raw += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
  return raw + decoder.decode();
}

/**
 * @param {{help: string, errorCode: string, execute: (input: unknown, parsed: {path?: string}) => unknown, parseArgs?: (argv: string[]) => {path?: string}}} spec
 * @returns {{run: Function, formatResult: Function, resultExitCode: Function}} a `command` declaration
 */
export function jsonCommand({ help, errorCode, execute, parseArgs = (argv) => ({ path: argv.find((a) => !a.startsWith("-")) }) }) {
  return Object.freeze({
    async run({ argv, stdin }) {
      if (argv.includes("--help") || argv.includes("-h")) return { text: help, exitCode: 0 };
      try {
        const parsed = parseArgs(argv);
        const raw = parsed.path ? readFileSync(parsed.path, "utf8") : await readAll(stdin);
        return { text: `${JSON.stringify({ ok: true, result: execute(JSON.parse(raw), parsed) })}\n`, exitCode: 0 };
      } catch (error) {
        const refusal = { code: error.code ?? errorCode, message: error instanceof Error ? error.message : String(error) };
        return { text: `${JSON.stringify({ ok: false, refusal })}\n`, exitCode: 1 };
      }
    },
    formatResult: (result) => result.text,
    resultExitCode: (result) => result.exitCode,
  });
}
