// mesh/address.ts — Peer addressing and identity for the mesh layer.
//
// A Peer is a Meme: {subject: peerId, predicate: "peer", object: address}.
// Stored charge evidence settles peer reachability. Addresses are URIs (http/https/unix socket).
import { witness, chargeOfUtterances, recallWhere, UtteranceLog } from "@red-cup-engineering/computer-data-engine/utterance-log";
export class PeerRegistry {
    store = new UtteranceLog();
    peers = new Map();
    register(peer) {
        this.peers.set(peer.id, peer);
        witness(this.store, { subject: peer.id, predicate: "peer", object: peer.address }, [true, false]);
        if (peer.tags) {
            for (const tag of peer.tags) {
                witness(this.store, { subject: peer.id, predicate: "tag", object: tag }, [true, false]);
            }
        }
    }
    deregister(id) {
        this.peers.delete(id);
        witness(this.store, { subject: id, predicate: "peer", object: "deregistered" }, [false, true]);
    }
    markHealth(id, health) {
        const value = health === "up" ? [true, false] : health === "down" ? [false, true] : [true, true];
        witness(this.store, { subject: id, predicate: "health", object: health }, value);
    }
    settle(id) {
        return chargeOfUtterances(recallWhere(this.store, { subject: id, predicate: "peer" }));
    }
    get(id) { return this.peers.get(id); }
    byTag(tag) {
        return [...this.peers.values()].filter((p) => p.tags?.includes(tag) && this.settle(p.id) === "potential");
    }
    all() {
        return [...this.peers.values()].filter((p) => this.settle(p.id) === "potential");
    }
}
export function parsePeerAddress(raw) {
    const url = new URL(raw);
    const id = url.hostname + ":" + url.port;
    return { id, address: raw };
}
