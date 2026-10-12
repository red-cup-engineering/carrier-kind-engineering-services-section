import { join } from "node:path";

import { address } from "@561-group/computer/typed-filepath-addressing-system/addressing";
import read from "@561-group/computer/typed-term-memory-system/reading";
import write from "@561-group/computer/typed-term-memory-system/writing";

// the term's EAVT log path: TFAS addressing pinned to the jsonl/EAVT type (formerly TTMS's logPath).
const logPath = (root, term) => address(root, term, "jsonl");

function replyFromUtterance(utterance) {
  return utterance?.[1]?.const ?? "";
}

export function memoryRootOf(root) {
  return join(root, "memory");
}

export function recordMessage(root, agent, prompt, utterance, trace) {
  const memoryRoot = memoryRootOf(root);
  const id = utterance?.[0]?.id ?? trace?.id;
  if (!id) throw new Error("Cannot record message without an utterance or trace id.");
  const term = `agents/${agent.name}/messages/${id}`;
  const t = trace?.witness ?? trace?.id ?? id;
  const doc = {
    kind: "swarm.message",
    agent: agent.name,
    provider: agent.provider,
    model: agent.model,
    prompt,
    reply: replyFromUtterance(utterance),
    utterance,
    trace: {
      articulated: !!trace?.articulated,
      predicated: !!trace?.predicated,
      settled: !!trace?.settled,
      witnessed: true,
    },
  };
  const written = write(memoryRoot, term, doc, { t });
  return {
    root: memoryRoot,
    term,
    log: logPath(memoryRoot, term),
    count: written.count,
    read: read(memoryRoot, term),
  };
}
