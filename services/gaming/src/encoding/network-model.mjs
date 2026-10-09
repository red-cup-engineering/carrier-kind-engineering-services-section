

import { encodeArena } from "./arena.mjs";

/** Project the gaming libp2p swarm model into its established JSON shape. */
export function projectLibp2pSwarm(swarm) {
  return {
    kind: swarm.kind,
    id: swarm.id,
    peers: swarm.peers.map((peer) => ({ kind: peer.kind, peerId: peer.peerId, locus: peer.locus })),
    peerstore: swarm.peerstore.map((entry) => ({ kind: entry.kind, peerId: entry.peerId, event: entry.event })),
    dht: swarm.dht.map((entry) => ({ kind: entry.kind, peerId: entry.peerId, event: entry.event })),
    arena: encodeArena(swarm.arena),
  };
}

/** Project the gaming libp2p pubsub model into its established JSON shape. */
export function projectLibp2pPubsub(pubsub) {
  return {
    kind: pubsub.kind,
    topic: pubsub.topic,
    messageId: pubsub.messageId,
    from: pubsub.from,
    deliveries: pubsub.deliveries.map((delivery) => ({
      kind: delivery.kind,
      topic: delivery.topic,
      messageId: delivery.messageId,
      from: delivery.from,
      to: delivery.to,
    })),
    broadcast: pubsub.broadcast,
    symmetryInvariant: pubsub.symmetryInvariant,
  };
}
