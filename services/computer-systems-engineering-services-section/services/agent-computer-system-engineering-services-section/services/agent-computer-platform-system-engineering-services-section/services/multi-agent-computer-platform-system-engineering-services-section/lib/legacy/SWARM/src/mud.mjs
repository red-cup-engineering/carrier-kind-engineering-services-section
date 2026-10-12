// mud — the swarmWorld CARRIER. It lets wheatstone (or any MUD client speaking the world
// interface) "talk to the agents": a player's line is routed to a swarm agent, the agent's prose
// reply comes back as an output line, and the agent's SETTLED STATE rides up a structured GMCP
// audit channel. It is built ON TOP OF wheatstone's `localWorld` — swarmWorld IS a localWorld whose
// onSend wires to the swarm's message() orchestration — so it is a drop-in for telnetWorld: same
// { kind, connect, send, onLine, onGMCP, onMSDP, onPrompt, onStatus, close, supports } shape.
//
// THE LAW this carrier upholds (the computer is paraconsistent + append-only):
//   - HOLD ⊤. A contested cell (value [1,1], glyph ⊤) is a held value. It is NEVER collapsed,
//     averaged, overwritten, or "repaired" here. It surfaces its CALM face on the line and stays
//     RECOVERABLE in the gmcp audit payload (the contested[] list, with its charge intact).
//   - CALM by default, AUDIT on demand. The onLine prose stays calm — a ⊤ is never flaunted in the
//     human-readable reply. The contradiction rides the gmcp audit channel, available, never loud.
//   - Never hallucinate a ⊥. An undetermined standing stays ⊥ and is surfaced as a NAMED gap
//     (standing.gap / charges that aggregate to BOTTOM), never invented as a t or f.
//   - Evidence is linear. We read charges; we do not drop, re-roll, or destructively rewrite a
//     witness. The audit payload carries the charge as given ([pos,neg] over its evidence carrier).
//
// INJECTION (no import cycle): swarmWorld does NOT import ../index.mjs. The swarm's message()
// orchestration entrypoint is passed in by the caller as opts.message — the bin/test/TUI that owns
// the swarm hands it down. This keeps the carrier a leaf: it depends on wheatstone, not on the
// barrel that re-exports it indirectly.

import { localWorld } from "@561-group/wheatstone/world";

// THE PROJECTION SPLIT (refounding plan P7 :164): deriveState / normalizeFiber / chargeGlyph — the
// swarm-owned message()-result → carrier-faces projection — moved OUT into ./synthetic-world.mjs so the
// proving ground and the carrier share ONE projection. This file stays the canonical wheatstone
// localWorld CARRIER (swarmWorld below, unchanged). We re-export deriveState so the barrel
// (src/index.mjs) and every existing caller (tests, office actions) keep their import path intact.
import { deriveState } from "./synthetic-world.mjs";

export { deriveState };

// swarmWorld(opts) — the carrier. Returns a world matching wheatstone's localWorld contract EXACTLY.
//   opts.message   REQUIRED — the swarm message(agentName, prompt, options) orchestration, INJECTED
//                  by the caller to avoid an import cycle. Must resolve to { reply, agent, trace, ... }.
//   opts.agent     the agent name to route player lines to (default "swarm").
//   opts.options   options forwarded to message() (root, env, fetch, etc.).
//   opts.gmcpPackage  the GMCP package name for the audit payload (default "Swarm.Agent").
//   opts.kind      carrier kind label (default "swarm").
//   opts.onError   optional (err, emit) hook; default emits a calm error line and never throws up.
// Everything else (connect/onLine/onGMCP/onStatus/close/supports) is localWorld's, unchanged.
export function swarmWorld(opts = {}) {
  const message = opts.message;
  if (typeof message !== "function") {
    throw new TypeError("swarmWorld: opts.message (the injected swarm message() function) is required");
  }
  const agentName = opts.agent ?? "swarm";
  const messageOptions = opts.options ?? {};
  const gmcpPackage = opts.gmcpPackage ?? "Swarm.Agent";
  const kind = opts.kind ?? "swarm";

  async function onSend(text, emit) {
    const line = String(text ?? "");
    if (!line.trim()) return;
    try {
      const result = await message(agentName, line, messageOptions);
      const { line: prose, gmcp } = deriveState(result, { agentName });
      // CALM: the human-readable reply first. It never carries the ⊤ glyph.
      emit.line(prose);
      // AUDIT: the structured state — including any HELD ⊤ — rides the gmcp channel, on demand.
      emit.gmcp(gmcpPackage, gmcp);
    } catch (error) {
      if (typeof opts.onError === "function") {
        opts.onError(error, emit);
        return;
      }
      // A failure is surfaced calmly on the line and as a named gap in the audit channel — we do
      // not invent a reply and we do not throw the carrier down.
      emit.line(`(the swarm could not answer: ${error?.message ?? String(error)})`);
      emit.gmcp(gmcpPackage, { agent: agentName, error: error?.message ?? String(error) });
    }
  }

  return localWorld({
    kind,
    onConnect: opts.onConnect,
    onSend,
    onClose: opts.onClose,
  });
}
