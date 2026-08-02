import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// A registry graph is one chart in the firm's atlas, and its tiers are
// independent dimensions that must not collapse into a single edge set:
// dependency pins, actor/ownership declarations, snapshot lineage, and
// build witness each keep their own namespace. A node's address keeps
// two legs — the package surface (name@version) and the content-addressable
// integrity digest — as separate coordinates, never merged.
const GRAPH_TYPE = "NpmRegistryGraph";
const RECEIPT_TYPE = "SemioticVoxelPackageRegistryReceipt";
const DEPENDENCY_RELATIONS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

function packageSurface(name, version) {
  return `${name}@${version}`;
}

function packageScope(name) {
  const match = /^@([^/]+)\//.exec(name);
  return match ? match[1] : null;
}

function registryFace(registryUrl) {
  const url = new URL(registryUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("registry URL must be HTTP(S)");
  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

// Two sources, one law: a registry is read either from its on-disk directory
// or over the normal npm registry HTTP protocol — GET /{encodeURIComponent(name)}
// for packuments, single percent-encoding, whole packument then versions looked
// up locally (the same protocol install-consumer-dependency-closure speaks).
function diskRegistrySource(registryRoot) {
  const root = resolve(registryRoot);
  return {
    async receiptBytes() {
      return readFile(join(root, "registry-receipt.json"));
    },
    async metadataBytes(name) {
      return readFile(join(root, "metadata", `${encodeURIComponent(name)}.json`));
    },
  };
}

function liveRegistrySource(registryUrl, fetchImplementation) {
  const face = registryFace(registryUrl);
  return {
    async receiptBytes() {
      const response = await fetchImplementation(new URL("registry-receipt.json", face));
      if (!response.ok) throw new Error(`registry face does not publish registry-receipt.json: HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    },
    async metadataBytes(name) {
      const response = await fetchImplementation(new URL(encodeURIComponent(name), face));
      if (!response.ok) throw new Error(`registry face has no packument for ${name}: HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    },
  };
}

async function readMetadata(name, source, metadataCache) {
  let metadataBytes = metadataCache.get(name);
  if (metadataBytes === undefined) {
    metadataBytes = await source.metadataBytes(name);
    metadataCache.set(name, metadataBytes);
  }
  return { metadataBytes, metadata: JSON.parse(metadataBytes.toString("utf8")) };
}

async function readVersionManifest(entry, source, metadataCache) {
  const { metadataBytes, metadata } = await readMetadata(entry.name, source, metadataCache);
  const manifest = metadata.versions?.[entry.version];
  if (metadata.name !== entry.name || manifest?.name !== entry.name || manifest?.version !== entry.version) {
    throw new Error(`package metadata identity does not match the requested package: ${entry.name}@${entry.version}`);
  }
  const checkArtifact = entry.integrity != null || entry.shasum != null;
  if (checkArtifact && (manifest.dist?.integrity !== entry.integrity || manifest.dist?.shasum !== entry.shasum)) {
    throw new Error(`package metadata artifact does not match registry receipt: ${entry.name}@${entry.version}`);
  }
  return { manifest, metadataSha256: `sha256:${createHash("sha256").update(metadataBytes).digest("hex")}` };
}

// "name" or "name@1.2.3" or {name, version} — scoped names keep their leading @.
function requestedPackage(value) {
  if (typeof value === "object" && value !== null) return { name: value.name, version: value.version };
  const text = String(value);
  const at = text.lastIndexOf("@");
  if (at > 0) return { name: text.slice(0, at), version: text.slice(at + 1) };
  return { name: text, version: undefined };
}

// Works over any npm registry. With no package list, the registry must be one
// of ours: the package set and internal scopes come from its build receipt
// (registry-receipt.json). With an explicit `packages` list (names, name@version,
// or {name, version}), any registry works — versions default to dist-tags.latest,
// and `internalScopes` says which scopes must resolve inside the graph.
export async function deriveRegistryGraph({ registryRoot, registryUrl, packages, internalScopes, fetchImplementation = fetch } = {}) {
  if ((registryRoot === undefined) === (registryUrl === undefined)) {
    throw new TypeError("supply exactly one of registryRoot (directory) or registryUrl (HTTP face)");
  }
  const source = registryUrl === undefined ? diskRegistrySource(registryRoot) : liveRegistrySource(registryUrl, fetchImplementation);
  const metadataCache = new Map();

  let receipt = null;
  let receiptSha256 = null;
  let entries;
  if (packages === undefined) {
    const receiptBytes = await source.receiptBytes();
    receipt = JSON.parse(receiptBytes.toString("utf8"));
    if (receipt?.type !== RECEIPT_TYPE || !Array.isArray(receipt.packages) || !Array.isArray(receipt.scopes)) {
      throw new Error("registry has no recognized build receipt; pass an explicit `packages` list for registries that are not ours");
    }
    receiptSha256 = `sha256:${createHash("sha256").update(receiptBytes).digest("hex")}`;
    entries = [...receipt.packages];
  } else {
    if (!Array.isArray(packages) || packages.length === 0) throw new TypeError("`packages` must be a non-empty array");
    entries = [];
    for (const value of packages.map(requestedPackage)) {
      const { metadata } = await readMetadata(value.name, source, metadataCache);
      const version = value.version ?? metadata["dist-tags"]?.latest;
      if (typeof version !== "string") throw new Error(`registry names no latest version for ${value.name}; request an explicit version`);
      const manifest = metadata.versions?.[version];
      if (manifest === undefined) throw new Error(`registry has no ${value.name}@${version}`);
      entries.push({
        name: value.name,
        version,
        artifact: manifest.dist?.tarball ?? null,
        bytes: null,
        shasum: manifest.dist?.shasum ?? null,
        integrity: manifest.dist?.integrity ?? null,
      });
    }
  }
  const ownedScopes = new Set(internalScopes ?? receipt?.scopes ?? []);

  entries.sort((a, b) =>
    packageSurface(a.name, a.version).localeCompare(packageSurface(b.name, b.version)),
  );
  const nodes = [];
  const nodesBySurface = new Map();
  for (const entry of entries) {
    const { manifest, metadataSha256 } = await readVersionManifest(entry, source, metadataCache);
    const node = {
      address: Object.freeze({
        packageSurface: packageSurface(entry.name, entry.version),
        contentIntegrity: entry.integrity,
        shasum: entry.shasum,
      }),
      name: entry.name,
      version: entry.version,
      scope: packageScope(entry.name),
      manifest,
      metadataSha256,
      receiptEntry: entry,
    };
    nodes.push(node);
    nodesBySurface.set(node.address.packageSurface, node);
  }

  const dependencyEdges = [];
  const defects = [];
  for (const node of nodes) {
    for (const relation of DEPENDENCY_RELATIONS) {
      const declared = node.manifest[relation];
      if (declared === null || typeof declared !== "object" || Array.isArray(declared)) continue;
      for (const [depName, pin] of Object.entries(declared).sort(([a], [b]) => a.localeCompare(b))) {
        const scope = packageScope(depName);
        const internal = scope !== null && ownedScopes.has(scope);
        if (!internal) {
          dependencyEdges.push(Object.freeze({
            from: node.address.packageSurface,
            to: depName,
            constraint: pin,
            relation,
            resolution: "external",
          }));
          continue;
        }
        const target = nodesBySurface.get(packageSurface(depName, pin));
        if (target === undefined) {
          defects.push(Object.freeze({
            kind: "unresolved-internal-dependency",
            from: node.address.packageSurface,
            to: packageSurface(depName, pin),
            relation,
          }));
          continue;
        }
        dependencyEdges.push(Object.freeze({
          from: node.address.packageSurface,
          to: target.address.packageSurface,
          constraint: pin,
          relation,
          resolution: "registry",
        }));
      }
    }
  }

  // Ownership in plain npm terms: the scope owns the package. No custom
  // manifest fields are read.
  const actorEdges = [];
  for (const node of nodes) {
    if (node.scope !== null) {
      actorEdges.push(Object.freeze({ from: node.address.packageSurface, to: node.scope, relation: "owned-by" }));
    }
  }

  return Object.freeze({
    type: GRAPH_TYPE,
    registry: receipt?.registry ?? (registryUrl !== undefined ? registryFace(registryUrl) : resolve(registryRoot)),
    receiptSha256,
    scopes: Object.freeze([...ownedScopes].sort()),
    nodes: Object.freeze(nodes.map((node) => Object.freeze({
      address: node.address,
      name: node.name,
      version: node.version,
      scope: node.scope,
      metadataSha256: node.metadataSha256,
    }))),
    tiers: Object.freeze({
      dependency: Object.freeze({ edges: Object.freeze(dependencyEdges) }),
      actor: Object.freeze({ edges: Object.freeze(actorEdges) }),
      history: Object.freeze({
        predecessor: receipt?.predecessor ?? null,
        reaction: receipt?.reaction ?? null,
        receiptVersion: receipt === null ? null : receipt.version ?? 1,
      }),
      witness: Object.freeze({
        receiptSha256,
        compute: receipt?.compute ?? null,
        artifacts: Object.freeze(nodes.map((node) => Object.freeze({
          packageSurface: node.address.packageSurface,
          artifact: node.receiptEntry.artifact,
          bytes: node.receiptEntry.bytes,
          shasum: node.receiptEntry.shasum,
          integrity: node.receiptEntry.integrity,
        }))),
      }),
    }),
    defects: Object.freeze(defects),
  });
}

function dotIdentifier(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function renderRegistryGraphDot(graph, { tier = "dependency" } = {}) {
  if (graph?.type !== GRAPH_TYPE) throw new TypeError(`one ${GRAPH_TYPE} is required`);
  const lines = [`digraph ${JSON.stringify(`registry-${tier}`)} {`, "  rankdir=LR;"];
  if (tier === "dependency") {
    for (const node of graph.nodes) lines.push(`  ${dotIdentifier(node.address.packageSurface)} [shape=box];`);
    const externals = new Set();
    for (const edge of graph.tiers.dependency.edges) {
      if (edge.resolution === "external") {
        if (!externals.has(edge.to)) {
          externals.add(edge.to);
          lines.push(`  ${dotIdentifier(edge.to)} [shape=box, style=dashed];`);
        }
        lines.push(`  ${dotIdentifier(edge.from)} -> ${dotIdentifier(edge.to)} [style=dashed, label=${dotIdentifier(edge.relation)}];`);
      } else {
        lines.push(`  ${dotIdentifier(edge.from)} -> ${dotIdentifier(edge.to)} [label=${dotIdentifier(edge.relation)}];`);
      }
    }
  } else if (tier === "actor") {
    for (const node of graph.nodes) lines.push(`  ${dotIdentifier(node.address.packageSurface)} [shape=box];`);
    const targets = new Set();
    for (const edge of graph.tiers.actor.edges) {
      if (!targets.has(edge.to)) {
        targets.add(edge.to);
        lines.push(`  ${dotIdentifier(edge.to)} [shape=ellipse];`);
      }
      lines.push(`  ${dotIdentifier(edge.from)} -> ${dotIdentifier(edge.to)} [label=${dotIdentifier(edge.relation)}];`);
    }
  } else {
    throw new TypeError(`unknown registry graph tier: ${tier}`);
  }
  lines.push("}");
  return `${lines.join("\n")}\n`;
}
