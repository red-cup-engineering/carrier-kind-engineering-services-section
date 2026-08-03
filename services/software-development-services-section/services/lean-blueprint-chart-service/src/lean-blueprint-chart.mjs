import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";

const CLAIM_ENVIRONMENTS = new Set([
  "definition", "proposition", "lemma", "theorem", "corollary",
  "conjecture", "example", "remark",
]);
const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git", ".lake", ".tmp", "build", "dist", "node_modules",
]);

function uniqueSorted(values) {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}

function relativePath(root, path) {
  return relative(root, path).replaceAll(sep, "/");
}

function walkFiles(root, directory, extensions, ignoredDirectories) {
  if (!existsSync(directory)) return [];
  if (statSync(directory).isFile()) return extensions.has(extname(directory)) ? [directory] : [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(root, target, extensions, ignoredDirectories));
    else if (entry.isFile() && extensions.has(extname(entry.name))) files.push(target);
  }
  return files;
}

function stripLeanComments(text) {
  let output = "";
  let index = 0;
  let depth = 0;
  while (index < text.length) {
    const pair = text.slice(index, index + 2);
    if (depth > 0) {
      if (pair === "/-") {
        depth += 1;
        output += "  ";
        index += 2;
      } else if (pair === "-/") {
        depth -= 1;
        output += "  ";
        index += 2;
      } else {
        output += text[index] === "\n" ? "\n" : " ";
        index += 1;
      }
    } else if (pair === "/-") {
      depth = 1;
      output += "  ";
      index += 2;
    } else if (pair === "--") {
      while (index < text.length && text[index] !== "\n") {
        output += " ";
        index += 1;
      }
    } else {
      output += text[index];
      index += 1;
    }
  }
  return output;
}

function qualifyLeanName(name, namespaceStack) {
  if (name.includes(".") || namespaceStack.length === 0) return name;
  return `${namespaceStack.join(".")}.${name}`;
}

function decodeLeanDeclarations(text, module, source) {
  const lines = stripLeanComments(text).split(/\r?\n/u);
  const namespaceStack = [];
  const declarations = [];
  const declarationPattern = /^(?:@\[[^\]]*\]\s*)*(?:noncomputable\s+)?(?:private\s+|protected\s+|partial\s+|unsafe\s+)*(axiom|constant|opaque|inductive|structure|class|def|theorem|lemma|abbrev|instance)\s+([A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*)/u;
  let current;

  for (let offset = 0; offset < lines.length; offset += 1) {
    const line = (lines[offset] ?? "").trim();
    const namespace = /^namespace\s+([A-Za-z_][A-Za-z0-9_'.]*)/u.exec(line)?.[1];
    if (namespace !== undefined) {
      namespaceStack.push(namespace);
      continue;
    }
    if (/^end(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*$/u.test(line)) {
      namespaceStack.pop();
      current = undefined;
      continue;
    }
    const match = declarationPattern.exec(line);
    if (match !== null) {
      const kind = match[1];
      current = {
        module,
        source,
        name: qualifyLeanName(match[2], namespaceStack),
        kind,
        line: offset + 1,
        proofStatus: kind === "axiom" || kind === "constant" ? "assumed" : "proved",
      };
      declarations.push(current);
    }
    if (current !== undefined && /\b(?:sorry|admit)\b/u.test(line)) current.proofStatus = "admitted";
  }
  return declarations;
}

function stripTexComment(line) {
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "%" && !escaped) return line.slice(0, index);
    if (character === "\\") escaped = !escaped;
    else escaped = false;
  }
  return line;
}

function splitCommaList(values) {
  return values.flatMap((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean));
}

function matches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]).filter(Boolean);
}

