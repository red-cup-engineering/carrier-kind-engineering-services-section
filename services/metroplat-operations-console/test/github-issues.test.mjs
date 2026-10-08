import {mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from "node:assert/strict";
import test from "node:test";

import { syncGitHubIssues } from "../src/github-issues.mjs";

function issue(number) {
  return {
    number,
    node_id: `I_${number}`,
    title: `Finding ${number}`,
    body: `Details for ${number}`,
    state: "open",
    updated_at: "2026-10-02T12:00:00Z",
    user: { login: "reporter" },
    labels: [{ name: "operations" }],
    comments: number === 110 ? 1 : 0,
  };
}

test("bounded issue intake reads selected issues and retries without duplicate reports", async () => {
  const fetched = [];
  const boardQueries = [];
  const threads = [];
  const apiFetch = async (url) => {
    const parsed = new URL(url);
    fetched.push(parsed.pathname);
    const comments = parsed.pathname.endsWith("/comments");
    if (comments) return { ok: true, json: async () => [{
      node_id: "IC_110_1", html_url: "https://github.com/emsenn/bare-cedar-fog/issues/110#issuecomment-1",
      user: { login: "reviewer" }, body: "Confirmed", updated_at: "2026-10-02T12:01:00Z",
    }] };
    const number = Number(parsed.pathname.split("/").at(-1));
    return { ok: true, json: async () => issue(number) };
  };
  const runAs = async (_producer, verb, input) => {
    if (verb === "work-board") {
      boardQueries.push(input);
      const sources = new Set(input.sources);
      const matching = threads.filter((thread) => thread.opening.sources.some((source) => sources.has(source.locator)));
      return { kind: "feltos.work.work-board", matched: matching.length, threads: matching, position: { revision: "r1" } };
    }
    assert.equal(verb, "work-open");
    const thread = { id: `report-${threads.length + 1}`, opening: { ...input, at: `2026-10-02T12:0${threads.length}:00Z` }, standing: "open" };
    threads.push(thread);
    return { thread: thread.id, move: "report" };
  };

  const first = await syncGitHubIssues({ repository: "emsenn/bare-cedar-fog", producer: "person:alice",
    issueNumbers: [111, 110], runAs, fetchImpl: apiFetch });

  assert.deepEqual(fetched, [
    "/repos/emsenn/bare-cedar-fog/issues/110",
    "/repos/emsenn/bare-cedar-fog/issues/111",
    "/repos/emsenn/bare-cedar-fog/issues/110/comments",
  ]);
  assert.equal(first.observed, 2);
  assert.equal(first.played, 2);
  assert.equal(threads.length, 2);
  assert.deepEqual(boardQueries[0].sources, [
    "https://github.com/emsenn/bare-cedar-fog/issues/110",
    "https://github.com/emsenn/bare-cedar-fog/issues/111",
  ]);
  assert.equal(threads[0].opening.evidence.includes("https://github.com/emsenn/bare-cedar-fog/issues/110#issuecomment-1"), true);

  const second = await syncGitHubIssues({ repository: "emsenn/bare-cedar-fog", producer: "person:alice",
    issueNumbers: [110, 111], runAs, fetchImpl: apiFetch });
  assert.equal(second.observed, 2);
  assert.equal(second.played, 0);
  assert.equal(threads.length, 2);
});

test("bounded issue intake rejects invalid selectors before contacting GitHub", async () => {
  let requests = 0;
  const fetchImpl = async () => { requests++; throw new Error("unexpected request"); };
  for (const issueNumbers of [[], [1, 1], [0], Array.from({ length: 51 }, (_, index) => index + 1)]) {
    await assert.rejects(syncGitHubIssues({ repository: "emsenn/bare-cedar-fog", producer: "person:alice",
      issueNumbers, runAs: async () => {}, fetchImpl }), /issueNumbers/);
  }
  assert.equal(requests, 0);
});


test("issue intake rejects the forbidden noncanonical 561-group repository before contacting GitHub", async () => {
  let requests = 0;
  const fetchImpl = async () => { requests++; throw new Error("unexpected request"); };
  await assert.rejects(
    syncGitHubIssues({ repository: "emsenn/561-group", producer: "person:alice", runAs: async () => {}, fetchImpl }),
    /forbidden noncanonical drift/,
  );
  assert.equal(requests, 0);
});

test('unconfigured incumbent operates when the new provider and native module are absent', t=>{
 const root=mkdtempSync(join(tmpdir(),'console-incumbent-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const entry=join(root,'github-issues.mjs');copyFileSync(new URL('../src/github-issues.mjs',import.meta.url),entry);
 const script=`import {pathToFileURL} from 'node:url';
 const {syncGitHubIssues}=await import(pathToFileURL(process.argv[1]));
 const result=await syncGitHubIssues({repository:'owner/public',producer:'person:reader',issueNumbers:[1],fetchImpl:async()=>({ok:true,json:async()=>({number:1,node_id:'I1',title:'Finding',body:'Original report',state:'open',comments:0,user:{login:'reader'},updated_at:'2026-10-08T00:00:00Z'})}),runAs:async(_p,v)=>v==='work-board'?{kind:'feltos.work.work-board',matched:0,threads:[],position:'one'}:{thread:'native-report',move:'report'}});
 console.log(result.played);`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script,entry],{encoding:'utf8'}).trim(),'1');
});
