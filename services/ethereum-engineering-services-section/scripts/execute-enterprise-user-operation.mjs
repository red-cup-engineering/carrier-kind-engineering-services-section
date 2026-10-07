#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { argument as option } from "@red-cup-engineering/javascript-node-services-section/argv";
import { executeEnterpriseUserOperation } from "../src/enterprise-user-operation.mjs";
import { createLocalSettlementUserOperationAuthority } from "../src/local-settlement-user-operation-authority.mjs";
const request = JSON.parse(readFileSync(option("--request") ?? 0, "utf8"));
const binding = JSON.parse(readFileSync(request.bindingPath, "utf8"));
const authority = await createLocalSettlementUserOperationAuthority({ keystorePath: request.keystorePath, passwordFile: request.passwordFile, policySigner: binding.policy?.signer });
const result = await executeEnterpriseUserOperation({ ...request, value: BigInt(request.value ?? 0), ...authority });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
