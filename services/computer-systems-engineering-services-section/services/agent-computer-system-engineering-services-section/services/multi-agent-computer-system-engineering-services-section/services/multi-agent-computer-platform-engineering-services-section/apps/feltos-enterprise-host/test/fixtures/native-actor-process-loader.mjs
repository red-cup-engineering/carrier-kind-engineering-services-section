// Exercise the *real* host executable with bounded synthetic capability ports, no credentials.
const stub = Object.freeze({
  '@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard': 'export async function runMain(start) { await start(); }',
  '../src/diagnostics.mjs': 'export function installSamplingSignal() {}',
  '../src/serve-instance.mjs': `export async function serveEnterpriseInstance({shutdown}) {
    let stopped;
    const failed = new Promise(resolve => { stopped = resolve; });
    const monitor = { draining: false };
    const lifecycle = { platform: { capabilities: () => ({ 'native-actor': { failed } }) }, shutdown: monitor,
      close: async () => { monitor.draining = true; shutdown.onClosed(); } };
    process.on('SIGTERM', () => { shutdown.onDrain(); void lifecycle.close(); });
    if (process.env.NATIVE_TEST_CASE === 'failure') setTimeout(() => stopped(new Error('queue terminated')), 12);
    if (process.env.NATIVE_TEST_CASE === 'normal') setTimeout(() => void lifecycle.close(), 12);
    if (process.env.NATIVE_TEST_CASE === 'already-draining') setTimeout(() => { monitor.draining = true; stopped(new Error('queue stopped while draining')); void lifecycle.close(); }, 12);
    return lifecycle;
  }`,
});
export async function resolve(specifier, context, nextResolve) {
  if (Object.hasOwn(stub, specifier)) return { url: 'data:text/javascript,' + encodeURIComponent(stub[specifier]), shortCircuit: true };
  return nextResolve(specifier, context);
}
