#!/usr/bin/env node
/**
 * Sign in to one retailer's portal in a visible browser and keep the session
 * (0600, outside the repository). usage: retailer-login.mjs <retailer>
 */
import { runRetailerLoginCli } from "../src/retailer-accounts.mjs";

await runRetailerLoginCli({ args: process.argv.slice(2) });
