/**
 * block-node-crypto-loader.mjs — a Node module-customization-hook that makes 'node:crypto'
 * (and its bare-specifier alias 'crypto') fail to resolve, with the same class of error a
 * real browser throws when a bundled/ESM module graph tries to reach a Node builtin: e.g.
 * Chromium's "Access to script at 'node:crypto' blocked". This is not a mock of the browser
 * DOM or a bundler — it is the narrowest true statement a Node process can make about a
 * module graph: "this specifier does not resolve here." A graph that survives this hook
 * survives being loaded somewhere node:crypto isn't visible, which is what shipping to a
 * browser actually requires.
 *
 * Used by replay.browser-import.test.mts via node:module's `register()` API to prove (a)
 * before the fix, importing replay.mjs's module graph fails under this hook, and (b) after
 * the fix, it doesn't.
 */
export function resolve(specifier, context, nextResolve) {
  if (specifier === 'node:crypto' || specifier === 'crypto') {
    throw new Error(
      `Access to script at '${specifier}' blocked (browser-realistic loader simulation: no node:crypto here)`,
    );
  }
  return nextResolve(specifier, context);
}
