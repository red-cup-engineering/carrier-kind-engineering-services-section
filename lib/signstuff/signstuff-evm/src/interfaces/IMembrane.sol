// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IMembrane
/// @notice SignCraft's membrane as an on-chain admission boundary: who may tell which side of which
///         predicate. A membrane only admits or refuses a telling; it never edits or removes one.
///         A ledger holds its membrane by address, so a pool can swap an allowlist for a token-gated
///         or office-gated policy without touching its settled history.
interface IMembrane {
    /// @param teller    msg.sender of the telling.
    /// @param predicate sha256 of the predicate term's canonical CBOR (the cell's predicate identity).
    /// @param side      0 = told for, 1 = told against.
    /// @param relayed   true when the teller supplies a witness other than its own account (it is
    ///                  vouching for a foreign witness: a Hive account, another chain's ledger...).
    function admits(address teller, bytes32 predicate, uint8 side, bool relayed)
        external
        view
        returns (bool);
}
