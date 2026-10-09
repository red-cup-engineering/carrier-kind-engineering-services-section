#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { argument as option } from "@red-cup-engineering/javascript-node-services-section/argv";
import { attestTokenClaimThroughEnterpriseAccount } from "../src/enterprise-eas-attestation.mjs";

const request = JSON.parse(readFileSync(option("--request") ?? 0, "utf8"));
const result = await attestTokenClaimThroughEnterpriseAccount({
  ...request,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
