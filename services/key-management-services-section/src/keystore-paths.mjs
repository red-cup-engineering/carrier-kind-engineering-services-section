import { basename, join } from "node:path";

const EXTENSION_BY_CHAIN = Object.freeze({ base: "json", ethereum: "json" });
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

/**
 * The file extension a chain's key material is written under: `json` for an Ethereum keystore
 * v3 document (base, ethereum). Hive keys live in the Hive keystore (src/hive-keystore.mjs).
 * @param {string} chain
 * @returns {"json"}
 * @throws {TypeError} When the chain is not one this section custodies.
 */
export function extensionForChain(chain) {
  const extension = EXTENSION_BY_CHAIN[chain];
  if (!extension) throw new TypeError(`keystore-paths: chain ${chain} is not supported`);
  return extension;
}

/**
 * The org's canonical config root for house key material: `~/.config/561-group`, matching the
 * convention `~/.config/561-group/ops-mcp-client.env` already uses. Never `.env*` and never a
 * path inside the git checkout.
 * @param {{home?: string}} [input]
 * @returns {string}
 */
export function configRoot({ home = process.env.HOME } = {}) {
  if (!home) throw new TypeError("keystore-paths: HOME is not set");
  return join(home, ".config", "561-group");
}

/**
 * The primary key-file path for one wallet: `<configRoot>/keys/<chain>/<id>.<extension>`.
 * @param {{configRoot: string, chain: string, id: string}} input
 * @returns {string}
 * @throws {TypeError} When id is not lowercase kebab-case.
 */
export function keyPath({ configRoot: root, chain, id }) {
  if (!ID_PATTERN.test(id)) throw new TypeError(`keystore-paths: wallet id ${id} must be lowercase kebab-case`);
  return join(root, "keys", chain, `${id}.${extensionForChain(chain)}`);
}

/**
 * The backup key-file path for one wallet, under a separately named backup root:
 * `<backupRoot>/keys/<chain>/<id>.<extension>`.
 * @param {{backupRoot: string, chain: string, id: string}} input
 * @returns {string}
 * @throws {TypeError} When id is not lowercase kebab-case.
 */
export function backupKeyPath({ backupRoot, chain, id }) {
  return keyPath({ configRoot: backupRoot, chain, id });
}

/**
 * Re-roots a known primary key-file path under a backup root, preserving chain and filename.
 * Used when only the registry row's `custody.locator` (not the operator's original filesystem
 * `id`) is known -- a registry row carries no id, only `{chain, address}`.
 * @param {{backupRoot: string, chain: string, locator: string}} input
 * @returns {string}
 */
export function backupKeyPathForLocator({ backupRoot, chain, locator }) {
  return join(backupRoot, "keys", chain, basename(locator));
}

/**
 * The metadata sidecar path for one wallet, beside its primary key file:
 * `<configRoot>/keys/<chain>/<id>.meta.json`. Carries owner/role/relations/createdAt -- never
 * key material.
 * @param {{configRoot: string, chain: string, id: string}} input
 * @returns {string}
 * @throws {TypeError} When id is not lowercase kebab-case.
 */
export function metaPath({ configRoot: root, chain, id }) {
  if (!ID_PATTERN.test(id)) throw new TypeError(`keystore-paths: wallet id ${id} must be lowercase kebab-case`);
  return join(root, "keys", chain, `${id}.meta.json`);
}
