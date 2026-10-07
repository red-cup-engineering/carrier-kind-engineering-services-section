import assert from "node:assert/strict";
import test from "node:test";
import { exportReport } from "../src/client.mjs";

function reportServer() {
  const seen = [];
  const fetch = async (url, init) => {
    seen.push({ url: String(url), cookie: init.headers.cookie ?? null });
    if (String(url).includes("ShowSSRSReport.aspx")) {
      return new Response('<script>{"ExportUrlBase":"/ssrswrapper/Reserved.ReportViewerWebControl.axd?ReportSession=abc\\u0026OpType=Export\\u0026Format="}</script>',
        { status: 200, headers: { "content-type": "text/html", "set-cookie": "ASP.NET_SessionId=s1; path=/; HttpOnly" } });
    }
    return init.headers.cookie === "ASP.NET_SessionId=s1"
      ? new Response("TractNumber,ACRES\n1,1.26\n", { status: 200, headers: { "content-type": "text/csv" } })
      : new Response("<html>session expired</html>", { status: 200, headers: { "content-type": "text/html" } });
  };
  return { fetch, seen };
}

test("exports through the page's report session, carrying its cookie", async () => {
  const server = reportServer();
  const { text, contentType } = await exportReport("http://reports.example/ssrswrapper/ShowSSRSReport.aspx?reportPath=/Land", { fetch: server.fetch });
  assert.equal(contentType, "text/csv");
  assert.equal(text, "TractNumber,ACRES\n1,1.26\n");
  assert.equal(server.seen[1].url, "http://reports.example/ssrswrapper/Reserved.ReportViewerWebControl.axd?ReportSession=abc&OpType=Export&Format=CSV");
});

test("refuses a page with no export and an export answered with HTML", async () => {
  await assert.rejects(exportReport("http://reports.example/x", { fetch: async () => new Response("<html></html>", { status: 200 }) }), /no ExportUrlBase/);
  const server = reportServer();
  const fetch = (url, init) => server.fetch(url, { ...init, headers: { ...init.headers, cookie: undefined } });
  await assert.rejects(exportReport("http://reports.example/ssrswrapper/ShowSSRSReport.aspx", { fetch }), /was refused/);
});
