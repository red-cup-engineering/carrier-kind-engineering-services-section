import assert from 'node:assert/strict';
import test from 'node:test';
import { programFormHtml, programIndexHtml, operationManifoldIndexHtml, decodeSchemaFormEntries } from '@red-cup-engineering/computer-web-server/platform-http/program-html';
import { schemaNamespaceReport, schemaNamespaceIndexHtml, routeSchemaNamespace } from '@red-cup-engineering/metroplat/presentation/mounting';
import { projectSurface } from '@red-cup-engineering/metroplat/presentation/surface';
import { operationsManifoldOf } from '@red-cup-engineering/computer-system-engine/rpc/manifold';
import { operation } from '@red-cup-engineering/computer-system-engine/rpc/operation';
import { markup, scanHtmlStartTags } from '@red-cup-engineering/html-structural-projection-service';

const surface = projectSurface([operation({ verb: 'nested/echo', run: value => value })], { packageName: '@fixture/packet-pages', capabilityAssertions: () => [] });
const mounts = [
  { name: 'fixture', nodeId: 'fixture/schema/child', induced: surface },
  { name: 'parent', nodeId: 'fixture/schema', induced: projectSurface([], { packageName: '@fixture/parent' }) },
];
const links = html => scanHtmlStartTags(html).filter(({ name }) => name === 'a').map(({ attrs }) => attrs.href);

test('schema controls retain typed nested form decoding while TUFTE owns markup', () => {
  const domainSchema = { type: 'object', properties: {
    amount: { type: 'number' }, enabled: { type: 'boolean' }, choice: { enum: [1, 2] },
    nested: { type: 'object', properties: { text: { type: 'string' } } },
    rows: { type: 'array', items: { type: 'number' } },
  }, required: ['amount'] };
  const endpoint = { ...surface.discovery.programs[0], domainSchema };
  const html = programFormHtml(endpoint, '/ops');
  const tags = scanHtmlStartTags(html);
  assert.equal(tags.find(({ name }) => name === 'form').attrs.action, '/ops/nested%2Fecho?input-format=form');
  assert.ok(tags.some(({ attrs }) => attrs.name === 'nested.text'));
  assert.ok(tags.some(({ name, attrs }) => name === 'textarea' && attrs.name === 'rows'));
  const body = new URLSearchParams({ amount: '2.5', enabled: 'false', choice: '2', 'nested.text': 'A+B & π', rows: '[1,2]' }).toString();
  assert.deepEqual(decodeSchemaFormEntries(domainSchema, body), { amount: 2.5, enabled: false, choice: 2, nested: { text: 'A+B & π' }, rows: [1, 2] });
  assert.deepEqual(markup(html)[0].cell.object, endpoint);
});

test('program discovery renders navigation, contracts and composition as one packet', () => {
  const html = programIndexHtml(surface.discovery, '/ops', operationsManifoldOf(surface.discovery));
  assert.ok(links(html).includes('/ops/nested%2Fecho'));
  assert.ok(links(html).includes('/ops/operations-manifold'));
  assert.match(html, /Local Hoare edges/);
  assert.deepEqual(markup(html).map(({ cell }) => cell.object), [{ ref: 'operation:nested/echo' }]);
  const manifold = operationManifoldIndexHtml(mounts, new Map([['fixture', '/ops']]));
  assert.ok(links(manifold).includes('/ops'));
  assert.deepEqual(markup(manifold).map(({ cell }) => cell.object), [{ ref: 'mount:fixture' }, { ref: 'mount:parent' }]);
});

test('schema namespace preserves graph evidence and applies its root to node links', () => {
  const report = schemaNamespaceReport(mounts);
  const html = schemaNamespaceIndexHtml(report, '/work');
  assert.ok(links(html).includes('/work/fixture/schema/child'));
  assert.match(html, /class="tufte-shell"/);
  assert.deepEqual(markup(html).find(({ cell }) => cell.predicate === 'graph').cell.object, JSON.parse(JSON.stringify(report.graph)));
  assert.equal(scanHtmlStartTags(html).filter(({ name }) => name === 'html').length, 1);
});

test('schema node route renders parent navigation, operation selection and its actual readout', async () => {
  const response = await routeSchemaNamespace(mounts, { method: 'GET', path: '/work/fixture/schema/child', query: {}, body: '', accept: 'text/html' }, {
    basePath: '/work', now: () => '2026-09-07T00:00:00Z', onArrival: () => undefined,
  });
  assert.equal(response.status, 200);
  assert.ok(links(response.body).includes('/work/fixture/schema'));
  assert.ok(links(response.body).includes('/work/fixture/schema/child/nested%2Fecho'));
  const form = scanHtmlStartTags(response.body).find(({ name }) => name === 'form');
  assert.equal(form.attrs.action, '/work/fixture/schema/child');
  assert.equal(form.attrs.method, 'get');
  const readout = markup(response.body).find(({ cell }) => cell.predicate === 'endpoint-readout').cell.object;
  assert.deepEqual(readout.generatedEndpoint.languageCone.apex.programs, ['nested/echo']);
  assert.equal(readout.path, '/work/fixture/schema/child');
});

test('schema-less program form consumes the published shared native form contract', () => {
  const endpoint = surface.discovery.programs[0];
  const html = programFormHtml(endpoint, '/ops');
  const tags = scanHtmlStartTags(html);
  assert.equal(tags.find(({ name }) => name === 'form').attrs.action, '/ops/nested%2Fecho');
  assert.ok(tags.some(({ name, attrs }) => name === 'textarea' && attrs.name === 'body'));
  assert.match(html, /class="tufte-shell"/);
  assert.deepEqual(Object.fromEntries(markup(html).map(({ cell }) => [cell.predicate, cell.object])), JSON.parse(JSON.stringify(endpoint)));
});
