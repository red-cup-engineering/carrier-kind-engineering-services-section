
/**
 * `multipart/form-data` representation codecs.
 *
 * This subpath parses and serializes the delimited body representation used by
 * RFC 7578 form submissions. It receives the boundary and body bytes as values;
 * reading them from a live request, enforcing upload limits, and deciding where
 * file parts go are transport and application concerns.
 *
 * @packageDocumentation
 */

export { parseMultipartForm, serializeMultipartForm } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/multipart-form-data.mjs";
export type { MultipartForm, MultipartPart, MultipartPartInit } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/multipart-form-data.mjs";