function decodeBlueprintPlate(text, source) {
  const lines = text.split(/\r?\n/u);
  const nodes = [];
  let context = {};
  let awaitingChapterLabel = false;
  let current;

  const flush = () => {
    if (current === undefined) return;
    const body = current.body.join("\n");
    const id = matches(body, /\\label\{([^{}]+)\}/gu)[0];
    if (id !== undefined) {
      const frontier = /\\notready\b/u.test(body);
      const settled = /\\leanok\b/u.test(body) && !frontier;
      nodes.push(Object.freeze({
        id,
        source,
        statementKind: current.statementKind,
        ...(current.title === undefined ? {} : { title: current.title }),
        leanDeclarations: uniqueSorted(splitCommaList(matches(body, /\\lean\{([^{}]+)\}/gu))),
        dependencies: uniqueSorted(splitCommaList(matches(body, /\\uses\{([^{}]+)\}/gu))),
        status: settled ? "settled" : frontier ? "frontier" : "unstated",
        line: current.line,
        ...current.context,
      }));
    }
    current = undefined;
  };

  for (let offset = 0; offset < lines.length; offset += 1) {
    const line = stripTexComment(lines[offset] ?? "");
    const part = /\\part\{([^{}]*)\}/u.exec(line)?.[1];
    const chapter = /\\chapter\{([^{}]*)\}/u.exec(line)?.[1];
    const section = /\\section\{([^{}]*)\}/u.exec(line)?.[1];
    const subsection = /\\subsection\{([^{}]*)\}/u.exec(line)?.[1];
    if (part !== undefined) {
      context = { ...context, part };
      awaitingChapterLabel = false;
    }
    if (chapter !== undefined) {
      context = { ...context, chapter, chapterLabel: undefined, section: undefined, subsection: undefined };
      awaitingChapterLabel = true;
    }
    const chapterLabel = awaitingChapterLabel ? /^\s*\\label\{([^{}]+)\}\s*$/u.exec(line)?.[1] : undefined;
    if (chapterLabel !== undefined) {
      context = { ...context, chapterLabel };
      awaitingChapterLabel = false;
    } else if (awaitingChapterLabel && line.trim() !== "" && chapter === undefined) {
      awaitingChapterLabel = false;
    }
    if (section !== undefined) context = { ...context, section, subsection: undefined };
    if (subsection !== undefined) context = { ...context, subsection };

    const begin = /\\begin\{([^{}]+)\}(?:\[([^\]]+)\])?/u.exec(line);
    if (begin !== null && CLAIM_ENVIRONMENTS.has(begin[1])) {
      flush();
      current = {
        statementKind: begin[1],
        ...(begin[2] === undefined ? {} : { title: begin[2] }),
        line: offset + 1,
        body: [line],
        context: Object.freeze({ ...context }),
      };
    } else if (current !== undefined) {
      current.body.push(line);
      if (line.includes(`\\end{${current.statementKind}}`)) flush();
    }
  }
  flush();
  return nodes;
}

function readBlueprintGraph(root, blueprintRoots, ignoredDirectories) {
  const sources = uniqueSorted(blueprintRoots.flatMap((item) =>
    walkFiles(root, join(root, item), new Set([".tex"]), ignoredDirectories)));
  const nodes = sources.flatMap((file) => decodeBlueprintPlate(readFileSync(file, "utf8"), relativePath(root, file)))
    .sort((left, right) => left.id.localeCompare(right.id) || left.source.localeCompare(right.source));
  const edges = nodes.flatMap((node) => node.dependencies.map((dependency) => Object.freeze({
    from: node.id,
    to: dependency,
    relationship: "uses",
    source: node.source,
    line: node.line,
  }))).sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
  const ids = new Set(nodes.map((node) => node.id));
  return Object.freeze({
    kind: "red-cup-engineering.lean-blueprint.claim-graph",
    sources: Object.freeze(sources.map((file) => relativePath(root, file))),
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    settled: nodes.filter((node) => node.status === "settled").length,
    frontier: nodes.filter((node) => node.status === "frontier").length,
    unstated: nodes.filter((node) => node.status === "unstated").length,
    missingDependencies: uniqueSorted(edges.filter((edge) => !ids.has(edge.to)).map((edge) => edge.to)),
  });
}

export function readLeanWorkspace(root, options = {}) {
  const absoluteRoot = resolve(root);
  const ignoredDirectories = new Set([...DEFAULT_IGNORED_DIRECTORIES, ...(options.ignore ?? [])]);
  const leanRoots = options.leanRoots ?? ["Obsmetrologia", "Obsmetrologia.lean"];
  const leanFiles = uniqueSorted(leanRoots.flatMap((item) =>
    walkFiles(absoluteRoot, join(absoluteRoot, item), new Set([".lean"]), ignoredDirectories)));
  const modules = leanFiles.map((file) => {
    const source = relativePath(absoluteRoot, file);
    const module = source.replace(/\.lean$/u, "").replaceAll("/", ".");
    const text = readFileSync(file, "utf8");
    const declarations = decodeLeanDeclarations(text, module, source);
    const imports = uniqueSorted(
      stripLeanComments(text).split(/\r?\n/u).flatMap((line) => {
        const imported = /^\s*import\s+(.+)$/u.exec(line)?.[1];
        return imported === undefined ? [] : imported.split(/\s+/u).filter(Boolean);
      }),
    );
    return Object.freeze({ id: module, path: file, imports, declarations: Object.freeze(declarations) });
  });
  const declarationEntries = modules.flatMap((module) => module.declarations);
  const blueprintClaimGraph = readBlueprintGraph(
    absoluteRoot,
    options.blueprintRoots ?? ["docs/blueprint/src"],
    ignoredDirectories,
  );
  return Object.freeze({
    kind: "red-cup-engineering.lean-blueprint.workspace-chart",
    root: absoluteRoot,
    modules: Object.freeze(modules),
    declarationCatalog: Object.freeze({
      kind: "red-cup-engineering.lean.declaration-catalog",
      entries: Object.freeze(declarationEntries.sort((left, right) => left.name.localeCompare(right.name))),
    }),
    texWorkspaceRead: Object.freeze({ blueprintClaimGraph }),
  });
}

