/** Explicit offline receiving through the existing bounded Python reader; never a server import. */
import { readLegacySqlite } from "@red-cup-engineering/historical-sql-reader-service";
import { withHistoricalSnapshot } from "./custody.mjs";

const BATCH = 500;
const text = (value) => typeof value === "string";
const key = (value) => text(value) && !value.includes("\u0000");

function validateRows(legacy) {
  if (!["body", "body_text", "occurrence", "cursor"].every((table) => legacy.has(table))) throw new Error("Historical revision index lacks its required custody tables");
  for (const row of legacy.rows("body")) {
    if (!key(row.id) || !text(row.title) || !Number.isSafeInteger(row.bytes) || row.bytes < 0 || !text(row["body_text.text"])) throw new Error("Historical revision index has an invalid body row");
  }
  for (const row of legacy.rows("occurrence")) {
    if (![row.id, row.source, row.path, row.revision].every(key) || !(row.at === null || text(row.at)) || ![0, 1].includes(row.deleted)) throw new Error("Historical revision index has an invalid occurrence row");
  }
  for (const row of legacy.rows("cursor")) {
    if (!key(row.source) || !key(row.tip) || row.tip.includes("\n")) throw new Error("Historical revision index has an invalid cursor row");
  }
}

/**
 * Receive into an explicitly selected, distinct journal. The original stays unchanged.
 * The reader exits cleanly before rows can be staged. A completed receipt is written last.
 * Flushed batches survive interruption; retry keeps existing bodies/occurrences once.
 */
export function importSqlRevisionIndex(file, store, { expectedSha256, python } = {}) {
  if (store.admission !== null && store.admission !== undefined && store.admission.sourceSha256 !== expectedSha256) throw new Error("Historical destination already holds another admission");
  const specs = [
    { table: "body", required: true, requiredColumns: ["id", "title", "bytes"], join: { table: "body_text", on: "id", columns: ["text"] } },
    { table: "occurrence", required: true, requiredColumns: ["id", "source", "path", "revision", "at", "deleted"] },
    { table: "cursor", required: true, requiredColumns: ["source", "tip"] },
  ];
  return withHistoricalSnapshot(file, store.root, expectedSha256, (snapshot, verify) =>
    readLegacySqlite(snapshot, specs, (legacy) => {
      validateRows(legacy);
      verify();
      let bodies = 0, occurrences = 0, staged = 0;
      const step = () => { if (++staged % BATCH === 0) store.flush(); };
      try {
        for (const row of legacy.rows("body")) {
          if (store.admitBody(row.id, row.title, row.bytes, row["body_text.text"])) bodies += 1;
          step();
        }
        for (const row of legacy.rows("occurrence")) {
          store.occur(row.id, row.source, row.path, row.revision, row.at, row.deleted === 1);
          occurrences += 1;
          step();
        }
        const tips = new Map();
        for (const row of legacy.rows("cursor")) {
          if (tips.has(row.source)) tips.get(row.source).push(row.tip); else tips.set(row.source, [row.tip]);
        }
        for (const [source, held] of tips) store.setCursor(source, held);
        store.flush();
        verify();
        const receipt = Object.freeze({ from: file, sourceSha256: expectedSha256, bodies, occurrences, sources: tips.size });
        store.recordAdmission(receipt);
        return receipt;
      } catch (error) {
        store.discard();
        throw error;
      }
    }, { python }));
}
