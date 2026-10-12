import { defineGame } from "../src/game.mjs";

export const teraumGame = defineGame({
  id: "fizzos.teraum",
  name: "Teraum Crossing",
  start: "arathel-quay",
  rooms: {
    "arathel-quay": { name: "Arathel Quay", description: "River craft knock softly against the quay.", exits: { east: "central-plains" } },
    "central-plains": { name: "Central Plains", description: "Grass bends beneath a long inland wind.", exits: { west: "arathel-quay", east: "gloaming-road" } },
    "gloaming-road": { name: "Gloaming Road", description: "The road narrows beneath old trees.", exits: { west: "central-plains" } },
  },
  things: {
    ferryman: { name: "the ferryman", description: "A patient keeper of crossings.", location: "arathel-quay" },
  },
});
