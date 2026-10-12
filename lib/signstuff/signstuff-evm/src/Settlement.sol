// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Four } from "./Four.sol";

/// @title Settlement
/// @notice Readings of a settled section: a set of cells with their FOUR values. A contradiction
///         (Both, told both ways) is an ordinary, designated, counted point of the section. Nothing
///         here can revert on, drop or overwrite one.
/// @dev `sectionDigest` is the commitment a pool publishes to another chain (or to Hive) so that a
///      whole settled section travels as 32 bytes. JS twin:
///      `semanticHex([[cellIdBytes, value], ...])` over cells in ascending id order.
library Settlement {
    error SectionNotCanonical(uint256 index);
    error LengthMismatch();

    /// @notice How many cells sit at each point: [None, True, False, Both].
    function census(Four.Point[] memory values) internal pure returns (uint256[4] memory counts) {
        for (uint256 i; i < values.length; ++i) {
            counts[uint8(values[i])] += 1;
        }
    }

    /// @notice The cells held at Both. This is SignCraft `compare(...).paraconsistent`.
    function heldIndices(Four.Point[] memory values) internal pure returns (uint256[] memory out) {
        uint256 n;
        for (uint256 i; i < values.length; ++i) {
            if (values[i] == Four.Point.Both) ++n;
        }
        out = new uint256[](n);
        uint256 k;
        for (uint256 i; i < values.length; ++i) {
            if (values[i] == Four.Point.Both) out[k++] = i;
        }
    }

    /// @notice Total knowledge height: how many sides the section has told. The Lyapunov quantity
    ///         of the settling flow: it only ever grows.
    function wits(Four.Point[] memory values) internal pure returns (uint256 total) {
        for (uint256 i; i < values.length; ++i) {
            total += Four.knowledgeHeight(values[i]);
        }
    }

    /// @notice The designated cells: told for (a held contradiction stays designated).
    function designatedCount(Four.Point[] memory values) internal pure returns (uint256 n) {
        for (uint256 i; i < values.length; ++i) {
            if (Four.isDesignated(values[i])) ++n;
        }
    }

    /// @notice Canonical digest of a section: sha256 of the deterministic CBOR of the array of
    ///         [bytes(cellId), value] pairs. Cells must be strictly ascending.
    function sectionDigest(bytes32[] memory cells, Four.Point[] memory values)
        internal
        pure
        returns (bytes32)
    {
        if (cells.length != values.length) revert LengthMismatch();
        bytes memory out = _arrayHead(cells.length);
        for (uint256 i; i < cells.length; ++i) {
            if (i > 0 && cells[i - 1] >= cells[i]) revert SectionNotCanonical(i);
            // 0x82 array(2) | 0x58 0x20 bytes(32) | cell | uint 0..3
            out = abi.encodePacked(out, hex"825820", cells[i], uint8(values[i]));
        }
        return sha256(out);
    }

    function _arrayHead(uint256 n) private pure returns (bytes memory) {
        if (n < 24) return abi.encodePacked(bytes1(uint8(0x80 | n)));
        if (n <= type(uint8).max) return abi.encodePacked(bytes1(0x98), uint8(n));
        if (n <= type(uint16).max) return abi.encodePacked(bytes1(0x99), uint16(n));
        return abi.encodePacked(bytes1(0x9a), uint32(n));
    }
}
