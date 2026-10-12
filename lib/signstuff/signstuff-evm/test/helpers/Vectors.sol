// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";

/// @notice Golden-vector loading. Vectors come from two independent emitters, each in its own
///         directory with identical file names and shapes:
///           test/vectors/js/    - `scripts/emit-golden-vectors.mjs`, the real JS signstuff libraries.
///           test/vectors/lean/  - Lean-emitted FOUR vectors from the conformance package (optional).
///                                 Two layouts live here: legacy `four.json` (tables or rows) and the
///                                 conformance layout `<suite>/<op>.json` = {"suite","declaration",
///                                 "cases":[{"op","args","result"}]} copied by scripts/sync-lean-vectors.mjs.
///         The JS directory is required. The Lean directory is tolerated absent, and any file or key
///         missing from it is skipped (see DESIGN.md sec. 13 for the accepted shapes).
abstract contract Vectors is Test {
    string internal constant JS_DIR = "test/vectors/js";
    string internal constant LEAN_DIR = "test/vectors/lean";

    function _hasDir(string memory dir) internal view returns (bool) {
        return vm.exists(dir);
    }

    /// @dev Directories to check a vector file against: js always, lean when the file is there.
    function _sourcesFor(string memory file) internal view returns (string[] memory out) {
        bool lean = vm.exists(string.concat(LEAN_DIR, "/", file));
        out = new string[](lean ? 2 : 1);
        out[0] = JS_DIR;
        if (lean) out[1] = LEAN_DIR;
    }

    function _read(string memory dir, string memory file) internal view returns (string memory) {
        return vm.readFile(string.concat(dir, "/", file));
    }

    function _has(string memory json, string memory key) internal view returns (bool) {
        return vm.keyExistsJson(json, key);
    }

    function _bytes(string memory hexNoPrefix) internal pure returns (bytes memory) {
        return vm.parseBytes(string.concat("0x", hexNoPrefix));
    }

    function _bytes32(string memory hexNoPrefix) internal pure returns (bytes32) {
        return vm.parseBytes32(string.concat("0x", hexNoPrefix));
    }

    function _bytes32s(string[] memory hexes) internal pure returns (bytes32[] memory out) {
        out = new bytes32[](hexes.length);
        for (uint256 i; i < hexes.length; ++i) out[i] = _bytes32(hexes[i]);
    }

    /// @dev Column of an array of objects: json[prefix][i][sub] for every i (the cheatcode's wildcard
    ///      paths do not nest, so the length is probed).
    function _col(string memory json, string memory prefix, string memory sub)
        internal
        view
        returns (string[] memory out)
    {
        uint256 n;
        while (vm.keyExistsJson(json, string.concat(prefix, "[", vm.toString(n), "]"))) ++n;
        out = new string[](n);
        for (uint256 i; i < n; ++i) {
            out[i] = vm.parseJsonString(json, string.concat(prefix, "[", vm.toString(i), "]", sub));
        }
    }

    function _colUint(string memory json, string memory prefix, string memory sub)
        internal
        view
        returns (uint256[] memory out)
    {
        string[] memory raw = _col(json, prefix, sub);
        out = new uint256[](raw.length);
        for (uint256 i; i < raw.length; ++i) out[i] = vm.parseUint(raw[i]);
    }

    // ───────────── Lean conformance layout: <suite>/<op>.json with a "cases" wrapper ─────────────
    // Foundry decodes JSON objects into structs by ALPHABETICAL field order, so the field order below
    // (args, op, result) is load-bearing, not cosmetic. A reading is [pos, neg] booleans; a record is
    // [pos, neg] numbers; a valued item is {against, for, value} (witness names are strings).

    /// @dev Reading-valued op: args are readings (0, 1 or 2 of them), result is a reading.
    struct ReadingCase {
        bool[][] args;
        string op;
        bool[] result;
    }

    /// @dev Relation / predicate over readings: result is a boolean.
    struct RelCase {
        bool[][] args;
        string op;
        bool result;
    }

    /// @dev One `Valued` item. Field order is alphabetical to match the JSON decoder.
    struct ValuedItem {
        string[] against;
        string[] forWitnesses; // JSON key "for"
        bool[] value;
    }

    struct ValuedCase {
        ValuedItem[] args;
        string op;
        ValuedItem result;
    }

    /// @dev Record op with a record result (add, joinK, ...): tallies are [pos, neg] numbers.
    struct RecordCase {
        uint256[][] args;
        string op;
        uint256[] result;
    }

    struct RecordReadingCase {
        uint256[][] args;
        string op;
        bool[] result;
    }

    struct RecordRelCase {
        uint256[][] args;
        string op;
        bool result;
    }

    function _leanPath(string memory suite, string memory op) internal pure returns (string memory) {
        return string.concat(LEAN_DIR, "/", suite, "/", op, ".json");
    }

    /// @dev Reads <suite>/<op>.json and asserts the declared suite/op names the file, so a misfiled
    ///      vector cannot silently pass. Fails loudly (not skip) when the file is absent.
    function _leanJson(string memory suite, string memory op) internal view returns (string memory j) {
        string memory path = _leanPath(suite, op);
        require(vm.exists(path), string.concat("missing Lean vector (run scripts/sync-lean-vectors.mjs): ", path));
        j = vm.readFile(path);
        string memory decl = vm.parseJsonString(j, ".declaration");
        bytes memory d = bytes(decl);
        bytes memory o = bytes(op);
        require(d.length > o.length, "declaration shorter than op");
        for (uint256 i; i < o.length; ++i) {
            require(d[d.length - o.length + i] == o[i], string.concat("declaration does not end in op: ", decl));
        }
    }

    function _leanReadingCases(string memory suite, string memory op) internal view returns (ReadingCase[] memory cs) {
        cs = abi.decode(vm.parseJson(_leanJson(suite, op), ".cases"), (ReadingCase[]));
        require(cs.length > 0, "no cases");
        for (uint256 i; i < cs.length; ++i) require(_eq(cs[i].op, op), "case op mismatch");
    }

    function _leanRelCases(string memory suite, string memory op) internal view returns (RelCase[] memory cs) {
        cs = abi.decode(vm.parseJson(_leanJson(suite, op), ".cases"), (RelCase[]));
        require(cs.length > 0, "no cases");
        for (uint256 i; i < cs.length; ++i) require(_eq(cs[i].op, op), "case op mismatch");
    }

    function _leanValuedCases(string memory suite, string memory op) internal view returns (ValuedCase[] memory cs) {
        cs = abi.decode(vm.parseJson(_leanJson(suite, op), ".cases"), (ValuedCase[]));
        require(cs.length > 0, "no cases");
        for (uint256 i; i < cs.length; ++i) require(_eq(cs[i].op, op), "case op mismatch");
    }

    function _leanRecordCases(string memory suite, string memory op) internal view returns (RecordCase[] memory cs) {
        cs = abi.decode(vm.parseJson(_leanJson(suite, op), ".cases"), (RecordCase[]));
        require(cs.length > 0, "no cases");
        for (uint256 i; i < cs.length; ++i) require(_eq(cs[i].op, op), "case op mismatch");
    }

    function _leanRecordReadingCases(string memory suite, string memory op)
        internal
        view
        returns (RecordReadingCase[] memory cs)
    {
        cs = abi.decode(vm.parseJson(_leanJson(suite, op), ".cases"), (RecordReadingCase[]));
        require(cs.length > 0, "no cases");
        for (uint256 i; i < cs.length; ++i) require(_eq(cs[i].op, op), "case op mismatch");
    }

    function _leanRecordRelCases(string memory suite, string memory op)
        internal
        view
        returns (RecordRelCase[] memory cs)
    {
        cs = abi.decode(vm.parseJson(_leanJson(suite, op), ".cases"), (RecordRelCase[]));
        require(cs.length > 0, "no cases");
        for (uint256 i; i < cs.length; ++i) require(_eq(cs[i].op, op), "case op mismatch");
    }

    function _eq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
