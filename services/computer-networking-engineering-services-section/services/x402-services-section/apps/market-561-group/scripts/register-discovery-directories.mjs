#!/usr/bin/env node
// Register market.561.group's origin with the x402 directories that list sellers by origin:
//   node scripts/register-discovery-directories.mjs [https://market.561.group] [true402,agent402]
import { registerWithDirectories } from "../src/discovery-directories.mjs";

const origin = process.argv[2] ?? process.env.X402_PUBLIC_ORIGIN ?? "https://market.561.group";
const directories = process.argv[3]?.split(",").filter(Boolean);
const receipts = await registerWithDirectories({ origin, ...(directories ? { directories } : {}) });
process.stdout.write(`${JSON.stringify(receipts, null, 2)}\n`);
if (receipts.some((receipt) => receipt.type === "X402DirectoryRegistrationRefusal")) process.exitCode = 1;
