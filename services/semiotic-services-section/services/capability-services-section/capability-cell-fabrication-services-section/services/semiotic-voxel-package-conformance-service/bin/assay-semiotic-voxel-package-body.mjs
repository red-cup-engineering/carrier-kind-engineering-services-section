#!/usr/bin/env node
import { assaySemioticVoxelPackageBody } from "../src/assay-semiotic-voxel-package-body.mjs";

try {
  process.stdout.write(`${JSON.stringify(await assaySemioticVoxelPackageBody({ root: process.argv[2] ?? process.cwd() }), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify(error.receipt ?? { error: error.message }, null, 2)}\n`);
  process.exitCode = 1;
}