function finding(code, severity, message, node) {
  return Object.freeze({
    code,
    severity,
    message,
    ...(node === undefined ? {} : { nodeId: node.id, source: node.source, line: node.line }),
  });
}

export function blueprintClaimGraphFindings(graph, options = {}) {
  const baseLabels = new Set(options.baseLabels ?? []);
  const externalPrefixes = options.externalPrefixes ?? [];
  const definitionKinds = new Set(options.definitionKinds ?? ["definition"]);
  const labelKindPrefixes = options.labelKindPrefixes ?? { "def:": "definition" };
  const external = (id) => externalPrefixes.some((prefix) => id.startsWith(prefix));
  const nodesById = new Map();
  const usesById = new Map();
  const findings = [];
  for (const node of graph.nodes) {
    const previous = nodesById.get(node.id);
    if (previous !== undefined) findings.push(finding("duplicate-label", "error", `duplicate label already defined at ${previous.source}:${previous.line}`, node));
    else nodesById.set(node.id, node);
  }
  for (const edge of graph.edges) usesById.set(edge.from, [...(usesById.get(edge.from) ?? []), edge.to]);
  for (const edge of graph.edges) {
    if (!nodesById.has(edge.to) && !external(edge.to)) findings.push(finding("missing-upstream", "error", `uses missing label ${edge.to}`, nodesById.get(edge.from)));
  }
  const memo = new Map();
  const reachesBase = (id, stack = new Set()) => {
    if (baseLabels.has(id) || external(id)) return true;
    if (memo.has(id)) return memo.get(id);
    if (stack.has(id) || !nodesById.has(id)) return false;
    stack.add(id);
    const reaches = (usesById.get(id) ?? []).some((used) => reachesBase(used, stack));
    stack.delete(id);
    memo.set(id, reaches);
    return reaches;
  };
  for (const node of nodesById.values()) {
    const uses = usesById.get(node.id) ?? [];
    if (!baseLabels.has(node.id) && !external(node.id) && uses.length === 0) findings.push(finding("rootless-node", "error", "non-base claim-site has no upstream uses edge", node));
    if (!baseLabels.has(node.id) && !external(node.id) && !reachesBase(node.id)) findings.push(finding("unglued-node", "error", "claim-site has no dependency path back to a base label", node));
    if (definitionKinds.has(node.statementKind) && !baseLabels.has(node.id)) findings.push(finding("overboxed-definition", "warning", "Blueprint definition box outside the base set", node));
    for (const [prefix, expectedKind] of Object.entries(labelKindPrefixes)) {
      if (node.id.startsWith(prefix) && node.statementKind !== expectedKind) findings.push(finding("label-kind-mismatch", "warning", `${node.statementKind} node uses ${prefix}* label`, node));
    }
    if (node.status === "settled" && node.leanDeclarations.length === 0) findings.push(finding("green-without-lean", "error", "settled node has no Lean witness", node));
    if (node.status === "unstated") findings.push(finding("missing-status", "error", "node is neither settled nor frontier", node));
  }
  return Object.freeze(findings);
}

export function blueprintLeanWeldFindings(graph, declarationCatalog) {
  const declarations = new Map(declarationCatalog.entries.map((entry) => [entry.name, entry]));
  const admittedNames = new Set(declarationCatalog.entries.filter((entry) => ["admitted", "assumed"].includes(entry.proofStatus)).map((entry) => entry.name));
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const uses = new Map();
  for (const edge of graph.edges) uses.set(edge.from, [...(uses.get(edge.from) ?? []), edge.to]);
  const admittedLabels = new Set();
  const findings = [];
  for (const node of graph.nodes) {
    for (const name of node.leanDeclarations) {
      if (admittedNames.has(name)) admittedLabels.add(node.id);
      if (!declarations.has(name)) findings.push(finding("unmatched-lean-reference", "warning", `Lean reference ${name} does not resolve to a cataloged declaration`, node));
    }
  }
  const memo = new Map();
  const reachesAdmitted = (id, stack = new Set()) => {
    if (admittedLabels.has(id)) return true;
    if (memo.has(id)) return memo.get(id);
    if (stack.has(id) || !nodes.has(id)) return false;
    stack.add(id);
    const reaches = (uses.get(id) ?? []).some((used) => reachesAdmitted(used, stack));
    stack.delete(id);
    memo.set(id, reaches);
    return reaches;
  };
  for (const node of graph.nodes) {
    for (const name of node.leanDeclarations) {
      const declaration = declarations.get(name);
      if (declaration === undefined) continue;
      const admitted = ["admitted", "assumed"].includes(declaration.proofStatus);
      if (admitted && node.status === "settled") findings.push(finding("green-admitted", "error", `settled node references admitted Lean declaration ${name}`, node));
      if (!admitted && node.status === "frontier" && !reachesAdmitted(node.id)) findings.push(finding("red-settled", "warning", `frontier node references a proved Lean declaration ${name} with no admitted upstream`, node));
    }
  }
  return Object.freeze(findings);
}
