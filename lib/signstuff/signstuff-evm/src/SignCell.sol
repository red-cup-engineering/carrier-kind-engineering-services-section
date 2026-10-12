// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Cbor } from "./Cbor.sol";
import { Four } from "./Four.sol";

/// @title SignCell
/// @notice Cell identity and charge, on the EVM, matching SignCell's JS content address byte for byte.
/// @dev JS: `address(cell) = ni:///sha-256;<b64url(sha256(canonicalCBOR({subject, predicate, object})))>`.
///      The ni: name is only a base64url spelling of that 32-byte digest, so the EVM `cellId` is the
///      digest itself. A cell's evidence never enters the address, so identity does not move when
///      evidence arrives, on any chain.
///
///      Each term is passed already encoded as one canonical-CBOR item (the JS side's
///      `semanticBytes(term)`). Terms are therefore any semiotic JSON value; `textTerm`, `bytesTerm`
///      and `uintTerm` build the common ones on-chain.
///
///      RFC 8949 sec. 4.2.1 sorts map keys by their encoded bytes, which for these keys is
///      length-first: "object" (0x66..), "subject" (0x67 73..), "predicate" (0x69..); for a telling row
///      "side" (0x64..), "object", "subject", "witness" (0x67 77..), "predicate".
library SignCell {
    error TermNotSingleItem(bytes term);

    // header + key bytes, fixed by the deterministic key order
    bytes internal constant CELL_MAP = hex"a3";
    bytes internal constant K_OBJECT = hex"666f626a656374";
    bytes internal constant K_SUBJECT = hex"677375626a656374";
    bytes internal constant K_PREDICATE = hex"69707265646963617465";
    bytes internal constant ROW_MAP = hex"a5";
    bytes internal constant K_SIDE = hex"6473696465";
    bytes internal constant K_WITNESS = hex"677769746e657373";
    // text("for") and text("against"), the two side labels of a SignChain telling row
    bytes internal constant V_FOR = hex"63666f72";
    bytes internal constant V_AGAINST = hex"67616761696e7374";

    bytes32 internal constant TELLING_DOMAIN = sha256("signstuff-evm.telling.v1");

    enum Side {
        For,
        Against
    }

    // — terms —

    function textTerm(string memory s) internal pure returns (bytes memory) {
        return Cbor.text(s);
    }

    function bytesTerm(bytes memory b) internal pure returns (bytes memory) {
        return Cbor.bytesItem(b);
    }

    function uintTerm(uint64 n) internal pure returns (bytes memory) {
        return Cbor.uintItem(n);
    }

    /// @notice A term's identity: the sha256 of its canonical bytes (JS `semanticHex(term)`).
    function termId(bytes memory encodedTerm) internal pure returns (bytes32) {
        return sha256(encodedTerm);
    }

    // — cell identity —

    /// @notice The content address of the triple. Same value on every chain and in JS.
    /// @dev Does not validate the terms; `requireTerms` does, for state-changing entry points.
    function cellId(bytes memory subject, bytes memory predicate, bytes memory object)
        internal
        pure
        returns (bytes32)
    {
        return sha256(abi.encodePacked(CELL_MAP, K_OBJECT, object, K_SUBJECT, subject, K_PREDICATE, predicate));
    }

    function cellIdCalldata(bytes calldata subject, bytes calldata predicate, bytes calldata object)
        internal
        pure
        returns (bytes32)
    {
        return sha256(abi.encodePacked(CELL_MAP, K_OBJECT, object, K_SUBJECT, subject, K_PREDICATE, predicate));
    }

    /// @notice Revert unless every term is exactly one well-formed CBOR item. This keeps the cell
    ///         bytes uniquely parsable, so a cell id names one (subject, predicate, object).
    function requireTerms(bytes memory subject, bytes memory predicate, bytes memory object)
        internal
        pure
    {
        if (!Cbor.isSingleItem(subject)) revert TermNotSingleItem(subject);
        if (!Cbor.isSingleItem(predicate)) revert TermNotSingleItem(predicate);
        if (!Cbor.isSingleItem(object)) revert TermNotSingleItem(object);
    }

    /// @notice The reflexive cell an utterance (token, claim) opens: (token, claim, token).
    function utteranceCellId(bytes memory token, bytes memory claim) internal pure returns (bytes32) {
        return cellId(token, claim, token);
    }

    /// @notice The converse cell (object, predicate, subject). The order is load-bearing.
    function converseId(bytes memory subject, bytes memory predicate, bytes memory object)
        internal
        pure
        returns (bytes32)
    {
        return cellId(object, predicate, subject);
    }

    // — tellings —

    /// @notice The content address of a SignChain telling row `{subject, predicate, object, side, witness}`
    ///         exactly as `semanticHex(telling(at, witness, side))` computes it in JS.
    function tellingRowId(
        bytes memory subject,
        bytes memory predicate,
        bytes memory object,
        Side side,
        bytes memory witness
    ) internal pure returns (bytes32) {
        return sha256(
            abi.encodePacked(
                ROW_MAP,
                K_SIDE,
                side == Side.For ? V_FOR : V_AGAINST,
                K_OBJECT,
                object,
                K_SUBJECT,
                subject,
                K_WITNESS,
                witness,
                K_PREDICATE,
                predicate
            )
        );
    }

    /// @notice The chain-native identity of the fact "witness told this side of this cell".
    ///         A pure function of content: the same telling has the same id on every chain.
    function tellingId(bytes32 cell, Side side, bytes32 witness) internal pure returns (bytes32) {
        return sha256(abi.encodePacked(TELLING_DOMAIN, cell, uint8(side), witness));
    }

    // — witnesses —

    /// @notice A witness's identity: sha256 of its canonical CBOR (the JS side keys sides by those bytes).
    function witnessId(bytes memory encodedWitness) internal pure returns (bytes32) {
        return sha256(encodedWitness);
    }

    /// @notice Chain-agnostic account witness: text "evm:0x<lowercase address>". The same key on two
    ///         chains is one witness, so a member told on Base and on Arbitrum is not counted twice.
    function accountWitness(address account) internal pure returns (bytes memory) {
        return Cbor.text(string.concat("evm:", _hexAddress(account)));
    }

    /// @notice Chain-scoped account witness: text "eip155:<chainId>:0x<lowercase address>", for
    ///         contracts and accounts whose authority exists on one chain only.
    function scopedAccountWitness(uint256 chainId, address account)
        internal
        pure
        returns (bytes memory)
    {
        return Cbor.text(
            string.concat("eip155:", _decimal(chainId), ":", _hexAddress(account))
        );
    }

    // — charge —

    /// @notice The FOUR point a pair of witness counts shows: a side is told when its count is positive.
    function chargeOfCounts(uint256 forCount, uint256 againstCount) internal pure returns (Four.Point) {
        return Four.fromBits(forCount > 0, againstCount > 0);
    }

    /// @notice Obsmetrologia `Record.topMass`: how many tellings each way are held at once.
    function topMass(uint256 forCount, uint256 againstCount) internal pure returns (uint256) {
        return forCount < againstCount ? forCount : againstCount;
    }

    // — small text helpers (no OZ Strings: its Bytes dependency needs MCOPY, which this package avoids) —

    bytes16 private constant HEX = "0123456789abcdef";

    /// @dev "0x" + 40 lowercase hex digits.
    function _hexAddress(address account) private pure returns (string memory) {
        bytes memory out = new bytes(42);
        out[0] = "0";
        out[1] = "x";
        uint160 v = uint160(account);
        for (uint256 i = 41; i > 1; --i) {
            out[i] = HEX[v & 0xf];
            v >>= 4;
        }
        return string(out);
    }

    function _decimal(uint256 n) private pure returns (string memory) {
        if (n == 0) return "0";
        uint256 digits;
        for (uint256 t = n; t != 0; t /= 10) ++digits;
        bytes memory out = new bytes(digits);
        while (n != 0) {
            out[--digits] = bytes1(uint8(48 + (n % 10)));
            n /= 10;
        }
        return string(out);
    }
}
