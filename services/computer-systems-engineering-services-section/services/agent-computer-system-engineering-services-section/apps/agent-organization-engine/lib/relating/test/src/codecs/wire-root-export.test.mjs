import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WIRE_CODEC_NAMES, senCodec, wireByMediaType, wireCodec, wireOf } from "@red-cup-engineering/computer-system-engine/wire";
import { wireOf as wireOf_2, wireCodec as wireCodec_2, wireByMediaType as wireByMediaType_2, stringCodec, jsonCodec, eavtCodec, senCodec as senCodec_2, svgCodec, mermaidCodec, xmiCodec, plantUmlCodec, formCodec, WIRE_CODEC_NAMES as WIRE_CODEC_NAMES_2 } from "@red-cup-engineering/computer-system-engine/wire";
import { sha256Hex, sha1Base64, hmacSha256Base64Url, timingSafeStringEqual } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { toCount, fromCount, toInt, fromInt, ratFromInt, fromRatio, fromInts } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { ASSERT, RETRACT } from "@red-cup-engineering/datom-services-section";
import { toDatom } from "@red-cup-engineering/datom-services-section/admit-datom";
import { isDatomShape } from "@red-cup-engineering/datom-services-section/is-datom";
import { settledDatom, settledDatom as datom } from "@red-cup-engineering/datom-services-section/settle-row";
import { parse } from "@red-cup-engineering/datom-services-section/parse-datoms";
import { serialize } from "@red-cup-engineering/datom-services-section/serialize-datoms";
import { assertObjectDatom } from "@red-cup-engineering/datom-services-section/admit-datom-fact";
import { assertDatomFact } from "@red-cup-engineering/datom-services-section/assert-datom-fact";
import { retractDatomFact } from "@red-cup-engineering/datom-services-section/retract-datom-fact";
import { objectDatomId } from "@red-cup-engineering/datom-services-section/identify-datom-fact";
import { currentDatomValue } from "@red-cup-engineering/datom-services-section/current-datom-facts";
import { objectDatomsAsOf } from "@red-cup-engineering/datom-services-section/datom-facts-as-of";
import { foldObjectDatoms } from "@red-cup-engineering/datom-services-section/fold-datom-evidence";
import { objectDatomWitnesses, objectDatomWitnesses as objectDatomStatements } from "@red-cup-engineering/datom-services-section/datom-cell-witnesses";
import { settle } from "@red-cup-engineering/datom-services-section/settle-entries";
import { recordPathFor } from "@red-cup-engineering/datom-services-section/resolve-record-path";
import { readDatomsAtPath } from "@red-cup-engineering/datom-services-section/read-datoms";
import { commitSettledRecord } from "@red-cup-engineering/datom-services-section/commit-settlement";
import { admitRdfDatom } from "@red-cup-engineering/datom-services-section/admit-rdf-datom";
import { canonicalEavtDatomJsonl, EAVT_DATOM_JSONL_MEDIA_TYPE } from "@red-cup-engineering/datom-services-section/rdf-datom";
import { checkClassMapsValid as css_classes_are_factor_maps, resolveNodeStyles as cssVisualValuation, checkStyleResolutionSettled as css_settles_to_valuation, cssTextFromResolvedStyles as cssTextFromVisualValuation } from "@red-cup-engineering/css-services-section/css-style-resolution";
import { htmlCarrierOf, renderHtmlDocument as renderHtmlFiber } from "@red-cup-engineering/html-engineering-services-section/html-document-render";
import { ref, isRef, escapeText, escapeAttr, slug, unmark, isContested, fromSection, fromCells, fromDetect, defaultMorphisms, morphismRegistry, projectArticle, project, markup, pack, verifyPacket, renderPacket, cellKey, address, lint, REF_PREFIX, shp, RFC7992_CLASSES, rfc7992Profile } from "@red-cup-engineering/html-structural-projection-service";
import { escapeHtml, attrs, el } from "@red-cup-engineering/html-structural-projection-service/string-rendering";
import { classes } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/microformats";
import { decodeHtmlEntities, scanHtmlStartTags, relTokens, htmlDocumentBase } from "@red-cup-engineering/html-structural-projection-service/scan";
import { resolveNodeStyles, checkStyleResolutionSettled, checkClassMapsValid, cssTextFromResolvedStyles } from "@red-cup-engineering/css-services-section/css-style-resolution";
import { buildHtmlDocumentPlan, renderHtmlDocument } from "@red-cup-engineering/html-engineering-services-section/html-document-render";
import { htmlProjector } from "@red-cup-engineering/html-structural-projection-service";
import { defaultShapeMorphisms, projectSvg, svgProjector } from "@red-cup-engineering/signgraph/diagram-svg";
import { serialize as serialize_3, shapeMorphismRegistry, svgRoot, nodeShape, edgePath, textLines, group, anchor, background, arrowMarker, hollowTriangleMarker, defs, readingMark as readingMark_2, calmReadingOf as calmReadingOf_2, readingAttributes, DEFAULT_SHAPE, svgInteractiveProfile, rfc7996Profile } from "@red-cup-engineering/xml-document-rendering-service/svg";
import { escapeXmlText, escapeXmlAttr, isXmlName, requireXmlName, element, text, comment, serialize as serialize_4, document, xmlProjector } from "@red-cup-engineering/xml-document-rendering-service/core";
import { nonBlankLines } from "@red-cup-engineering/jsonl-services-section/nonblank-lines";
import { parseLines } from "@red-cup-engineering/jsonl-services-section/parse-jsonl";
import { serializeLines } from "@red-cup-engineering/jsonl-services-section/serialize-jsonl";
import { dehydrateUtterances, rehydrateUtterances } from "@red-cup-engineering/eavt-services-section/log-path";
import { decodeLeanGoldenVectorLine, decodeLeanGoldenVectorJsonl, encodeLeanGoldenVectorJsonl, leanGoldenVectorsByAction, LeanGoldenVectorSchema } from "@red-cup-engineering/lean-system-services-section/golden-vector/codec";
import { assertTriple, tripleId, dedupeTriples, tripleFromEavt, tripleFromDatom } from "@red-cup-engineering/eavt-services-section/triple";
import { isEavtShape, eavtRecord, eavtId, parse as parse_2, serialize as serialize_2, serializeDatoms, toEavt, mergeEavtLogs, unfoldJson, foldJson, eavtTriple, eavtOrder, EAVT_JSONL, eavtProjector } from "@red-cup-engineering/eavt-services-section/row";
import { eavtToCell, cellToEavt } from "@red-cup-engineering/eavt-services-section/cell-rows";
import { jsonResource, jsonResource as jsonResource_2 } from "@red-cup-engineering/json-services-section";
import { jsonProjector } from "@red-cup-engineering/computer-content-engineering-services-section/json-projector";
import { jsonlProjector } from "@red-cup-engineering/jsonl-services-section/jsonl-projector";
import { toNumber, integerToDecimalString, ratToExactString } from "@red-cup-engineering/exact-number-data-service/exact-number-host";
const codecs = Object.freeze({ boundary: { wire: { wireOf: wireOf_2, wireCodec: wireCodec_2, wireByMediaType: wireByMediaType_2, stringCodec, jsonCodec, eavtCodec, senCodec: senCodec_2, svgCodec, mermaidCodec, xmiCodec, plantUmlCodec, formCodec, WIRE_CODEC_NAMES: WIRE_CODEC_NAMES_2 } }, host: { javascript: { crypto: { sha256Hex, sha1Base64, hmacSha256Base64Url, timingSafeStringEqual }, numbers: { toNumber, integerToDecimalString, ratToExactString, toCount, fromCount, toInt, fromInt, ratFromInt, fromRatio, fromInts } } }, text: { json: { jsonl: { eavt: { datom: { ASSERT, RETRACT, toDatom, isDatomShape, settledDatom, datom, parse, serialize, assertObjectDatom, assertDatomFact, retractDatomFact, objectDatomId, currentDatomValue, objectDatomsAsOf, foldObjectDatoms, objectDatomWitnesses, objectDatomStatements, settle, recordPathFor, readDatomsAtPath, commitSettledRecord, admitRdfDatom, canonicalEavtDatomJsonl, EAVT_DATOM_JSONL_MEDIA_TYPE }, lean: { decodeLeanGoldenVectorLine, decodeLeanGoldenVectorJsonl, encodeLeanGoldenVectorJsonl, leanGoldenVectorsByAction, LeanGoldenVectorSchema }, triple: { assertTriple, tripleId, dedupeTriples, tripleFromEavt, tripleFromDatom }, isEavtShape, eavtRecord, eavtId, parse: parse_2, serialize: serialize_2, serializeDatoms, toEavt, mergeEavtLogs, unfoldJson, foldJson, eavtTriple, eavtToCell, cellToEavt, eavtOrder, EAVT_JSONL, eavtProjector } }, jsonResource, jsonProjector, jsonlProjector }, xml: { html: { css_classes_are_factor_maps, cssVisualValuation, htmlCarrierOf, css_settles_to_valuation, cssTextFromVisualValuation, renderHtmlFiber, ref, isRef, escapeText, escapeAttr, slug, unmark, isContested, fromSection, fromCells, fromDetect, defaultMorphisms, morphismRegistry, projectArticle, project, markup, pack, verifyPacket, renderPacket, cellKey, address, lint, REF_PREFIX, shp, RFC7992_CLASSES, rfc7992Profile, escapeHtml, attrs, classes, el, decodeHtmlEntities, scanHtmlStartTags, relTokens, htmlDocumentBase, resolveNodeStyles, checkStyleResolutionSettled, checkClassMapsValid, cssTextFromResolvedStyles, buildHtmlDocumentPlan, renderHtmlDocument, htmlProjector }, svg: { defaultShapeMorphisms, projectSvg, svgProjector, serialize: serialize_3, shapeMorphismRegistry, svgRoot, nodeShape, edgePath, textLines, group, anchor, background, arrowMarker, hollowTriangleMarker, defs, readingMark: readingMark_2, calmReadingOf: calmReadingOf_2, readingAttributes, DEFAULT_SHAPE, svgInteractiveProfile, rfc7996Profile }, escapeXmlText, escapeXmlAttr, isXmlName, requireXmlName, element, text, comment, serialize: serialize_4, document, xmlProjector } }, jsonResource: jsonResource_2, nonBlankLines, parseLines, serializeLines, dehydrateUtterances, rehydrateUtterances });

