import { providersOfAccount, characterInbox, readCharacterInbox } from "@red-cup-engineering/metroplat/offices";
import { deliverActivity, resolveActivityPubRecipient } from "@red-cup-engineering/activitypub-services-section";
import { projectSenActivity, senActivityObjectBytes } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { activityPubActorsAtHost } from "./activitypub-node.mjs";

export const CHARACTER_TELLING = "metroplat.character-telling";

/** A Semioverse handle names the same canonical actor served by the node's public face. */
export function characterActorAddress(address) {
  if (typeof address !== "string") throw new TypeError("a recipient actor is required");
  const handle = /^@([a-z0-9][a-z0-9._-]*)@([^/@\s]+)$/u.exec(address);
  const url = new URL(handle ? `https://${handle[2]}/actors/${handle[1]}` : address);
  if ((url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) || url.username || url.password || url.search || url.hash) {
    throw new TypeError("use a Semioverse handle or exact HTTPS actor URL");
  }
  return url.href;
}

/** MetroPlat character communication uses the node's existing signed, durable AP transport.
 * A message is testimony, never an allocation, an office appointment or permission to execute. */
export function hostedCharacterCommunication({ config, binding, provider, resolveRecipient = resolveActivityPubRecipient, deliver = deliverActivity }) {
  async function ownCharacter(account, { optional = false } = {}) {
    if (config.activityPub?.nodeHost === undefined) {
      if (optional) return undefined;
      throw new TypeError("this node has no installed character federation resource");
    }
    const actors = await activityPubActorsAtHost({ agencyRoot: config.agencyRoot, host: config.activityPub.nodeHost,
      keysDirectory: config.activityPub.keysDirectory, instanceActor: config.activityPub.instanceActor });
    const held = new Set(providersOfAccount({ ...binding, agencyRoot: config.agencyRoot }, account));
    const own = actors.filter(actor => actor.character !== undefined && held.has(actor.character.id));
    if (own.length === 0 && optional) return undefined;
    if (own.length !== 1) throw new TypeError("the authenticated account must act for exactly one public character on this node");
    return own[0];
  }
  const read = async ({ account, evidence, at, all = false, optional = false }) => {
    const own = await ownCharacter(account, { optional });
    if (own === undefined) return undefined;
    const character = own.character.id;
    const unread = readCharacterInbox(binding.dataRoot, character, evidence, at, { transport: "world", account, evidence });
    return Object.freeze({ kind: "metroplat.character-inbox", character, messages: all ? characterInbox(binding.dataRoot, character, { unread: false }) : unread });
  };
  const tell = async ({ account, recipient, text, inReplyTo, at }) => {
    const own = await ownCharacter(account);
    if (typeof text !== "string" || !text.trim() || text.length > 16_384) throw new TypeError("a telling needs 1–16384 characters");
    const installed = provider();
    if (installed === undefined) throw new TypeError("the node's signed ActivityPub transport is unavailable");
    const target = await resolveRecipient(installed, characterActorAddress(recipient));
    const activity = projectSenActivity({ type: "Create", origin: config.activityPub.origin, identifier: own.identifier,
      recipient: target.recipient, agentCard: new URL("/.well-known/agent-card.json", config.activityPub.origin).href,
      eventTime: at, objectBytes: senActivityObjectBytes({ objectKind: CHARACTER_TELLING,
        value: { text, ...(inReplyTo === undefined ? {} : { inReplyTo }) } }) });
    await deliver(installed, { identifier: own.identifier, ...target, activity });
    // sendActivity may enqueue; it is not evidence that the remote character read the message.
    return Object.freeze({ kind: "metroplat.character-telling-receipt", id: activity.object.name, activity: activity.id,
      sender: activity.actor, recipient: target.recipient, transport: "submitted", consumerReceipt: false,
      ...(inReplyTo === undefined ? {} : { inReplyTo }) });
  };
  const reply = async ({ account, id, text, at }) => {
    const character = (await ownCharacter(account)).character.id;
    const original = characterInbox(binding.dataRoot, character, { unread: false }).find(message => message.id === id);
    if (original === undefined) throw new TypeError("reply must name an exact message received by this character");
    return tell({ account, recipient: original.sender, inReplyTo: original.id, text, at });
  };
  return Object.freeze({ read, tell, reply });
}
