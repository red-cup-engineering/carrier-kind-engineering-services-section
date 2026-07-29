import type { Context, HyperCell, Page } from "@emsenn/organizing-with-the-semantic-web/semantic-hypertext";
import { AUDIT, PUBLIC, algebraToPage, projectArticle, projectDocument, stack } from "@emsenn/organizing-with-the-semantic-web/semantic-hypertext";

export type SettledCharge = Readonly<{
  value?: readonly unknown[];
  evidence?: readonly (readonly unknown[] | unknown)[];
}>;

export type SettledCell = Readonly<{
  subject?: unknown;
  predicate?: unknown;
  object?: unknown;
}>;

export type SettledAssignment = Readonly<{
  cell?: SettledCell;
  charge?: SettledCharge;
}>;

export type SettledSection = Readonly<{
  assignments?: readonly SettledAssignment[];
}>;

export type SwarmProjectedCell = HyperCell & Readonly<{ subject: string | null }>;
export type SwarmGap = Readonly<{ subject: string | null; predicate: unknown; object: unknown }>;

export type SwarmSectionAlgebra = Readonly<{
  kind: "web-swarm.settled-section";
  subject: string | null;
  potential: readonly SwarmProjectedCell[];
  active: readonly SwarmProjectedCell[];
  stable: readonly SwarmProjectedCell[];
  absurd: readonly SwarmGap[];
  multiSubject: boolean;
}>;

export type SwarmPage = Page & Readonly<{ absurd: readonly SwarmGap[] }>;

export type SectionFrame = Readonly<{
  html: string;
  audit: string;
  absurd: readonly SwarmGap[];
}>;

export function unmark(value: unknown): unknown {
  return value && typeof value === "object" && "const" in value ? (value as { const: unknown }).const : value;
}

function firstWitness(value: unknown): unknown {
  const list = Array.isArray(value) ? value : [];
  for (const witness of list) {
    const bare = unmark(witness);
    if (bare !== undefined && bare !== null) return bare;
  }
  return null;
}

export function chargeBits(charge: SettledCharge | undefined): readonly [boolean, boolean] {
  const value = Array.isArray(charge?.value) ? charge.value : [];
  return Object.freeze([Boolean(value[0]), Boolean(value[1])] as const);
}

function sideEvidence(charge: SettledCharge | undefined, side: 0 | 1): unknown {
  const evidence = Array.isArray(charge?.evidence) ? charge.evidence : [];
  return firstWitness(evidence[side]);
}

function projectedBase(cell: SettledCell): { subject: string | null; predicate: unknown; object: unknown } {
  const subject = unmark(cell.subject);
  return {
    subject: subject === undefined || subject === null ? null : String(subject),
    predicate: unmark(cell.predicate),
    object: unmark(cell.object),
  };
}

export function sectionToAlgebra(section: SettledSection): SwarmSectionAlgebra {
  const assignments = Array.isArray(section.assignments) ? section.assignments : [];
  const subjects = new Set<string>();
  const potential: SwarmProjectedCell[] = [];
  const active: SwarmProjectedCell[] = [];
  const stable: SwarmProjectedCell[] = [];
  const absurd: SwarmGap[] = [];

  for (const assignment of assignments) {
    const base = projectedBase(assignment.cell ?? {});
    if (base.subject) subjects.add(base.subject);
    const [positive, negative] = chargeBits(assignment.charge);
    const cellBase = {
      subject: base.subject,
      predicate: String(base.predicate ?? ""),
      object: base.object,
    };
    if (positive && negative) {
      stable.push(Object.freeze({
        ...cellBase,
        claimedBy: sideEvidence(assignment.charge, 0),
        contraryClaimedBy: sideEvidence(assignment.charge, 1),
      }));
    } else if (positive) {
      potential.push(Object.freeze({ ...cellBase, citation: sideEvidence(assignment.charge, 0) }));
    } else if (negative) {
      active.push(Object.freeze({ ...cellBase, citation: sideEvidence(assignment.charge, 1) }));
    } else {
      absurd.push(Object.freeze(base));
    }
  }

  const subjectList = [...subjects].sort();
  return Object.freeze({
    kind: "web-swarm.settled-section",
    subject: subjectList.length > 0 ? subjectList[0]! : null,
    potential: Object.freeze(potential),
    active: Object.freeze(active),
    stable: Object.freeze(stable),
    absurd: Object.freeze(absurd),
    multiSubject: subjectList.length > 1,
  });
}

