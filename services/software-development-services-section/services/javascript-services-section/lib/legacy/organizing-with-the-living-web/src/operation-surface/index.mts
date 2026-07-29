import {
  AUDIT,
  PUBLIC,
  algebraToPage,
  projectArticle,
  stack,
  type FiniteAlgebra,
  type Page,
} from "@emsenn/organizing-with-the-semantic-web/semantic-hypertext";
import {
  el,
  escapeHtml,
  minimal,
  render,
  type Theme,
  type ThemeContext,
} from "@emsenn/organizing-with-the-web/theming";

export interface OperationSurfaceFact {
  readonly subject: unknown;
  readonly predicate: unknown;
  readonly object?: unknown;
}

export interface OperationSurfaceEndpoint {
  readonly name: string;
  readonly href: string;
  readonly method?: string;
  readonly protocol?: string;
  readonly input?: string;
  readonly output?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly target?: string;
  readonly term?: string;
  readonly facts?: readonly OperationSurfaceFact[];
}

export interface OperationSurface {
  readonly title: string;
  readonly subject?: string;
  readonly packageName?: string;
  readonly protocol?: string;
  readonly input?: string;
  readonly output?: string;
  readonly endpoints: readonly OperationSurfaceEndpoint[];
}

export interface OperationSurfaceDocumentOptions {
  readonly title?: string;
  readonly openApiHref?: string;
  readonly catalogHref?: string;
  readonly discoveryHref?: string;
  readonly mcpHref?: string;
  readonly theme?: Theme;
  readonly themeContext?: ThemeContext;
}

export interface OperationSurfaceSummary {
  readonly kind: "web.operation-surface";
  readonly title: string;
  readonly subject: string;
  readonly packageName?: string;
  readonly protocol?: string;
  readonly input?: string;
  readonly output?: string;
  readonly endpoints: readonly OperationSurfaceEndpoint[];
}

function subjectOf(surface: OperationSurface): string {
  return surface.subject ?? surface.packageName ?? surface.title;
}

function citation(surface: OperationSurface, endpoint?: OperationSurfaceEndpoint): string {
  return endpoint === undefined
    ? `${subjectOf(surface)} operation-surface`
    : `${subjectOf(surface)} package-bin ${endpoint.name}`;
}

function surfaceAlgebra(surface: OperationSurface): FiniteAlgebra {
  return {
    subject: subjectOf(surface),
    potential: [
      { predicate: "has-title", object: surface.title, citation: citation(surface) },
      ...(surface.packageName === undefined ? [] : [{ predicate: "has-package", object: surface.packageName, citation: citation(surface) }]),
      ...(surface.protocol === undefined ? [] : [{ predicate: "speaks-protocol", object: surface.protocol, citation: citation(surface) }]),
      ...(surface.input === undefined ? [] : [{ predicate: "accepts-media-type", object: surface.input, citation: citation(surface) }]),
      ...(surface.output === undefined ? [] : [{ predicate: "emits-media-type", object: surface.output, citation: citation(surface) }]),
      ...surface.endpoints.map((endpoint) => ({
        predicate: "has-operation",
        object: endpoint.name,
        citation: citation(surface, endpoint),
      })),
    ],
  };
}

function endpointAlgebra(surface: OperationSurface, endpoint: OperationSurfaceEndpoint): FiniteAlgebra {
  const endpointSubject = endpoint.term ?? `${subjectOf(surface)}#${endpoint.name}`;
  const factCells = (endpoint.facts ?? []).map((fact) => ({
    predicate: String(fact.predicate),
    object: fact.object === undefined ? "" : String(fact.object),
    citation: fact.subject === undefined ? citation(surface, endpoint) : String(fact.subject),
  }));
  return {
    subject: endpointSubject,
    potential: [
      { predicate: "has-name", object: endpoint.name, citation: citation(surface, endpoint) },
      { predicate: "has-href", object: endpoint.href, citation: citation(surface, endpoint) },
      ...(endpoint.method === undefined ? [] : [{ predicate: "has-method", object: endpoint.method, citation: citation(surface, endpoint) }]),
      ...(endpoint.protocol === undefined ? [] : [{ predicate: "speaks-protocol", object: endpoint.protocol, citation: citation(surface, endpoint) }]),
      ...(endpoint.input === undefined ? [] : [{ predicate: "accepts-media-type", object: endpoint.input, citation: citation(surface, endpoint) }]),
      ...(endpoint.output === undefined ? [] : [{ predicate: "emits-media-type", object: endpoint.output, citation: citation(surface, endpoint) }]),
      ...(endpoint.summary === undefined ? [] : [{ predicate: "has-summary", object: endpoint.summary, citation: citation(surface, endpoint) }]),
      ...(endpoint.description === undefined ? [] : [{ predicate: "has-description", object: endpoint.description, citation: citation(surface, endpoint) }]),
      ...(endpoint.target === undefined ? [] : [{ predicate: "has-target", object: endpoint.target, citation: citation(surface, endpoint) }]),
      ...factCells,
    ],
  };
}

