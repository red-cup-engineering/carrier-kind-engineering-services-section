// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title GraphCohomology
/// @notice SignGraph's `cohomologyOfCells` for small instances, checked on-chain.
/// @dev Each cell (s, p, o) is a 1-cell from entity s to entity o. H^0 has rank = #connected
///      components; H^1 has rank = #cells - #entities + #components (the first Betti number, the
///      cycles no 0-cochain bounds). Computed by union-find over entity ids (JS `cohomologyOfCells`
///      uses the same). O(n^2) in the number of cells because entities are deduplicated by scan,
///      so it is meant for audits of a few dozen cells; larger sections are committed (DESIGN.md sec. 9).
///      Entity ids are `SignCell.termId` of the subject/object terms.
library GraphCohomology {
    error LengthMismatch();

    struct Betti {
        uint256 entities;
        uint256 cells;
        uint256 h0;
        uint256 h1;
    }

    function betti(bytes32[] memory subjects, bytes32[] memory objects)
        internal
        pure
        returns (Betti memory r)
    {
        uint256 n = subjects.length;
        if (objects.length != n) revert LengthMismatch();
        bytes32[] memory entity = new bytes32[](2 * n);
        uint256 count;
        uint256[] memory sIdx = new uint256[](n);
        uint256[] memory oIdx = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            (sIdx[i], count) = _index(entity, count, subjects[i]);
            (oIdx[i], count) = _index(entity, count, objects[i]);
        }
        uint256[] memory parent = new uint256[](count);
        for (uint256 i; i < count; ++i) parent[i] = i;
        uint256 components = count;
        for (uint256 i; i < n; ++i) {
            uint256 a = _find(parent, sIdx[i]);
            uint256 b = _find(parent, oIdx[i]);
            if (a != b) {
                parent[a] = b;
                --components;
            }
        }
        r = Betti(count, n, components, n + components - count);
    }

    function _index(bytes32[] memory entity, uint256 count, bytes32 id)
        private
        pure
        returns (uint256, uint256)
    {
        for (uint256 i; i < count; ++i) {
            if (entity[i] == id) return (i, count);
        }
        entity[count] = id;
        return (count, count + 1);
    }

    function _find(uint256[] memory parent, uint256 x) private pure returns (uint256) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }
}
