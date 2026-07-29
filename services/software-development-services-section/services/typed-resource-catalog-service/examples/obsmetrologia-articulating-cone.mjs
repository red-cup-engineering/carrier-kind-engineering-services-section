import { observeCurrentArticulatingCone } from "./obsmetrologia-articulating-catalog.mjs";

process.stdout.write(`${JSON.stringify(observeCurrentArticulatingCone(), null, 2)}\n`);
