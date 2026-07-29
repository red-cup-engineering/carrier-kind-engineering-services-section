import { discreteArena, event, eventStructure, flow, negative, play, positive, strategy, strategyReport } from "@emsenn/gaming";

import { projectContextSuit, type ContextSuit } from "./operating/contextualizing/suiting/library/context-control.mts";
import { operationsManifoldGoals, type GoalRecord } from "./goals.mts";
import { optionalText, hash, stringList } from "./records.mts";
import { operationsManifoldWork, type ActiveWorkRecord } from "./work-management.mts";
import {
  packageAtlasView,
  resolveWorkspaceFocus,
  workspaceGraphView,
  type PackageAtlasModule,
  type PackageAtlasView,
  type WorkspaceGraphProjection,
  workspaceGraphProjection,
} from "./workspace-view.mts";

export type CodebaseReadingParams = Readonly<{
  package?: string | undefined;
  pkg?: string | undefined;
  focus?: string | undefined;
  intent?: string | undefined;
  q?: string | undefined;
  paths?: string | readonly string[] | undefined;
  limit?: string | number | undefined;
  budget?: string | number | undefined;
}>;

export type CodebaseReading = Readonly<{
  kind: "operations-manifold.read-codebase";
  generatedAt: string;
  domain: Readonly<{
    package: string;
    focus: string;
    intent: string;
    terms: readonly string[];
    paths: readonly string[];
  }>;
  codomain: Readonly<{
    ready: boolean;
    summary: string;
    pressures: readonly CodebaseReadingPressure[];
    nextInterfaces: readonly CodebaseReadingInterface[];
  }>;
  graph: WorkspaceGraphProjection;
  package: Readonly<{
    name: string;
    path: string;
    description: string;
    dependencies: readonly string[];
    bins: readonly string[];
    exports: readonly string[];
    facets: readonly Readonly<{ axis: string; role: string; evidence: readonly string[] }>[];
  }>;
  reading: Readonly<{
    modules: readonly CodebaseReadingModule[];
    symbols: readonly CodebaseReadingSymbol[];
    work: readonly CodebaseReadingWork[];
    goals: readonly CodebaseReadingGoal[];
    context: CodebaseReadingContext;
    tooling: readonly CodebaseReadingTool[];
  }>;
  categorical: CodebaseCategoricalReading;
  stateless: Readonly<{
    claim: "Codebase reading is projected from jsnode atlas, 561 Group Operations Manifold read-work/context state, and gaming analysis in one function run";
    memoryScope: "one package-bin function run";
    transport: "package-bin-json";
  }>;
}>;

export type CodebaseReadingPressure = Readonly<{
  id: string;
  severity: "info" | "watch" | "block";
  summary: string;
  next: string;
}>;

export type CodebaseReadingInterface = Readonly<{
  bin: string;
  purpose: string;
  params: Readonly<Record<string, string>>;
}>;

export type CodebaseReadingModule = Readonly<{
  module: string;
  import: string;
  file: string;
  score: number;
  symbolCount: number;
  relevantSymbols: readonly string[];
}>;

export type CodebaseReadingSymbol = Readonly<{
  name: string;
  kind: string;
  module: string;
  file: string;
  score: number;
  signature: string;
}>;

export type CodebaseReadingWork = Readonly<{
  id: string;
  title: string;
  status: ActiveWorkRecord["status"];
  focus: string | null;
  evidence: readonly string[];
}>;

export type CodebaseReadingGoal = Readonly<{
  id: string;
  title: string;
  status: GoalRecord["status"];
  priority: number;
  focus: string | null;
  evidence: readonly string[];
}>;

export type CodebaseReadingContext = Readonly<{
  suit: Readonly<{
    id: string;
    admissionId: string | null;
    intent: string;
    focus: string | null;
    tokenEstimate: number;
    budget: number;
    perception: readonly string[];
    memory: readonly string[];
    provenance: readonly string[];
  }>;
}>;

export type CodebaseReadingTool = Readonly<{
  bin: string;
  purpose: string;
  params: Readonly<Record<string, string>>;
}>;

