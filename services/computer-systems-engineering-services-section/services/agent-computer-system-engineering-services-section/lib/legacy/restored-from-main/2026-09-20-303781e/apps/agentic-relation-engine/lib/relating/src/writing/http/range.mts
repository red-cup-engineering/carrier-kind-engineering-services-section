// range.mts — byte ranges: the Range field (RFC 9110 §14.2), the
// Content-Range field (§14.4), and the multipart/byteranges media type
// (§14.6). parseRanges evaluates the field value against a known
// representation length, per §14.1.2: returns the satisfiable ranges,
// 416 when the field is malformed or nothing is satisfiable, and null
// when the field is absent or not a bytes range.

import { firstHeader, type HeaderValue } from "./header-value.mjs";
import { parseRanges } from "@red-cup-engineering/code-http-byte-range-service";
export { parseRanges };
import { multipartByterangesBody } from "@red-cup-engineering/code-http-byte-range-service";
export { multipartByterangesBody };

export type ByteRange = { start: number; end: number };

function parseByteRangeSpec(spec: string, total: number): ByteRange | 416 | null {
  const m = /^(\d*)-(\d*)$/.exec(spec.trim());
  if (!m) return 416;
  const startStr = m[1] ?? "";
  const endStr = m[2] ?? "";
  if (!startStr && !endStr) return 416;
  let start: number;
  let end: number;
  if (!startStr) {
    const suffix = parseInt(endStr, 10);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = parseInt(startStr, 10);
    if (!Number.isSafeInteger(start)) return 416;
    end = endStr ? parseInt(endStr, 10) : total - 1;
    if (!Number.isSafeInteger(end)) return 416;
  }
  if (start > end) return 416;
  if (start >= total) return null;
  return { start, end: Math.min(end, total - 1) };
}



/** As parseRanges, but only a single satisfiable range is acceptable. */
export function parseRange(value: HeaderValue, total: number): ByteRange | 416 | null {
  const ranges = parseRanges(value, total);
  if (ranges === null || ranges === 416) return ranges;
  return ranges.length === 1 ? ranges[0]! : 416;
}

/** Content-Range field value; null range is the unsatisfied-range form ("bytes *\/N"). */
export function contentRange(range: ByteRange | null, total: number): string {
  return range === null ? `bytes */${total}` : `bytes ${range.start}-${range.end}/${total}`;
}

/** Deterministic boundary for a multipart/byteranges body over the given selection. */
export function multipartRangeBoundary(total: number, ranges: readonly ByteRange[]): string {
  const material = `${total}:${ranges.map((range) => `${range.start}-${range.end}`).join(",")}`;
  return `web-server-${Buffer.from(material).toString("hex").slice(0, 24)}`;
}

/** One part's delimiter and headers, up to and including the blank line before its bytes. */
export function byterangesPartHeader(boundary: string, type: string, range: ByteRange, total: number): string {
  return `--${boundary}\r\nContent-Type: ${type}\r\nContent-Range: ${contentRange(range, total)}\r\n\r\n`;
}

/** The close-delimiter ending a multipart/byteranges body. */
export function byterangesCloseDelimiter(boundary: string): string {
  return `--${boundary}--\r\n`;
}