function withoutSubject(cell: SwarmProjectedCell): HyperCell {
  const out: { predicate: string; object: unknown; citation?: unknown; claimedBy?: unknown; contraryClaimedBy?: unknown } = {
    predicate: cell.predicate,
    object: cell.object,
  };
  if (cell.citation !== undefined) out.citation = cell.citation;
  if (cell.claimedBy !== undefined) out.claimedBy = cell.claimedBy;
  if (cell.contraryClaimedBy !== undefined) out.contraryClaimedBy = cell.contraryClaimedBy;
  return Object.freeze(out);
}

function cellsForSubject(cells: readonly SwarmProjectedCell[], subject: string): readonly HyperCell[] {
  return Object.freeze(cells.filter((cell) => (cell.subject ?? subject) === subject).map(withoutSubject));
}

export function sectionToPage(section: SettledSection, options: { contexts?: readonly Context[] } = {}): SwarmPage {
  const algebra = sectionToAlgebra(section);
  const subjects = [...new Set([
    ...algebra.potential.map((cell) => cell.subject).filter((subject): subject is string => !!subject),
    ...algebra.active.map((cell) => cell.subject).filter((subject): subject is string => !!subject),
    ...algebra.stable.map((cell) => cell.subject).filter((subject): subject is string => !!subject),
  ])].sort();
  const concreteSubjects = subjects.length > 0 ? subjects : [algebra.subject ?? "swarm"];
  const pages = concreteSubjects.map((subject) => algebraToPage({
    subject,
    potential: cellsForSubject(algebra.potential, subject),
    active: cellsForSubject(algebra.active, subject),
    stable: cellsForSubject(algebra.stable, subject),
  }, options));
  const page = pages.length === 1 ? pages[0]! : stack(pages, { subject: algebra.subject });
  return Object.freeze({ ...page, absurd: algebra.absurd });
}

function renderContexts(options: { mode?: "calm" | "audit"; contexts?: readonly Context[] }): readonly Context[] | undefined {
  if (options.contexts) return options.contexts;
  return options.mode === "audit" ? Object.freeze([PUBLIC, AUDIT]) : undefined;
}

function renderContextName(contextName: string, options: { mode?: "calm" | "audit"; contexts?: readonly Context[] }): string {
  return options.mode === "audit" && contextName === "public" && !options.contexts ? "audit" : contextName;
}

function pageOptions(contexts: readonly Context[] | undefined): { contexts?: readonly Context[] } {
  return contexts ? { contexts } : {};
}

export function renderArticle(section: SettledSection, contextName = "public", options: { mode?: "calm" | "audit"; observer?: string; contexts?: readonly Context[] } = {}): string {
  const page = sectionToPage(section, pageOptions(renderContexts(options)));
  const renderOptions: { mode?: "calm" | "audit"; observer?: string } = {};
  if (options.mode) renderOptions.mode = options.mode;
  if (options.observer) renderOptions.observer = options.observer;
  return projectArticle(page, renderContextName(contextName, options), renderOptions);
}

export function renderDocument(section: SettledSection, contextName = "public", options: { title?: string; mode?: "calm" | "audit"; observer?: string; contexts?: readonly Context[] } = {}): string {
  const page = sectionToPage(section, pageOptions(renderContexts(options)));
  const renderOptions: { title?: string; mode?: "calm" | "audit"; observer?: string } = {};
  if (options.title) renderOptions.title = options.title;
  if (options.mode) renderOptions.mode = options.mode;
  if (options.observer) renderOptions.observer = options.observer;
  return projectDocument(page, renderContextName(contextName, options), renderOptions);
}

export function renderSectionFrame(section: SettledSection, options: { mode?: "calm" | "audit"; contextName?: string; contexts?: readonly Context[] } = {}): SectionFrame {
  const contextName = options.contextName ?? "public";
  const auditContextOptions: { contexts?: readonly Context[]; mode: "audit" } = { mode: "audit" };
  if (options.contexts) auditContextOptions.contexts = options.contexts;
  const page = sectionToPage(section, pageOptions(renderContexts(auditContextOptions)));
  const frameOptions: { mode?: "calm" | "audit" } = {};
  if (options.mode) frameOptions.mode = options.mode;
  const html = projectArticle(page, renderContextName(contextName, options), frameOptions);
  const audit = options.mode === "audit" ? html : projectArticle(page, renderContextName(contextName, auditContextOptions), { mode: "audit" });
  return Object.freeze({ html, audit, absurd: page.absurd });
}
