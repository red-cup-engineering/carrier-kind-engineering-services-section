import { createMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/create-markdown-document";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { canonical, parse as parseJson } from "@red-cup-engineering/json-services-section";
import { settledDatom as datom } from "@red-cup-engineering/datom/settle-row";
import { foldObjectDatoms } from "@red-cup-engineering/datom/fold-datom-evidence";
import { escapeText } from "@red-cup-engineering/html-structural-projection-service";
import { svgProjector } from "@red-cup-engineering/signgraph/diagram-svg";
import { checkClassMapsValid as css_classes_are_factor_maps, resolveNodeStyles as cssVisualValuation, checkStyleResolutionSettled as css_settles_to_valuation, cssTextFromResolvedStyles as cssTextFromVisualValuation } from "@red-cup-engineering/css-services-section/css-style-resolution";
import { renderHtmlDocument as renderHtmlFiber } from "@red-cup-engineering/html-engineering-services-section/html-document-render";
import { htmlCarrierOf } from "@red-cup-engineering/html-engineering-services-section/html-document-render";
import { ref, isRef, escapeText as escapeText_2, escapeAttr, slug, unmark, readingMark, calmReadingOf, isContested, fromSection, fromCells, fromDetect, defaultMorphisms, morphismRegistry, projectArticle, project, markup, pack, verifyPacket, renderPacket, cellKey, address, lint, REF_PREFIX, readingValueOf, shp, RFC7992_CLASSES, rfc7992Profile } from "@red-cup-engineering/html-structural-projection-service";
import { escapeHtml, attrs, el } from "@red-cup-engineering/html-structural-projection-service/string-rendering";
import { classes } from "@red-cup-engineering/computer-data-serialization-services-section/microformats";
import { decodeHtmlEntities, scanHtmlStartTags, relTokens, htmlDocumentBase } from "@red-cup-engineering/html-structural-projection-service/scan";
import { resolveNodeStyles, checkStyleResolutionSettled, checkClassMapsValid, cssTextFromResolvedStyles } from "@red-cup-engineering/css-services-section/css-style-resolution";
import { buildHtmlDocumentPlan, renderHtmlDocument } from "@red-cup-engineering/html-engineering-services-section/html-document-render";
import { htmlProjector } from "@red-cup-engineering/html-structural-projection-service";
import { defaultShapeMorphisms, projectSvg, svgProjector as svgProjector_2 } from "@red-cup-engineering/xml-document-rendering-service/svg";
import { serialize, shapeMorphismRegistry, svgRoot, nodeShape, edgePath, textLines, group, anchor, background, arrowMarker, hollowTriangleMarker, defs, affirmedReading, readingMark as readingMark_2, calmReadingOf as calmReadingOf_2, readingAttributes, DEFAULT_SHAPE, readingValueOf as readingValueOf_2, svgInteractiveProfile, rfc7996Profile } from "@red-cup-engineering/xml-document-rendering-service/svg";
import { escapeXmlText, escapeXmlAttr, isXmlName, requireXmlName, element, text, comment, serialize as serialize_2, document, xmlProjector } from "@red-cup-engineering/xml-document-rendering-service/core";
import { serialize as serialize_3, affirmedReading as affirmedReading_2, projectRadial, segmentOfMeme, radialFromValuation, radialFromClosureStages, readingPalette, radialProjector } from "@red-cup-engineering/xml-document-rendering-service/svg/radial";
import { negotiateType, negotiateEncoding, negotiateLanguage } from "@red-cup-engineering/http-services-section/negotiation";
import { parseAccept, parseAcceptEncoding, parseAcceptLanguage } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/preferences";
import { extensionType, isCompressible } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/media-type";
import { mediaTypeCorner } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/media-type";
import { negotiateRepresentation } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/representation";
import { representationFits } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/representation";
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
import { mediaTypeCorner as mediaTypeCorner_2 } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/media-type";
import { negotiateRepresentation as negotiateRepresentation_2 } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/representation";
import { representationFits as representationFits_2 } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/representation";
import { parseMultipartForm as parseMultipartForm_2, serializeMultipartForm as serializeMultipartForm_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/multipart-form-data";
import { acceptKey as acceptKey_2, encodeFrame as encodeFrame_2, FrameDecoder as FrameDecoder_2 } from "@red-cup-engineering/code-websocket-frame-service";
import { assertCookieName as assertCookieName_2, isCookieName as isCookieName_2, parseCookieHeader as parseCookieHeader_2, parseSetCookie as parseSetCookie_2, serializeCookieHeader as serializeCookieHeader_2, serializeSetCookie as serializeSetCookie_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cookie";
import { signCookieValue as signCookieValue_2, unsignCookieValue as unsignCookieValue_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/signed-cookie";
import { parseSseStream as parseSseStream_2, sseCommentFrame as sseCommentFrame_2, sseEventFrame as sseEventFrame_2, sseFrame as sseFrame_2, isEventStream as isEventStream_2, sseHeaders as sseHeaders_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event";
import { parseMultipartForm as parseMultipartForm_3, serializeMultipartForm as serializeMultipartForm_3 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/multipart-form-data";
import { parseSseStream as parseSseStream_3, sseCommentFrame as sseCommentFrame_3, sseEventFrame as sseEventFrame_3, sseFrame as sseFrame_3, isEventStream as isEventStream_3, sseHeaders as sseHeaders_3 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event";
import { acceptKey as acceptKey_3, encodeFrame as encodeFrame_3, FrameDecoder as FrameDecoder_3 } from "@red-cup-engineering/code-websocket-frame-service";
import { schemaAssertionId, assertSchemaAssertion, parseSchemaAssertions, serializeSchemaAssertions, mergeSchemaAssertions, unfoldSchema, foldSchema, cohereSchemaAssertions, projectSchemaAssertions, schemaAssertionTriple, schemaAssertionEavt, schemaAssertionEavtId, JSON_SCHEMA_DIALECT, schemaProjector } from "@red-cup-engineering/json-schema-services-section/schema-assertions";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { resolveJsonPointer } from "@red-cup-engineering/json-services-section/resolve-json-pointer";
import { parseMarkdown, frontmatterConformance, markdownDataform, documentTypeFragment, documentTypeAssertions, allDocumentTypeAssertions, DOC_TYPE_STAMP, markdownProjector, markdownDocumentSchemaFragment, documentTypeDefinitions } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { isPresentedCategoryDiagram, requireRecord, objectFrom, morphismFrom, presentedCategoryDiagram, diagramFromCarrierCategory, layout, diagramToSvgDataform, writeMermaid, readMermaid, writeXmi, readXmi, writePlantUml, readPlantUml, witnessLedgerSequenceDiagram, diagramPalette, mermaidProjector, umlProjector, plantUmlProjector } from "@red-cup-engineering/signgraph/diagram";
import { presentedCategoryDiagramCarrier, presentedCategoryDiagramSchema } from "@red-cup-engineering/signgraph/diagram";
import { senProjector } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/projector";
import { SEN_JSON, extractRelationalScripts, htmlIsRelational, isRelationalTerm, parseSen, sessionIsRelational, settleRelationalHtml, settleRelationalSession, settleSen } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/reader";
import { negotiateType as negotiateType_3, negotiateEncoding as negotiateEncoding_3, negotiateLanguage as negotiateLanguage_3 } from "@red-cup-engineering/http-services-section/negotiation";
import { parseAccept as parseAccept_3, parseAcceptEncoding as parseAcceptEncoding_3, parseAcceptLanguage as parseAcceptLanguage_3 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/preferences";
import { extensionType as extensionType_3, isCompressible as isCompressible_3 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/media-type";
import { mediaTypeCorner as mediaTypeCorner_3 } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/media-type";
import { negotiateRepresentation as negotiateRepresentation_3 } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/representation";
import { representationFits as representationFits_3 } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/representation";
import { parseCookieHeader as parseCookieHeader_3, serializeCookieHeader as serializeCookieHeader_3, parseSetCookie as parseSetCookie_3, serializeSetCookie as serializeSetCookie_3, assertCookieName as assertCookieName_3, isCookieName as isCookieName_3 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cookie";
import { signCookieValue as signCookieValue_3, unsignCookieValue as unsignCookieValue_3 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/signed-cookie";
import { parseMultipartForm as parseMultipartForm_4, serializeMultipartForm as serializeMultipartForm_4 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/multipart-form-data";
import { parseSseStream as parseSseStream_4, sseCommentFrame as sseCommentFrame_4, sseEventFrame as sseEventFrame_4, sseFrame as sseFrame_4, isEventStream as isEventStream_4, sseHeaders as sseHeaders_4 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event";
import { acceptKey as acceptKey_4, encodeFrame as encodeFrame_4, FrameDecoder as FrameDecoder_4 } from "@red-cup-engineering/code-websocket-frame-service";
import { firstHeader as firstHeader_2, joinedHeader as joinedHeader_2, parseDirectiveList as parseDirectiveList_2, quoteHeaderValue as quoteHeaderValue_2, splitHeaderParameters as splitHeaderParameters_2, unquoteHeaderValue as unquoteHeaderValue_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/header-value";
import { parseContentType as parseContentType_2, serializeContentType as serializeContentType_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-type";
import { httpDate as httpDate_2, parseHttpDate as parseHttpDate_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/date";
import { etagList as etagList_2, ifMatch as ifMatch_2, ifModifiedSince as ifModifiedSince_2, ifNoneMatch as ifNoneMatch_2, ifRange as ifRange_2, ifUnmodifiedSince as ifUnmodifiedSince_2, strongEtagMatch as strongEtagMatch_2, weakEtagMatch as weakEtagMatch_2 } from "@red-cup-engineering/http-services-section/conditional-request";
import { byterangesCloseDelimiter as byterangesCloseDelimiter_2, byterangesPartHeader as byterangesPartHeader_2, contentRange as contentRange_2, multipartByterangesBody as multipartByterangesBody_2, multipartRangeBoundary as multipartRangeBoundary_2, parseRange as parseRange_2, parseRanges as parseRanges_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/byte-range";
import { cacheControl as cacheControl_2, parseCacheControl as parseCacheControl_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cache-control";
import { linkHeader as linkHeader_2, parseLinkHeader as parseLinkHeader_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/link";
import { bearerChallenge as bearerChallenge_2, bearerToken as bearerToken_2 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/bearer-authentication";
import { negotiateType as negotiateType_4, negotiateEncoding as negotiateEncoding_4, negotiateLanguage as negotiateLanguage_4 } from "@red-cup-engineering/http-services-section/negotiation";
import { parseAccept as parseAccept_4, parseAcceptEncoding as parseAcceptEncoding_4, parseAcceptLanguage as parseAcceptLanguage_4 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/preferences";
import { extensionType as extensionType_4, isCompressible as isCompressible_4 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/media-type";
import { mediaTypeCorner as mediaTypeCorner_4 } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/media-type";
import { negotiateRepresentation as negotiateRepresentation_4 } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/representation";
import { representationFits as representationFits_4 } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/representation";
import { parseMultipartForm as parseMultipartForm_5, serializeMultipartForm as serializeMultipartForm_5 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/multipart-form-data";
import { acceptKey as acceptKey_5, encodeFrame as encodeFrame_5, FrameDecoder as FrameDecoder_5 } from "@red-cup-engineering/code-websocket-frame-service";
import { assertCookieName as assertCookieName_4, isCookieName as isCookieName_4, parseCookieHeader as parseCookieHeader_4, parseSetCookie as parseSetCookie_4, serializeCookieHeader as serializeCookieHeader_4, serializeSetCookie as serializeSetCookie_4 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cookie";
import { signCookieValue as signCookieValue_4, unsignCookieValue as unsignCookieValue_4 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/signed-cookie";
import { parseSseStream as parseSseStream_5, sseCommentFrame as sseCommentFrame_5, sseEventFrame as sseEventFrame_5, sseFrame as sseFrame_5, isEventStream as isEventStream_5, sseHeaders as sseHeaders_5 } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event";
import { dehydrateUtterances, rehydrateUtterances, eavtLogPaths, pathProjector } from "@red-cup-engineering/eavt/log-path";
import { termKey, address as address_2, termOf, addressNested, termOfNested, composeTerm, decomposeTerm, namespaceOf, withinNamespace, segment, logPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/address";
import { sanitizeSegment, desanitizeSegment } from "@red-cup-engineering/computer-filepath-engineering-services-section/segments";
import { normalizePath, pathParent, pathBasename, pathPoint, pathOfPoint, POSIX_PATHNAME_PATTERN, isPathname, validPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";
import { entropyBitsAtBoundary, klBitsAtBoundary, mutualInformationBitsAtBoundary } from "@red-cup-engineering/metrologic/number/evidence-bits";
import { polyFromInts, polyToInts } from "@red-cup-engineering/metrologic/number/polynomial-ints";
import { spanFromStatement, statementFromSpan, otlpFromStatements, otlpFromAgentEventChronicle, agentEventStatementsFromOtlp, statementsFromOtlp, otlpBulkCells } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp";
import { agentEventChronicleContract, agentEventChronicleSchema, otlpSpanContract, otlpSpanSchema, otlpTracesContract, otlpTracesSchema } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp";
import { stringProjector } from "@red-cup-engineering/computer-content-engineering-services-section/text-projector";
import { parseLines } from "@red-cup-engineering/jsonl-services-section/parse-jsonl";
import { serializeLines } from "@red-cup-engineering/jsonl-services-section/serialize-jsonl";
import { decodeToml, encodeToml } from "@red-cup-engineering/toml-services-section/toml-codec";
import { iriRef, turtleLiteral } from "@red-cup-engineering/turtle-services-section/turtle";
import { JSON_SCHEMA_DIALECT as JSON_SCHEMA_DIALECT_2, schemaProjector as schemaProjector_2, unfoldSchema as unfoldSchema_2, foldSchema as foldSchema_2, cohereSchemaAssertions as cohereSchemaAssertions_2, projectSchemaAssertions as projectSchemaAssertions_2 } from "@red-cup-engineering/json-schema-services-section/schema-assertions";
import { resolveJsonPointer as resolveJsonPointer_2 } from "@red-cup-engineering/json-services-section/resolve-json-pointer";
import { markdownProjector as markdownProjector_2, markdownDataform as markdownDataform_2, markdownDocumentSchemaFragment as markdownDocumentSchemaFragment_2, documentTypeDefinitions as documentTypeDefinitions_2, documentTypeFragment as documentTypeFragment_2, documentTypeAssertions as documentTypeAssertions_2, allDocumentTypeAssertions as allDocumentTypeAssertions_2 } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { presentedCategoryDiagramSchema as presentedCategoryDiagramSchema_2, presentedCategoryDiagramCarrier as presentedCategoryDiagramCarrier_2 } from "@red-cup-engineering/signgraph/diagram";
import { presentedCategoryDiagram as presentedCategoryDiagram_2, isPresentedCategoryDiagram as isPresentedCategoryDiagram_2, diagramFromCarrierCategory as diagramFromCarrierCategory_2, objectFrom as objectFrom_2, morphismFrom as morphismFrom_2, diagramToSvgDataform as diagramToSvgDataform_2, diagramPalette as diagramPalette_2, witnessLedgerSequenceDiagram as witnessLedgerSequenceDiagram_2, mermaidProjector as mermaidProjector_2, umlProjector as umlProjector_2, plantUmlProjector as plantUmlProjector_2, writeMermaid as writeMermaid_2, readMermaid as readMermaid_2, writeXmi as writeXmi_2, readXmi as readXmi_2, writePlantUml as writePlantUml_2, readPlantUml as readPlantUml_2 } from "@red-cup-engineering/signgraph/diagram";
import { SEN_JSON as SEN_JSON_2, isRelationalTerm as isRelationalTerm_2, parseSen as parseSen_2, settleSen as settleSen_2, extractRelationalScripts as extractRelationalScripts_2, htmlIsRelational as htmlIsRelational_2, settleRelationalHtml as settleRelationalHtml_2, sessionIsRelational as sessionIsRelational_2, settleRelationalSession as settleRelationalSession_2 } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/reader";
import { senProjector as senProjector_2 } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/projector";
import { address as address_3, logPath as logPath_2, termKey as termKey_2, segment as segment_2, composeTerm as composeTerm_2, decomposeTerm as decomposeTerm_2, namespaceOf as namespaceOf_2, withinNamespace as withinNamespace_2, termOf as termOf_2, termOfNested as termOfNested_2, addressNested as addressNested_2 } from "@red-cup-engineering/computer-filepath-engineering-services-section/address";
import { eavtLogPaths as eavtLogPaths_2, dehydrateUtterances as dehydrateUtterances_2, rehydrateUtterances as rehydrateUtterances_2, pathProjector as pathProjector_2 } from "@red-cup-engineering/eavt/log-path";
import { sanitizeSegment as sanitizeSegment_2, desanitizeSegment as desanitizeSegment_2 } from "@red-cup-engineering/computer-filepath-engineering-services-section/segments";
import { normalizePath as normalizePath_2, pathParent as pathParent_2, pathBasename as pathBasename_2, pathPoint as pathPoint_2, pathOfPoint as pathOfPoint_2, isPathname as isPathname_2, validPath as validPath_2 } from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";
import { entropyBitsAtBoundary as entropyBitsAtBoundary_2, klBitsAtBoundary as klBitsAtBoundary_2, mutualInformationBitsAtBoundary as mutualInformationBitsAtBoundary_2 } from "@red-cup-engineering/metrologic/number/evidence-bits";
import { otlpSpanSchema as otlpSpanSchema_2, otlpTracesSchema as otlpTracesSchema_2, agentEventChronicleSchema as agentEventChronicleSchema_2, otlpSpanContract as otlpSpanCarrier_2, otlpTracesContract as otlpTracesCarrier_2, agentEventChronicleContract as agentEventChronicleCarrier_2 } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp";
import { spanFromStatement as spanFromWitness_2, statementFromSpan as witnessFromSpan_2, otlpFromStatements as otlpFromWitnesses_2, otlpFromAgentEventChronicle as otlpFromAgentEventChronicle_2, statementsFromOtlp as witnessesFromOtlp_2, agentEventStatementsFromOtlp as agentEventWitnessesFromOtlp_2, otlpBulkCells as otlpBulkCells_2 } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp";
import { quadraticToNumber } from "@red-cup-engineering/computer-data-engineering-services-section/number/quadratic";
import { printType, generateDeclaration } from "@red-cup-engineering/relating/typing";
import { parse as parseEavt, serialize as serializeEavt } from "@red-cup-engineering/eavt/row";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { toNumber } from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number-host";
import { fromRatio } from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";

describe("nested codec boundary tree", () => {
  it("preserves the TOML public boundary through its published owner", async () => {
    const writing = await ({ schema: { canonicalJson, schemaAssertionId, assertSchemaAssertion, parseSchemaAssertions, serializeSchemaAssertions, mergeSchemaAssertions, unfoldSchema, foldSchema, cohereSchemaAssertions, projectSchemaAssertions, schemaAssertionTriple, schemaAssertionEavt, schemaAssertionEavtId, JSON_SCHEMA_DIALECT, schemaProjector, resolveJsonPointer }, markdown: { createMarkdownDocument, parseMarkdown, frontmatterConformance, markdownDataform, documentTypeFragment, documentTypeAssertions, allDocumentTypeAssertions, DOC_TYPE_STAMP, markdownProjector, markdownDocumentSchemaFragment, documentTypeDefinitions }, diagram: { isPresentedCategoryDiagram, requireRecord, objectFrom, morphismFrom, presentedCategoryDiagram, diagramFromCarrierCategory, layout, diagramToSvgDataform, writeMermaid, readMermaid, writeXmi, readXmi, writePlantUml, readPlantUml, witnessLedgerSequenceDiagram, diagramPalette, mermaidProjector, umlProjector, plantUmlProjector, presentedCategoryDiagramCarrier, presentedCategoryDiagramSchema }, sen: { senProjector, SEN_JSON, extractRelationalScripts, htmlIsRelational, isRelationalTerm, parseSen, sessionIsRelational, settleRelationalHtml, settleRelationalSession, settleSen }, http: { negotiation: { negotiateType: negotiateType_3, negotiateEncoding: negotiateEncoding_3, negotiateLanguage: negotiateLanguage_3, parseAccept: parseAccept_3, parseAcceptEncoding: parseAcceptEncoding_3, parseAcceptLanguage: parseAcceptLanguage_3, extensionType: extensionType_3, isCompressible: isCompressible_3, mediaTypeCorner: mediaTypeCorner_3, negotiateRepresentation: negotiateRepresentation_3, representationFits: representationFits_3 }, cookie: { parseCookieHeader: parseCookieHeader_3, serializeCookieHeader: serializeCookieHeader_3, parseSetCookie: parseSetCookie_3, serializeSetCookie: serializeSetCookie_3, assertCookieName: assertCookieName_3, isCookieName: isCookieName_3, signCookieValue: signCookieValue_3, unsignCookieValue: unsignCookieValue_3 }, multipart: { parseMultipartForm: parseMultipartForm_4, serializeMultipartForm: serializeMultipartForm_4 }, sse: { parseSseStream: parseSseStream_4, sseCommentFrame: sseCommentFrame_4, sseEventFrame: sseEventFrame_4, sseFrame: sseFrame_4, isEventStream: isEventStream_4, sseHeaders: sseHeaders_4 }, ws: { acceptKey: acceptKey_4, encodeFrame: encodeFrame_4, FrameDecoder: FrameDecoder_4 }, firstHeader: firstHeader_2, joinedHeader: joinedHeader_2, parseDirectiveList: parseDirectiveList_2, quoteHeaderValue: quoteHeaderValue_2, splitHeaderParameters: splitHeaderParameters_2, unquoteHeaderValue: unquoteHeaderValue_2, parseContentType: parseContentType_2, serializeContentType: serializeContentType_2, httpDate: httpDate_2, parseHttpDate: parseHttpDate_2, etagList: etagList_2, ifMatch: ifMatch_2, ifModifiedSince: ifModifiedSince_2, ifNoneMatch: ifNoneMatch_2, ifRange: ifRange_2, ifUnmodifiedSince: ifUnmodifiedSince_2, strongEtagMatch: strongEtagMatch_2, weakEtagMatch: weakEtagMatch_2, byterangesCloseDelimiter: byterangesCloseDelimiter_2, byterangesPartHeader: byterangesPartHeader_2, contentRange: contentRange_2, multipartByterangesBody: multipartByterangesBody_2, multipartRangeBoundary: multipartRangeBoundary_2, parseRange: parseRange_2, parseRanges: parseRanges_2, cacheControl: cacheControl_2, parseCacheControl: parseCacheControl_2, linkHeader: linkHeader_2, parseLinkHeader: parseLinkHeader_2, bearerChallenge: bearerChallenge_2, bearerToken: bearerToken_2, negotiateType: negotiateType_4, negotiateEncoding: negotiateEncoding_4, negotiateLanguage: negotiateLanguage_4, parseAccept: parseAccept_4, parseAcceptEncoding: parseAcceptEncoding_4, parseAcceptLanguage: parseAcceptLanguage_4, extensionType: extensionType_4, isCompressible: isCompressible_4, mediaTypeCorner: mediaTypeCorner_4, negotiateRepresentation: negotiateRepresentation_4, representationFits: representationFits_4, parseMultipartForm: parseMultipartForm_5, serializeMultipartForm: serializeMultipartForm_5, acceptKey: acceptKey_5, encodeFrame: encodeFrame_5, FrameDecoder: FrameDecoder_5, assertCookieName: assertCookieName_4, isCookieName: isCookieName_4, parseCookieHeader: parseCookieHeader_4, parseSetCookie: parseSetCookie_4, serializeCookieHeader: serializeCookieHeader_4, serializeSetCookie: serializeSetCookie_4, signCookieValue: signCookieValue_4, unsignCookieValue: unsignCookieValue_4, parseSseStream: parseSseStream_5, sseCommentFrame: sseCommentFrame_5, sseEventFrame: sseEventFrame_5, sseFrame: sseFrame_5, isEventStream: isEventStream_5, sseHeaders: sseHeaders_5 }, path: { dehydrateUtterances, rehydrateUtterances, eavtLogPaths, pathProjector, termKey, address: address_2, termOf, addressNested, termOfNested, composeTerm, decomposeTerm, namespaceOf, withinNamespace, segment, logPath, sanitizeSegment, desanitizeSegment, normalizePath, pathParent, pathBasename, pathPoint, pathOfPoint, POSIX_PATHNAME_PATTERN, isPathname, validPath }, evidence: { entropyBitsAtBoundary, klBitsAtBoundary, mutualInformationBitsAtBoundary }, spectral: { polyFromInts, polyToInts }, otlp: { spanFromStatement, statementFromSpan, otlpFromStatements, otlpFromAgentEventChronicle, agentEventStatementsFromOtlp, statementsFromOtlp, otlpBulkCells, agentEventChronicleContract, agentEventChronicleSchema, otlpSpanContract, otlpSpanSchema, otlpTracesContract, otlpTracesSchema }, stringProjector, jsonResource, parseLines, serializeLines, decodeToml, encodeToml, iriRef, turtleLiteral, JSON_SCHEMA_DIALECT: JSON_SCHEMA_DIALECT_2, schemaProjector: schemaProjector_2, unfoldSchema: unfoldSchema_2, foldSchema: foldSchema_2, cohereSchemaAssertions: cohereSchemaAssertions_2, projectSchemaAssertions: projectSchemaAssertions_2, resolveJsonPointer: resolveJsonPointer_2, markdownProjector: markdownProjector_2, markdownDataform: markdownDataform_2, createMarkdownDocument: createMarkdownDocument, markdownDocumentSchemaFragment: markdownDocumentSchemaFragment_2, documentTypeDefinitions: documentTypeDefinitions_2, documentTypeFragment: documentTypeFragment_2, documentTypeAssertions: documentTypeAssertions_2, allDocumentTypeAssertions: allDocumentTypeAssertions_2, presentedCategoryDiagramSchema: presentedCategoryDiagramSchema_2, presentedCategoryDiagramCarrier: presentedCategoryDiagramCarrier_2, presentedCategoryDiagram: presentedCategoryDiagram_2, isPresentedCategoryDiagram: isPresentedCategoryDiagram_2, diagramFromCarrierCategory: diagramFromCarrierCategory_2, objectFrom: objectFrom_2, morphismFrom: morphismFrom_2, diagramToSvgDataform: diagramToSvgDataform_2, diagramPalette: diagramPalette_2, witnessLedgerSequenceDiagram: witnessLedgerSequenceDiagram_2, mermaidProjector: mermaidProjector_2, umlProjector: umlProjector_2, plantUmlProjector: plantUmlProjector_2, writeMermaid: writeMermaid_2, readMermaid: readMermaid_2, writeXmi: writeXmi_2, readXmi: readXmi_2, writePlantUml: writePlantUml_2, readPlantUml: readPlantUml_2, SEN_JSON: SEN_JSON_2, isRelationalTerm: isRelationalTerm_2, parseSen: parseSen_2, settleSen: settleSen_2, extractRelationalScripts: extractRelationalScripts_2, htmlIsRelational: htmlIsRelational_2, settleRelationalHtml: settleRelationalHtml_2, sessionIsRelational: sessionIsRelational_2, settleRelationalSession: settleRelationalSession_2, senProjector: senProjector_2, address: address_3, logPath: logPath_2, termKey: termKey_2, segment: segment_2, composeTerm: composeTerm_2, decomposeTerm: decomposeTerm_2, namespaceOf: namespaceOf_2, withinNamespace: withinNamespace_2, termOf: termOf_2, termOfNested: termOfNested_2, addressNested: addressNested_2, eavtLogPaths: eavtLogPaths_2, dehydrateUtterances: dehydrateUtterances_2, rehydrateUtterances: rehydrateUtterances_2, pathProjector: pathProjector_2, sanitizeSegment: sanitizeSegment_2, desanitizeSegment: desanitizeSegment_2, normalizePath: normalizePath_2, pathParent: pathParent_2, pathBasename: pathBasename_2, pathPoint: pathPoint_2, pathOfPoint: pathOfPoint_2, isPathname: isPathname_2, validPath: validPath_2, entropyBitsAtBoundary: entropyBitsAtBoundary_2, klBitsAtBoundary: klBitsAtBoundary_2, mutualInformationBitsAtBoundary: mutualInformationBitsAtBoundary_2, otlpSpanSchema: otlpSpanSchema_2, otlpTracesSchema: otlpTracesSchema_2, agentEventChronicleSchema: agentEventChronicleSchema_2, otlpSpanContract: otlpSpanCarrier_2, otlpTracesContract: otlpTracesCarrier_2, agentEventChronicleContract: agentEventChronicleCarrier_2, spanFromStatement: spanFromWitness_2, statementFromSpan: witnessFromSpan_2, otlpFromStatements: otlpFromWitnesses_2, otlpFromAgentEventChronicle: otlpFromAgentEventChronicle_2, statementsFromOtlp: witnessesFromOtlp_2, agentEventStatementsFromOtlp: agentEventWitnessesFromOtlp_2, otlpBulkCells: otlpBulkCells_2, quadraticToNumber, printType, generateDeclaration });
    const owner = await import("@red-cup-engineering/toml-services-section/toml-codec");
    assert.equal(writing.decodeToml, owner.decodeToml);
    assert.equal(writing.encodeToml, owner.encodeToml);
    const value = { title: "codec", rows: [{ name: "first", enabled: true }], nested: { count: 3 } };
    assert.deepEqual(writing.decodeToml(writing.encodeToml(value)), value);
    assert.throws(() => writing.decodeToml('value = "unterminated'), SyntaxError);
  });

  it("preserves incremental WebSocket decoding at the public boundary", async () => {
    const ws = await ({ acceptKey: acceptKey_3, encodeFrame: encodeFrame_3, FrameDecoder: FrameDecoder_3 });
    const owner = await import("@red-cup-engineering/code-websocket-frame-service");
    assert.equal(ws.FrameDecoder, owner.FrameDecoder);
    assert.equal(ws.acceptKey("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
    for (const length of [0, 125, 126, 65536]) {
      const payload = Buffer.alloc(length, 42);
      const wire = ws.encodeFrame(2, payload);
      const decoder = new ws.FrameDecoder();
      assert.deepEqual(decoder.push(wire.subarray(0, 1)), []);
      assert.deepEqual(decoder.push(wire.subarray(1)), [{ fin: true, opcode: 2, payload, masked: false }]);
    }
    assert.equal(new ws.FrameDecoder({ maxPayload: 1 }).push(ws.encodeFrame(2, Buffer.alloc(2)))[0].tooLarge, true);
  });

  it("preserves cache policy serialization and invalid-value handling", async () => {
    const http = await ({ negotiation: { negotiateType, negotiateEncoding, negotiateLanguage, parseAccept, parseAcceptEncoding, parseAcceptLanguage, extensionType, isCompressible, mediaTypeCorner, negotiateRepresentation, representationFits }, cookie: { parseCookieHeader, serializeCookieHeader, parseSetCookie, serializeSetCookie, assertCookieName, isCookieName, signCookieValue, unsignCookieValue }, multipart: { parseMultipartForm, serializeMultipartForm }, sse: { parseSseStream, sseCommentFrame, sseEventFrame, sseFrame, isEventStream, sseHeaders }, ws: { acceptKey, encodeFrame, FrameDecoder }, firstHeader, joinedHeader, parseDirectiveList, quoteHeaderValue, splitHeaderParameters, unquoteHeaderValue, parseContentType, serializeContentType, httpDate, parseHttpDate, etagList, ifMatch, ifModifiedSince, ifNoneMatch, ifRange, ifUnmodifiedSince, strongEtagMatch, weakEtagMatch, byterangesCloseDelimiter, byterangesPartHeader, contentRange, multipartByterangesBody, multipartRangeBoundary, parseRange, parseRanges, cacheControl, parseCacheControl, linkHeader, parseLinkHeader, bearerChallenge, bearerToken, negotiateType: negotiateType_2, negotiateEncoding: negotiateEncoding_2, negotiateLanguage: negotiateLanguage_2, parseAccept: parseAccept_2, parseAcceptEncoding: parseAcceptEncoding_2, parseAcceptLanguage: parseAcceptLanguage_2, extensionType: extensionType_2, isCompressible: isCompressible_2, mediaTypeCorner: mediaTypeCorner_2, negotiateRepresentation: negotiateRepresentation_2, representationFits: representationFits_2, parseMultipartForm: parseMultipartForm_2, serializeMultipartForm: serializeMultipartForm_2, acceptKey: acceptKey_2, encodeFrame: encodeFrame_2, FrameDecoder: FrameDecoder_2, assertCookieName: assertCookieName_2, isCookieName: isCookieName_2, parseCookieHeader: parseCookieHeader_2, parseSetCookie: parseSetCookie_2, serializeCookieHeader: serializeCookieHeader_2, serializeSetCookie: serializeSetCookie_2, signCookieValue: signCookieValue_2, unsignCookieValue: unsignCookieValue_2, parseSseStream: parseSseStream_2, sseCommentFrame: sseCommentFrame_2, sseEventFrame: sseEventFrame_2, sseFrame: sseFrame_2, isEventStream: isEventStream_2, sseHeaders: sseHeaders_2 });
    const owner = await import("@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cache-control");
    assert.equal(http.cacheControl, owner.cacheControl);
    assert.equal(http.parseCacheControl, owner.parseCacheControl);
    const policy = { visibility: "private", maxAge: 0, staleWhileRevalidate: 30, noCache: true };
    assert.deepEqual(http.parseCacheControl(http.cacheControl(policy)), policy);
    assert.deepEqual(http.parseCacheControl("max-age=12junk, private, custom=yes"), { visibility: "private" });
    assert.throws(() => http.cacheControl({ maxAge: -1 }), RangeError);
  });

  it("preserves repeated multipart fields and binary file contents", async () => {
    const multipart = await ({ parseMultipartForm: parseMultipartForm_3, serializeMultipartForm: serializeMultipartForm_3 });
    const owner = await import("@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/multipart-form-data");
    assert.equal(multipart.parseMultipartForm, owner.parseMultipartForm);
    assert.equal(multipart.serializeMultipartForm, owner.serializeMultipartForm);
    const data = Buffer.from([0, 255, 13, 10]);
    const form = multipart.parseMultipartForm(multipart.serializeMultipartForm([
      { name: "tag", data: "one" }, { name: "tag", data: "two" },
      { name: "upload", filename: 'a"b.bin', contentType: "application/octet-stream", data },
    ], "boundary"), "boundary");
    assert.deepEqual(form.getAll("tag"), ["one", "two"]);
    assert.deepEqual(form.file("upload").data, data);
    assert.equal(form.file("upload").filename, 'a"b.bin');
    assert.throws(() => multipart.parseMultipartForm("", "bad\r\nboundary"), TypeError);
  });

  it("preserves SSE records and media helpers through the published owner", async () => {
    const sse = await ({ parseSseStream: parseSseStream_3, sseCommentFrame: sseCommentFrame_3, sseEventFrame: sseEventFrame_3, sseFrame: sseFrame_3, isEventStream: isEventStream_3, sseHeaders: sseHeaders_3 });
    const owner = await import("@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/server-sent-event");
    for (const name of ["parseSseStream", "sseEventFrame", "sseFrame", "sseCommentFrame", "sseHeaders", "isEventStream"]) {
      assert.equal(sse[name], owner[name]);
    }
    const event = { event: "update", id: "7", retry: 500, data: "one\ntwo" };
    assert.deepEqual(sse.parseSseStream(sse.sseCommentFrame("keepalive") + sse.sseEventFrame(event)), [event]);
    assert.deepEqual(sse.parseSseStream("data: value\r\nid: bad\0id\r\nretry: invalid\r\n\r\n"), [{ data: "value" }]);
    assert.equal(sse.isEventStream("TEXT/EVENT-STREAM; charset=utf-8"), true);
  });

  it("imports textual JSON and JSONL EAVT through their syntax refinement path", () => {
    assert.equal(canonical(parseJson('{"b":2,"a":1}')), '{"a":1,"b":2}');
    const rows = parseEavt('["entity","attribute","value","time"]\n');
    assert.deepEqual(rows, [{ e: "entity", a: "attribute", v: "value", t: "time" }]);
    assert.equal(serializeEavt(rows), '{"a":"attribute","e":"entity","t":"time","v":"value"}\n');
  });

  it("keeps datom specialization below the EAVT JSONL row branch", () => {
    assert.deepEqual(datom({ row: ["e", "a", "v", "t"], reading: "read" }), ["e", "a", "v", "t", "read"]);
    const section = foldObjectDatoms([
      { e: "e", a: "a", v: "v", tx: "t1", op: "assert" },
      { e: "e", a: "a", v: "v", tx: "t2", op: "retract" },
    ]);
    assert.equal(section.cells[0].value, "stable");
  });

  it("imports XML-family HTML and SVG through text/xml", () => {
    assert.equal(escapeText("<stable & active>"), "&lt;stable &amp; active&gt;");
    assert.equal(svgProjector.recognize({ path: "x.svg", content: "<svg></svg>" }), true);
  });

  it("imports host JavaScript number codecs under host/javascript/numbers", () => {
    assert.equal(toNumber(fromRatio(1, 2)), 0.5);
  });

});

it('XML and SVG preserve app palettes, reading vocabularies, diagrams and radial layouts through the shared owner', async () => {
  const xml = await ({ html: { css_classes_are_factor_maps, cssVisualValuation, htmlCarrierOf, css_settles_to_valuation, cssTextFromVisualValuation, renderHtmlFiber, ref, isRef, escapeText: escapeText_2, escapeAttr, slug, unmark, readingMark, calmReadingOf, isContested, fromSection, fromCells, fromDetect, defaultMorphisms, morphismRegistry, projectArticle, project, markup, pack, verifyPacket, renderPacket, cellKey, address, lint, REF_PREFIX, readingValueOf, shp, RFC7992_CLASSES, rfc7992Profile, escapeHtml, attrs, classes, el, decodeHtmlEntities, scanHtmlStartTags, relTokens, htmlDocumentBase, resolveNodeStyles, checkStyleResolutionSettled, checkClassMapsValid, cssTextFromResolvedStyles, buildHtmlDocumentPlan, renderHtmlDocument, htmlProjector }, svg: { defaultShapeMorphisms, projectSvg, svgProjector: svgProjector_2, serialize, shapeMorphismRegistry, svgRoot, nodeShape, edgePath, textLines, group, anchor, background, arrowMarker, hollowTriangleMarker, defs, affirmedReading, readingMark: readingMark_2, calmReadingOf: calmReadingOf_2, readingAttributes, DEFAULT_SHAPE, readingValueOf: readingValueOf_2, svgInteractiveProfile, rfc7996Profile }, escapeXmlText, escapeXmlAttr, isXmlName, requireXmlName, element, text, comment, serialize: serialize_2, document, xmlProjector });
  const svg = await import('@red-cup-engineering/signgraph/diagram-svg');
  const radial = await ({ serialize: serialize_3, affirmedReading: affirmedReading_2, projectRadial, segmentOfMeme, radialFromValuation, radialFromClosureStages, readingPalette, radialProjector });
  const owner = await import('@red-cup-engineering/xml-document-rendering-service');
  const ownerSvg = await import('@red-cup-engineering/xml-document-rendering-service/svg');
  const { createHash } = await import('node:crypto');
  const hash = value => createHash('sha256').update(value).digest('hex');
  assert.equal(xml.element, owner.element);
  assert.equal(svg.nodeShape, ownerSvg.nodeShape);
  assert.equal(svg.edgePath, ownerSvg.edgePath);
  assert.throws(() => xml.comment('invalid-'), TypeError);
  const readings = [0, 1, 2, 3].map(bits => {
    const c = structuredClone(svg.affirmedReading());
    c.value[0].name = bits & 1 ? 'present' : 'absent';
    c.value[1].name = bits & 2 ? 'present' : 'absent';
    return c;
  });
  const box = { cx: 20, cy: 20, w: 30, h: 10 };
  const data = { width: 250, height: 200, title: 'A<&',
    nodes: readings.map((reading, i) => ({ e: 'n' + i, a: 'kind', v: 'quoted"', group: ['package', 'surface', 'strategy', 'target'][i], label: 'Line\n<&>', title: 'quoted"', href: '/node', focus: i === 1, data: { custom: 'a&b' }, reading, box: { ...box, cx: 20 + i * 50 } })),
    edges: readings.map((reading, i) => ({ from: 'n' + i, to: 'n' + ((i + 1) % 4), kind: 'extends', href: '/edge', reading, fromBox: box, toBox: { ...box, cy: 60 } })),
  };
  assert.equal(hash(svg.projectSvg(data)), '38b86e2cf0b2bfd40f84900d1dd6a8c259098b755360b0f99c22c8be31097f32');
  const radialData = { size: 240, title: 'R<&', rings: [
    { ordinal: 3, label: 'later', segments: data.nodes.map((n, i) => ({ e: n.e, a: n.a, v: n.v, label: n.label, reading: n.reading, orbit: i % 2 ? 'diagonal' : 'off-diagonal', weight: i + 1 })) },
    { ordinal: 0, segments: [{ e: 'single', reading: readings[3] }] },
  ] };
  assert.equal(hash(radial.projectRadial(radialData)), 'b4ac19983c0f55049194b982dd6f0fde26f372aa6742a04a13ef675e149a9068');
  const diagram = {"kind":"relating.diagram.presented-category","title":"Diagram <&","objects":[{"id":"a","kind":"package","label":"A"},{"id":"b","kind":"strategy","label":"B"}],"morphisms":[{"from":"a","to":"b","kind":"extends","label":"edge"}]};
  assert.equal(hash(svg.svgProjector.write([diagram])), '66409f76283bed080b0240c2dca28a63841b1a66322b339fae8e4f939e2e515b');
  const staticSvg = svg.projectSvg(data, { profile: svg.rfc7996Profile });
  assert.doesNotMatch(staticSvg, /\sdata-|<a[\s>]/);
  assert.deepEqual(svg.rfc7996Profile.lint(staticSvg), { ok: true, violations: [] });
  const predicate = { claim: { mark: { value: 'relates' } } };
  const subject = { mark: { value: { id: 'a' } } };
  const assignments = [subject, { mark: { value: { id: 'b' } } }].map(object => ({ cell: { subject, predicate, object }, reading: readings[1] }));
  assert.deepEqual(assignments.map(meme => radial.segmentOfMeme(meme).orbit), ['diagonal', 'off-diagonal']);
  const valuation = { fibers: [{ predicate, assignments }] };
  assert.equal(radial.radialFromValuation(valuation).rings[0].segments.length, 2);
  assert.equal(radial.radialFromClosureStages([{ valuation }, { valuation }]).rings.length, 2);
});
