// fetch-tool — the governed source-fetch capability. SWARM's first outbound-network EXECUTOR: a single HTTP
// GET that fails closed unless a leader-delegation witness admits the `network.fetch` tool policy, then records
// what it read as an auditable evidence row (the policy's trace requirement is url-and-response-digest). This is
// the substrate the newsroom needs: live sources (arXiv now, RSS/news later) become ledgered evidence, as
// auditable as everything else. It does NOT bypass governance — no delegation, no fetch.
import { createHash } from "node:crypto";

import { toolAdmissionFor } from "./tool-policy.mjs";
import { writeTrace } from "./events.mjs";
import { stableId } from "./cognition.mjs";
import { sanitizeErrorMessage } from "./infer.mjs";

const ARXIV_API = "http://export.arxiv.org/api/query";
const DEFAULT_MAX_BYTES = 5_000_000;

// arxivQueryUrl — build an arXiv Atom-API query URL. Pure (no network); the byte-touch is fetchSource's.
export function arxivQueryUrl({ search, id, start = 0, maxResults = 10 } = {}) {
  if (!search && !id) throw new Error("arxivQueryUrl: provide `search` or `id`.");
  const params = new URLSearchParams();
  if (search) params.set("search_query", search);
  if (id) params.set("id_list", Array.isArray(id) ? id.join(",") : String(id));
  params.set("start", String(start));
  params.set("max_results", String(maxResults));
  return `${ARXIV_API}?${params.toString()}`;
}

// recordSourceFetch — append the fetch's evidence witness as a foldable ledger row under ledger/source-fetches/.
export function recordSourceFetch(root, agent = {}, witness = {}, options = {}) {
  const id = options.id ?? stableId(["source-fetch", witness.url, witness.digest, witness.fetchedAt], "ledger");
  const term = `ledger/source-fetches/${id}`;
  return writeTrace(root, term, {
    kind: "swarm.ledger.source_fetch",
    id,
    ledgerKind: "source-fetch",
    created: witness.fetchedAt,
    agent: agent.name ?? "",
    ...witness,
    evidence:
      "governed outbound fetch: what the agent read is recorded as an auditable evidence row (url + response digest)",
  }, { ...options, t: id });
}

// fetchSource — governed HTTP GET. context carries the admission witness ({ leaderAuthorized } or
// { delegatedBy:"leader", delegationDecisionPath }) and an optional { root, agent } for ledgering. Fails CLOSED:
// without admission it returns { admitted:false, reason } and performs no network egress.
export async function fetchSource(url, context = {}, options = {}) {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    throw new Error("fetchSource: `url` must be an http(s) URL.");
  }
  const admission = toolAdmissionFor("network.fetch", context);
  if (!admission.admitted) {
    return {
      admitted: false,
      reason: admission.reason,
      url,
      policy: admission.policy,
      delegatedBy: admission.delegatedBy,
      delegationDecisionPath: admission.delegationDecisionPath,
    };
  }

  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("fetchSource: no fetch implementation available.");
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? 30000;

  const controller = new AbortController();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: options.accept ?? "*/*", ...(options.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(
      `fetchSource: request failed for ${url}` +
        (error?.message ? `: ${sanitizeErrorMessage(error.message)}` : ""),
      { cause: error },
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  const body = await response.text();
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > maxBytes) {
    throw new Error(`fetchSource: response from ${url} is ${bytes} bytes, over the ${maxBytes}-byte cap.`);
  }
  const digest = createHash("sha256").update(body).digest("hex");
  const fetchedAt = options.now ?? new Date().toISOString();
  const contentType = response.headers?.get?.("content-type") ?? "";

  const witness = {
    tool: "network.fetch",
    capability: admission.policy.capability,
    sandbox: admission.policy.sandbox,
    traceRequirement: admission.policy.traceRequirement,
    url,
    status: response.status ?? 0,
    ok: response.ok !== false,
    contentType,
    bytes,
    digest,
    fetchedAt,
    delegatedBy: admission.delegatedBy,
    delegationDecisionPath: admission.delegationDecisionPath,
  };

  const ledger = context.root ? recordSourceFetch(context.root, context.agent ?? {}, witness, options) : null;

  return { admitted: true, ...witness, body, ledger };
}

// fetchArxiv — convenience: build the arXiv query URL and fetch it under the same governance.
export async function fetchArxiv(query, context = {}, options = {}) {
  return fetchSource(arxivQueryUrl(query), context, options);
}
