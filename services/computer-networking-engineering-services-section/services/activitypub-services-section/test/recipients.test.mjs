// ActivityPub 7.1.1 (outbox delivery) and 5.6 (Public) delivery-target rules.
import test from "node:test";
import assert from "node:assert/strict";
import { PUBLIC } from "../src/as2.mjs";
import { deliveryTargets, stripPrivateAudience } from "../src/recipients.mjs";

const ME = "https://me.example/actors/me";
const FOLLOWERS = `${ME}/followers`;
const followers = [
  { actorId: "https://a.example/u/1", inboxId: "https://a.example/u/1/inbox", sharedInboxId: "https://a.example/inbox" },
  { actorId: "https://a.example/u/2", inboxId: "https://a.example/u/2/inbox", sharedInboxId: "https://a.example/inbox" },
  { actorId: "https://b.example/u/3", inboxId: "https://b.example/u/3/inbox" },
];
const options = { followersId: FOLLOWERS, resolveFollowers: async () => followers, resolveActor: async (id) => (id === "https://c.example/u/4" ? { inboxId: "https://c.example/u/4/inbox" } : null) };

test("Public is never a target; the followers collection expands; shared inboxes deduplicate", async () => {
  const { inboxes } = await deliveryTargets({ type: "Create", actor: ME, to: [PUBLIC], cc: [FOLLOWERS], object: {} }, options);
  assert.deepEqual(inboxes, ["https://a.example/inbox", "https://b.example/u/3/inbox"]);
});

test("directly addressed actors resolve to their inbox; unknown and duplicate addressees are skipped", async () => {
  const { inboxes } = await deliveryTargets({ type: "Create", actor: ME, to: ["https://c.example/u/4", "https://c.example/u/4", "https://unknown.example/u"], object: {} }, options);
  assert.deepEqual(inboxes, ["https://c.example/u/4/inbox"]);
});

test("bto, bcc and audience are delivery targets, and the author is never delivered to", async () => {
  const { inboxes } = await deliveryTargets({ type: "Create", actor: ME, bto: ["https://c.example/u/4"], bcc: [ME], audience: [FOLLOWERS], object: {} }, options);
  assert.deepEqual(inboxes, ["https://c.example/u/4/inbox", "https://a.example/inbox", "https://b.example/u/3/inbox"]);
});

test("bto and bcc are removed from the delivered activity and its object, and the input is unchanged (ActivityPub 7)", async () => {
  const input = { type: "Create", actor: ME, to: ["https://c.example/u/4"], bto: ["https://x.example/u"], bcc: ["https://y.example/u"], object: { type: "Note", bto: ["https://z.example/u"], content: "s" } };
  const { activity } = await deliveryTargets(input, options);
  assert.deepEqual(Object.keys(activity).sort(), ["actor", "object", "to", "type"]);
  assert.equal("bto" in activity.object, false);
  assert.equal(activity.object.content, "s");
  assert.ok(input.bto && input.object.bto, "the authored activity is untouched");
  assert.equal(stripPrivateAudience({ type: "Like", object: "https://x.example/n" }).object, "https://x.example/n");
});

test("a Block is never delivered to its object", async () => {
  const { inboxes } = await deliveryTargets({ type: "Block", actor: ME, object: "https://c.example/u/4", to: ["https://c.example/u/4"] }, options);
  assert.deepEqual(inboxes, []);
  const viaFollowers = await deliveryTargets({ type: "Block", actor: ME, object: "https://b.example/u/3", to: [FOLLOWERS] }, options);
  assert.ok(!viaFollowers.inboxes.includes("https://b.example/u/3/inbox"));
});

test("a collection the author does not own is not expanded", async () => {
  const { inboxes } = await deliveryTargets({ type: "Create", actor: ME, to: ["https://other.example/followers"], object: {} }, options);
  assert.deepEqual(inboxes, []);
});
