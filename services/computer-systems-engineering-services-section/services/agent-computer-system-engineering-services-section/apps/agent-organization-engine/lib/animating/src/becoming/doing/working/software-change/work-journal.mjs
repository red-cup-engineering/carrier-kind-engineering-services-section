import { open, readFile } from "node:fs/promises";
import { TellingLog, telling } from "@red-cup-engineering/signchain/log";

async function append(journalPath, row, mode) {
  const journal = await open(journalPath, mode);
  try {
    await journal.writeFile(JSON.stringify(row) + "\n");
    await journal.sync();
  } finally {
    await journal.close();
  }
}

/** An AOE work proposal is a durable SignChain telling before any source mutation. */
export async function proposeSoftwareWork(journalPath, work, proposal) {
  if (!journalPath) throw new TypeError("software work needs a journal path");
  const row = telling({ subject: work, predicate: "aoe.software.proposed", object: proposal }, 0);
  await append(journalPath, row, "wx");
  return new TellingLog([row]).rows;
}

/** A different work intent, missing proposal, or completed work cannot authorize a write. */
export async function readSoftwareWorkProposal(journalPath, work) {
  if (!journalPath) throw new TypeError("software work needs a journal path");
  const text = await readFile(journalPath, "utf8");
  const rows = new TellingLog(text.trimEnd().split("\n").map((line) => JSON.parse(line))).rows;
  if (rows.length !== 1 || (work !== undefined && rows[0].subject !== work) || rows[0].witness !== 0 ||
      rows[0].predicate !== "aoe.software.proposed" || rows[0].side !== "for") {
    throw new Error("journal does not admit this unfinished work");
  }
  return { work: rows[0].subject, proposal: rows[0].object, rows };
}

/** Append only what was read back from the carrier; an interrupted write stays unresolved. */
export async function concludeSoftwareWork(journalPath, work, status, observation) {
  if (status !== "applied" && status !== "observed") throw new TypeError("software work conclusion must be applied or observed");
  const { rows } = await readSoftwareWorkProposal(journalPath, work);
  const row = telling({ subject: work, predicate: `aoe.software.${status}`, object: observation }, rows.length);
  await append(journalPath, row, "a");
  return new TellingLog([...rows, row]).rows;
}
