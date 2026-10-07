/** Renders Beancount `balance` and `price` directives with string metadata, matching the
 *  ledger's own quoted-string metadata convention. */

/**
 * @typedef {{ date: string, account: string, amount: string, commodity: string,
 *   metadata: Record<string, string> }} BalanceDirectiveInput
 * @typedef {{ date: string, symbol: string, price: string, quoteCommodity?: string,
 *   metadata?: Record<string, string> }} PriceDirectiveInput
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function renderMetadata(metadata) {
  return Object.entries(metadata)
    .map(([key, value]) => `  ${key}: "${value}"`)
    .join("\n");
}

/**
 * Render one Beancount `balance` directive with metadata.
 * @param {BalanceDirectiveInput} input
 * @returns {string}
 * @throws {TypeError} if `date` is not `YYYY-MM-DD`
 */
export function renderBalanceDirective({ date, account, amount, commodity, metadata }) {
  if (!DATE_PATTERN.test(date)) throw new TypeError(`beancount-render: not a YYYY-MM-DD date: ${JSON.stringify(date)}`);
  const lines = [`${date} balance ${account} ${amount} ${commodity}`];
  const rendered = renderMetadata(metadata);
  if (rendered !== "") lines.push(rendered);
  return lines.join("\n");
}

/**
 * Render one Beancount `price` directive, with optional metadata. `quoteCommodity` defaults to
 * `USD`; passing another commodity renders the inverse-style directive Beancount also supports
 * (e.g. pricing `USD` itself in `KWH`).
 * @param {PriceDirectiveInput} input
 * @returns {string}
 * @throws {TypeError} if `date` is not `YYYY-MM-DD`
 */
export function renderPriceDirective({ date, symbol, price, quoteCommodity = "USD", metadata = {} }) {
  if (!DATE_PATTERN.test(date)) throw new TypeError(`beancount-render: not a YYYY-MM-DD date: ${JSON.stringify(date)}`);
  const lines = [`${date} price ${symbol} ${price} ${quoteCommodity}`];
  const rendered = renderMetadata(metadata);
  if (rendered !== "") lines.push(rendered);
  return lines.join("\n");
}

/**
 * Join a header comment and a list of rendered directive blocks into one Beancount file body.
 * @param {string} header
 * @param {readonly string[]} blocks
 * @returns {string}
 */
export function renderFile(header, blocks) {
  return `${header}\n\n${blocks.join("\n\n")}\n`;
}