export type CodebaseCategoricalReading = Readonly<{
  upstream: readonly string[];
  arena: Readonly<{
    kind: "game.arena";
    eventCount: number;
    moduleEvents: number;
    symbolEvents: number;
    causality: number;
  }>;
  strategy: Readonly<{
    kind: "game.strategy.report";
    plays: number;
    wellFormed: boolean;
    validPlays: boolean;
  }>;
  flow: Readonly<{
    kind: string;
    challenge: number;
    skill: number;
    reading: "flow" | "anxiety" | "boredom";
  }>;
  sketch: readonly string[];
  limits: readonly string[];
}>;

type ScoredSymbol = PackageAtlasModule["symbols"][number] & Readonly<{
  module: string;
  import: string;
  file: string;
  score: number;
}>;

export async function codebaseReading(repoRoot: string, params: CodebaseReadingParams = {}): Promise<CodebaseReading> {
  const generatedAt = new Date().toISOString();
  const requestedFocus = optionalText(params.package ?? params.pkg ?? params.focus) ?? "@emsenn/operations-manifold";
  const intent = optionalText(params.intent ?? params.q) ?? "Read codebase structure for the current 561 Group Operations Manifold work.";
  const paths = stringList(params.paths);
  const graphView = await workspaceGraphView(repoRoot, { focus: requestedFocus, up: "1", down: "1" });
  const packageName = graphView.focus ?? resolveWorkspaceFocus(repoRoot, graphView.full, requestedFocus) ?? "@emsenn/operations-manifold";
  const atlas = await packageAtlasView(repoRoot, packageName, { detail: "surface" });
  if (atlas === null) throw new Error(`read-codebase: package not found: ${packageName}`);
  const terms = readingTerms(intent, requestedFocus, paths);
  const [work, goals, suit] = await Promise.all([
    operationsManifoldWork(repoRoot),
    operationsManifoldGoals(repoRoot),
    projectContextSuit(repoRoot, { intent, focus: packageName, budget: params.budget }),
  ]);
  const modules = selectedModules(atlas, terms, paths, params.limit);
  const symbols = selectedSymbols(atlas, terms, paths, params.limit, modules);
  const workItems = selectedWork(work.items, terms, packageName, paths);
  const goalItems = selectedGoals(goals.goals, goals.open, terms, packageName);
  const categorical = categoricalReading({ modules, symbols });
  const pressures = codebasePressures({ modules, symbols, workItems, goalItems, suit, categorical });
  return Object.freeze({
    kind: "operations-manifold.read-codebase" as const,
    generatedAt,
    domain: Object.freeze({ package: packageName, focus: requestedFocus, intent, terms, paths }),
    codomain: Object.freeze({
      ready: pressures.every((pressure) => pressure.severity !== "block"),
      summary: summaryFor(packageName, modules, symbols, workItems, categorical),
      pressures,
      nextInterfaces: codebaseInterfaces({ packageName, intent, paths, modules, symbols, pressures }),
    }),
    graph: workspaceGraphProjection(graphView),
    package: compactPackage(atlas),
    reading: Object.freeze({
      modules: Object.freeze(modules.map(compactModule)),
      symbols: Object.freeze(symbols.map(compactSymbol)),
      work: Object.freeze(workItems.map(compactWork)),
      goals: Object.freeze(goalItems.map(compactGoal)),
      context: compactContext(suit),
      tooling: toolingFor(packageName, intent, modules, symbols, paths),
    }),
    categorical,
    stateless: Object.freeze({
      claim: "Codebase reading is projected from jsnode atlas, 561 Group Operations Manifold read-work/context state, and gaming analysis in one function run" as const,
      memoryScope: "one package-bin function run" as const,
      transport: "package-bin-json" as const,
    }),
  });
}

