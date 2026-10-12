import assert from "node:assert/strict";
import test from "node:test";
import { enactNpcAction, chooseNpcAction, driftNeeds, moodOf, need } from "../src/npc.mjs";
import { flagCrime, payBounty, priceMultiplier, shiftStanding, standing } from "../src/reputation.mjs";
import { effectiveSkill, practice, skillLevel, skillTier } from "../src/skills.mjs";
import { awardExperience, foundGuild, foundParty, guildMembers, joinGuild, joinParty, partyMembers, titleFor } from "../src/social.mjs";
import { createWorld, declareFunctional, move, tell, value } from "../src/world.mjs";

test("skills improve with diminishing returns, cap, tiers, and synergy", () => {
  let world = createWorld();
  let first = practice(world, "alice", "fishing", 20);
  world = first.world;
  const second = practice(world, "alice", "fishing", 20);
  assert.ok(second.gained < first.gained);
  world = second.world;
  world = practice(world, "alice", "sailing", 50).world;
  assert.ok(effectiveSkill(world, "alice", "fishing", { fishing: ["sailing"] }) > skillLevel(world, "alice", "fishing"));
  for (let index = 0; index < 100; index += 1) world = practice(world, "alice", "fishing", 100).world;
  assert.equal(skillLevel(world, "alice", "fishing"), 100);
  assert.equal(skillTier(100), "master");
});

test("parties, guilds, experience, and titles are world facts", () => {
  let world = createWorld();
  let result = foundParty(world, "alice");
  world = joinParty(result.world, "bob", result.id);
  assert.deepEqual(partyMembers(world, result.id), ["alice", "bob"]);
  result = foundGuild(world, "alice", "Gardeners");
  world = joinGuild(result.world, "bob", result.id);
  assert.deepEqual(guildMembers(world, result.id), ["alice", "bob"]);
  world = awardExperience(world, "alice", 600);
  assert.equal(titleFor(world, "alice"), "veteran");
  assert.equal(value(world, result.id, "name"), "Gardeners");
});

test("standing affects commerce, rivals invert it, and crime produces payable bounty", () => {
  let world = declareFunctional(createWorld(), ["coin"]);
  world = tell(world, { subject: "alice", predicate: "coin", object: 100 });
  world = shiftStanding(world, "alice", "fishers", 50, { rivals: { fishers: ["industrialists"] } });
  assert.equal(standing(world, "alice", "fishers"), 50);
  assert.equal(standing(world, "alice", "industrialists"), -50);
  assert.ok(priceMultiplier(world, "alice", "fishers") < 1);
  world = flagCrime(world, "alice", 20);
  assert.equal(value(world, "alice", "bounty"), 20);
  world = payBounty(world, "alice");
  assert.equal(value(world, "alice", "bounty"), 0);
  assert.equal(value(world, "alice", "coin"), 80);
});

test("NPC needs produce moods and unscripted utility choices", () => {
  let world = createWorld();
  world = move(world, "npc", "room");
  world = move(world, "bread", "room");
  world = tell(declareFunctional(world, ["food", "need:hunger"]), [
    { subject: "bread", predicate: "food", object: true },
    { subject: "npc", predicate: "need:hunger", object: 90 },
  ]);
  assert.equal(moodOf(world, "npc"), "desperate");
  const action = chooseNpcAction(world, "npc");
  assert.deepEqual(action, { kind: "eat", target: "bread", utility: 100 });
  world = enactNpcAction(world, "npc", action);
  assert.equal(need(world, "npc", "hunger"), 30);
  assert.equal(value(world, "bread", "located-in"), "fizzos:void");
  world = driftNeeds(world, "npc", { hunger: 5 });
  assert.equal(need(world, "npc", "hunger"), 35);
});
