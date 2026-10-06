/**
 * The process coordinator: one coordinated operation per data root at a time.
 * A lease file in the data root names the holding process; a live holder refuses
 * other processes, a dead holder's lease is reclaimed, and the lease ends when
 * the holding process exits. Operations that declare coordination-required run
 * only under it.
 */
import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";

function holderAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

// The lease belongs to the process, not to a coordinator: callers make a coordinator per clock tick
// or per attempt, and each must find the process's lease held rather than take it again (once
// re-taking it registered one more exit listener per tick).
const heldLeases = new Set();

/** A coordinate(invocation, operation, decidedAt) function over `dataRoot` for this process. */
export function processLeaseCoordinator(dataRoot, { pid = process.pid } = {}) {
  const leasePath = join(dataRoot, ".coordination.lease");
  const held = () => pid === process.pid && heldLeases.has(leasePath);
  const acquire = () => {
    mkdirSync(dataRoot, { recursive: true });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const fd = openSync(leasePath, "wx", 0o600);
        writeSync(fd, String(pid));
        closeSync(fd);
        if (pid === process.pid) {
          heldLeases.add(leasePath);
          process.once("exit", () => { try { unlinkSync(leasePath); } catch { /* already released */ } });
        }
        return null;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        const holder = Number(readFileSync(leasePath, "utf8"));
        if (Number.isSafeInteger(holder) && holder !== pid && holderAlive(holder)) return `data root is coordinated by process ${holder}`;
        unlinkSync(leasePath);
      }
    }
    return "data root lease could not be acquired";
  };
  return (invocation, operation, decidedAt) => {
    const refused = held() ? null : acquire();
    return Object.freeze({
      kind: refused ? "metroplat.rpc.coordination:obstruction" : "metroplat.rpc.coordination:witness",
      ok: !refused,
      invocation: invocation.id,
      operation: operation.ref,
      lease: leasePath,
      holder: pid,
      reasons: Object.freeze(refused ? [refused] : []),
      decidedAt,
    });
  };
}
