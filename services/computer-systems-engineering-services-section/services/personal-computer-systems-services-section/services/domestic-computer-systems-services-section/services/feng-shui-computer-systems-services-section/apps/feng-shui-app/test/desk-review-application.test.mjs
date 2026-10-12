import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from "@red-cup-engineering/static-site-publisher/build";
import { createDeskReviewProjector } from '../src/desk-review-application.mjs';
import { deskReviewOptions } from '../apps/feng-shui-browser-app.mjs';

async function inputs(t, reject = false) {
  const directory = await mkdtemp(join(tmpdir(), 'feng-shui-build-test-'));
  t.after(() => rm(directory, {recursive:true,force:true}));
  const corpusPath = join(directory,'corpus.json');
  const schemaPath = join(directory,'schema.json');
  const corpus = {corpus:{id:'feng-shui-test',version:'v1'},sources:[{id:'source',url:'https://example.org/source',title:'<img src=x onerror="alert(1)">'}],claims:[{id:'claim',source_id:'source',paraphrase:'A test passage.',tradition:'not stated'}],recommendations:[{id:'recommendation',claim_ids:['claim'],required_scene_facts:['confirmed'],actions:['Test action.'],limits:[],commercial_link_policy:'No links.'}]};
  const schema = {$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',required:reject?['missing-required-property']:['corpus','recommendations'],properties:{recommendations:{type:'array'}}};
  await Promise.all([writeFile(corpusPath, JSON.stringify(corpus)),writeFile(schemaPath,JSON.stringify(schema))]);
  return {corpusPath,schemaPath};
}

test('build rejects corpus that fails the supplied canonical schema', async t => {
  await assert.rejects(createDeskReviewProjector(await inputs(t,true)), /does not satisfy its schema/);
});

test('VICTOR builds the actual desk page, modules, corpus and provenance with conformance green', async t => {
  const config = await deskReviewOptions(await inputs(t));
  const result = await build(config);
  assert.equal(result.report.releasable, true, JSON.stringify(result.report.refusals));
  for (const name of ['index.html','desk-review.mjs','desk-review.css','desk-scene.mjs','detect-desk-objects.mjs','retrieve-desk-advice.mjs','corpus.json','corpus.schema.json','corpus-provenance.json']) assert.ok(result.artifacts.has(name),name);
  const html = result.artifacts.get('index.html');
  assert.match(html, /Your photo stays in this tab/);
  assert.equal(html.includes('<img src=x'),false);
  assert.equal(JSON.parse(result.artifacts.get('corpus.json')).sources[0].title,'<img src=x onerror="alert(1)">');
  const provenance = JSON.parse(result.artifacts.get('corpus-provenance.json'));
  assert.match(provenance.corpus.sha256,/^[a-f0-9]{64}$/);
});
