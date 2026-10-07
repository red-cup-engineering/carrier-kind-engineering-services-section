import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function verifyAdmission({ revision, machinePulls, files, before, after, sourcePulls }) {
  if (machinePulls.some(p => p.merged_at && p.base.ref === 'main' && p.merge_commit_sha === revision)) return;
  if (!files.length || files.some(f => !['sources.json', 'dependencies.lock.yaml'].includes(f)))
    throw new Error('Machine configuration must arrive through a merged machine-repository PR.');
  const { repositories: oldSources, ...oldInputs } = before;
  const { repositories: newSources, ...newInputs } = after;
  if (!equal(oldInputs, newInputs) || oldSources.length !== newSources.length)
    throw new Error('Automatic source admission cannot change machine providers or dependency policy.');
  let updates = 0;
  for (let i = 0; i < oldSources.length; i++) {
    const old = oldSources[i], next = newSources[i];
    if (equal(old, next)) continue;
    const { commit: oldCommit, admission: oldAdmission, ...oldOwner } = old;
    const { commit, admission, ...owner } = next;
    if (oldCommit === commit || !equal(oldOwner, owner)) throw new Error('Automatic admission may only advance exact owning commits.');
    const merged = sourcePulls(next).find(p => p.merged_at && p.base.ref === (next.ref ?? 'main') && p.merge_commit_sha === commit);
    if (!merged || admission?.pullRequest !== merged.html_url || admission?.mergedAt !== merged.merged_at)
      throw new Error(`Awaiting reviewed owning-repository merge: ${next.repository}@${commit}`);
    updates++;
  }
  if (!updates) throw new Error('No reviewed owning-source advancement in this machine commit.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const snapshot = resolve(process.argv[2]);
  const run = (command, args) => {
    const result = spawnSync(command, args, { cwd: snapshot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw result.error ?? new Error(`${command} admission query failed: ${result.stderr.slice(-1500)}`);
    return result.stdout.trim();
  };
  const api = path => JSON.parse(run('gh', ['api', path]));
  const revision = run('git', ['rev-parse', 'HEAD']);
  const repository = process.env.GITHUB_REPOSITORY;
  const associated = api(`repos/${repository}/commits/${revision}/pulls`);
  const machinePulls = associated.some(p => p.merged_at && p.merge_commit_sha === revision)
    ? associated : api(`repos/${repository}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100`);
  if (machinePulls.some(p => p.merged_at && p.base.ref === 'main' && p.merge_commit_sha === revision)) {
    console.log(`Admitted merged machine PR: ${repository}@${revision}`);
  } else {
    run('git', ['fetch', '--depth=2', 'origin', revision]);
    verifyAdmission({ revision, machinePulls,
      files: run('git', ['diff', '--name-only', 'HEAD^', 'HEAD']).split('\n').filter(Boolean),
      before: JSON.parse(run('git', ['show', 'HEAD^:sources.json'])),
      after: JSON.parse(readFileSync(join(snapshot, 'sources.json'), 'utf8')),
      sourcePulls: source => {
        const match = source.admission?.pullRequest?.match(new RegExp(`^https://github\\.com/${source.repository}/pull/([0-9]+)$`));
        return match ? [api(`repos/${source.repository}/pulls/${match[1]}`)] : [];
      },
    });
    console.log(`Admitted reviewed owning-source advancement: ${repository}@${revision}`);
  }
}