function selectedModules(
  atlas: PackageAtlasView,
  terms: readonly string[],
  paths: readonly string[],
  limitValue: string | number | undefined,
): readonly (PackageAtlasModule & Readonly<{ score: number }>)[] {
  const limit = boundedLimit(limitValue, 8);
  return Object.freeze(atlas.modules
    .map((module) => Object.freeze({ ...module, score: moduleScore(module, terms, paths) }))
    .sort((left, right) => right.score - left.score || left.module.localeCompare(right.module))
    .slice(0, limit));
}

function selectedSymbols(
  atlas: PackageAtlasView,
  terms: readonly string[],
  paths: readonly string[],
  limitValue: string | number | undefined,
  modules: readonly (PackageAtlasModule & Readonly<{ score: number }>)[],
): readonly ScoredSymbol[] {
  const limit = boundedLimit(limitValue, 12);
  const moduleNames = new Set(modules.map((module) => module.module));
  const ranked = atlas.modules
    .filter((module) => moduleNames.has(module.module))
    .flatMap((module) => module.symbols.map((symbol) => Object.freeze({
      ...symbol,
      module: module.module,
      import: module.import,
      file: module.file,
      score: symbolScore(symbol, module, terms, paths),
    })))
    .filter((symbol) => symbol.score > 0)
    .sort((left, right) => right.score - left.score || left.module.localeCompare(right.module) || left.name.localeCompare(right.name));
  const topByModule = [...topSymbolPerModule(ranked)]
    .sort((left, right) => right.score - left.score || left.module.localeCompare(right.module) || left.name.localeCompare(right.name));
  return Object.freeze(topByModule.slice(0, calibratedSymbolLimit(modules.length, limit)));
}

function selectedWork(
  items: readonly ActiveWorkRecord[],
  terms: readonly string[],
  packageName: string,
  paths: readonly string[],
): readonly ActiveWorkRecord[] {
  return Object.freeze(items
    .filter((item) => item.focus === packageName || item.focus === "sites/ops.561.group" || paths.some((path) => item.evidence.includes(path)) || overlaps(terms, searchable([item.title, item.intent, item.focus, ...item.evidence])))
    .slice(0, 5));
}

function selectedGoals(
  goals: readonly GoalRecord[],
  open: readonly string[],
  terms: readonly string[],
  packageName: string,
): readonly GoalRecord[] {
  return Object.freeze(goals
    .filter((goal) => open.includes(goal.id))
    .filter((goal) => goal.focus === packageName || goal.focus === "sites/ops.561.group" || overlaps(terms, searchable([goal.title, goal.text, goal.focus])))
    .slice(0, 5));
}

