#!/usr/bin/env node
import { admitWorkDocument } from "../src/admit-work-document.mjs";

export const admitWorkDocumentScript = (document) => admitWorkDocument(document);

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

if (import.meta.main) {
  try {
    process.stdout.write(admitWorkDocumentScript(await readStdin()));
  } catch (error) {
    process.stderr.write(`admit-work-document: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