export function operationSurfaceSummary(surface: OperationSurface): OperationSurfaceSummary {
  return Object.freeze({
    kind: "web.operation-surface" as const,
    title: surface.title,
    subject: subjectOf(surface),
    ...(surface.packageName === undefined ? {} : { packageName: surface.packageName }),
    ...(surface.protocol === undefined ? {} : { protocol: surface.protocol }),
    ...(surface.input === undefined ? {} : { input: surface.input }),
    ...(surface.output === undefined ? {} : { output: surface.output }),
    endpoints: Object.freeze([...surface.endpoints]),
  });
}

export function operationSurfacePage(surface: OperationSurface): Page {
  const pages = [
    algebraToPage(surfaceAlgebra(surface), { contexts: [PUBLIC, AUDIT] }),
    ...surface.endpoints.map((endpoint) => algebraToPage(endpointAlgebra(surface, endpoint), { contexts: [PUBLIC, AUDIT] })),
  ];
  return stack(pages, { subject: subjectOf(surface) });
}

function endpointList(surface: OperationSurface): string {
  const items = surface.endpoints.map((endpoint) => {
    const meta = [
      endpoint.method ?? "POST",
      endpoint.protocol,
      endpoint.input,
      endpoint.output,
    ].filter((item): item is string => typeof item === "string" && item.length > 0);
    return el("li", { class: "linking-operation-to-http-transport", "data-e": endpoint.name, "data-a": "has-href", "data-v": endpoint.href }, [
      el("a", { href: endpoint.href }, el("code", null, escapeHtml(endpoint.name))),
      endpoint.summary === undefined ? "" : el("span", { class: "projecting-operation-summary" }, escapeHtml(endpoint.summary)),
      meta.length === 0 ? "" : el("span", { class: "projecting-operation-metadata" }, meta.map((item) => el("code", null, escapeHtml(item))).join(" ")),
    ]);
  }).join("");
  return el("ol", { class: "projecting-operation-list" }, items);
}

function transportLinks(options: OperationSurfaceDocumentOptions): string {
  const links = [
    options.openApiHref === undefined ? "" : el("a", { class: "linking-operation-surface-to-openapi", href: options.openApiHref, "data-a": "has-openapi" }, "OpenAPI"),
    options.catalogHref === undefined ? "" : el("a", { class: "linking-operation-surface-to-catalog", href: options.catalogHref, "data-a": "has-catalog" }, "Catalog"),
    options.discoveryHref === undefined ? "" : el("a", { class: "linking-operation-surface-to-discovery", href: options.discoveryHref, "data-a": "has-discovery" }, "Discovery"),
    options.mcpHref === undefined ? "" : el("a", { class: "linking-operation-surface-to-mcp", href: options.mcpHref, "data-a": "has-mcp" }, "MCP"),
  ].filter(Boolean);
  return links.length === 0 ? "" : el("nav", { class: "projecting-operation-transports", "aria-label": "Machine transports" }, links.join(""));
}

export function operationSurfaceArticle(surface: OperationSurface, options: OperationSurfaceDocumentOptions = {}): string {
  const page = operationSurfacePage(surface);
  const packet = projectArticle(page, "public", { observer: "operation-surface-web-projection" });
  const affordances = el("section", { class: "projecting-operation-affordances", "data-e": subjectOf(surface) }, [
    transportLinks(options),
    endpointList(surface),
  ]);
  return `${packet}\n${affordances}`;
}

export function operationSurfaceDocument(surface: OperationSurface, options: OperationSurfaceDocumentOptions = {}): string {
  return render(options.theme ?? minimal, operationSurfaceArticle(surface, options), {
    title: options.title ?? surface.title,
    siteName: "Operation Surface",
    ...(options.themeContext ?? {}),
  });
}
