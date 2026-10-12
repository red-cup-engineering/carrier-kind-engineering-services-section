import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, extname } from 'node:path';

const ROOT = () => process.env.GOOGLE_MEDIA_DRIVE_REMOTE;
function rclone(args) {
  const result = spawnSync('rclone', args, { encoding: 'utf8', timeout: 600_000, maxBuffer: 1_048_576 });
  if (result.status !== 0) throw new Error(`Drive ${args[0]} failed: ${result.error?.message ?? result.stderr.trim().split('\n').slice(-2).join(' | ')}`);
  return result.stdout.trim();
}
async function hashes(path) {
  const sha = createHash('sha256'), md5 = createHash('md5'); let bytes = 0;
  for await (const chunk of createReadStream(path)) { sha.update(chunk); md5.update(chunk); bytes += chunk.length; }
  return { sha256: sha.digest('hex'), md5: md5.digest('hex'), bytes };
}
function folderOf(folder) {
  if (!folder || folder.split('/').some((part) => !/^[a-zA-Z0-9_-]+$/u.test(part))) throw new Error('Invalid Drive media folder');
  return folder;
}

/** Receive exact bytes in Drive before a caller records the receipt or releases its cache. */
export async function keepMediaInDrive(path, { folder, expectedSha256, remote = ROOT() } = {}) {
  if (!remote) return null;
  const identity = await hashes(path);
  if (expectedSha256 && identity.sha256 !== expectedSha256) throw new Error('Media differs from its expected SHA-256');
  const target = `${remote}/${folderOf(folder)}/${identity.sha256}${extname(path)}`;
  rclone(['copyto', path, target]);
  const stat = JSON.parse(rclone(['lsjson', target, '--stat', '--hash']));
  if (!stat.ID || stat.Size !== identity.bytes || (stat.Hashes?.md5 ?? stat.Hashes?.MD5)?.toLowerCase() !== identity.md5) throw new Error('Drive did not confirm the received bytes');
  return { remote: target, fileId: stat.ID, url: `https://drive.google.com/file/d/${stat.ID}/view`, ...identity };
}

/** Materialize a working copy when execution needs it; Drive remains the retained carrier. */
export async function receiveMediaFromDrive(receipt, path) {
  if (!receipt?.remote || !/^[a-f0-9]{64}$/u.test(receipt.sha256 ?? '')) throw new Error('A verified Drive receipt is required');
  if (existsSync(path) && (await hashes(path)).sha256 === receipt.sha256) return path;
  mkdirSync(dirname(path), { recursive: true });
  rclone(['copyto', receipt.remote, path + '.part']);
  if ((await hashes(path + '.part')).sha256 !== receipt.sha256) { unlinkSync(path + '.part'); throw new Error('Drive media differs from its recorded SHA-256'); }
  renameSync(path + '.part', path);
  return path;
}

/** Remove only the exact working bytes for which Drive acknowledged custody. */
export async function releaseMediaCache(receipt, path) {
  if (!receipt || !existsSync(path)) return false;
  if ((await hashes(path)).sha256 !== receipt.sha256) throw new Error('Refusing to remove media that differs from the Drive receipt');
  unlinkSync(path); return true;
}

/** Share one receipted teaching image or PDF, never its enclosing media hub. */
export function shareTeachingMedia(receipt) {
  if(!receipt?.fileId||!receipt?.remote||!receipt?.sha256||! /\.(png|pdf)$/u.test(receipt.remote)||!receipt.remote.startsWith(`${ROOT()}/education/`))throw new Error('A teaching-image or PDF Drive receipt is required');
  const stat=JSON.parse(rclone(['lsjson',receipt.remote,'--stat','--hash']));
  if(stat.ID!==receipt.fileId||stat.Size!==receipt.bytes||(stat.Hashes?.md5??stat.Hashes?.MD5)?.toLowerCase()!==receipt.md5)throw new Error('Drive teaching media no longer matches its receipt');
  const url=rclone(['link',receipt.remote]).split('\n').at(-1);
  if(!url.startsWith('https://drive.google.com/')||!url.includes(receipt.fileId))throw new Error('Drive did not acknowledge a public teaching-media link');
  return {fileId:receipt.fileId,url,sha256:receipt.sha256,sharedAt:new Date().toISOString(),carrier:'google-drive-public-file'};
}