function categoricalReading(input: Readonly<{
  modules: readonly (PackageAtlasModule & Readonly<{ score: number }>)[];
  symbols: readonly ScoredSymbol[];
}>): CodebaseCategoricalReading {
  const moduleNames = [...new Set([
    ...input.modules.map((module) => module.module),
    ...input.symbols.map((symbol) => symbol.module),
  ])].sort();
  const moduleEvents = moduleNames.map((module) => event(eventId("module", module), negative()));
  const symbolEvents = input.symbols.map((symbol) => event(eventId("symbol", `${symbol.module}:${symbol.name}`), positive()));
  const symbolModules = new Map(input.symbols.map((symbol) => [eventId("symbol", `${symbol.module}:${symbol.name}`), eventId("module", symbol.module)]));
  const causality = [...symbolModules.entries()].map(([symbol, module]) => Object.freeze([module, symbol] as const));
  const moduleConflicts = pairwise(moduleEvents.map((item) => item.id));
  const arena = discreteArena(eventStructure([...moduleEvents, ...symbolEvents], causality, moduleConflicts));
  const moduleMoves = moduleNames.map((module) => eventId("module", module));
  const strategySymbols = topSymbolPerModule(input.symbols);
  const symbolPlays = strategySymbols.map((symbol) => play([eventId("module", symbol.module), eventId("symbol", `${symbol.module}:${symbol.name}`)]));
  const readerStrategy = strategy(arena, [
    play([]),
    ...moduleMoves.map((move) => play([move])),
    ...symbolPlays,
  ]);
  const report = strategyReport(readerStrategy);
  const flowJudgment = flow(arena, readerStrategy);
  const flowReading = flowJudgment.kind === "game-analysis.flow:witness" ? "flow" : flowJudgment.reason;
  return Object.freeze({
    upstream: Object.freeze([
      "@emsenn/organizing-with-jsnode/workspaces: packageAtlas + workspaceDependencyGraph",
      "@emsenn/gaming: arena + strategy + flow",
      "561 Group Operations Manifold data/logs + data/state: work, goals, context suit",
    ]),
    arena: Object.freeze({
      kind: "game.arena" as const,
      eventCount: arena.structure.events.length,
      moduleEvents: moduleEvents.length,
      symbolEvents: symbolEvents.length,
      causality: arena.structure.causality.length,
    }),
    strategy: Object.freeze({
      kind: "game.strategy.report" as const,
      plays: readerStrategy.plays.length,
      wellFormed: report.wellFormed,
      validPlays: report.validPlays,
    }),
    flow: Object.freeze({
      kind: flowJudgment.kind,
      challenge: flowJudgment.challenge.value,
      skill: flowJudgment.skill.value,
      reading: flowReading,
    }),
    sketch: Object.freeze([
      "Package modules are Opponent/codebase moves: structure the agent must answer.",
      "Selected symbols are Player/reader candidates; the finite strategy chooses one top symbol per module.",
      "Module-to-symbol causality reads source navigation before symbol-level edits.",
      "Work and context evidence choose which subarena should be loaded into Codex context.",
    ]),
    limits: Object.freeze([
      "This is a finite reading sketch, not a proof of the full package category.",
      "Call symbol/module/package atlas tools for detail before editing a selected carrier.",
      "Deeper categorical analysis should promote reusable code-reading carriers upstream.",
    ]),
  });
}

function pairwise(values: readonly string[]): readonly (readonly [string, string])[] {
  const pairs: (readonly [string, string])[] = [];
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const leftValue = values[left];
      const rightValue = values[right];
      if (leftValue !== undefined && rightValue !== undefined) pairs.push(Object.freeze([leftValue, rightValue] as const));
    }
  }
  return Object.freeze(pairs);
}

function topSymbolPerModule(symbols: readonly ScoredSymbol[]): readonly ScoredSymbol[] {
  const byModule = new Map<string, ScoredSymbol>();
  for (const symbol of symbols) {
    const existing = byModule.get(symbol.module);
    if (existing === undefined || symbol.score > existing.score || (symbol.score === existing.score && symbol.name.localeCompare(existing.name) < 0)) {
      byModule.set(symbol.module, symbol);
    }
  }
  return Object.freeze([...byModule.values()].sort((left, right) => left.module.localeCompare(right.module)));
}

function calibratedSymbolLimit(moduleCount: number, requestedLimit: number): number {
  if (moduleCount <= 0) return 0;
  const flowExtra = Math.floor(moduleCount / 4);
  return Math.min(requestedLimit, Math.max(1, flowExtra));
}

function compactPackage(atlas: PackageAtlasView): CodebaseReading["package"] {
  return Object.freeze({
    name: atlas.package.name,
    path: atlas.package.path,
    description: atlas.package.description,
    dependencies: Object.freeze(atlas.package.dependencies),
    bins: Object.freeze(atlas.package.manifest.bins),
    exports: Object.freeze(atlas.package.exports),
    facets: Object.freeze(atlas.facets.map((item) => Object.freeze({
      axis: item.axis,
      role: item.role,
      evidence: Object.freeze(item.evidence.slice(0, 6)),
    }))),
  });
}

function compactModule(module: PackageAtlasModule & Readonly<{ score: number }>): CodebaseReadingModule {
  return Object.freeze({
    module: module.module,
    import: module.import,
    file: module.file,
    score: module.score,
    symbolCount: module.symbols.length,
    relevantSymbols: Object.freeze(module.symbols.slice(0, 8).map((symbol) => symbol.name)),
  });
}

