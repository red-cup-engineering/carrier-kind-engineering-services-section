/** Messages, communicating faces and channels: what can be transmitted, and by whom. */
const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (code, message) => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const nonnegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

export function createMessage(input) {
  if (!nonempty(input.id) || !nonempty(input.topic) || !nonempty(input.content) || !nonempty(input.author)) return refused("invalid-message", "id, topic, content, and author must be nonempty strings");
  return accepted(Object.freeze({ kind: "sign.message", ...input }));
}
export function createCommunicatingFace(input) {
  if (!nonempty(input.id) || !nonnegativeInteger(input.capacity)) return refused("invalid-face", "id must be nonempty and capacity must be a nonnegative safe integer");
  return accepted(Object.freeze({ kind: "sign.face", ...input }));
}
export function createCommunicationChannel(input) {
  if (!nonempty(input.id) || !nonnegativeInteger(input.capacity)) return refused("invalid-channel", "id must be nonempty and capacity must be a nonnegative safe integer");
  return accepted(Object.freeze({ kind: "sign.channel", ...input }));
}
export function canTransmit(face, channel, messageCount = 1) {
  return nonnegativeInteger(messageCount) && messageCount <= face.capacity && messageCount <= channel.capacity;
}
export function communicate(face, channel, message) {
  return canTransmit(face, channel) ? accepted(message) : refused("invalid-channel", "face and channel capacity must admit one message");
}
export function translateMessage(message, translate) {
  const content = translate(message.content);
  if (!nonempty(content)) return refused("invalid-translation", "translation must produce nonempty content");
  return accepted(Object.freeze({ kind: "sign.translation", source: message, target: Object.freeze({ ...message, content }) }));
}
