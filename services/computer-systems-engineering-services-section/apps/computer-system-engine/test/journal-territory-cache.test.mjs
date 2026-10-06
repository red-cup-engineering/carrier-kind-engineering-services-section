import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { journalDirectoryOf } from "@red-cup-engineering/semiotic-eavt-services-section/journal/store-root";
import { clearTerritoryEventsCache } from "@red-cup-engineering/computer-system-engine/journal/filesystem/territory-cache";

function tmpRoot(prefix) {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

function runChild(source, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "--input-type=module", "-e", source], {
      cwd: path.resolve(import.meta.dirname, ".."),
      env: { ...process.env, ...env },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("exit", (code, signal) => resolve({ code, signal, stderr }));
  });
}

test.beforeEach(() => {
  clearTerritoryEventsCache();
});

test("a causal subject scan reads only calendar and feed boundaries before its selected feed", () => {
  const root = tmpRoot("metroplat-subject-boundary-discovery-");
  const date = "2026-08-01";
  try {
    openJournal(root).appendRows("selected", [["entity:selected", "attribute", "selected", `${date}T00:00:00.000Z`]], { at: `${date}T00:00:00.000Z`, subject: "selected" });
    const unrelated = path.join(journalDirectoryOf(root), "2026", "08", "01", "unrelated-deep-artifacts");
    mkdirSync(unrelated, { recursive: true });
    for (let index = 0; index < 128; index += 1) writeFileSync(path.join(unrelated, `${index}.json`), "not a journal witness", "utf8");
    chmodSync(unrelated, 0o000);
    const scanned = journal.scanCausalSubject(root, "selected", date, [], (values, row) => { values.push(row[2]); return values; });
    assert.deepEqual(scanned.result, ["selected"]);
    assert.equal(scanned.feeds, 1);
  } finally {
    const unrelated = path.join(journalDirectoryOf(root), "2026", "08", "01", "unrelated-deep-artifacts");
    try { chmodSync(unrelated, 0o700); } catch {}
    rmSync(root, { recursive: true, force: true });
  }
});

