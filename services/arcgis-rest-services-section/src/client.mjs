/**
 * ArcGIS REST feature-layer queries: count and paged attribute reads.
 * @packageDocumentation
 */

function queryUrl(layerUrl, params) {
  const url = new URL(`${layerUrl.replace(/\/+$/, "")}/query`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("f", "json");
  return url;
}

async function getJson(url, opts) {
  const doFetch = opts.fetch ?? fetch;
  const res = await doFetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`ArcGIS query ${url} answered HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`ArcGIS query ${url} failed: ${body.error.message ?? JSON.stringify(body.error)}`);
  return body;
}

/** Count the features in `layerUrl` matching `where` (default: all). */
export async function countFeatures(layerUrl, { where = "1=1", ...opts } = {}) {
  const body = await getJson(queryUrl(layerUrl, { where, returnCountOnly: true }), opts);
  return body.count;
}

/** Describe the layer: name, fields, maxRecordCount. */
export async function describeLayer(layerUrl, opts = {}) {
  const url = new URL(layerUrl);
  url.searchParams.set("f", "json");
  return getJson(url, opts);
}

/**
 * Yield the attribute records of every feature matching `where`, paging by
 * `pageSize` (bounded by the server's maxRecordCount). `outFields` is an array
 * of field names or "*"; `orderBy` defaults to OBJECTID so pages are stable.
 */
export async function* queryFeatures(layerUrl, {
  where = "1=1",
  outFields = "*",
  orderBy = "OBJECTID",
  pageSize = 1000,
  returnGeometry = false,
  limit = Infinity,
  ...opts
} = {}) {
  let offset = 0;
  let yielded = 0;
  for (;;) {
    const body = await getJson(queryUrl(layerUrl, {
      where,
      outFields: Array.isArray(outFields) ? outFields.join(",") : outFields,
      orderByFields: orderBy,
      returnGeometry,
      resultOffset: offset,
      resultRecordCount: pageSize,
    }), opts);
    const features = body.features ?? [];
    for (const feature of features) {
      yield returnGeometry ? feature : feature.attributes;
      if (++yielded >= limit) return;
    }
    if (features.length === 0 || !body.exceededTransferLimit && features.length < pageSize) return;
    offset += features.length;
  }
}
