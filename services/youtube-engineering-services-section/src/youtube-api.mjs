import { open, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

const API = 'https://www.googleapis.com/youtube/v3/';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/';
const CHUNK = 8 * 1024 * 1024; // A bounded multiple of Google's 256 KiB chunk unit.

function futureUtc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now()) {
    throw new Error('publishAt must be a strictly future UTC timestamp ending in Z');
  }
  const canonical = new Date(value).toISOString();
  if (canonical !== value.replace(/(?<=:\d\d)Z$/, '.000Z')) throw new Error('publishAt contains an invalid UTC calendar date');
  return canonical;
}
async function digest(path) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest('hex');
}
function sessionAddress(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'www.googleapis.com' || !url.pathname.startsWith('/upload/youtube/')) throw new Error('Invalid YouTube resumable session URL');
  return url.href;
}
async function responseJson(response, operation) {
  let value;
  try { value = await response.json(); } catch { throw new Error(`YouTube returned non-JSON HTTP ${response.status}`); }
  if (!response.ok) {
    const rawReason = value.error?.errors?.[0]?.reason ?? value.error?.status ?? (typeof value.error === 'string' ? value.error : 'request_failed');
    const reason = /^[A-Za-z0-9_-]{1,80}$/.test(rawReason) ? rawReason : 'request_failed';
    const thumbnailPermission = operation === 'thumbnail' && response.status === 403 && reason === 'forbidden'
      && /doesn.t have permissions to upload and set custom video thumbnails/i.test(value.error?.message ?? '');
    const error = new Error(thumbnailPermission
      ? 'YouTube custom-thumbnail permission is unavailable for this channel. Check YouTube Studio > Settings > Channel > Feature eligibility; the uploaded video and its publication schedule remain intact.'
      : `YouTube HTTP ${response.status}: ${reason}`);
    error.name = 'YouTubeApiError'; error.status = response.status; error.reason = reason;
    error.code = thumbnailPermission ? 'CUSTOM_THUMBNAIL_PERMISSION' : 'YOUTUBE_API_ERROR';
    error.retryable = response.status === 429 || response.status >= 500;
    if (operation) error.operation = operation;
    throw error;
  }
  return value;
}