function compactSymbol(symbol: ScoredSymbol): CodebaseReadingSymbol {
  return Object.freeze({
    name: symbol.name,
    kind: symbol.kind,
    module: symbol.module,
    file: symbol.file,
    score: symbol.score,
    signature: clip(symbol.signature, 240),
  });
}

function compactWork(item: ActiveWorkRecord): CodebaseReadingWork {
  return Object.freeze({
    id: item.id,
    title: clip(item.title, 160),
    status: item.status,
    focus: item.focus,
    evidence: Object.freeze(item.evidence.slice(0, 4)),
  });
}

function compactGoal(goal: GoalRecord): CodebaseReadingGoal {
  return Object.freeze({
    id: goal.id,
    title: clip(goal.title, 160),
    status: goal.status,
    priority: goal.priority,
    focus: goal.focus,
    evidence: Object.freeze(goal.evidence.slice(0, 4)),
  });
}

function compactContext(suit: ContextSuit): CodebaseReadingContext {
  return Object.freeze({
    suit: Object.freeze({
      id: suit.id,
      admissionId: suit.admissionId,
      intent: suit.intent,
      focus: suit.focus,
      tokenEstimate: suit.tokenEstimate,
      budget: suit.budget,
      perception: Object.freeze(suit.perception.slice(0, 5).map((item) => item.uri)),
      memory: Object.freeze(suit.memory.slice(0, 5).map((item) => item.uri)),
      provenance: Object.freeze(suit.provenance.slice(0, 6)),
    }),
  });
}

function codebasePressures(input: Readonly<{
  modules: readonly (PackageAtlasModule & Readonly<{ score: number }>)[];
  symbols: readonly ScoredSymbol[];
  workItems: readonly ActiveWorkRecord[];
  goalItems: readonly GoalRecord[];
  suit: ContextSuit;
  categorical: CodebaseCategoricalReading;
}>): readonly CodebaseReadingPressure[] {
  const pressures: CodebaseReadingPressure[] = [];
  if (input.modules.length === 0) pressures.push(pressure("modules-unread", "block", "No package modules were selected for this codebase reading.", "Run read-jsnode-package or adjust focus/package."));
  if (input.symbols.length === 0) pressures.push(pressure("symbols-unread", "watch", "No symbols matched the requested intent.", "Broaden the intent or inspect the selected module directly."));
  if (input.workItems.length === 0) pressures.push(pressure("read-work-unbound", "watch", "No 561 Group Operations Manifold read-work item matched this codebase reading.", "Use plan-codex or start-work to bind the reading to work."));
  if (input.goalItems.length === 0) pressures.push(pressure("goal-unbound", "watch", "No open 561 Group Operations Manifold goal matched this reading.", "Use admit-goal-document if the reading belongs to a new objective."));
  if (input.suit.tokenEstimate > input.suit.budget) pressures.push(pressure("context-over-budget", "watch", "The codebase context suit exceeds budget.", "Admit narrower context before loading broad code."));
  if (!input.categorical.strategy.wellFormed) pressures.push(pressure("strategy-not-well-formed", "watch", "The finite gaming strategy sketch is not well formed.", "Inspect selected modules/symbols before relying on the categorical sketch."));
  if (input.categorical.flow.reading === "anxiety") pressures.push(pressure("reading-anxiety", "info", "The selected symbols underserve the module challenge.", "Inspect more symbols or narrow the module set."));
  if (input.categorical.flow.reading === "boredom") pressures.push(pressure("reading-boredom", "info", "The symbol repertoire exceeds the selected module challenge.", "Narrow symbols before loading into context."));
  return Object.freeze(pressures);
}

