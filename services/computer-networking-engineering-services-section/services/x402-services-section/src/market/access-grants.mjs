/**
 * A market's access grants: which wallets may use which offers without
 * paying. A grant names one account and the operations it covers; the
 * account is a CAIP-10 id (`eip155:8453:0x…`, that wallet on that chain) or a
 * bare EVM address (that wallet on any EVM chain). A wallet proves it is the
 * account with sign-in-with-x (../sign-in-with-x.mjs); a grant is the
 * market's side of the same entitlement a payment would have bought.
 *
 * The record is `{ type: "MarketAccessGrants", version: 1, grants: [
 *   { account, operations: ["<operation>", …] | ["*"], note, grantedBy, grantedAt, until? } ] }`.
 */

const CAIP10_EVM = /^eip155:(\d+):(0x[0-9a-fA-F]{40})$/u;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const DATE = /^\d{4}-\d{2}-\d{2}(T.*)?$/u;

/**
 * Admit a grants record against the operations a market sells.
 * @param {object} record the MarketAccessGrants record
 * @param {{operations: Iterable<string>}} market the operations the grants may name
 */
export function admitAccessGrants(record, { operations }) {
  const sold = new Set(operations);
  if (record?.type !== "MarketAccessGrants" || record.version !== 1 || !Array.isArray(record.grants)) throw new TypeError("access grants must be a MarketAccessGrants version 1 record");
  const grants = record.grants.map((grant, index) => {
    const where = `grant ${index + 1}`;
    const caip = CAIP10_EVM.exec(grant?.account ?? "");
    if (!caip && !EVM_ADDRESS.test(grant?.account ?? "")) throw new TypeError(`${where}: account must be a CAIP-10 EVM account or an EVM address`);
    if (!Array.isArray(grant.operations) || grant.operations.length === 0) throw new TypeError(`${where}: operations must list what it grants`);
    for (const operation of grant.operations) if (operation !== "*" && !sold.has(operation)) throw new TypeError(`${where}: the market sells no operation ${operation}`);
    if (typeof grant.note !== "string" || grant.note.trim() === "") throw new TypeError(`${where}: note must say why`);
    if (typeof grant.grantedBy !== "string" || !DATE.test(grant.grantedAt ?? "")) throw new TypeError(`${where}: grantedBy and grantedAt are required`);
    if (grant.until !== undefined && !DATE.test(grant.until)) throw new TypeError(`${where}: until must be a date`);
    return Object.freeze({
      chain: caip ? `eip155:${caip[1]}` : null,
      address: (caip ? caip[2] : grant.account).toLowerCase(),
      operations: new Set(grant.operations),
      until: grant.until === undefined ? null : Date.parse(grant.until.length === 10 ? `${grant.until}T23:59:59.999Z` : grant.until),
      note: grant.note,
    });
  });
  return Object.freeze({
    size: grants.length,
    /** The grant that lets `account` use `operation` now, or null. */
    grantFor(account, operation, now = Date.now()) {
      const caip = CAIP10_EVM.exec(account ?? "");
      if (!caip) return null;
      const chain = `eip155:${caip[1]}`; const address = caip[2].toLowerCase();
      return grants.find((grant) => grant.address === address && (grant.chain === null || grant.chain === chain)
        && (grant.operations.has("*") || grant.operations.has(operation)) && (grant.until === null || now <= grant.until)) ?? null;
    },
  });
}