/** Direct Google APIs. Checkpoints contain a resumable URL and belong in private runtime state. */
/** Low-level Google transport. Every auth, read and write request is admitted first. */
export function createYouTube({ channelId, refreshTokenEnv, env, fetchImpl, authorize } = {}) {
  if (!/^UC[\w-]{22}$/.test(channelId ?? '')) throw new Error('An exact YouTube channelId is required');
  if (!env || typeof env !== 'object') throw new Error('YouTube requires an explicit environment');
  if (typeof fetchImpl !== 'function') throw new Error('YouTube requires an explicit fetch implementation');
  if (typeof authorize !== 'function') throw new Error('YouTube requires an effect authorization function');
  if (!refreshTokenEnv || !env[refreshTokenEnv]) throw new Error(`Missing channel credential: ${refreshTokenEnv || 'refreshTokenEnv'}`);
  for (const name of ['YOUTUBE_OAUTH_CLIENT_ID', 'YOUTUBE_OAUTH_CLIENT_SECRET']) if (!env[name]) throw new Error(`Missing credential: ${name}`);
  let token, expires = 0;
  async function request(operation, url, options) {
    await authorize(operation, {provider:'youtube',url:String(url),method:options?.method ?? 'GET'});
    return fetchImpl(url, options);
  }
  async function authorized(url, options = {}, operation = 'youtube.observe') {
    if (!token || Date.now() >= expires) {
      const result = await responseJson(await request('youtube.auth', 'https://oauth2.googleapis.com/token', {
        method: 'POST', body: new URLSearchParams({ client_id: env.YOUTUBE_OAUTH_CLIENT_ID, client_secret: env.YOUTUBE_OAUTH_CLIENT_SECRET, refresh_token: env[refreshTokenEnv], grant_type: 'refresh_token' }),
      }));
      if (!result.access_token) throw new Error('Google OAuth returned no access token');
      token = result.access_token; expires = Date.now() + Math.max(0, (Number(result.expires_in ?? 3600) - 60)) * 1000;
    }
    return request(operation, url, { ...options, redirect: 'manual', headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  }
  async function api(path, options) { return responseJson(await authorized(API + path, options)); }
  async function verifyIdentity() {
    const result = await api('channels?part=id,contentDetails&mine=true');
    if (result.items?.length !== 1 || result.items[0].id !== channelId) throw new Error(`YouTube credential does not identify configured channel ${channelId}`);
    return result.items[0];
  }
  async function getVideo(videoId) {
    if (!/^[\w-]{11}$/.test(videoId ?? '')) throw new Error('Invalid YouTube video ID');
    const result = await api(`videos?part=snippet,status,processingDetails&id=${encodeURIComponent(videoId)}`);
    return result.items?.[0] ?? null;
  }
  async function ownVideo(videoId) {
    await verifyIdentity();
    const video = await getVideo(videoId);
    if (!video || video.snippet?.channelId !== channelId) throw new Error('Video does not belong to configured YouTube channel');
    return video;
  }
  async function listUploads() {
    const channel = await verifyIdentity(), playlist = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!playlist) throw new Error('Configured YouTube channel has no uploads playlist');
    const videos = [], seenPages = new Set();
    let page = '';
    do {
      if (seenPages.has(page)) throw new Error('YouTube uploads pagination did not advance');
      seenPages.add(page);
      const listing = await api(`playlistItems?part=contentDetails&maxResults=50&playlistId=${encodeURIComponent(playlist)}${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`);
      const ids = (listing.items ?? []).map(item => item.contentDetails?.videoId).filter(Boolean);
      if (ids.length) {
        const batch = await api(`videos?part=snippet,status,processingDetails&id=${ids.map(encodeURIComponent).join(',')}`);
        for (const video of batch.items ?? []) {
          if (video.snippet?.channelId !== channelId) throw new Error('Uploads playlist returned another channel video');
          videos.push(video);
        }
      }
      page = listing.nextPageToken ?? '';
    } while (page);
    return videos;
  }
  async function upload({ filePath, metadata, publishAt, marker, onCheckpoint, checkpoint }) {
    const when = publishAt === undefined ? undefined : (checkpoint?.publishAt === publishAt ? publishAt : futureUtc(publishAt));
    if (typeof marker !== 'string' || !/^[A-Za-z0-9_./:-]{1,200}$/.test(marker)) throw new Error('A stable production marker is required');
    if (typeof onCheckpoint !== 'function') throw new Error('A durable onCheckpoint callback is required');
    const label = `[production:${marker}]`;
    const size = (await stat(filePath)).size;
    if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Video file must be nonempty');
    const sha256 = await digest(filePath);
    if (checkpoint && (checkpoint.marker !== marker || checkpoint.channelId !== channelId || checkpoint.size !== size || checkpoint.sha256 !== sha256)) throw new Error('Upload checkpoint does not match channel, marker, or video bytes');
    if (checkpoint && checkpoint.publishAt !== when) throw new Error('Upload checkpoint publication time cannot be changed during a resumable upload');
    let state = { ...checkpoint, marker, channelId, size, sha256, ...(when ? { publishAt: when } : {}) };
    async function save(change) { state = { ...state, ...change }; await onCheckpoint({ ...state }); }
    async function complete(video) {
      if (!/^[\w-]{11}$/.test(video?.id ?? '') || video.snippet?.channelId !== channelId) throw new Error('Upload completion did not identify an owned YouTube video');
      if (when && video.status?.privacyStatus !== 'public' && Date.parse(video.status?.publishAt) !== Date.parse(when)) throw new Error('Existing upload does not carry the requested schedule; refusing duplicate upload or implicit rescheduling');
      await save({ phase: 'complete', videoId: video.id, nextOffset: size });
      return video;
    }
    async function reconcile() {
      const matches = (await listUploads()).filter(video => (video.snippet?.description ?? '').includes(label));
      if (matches.length > 1) throw new Error('Multiple YouTube videos carry this production marker; reconcile manually');
      return matches[0];
    }
    const existing = await reconcile();
    if (existing) return complete(existing);
    if (state.videoId) {
      const video = await getVideo(state.videoId);
      if (video && video.snippet?.channelId === channelId && (video.snippet?.description ?? '').includes(label)) return complete(video);
      throw new Error('Previously completed upload is not observable; refusing a duplicate');
    }
    if (state.phase === 'complete' || (checkpoint && !state.sessionUrl)) throw new Error('Ambiguous upload checkpoint; refusing a duplicate');
    if (!state.sessionUrl) {
      if (when) futureUtc(when);
      if (typeof metadata?.title !== 'string' || !metadata.title.trim() || metadata.title.length > 100) throw new Error('Video title must contain 1–100 characters');
      const description = `${metadata.description ?? ''}\n\n${label}`;
      if (Buffer.byteLength(description, 'utf8') > 5000) throw new Error('Video description including production marker exceeds 5000 bytes');
      if (metadata.tags !== undefined && (!Array.isArray(metadata.tags) || metadata.tags.some(tag => typeof tag !== 'string'))) throw new Error('Video tags must be strings');
      const response = await authorized(UPLOAD + 'videos?uploadType=resumable&part=snippet,status', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(size) },
        body: JSON.stringify({ snippet: { title: metadata.title, description, tags: metadata.tags ?? [], categoryId: '27' }, status: { privacyStatus: 'private', ...(when ? { publishAt: when } : {}), selfDeclaredMadeForKids: false, containsSyntheticMedia: true } }),
      }, 'youtube.upload');
      if (!response.ok) await responseJson(response);
      await save({ phase: 'uploading', sessionUrl: sessionAddress(response.headers.get('location')), nextOffset: 0 });
    } else {
      sessionAddress(state.sessionUrl);
      const response = await authorized(state.sessionUrl, { method: 'PUT', headers: { 'Content-Length': '0', 'Content-Range': `bytes */${size}` } }, 'youtube.upload');
      if (response.ok) return complete(await responseJson(response));
      if (response.status !== 308) {
        const recovered = await reconcile();
        if (recovered) return complete(recovered);
        throw new Error(`Resumable upload status HTTP ${response.status}; outcome ambiguous, refusing a duplicate`);
      }
      await save({ phase: 'uploading', nextOffset: nextOffset(response, size) });
    }
    const file = await open(filePath, 'r');
    try {
      while (state.nextOffset < size) {
        const start = state.nextOffset, length = Math.min(CHUNK, size - start), bytes = Buffer.allocUnsafe(length);
        const { bytesRead } = await file.read(bytes, 0, length, start);
        if (bytesRead !== length) throw new Error('Video file changed during upload');
        await save({ phase: 'uploading', attemptedEnd: start + length - 1 });
        let response;
        try {
          response = await authorized(state.sessionUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(length), 'Content-Range': `bytes ${start}-${start + length - 1}/${size}` }, body: bytes }, 'youtube.upload');
        } catch (error) {
          await save({ phase: 'uncertain' });
          throw new Error('Upload interrupted; persisted session must be reconciled and resumed', { cause: error });
        }
        if (response.ok) return complete(await responseJson(response));
        if (response.status !== 308) {
          await save({ phase: 'uncertain' });
          throw new Error(`Upload HTTP ${response.status}; retry using persisted session, never a fresh upload`);
        }
        const offset = nextOffset(response, size);
        if (offset <= start || offset > start + length) throw new Error('YouTube returned a non-advancing or impossible upload range');
        await save({ phase: 'uploading', nextOffset: offset });
      }
      await save({ phase: 'uncertain' });
      throw new Error('All bytes received without a video ID; reconcile persisted upload before retry');
    } finally { await file.close(); }
  }
  async function setThumbnail({ videoId, filePath }) {
    await ownVideo(videoId);
    const size = (await stat(filePath)).size;
    if (size <= 0 || size > 2 * 1024 * 1024) throw new Error('YouTube thumbnail must be nonempty and at most 2 MiB');
    const stream = createReadStream(filePath);
    try {
      return await responseJson(await authorized(UPLOAD + `thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, { method: 'POST', headers: { 'Content-Type': filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg', 'Content-Length': String(size) }, body: stream, duplex: 'half' }, 'youtube.thumbnail'), 'thumbnail');
    } finally { stream.destroy(); }
  }
  async function schedule({ videoId, publishAt }) {
    const when = futureUtc(publishAt), video = await ownVideo(videoId);
    if (Date.parse(video.status?.publishAt) === Date.parse(when)) return video;
    if (video.status?.privacyStatus !== 'private') throw new Error('Only a private video can be scheduled');
    if (video.status?.uploadStatus !== 'processed' || (video.processingDetails?.processingStatus && video.processingDetails.processingStatus !== 'succeeded')) throw new Error('Video processing must succeed before scheduling');
    futureUtc(when);
    return responseJson(await authorized(API + 'videos?part=status', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: videoId, status: { privacyStatus: 'private', publishAt: when, selfDeclaredMadeForKids: false, containsSyntheticMedia: true } }) }, 'youtube.schedule'));
  }
  return { verifyIdentity, listUploads, upload, setThumbnail, getVideo, schedule };
}

function nextOffset(response, size) {
  const range = response.headers.get('range');
  if (!range) return 0;
  const match = /^(?:bytes=)?0-(\d+)$/.exec(range);
  const offset = match ? Number(match[1]) + 1 : NaN;
  if (!Number.isSafeInteger(offset) || offset < 1 || offset > size) throw new Error('Invalid YouTube resumable Range header');
  return offset;
}
