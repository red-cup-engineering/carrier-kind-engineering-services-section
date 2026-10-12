import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { wireOf, wireCodec, wireByMediaType, stringCodec, jsonCodec, eavtCodec, rmnCodec, svgCodec, mermaidCodec, xmiCodec, plantUmlCodec, formCodec, WIRE_CODEC_NAMES } from "../../src/codecs/boundary/wire/index.mjs";
import { sha256Hex, sha1Base64, hmacSha256Base64Url, timingSafeStringEqual } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/src/integrity.mjs";
import { toNumber, integerToDecimalString, ratToExactString, parseDecimal, fromDecimalString, toDecimalString } from "../../src/codecs/host/javascript/numbers/index.mjs";
import { toCount, fromCount, toInt, fromInt, ratFromInt, fromRatio, fromInts } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { ASSERT, RETRACT } from "@red-cup-engineering/datom";
import { toDatom } from "@red-cup-engineering/datom/admit-datom";
import { isDatomShape } from "@red-cup-engineering/datom/is-datom";
import { settledDatom, settledDatom as datom } from "@red-cup-engineering/datom/settle-row";
import { parse } from "@red-cup-engineering/datom/parse-datoms";
import { serialize } from "@red-cup-engineering/datom/serialize-datoms";
import { assertObjectDatom } from "@red-cup-engineering/datom/admit-datom-fact";
import { assertDatomFact } from "@red-cup-engineering/datom/assert-datom-fact";
import { retractDatomFact } from "@red-cup-engineering/datom/retract-datom-fact";
import { objectDatomId } from "@red-cup-engineering/datom/identify-datom-fact";
import { currentDatomValue } from "@red-cup-engineering/datom/current-datom-facts";
import { objectDatomsAsOf } from "@red-cup-engineering/datom/datom-facts-as-of";
import { foldObjectDatoms } from "@red-cup-engineering/datom/fold-datom-evidence";
import { objectDatomWitnesses, objectDatomWitnesses as objectDatomStatements } from "@red-cup-engineering/datom/datom-cell-witnesses";
import { settle } from "@red-cup-engineering/datom/settle-entries";
import { recordPathFor } from "@red-cup-engineering/datom/resolve-record-path";
import { readDatomsAtPath } from "@red-cup-engineering/datom/read-datoms";
import { commitSettledRecord } from "@red-cup-engineering/datom/commit-settlement";
import { admitRdfDatom } from "@red-cup-engineering/datom/admit-rdf-datom";
import { canonicalEavtDatomJsonl, EAVT_DATOM_JSONL_MEDIA_TYPE } from "@red-cup-engineering/datom/rdf-datom";
import { decodeLeanGoldenVectorLine, decodeLeanGoldenVectorJsonl, encodeLeanGoldenVectorJsonl, leanGoldenVectorsByAction } from "../../src/codecs/text/json/jsonl/eavt/lean/index.mjs";
import { LeanGoldenVectorSchema, leanGoldenVectorCarrier } from "../../src/carriers/codecs/text/json/jsonl/eavt/lean/index.mjs";
import { assertTriple, tripleId, dedupeTriples, tripleFromEavt, tripleFromDatom } from "../../src/codecs/text/json/jsonl/eavt/triple/index.mjs";
import { isEavtShape, eavtRecord, eavtId, parse as parse_2, serialize as serialize_2, serializeDatoms, toEavt, mergeEavtLogs, unfoldJson, foldJson, eavtTriple, eavtToCell, cellToEavt, eavtOrder, EAVT_JSONL, eavtProjector } from "../../src/codecs/text/json/jsonl/eavt/index.mjs";
import { jsonResource, jsonProjector } from "../../src/codecs/text/json/index.mjs";
import { jsonlProjector } from "../../src/codecs/text/json/jsonl/projector.mjs";
import { css_classes_are_factor_maps, cssVisualValuation, htmlCarrierOf, css_settles_to_valuation, cssTextFromVisualValuation, renderHtmlFiber } from "../../src/codecs/text/xml/html/index.mjs";
import { ref, isRef, escapeText, escapeAttr, slug, unmark, chargeMark, calmChargeOf, isContested, fromSection, fromCells, fromDetect, defaultMorphisms, morphismRegistry, projectArticle, project, markup, pack, verifyPacket, renderPacket, cellKey, address, lint, REF_PREFIX, chargeValueOf, shp, RFC7992_CLASSES, rfc7992Profile } from "@red-cup-engineering/html-structural-projection-service";
import { escapeHtml, attrs, classes, el } from "@red-cup-engineering/html-structural-projection-service/string-rendering";
import { decodeHtmlEntities, scanHtmlStartTags, relTokens, htmlDocumentBase } from "@red-cup-engineering/html-structural-projection-service/scan";
import { resolveNodeStyles, checkStyleResolutionSettled, checkClassMapsValid, cssTextFromResolvedStyles } from "@red-cup-engineering/css-services-section/css-style-resolution";
import { buildHtmlDocumentPlan, renderHtmlDocument } from "@red-cup-engineering/html-engineering-services-section/html-document-render";
import { htmlProjector } from "@red-cup-engineering/html-structural-projection-service";
import { defaultShapeMorphisms, projectSvg, svgProjector } from "../../src/codecs/text/xml/svg/index.mjs";
import { serialize as serialize_3, shapeMorphismRegistry, svgRoot, nodeShape, edgePath, textLines, group, anchor, background, arrowMarker, hollowTriangleMarker, defs, affirmedCharge, chargeMark as chargeMark_2, calmChargeOf as calmChargeOf_2, chargeAttributes, DEFAULT_SHAPE, chargeValueOf as chargeValueOf_2, svgInteractiveProfile, rfc7996Profile } from "@red-cup-engineering/xml-document-rendering-service/svg";
import { escapeXmlText, escapeXmlAttr, isXmlName, requireXmlName, element, text, comment, serialize as serialize_4, document, xmlProjector } from "@red-cup-engineering/xml-document-rendering-service/core";
import { jsonResource as jsonResource_2 } from "../../src/codecs/text/json/index.mjs";
import { nonBlankLines } from "@red-cup-engineering/jsonl-services-section/nonblank-lines";
import { parseLines } from "@red-cup-engineering/jsonl-services-section/parse-jsonl";
import { serializeLines } from "@red-cup-engineering/jsonl-services-section/serialize-jsonl";
import { dehydrateUtterances, rehydrateUtterances } from "../../src/writing/path.mjs";
import { action, composes, compose, isAction, fact, actionUtterances } from "../../src/running/action.mjs";
import { registeredCategory, actionIrAudit, freeTsActions, morphismCarrier } from "../../src/running/category.mjs";
import { morphismSchemaCarrier, MorphismSchema } from "../../src/carriers/running/index.mjs";
import { dispatch, dispatchAsync, actionsByVerb } from "../../src/running/dispatch.mjs";
import { resource, isResource, resourceDescriptor, resourceUtterances, literalResource } from "../../src/running/resource.mjs";
import { prompt, isPrompt, promptDescriptor, promptUtterances, actionPrompt, userMessage } from "../../src/running/prompt.mjs";
import { induceBins, collectActions, collectResources, collectPrompts } from "../../src/running/induce.mjs";
import { actionSettlementSignature, codomainSettlementWitness, codomainSettlementWitnessKey, classificationOfWitness, signatureRegime } from "../../src/running/settlement-signature.mjs";
import { operationsManifoldOf, operationsManifoldGraphOf, operationsManifoldUri, operationsManifoldResource } from "../../src/running/manifold.mjs";
import { invocationFeed } from "../../src/running/invocation.mjs";
import { streamWitnessLog, EAVT_EVENT, feedResponse } from "../../src/ledger/stream.mjs";
import { exchangeClaim, parseClaimMessage, judgementReply, judgementFrame } from "../../src/running/ws-session.mjs";
import { workType, determination, sessionWork, TRANSPORT_WORK } from "../../src/running/transport-work.mjs";
import { openSession, claim, judge, conflicts, sessionRegime, settle as settle_2 } from "../../src/running/session.mjs";
import { routeRequest, routeRequestAsync, routeManifold, routeManifoldAsync, tileManifold, actionMcpHandle, actionMcpHandleAsync, negotiateOutputWire } from "../../src/running/serving.mjs";
import { carrierNodeTree, tileCarrierNodes, routeCarrierManifold, routeCarrierManifoldAsync, domainNodeOf, isEndoMount, aggregateNodeApex, carrierManifoldIndexHtml } from "../../src/running/mounting.mjs";
import { canonicalJson, schemaAssertionId, assertSchemaAssertion, parseSchemaAssertions, serializeSchemaAssertions, mergeSchemaAssertions, unfoldSchema, foldSchema, cohereSchemaAssertions, projectSchemaAssertions, schemaAssertionTriple, schemaAssertionEavt, schemaAssertionEavtId, JSON_SCHEMA_DIALECT, schemaProjector } from "../../src/writing/schema.mjs";
import { resolveJsonPointer } from "../../src/carriers/kernel/registry.mjs";
import { createMarkdown, parseMarkdown, frontmatterConformance, markdownDataform, documentTypeFragment, documentTypeAssertions, allDocumentTypeAssertions, DOC_TYPE_STAMP, markdownProjector, markdownDocumentSchemaFragment, documentTypeDefinitions } from "../../src/writing/markdown.mjs";
import { isPresentedCategoryDiagram, requireRecord, objectFrom, morphismFrom, presentedCategoryDiagram, diagramFromCarrierCategory, layout, diagramToSvgDataform, writeMermaid, readMermaid, writeXmi, readXmi, writePlantUml, readPlantUml, settlementFiltrationStateMachineDiagram, witnessLedgerSequenceDiagram, diagramPalette, mermaidProjector, umlProjector, plantUmlProjector } from "../../src/writing/diagram.mjs";
import { presentedCategoryDiagramCarrier, presentedCategoryDiagramSchema } from "../../src/carriers/writing/diagram/index.mjs";
import { rmnProjector } from "../../src/writing/rmn.mjs";
import { RMN_JSON, extractRelationalScripts, htmlIsRelational, isRelationalTerm, parseRmn, sessionIsRelational, settleRelationalHtml, settleRelationalSession, settleRmn } from "@red-cup-engineering/relation-model-notation/reader";
import { negotiateType, negotiateEncoding, negotiateLanguage } from "@red-cup-engineering/http-services-section/negotiation";
import { parseAccept, parseAcceptEncoding, parseAcceptLanguage } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/preferences";
import { extensionType, isCompressible } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/media-type";
import { mediaTypeCorner } from "../../src/writing/http/negotiation/media-type.mjs";
import { negotiateRepresentation, representationFits } from "../../src/writing/http/negotiation/representation.mjs";
import { parseCookieHeader, serializeCookieHeader, parseSetCookie, serializeSetCookie, assertCookieName, isCookieName } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cookie";
import { signCookieValue, unsignCookieValue } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/signed-cookie";
import { parseMultipartForm, serializeMultipartForm } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/multipart-form-data";
import { parseSseStream, sseCommentFrame, sseEventFrame, sseFrame, isEventStream, sseHeaders } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event";
import { acceptKey, encodeFrame, FrameDecoder } from "@red-cup-engineering/code-websocket-frame-service";
import { firstHeader, joinedHeader, parseDirectiveList, quoteHeaderValue, splitHeaderParameters, unquoteHeaderValue } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/header-value";
import { parseContentType, serializeContentType } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-type";
import { httpDate, parseHttpDate } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/date";
import { etagList, ifMatch, ifModifiedSince, ifNoneMatch, ifRange, ifUnmodifiedSince, strongEtagMatch, weakEtagMatch } from "@red-cup-engineering/http-services-section/conditional-request";
import { byterangesCloseDelimiter, byterangesPartHeader, contentRange, multipartByterangesBody, multipartRangeBoundary, parseRange, parseRanges } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/byte-range";
import { cacheControl, parseCacheControl } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cache-control";
import { linkHeader, parseLinkHeader } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/link";
import { bearerChallenge, bearerToken } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/bearer-authentication";
import { negotiateType as negotiateType_2, negotiateEncoding as negotiateEncoding_2, negotiateLanguage as negotiateLanguage_2 } from "@red-cup-engineering/http-services-section/negotiation";
import { parseAccept as parseAccept_2, parseAcceptEncoding as parseAcceptEncoding_2, parseAcceptLanguage as parseAcceptLanguage_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/preferences";
import { extensionType as extensionType_2, isCompressible as isCompressible_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/media-type";
import { mediaTypeCorner as mediaTypeCorner_2 } from "../../src/writing/http/negotiation/media-type.mjs";
import { negotiateRepresentation as negotiateRepresentation_2, representationFits as representationFits_2 } from "../../src/writing/http/negotiation/representation.mjs";
import { parseMultipartForm as parseMultipartForm_2, serializeMultipartForm as serializeMultipartForm_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/multipart-form-data";
import { acceptKey as acceptKey_2, encodeFrame as encodeFrame_2, FrameDecoder as FrameDecoder_2 } from "@red-cup-engineering/code-websocket-frame-service";
import { assertCookieName as assertCookieName_2, isCookieName as isCookieName_2, parseCookieHeader as parseCookieHeader_2, parseSetCookie as parseSetCookie_2, serializeCookieHeader as serializeCookieHeader_2, serializeSetCookie as serializeSetCookie_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cookie";
import { signCookieValue as signCookieValue_2, unsignCookieValue as unsignCookieValue_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/signed-cookie";
import { parseSseStream as parseSseStream_2, sseCommentFrame as sseCommentFrame_2, sseEventFrame as sseEventFrame_2, sseFrame as sseFrame_2, isEventStream as isEventStream_2, sseHeaders as sseHeaders_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event";
import { dehydrateUtterances as dehydrateUtterances_2, rehydrateUtterances as rehydrateUtterances_2, eavtLogPaths, pathProjector } from "../../src/writing/path.mjs";
import { termKey, address as address_2, termOf, addressNested, termOfNested, composeTerm, decomposeTerm, namespaceOf, withinNamespace, segment, logPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/address";
import { sanitizeSegment, desanitizeSegment } from "@red-cup-engineering/computer-filepath-engineering-services-section/segments";
import { normalizePath, pathParent, pathBasename, pathPoint, pathOfPoint, POSIX_PATHNAME_PATTERN, isPathname, validPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";
import { entropyBitsAtBoundary, klBitsAtBoundary, mutualInformationBitsAtBoundary } from "../../src/writing/evidence.mjs";
import { polyFromInts, polyToInts } from "../../src/writing/spectral.mjs";
import { spanFromWitness, witnessFromSpan, otlpFromWitnesses, otlpFromAgentEventChronicle, agentEventWitnessesFromOtlp, witnessesFromOtlp, otlpBulkCells } from "../../src/writing/otlp.mjs";
import { agentEventChronicleCarrier, agentEventChronicleSchema, otlpSpanCarrier, otlpSpanSchema, otlpTracesCarrier, otlpTracesSchema } from "../../src/carriers/writing/otlp/index.mjs";
import { stringProjector } from "../../src/writing/text.mjs";
import { jsonResource as jsonResource_3 } from "../../src/codecs/text/json/index.mjs";
import { parseLines as parseLines_2 } from "@red-cup-engineering/jsonl-services-section/parse-jsonl";
import { serializeLines as serializeLines_2 } from "@red-cup-engineering/jsonl-services-section/serialize-jsonl";
import { decodeToml, encodeToml } from "@red-cup-engineering/toml-services-section/toml-codec";
import { iriRef, turtleLiteral } from "../../src/writing/turtle.mjs";
import { JSON_SCHEMA_DIALECT as JSON_SCHEMA_DIALECT_2, schemaProjector as schemaProjector_2, unfoldSchema as unfoldSchema_2, foldSchema as foldSchema_2, cohereSchemaAssertions as cohereSchemaAssertions_2, projectSchemaAssertions as projectSchemaAssertions_2 } from "../../src/writing/schema.mjs";
import { resolveJsonPointer as resolveJsonPointer_2 } from "../../src/carriers/kernel/registry.mjs";
import { markdownProjector as markdownProjector_2, markdownDataform as markdownDataform_2, createMarkdown as createMarkdown_2, markdownDocumentSchemaFragment as markdownDocumentSchemaFragment_2, documentTypeDefinitions as documentTypeDefinitions_2, documentTypeFragment as documentTypeFragment_2, documentTypeAssertions as documentTypeAssertions_2, allDocumentTypeAssertions as allDocumentTypeAssertions_2 } from "../../src/writing/markdown.mjs";
import { presentedCategoryDiagramSchema as presentedCategoryDiagramSchema_2, presentedCategoryDiagramCarrier as presentedCategoryDiagramCarrier_2 } from "../../src/carriers/writing/diagram/index.mjs";
import { presentedCategoryDiagram as presentedCategoryDiagram_2, isPresentedCategoryDiagram as isPresentedCategoryDiagram_2, diagramFromCarrierCategory as diagramFromCarrierCategory_2, objectFrom as objectFrom_2, morphismFrom as morphismFrom_2, diagramToSvgDataform as diagramToSvgDataform_2, diagramPalette as diagramPalette_2, settlementFiltrationStateMachineDiagram as settlementFiltrationStateMachineDiagram_2, witnessLedgerSequenceDiagram as witnessLedgerSequenceDiagram_2, mermaidProjector as mermaidProjector_2, umlProjector as umlProjector_2, plantUmlProjector as plantUmlProjector_2, writeMermaid as writeMermaid_2, readMermaid as readMermaid_2, writeXmi as writeXmi_2, readXmi as readXmi_2, writePlantUml as writePlantUml_2, readPlantUml as readPlantUml_2 } from "../../src/writing/diagram.mjs";
import { RMN_JSON as RMN_JSON_2, isRelationalTerm as isRelationalTerm_2, parseRmn as parseRmn_2, settleRmn as settleRmn_2, extractRelationalScripts as extractRelationalScripts_2, htmlIsRelational as htmlIsRelational_2, settleRelationalHtml as settleRelationalHtml_2, sessionIsRelational as sessionIsRelational_2, settleRelationalSession as settleRelationalSession_2 } from "@red-cup-engineering/relation-model-notation/reader";
import { rmnProjector as rmnProjector_2 } from "../../src/writing/rmn.mjs";
import { address as address_3, logPath as logPath_2, termKey as termKey_2, segment as segment_2, composeTerm as composeTerm_2, decomposeTerm as decomposeTerm_2, namespaceOf as namespaceOf_2, withinNamespace as withinNamespace_2, termOf as termOf_2, termOfNested as termOfNested_2, addressNested as addressNested_2 } from "@red-cup-engineering/computer-filepath-engineering-services-section/address";
import { eavtLogPaths as eavtLogPaths_2, dehydrateUtterances as dehydrateUtterances_3, rehydrateUtterances as rehydrateUtterances_3, pathProjector as pathProjector_2 } from "../../src/writing/path.mjs";
import { sanitizeSegment as sanitizeSegment_2, desanitizeSegment as desanitizeSegment_2 } from "@red-cup-engineering/computer-filepath-engineering-services-section/segments";
import { normalizePath as normalizePath_2, pathParent as pathParent_2, pathBasename as pathBasename_2, pathPoint as pathPoint_2, pathOfPoint as pathOfPoint_2, isPathname as isPathname_2, validPath as validPath_2 } from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";
import { entropyBitsAtBoundary as entropyBitsAtBoundary_2, klBitsAtBoundary as klBitsAtBoundary_2, mutualInformationBitsAtBoundary as mutualInformationBitsAtBoundary_2 } from "../../src/writing/evidence.mjs";
import { otlpSpanSchema as otlpSpanSchema_2, otlpTracesSchema as otlpTracesSchema_2, agentEventChronicleSchema as agentEventChronicleSchema_2, otlpSpanCarrier as otlpSpanCarrier_2, otlpTracesCarrier as otlpTracesCarrier_2, agentEventChronicleCarrier as agentEventChronicleCarrier_2 } from "../../src/carriers/writing/otlp/index.mjs";
import { spanFromWitness as spanFromWitness_2, witnessFromSpan as witnessFromSpan_2, otlpFromWitnesses as otlpFromWitnesses_2, otlpFromAgentEventChronicle as otlpFromAgentEventChronicle_2, witnessesFromOtlp as witnessesFromOtlp_2, agentEventWitnessesFromOtlp as agentEventWitnessesFromOtlp_2, otlpBulkCells as otlpBulkCells_2 } from "../../src/writing/otlp.mjs";
import { quadraticToNumber } from "../../src/writing/quadratic.mjs";
import { printType, generateDeclaration } from "../../src/writing/print.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("no compatibility ownership shims", () => {
  it("does not keep moved source files as facade surfaces", () => {
    const oldPaths = [
      "src/actions.mts",
      "src/carriers.mts",
      "src/running/codecs.mts",
      "scripts/cli.mts",
      "scripts/serve.mts",
      "src/writing/eavt.mts",
      "src/writing/datom.mts",
      "src/writing/triple.mts",
      "src/writing/json.mts",
      "src/writing/html.mts",
      "src/writing/exact-number.mts",
      "src/writing/lean/index.mts",
      "src/writing/xml/index.mts",
      "src/writing/xml/svg/index.mts",
      "src/writing/xml/svg/radial/index.mts",
      "src/codecs/eavt.mts",
      "src/codecs/datom.mts",
      "src/codecs/triple.mts",
      "src/codecs/wire.mts",
    ];
    assert.deepEqual(oldPaths.filter((path) => existsSync(resolve(root, path))), []);
  });

  it("publishes the nested codec tree without flat package shims", async () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    for (const subpath of [
      "./carriers",
      "./actions",
      "./codecs/text/json",
      "./codecs/text/json/jsonl/eavt",
      "./codecs/text/xml/html",
      "./codecs/text/xml/svg",
      "./codecs/boundary/wire",
    ]) {
      assert.ok(pkg.exports[subpath], `${subpath} must be an explicit export`);
    }
    // "./codecs", "./codecs/text", "./codecs/text/json/jsonl", and
    // "./codecs/text/json/jsonl/eavt/datom" were pure re-export barrels: condensed away, their
    // consumers now import the concrete modules by subpath instead of through an aggregate.
    for (const subpath of ["./codecs", "./codecs/text", "./codecs/text/json/jsonl", "./codecs/text/json/jsonl/eavt/datom"]) {
      assert.equal(pkg.exports[subpath], undefined, `${subpath} was a barrel and should stay condensed away`);
    }
    assert.equal(pkg.exports["./running/codecs"], undefined);
    assert.equal(pkg.exports["./codecs/wire"], undefined);
    assert.equal(pkg.exports["./codecs/eavt"], undefined);
    assert.equal(pkg.exports["./writing/lean"], undefined);

    const running = await ({ action, composes, compose, isAction, fact, actionUtterances, registeredCategory, actionIrAudit, freeTsActions, morphismCarrier, morphismSchemaCarrier, MorphismSchema, dispatch, dispatchAsync, actionsByVerb, resource, isResource, resourceDescriptor, resourceUtterances, literalResource, prompt, isPrompt, promptDescriptor, promptUtterances, actionPrompt, userMessage, induceBins, collectActions, collectResources, collectPrompts, actionSettlementSignature, codomainSettlementWitness, codomainSettlementWitnessKey, classificationOfWitness, signatureRegime, operationsManifoldOf, operationsManifoldGraphOf, operationsManifoldUri, operationsManifoldResource, invocationFeed, streamWitnessLog, EAVT_EVENT, feedResponse, exchangeClaim, parseClaimMessage, judgementReply, judgementFrame, workType, determination, sessionWork, TRANSPORT_WORK, openSession, claim, judge, conflicts, sessionRegime, settle: settle_2, routeRequest, routeRequestAsync, routeManifold, routeManifoldAsync, tileManifold, actionMcpHandle, actionMcpHandleAsync, negotiateOutputWire, carrierNodeTree, tileCarrierNodes, routeCarrierManifold, routeCarrierManifoldAsync, domainNodeOf, isEndoMount, aggregateNodeApex, carrierManifoldIndexHtml });
    for (const name of ["wireCodec", "wireOf", "WIRE_CODEC_NAMES", "rmnCodec"]) {
      assert.equal(Object.hasOwn(running, name), false, `running must not own ${name}`);
    }

    const codecs = await ({ boundary: { wire: { wireOf, wireCodec, wireByMediaType, stringCodec, jsonCodec, eavtCodec, rmnCodec, svgCodec, mermaidCodec, xmiCodec, plantUmlCodec, formCodec, WIRE_CODEC_NAMES } }, host: { javascript: { crypto: { sha256Hex, sha1Base64, hmacSha256Base64Url, timingSafeStringEqual }, numbers: { toNumber, integerToDecimalString, ratToExactString, parseDecimal, fromDecimalString, toDecimalString, toCount, fromCount, toInt, fromInt, ratFromInt, fromRatio, fromInts } } }, text: { json: { jsonl: { eavt: { datom: { ASSERT, RETRACT, toDatom, isDatomShape, settledDatom, datom, parse, serialize, assertObjectDatom, assertDatomFact, retractDatomFact, objectDatomId, currentDatomValue, objectDatomsAsOf, foldObjectDatoms, objectDatomWitnesses, objectDatomStatements, settle, recordPathFor, readDatomsAtPath, commitSettledRecord, admitRdfDatom, canonicalEavtDatomJsonl, EAVT_DATOM_JSONL_MEDIA_TYPE }, lean: { decodeLeanGoldenVectorLine, decodeLeanGoldenVectorJsonl, encodeLeanGoldenVectorJsonl, leanGoldenVectorsByAction, LeanGoldenVectorSchema, leanGoldenVectorCarrier }, triple: { assertTriple, tripleId, dedupeTriples, tripleFromEavt, tripleFromDatom }, isEavtShape, eavtRecord, eavtId, parse: parse_2, serialize: serialize_2, serializeDatoms, toEavt, mergeEavtLogs, unfoldJson, foldJson, eavtTriple, eavtToCell, cellToEavt, eavtOrder, EAVT_JSONL, eavtProjector } }, jsonResource, jsonProjector, jsonlProjector }, xml: { html: { css_classes_are_factor_maps, cssVisualValuation, htmlCarrierOf, css_settles_to_valuation, cssTextFromVisualValuation, renderHtmlFiber, ref, isRef, escapeText, escapeAttr, slug, unmark, chargeMark, calmChargeOf, isContested, fromSection, fromCells, fromDetect, defaultMorphisms, morphismRegistry, projectArticle, project, markup, pack, verifyPacket, renderPacket, cellKey, address, lint, REF_PREFIX, chargeValueOf, shp, RFC7992_CLASSES, rfc7992Profile, escapeHtml, attrs, classes, el, decodeHtmlEntities, scanHtmlStartTags, relTokens, htmlDocumentBase, resolveNodeStyles, checkStyleResolutionSettled, checkClassMapsValid, cssTextFromResolvedStyles, buildHtmlDocumentPlan, renderHtmlDocument, htmlProjector }, svg: { defaultShapeMorphisms, projectSvg, svgProjector, serialize: serialize_3, shapeMorphismRegistry, svgRoot, nodeShape, edgePath, textLines, group, anchor, background, arrowMarker, hollowTriangleMarker, defs, affirmedCharge, chargeMark: chargeMark_2, calmChargeOf: calmChargeOf_2, chargeAttributes, DEFAULT_SHAPE, chargeValueOf: chargeValueOf_2, svgInteractiveProfile, rfc7996Profile }, escapeXmlText, escapeXmlAttr, isXmlName, requireXmlName, element, text, comment, serialize: serialize_4, document, xmlProjector } }, jsonResource: jsonResource_2, nonBlankLines, parseLines, serializeLines, dehydrateUtterances, rehydrateUtterances });
    assert.equal(typeof codecs.boundary.wire.wireCodec, "function");
    assert.equal(Object.hasOwn(codecs, "wireCodec"), false);

    const writing = await ({ schema: { canonicalJson, schemaAssertionId, assertSchemaAssertion, parseSchemaAssertions, serializeSchemaAssertions, mergeSchemaAssertions, unfoldSchema, foldSchema, cohereSchemaAssertions, projectSchemaAssertions, schemaAssertionTriple, schemaAssertionEavt, schemaAssertionEavtId, JSON_SCHEMA_DIALECT, schemaProjector, resolveJsonPointer }, markdown: { createMarkdown, parseMarkdown, frontmatterConformance, markdownDataform, documentTypeFragment, documentTypeAssertions, allDocumentTypeAssertions, DOC_TYPE_STAMP, markdownProjector, markdownDocumentSchemaFragment, documentTypeDefinitions }, diagram: { isPresentedCategoryDiagram, requireRecord, objectFrom, morphismFrom, presentedCategoryDiagram, diagramFromCarrierCategory, layout, diagramToSvgDataform, writeMermaid, readMermaid, writeXmi, readXmi, writePlantUml, readPlantUml, settlementFiltrationStateMachineDiagram, witnessLedgerSequenceDiagram, diagramPalette, mermaidProjector, umlProjector, plantUmlProjector, presentedCategoryDiagramCarrier, presentedCategoryDiagramSchema }, rmn: { rmnProjector, RMN_JSON, extractRelationalScripts, htmlIsRelational, isRelationalTerm, parseRmn, sessionIsRelational, settleRelationalHtml, settleRelationalSession, settleRmn }, http: { negotiation: { negotiateType, negotiateEncoding, negotiateLanguage, parseAccept, parseAcceptEncoding, parseAcceptLanguage, extensionType, isCompressible, mediaTypeCorner, negotiateRepresentation, representationFits }, cookie: { parseCookieHeader, serializeCookieHeader, parseSetCookie, serializeSetCookie, assertCookieName, isCookieName, signCookieValue, unsignCookieValue }, multipart: { parseMultipartForm, serializeMultipartForm }, sse: { parseSseStream, sseCommentFrame, sseEventFrame, sseFrame, isEventStream, sseHeaders }, ws: { acceptKey, encodeFrame, FrameDecoder }, firstHeader, joinedHeader, parseDirectiveList, quoteHeaderValue, splitHeaderParameters, unquoteHeaderValue, parseContentType, serializeContentType, httpDate, parseHttpDate, etagList, ifMatch, ifModifiedSince, ifNoneMatch, ifRange, ifUnmodifiedSince, strongEtagMatch, weakEtagMatch, byterangesCloseDelimiter, byterangesPartHeader, contentRange, multipartByterangesBody, multipartRangeBoundary, parseRange, parseRanges, cacheControl, parseCacheControl, linkHeader, parseLinkHeader, bearerChallenge, bearerToken, negotiateType: negotiateType_2, negotiateEncoding: negotiateEncoding_2, negotiateLanguage: negotiateLanguage_2, parseAccept: parseAccept_2, parseAcceptEncoding: parseAcceptEncoding_2, parseAcceptLanguage: parseAcceptLanguage_2, extensionType: extensionType_2, isCompressible: isCompressible_2, mediaTypeCorner: mediaTypeCorner_2, negotiateRepresentation: negotiateRepresentation_2, representationFits: representationFits_2, parseMultipartForm: parseMultipartForm_2, serializeMultipartForm: serializeMultipartForm_2, acceptKey: acceptKey_2, encodeFrame: encodeFrame_2, FrameDecoder: FrameDecoder_2, assertCookieName: assertCookieName_2, isCookieName: isCookieName_2, parseCookieHeader: parseCookieHeader_2, parseSetCookie: parseSetCookie_2, serializeCookieHeader: serializeCookieHeader_2, serializeSetCookie: serializeSetCookie_2, signCookieValue: signCookieValue_2, unsignCookieValue: unsignCookieValue_2, parseSseStream: parseSseStream_2, sseCommentFrame: sseCommentFrame_2, sseEventFrame: sseEventFrame_2, sseFrame: sseFrame_2, isEventStream: isEventStream_2, sseHeaders: sseHeaders_2 }, path: { dehydrateUtterances: dehydrateUtterances_2, rehydrateUtterances: rehydrateUtterances_2, eavtLogPaths, pathProjector, termKey, address: address_2, termOf, addressNested, termOfNested, composeTerm, decomposeTerm, namespaceOf, withinNamespace, segment, logPath, sanitizeSegment, desanitizeSegment, normalizePath, pathParent, pathBasename, pathPoint, pathOfPoint, POSIX_PATHNAME_PATTERN, isPathname, validPath }, evidence: { entropyBitsAtBoundary, klBitsAtBoundary, mutualInformationBitsAtBoundary }, spectral: { polyFromInts, polyToInts }, otlp: { spanFromWitness, witnessFromSpan, otlpFromWitnesses, otlpFromAgentEventChronicle, agentEventWitnessesFromOtlp, witnessesFromOtlp, otlpBulkCells, agentEventChronicleCarrier, agentEventChronicleSchema, otlpSpanCarrier, otlpSpanSchema, otlpTracesCarrier, otlpTracesSchema }, stringProjector, jsonResource: jsonResource_3, parseLines: parseLines_2, serializeLines: serializeLines_2, decodeToml, encodeToml, iriRef, turtleLiteral, JSON_SCHEMA_DIALECT: JSON_SCHEMA_DIALECT_2, schemaProjector: schemaProjector_2, unfoldSchema: unfoldSchema_2, foldSchema: foldSchema_2, cohereSchemaAssertions: cohereSchemaAssertions_2, projectSchemaAssertions: projectSchemaAssertions_2, resolveJsonPointer: resolveJsonPointer_2, markdownProjector: markdownProjector_2, markdownDataform: markdownDataform_2, createMarkdown: createMarkdown_2, markdownDocumentSchemaFragment: markdownDocumentSchemaFragment_2, documentTypeDefinitions: documentTypeDefinitions_2, documentTypeFragment: documentTypeFragment_2, documentTypeAssertions: documentTypeAssertions_2, allDocumentTypeAssertions: allDocumentTypeAssertions_2, presentedCategoryDiagramSchema: presentedCategoryDiagramSchema_2, presentedCategoryDiagramCarrier: presentedCategoryDiagramCarrier_2, presentedCategoryDiagram: presentedCategoryDiagram_2, isPresentedCategoryDiagram: isPresentedCategoryDiagram_2, diagramFromCarrierCategory: diagramFromCarrierCategory_2, objectFrom: objectFrom_2, morphismFrom: morphismFrom_2, diagramToSvgDataform: diagramToSvgDataform_2, diagramPalette: diagramPalette_2, settlementFiltrationStateMachineDiagram: settlementFiltrationStateMachineDiagram_2, witnessLedgerSequenceDiagram: witnessLedgerSequenceDiagram_2, mermaidProjector: mermaidProjector_2, umlProjector: umlProjector_2, plantUmlProjector: plantUmlProjector_2, writeMermaid: writeMermaid_2, readMermaid: readMermaid_2, writeXmi: writeXmi_2, readXmi: readXmi_2, writePlantUml: writePlantUml_2, readPlantUml: readPlantUml_2, RMN_JSON: RMN_JSON_2, isRelationalTerm: isRelationalTerm_2, parseRmn: parseRmn_2, settleRmn: settleRmn_2, extractRelationalScripts: extractRelationalScripts_2, htmlIsRelational: htmlIsRelational_2, settleRelationalHtml: settleRelationalHtml_2, sessionIsRelational: sessionIsRelational_2, settleRelationalSession: settleRelationalSession_2, rmnProjector: rmnProjector_2, address: address_3, logPath: logPath_2, termKey: termKey_2, segment: segment_2, composeTerm: composeTerm_2, decomposeTerm: decomposeTerm_2, namespaceOf: namespaceOf_2, withinNamespace: withinNamespace_2, termOf: termOf_2, termOfNested: termOfNested_2, addressNested: addressNested_2, eavtLogPaths: eavtLogPaths_2, dehydrateUtterances: dehydrateUtterances_3, rehydrateUtterances: rehydrateUtterances_3, pathProjector: pathProjector_2, sanitizeSegment: sanitizeSegment_2, desanitizeSegment: desanitizeSegment_2, normalizePath: normalizePath_2, pathParent: pathParent_2, pathBasename: pathBasename_2, pathPoint: pathPoint_2, pathOfPoint: pathOfPoint_2, isPathname: isPathname_2, validPath: validPath_2, entropyBitsAtBoundary: entropyBitsAtBoundary_2, klBitsAtBoundary: klBitsAtBoundary_2, mutualInformationBitsAtBoundary: mutualInformationBitsAtBoundary_2, otlpSpanSchema: otlpSpanSchema_2, otlpTracesSchema: otlpTracesSchema_2, agentEventChronicleSchema: agentEventChronicleSchema_2, otlpSpanCarrier: otlpSpanCarrier_2, otlpTracesCarrier: otlpTracesCarrier_2, agentEventChronicleCarrier: agentEventChronicleCarrier_2, spanFromWitness: spanFromWitness_2, witnessFromSpan: witnessFromSpan_2, otlpFromWitnesses: otlpFromWitnesses_2, otlpFromAgentEventChronicle: otlpFromAgentEventChronicle_2, witnessesFromOtlp: witnessesFromOtlp_2, agentEventWitnessesFromOtlp: agentEventWitnessesFromOtlp_2, otlpBulkCells: otlpBulkCells_2, quadraticToNumber, printType, generateDeclaration });
    for (const name of ["canonical", "parseJson", "eavtProjector", "datom", "triple", "projectRadial", "svgProjector"]) {
      assert.equal(Object.hasOwn(writing, name), false, `writing must not re-export ${name}`);
    }
  });
});
