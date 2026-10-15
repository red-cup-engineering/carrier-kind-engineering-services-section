// Runs a SignCraft inference declaration (scripts/inference/*.mjs) in-process over captured
// streams through javascript-node's runJavascriptNodeOperationModule -- no child process.
import { Readable, Writable } from "node:stream";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runJavascriptNodeOperationModule } from "@red-cup-engineering/javascript-node-operation-engineering-services-section/operation";

const HERE = dirname(fileURLToPath(import.meta.url));

export const declarationPath = (name) => join(HERE, "..", "..", "scripts", "inference", `${name}.mjs`);

function capture() {
  const chunks = [];
  const stream = new Writable({ write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
  return { stream, text: () => Buffer.concat(chunks).toString("utf8") };
}

/** @returns {Promise<{status: number, stdout: string, stderr: string}>} */
export async function runCommand(name, args = [], { input = "" } = {}) {
  const out = capture();
  const err = capture();
  const module = await import(declarationPath(name));
  const result = await runJavascriptNodeOperationModule(module, {
    arguments: args,
    standardInput: Readable.from(input === "" ? [] : [input]),
    standardOutput: out.stream,
    standardError: err.stream,
  });
  return { status: result.exitCode, stdout: out.text(), stderr: err.text() };
}
