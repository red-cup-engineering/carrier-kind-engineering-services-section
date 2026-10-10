/**
 * SQL Server Reporting Services report exports, through the ReportViewer web page a public
 * report is published on. The page opens a report session (a session cookie plus a session id in
 * its export URL); `exportReport` opens it, then asks the same session for the report rendered in
 * a data format (CSV by default), so a caller reads the report's rows rather than its HTML.
 * @packageDocumentation
 */
import { applySetCookies, jarCookieHeader } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/cookie";

const EXPORT_BASE = /"ExportUrlBase":"([^"]+)"/;

async function getKeepingCookies(url, jar, doFetch, accept) {
  let target = new URL(url);
  let cookies = jar;
  for (let hop = 0; hop < 5; hop += 1) {
    const cookie = jarCookieHeader(cookies, target);
    const res = await doFetch(target, { redirect: "manual", headers: { accept, ...(cookie ? { cookie } : {}) } });
    cookies = applySetCookies(cookies, res.headers.getSetCookie?.() ?? [], target);
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return { res, url: target, jar: cookies };
    target = new URL(location, target);
  }
  throw new Error(`report page ${url} redirected more than five times`);
}

/**
 * Export the report a ReportViewer page shows, in `format` (an SSRS rendering extension name such
 * as CSV, XML, EXCELOPENXML or PDF). Resolves to the exported bytes as text for text formats.
 */
export async function exportReport(viewerUrl, { format = "CSV", fetch: doFetch = fetch } = {}) {
  const page = await getKeepingCookies(viewerUrl, [], doFetch, "text/html");
  if (!page.res.ok) throw new Error(`report page ${viewerUrl} answered HTTP ${page.res.status}`);
  const match = (await page.res.text()).match(EXPORT_BASE);
  if (!match) throw new Error(`report page ${viewerUrl} offers no export (no ExportUrlBase)`);
  const exportUrl = new URL(JSON.parse(`"${match[1]}"`) + encodeURIComponent(format), page.url);
  const out = await getKeepingCookies(exportUrl, page.jar, doFetch, "*/*");
  const contentType = out.res.headers.get("content-type") ?? "";
  if (!out.res.ok || contentType.startsWith("text/html")) throw new Error(`report export ${exportUrl} was refused (HTTP ${out.res.status}, ${contentType || "no content type"})`);
  return { contentType, text: await out.res.text() };
}