function codebaseInterfaces(input: Readonly<{
  packageName: string;
  intent: string;
  paths: readonly string[];
  modules: readonly (PackageAtlasModule & Readonly<{ score: number }>)[];
  symbols: readonly ScoredSymbol[];
  pressures: readonly CodebaseReadingPressure[];
}>): readonly CodebaseReadingInterface[] {
  const firstModule = input.modules[0];
  const firstSymbol = input.symbols[0];
  const interfaces: CodebaseReadingInterface[] = [
    iface("read-jsnode-package", "read full package atlas", { package: input.packageName, detail: "full" }),
    iface("project-context-suit", "read workload-aware context for this codebase task", { focus: input.packageName, intent: input.intent }),
    iface("market-file-touch", "inspect file attention before choosing the next read or write", { focus: input.packageName, limit: "12" }),
    iface("plan-codex", "bind the codebase reading to the current Codex plan", { focus: input.packageName, intent: input.intent, paths: input.paths.join(",") }),
  ];
  if (firstModule !== undefined) interfaces.push(iface("read-jsnode-module", "inspect the highest-ranked module", { package: input.packageName, module: firstModule.module }));
  if (firstSymbol !== undefined) interfaces.push(iface("read-jsnode-symbol", "inspect the highest-ranked symbol", { package: input.packageName, name: firstSymbol.name }));
  return Object.freeze(interfaces);
}

function toolingFor(
  packageName: string,
  intent: string,
  modules: readonly (PackageAtlasModule & Readonly<{ score: number }>)[
  ],
  symbols: readonly ScoredSymbol[],
  paths: readonly string[],
): readonly CodebaseReadingTool[] {
  return Object.freeze(codebaseInterfaces({ packageName, intent, modules, symbols, paths, pressures: [] })
    .map((item) => Object.freeze({ bin: item.bin, purpose: item.purpose, params: item.params })));
}

function summaryFor(
  packageName: string,
  modules: readonly unknown[],
  symbols: readonly unknown[],
  workItems: readonly unknown[],
  categorical: CodebaseCategoricalReading,
): string {
  return `${packageName}: ${modules.length} module(s), ${symbols.length} symbol(s), ${workItems.length} read-work item(s); gaming flow=${categorical.flow.reading}.`;
}

function moduleScore(module: PackageAtlasModule, terms: readonly string[], paths: readonly string[]): number {
  const haystack = searchable([module.module, module.import, module.file, ...module.symbols.flatMap((symbol) => [symbol.name, symbol.kind, symbol.signature, symbol.doc])]);
  return scoreText(haystack, terms) + (paths.some((path) => module.file.includes(path) || path.includes(module.file)) ? 8 : 0);
}

function symbolScore(symbol: PackageAtlasModule["symbols"][number], module: PackageAtlasModule, terms: readonly string[], paths: readonly string[]): number {
  const haystack = searchable([symbol.name, symbol.kind, symbol.signature, symbol.doc, module.module, module.import, module.file]);
  return scoreText(haystack, terms) + (paths.some((path) => module.file.includes(path) || path.includes(module.file)) ? 6 : 0);
}

function scoreText(haystack: string, terms: readonly string[]): number {
  return terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
}

function readingTerms(intent: string, focus: string, paths: readonly string[]): readonly string[] {
  return Object.freeze([...new Set([intent, focus, ...paths].flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/u)).filter((term) => term.length > 3))]);
}

function eventId(kind: "module" | "symbol", value: string): string {
  return `${kind}:${value.replace(/[^a-zA-Z0-9_.:-]+/gu, "_").slice(0, 80) || hash(value).slice(0, 12)}`;
}

function pressure(id: string, severity: CodebaseReadingPressure["severity"], summary: string, next: string): CodebaseReadingPressure {
  return Object.freeze({ id, severity, summary, next });
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): CodebaseReadingInterface {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function boundedLimit(value: string | number | undefined, fallback: number): number {
  const parsed = value === undefined ? Number.NaN : typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.max(1, Math.min(60, parsed)) : fallback;
}

function searchable(values: readonly (string | null | undefined)[]): string {
  return values.filter((value): value is string => value !== null && value !== undefined).join(" ").replace(/([a-z])([A-Z])/gu, "$1 $2").toLowerCase();
}

function overlaps(terms: readonly string[], haystack: string): boolean {
  return terms.some((term) => haystack.includes(term));
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}
