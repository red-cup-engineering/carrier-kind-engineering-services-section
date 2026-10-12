import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evidence, knowledgeReading } from '@red-cup-engineering/signcell/cell';
import { messageCarrier, uptakeCarrier, speakerCarrier, listenerCarrier, channelCarrier } from '../src/messaging/carriers.mjs';
// Boundary fixtures mirror the exact returned records at pinned messaging/index.mjs.
// This tests actual schemaFrom admission and SignCell evidence. It does not invoke
// the language-dependent sendMessage/receiveMessage constructors.
const speaker = Object.freeze({ kind: 'communicating.messaging.speaker', name: 'source', semiosphere: {} });
const listener = Object.freeze({ kind: 'communicating.messaging.listener', name: 'receiver', semiosphere: {} });
const channel = Object.freeze({ kind: 'communicating.messaging.channel', medium: 'text', from: speaker.semiosphere, to: listener.semiosphere, capacity: null });
const sent = Object.freeze({ kind: 'communicating.messaging.message', text: 'source assertion', content: {}, speaker, listener, channel, status: 'sent', evidence: evidence({ for: [speaker.name] }) });
const taken = evidence({ against: [listener.name] });
const uptake = Object.freeze({ kind: 'communicating.messaging.uptake', consumed: Object.freeze({ ...sent, status: 'received', evidence: taken }), reading: {}, evidence: taken });
test('Message admits the actual send boundary field set with upstream SignCell evidence', () => {
 assert.equal(messageCarrier.validate(sent), true, messageCarrier.errors(sent).join('; '));
 assert.equal(knowledgeReading(sent.evidence), 'potential');
});
test('Uptake admits the receive boundary field set and retained consumed message', () => {
 assert.equal(uptakeCarrier.validate(uptake), true, uptakeCarrier.errors(uptake).join('; '));
 assert.equal(messageCarrier.validate(uptake.consumed), true, messageCarrier.errors(uptake.consumed).join('; '));
 assert.equal(knowledgeReading(uptake.evidence), 'active');
});
test('Message refuses a missing evidence field', () => {
 const { evidence: ignored, ...missing } = sent;
 assert.equal(messageCarrier.validate(missing), false);
});
test('Message does not replace carried evidence with a derived reading', () => {
 const { evidence: ignored, ...missing } = sent;
 assert.equal(messageCarrier.validate({ ...missing, reading: 'potential' }), false);
});
test('existing speaker, listener and channel refinements remain admitted', () => {
 assert.equal(speakerCarrier.validate(speaker), true);
 assert.equal(listenerCarrier.validate(listener), true);
 assert.equal(channelCarrier.validate(channel), true);
});
test('Message still refuses an unsupported status and unrequested fields', () => {
 assert.equal(messageCarrier.validate({ ...sent, status: 'delivered' }), false);
 assert.equal(messageCarrier.validate({ ...sent, unrelated: true }), false);
});
test('Uptake refuses absent evidence', () => {
 const { evidence: ignored, ...missing } = uptake;
 assert.equal(uptakeCarrier.validate(missing), false);
});
test('Uptake still requires its independent language reading', () => {
 const { reading: ignored, ...missing } = uptake;
 assert.equal(uptakeCarrier.validate(missing), false);
});
test('Uptake refuses unexpected fields', () => {
 assert.equal(uptakeCarrier.validate({ ...uptake, unrelated: true }), false);
});
