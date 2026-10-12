
/**
 * admission/webmention — reading already-fetched Webmention wire documents
 * as admitted verdicts.
 *
 * `verifyMentionBody` takes a source page's already-fetched HTTP status,
 * content-type, and body — no `fetch` in its signature — and derives a
 * {@link Verdict}: an admitted classification, never a boolean. A 410 admits
 * `deleted`; a non-2xx status admits `invalid`; a 2xx body that no longer
 * links to `target` admits `retracted`; otherwise `verified`, carrying the
 * microformats2 mention type. `receiveMentionRequest` reads a POST body
 * through the same admission law, taking its live verification as an
 * injected dependency (its own signature stays host-free; the live default
 * lives in `services/web/webmention-client`).
 *
 * @packageDocumentation
 */
import {
  acceptsTarget,
  classifyMention,
  linksToTarget,
  parseMentionRequest,
  type MentionRequest,
  type MentionType,
} from "./codec.mts";

export type VerificationStatus = "verified" | "deleted" | "retracted" | "invalid" | "error";

export interface Verdict {
  readonly status: VerificationStatus;
  readonly verified: boolean;
  readonly retract: boolean;
  readonly type: MentionType | null;
  readonly linkCount: number;
  readonly httpStatus: number;
  readonly source: string;
  readonly target: string;
  readonly reason?: string;
}

export interface VouchVerdict {
  readonly status: "verified" | "invalid" | "error";
  readonly verified: boolean;
  readonly vouch: string;
  readonly source: string;
  readonly target: string;
  readonly linkCount: number;
  readonly httpStatus: number;
  readonly reason?: string;
}

export interface VerifyMentionBodyInput {
  readonly source: string;
  readonly target: string;
  readonly httpStatus: number;
  readonly contentType?: string;
  readonly body?: string;
}

/** Admit a fetched source page as a Webmention {@link Verdict} — no network access here. */
export function verifyMentionBody(input: VerifyMentionBodyInput): Verdict {
  const base = {
    verified: false,
    retract: false,
    type: null,
    linkCount: 0,
    httpStatus: input.httpStatus,
    source: input.source,
    target: input.target,
  } satisfies Omit<Verdict, "status" | "reason">;

  if (input.httpStatus === 410) return { ...base, status: "deleted", retract: true, reason: "source returned 410 Gone" };
  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return { ...base, status: "invalid", reason: `source returned HTTP ${input.httpStatus}` };
  }
  const contentType = (input.contentType ?? "").toLowerCase();
  const couldBeHtml = contentType.includes("html") || contentType.includes("xml") || contentType === "";
  const hits = couldBeHtml && input.body !== undefined ? linksToTarget(input.body, input.source, input.target) : [];
  if (hits.length === 0) return { ...base, status: "retracted", retract: true, reason: "source no longer links to target" };
  return { ...base, status: "verified", verified: true, type: classifyMention(hits), linkCount: hits.length };
}

export interface VerifyVouchBodyInput {
  readonly vouch: string;
  readonly source: string;
  readonly target: string;
  readonly httpStatus: number;
  readonly contentType?: string;
  readonly body?: string;
}

/** Admit a fetched vouch page: it must link to both `source` and `target`. */
export function verifyVouchBody(input: VerifyVouchBodyInput): VouchVerdict {
  const base = {
    verified: false,
    vouch: input.vouch,
    source: input.source,
    target: input.target,
    linkCount: 0,
    httpStatus: input.httpStatus,
  } satisfies Omit<VouchVerdict, "status" | "reason">;
  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return { ...base, status: "invalid", reason: `vouch returned HTTP ${input.httpStatus}` };
  }
  const body = input.body ?? "";
  const sourceHits = linksToTarget(body, input.vouch, input.source);
  const targetHits = linksToTarget(body, input.vouch, input.target);
  const linkCount = sourceHits.length + targetHits.length;
  return linkCount >= 2
    ? { ...base, status: "verified", verified: true, linkCount }
    : { ...base, status: "invalid", linkCount, reason: "vouch page must link to both source and target" };
}

export interface ReceiveMentionRequestOptions {
  readonly baseUrl?: string;
  readonly requireVouch?: boolean;
  readonly verify: (source: string, target: string) => Promise<Verdict>;
  readonly verifyVouch?: (vouch: string, source: string, target: string) => Promise<VouchVerdict>;
}

export interface ReceiveResult {
  readonly accepted: boolean;
  readonly status: number;
  readonly request?: MentionRequest;
  readonly verdict?: Verdict;
  readonly reason?: string;
}

/**
 * Admit a Webmention POST body: parse it, confirm `target` belongs to this
 * site, optionally require a vouch, then classify it via the injected
 * `verify` dependency. No `fetch` occurs in this function's own body — the
 * dependency carries whatever live network access it needs.
 */
export async function receiveMentionRequest(
  rawBody: string,
  contentType: string | undefined,
  opts: ReceiveMentionRequestOptions,
): Promise<ReceiveResult> {
  let request: MentionRequest;
  try {
    request = parseMentionRequest(rawBody, contentType);
  } catch (error) {
    return { accepted: false, status: 400, reason: error instanceof Error ? error.message : String(error) };
  }
  if (opts.baseUrl !== undefined && !acceptsTarget(request.target, opts.baseUrl)) {
    return { accepted: false, status: 400, request, reason: "target is not a resource on this site" };
  }
  if (opts.requireVouch || request.vouch !== undefined) {
    if (request.vouch === undefined) return { accepted: false, status: 400, request, reason: "vouch is required" };
    if (opts.verifyVouch === undefined) return { accepted: false, status: 400, request, reason: "vouch verification is not configured" };
    const vouchVerdict = await opts.verifyVouch(request.vouch, request.source, request.target);
    if (!vouchVerdict.verified) {
      return { accepted: false, status: 400, request, reason: vouchVerdict.reason ?? "vouch did not verify" };
    }
  }
  const verdict = await opts.verify(request.source, request.target);
  return { accepted: true, status: 202, request, verdict };
}
