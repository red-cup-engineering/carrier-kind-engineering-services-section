/**
 * static-website/render/html-presentation - profile-fiber HTML for site pages.
 *
 * Static site renderers provide body presentation nodes and head fragments; this
 * module admits them through the shared HTML presentation/profile-fiber codec.
 */
import { articulate, mark, utterance } from "../../../lib/records/utterance/utterance.mts";
import { predicate } from "../../../lib/logic/predicating/predication.mts";
import { posit } from "../../../lib/logic/predicating/evidence/fiber.mts";
import { fixedPoints } from "../../../lib/fixpoint/fixed-point.mts";
import { documentOfFixedPoint } from "../../../lib/fixpoint/document.mts";
import {
  htmlCarrierOf,
  buildHtmlDocumentPlan,
  renderHtmlDocument,
  type HtmlCarrierNode,
  type HtmlValue,
  type RenderProfile,
} from "@red-cup-engineering/html-document-render-service";
import { escapeText, type CssSystem } from "@red-cup-engineering/html-structural-projection-service";
import { renderHtmlNode, type HtmlChild, type HtmlNode } from "@red-cup-engineering/html-structural-projection-service/document-nodes";

const STATIC_HTML_COMPLETION = "ordinal.closure.regime.finite" as const;

const staticWebsiteHtmlProfile: RenderProfile = Object.freeze({
  kind: "rendering.profile" as const,
  name: "metroplat-static-site-html",
  allowedElements: Object.freeze([
    "a",
    "article",
    "div",
    "h1",
    "h2",
    "header",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "section",
    "span",
    "time",
    "ul",
  ]),
  allowedStyleBehavior: Object.freeze(["static"] as const),
  allowedCompletionRegimes: Object.freeze([STATIC_HTML_COMPLETION]),
  obligations: Object.freeze(["same-content-record", "markdown-html-boundary", "no-sidecar-renderer"]),
  preservationLaws: Object.freeze([
    "preserve-addresses",
    "preserve-order",
    "preserve-references",
    "preserve-valuation-sites",
    "carrier-not-document",
    "css-settles",
  ] as const),
});

export type StaticWebsitePresentationNode = Omit<HtmlCarrierNode, "kind" | "semanticAddress" | "valuationSite">;

export interface StaticWebsiteHtmlPresentation {
  readonly title: string;
  readonly token: string;
  readonly claim: string;
  readonly lang?: string;
  readonly bodyAttributes?: Readonly<Record<string, HtmlValue>>;
  readonly nodes: readonly StaticWebsitePresentationNode[];
  readonly roots: readonly string[];
  readonly head?: readonly HtmlChild[];
}

export interface StaticWebsiteBodyAttributeOptions {
  readonly lens?: string;
  readonly profile?: string;
  readonly locus?: string;
}

export function staticWebsiteBodyAttributes(
  options: StaticWebsiteBodyAttributeOptions = {},
): Readonly<Record<string, HtmlValue>> {
  return Object.freeze({
    class: "metroplat-themed-page",
    "data-metroplat-lens": options.lens ?? "static-site",
    "data-metroplat-locus": options.locus ?? "page",
    "data-metroplat-profile": options.profile ?? staticWebsiteHtmlProfile.name,
  });
}

function staticDocument(token: string, claim: string): ReturnType<typeof documentOfFixedPoint> {
  return documentOfFixedPoint(
    fixedPoints(posit(predicate(articulate(utterance(mark(token), mark(claim)))))),
  );
}

function headFragment(child: HtmlChild): string | null {
  if (child === null || child === undefined || child === false) return null;
  return typeof child === "string" ? escapeText(child) : renderHtmlNode(child as HtmlNode);
}

function headFragments(children: readonly HtmlChild[] | undefined): readonly string[] {
  return Object.freeze((children ?? []).flatMap((child) => {
    const rendered = headFragment(child);
    return rendered === null ? [] : [rendered];
  }));
}

/** Render a static site page through the shared HTML presentation/profile fiber. */
export function renderStaticWebsiteHtmlPresentation(input: StaticWebsiteHtmlPresentation): string {
  const document = staticDocument(input.token, input.claim);
  if (document.kind !== "settledDocument.fixedPoint") {
    throw new TypeError(`renderStaticWebsiteHtmlPresentation: document did not settle: ${document.reason}`);
  }
  const address = document.addresses[0]?.key;
  const valuationSite = document.valuationSites[0]?.address;
  if (address === undefined || valuationSite === undefined) {
    throw new TypeError("renderStaticWebsiteHtmlPresentation: document settled without an address");
  }
  const nodes: readonly HtmlCarrierNode[] = Object.freeze(input.nodes.map((node) => Object.freeze({
    ...node,
    kind: "rendering.htmlCarrier.node" as const,
    semanticAddress: address,
    valuationSite,
  })));
  const carrier = htmlCarrierOf(document, nodes);
  if (carrier.kind !== "rendering.htmlCarrier") {
    throw new TypeError(`renderStaticWebsiteHtmlPresentation: carrier obstructed: ${carrier.reason}:${carrier.key}`);
  }
  const system: CssSystem<typeof carrier> = Object.freeze({
    kind: "rendering.css.system" as const,
    carrier,
    completionRegime: STATIC_HTML_COMPLETION,
    declarations: Object.freeze([]),
  });
  const fiber = buildHtmlDocumentPlan(staticWebsiteHtmlProfile, carrier, system, "static");
  if (fiber.kind !== "rendering.profile_forms_render_fiber:witness") {
    throw new TypeError(`renderStaticWebsiteHtmlPresentation: profile obstructed: ${fiber.reason}:${fiber.key}`);
  }
  return renderHtmlDocument(fiber, {
    title: input.title,
    roots: input.roots,
    head: headFragments(input.head),
    metadata: Object.freeze({ "render-domain": "metroplat.static-website" }),
    ...(input.bodyAttributes === undefined ? {} : { bodyAttributes: input.bodyAttributes }),
    ...(input.lang === undefined ? {} : { lang: input.lang }),
  }).html;
}
