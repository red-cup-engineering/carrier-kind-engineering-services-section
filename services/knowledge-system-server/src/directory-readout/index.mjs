/**
 * @packageDocumentation
 *
 * src/integrations/filesystem/services/directory-readout - arbitrary-directory readout over existing
 * MetroPlat readers.
 *
 * This is not a new scanner. It composes the package's existing filesystem
 * census (`file-census`), material-legibility census (`legibility`), workspace
 * admission (`workspace-scanner`), and vault/log next-read surfaces into one
 * finite readout. Content-heavy domains remain explicit next reads so a caller
 * can decide which shroud edge to open next.
 */
import path from "node:path";

import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { readLegibility } from "@red-cup-engineering/computer-code-development-engine/monitoring/filesystem/legibility/service";
import { readFileCensus } from "@red-cup-engineering/computer-code-development-engine/monitoring/filesystem/file-census/service";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { openJournal, journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import {
  packageRootsOfWorkspaceDeclaration,
  scanDeclaredWorkspace,
  scanWorkspaceDeclaration,
} from "@red-cup-engineering/computer-code-development-engine/workspace/scanner/service";
import {
  directoryReadoutRecordContract as directoryReadoutRecordSchemaContract,
  directoryReadoutRequestContract,
  directoryReadoutContract as directoryReadoutSchemaContract,

} from "@red-cup-engineering/knowledge-system-server/directory-readout/boundary/schema";

import { artifactTier } from "@red-cup-engineering/eavt-services-section/statement";
import { eavtRecord, toEavt } from "@red-cup-engineering/eavt-services-section/row";
export { directoryReadoutRecordSchemaContract, directoryReadoutSchemaContract };

const DIRECTORY_READOUT_RECORD_ACTION = "record-directory-readout";
const directoryReadoutRecordTerms = Object.freeze({
  readout: tm.mark("metroplat.directory-readout.record.readout"),
  support: tm.mark("metroplat.directory-readout.record.support"),
  legibility: tm.mark("metroplat.directory-readout.record.legibility"),
  workspace: tm.mark("metroplat.directory-readout.record.workspace"),
  surface: tm.mark("metroplat.directory-readout.record.surface"),
  shroud: tm.mark("metroplat.directory-readout.record.shroud"),
  nextRead: tm.mark("metroplat.directory-readout.record.next-read"),
  package: tm.mark("metroplat.directory-readout.record.package"),
});

function inputRecord(input) {
  return input !== null && typeof input === "object" && !Array.isArray(input) ? input : {};
}

function directoryRootOfInput(input, binding) {
  const record = inputRecord(input);
  return typeof record["root"] === "string" && record["root"].length > 0 ? record["root"] : binding.dataRoot;
}

function darkSampleCapOfInput(input) {
  const cap = inputRecord(input)["darkSampleCap"];
  return typeof cap === "number" && Number.isInteger(cap) && cap >= 0 ? cap : undefined;
}

function relativePath(root, target) {
  const rel = path.relative(root, target).split(path.sep).join("/");
  return rel === "" ? "." : rel;
}

function hasDirectory(root, relative, options) {
  return options.statPathOrNull(path.join(root, relative))?.isDirectory() === true;
}

function extensionCount(extensions, names) {
  const wanted = new Set(names);
  return extensions.reduce((sum, entry) => sum + (wanted.has(entry.extension) ? entry.files : 0), 0);
}

function markdownFileCount(trees) {
  return trees.reduce((sum, tree) => sum + extensionCount(tree.extensions, ["md", "markdown"]), 0);
}

function nextRead(
  surface,
  verb,
  reason,
  extra = {},
) {
  return Object.freeze({
    surface,
    verb,
    reason,
    ...(extra.path === undefined ? {} : { path: extra.path }),
  });
}

function nextReadMaterial(read) {
  return Object.freeze({
    surface: read.surface,
    verb: read.verb,
    reason: read.reason,
    ...(read.path === undefined ? {} : { path: read.path }),
  });
}

function observationOptionsOf(options) {
  const out = { ...options };
  if (options.at !== undefined) out.at = options.at;
  if (options.caller !== undefined) out.caller = options.caller;
  return out;
}

function legibilityOptionsOf(
  options,
  observationOptions,
) {
  const out = { ...observationOptions };
  if (options.darkSampleCap !== undefined) out.darkSampleCap = options.darkSampleCap;
  return out;
}

function dependencyCount(manifest

) {
  return Object.keys(manifest.dependencies ?? {}).length
    + Object.keys(manifest.devDependencies ?? {}).length
    + Object.keys(manifest.optionalDependencies ?? {}).length
    + Object.keys(manifest.peerDependencies ?? {}).length;
}

function surface(
  kind,
  label,
  evidence,
  nextReads,
  extra = {},
) {
  return Object.freeze({
    kind,
    label,
    ...(extra.path === undefined ? {} : { path: extra.path }),
    ...(extra.count === undefined ? {} : { count: extra.count }),
    evidence: Object.freeze([...evidence]),
    nextReads: Object.freeze([...nextReads]),
  });
}

function shroud(
  kind,
  reason,
  evidence,
  nextReads,
  extra = {},
) {
  return Object.freeze({
    kind,
    reason,
    ...(extra.path === undefined ? {} : { path: extra.path }),
    ...(extra.count === undefined ? {} : { count: extra.count }),
    evidence: Object.freeze([...evidence]),
    nextReads: Object.freeze([...nextReads]),
  });
}

function packagesOf(root, options)

 {
  const declaration = scanWorkspaceDeclaration(root, options);
  const unsupportedPatterns = declaration.kind === "metroplat.admission.workspace-declaration"
    ? packageRootsOfWorkspaceDeclaration(root, declaration, options).unsupportedPatterns
    : Object.freeze([]);
  const scan = scanDeclaredWorkspace(root, options);
  const packages = scan.packages.map((entry) => {
    const base = {
      root: entry.root,
      relative: relativePath(root, entry.root),
    };
    if (entry.admission.kind === "metroplat.admission.package-manifest") {
      const manifest = entry.admission.manifest;
      return Object.freeze({
        ...base,
        admitted: true,
        name: manifest.name,
        private: manifest.private === true,
        dependencies: dependencyCount(manifest),
      });
    }
    return Object.freeze({
      ...base,
      admitted: false,
      reason: entry.admission.reason,
    });
  });
  return Object.freeze({
    packages: Object.freeze(packages),
    unsupportedPatterns: Object.freeze([...unsupportedPatterns]),
  });
}

function termValue(term) {
  return term;
}

function jsonValue(value, context) {
  return requireJsonValue(value, context);
}

function row(entity, attribute, value, at) {
  return toEavt({
    e: entity,
    a: termValue(attribute),
    v: jsonValue(value, "directory orientation statement value"),
    t: at,
  });
}

function rwilRowCount(rows) {
  return rows.filter((entry) => {
    const { e, a, v } = eavtRecord(entry);
    return typeof e === "string" && Array.isArray(a) && typeof v === "string";
  }).length;
}

function directoryReadoutRecordRows(
  readout,
  at,
) {
  const rows = [
    row(readout.root, directoryReadoutRecordTerms.readout, directoryReadoutSchemaContract.id, at),
    row(readout.root, directoryReadoutRecordTerms.support, readout.support, at),
    row(readout.root, directoryReadoutRecordTerms.legibility, readout.legibility, at),
    row(readout.root, directoryReadoutRecordTerms.workspace, readout.workspace, at),
  ];
  readout.surfaces.forEach((entry, index) => {
    rows.push(row(
      `${readout.root}#surface/${index}-${entry.kind}`,
      directoryReadoutRecordTerms.surface,
      entry.path ?? entry.kind,
      at,
    ));
  });
  readout.shroud.forEach((entry, index) => {
    rows.push(row(
      `${readout.root}#shroud/${index}-${entry.kind}`,
      directoryReadoutRecordTerms.shroud,
      entry.path ?? entry.kind,
      at,
    ));
  });
  readout.nextReads.forEach((entry, index) => {
    rows.push(row(
      `${readout.root}#next-read/${index}-${entry.surface}-${entry.verb}`,
      directoryReadoutRecordTerms.nextRead,
      `${entry.surface}:${entry.verb}`,
      at,
    ));
  });
  for (const entry of readout.packages ?? []) {
    rows.push(row(entry.root, directoryReadoutRecordTerms.package, entry.admitted ? "admitted" : "not-admitted", at));
  }
  return Object.freeze(rows);
}

/** Read one arbitrary directory as existing MetroPlat surfaces plus shroud evidence. */
export function readDirectoryReadout(root, options = {}) {
  const rootAbs = path.resolve(root);
  const observationOptions = observationOptionsOf(options);
  const fileCensus = readFileCensus(rootAbs, observationOptions);
  const legibility = readLegibility(rootAbs, legibilityOptionsOf(options, observationOptions));
  const { packages, unsupportedPatterns } = packagesOf(rootAbs, options);

  const legibilityTreeByPath = new Map(legibility.trees.map((tree) => [tree.path, tree]));
  const trees = fileCensus.trees.map((tree) => {
    const legibilityTree = legibilityTreeByPath.get(tree.path);
    return Object.freeze({
      path: tree.path,
      files: tree.files,
      loc: tree.loc,
      truncated: tree.truncated,
      darkFiles: legibilityTree?.darkFiles ?? 0,
      statFailures: legibilityTree?.statFailures ?? 0,
    });
  });

  const markdownFiles = markdownFileCount(fileCensus.trees);
  const hasDataLogs = hasDirectory(rootAbs, artifactTier("log").pathSegment, options);
  const hasContent = hasDirectory(rootAbs, "content", options);
  const rootPackage = packages.find((entry) => entry.relative === ".");
  const admittedPackages = packages.filter((entry) => entry.admitted).length;
  const failedPackages = packages.length - admittedPackages;

  const nextReads = [
    nextRead("service-action", "file-census", "Read the full file/tree scale census for this root."),
    nextRead("service-action", "legibility", "Read the full material-legibility census for this root."),
  ];
  const surfaces = [];
  const shrouds = [];

  if (fileCensus.files > 0) {
    surfaces.push(surface(
      "proof-play-source-candidate",
      "Proof-Play source monitor candidate",
      [`files:${fileCensus.files}`],
      ["proof-play"],
      { count: fileCensus.files },
    ));
    nextReads.push(nextRead("service-action", "proof-play", "Observe source carriers as Proof-Play fields, claims, proof status, causal support, and frontier evidence."));
  }

  if (hasDataLogs) {
    surfaces.push(surface(
      "statement-log-tier",
      "Statement log tier",
      [`path:${path.join(rootAbs, artifactTier("log").pathSegment)}`],
      ["feed-entropy", "conurbation", "run-causal-set", "session-presence"],
      { path: artifactTier("log").pathSegment },
    ));
    nextReads.push(
      nextRead("journal", "feed-entropy", "Fold recorded feeds for a date into entropy/obsticulation readings."),
      nextRead("conurbation", "conurbation", "Discover settlement roots beneath this directory."),
      nextRead("run-causal-set", "run-causal-set", "Read the day's recorded hook/run causal set."),
      nextRead("session-presence", "session-presence", "Read the day's session presence diamonds."),
    );
  }

  if (hasContent) {
    surfaces.push(surface(
      "content-tier",
      "Content tier",
      [`path:${path.join(rootAbs, "content")}`],
      ["read"],
      { path: "content" },
    ));
    nextReads.push(nextRead("filesystem", "read", "Read a content-tier path through the ordinary filesystem read boundary.", { path: "content" }));
  }

  if (markdownFiles > 0) {
    surfaces.push(surface(
      "markdown-vault-candidate",
      "Markdown vault candidate",
      [`markdown-files:${markdownFiles}`],
      ["read-vault", "query-vault"],
      { count: markdownFiles },
    ));
    nextReads.push(
      nextRead("package-api", "read-vault", "Ingest markdown files as articles/pages, links, references, and non-conforming note evidence."),
      nextRead("package-api", "query-vault", "Query markdown frontmatter assertions as one merged EAVT relation."),
    );
  }

  if (packages.length > 0) {
    surfaces.push(surface(
      "js-workspace",
      "JavaScript workspace/package surface",
      [`packages:${packages.length}`, `admitted:${admittedPackages}`, `failed:${failedPackages}`],
      ["workspace-graph", "workspace-import-audit"],
      { count: packages.length },
    ));
    nextReads.push(
      nextRead("service-action", "workspace-graph", "Project admitted package manifests into the internal workspace dependency DAG."),
      nextRead("service-action", "workspace-import-audit", "Cross-check manifest edges against actual TypeScript imports."),
    );
    if (rootPackage?.admitted === true) {
      nextReads.push(nextRead("service-action", "module-topology", "Read this package's TypeScript AST topology."));
      nextReads.push(nextRead("service-action", "module-cohesion", "Read module cohesion and god-file candidates for this package."));
    }
  }

  for (const tree of trees) {
    if (tree.truncated) {
      shrouds.push(shroud(
        "file-census-truncated-tree",
        "Line/content sampling stopped before the full tree was read.",
        [`tree:${tree.path}`, `files:${tree.files}`],
        ["file-census"],
        { path: tree.path, count: tree.files },
      ));
    }
    if (tree.statFailures > 0) {
      shrouds.push(shroud(
        "legibility-stat-failure",
        "Some file sizes could not be statted; byte totals hold the failure as data.",
        [`tree:${tree.path}`, `stat-failures:${tree.statFailures}`],
        ["legibility"],
        { path: tree.path, count: tree.statFailures },
      ));
    }
  }

  for (const pattern of unsupportedPatterns) {
    shrouds.push(shroud(
      "unsupported-workspace-pattern",
      "The workspace declaration contains a glob shape the scanner names but does not expand.",
      [`pattern:${pattern}`],
      ["workspace-graph"],
      { path: "pnpm-workspace.yaml" },
    ));
  }

  for (const failed of packages.filter((entry) => !entry.admitted)) {
    shrouds.push(shroud(
      "package-admission-failure",
      failed.reason ?? "package manifest admission failed",
      [`package:${failed.relative}`],
      ["workspace-graph"],
      { path: failed.relative },
    ));
  }

  for (const darkPath of legibility.darkSample) {
    shrouds.push(shroud(
      "dark-path-sample",
      "This path is outside the current legibility grammar or admitted codec/readout classes.",
      [`path:${darkPath}`],
      ["read", "legibility"],
      { path: darkPath },
    ));
  }

  if (!options.pathExists(rootAbs)) {
    shrouds.push(shroud(
      "missing-root",
      "The supplied root does not currently exist on the host filesystem.",
      [`root:${rootAbs}`],
      [],
      { path: "." },
    ));
  }

  const boundary = Object.freeze({
    root: rootAbs,
    support: Object.freeze({
      files: fileCensus.files,
      loc: fileCensus.loc,
      truncated: fileCensus.truncated,
      markdownFiles,
      hasDataLogs,
      hasContent,
    }),
    legibility: Object.freeze({
      files: legibility.files,
      legibilityRatio: legibility.legibilityRatio,
      darkTotal: legibility.darkTotal,
      darkSample: legibility.darkSample,
      statFailures: legibility.statFailures,
    }),
    workspace: Object.freeze({
      packages: packages.length,
      admittedPackages,
      failedPackages,
      unsupportedPatterns,
    }),
    surfaces: Object.freeze(surfaces),
    shroud: Object.freeze(shrouds),
    nextReads: Object.freeze(nextReads.map(nextReadMaterial)),
    trees: Object.freeze(trees),
    packages: Object.freeze(packages),
  });
  return directoryReadoutSchemaContract.assert(Object.freeze({
    kind: "metroplat.directory-readout.read",
    operation: "read-directory-readout",
    ...boundary,
  }), "directory readout");
}

/** Record one arbitrary-directory observation in the journal and derive state/record tiers. */
export function recordDirectoryReadout(root, options) {
  const at = jsonValue(options.at, "directory readout record time");
  const rootAbs = path.resolve(root);
  const dataRootAbs = path.resolve(options.dataRoot);
  const readout = readDirectoryReadout(rootAbs, {
    ...options,
    ...(options.darkSampleCap === undefined ? {} : { darkSampleCap: options.darkSampleCap }),
    at,
    ...(options.caller === undefined ? {} : { caller: options.caller }),
  });
  const rows = directoryReadoutRecordRows(readout, at);
  const append = openJournal(dataRootAbs).appendRows(DIRECTORY_READOUT_RECORD_ACTION, rows, {
    at,
    subject: DIRECTORY_READOUT_RECORD_ACTION,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    ...(options.caller === undefined ? {} : { caller: options.caller }),
  });
  const state = journal.projectState(append.artifact, [], {
    at,
    ...(options.caller === undefined ? {} : { caller: options.caller }),
  });
  const record = journal.projectRecord(append.artifact, {
    at,
    ...(options.caller === undefined ? {} : { caller: options.caller }),
  });
  const rwilRows = rwilRowCount(rows);
  return directoryReadoutRecordSchemaContract.assert(Object.freeze({
    kind: "metroplat.directory-readout.record",
    operation: "record-directory-readout",
    root: rootAbs,
    dataRoot: dataRootAbs,
    at,
    readout,
    journal: Object.freeze({
      feed: DIRECTORY_READOUT_RECORD_ACTION,
      rows: rows.length,
      rwilRows,
      eavtRows: rows.length,
      appended: append.appended,
    }),
    artifacts: Object.freeze({
      log: append.artifact,
      state: state.artifact,
      record: record.artifact,
    }),
  }), "directory readout record");
}

export function directoryReadoutOperations(binding) {
  return Object.freeze([
    operation({
      verb: "directory-readout",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read an arbitrary directory as admitted surfaces and shroud evidence.",
      description: "Domain: { root?, darkSampleCap? }. Defaults root to the service binding dataRoot.",
      codomain: directoryReadoutSchemaContract,
      run: (input) => {
        const root = directoryRootOfInput(input, binding);
        const darkSampleCap = darkSampleCapOfInput(input);
        const request = directoryReadoutRequestContract.assert(Object.freeze({
          kind: "metroplat.directory-readout.read-request",
          root,
          ...(darkSampleCap === undefined ? {} : { darkSampleCap }),
        }), "directory-readout input");
        return readDirectoryReadout(request.root, {
          ...binding,
          ...(request.darkSampleCap === undefined ? {} : { darkSampleCap: request.darkSampleCap }),
        });
      },
    }),
    operation({
      verb: DIRECTORY_READOUT_RECORD_ACTION,
      inputFormat: "json",
      outputFormat: "json",
      summary: "Record an arbitrary-directory observation as journaled EAVT/RWIL-shaped material.",
      description: "Domain: { root?, darkSampleCap? }. Writes under this service binding's dataRoot, then projects the directory-readout statement log into data/state and data/records.",
      codomain: directoryReadoutRecordSchemaContract,
      run: (input) => {
        const darkSampleCap = darkSampleCapOfInput(input);
        return recordDirectoryReadout(directoryRootOfInput(input, binding), {
          ...binding,
          dataRoot: binding.dataRoot,
          at: binding.now(),
          ...(binding.rootName === undefined ? {} : { rootName: binding.rootName }),
          ...(darkSampleCap === undefined ? {} : { darkSampleCap }),
        });
      },
    }),
  ]);
}

