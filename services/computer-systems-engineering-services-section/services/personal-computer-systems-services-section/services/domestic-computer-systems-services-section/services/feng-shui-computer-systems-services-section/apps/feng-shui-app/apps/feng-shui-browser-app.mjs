import { build, writeArtifacts, writeBuildReport } from "@red-cup-engineering/static-site-publisher/build";
import { createVictorWebsite } from "@red-cup-engineering/static-site-publisher/website";
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createDeskReviewProjector } from '../src/desk-review-application.mjs';

/**
 * Composes the desk app through VICTOR's normal build and serving lifecycle.
 * @param {{corpusPath:string,schemaPath:string,port?:number,siteName?:string}} options Explicit science inputs and preview parameters.
 * @returns {Promise<object>} VICTOR build and runtime options.
 */
export async function deskReviewOptions({corpusPath, schemaPath, port = 8567, siteName = 'Feng Shui desk review'}) {
  return {
    reader: {listRecords: async () => [], readRecord: async () => { throw new Error('This app has no publication records.'); }},
    publicDir: fileURLToPath(new URL('../public/', import.meta.url)),
    home: false, archives: false, search: false, assets: false,
    site: {name: siteName, baseIri: `http://127.0.0.1:${port}/`, language: 'en', menu: [{label: 'Desk review', href: '/'}]},
    projectors: [await createDeskReviewProjector({corpusPath, schemaPath})],
  };
}

/**
 * Builds or serves a development desk review without uploading user material.
 * @param {{command?:string,corpusPath:string,schemaPath:string,port?:number,outputDirectory?:string,siteName?:string}} options Explicit application parameters.
 * @returns {Promise<object>} The build result or running VICTOR website.
 * @throws {Error} When VICTOR refuses a build or the command is unknown.
 */
export async function runDeskReview({command = 'build', outputDirectory = '/tmp/feng-shui-desk-build', ...options}) {
  const config = await deskReviewOptions(options);
  if (command === 'build') {
    const result = await build(config);
    if (!result.report.releasable) throw new Error(JSON.stringify(result.report.refusals));
    await writeArtifacts(result.artifacts, outputDirectory);
    await writeBuildReport(result.report, outputDirectory);
    return result;
  }
  if (command !== 'serve') throw new TypeError('Use build or serve.');
  const website = await createVictorWebsite(config);
  if (!website.getBuild().report.releasable) throw new Error(JSON.stringify(website.getBuild().report.refusals));
  await website.start({host: '127.0.0.1', port: options.port ?? 8567});
  return website;
}

if (import.meta.main) {
  const [command = 'build', ...args] = process.argv.slice(2);
  const settings = args[0] ? JSON.parse(await readFile(resolve(args[0]), 'utf8')) : {};
  const configDirectory = args[0] ? dirname(resolve(args[0])) : process.cwd();
  const corpusInput = process.env.FENG_SHUI_CORPUS_PATH ?? settings.corpusPath;
  const schemaInput = process.env.FENG_SHUI_SCHEMA_PATH ?? settings.schemaPath;
  const corpusPath = corpusInput ? resolve(configDirectory, corpusInput) : undefined;
  const schemaPath = schemaInput ? resolve(configDirectory, schemaInput) : undefined;
  const port = Number(process.env.FENG_SHUI_PORT ?? settings.port ?? 8567);
  const result = await runDeskReview({...settings, command, corpusPath, schemaPath, port});
  if (command === 'serve') {
    process.stdout.write(`Desk review: http://127.0.0.1:${port}/\n`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await result.close(); process.exit(0); });
  } else process.stdout.write(`${JSON.stringify({releasable: result.report.releasable, artifacts: result.artifacts.size, outputDirectory: settings.outputDirectory ?? '/tmp/feng-shui-desk-build'})}\n`);
}
