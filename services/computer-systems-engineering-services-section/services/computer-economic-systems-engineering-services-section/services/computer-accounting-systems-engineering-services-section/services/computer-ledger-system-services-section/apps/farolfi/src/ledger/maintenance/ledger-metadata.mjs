/** Reads custody-wallet and symbol-to-account metadata out of a Beancount ledger's own text. */

/**
 * @typedef {{ account: string, narration: string, metadata: Record<string, string> }} NoteRecord
 * @typedef {{ account: string, publicAccount: string }} HiveCustodyWallet
 * @typedef {{ account: string, address: string }} EvmCustodyWallet
 */

const NOTE_PATTERN = /^\d{4}-\d{2}-\d{2} note (\S+) "([^"]*)"\n((?:^ {2}\S.*\n?)*)/gmu;
const METADATA_LINE_PATTERN = /^ {2}(\S+): "([^"]*)"$/gmu;
const BALANCE_PATTERN = /^\d{4}-\d{2}-\d{2} balance (Assets:Digital-Assets:HiveEngine:\S+) +[-\d.]+ +(\S+)$/gmu;

/**
 * Parse every `note` directive in a Beancount ledger's text into its account, narration, and
 * indented metadata key/value pairs.
 * @param {string} ledgerText
 * @returns {NoteRecord[]}
 */
export function parseNoteRecords(ledgerText) {
  const records = [];
  for (const match of ledgerText.matchAll(NOTE_PATTERN)) {
    const [, account, narration, metadataBlock] = match;
    const metadata = {};
    for (const line of metadataBlock.matchAll(METADATA_LINE_PATTERN)) {
      metadata[line[1]] = line[2];
    }
    records.push({ account, narration, metadata });
  }
  return records;
}

/**
 * The Hive custody wallets (`Assets:Digital-Assets:Hive:Custody:*`, `inventory: "hive-account"`),
 * keyed by their `public_account` metadata.
 * @param {string} ledgerText
 * @returns {HiveCustodyWallet[]}
 */
export function hiveCustodyWallets(ledgerText) {
  return parseNoteRecords(ledgerText)
    .filter((r) => r.account.startsWith("Assets:Digital-Assets:Hive:Custody:") && r.metadata.inventory === "hive-account")
    .map((r) => ({ account: r.account, publicAccount: r.metadata.public_account }));
}

/**
 * The EVM custody wallets meant for balance observation
 * (`Assets:Digital-Assets:EVM:Custody:*`, `inventory: "evm-address"`).
 * @param {string} ledgerText
 * @returns {EvmCustodyWallet[]}
 */
export function evmCustodyWallets(ledgerText) {
  return parseNoteRecords(ledgerText)
    .filter((r) => r.account.startsWith("Assets:Digital-Assets:EVM:Custody:") && r.metadata.inventory === "evm-address")
    .map((r) => ({ account: r.account, address: r.metadata.address }));
}

/**
 * The account each Hive-Engine commodity is already booked under in the ledger, read from
 * existing `balance Assets:Digital-Assets:HiveEngine:*` directives.
 * @param {string} ledgerText
 * @returns {Record<string, string>} symbol -> account
 */
export function hiveEngineSymbolAccounts(ledgerText) {
  const map = {};
  for (const match of ledgerText.matchAll(BALANCE_PATTERN)) {
    const [, account, symbol] = match;
    if (!(symbol in map)) map[symbol] = account;
  }
  return map;
}

/**
 * The account a Hive-Engine commodity books to: its existing account in the ledger if one is
 * recorded, else `Assets:Digital-Assets:HiveEngine:Unclassified`.
 * @param {string} symbol
 * @param {Record<string, string>} symbolAccounts
 * @returns {string}
 */
export function hiveEngineAccountFor(symbol, symbolAccounts) {
  return symbolAccounts[symbol] ?? "Assets:Digital-Assets:HiveEngine:Unclassified";
}

/**
 * The distinct commodity symbols already booked under
 * `Assets:Digital-Assets:HiveEngine:Unclassified`.
 * @param {string} ledgerText
 * @returns {string[]}
 */
export function hiveEngineUnclassifiedSymbols(ledgerText) {
  const symbols = new Set();
  for (const match of ledgerText.matchAll(BALANCE_PATTERN)) {
    const [, account, symbol] = match;
    if (account === "Assets:Digital-Assets:HiveEngine:Unclassified") symbols.add(symbol);
  }
  return [...symbols].sort();
}
