import { createServer } from "node:http";

/**
 * In-memory node:http double of the slice of the real GCS JSON/upload API world-store.mjs's
 * gcs-client needs: metadata GET, content GET (?alt=media, pinned to a generation), and the
 * conditional upload POST (?uploadType=media&ifGenerationMatch=) — same conditional-write
 * semantics as a real bucket, just enough for a real gcs-client to run against `apiBase:
 * fake.url`. Extracted from farstone.561.group's src/fake-gcs.mts; already generic.
 * @module fake-gcs
 */

/**
 * This sandbox's loopback networking refuses the very first connection attempt to a freshly
 * bound ephemeral port; a newly started fake server "primes" its own port with a harmless
 * self-request before handing the URL to a caller.
 * @param {string} url
 * @returns {Promise<void>}
 */
async function warmUpLocalPort(url) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

/**
 * @typedef {Object} ObjectState
 * @property {number} currentGeneration
 * @property {Map<number,string>} versions
 */

/**
 * @typedef {Object} FakeGcs
 * @property {string} url @property {string} bucket @property {string[]} requestLog @property {number} preconditionFailures
 * @property {(count: number, mode?: "throw"|"503") => void} failNextRequests - fails the next N requests before the real handler runs ("throw" resets the socket, "503" default returns HTTP 503)
 * @property {(match: (method: string, pathname: string, search: URLSearchParams) => boolean, write: {name: string, text: string}) => void} interleaveNextMatchingRequest - one-shot: the next matching request gets a direct unconditional write before being handled, then disarms
 * @property {() => Promise<void>} close
 */

/**
 * Start a fake GCS server.
 * @param {string} [bucket]
 * @returns {Promise<FakeGcs>}
 */
export function startFakeGcs(bucket = "test-bucket") {
  const objects = /** @type {Map<string, ObjectState>} */ (new Map());
  const requestLog = /** @type {string[]} */ ([]);
  const stats = { preconditionFailures: 0 };
  const failure = { remaining: 0, mode: /** @type {"throw"|"503"} */ ("503") };
  /** @type {{match: (method: string, pathname: string, search: URLSearchParams) => boolean, write: {name: string, text: string}}|undefined} */
  let pendingInterleave;

  const metaPrefix = `/storage/v1/b/${bucket}/o`;
  const uploadPath = `/upload/storage/v1/b/${bucket}/o`;

  /**
   * @param {import("node:http").ServerResponse} res
   * @param {number} status
   * @param {unknown} obj
   */
  function sendJson(res, status, obj) {
    const buf = Buffer.from(JSON.stringify(obj), "utf8");
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(buf);
  }

  /**
   * Same "replace, don't append" semantics a real bucket with Object Versioning off applies to
   * every write, whether through the conditional-POST route or injected by an interleave.
   * @param {string} name
   * @param {string} text
   * @returns {number}
   */
  function unversionedWrite(name, text) {
    const state = objects.get(name);
    const newGen = (state ? state.currentGeneration : 0) + 1;
    objects.set(name, { currentGeneration: newGen, versions: new Map([[newGen, text]]) });
    return newGen;
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    requestLog.push(`${req.method} ${url.pathname}${url.search}`);

    if (pendingInterleave && pendingInterleave.match(req.method ?? "GET", url.pathname, url.searchParams)) {
      const { name, text } = pendingInterleave.write;
      pendingInterleave = undefined;
      unversionedWrite(name, text);
    }

    if (failure.remaining > 0) {
      failure.remaining -= 1;
      if (failure.mode === "throw") {
        req.socket.destroy(); // abrupt reset -> the client's fetch() rejects, no response ever sent
        return;
      }
      return sendJson(res, 503, { error: { code: 503, message: "fake-gcs: injected transient failure" } });
    }

    const chunks = /** @type {Buffer[]} */ ([]);
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const method = req.method ?? "GET";

      // Single-object metadata / content GET: /storage/v1/b/:bucket/o/:encodedName
      if (method === "GET" && url.pathname.startsWith(`${metaPrefix}/`)) {
        const encodedName = url.pathname.slice(metaPrefix.length + 1);
        const name = decodeURIComponent(encodedName);
        const state = objects.get(name);

        if (url.searchParams.get("alt") === "media") {
          if (!state) return sendJson(res, 404, { error: { code: 404, message: "not found" } });
          const genParam = url.searchParams.get("generation");
          const gen = genParam ? Number(genParam) : state.currentGeneration;
          const text = state.versions.get(gen);
          if (text === undefined) return sendJson(res, 404, { error: { code: 404, message: "generation not found" } });
          res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "x-goog-generation": String(gen) });
          return res.end(text);
        }

        if (!state) return sendJson(res, 404, { error: { code: 404, message: "not found" } });
        return sendJson(res, 200, { name, bucket, generation: String(state.currentGeneration) });
      }

      // List: /storage/v1/b/:bucket/o?prefix=... (kept for parity, not used by world-store.mjs)
      if (method === "GET" && url.pathname === metaPrefix) {
        const prefix = url.searchParams.get("prefix") ?? "";
        const items = [...objects.entries()]
          .filter(([name]) => name.startsWith(prefix))
          .map(([name, state]) => ({ name, generation: String(state.currentGeneration) }));
        return sendJson(res, 200, { items });
      }

      // Conditional upload: POST /upload/storage/v1/b/:bucket/o?uploadType=media&name=&ifGenerationMatch=
      if (method === "POST" && url.pathname === uploadPath) {
        const name = url.searchParams.get("name");
        const ifGenerationMatch = url.searchParams.get("ifGenerationMatch");
        if (!name || ifGenerationMatch === null) {
          return sendJson(res, 400, { error: { code: 400, message: "missing name/ifGenerationMatch" } });
        }
        const expected = Number(ifGenerationMatch);
        const state = objects.get(name);
        const current = state ? state.currentGeneration : 0;
        if (current !== expected) {
          stats.preconditionFailures += 1;
          return sendJson(res, 412, { error: { code: 412, message: "Precondition Failed" } });
        }
        const newGen = unversionedWrite(name, body);
        return sendJson(res, 200, { name, bucket, generation: String(newGen) });
      }

      sendJson(res, 404, { error: { code: 404, message: `no fake-gcs route for ${method} ${url.pathname}` } });
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      void (async () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr !== null ? addr.port : 0;
        const url = `http://127.0.0.1:${port}`;
        await warmUpLocalPort(url);
        requestLog.length = 0; // the warm-up probe itself isn't part of any caller's request log
        resolve({
          url,
          bucket,
          requestLog,
          get preconditionFailures() {
            return stats.preconditionFailures;
          },
          failNextRequests: (count, mode = "503") => {
            failure.remaining = count;
            failure.mode = mode;
          },
          interleaveNextMatchingRequest: (match, write) => {
            pendingInterleave = { match, write };
          },
          close: () => new Promise((r) => server.close(() => r())),
        });
      })();
    });
  });
}
