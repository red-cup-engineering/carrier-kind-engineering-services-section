import { digest, TTI_ACTOR } from "./state-reporting.mjs";

const MEDIA = Object.freeze({ svg: "image/svg+xml", png: "image/png", audio: "audio/mpeg" });
function finite(value) { return typeof value === "string" && value.length > 0 && !value.includes("\0"); }

export function prepareAtomicDiscordPublication({ guildId, channelId, narrative, currentManifest, artifacts, idempotencyKey }) {
  if (![guildId, channelId, narrative?.text, currentManifest?.id, idempotencyKey].every(finite)) throw new TypeError("publication request lacks exact destination, narrative, manifest, or idempotency key");
  const attachmentInputs = [
    ["state-of-the-union.svg", MEDIA.svg, artifacts?.svgBase64, artifacts?.svgDigest],
    ["state-of-the-union.png", MEDIA.png, artifacts?.pngBase64, artifacts?.pngDigest],
    ["state-of-the-union.mp3", MEDIA.audio, artifacts?.audioBase64, artifacts?.audioDigest],
  ];
  const attachments = attachmentInputs.map(([filename, mediaType, bytesBase64, expectedDigest]) => {
    if (!finite(bytesBase64) || !finite(expectedDigest)) throw new TypeError(`publication lacks ${mediaType}`);
    const bytes = Buffer.from(bytesBase64, "base64"); if (bytes.length === 0 || bytes.length > 24 * 1024 * 1024 || digest(bytes) !== expectedDigest) throw new TypeError(`${mediaType} bytes violate digest or size ceiling`);
    return { filename, mediaType, digest: expectedDigest, byteLength: bytes.length, bytesBase64 };
  });
  if (attachments.reduce((sum, item) => sum + item.byteLength, 0) > 24 * 1024 * 1024) throw new TypeError("atomic message exceeds aggregate attachment ceiling");
  return { type: "TTIDiscordAtomicMultipartRequest", guildId, channelId, content: narrative.text.slice(0, 1900), narrativeDigest: narrative.narrativeDigest,
    currentManifestDigest: digest(currentManifest), idempotencyKey, attachments, atomicMultipart: true, requestedMessageCount: 1 };
}

export async function publishAtomicDiscordReport({ request, grant, transport, mode = "dry-run", recordedAt = new Date().toISOString(), priorReceipt }) {
  if (request?.type !== "TTIDiscordAtomicMultipartRequest") return { type: "TTIDiscordPublicationRefusal", status: "refused", reason: "invalid-multipart-request", effects: [] };
  if (priorReceipt?.type === "TTIDiscordPublicationReceipt" && priorReceipt.status === "succeeded" && priorReceipt.idempotencyKey === request.idempotencyKey) return { type: "TTIDiscordPublicationNoDuplicate", status: "already-succeeded", priorReceipt: priorReceipt.id, messageId: priorReceipt.messageId, effects: [] };
  if (mode === "dry-run") return { type: "TTIDiscordPublicationDryRun", status: "validated-no-call", requestDigest: digest(request), externalCalls: 0, effects: [] };
  const exactEffects = ["discord-message-create:one-atomic-multipart"];
  const expiry = Date.parse(grant?.expiresAt); const now = Date.parse(recordedAt);
  if (grant?.type !== "TTIDiscordPublicationGrant" || grant.issuer !== TTI_ACTOR || grant.holder !== "urn:ame:turntide-islands:state-of-harmonious-union-reporting-service" || grant.guildId !== request.guildId || grant.channelId !== request.channelId || grant.idempotencyKey !== request.idempotencyKey || JSON.stringify(grant.effects) !== JSON.stringify(exactEffects) || !Number.isFinite(expiry) || !Number.isFinite(now) || expiry < now) return { type: "TTIDiscordPublicationRefusal", status: "refused", reason: "exact-tti-discord-publication-grant-absent", effects: [] };
  if (typeof transport?.createAtomicMultipartMessage !== "function") return { type: "TTIDiscordPublicationRefusal", status: "refused", reason: "discord-transport-unavailable", effects: [] };
  try {
    const result = await transport.createAtomicMultipartMessage(request);
    if (!finite(result?.messageId) || result.guildId !== request.guildId || result.channelId !== request.channelId) return { type: "TTIDiscordPublicationRefusal", status: "unknown-partial", reason: "transport-result-unbound", effects: ["discord-request-attempted"], transportResultDigest: digest(result ?? null) };
    const body = { type: "TTIDiscordPublicationReceipt", status: "succeeded", recordedAt, guildId: result.guildId, channelId: result.channelId, messageId: result.messageId,
      idempotencyKey: request.idempotencyKey, atomicMultipart: true, messageCount: 1, currentManifestDigest: request.currentManifestDigest,
      narrativeDigest: request.narrativeDigest, attachments: request.attachments.map(({ bytesBase64: _bytes, ...attachment }) => attachment),
      cost: result.cost ?? { status: "unknown", value: null, reason: "transport-did-not-report-cost" }, pilot: grant.pilot === true };
    return { id: `urn:${digest(body)}`, ...body };
  } catch (error) {
    return { type: "TTIDiscordPublicationRefusal", status: "unknown-partial", reason: "discord-transport-threw-after-attempt", detail: error instanceof Error ? error.message : String(error), effects: ["discord-request-attempted"], messageId: null };
  }
}
