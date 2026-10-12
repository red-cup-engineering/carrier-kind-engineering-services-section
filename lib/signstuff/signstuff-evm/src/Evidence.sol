// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Four } from "./Four.sol";
import { WitnessSet } from "./WitnessSet.sol";

/// @title Evidence
/// @notice Obsmetrologia's `Valued`: a FOUR value together with the witnesses carried on each side,
///         with the lossless operations of `signchain/bilattice`.
/// @dev The value and the evidence are separate fields on purpose. The value is what is read; the
///      evidence is the memory of how it got there. Every value operation (joinK, meetK, joinT,
///      meetT) UNIONS both sides whatever it does to the value (evidence_accumulates_*), so "absurd
///      reached, witnesses kept": a meet can drop the value below what its witnesses show, never a
///      witness. `Measured` means value == presence; a missing value is Measured, so a value only
///      differs from presence after a meet, a conflation or a presumption.
///
///      Two carriers, picked by use case (DESIGN.md sec. 4):
///        Pair      - a bounded registered-witness bitmap: bit i is witness slot i of some registry.
///                    Union is OR, so every law is exact and the join is O(1) gas. For rosters,
///                    tallies, quorums: anything with at most 256 known witnesses.
///        Committed - a Merkle root over a canonical witness set + a count. Unbounded and
///                    cross-chain canonical; a join is checked by opening both sides (small sets) or
///                    contested by a telling (large ones; see DESIGN.md sec. 7).
library Evidence {
    // ───────────────────────── bitmap carrier ─────────────────────────

    struct Pair {
        uint256 forBits;
        uint256 againstBits;
        Four.Point value;
    }

    /// @notice A Measured pair: its value is exactly what its witnesses show.
    function measured(uint256 forBits, uint256 againstBits) internal pure returns (Pair memory) {
        return Pair(forBits, againstBits, Four.fromBits(forBits != 0, againstBits != 0));
    }

    /// @notice A pair with an explicit value (possibly above or below its presence).
    function valued(uint256 forBits, uint256 againstBits, Four.Point value)
        internal
        pure
        returns (Pair memory)
    {
        return Pair(forBits, againstBits, value);
    }

    /// @notice The reading the witnesses alone show (Valued.presence).
    function presence(Pair memory x) internal pure returns (Four.Point) {
        return Four.fromBits(x.forBits != 0, x.againstBits != 0);
    }

    function isMeasured(Pair memory x) internal pure returns (bool) {
        return x.value == presence(x);
    }

    function _union(Pair memory x, Pair memory y, Four.Point value) private pure returns (Pair memory) {
        return Pair(x.forBits | y.forBits, x.againstBits | y.againstBits, value);
    }

    /// @notice Valued.joinK: join the values, union the evidence. Keeps Measured.
    function joinK(Pair memory x, Pair memory y) internal pure returns (Pair memory) {
        return _union(x, y, Four.joinK(x.value, y.value));
    }

    /// @notice Valued.meetK: meet the values, union the evidence. The value can fall below the evidence.
    function meetK(Pair memory x, Pair memory y) internal pure returns (Pair memory) {
        return _union(x, y, Four.meetK(x.value, y.value));
    }

    /// @notice Valued.joinT.
    function joinT(Pair memory x, Pair memory y) internal pure returns (Pair memory) {
        return _union(x, y, Four.joinT(x.value, y.value));
    }

    /// @notice Valued.meetT.
    function meetT(Pair memory x, Pair memory y) internal pure returns (Pair memory) {
        return _union(x, y, Four.meetT(x.value, y.value));
    }

    /// @notice Valued.negate: sides and value swap together; Measured is preserved.
    function negate(Pair memory x) internal pure returns (Pair memory) {
        return Pair(x.againstBits, x.forBits, Four.negate(x.value));
    }

    /// @notice Valued.conflate: the value's knowledge negation; evidence untouched.
    function conflate(Pair memory x) internal pure returns (Pair memory) {
        return Pair(x.forBits, x.againstBits, Four.conflate(x.value));
    }

    /// @notice Valued.presumeFree: every side no witness told is raised to told, with no witness made
    ///         for it. The one sanctioned breach of Measured.
    function presumeFree(Pair memory x) internal pure returns (Pair memory) {
        return Pair(
            x.forBits,
            x.againstBits,
            Four.fromBits(Four.positive(x.value) || x.forBits == 0, Four.negative(x.value) || x.againstBits == 0)
        );
    }

    /// @notice SignChain knowledgeLeq: evidence inclusion, side by side.
    function leqK(Pair memory x, Pair memory y) internal pure returns (bool) {
        return x.forBits & ~y.forBits == 0 && x.againstBits & ~y.againstBits == 0;
    }

    /// @notice SignChain truthLeq: no more for, no less against.
    function leqT(Pair memory x, Pair memory y) internal pure returns (bool) {
        return x.forBits & ~y.forBits == 0 && y.againstBits & ~x.againstBits == 0;
    }

    function witnessFor(Pair memory x, uint8 slot) internal pure returns (Pair memory) {
        return joinK(x, measured(uint256(1) << slot, 0));
    }

    function witnessAgainst(Pair memory x, uint8 slot) internal pure returns (Pair memory) {
        return joinK(x, measured(0, uint256(1) << slot));
    }

    function popcount(uint256 x) internal pure returns (uint256 c) {
        while (x != 0) {
            x &= x - 1;
            ++c;
        }
    }

    /// @notice Obsmetrologia Record: distinct witnesses counted each way.
    function record(Pair memory x) internal pure returns (uint256 pos, uint256 neg) {
        return (popcount(x.forBits), popcount(x.againstBits));
    }

    // ───────────────────────── committed carrier ─────────────────────────

    struct Committed {
        bytes32 forRoot;
        bytes32 againstRoot;
        uint32 forCount;
        uint32 againstCount;
        Four.Point value;
    }

    /// @dev The explicit witness ids behind a Committed value, canonical (strictly ascending).
    struct Opening {
        bytes32[] forIds;
        bytes32[] againstIds;
    }

    error CountOverflow();

    function commit(bytes32[] memory forIds, bytes32[] memory againstIds, Four.Point value)
        internal
        pure
        returns (Committed memory)
    {
        if (forIds.length > type(uint32).max || againstIds.length > type(uint32).max) {
            revert CountOverflow();
        }
        return Committed(
            WitnessSet.root(forIds),
            WitnessSet.root(againstIds),
            uint32(forIds.length),
            uint32(againstIds.length),
            value
        );
    }

    function commitMeasured(bytes32[] memory forIds, bytes32[] memory againstIds)
        internal
        pure
        returns (Committed memory)
    {
        return commit(forIds, againstIds, Four.fromBits(forIds.length != 0, againstIds.length != 0));
    }

    function presence(Committed memory x) internal pure returns (Four.Point) {
        return Four.fromBits(x.forCount != 0, x.againstCount != 0);
    }

    function isMeasured(Committed memory x) internal pure returns (bool) {
        return x.value == presence(x);
    }

    function opens(Committed memory x, Opening memory o) internal pure returns (bool) {
        return x.forCount == o.forIds.length && x.againstCount == o.againstIds.length
            && WitnessSet.root(o.forIds) == x.forRoot && WitnessSet.root(o.againstIds) == x.againstRoot;
    }

    function _requireOpens(Committed memory x, Opening memory o) private pure {
        if (x.forCount != o.forIds.length || x.againstCount != o.againstIds.length) {
            revert WitnessSet.OpeningMismatch(x.forRoot, bytes32(0));
        }
        WitnessSet.requireOpens(o.forIds, x.forRoot);
        WitnessSet.requireOpens(o.againstIds, x.againstRoot);
    }

    function _combine(
        Committed memory x,
        Opening memory xo,
        Committed memory y,
        Opening memory yo,
        Four.Point value
    ) private pure returns (Committed memory) {
        _requireOpens(x, xo);
        _requireOpens(y, yo);
        return commit(
            WitnessSet.union(xo.forIds, yo.forIds), WitnessSet.union(xo.againstIds, yo.againstIds), value
        );
    }

    /// @notice Lossless join of two committed values; both operands must open. For small sets.
    function joinK(Committed memory x, Opening memory xo, Committed memory y, Opening memory yo)
        internal
        pure
        returns (Committed memory)
    {
        return _combine(x, xo, y, yo, Four.joinK(x.value, y.value));
    }

    function meetK(Committed memory x, Opening memory xo, Committed memory y, Opening memory yo)
        internal
        pure
        returns (Committed memory)
    {
        return _combine(x, xo, y, yo, Four.meetK(x.value, y.value));
    }

    function joinT(Committed memory x, Opening memory xo, Committed memory y, Opening memory yo)
        internal
        pure
        returns (Committed memory)
    {
        return _combine(x, xo, y, yo, Four.joinT(x.value, y.value));
    }

    function meetT(Committed memory x, Opening memory xo, Committed memory y, Opening memory yo)
        internal
        pure
        returns (Committed memory)
    {
        return _combine(x, xo, y, yo, Four.meetT(x.value, y.value));
    }

    function negate(Committed memory x) internal pure returns (Committed memory) {
        return Committed(x.againstRoot, x.forRoot, x.againstCount, x.forCount, Four.negate(x.value));
    }

    function conflate(Committed memory x) internal pure returns (Committed memory) {
        return Committed(x.forRoot, x.againstRoot, x.forCount, x.againstCount, Four.conflate(x.value));
    }

    /// @notice Whether the evidence of `x` is included in that of `y` (needs both openings).
    function leqK(Committed memory x, Opening memory xo, Committed memory y, Opening memory yo)
        internal
        pure
        returns (bool)
    {
        _requireOpens(x, xo);
        _requireOpens(y, yo);
        return WitnessSet.isSubset(xo.forIds, yo.forIds) && WitnessSet.isSubset(xo.againstIds, yo.againstIds);
    }
}
