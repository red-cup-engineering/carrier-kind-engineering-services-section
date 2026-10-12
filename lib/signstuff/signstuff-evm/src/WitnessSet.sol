// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title WitnessSet
/// @notice Canonical commitment to a set of witness ids: a sorted-pair Merkle root.
/// @dev SignCell evidence sides are grow-only sets ordered by canonical bytes (a state-based G-Set
///      CRDT). This commits to such a set with a value that is a pure function of the SET (not of
///      arrival order), so two chains, or a chain and JS, holding the same witnesses hold the same
///      root. All hashing is sha256, like every other house identity, so the JS twin
///      (`scripts/lib/witness-set.mjs`) needs only node:crypto.
///
///      leaf(id)   = sha256(0x00 || id)
///      node(a, b) = sha256(0x01 || min(a,b) || max(a,b))     (sorted pair: proofs carry no positions)
///      level k+1  = adjacent pairs of level k; an odd last node is promoted unchanged
///      root       = the single node; the empty set's root is bytes32(0)
///
///      Inputs must be strictly ascending (sorted, no duplicates): that is the canonical form, and
///      what makes a join of two committed sets checkable by a linear merge.
library WitnessSet {
    error NotStrictlyAscending(uint256 index);
    error OpeningMismatch(bytes32 committed, bytes32 recomputed);

    function leaf(bytes32 id) internal pure returns (bytes32) {
        return sha256(abi.encodePacked(bytes1(0x00), id));
    }

    function node(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b
            ? sha256(abi.encodePacked(bytes1(0x01), a, b))
            : sha256(abi.encodePacked(bytes1(0x01), b, a));
    }

    function isStrictlyAscending(bytes32[] memory ids) internal pure returns (bool) {
        for (uint256 i = 1; i < ids.length; ++i) {
            if (ids[i - 1] >= ids[i]) return false;
        }
        return true;
    }

    function requireCanonical(bytes32[] memory ids) internal pure {
        for (uint256 i = 1; i < ids.length; ++i) {
            if (ids[i - 1] >= ids[i]) revert NotStrictlyAscending(i);
        }
    }

    /// @notice The root of a canonical (strictly ascending) set.
    function root(bytes32[] memory ids) internal pure returns (bytes32) {
        requireCanonical(ids);
        uint256 n = ids.length;
        if (n == 0) return bytes32(0);
        bytes32[] memory level = new bytes32[](n);
        for (uint256 i; i < n; ++i) level[i] = leaf(ids[i]);
        while (n > 1) {
            uint256 next = (n + 1) / 2;
            for (uint256 i; i < n / 2; ++i) level[i] = node(level[2 * i], level[2 * i + 1]);
            if (n % 2 == 1) level[next - 1] = level[n - 1];
            n = next;
        }
        return level[0];
    }

    /// @notice Whether `id` is a member of the set committed by `committedRoot`.
    function contains(bytes32[] memory proof, bytes32 committedRoot, bytes32 id)
        internal
        pure
        returns (bool)
    {
        bytes32 h = leaf(id);
        for (uint256 i; i < proof.length; ++i) h = node(h, proof[i]);
        return h == committedRoot;
    }

    /// @notice The union of two canonical sets, canonical. Nothing is dropped.
    function union(bytes32[] memory a, bytes32[] memory b) internal pure returns (bytes32[] memory out) {
        requireCanonical(a);
        requireCanonical(b);
        bytes32[] memory tmp = new bytes32[](a.length + b.length);
        uint256 i;
        uint256 j;
        uint256 k;
        while (i < a.length && j < b.length) {
            if (a[i] < b[j]) tmp[k++] = a[i++];
            else if (a[i] > b[j]) tmp[k++] = b[j++];
            else {
                tmp[k++] = a[i++];
                ++j;
            }
        }
        while (i < a.length) tmp[k++] = a[i++];
        while (j < b.length) tmp[k++] = b[j++];
        out = new bytes32[](k);
        for (uint256 m; m < k; ++m) out[m] = tmp[m];
    }

    /// @notice Whether canonical set `small` is included in canonical set `large`.
    function isSubset(bytes32[] memory small, bytes32[] memory large) internal pure returns (bool) {
        requireCanonical(small);
        requireCanonical(large);
        uint256 j;
        for (uint256 i; i < small.length; ++i) {
            while (j < large.length && large[j] < small[i]) ++j;
            if (j == large.length || large[j] != small[i]) return false;
            ++j;
        }
        return true;
    }

    /// @notice Insert one id into a canonical set (returns a new canonical set).
    function insert(bytes32[] memory ids, bytes32 id) internal pure returns (bytes32[] memory) {
        bytes32[] memory one = new bytes32[](1);
        one[0] = id;
        return union(ids, one);
    }

    /// @notice Revert unless `ids` opens to `committedRoot`.
    function requireOpens(bytes32[] memory ids, bytes32 committedRoot) internal pure {
        bytes32 r = root(ids);
        if (r != committedRoot) revert OpeningMismatch(committedRoot, r);
    }
}
