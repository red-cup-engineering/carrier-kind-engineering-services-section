import { verifyEnvelope } from './envelope.mjs';
import { mergeTraces } from './trace.mjs';

export function createSwarmState({ id, players = [], sharedTrace = [] }) {
  const playerMap = new Map();
  for (const player of players) {
    playerMap.set(player.id, player);
  }
  return {
    id,
    players: playerMap,
    sharedTrace: mergeTraces(sharedTrace),
    auditTrace: [],
  };
}

export function auditRow({ event, sender, reason, t = new Date(0).toISOString() }) {
  return {
    e: `audit:${event}`,
    a: 'rejected-because',
    v: { sender, reason },
    t,
  };
}

export function ingestEnvelope(state, envelope, resolvePublicKey) {
  const publicKey = resolvePublicKey(envelope?.sender, envelope?.keyId);
  if (!publicKey) {
    state.auditTrace = mergeTraces(state.auditTrace, [auditRow({
      event: 'federation-envelope',
      sender: envelope?.sender ?? 'unknown',
      reason: 'unknown-key',
      t: envelope?.created ?? new Date(0).toISOString(),
    })]);
    return { accepted: false, reason: 'unknown-key', state };
  }

  if (!verifyEnvelope(envelope, publicKey)) {
    state.auditTrace = mergeTraces(state.auditTrace, [auditRow({
      event: 'federation-envelope',
      sender: envelope.sender,
      reason: 'invalid-signature',
      t: envelope.created,
    })]);
    return { accepted: false, reason: 'invalid-signature', state };
  }

  state.sharedTrace = mergeTraces(state.sharedTrace, envelope.rows);
  return { accepted: true, rows: envelope.rows.length, state };
}

