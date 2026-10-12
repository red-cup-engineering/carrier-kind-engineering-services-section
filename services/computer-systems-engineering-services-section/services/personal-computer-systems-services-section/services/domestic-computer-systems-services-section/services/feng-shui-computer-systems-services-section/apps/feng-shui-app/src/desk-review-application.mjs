import { readFile } from 'node:fs/promises';
import { validateDeskCorpus } from './retrieve-desk-advice.mjs';
import { validateJsonSchemaInstance } from "@red-cup-engineering/json-schema-services-section/validation";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

/**
 * Creates VICTOR's desk artifacts from an explicit, canonical science input.
 * @param {{corpusPath:string,schemaPath:string}} options Build input paths.
 * @returns {Promise<object>} A VICTOR build projector with source provenance.
 * @throws {Error} When a required input or its evidence graph is invalid.
 */
export async function createDeskReviewProjector({corpusPath, schemaPath}) {
  if (!corpusPath || !schemaPath) throw new TypeError('Supply the canonical corpus and schema paths.');
  const [corpusText, schemaText, html, ...modules] = await Promise.all([
    readFile(corpusPath, 'utf8'), readFile(schemaPath, 'utf8'), readFile(new URL('./desk-review.html', import.meta.url), 'utf8'),
    ...['desk-scene.mjs', 'detect-desk-objects.mjs', 'retrieve-desk-advice.mjs'].map(name => readFile(new URL(name, import.meta.url), 'utf8')),
  ]);
  const corpus = validateDeskCorpus(JSON.parse(corpusText));
  const schema = JSON.parse(schemaText);
  if (!schema.$schema || !schema.properties?.recommendations) throw new TypeError('The canonical Feng Shui corpus schema is missing.');
  const validation = validateJsonSchemaInstance({value: corpus, schema});
  if (!validation.valid) throw new TypeError(`The science corpus does not satisfy its schema: ${JSON.stringify(validation.errors)}`);
  const provenance = {corpus: {path: corpusPath, sha256: sha256Hex(corpusText)}, schema: {path: schemaPath, sha256: sha256Hex(schemaText)}};
  return {name: 'feng-shui-desk-review', priority: 15, project: () => ({artifacts: [
    {path: 'index.html', body: html, source: 'feng-shui:desk-review'},
    {path: 'corpus.json', body: corpusText, source: corpusPath},
    {path: 'corpus.schema.json', body: schemaText, source: schemaPath},
    {path: 'corpus-provenance.json', body: JSON.stringify(provenance, null, 2), source: corpusPath},
    ...['desk-scene.mjs', 'detect-desk-objects.mjs', 'retrieve-desk-advice.mjs'].map((name, index) => ({path: name, body: modules[index], source: `feng-shui:src/${name}`})),
  ]})};
}
