#!/usr/bin/env node
/** solar-economics-cli — composes computer-solar-economic-systems-engineering-services-section's eight published operations into one
 *  CLI/NDJSON face; the seat package holds no operation logic of its own, per the import-
 *  stratification law (apps compose scripts, src, and apps; scripts never import apps). */
import { observeIrradiance } from "@red-cup-engineering/observe-irradiance-service";
import { deriveYieldProjection } from "@red-cup-engineering/derive-yield-projection-service";
import { valueLedgerInKilowattHours } from "@red-cup-engineering/value-ledger-in-kilowatt-hours-service";
import { deriveJoulesPerSettledRow } from "@red-cup-engineering/derive-joules-per-settled-row-service";
import { deriveSetOfHouseholdEnergyPriceDirectives } from "@red-cup-engineering/derive-set-of-household-energy-price-directives-service";
import { deriveHouseholdEnergyBarrier } from "@red-cup-engineering/derive-household-energy-barrier-service";
import { importUtilityStatement } from "@red-cup-engineering/import-utility-statement-service";
import { settleEnergyExchange } from "@red-cup-engineering/settle-energy-exchange-service";

const OPERATIONS = Object.freeze({
  "observe-irradiance": observeIrradiance,
  "derive-yield-projection": deriveYieldProjection,
  "value-ledger-in-kilowatt-hours": valueLedgerInKilowattHours,
  "derive-joules-per-settled-row": deriveJoulesPerSettledRow,
  "derive-set-of-household-energy-price-directives": deriveSetOfHouseholdEnergyPriceDirectives,
  "derive-household-energy-barrier": deriveHouseholdEnergyBarrier,
  "import-utility-statement": importUtilityStatement,
  "settle-energy-exchange": settleEnergyExchange,
});

export const HELP_TEXT = `solar-economics — computer-solar-economic-systems-engineering-services-section's composed CLI over its eight published operations.

Usage: solar-economics <command>

Commands:
${Object.keys(OPERATIONS).map((name) => `  ${name}`).join("\n")}

Each command reads one JSON value per stdin line and writes one JSON value per stdout line.
`;

/**
 * Dispatches one solar-economics-cli command against one already-parsed input value by calling
 * exactly the named child operation's own export.
 * @param {{command: string, input: object}} request A command name and its operation's own
 *   parameter object.
 * @returns {Promise<object>} The named operation's own return value, or `{refused:
 *   "UNKNOWN_COMMAND", command}` for a command this CLI does not compose.
 */
export async function runSolarEconomicsCommand({ command, input }) {
  const operation = OPERATIONS[command];
  if (operation === undefined) {
    return { refused: "UNKNOWN_COMMAND", command };
  }
  return operation(input);
}

if (import.meta.main) {
  const command = process.argv[2];
  if (command === undefined || command === "--help") {
    process.stdout.write(HELP_TEXT);
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length === 0) continue;
      process.stdout.write(`${JSON.stringify(await runSolarEconomicsCommand({ command, input: JSON.parse(line) }))}\n`);
    }
  }
}
