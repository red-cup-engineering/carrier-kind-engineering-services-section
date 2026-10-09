/**
 * libp2p as gaming: peer transport for many-agent arenas.
 *
 * This is a protocol algebra, not a libp2p runtime binding. It models the
 * structure the standards map asked for: a peer id is a nominal locus name,
 * the peerstore/DHT is the arena roster, dialing/multiplexing is name-passing
 * into a stream sub-arena, and pubsub is concurrent broadcast over the roster.
 */
import { event, eventStructure } from "@red-cup-engineering/playing/structuring/event/structure";
import { positive } from "@red-cup-engineering/playing/structuring/polarity";
import { arena as arenaOf } from "./arena.mjs";
import { nominalArenaOf } from "./embedding.mjs";
import { eventName } from "./nominalizing/action.mjs";
import { finitePermutation, transposition } from "./nominalizing/permutation.mjs";

const peerEventId = (peerId) => `peer:${peerId}`;
const streamEventId = (streamId, peerId) => `stream:${streamId}:${peerId}`;

function assertName(name, noun) {
  const out = name.trim();
  if (out.length === 0) throw new TypeError(`libp2p: ${noun} must be a non-empty string`);
  return out;
}

function normalizePeerIds(peerIds) {
  return Object.freeze([...new Set(peerIds.map((id) => assertName(id, "peer id")))].sort());
}

function peerOf(peerId) {
  return Object.freeze({
    kind: "gaming.libp2p.peer",
    peerId,
    locus: peerId,
  });
}

function rosterEntry(peerId) {
  return Object.freeze({
    kind: "gaming.libp2p.roster-entry",
    peerId,
    event: peerEventId(peerId),
  });
}

function peerArena(peerIds) {
  const ids = normalizePeerIds(peerIds);
  const base = arenaOf(eventStructure(
    ids.map((peerId) => event(peerEventId(peerId), positive())),
    [],
    [],
  ));
  const labels = ids.map((peerId) => eventName(peerEventId(peerId), peerId));
  const permutations = transpositions(ids);
  return nominalArenaOf(base, labels, permutations);
}

function streamArena(streamId, source, target) {
  const base = arenaOf(eventStructure(
    [
      event(streamEventId(streamId, source), positive()),
      event(streamEventId(streamId, target), positive()),
    ],
    [],
    [],
  ));
  return nominalArenaOf(
    base,
    [
      eventName(streamEventId(streamId, source), source),
      eventName(streamEventId(streamId, target), target),
    ],
    [transposition(source, target)],
  );
}

function transpositions(peerIds) {
  const out = [];
  for (let i = 0; i < peerIds.length; i++) {
    const left = peerIds[i];
    if (left === undefined) continue;
    for (let j = i + 1; j < peerIds.length; j++) {
      const right = peerIds[j];
      if (right !== undefined) out.push(transposition(left, right));
    }
  }
  return Object.freeze(out);
}

export function libp2pSwarm(id, peerIds = []) {
  const peers = normalizePeerIds(peerIds);
  const entries = peers.map(rosterEntry);
  return Object.freeze({
    kind: "gaming.libp2p.swarm",
    id: assertName(id, "swarm id"),
    peers: Object.freeze(peers.map(peerOf)),
    peerstore: Object.freeze(entries),
    dht: Object.freeze(entries),
    arena: peerArena(peers),
  });
}

export function libp2pJoin(swarm, peerId) {
  return libp2pSwarm(swarm.id, [...swarm.peers.map((peer) => peer.peerId), peerId]);
}

export function libp2pLeave(swarm, peerId) {
  const leaving = assertName(peerId, "peer id");
  return libp2pSwarm(swarm.id, swarm.peers.map((peer) => peer.peerId).filter((id) => id !== leaving));
}

export function libp2pDialStream(
  swarm,
  input

,
) {
  const streamId = assertName(input.streamId, "stream id");
  const protocol = assertName(input.protocol, "stream protocol");
  const source = assertName(input.source, "source peer id");
  const target = assertName(input.target, "target peer id");
  if (source === target) throw new TypeError("libp2p: stream source and target must be distinct peer names");
  requirePeer(swarm, source);
  requirePeer(swarm, target);
  return Object.freeze({
    kind: "gaming.libp2p.stream",
    streamId,
    protocol,
    source,
    target,
    multiplexed: true,
    namePassing: transposition(source, target),
    subArena: streamArena(streamId, source, target),
  });
}

export function libp2pPublish(
  swarm,
  input

,
) {
  const topic = assertName(input.topic, "pubsub topic");
  const messageId = assertName(input.messageId, "message id");
  const from = assertName(input.from, "publisher peer id");
  requirePeer(swarm, from);
  const recipients = swarm.peers.map((peer) => peer.peerId).filter((peerId) => peerId !== from).sort();
  return Object.freeze({
    kind: "gaming.libp2p.pubsub",
    topic,
    messageId,
    from,
    deliveries: Object.freeze(recipients.map((to) => Object.freeze({
      kind: "gaming.libp2p.pubsub.delivery",
      topic,
      messageId,
      from,
      to,
    }))),
    broadcast: true,
    symmetryInvariant: true,
  });
}

export function libp2pPeerIds(swarm) {
  return Object.freeze(swarm.peers.map((peer) => peer.peerId));
}

function requirePeer(swarm, peerId) {
  if (!swarm.peers.some((peer) => peer.peerId === peerId)) {
    throw new TypeError(`libp2p: peer ${JSON.stringify(peerId)} is not in swarm ${JSON.stringify(swarm.id)}`);
  }
}

export const emptyLibp2pNamePassing = finitePermutation();