test("a territory scan reuses parsed events across calls until the journal's own write invalidates it", () => {
  const root = tmpRoot("metroplat-territory-cache-live-");
  try {
    openJournal(root).appendRows("alpha", [["entity:a", "attribute", "value:a", "2026-08-01T00:00:00.000Z"]], {
      at: "2026-08-01T00:00:00.000Z",
      subject: "alpha",
    });

    const first = journal.scanCausalTerritory(root, [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(first.result, ["value:a"]);

    // A second scan with no intervening append must reuse the cached parsed
    // events rather than re-walking the territory: same result, same feed count.
    const second = journal.scanCausalTerritory(root, [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(second.result, ["value:a"]);
    assert.equal(second.feeds, first.feeds);

    // An append through the journal's own writer invalidates the cache for
    // this root; the very next scan in the same process must see the new event.
    openJournal(root).appendRows("beta", [["entity:b", "attribute", "value:b", "2026-08-01T01:00:00.000Z"]], {
      at: "2026-08-01T01:00:00.000Z",
      subject: "beta",
    });
    const third = journal.scanCausalTerritory(root, [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(new Set(third.result), new Set(["value:a", "value:b"]));
    assert.equal(third.feeds, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cached territory events do not leak across data roots", () => {
  const rootOne = tmpRoot("metroplat-territory-cache-root-one-");
  const rootTwo = tmpRoot("metroplat-territory-cache-root-two-");
  try {
    openJournal(rootOne).appendRows("alpha", [["entity:one", "attribute", "value:one", "2026-08-02T00:00:00.000Z"]], {
      at: "2026-08-02T00:00:00.000Z",
      subject: "alpha",
    });
    openJournal(rootTwo).appendRows("alpha", [["entity:two", "attribute", "value:two", "2026-08-02T00:00:00.000Z"]], {
      at: "2026-08-02T00:00:00.000Z",
      subject: "alpha",
    });

    const readOne = journal.scanTerritory(rootOne, [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    const readTwo = journal.scanTerritory(rootTwo, [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(readOne.result, ["value:one"]);
    assert.deepEqual(readTwo.result, ["value:two"]);

    // Re-reading root one after root two was scanned must still show only
    // root one's own row, proving the cache entries are keyed per root.
    const readOneAgain = journal.scanTerritory(rootOne, [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(readOneAgain.result, ["value:one"]);
  } finally {
    rmSync(rootOne, { recursive: true, force: true });
    rmSync(rootTwo, { recursive: true, force: true });
  }
});

test("admitting into one high-churn feed reuses unchanged verified witnesses", (context) => {
  // This is the production shape that motivated per-log (not per-territory)
  // caching: an RPC-evidence-style feed admits on nearly every call, while a
  // large, rarely-written feed sits alongside it under the same root. A
  // whole-scope invalidation-on-any-write would throw away the large feed's
  // parse every time the small feed is touched; a per-log one must not.
  const root = tmpRoot("metroplat-territory-cache-churn-");
  try {
    const bigRows = [];
    for (let i = 0; i < 300; i += 1) {
      bigRows.push([`entity:big:${i}`, "attribute", `value:big:${i}`, `2026-08-11T00:00:${String(i % 60).padStart(2, "0")}.000Z`]);
    }
    openJournal(root).appendRows("big", bigRows, { at: "2026-08-11T00:00:00.000Z", subject: "big" });
    openJournal(root).appendRows("churn", [["entity:churn:0", "attribute", "value:churn:0", "2026-08-11T00:00:00.000Z"]], {
      at: "2026-08-11T00:00:00.000Z",
      subject: "churn",
    });

    const cold = (() => {
      const t0 = process.hrtime.bigint();
      const result = journal.scanCausalTerritory(root, [], (values, row) => { values.push(row); return values; });
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      return { ms, rows: result.result.length };
    })();
    assert.equal(cold.rows, 301);

    const warmChurnMs = [];
    for (let i = 1; i <= 5; i += 1) {
      openJournal(root).appendRows("churn", [[`entity:churn:${i}`, "attribute", `value:churn:${i}`, "2026-08-11T00:00:00.000Z"]], {
        at: "2026-08-11T00:00:00.000Z",
        subject: "churn",
      });
      const t0 = process.hrtime.bigint();
      const result = journal.scanCausalTerritory(root, [], (values, row) => { values.push(row); return values; });
      warmChurnMs.push(Number(process.hrtime.bigint() - t0) / 1e6);
      assert.equal(result.result.length, 301 + i);
    }

    context.diagnostic(JSON.stringify({ initialScanMs: cold.ms, scansAfterAppendMs: warmChurnMs }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a date scan (scanCausalAll) reuses parsed events across repeated same-day callers until an append invalidates it", () => {
  // This is the exact shape readDutiesView/readAgentWorkDispatchReadout use:
  // several same-day reads (one per top session in an orientation readout)
  // that should share one parse rather than each re-walking the date.
  const root = tmpRoot("metroplat-date-cache-live-");
  try {
    openJournal(root).appendRows("alpha", [["entity:a", "attribute", "value:a", "2026-08-06T00:00:00.000Z"]], {
      at: "2026-08-06T00:00:00.000Z",
      subject: "alpha",
    });

    const first = journal.scanCausalAll(root, "2026-08-06", [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(first.result, ["value:a"]);

    const second = journal.scanCausalAll(root, "2026-08-06", [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(second.result, ["value:a"]);
    assert.equal(second.feeds, first.feeds);

    openJournal(root).appendRows("beta", [["entity:b", "attribute", "value:b", "2026-08-06T01:00:00.000Z"]], {
      at: "2026-08-06T01:00:00.000Z",
      subject: "beta",
    });
    const third = journal.scanCausalAll(root, "2026-08-06", [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(new Set(third.result), new Set(["value:a", "value:b"]));
    assert.equal(third.feeds, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("date scans for different dates under the same root are cached independently", () => {
  const root = tmpRoot("metroplat-date-cache-isolation-");
  try {
    openJournal(root).appendRows("alpha", [["entity:a", "attribute", "value:day-one", "2026-08-07T00:00:00.000Z"]], {
      at: "2026-08-07T00:00:00.000Z",
      subject: "alpha",
    });
    openJournal(root).appendRows("alpha", [["entity:a2", "attribute", "value:day-two", "2026-08-08T00:00:00.000Z"]], {
      at: "2026-08-08T00:00:00.000Z",
      subject: "alpha",
    });

    const dayOne = journal.scanCausalAll(root, "2026-08-07", [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    const dayTwo = journal.scanCausalAll(root, "2026-08-08", [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(dayOne.result, ["value:day-one"]);
    assert.deepEqual(dayTwo.result, ["value:day-two"]);

    const dayOneAgain = journal.scanCausalAll(root, "2026-08-07", [], (values, row) => {
      values.push(row[2]);
      return values;
    });
    assert.deepEqual(dayOneAgain.result, ["value:day-one"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test(
  "a cached territory scan does not return stale events once a separate process appends underneath it",
  { timeout: 30_000 },
  async () => {
    const root = tmpRoot("metroplat-territory-cache-external-");
    try {
      openJournal(root).appendRows("alpha", [["entity:a", "attribute", "value:a", "2026-08-03T00:00:00.000Z"]], {
        at: "2026-08-03T00:00:00.000Z",
        subject: "alpha",
      });

      // Warm this process's in-memory cache. Its own write-triggered
      // invalidation never fires for a write made by another process, so
      // this exercises the filesystem-signature check on its own.
      const warm = journal.scanCausalTerritory(root, [], (values, row) => {
        values.push(row[2]);
        return values;
      });
      assert.deepEqual(warm.result, ["value:a"]);

      const childSource = String.raw`
        import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
        openJournal(process.env.METROPLAT_TEST_ROOT).appendRows(
          "beta",
          [["entity:b", "attribute", "value:b", "2026-08-03T01:00:00.000Z"]],
          { at: "2026-08-03T01:00:00.000Z", subject: "beta" },
        );
      `;
      const outcome = await runChild(childSource, { METROPLAT_TEST_ROOT: root });
      assert.equal(outcome.code, 0, outcome.stderr);

      const after = journal.scanCausalTerritory(root, [], (values, row) => {
        values.push(row[2]);
        return values;
      });
      assert.deepEqual(new Set(after.result), new Set(["value:a", "value:b"]));
      assert.equal(after.feeds, 2);

      // A second external append to the SAME feed (no new dated log
      // directory this time) only changes files deep under the existing
      // feed's own received directory — it must still be caught by the
      // shared admission-index signature, not by the day-directory signature.
      const secondChildSource = String.raw`
        import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
        openJournal(process.env.METROPLAT_TEST_ROOT).appendRows(
          "beta",
          [["entity:b2", "attribute", "value:b2", "2026-08-03T01:00:01.000Z"]],
          { at: "2026-08-03T01:00:00.000Z", subject: "beta" },
        );
      `;
      const secondOutcome = await runChild(secondChildSource, { METROPLAT_TEST_ROOT: root });
      assert.equal(secondOutcome.code, 0, secondOutcome.stderr);

      const afterSecond = journal.scanCausalTerritory(root, [], (values, row) => {
        values.push(row[2]);
        return values;
      });
      assert.deepEqual(new Set(afterSecond.result), new Set(["value:a", "value:b", "value:b2"]));
      assert.equal(afterSecond.feeds, 2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);
