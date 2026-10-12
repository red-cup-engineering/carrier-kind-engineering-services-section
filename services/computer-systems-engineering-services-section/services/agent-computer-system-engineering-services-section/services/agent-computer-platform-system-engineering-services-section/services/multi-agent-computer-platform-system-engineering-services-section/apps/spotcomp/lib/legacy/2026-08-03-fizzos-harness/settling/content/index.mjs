/**
 * Canonical address anchor for the settling/library/ catalog root.
 * The catalog root IS this file's directory — derived from this file's own
 * position in the morphism web (import.meta.url), not by counting levels.
 */
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

export const catalogRoot = dirname(fileURLToPath(import.meta.url));