describe("src/codecs boundary wire realization", () => {
  it("owns the finite wire vocabulary at the boundary/wire leaf", () => {
    assert.deepEqual(WIRE_CODEC_NAMES, ["eavt", "form", "json", "mermaid", "plantuml", "sen", "string", "svg", "xmi"]);
    assert.equal(codecs.boundary.wire.wireCodec, wireCodec);
    assert.equal(Object.hasOwn(codecs, "wireCodec"), false);
    assert.equal(wireCodec("json").mediaType.split(";")[0], "application/json");
    assert.equal(wireCodec("sen").mediaType.split(";")[0], "application/sen+json");
    assert.equal(wireByMediaType("application/sen+json"), senCodec);
  });

  it("round-trips admitted JSON and SEN wires canonically", () => {
    const json = wireCodec("json");
    assert.equal(json.encode(json.decode('{"b":2,"a":1}')).trim(), '{"a":1,"b":2}');
    const term = ["pair", ["star"], ["star"]];
    assert.deepEqual(senCodec.decode(senCodec.encode(term)), term);
  });

  it("refuses to turn undecidable projection readings into wires", () => {
    const projector = {
      type: "bad",
      corner: "data",
      rung: "aperiodic",
      recognize: () => true,
      read: () => [],
      write: () => "",
    };
    assert.throws(() => wireOf(projector), /not decidable/);
  });
});
