/**
 * QwzSpace — a 3D real-time graphics web engine derived from the meme
 * substrate. The server-side authoritative half: a developer imports this to
 * build their game's or rich-web-app's server.
 *
 * Conceptual upstream apex: meme-algebra → meme-topology → meme-geometry. The
 * engine adds three downstream realizations and the transport glue:
 *
 *   - icosahedral — space as a genuine ℤ⁶→ℝ³ cut-and-project quasicrystal.
 *   - existence   — visibility as a four-valued bilattice charge; the five
 *                   deaths as policy over it (paraconsistent undeath = ⊤).
 *   - scene       — the kernel: bodies on the quasicrystal, settled per tick.
 *   - time        — the causal order of the scene's settling (temporal geometry).
 *   - tier        — webgl → canvas2d → text, as coarser readings of one section.
 *   - server      — mounting the scene on the web-qwzspace realtime transport.
 *
 * `protocol` is the wire contract the visual/UX agent codes against.
 */

export * from "./icosahedral.mjs";
export * from "./existence.mjs";
export * from "./protocol.mjs";
export * from "./scene.mjs";
export * from "./time.mjs";
export * from "./tier.mjs";
export * from "./server.mjs";
