// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Vectors } from "./helpers/Vectors.sol";
import { Four } from "../src/Four.sol";
import { Evidence } from "../src/Evidence.sol";

/// @title LeanConformance
/// @notice Obsmetrologia judges the Solidity. Every case in the Lean-emitted golden vectors
///         (test/vectors/lean/{four,valued,record}/*.json, copied by scripts/sync-lean-vectors.mjs)
///         is replayed against `Four` and `Evidence`; a disagreement fails the suite.
///
/// Declaration -> Solidity realizer (full table and the unrealized list: DESIGN.md sec. 13):
///   four/   Reading.joinK/meetK/joinT/meetT    -> Four.joinK/meetK/joinT/meetT
///           Reading.leK/leT                    -> Four.leqK/leqT
///           Reading.negate / conflate          -> Four.negate / Four.conflate
///           Reading.negConf                    -> Four.negate(Four.conflate(.))
///           Reading.kBot/kTop/tTop/tBot        -> Four.knowledgeBottom/knowledgeTop/truthTop/truthBottom
///           FourMix.readingFuse / readingPar   -> Four.tensor / Four.par
///           FourMix.readingMix                 -> Four.leqT(Four.tensor(a,b), Four.par(a,b))
///           FourMix.requiresConsensus          -> Four.requiresConsensus
///           FourMix.equalityLocus              -> !Four.requiresConsensus  (no named function; the vectors
///                                                 show it is exactly the complement, asserted below)
///   valued/ Valued.joinK/meetK/joinT/meetT/negate/conflate/presumeFree -> same-named Evidence.* on Pair
///   record/ Record.reading, joinK, leK, leT, add -> Evidence.presence / joinK / leqK / leqT on
///           prefix-bitmap Pairs (tally n = n low bits), read back with Evidence.record.
///           Record.meetK/joinT/meetT/topMass have NO Solidity realizer (Evidence.meetK/joinT/meetT
///           union witnesses, they do not take min/max of tallies); see the test_unrealized_* markers.
contract LeanConformanceTest is Vectors {
    string internal constant FOUR = "four";
    string internal constant VALUED = "valued";
    string internal constant RECORD = "record";

    // ───────────────────────── helpers ─────────────────────────

    function _pt(bool[] memory r) internal pure returns (Four.Point) {
        require(r.length == 2, "reading must be [pos,neg]");
        return Four.fromBits(r[0], r[1]);
    }

    function _bin(string memory op, function(Four.Point, Four.Point) pure returns (Four.Point) f, uint256 expected)
        internal
        view
    {
        ReadingCase[] memory cs = _leanReadingCases(FOUR, op);
        assertEq(cs.length, expected, string.concat(op, ": case count"));
        for (uint256 i; i < cs.length; ++i) {
            assertEq(cs[i].args.length, 2, op);
            Four.Point got = f(_pt(cs[i].args[0]), _pt(cs[i].args[1]));
            assertEq(uint8(got), uint8(_pt(cs[i].result)), string.concat(op, ": case ", vm.toString(i)));
        }
    }

    function _un(string memory op, function(Four.Point) pure returns (Four.Point) f, uint256 expected) internal view {
        ReadingCase[] memory cs = _leanReadingCases(FOUR, op);
        assertEq(cs.length, expected, string.concat(op, ": case count"));
        for (uint256 i; i < cs.length; ++i) {
            assertEq(cs[i].args.length, 1, op);
            assertEq(
                uint8(f(_pt(cs[i].args[0]))), uint8(_pt(cs[i].result)), string.concat(op, ": case ", vm.toString(i))
            );
        }
    }

    function _const(string memory op, Four.Point want) internal view {
        ReadingCase[] memory cs = _leanReadingCases(FOUR, op);
        assertEq(cs.length, 1, op);
        assertEq(cs[0].args.length, 0, op);
        assertEq(uint8(_pt(cs[0].result)), uint8(want), op);
    }

    function _rel(string memory op, function(Four.Point, Four.Point) pure returns (bool) f) internal view {
        RelCase[] memory cs = _leanRelCases(FOUR, op);
        assertEq(cs.length, 16, string.concat(op, ": case count"));
        for (uint256 i; i < cs.length; ++i) {
            assertEq(f(_pt(cs[i].args[0]), _pt(cs[i].args[1])), cs[i].result, string.concat(op, ": case ", vm.toString(i)));
        }
    }

    // Function-typed adapters (library functions with differing shapes).
    function _negConf(Four.Point p) internal pure returns (Four.Point) {
        return Four.negate(Four.conflate(p));
    }

    function _mix(Four.Point a, Four.Point b) internal pure returns (bool) {
        return Four.leqT(Four.tensor(a, b), Four.par(a, b));
    }

    function _locus(Four.Point a, Four.Point b) internal pure returns (bool) {
        return !Four.requiresConsensus(a, b);
    }

    // ───────────────────────── four/ : Reading ─────────────────────────

    function test_lean_four_joinK() public view { _bin("joinK", Four.joinK, 16); }
    function test_lean_four_meetK() public view { _bin("meetK", Four.meetK, 16); }
    function test_lean_four_joinT() public view { _bin("joinT", Four.joinT, 16); }
    function test_lean_four_meetT() public view { _bin("meetT", Four.meetT, 16); }
    function test_lean_four_leK() public view { _rel("leK", Four.leqK); }
    function test_lean_four_leT() public view { _rel("leT", Four.leqT); }
    function test_lean_four_negate() public view { _un("negate", Four.negate, 4); }
    function test_lean_four_conflate() public view { _un("conflate", Four.conflate, 4); }
    function test_lean_four_negConf() public view { _un("negConf", _negConf, 4); }

    function test_lean_four_constants() public view {
        _const("kBot", Four.knowledgeBottom());
        _const("kTop", Four.knowledgeTop());
        _const("tTop", Four.truthTop());
        _const("tBot", Four.truthBottom());
    }

    // ───────────────────────── four/ : FourMix ─────────────────────────

    function test_lean_fourmix_readingFuse_is_tensor() public view { _bin("readingFuse", Four.tensor, 16); }
    function test_lean_fourmix_readingPar_is_par() public view { _bin("readingPar", Four.par, 16); }
    function test_lean_fourmix_readingMix() public view { _rel("readingMix", _mix); }
    function test_lean_fourmix_requiresConsensus() public view { _rel("requiresConsensus", Four.requiresConsensus); }

    /// @dev equalityLocus has no named Solidity function. The Lean vectors say it is the complement of
    ///      requiresConsensus on all 16 pairs, so `tensor == par` realizes it. Also checked against
    ///      the Lean statement of the locus (one side Both, or equal and not None) from first principles.
    function test_lean_fourmix_equalityLocus() public view {
        _rel("equalityLocus", _locus);
        RelCase[] memory cs = _leanRelCases(FOUR, "equalityLocus");
        for (uint256 i; i < cs.length; ++i) {
            Four.Point a = _pt(cs[i].args[0]);
            Four.Point b = _pt(cs[i].args[1]);
            bool stated = a == Four.Point.Both || b == Four.Point.Both || (a == b && a != Four.Point.None);
            assertEq(cs[i].result, stated, "locus statement");
        }
    }

    // ───────────────────────── valued/ : Evidence.Pair ─────────────────────────

    /// @dev Witness names are single letters a..d in the vectors; the slot is the letter's index.
    function _slotBits(string[] memory names) internal pure returns (uint256 bits) {
        for (uint256 i; i < names.length; ++i) {
            bytes memory n = bytes(names[i]);
            require(n.length == 1 && n[0] >= 0x61 && n[0] <= 0x7a, "witness must be a single letter");
            bits |= uint256(1) << (uint8(n[0]) - 0x61);
        }
    }

    function _pair(ValuedItem memory v) internal pure returns (Evidence.Pair memory) {
        return Evidence.valued(_slotBits(v.forWitnesses), _slotBits(v.against), _pt(v.value));
    }

    function _same(Evidence.Pair memory got, Evidence.Pair memory want, string memory what) internal pure {
        assertEq(got.forBits, want.forBits, string.concat(what, ": for"));
        assertEq(got.againstBits, want.againstBits, string.concat(what, ": against"));
        assertEq(uint8(got.value), uint8(want.value), string.concat(what, ": value"));
    }

    function _vbin(string memory op, function(Evidence.Pair memory, Evidence.Pair memory) pure returns (Evidence.Pair memory) f)
        internal
        view
    {
        ValuedCase[] memory cs = _leanValuedCases(VALUED, op);
        assertEq(cs.length, 16, string.concat(op, ": case count"));
        for (uint256 i; i < cs.length; ++i) {
            _same(f(_pair(cs[i].args[0]), _pair(cs[i].args[1])), _pair(cs[i].result), string.concat(op, " ", vm.toString(i)));
        }
    }

    function _vun(string memory op, function(Evidence.Pair memory) pure returns (Evidence.Pair memory) f) internal view {
        ValuedCase[] memory cs = _leanValuedCases(VALUED, op);
        assertEq(cs.length, 4, string.concat(op, ": case count"));
        for (uint256 i; i < cs.length; ++i) {
            _same(f(_pair(cs[i].args[0])), _pair(cs[i].result), string.concat(op, " ", vm.toString(i)));
        }
    }

    // Evidence overloads these names for Committed, so function references need unambiguous adapters.
    function _vjoinK(Evidence.Pair memory x, Evidence.Pair memory y) internal pure returns (Evidence.Pair memory) {
        return Evidence.joinK(x, y);
    }
    function _vmeetK(Evidence.Pair memory x, Evidence.Pair memory y) internal pure returns (Evidence.Pair memory) {
        return Evidence.meetK(x, y);
    }
    function _vjoinT(Evidence.Pair memory x, Evidence.Pair memory y) internal pure returns (Evidence.Pair memory) {
        return Evidence.joinT(x, y);
    }
    function _vmeetT(Evidence.Pair memory x, Evidence.Pair memory y) internal pure returns (Evidence.Pair memory) {
        return Evidence.meetT(x, y);
    }
    function _vnegate(Evidence.Pair memory x) internal pure returns (Evidence.Pair memory) {
        return Evidence.negate(x);
    }
    function _vconflate(Evidence.Pair memory x) internal pure returns (Evidence.Pair memory) {
        return Evidence.conflate(x);
    }
    function _vpresumeFree(Evidence.Pair memory x) internal pure returns (Evidence.Pair memory) {
        return Evidence.presumeFree(x);
    }

    function test_lean_valued_joinK() public view { _vbin("joinK", _vjoinK); }
    function test_lean_valued_meetK() public view { _vbin("meetK", _vmeetK); }
    function test_lean_valued_joinT() public view { _vbin("joinT", _vjoinT); }
    function test_lean_valued_meetT() public view { _vbin("meetT", _vmeetT); }
    function test_lean_valued_negate() public view { _vun("negate", _vnegate); }
    function test_lean_valued_conflate() public view { _vun("conflate", _vconflate); }
    function test_lean_valued_presumeFree() public view { _vun("presumeFree", _vpresumeFree); }

    // ───────────────────────── record/ : tallies as prefix bitmaps ─────────────────────────

    function _prefix(uint256 n) internal pure returns (uint256) {
        require(n < 256, "tally too large for one word");
        return (uint256(1) << n) - 1;
    }

    /// @dev Tally [pos, neg] as a Measured pair of n low bits each; Evidence.record reads it back.
    function _tally(uint256[] memory t) internal pure returns (Evidence.Pair memory p) {
        require(t.length == 2, "record must be [pos,neg]");
        p = Evidence.measured(_prefix(t[0]), _prefix(t[1]));
        (uint256 pos, uint256 neg) = Evidence.record(p);
        assertEq(pos, t[0], "record roundtrip pos");
        assertEq(neg, t[1], "record roundtrip neg");
    }

    function test_lean_record_reading() public view {
        RecordReadingCase[] memory cs = _leanRecordReadingCases(RECORD, "reading");
        assertEq(cs.length, 9, "reading: case count");
        for (uint256 i; i < cs.length; ++i) {
            assertEq(
                uint8(Evidence.presence(_tally(cs[i].args[0]))), uint8(_pt(cs[i].result)), string.concat("reading ", vm.toString(i))
            );
        }
    }

    function test_lean_record_joinK() public view {
        RecordCase[] memory cs = _leanRecordCases(RECORD, "joinK");
        assertEq(cs.length, 81, "joinK: case count");
        for (uint256 i; i < cs.length; ++i) {
            (uint256 pos, uint256 neg) = Evidence.record(Evidence.joinK(_tally(cs[i].args[0]), _tally(cs[i].args[1])));
            assertEq(pos, cs[i].result[0], string.concat("joinK pos ", vm.toString(i)));
            assertEq(neg, cs[i].result[1], string.concat("joinK neg ", vm.toString(i)));
        }
    }

    function test_lean_record_leK() public view {
        RecordRelCase[] memory cs = _leanRecordRelCases(RECORD, "leK");
        assertEq(cs.length, 81, "leK: case count");
        for (uint256 i; i < cs.length; ++i) {
            assertEq(
                Evidence.leqK(_tally(cs[i].args[0]), _tally(cs[i].args[1])), cs[i].result, string.concat("leK ", vm.toString(i))
            );
        }
    }

    function test_lean_record_leT() public view {
        RecordRelCase[] memory cs = _leanRecordRelCases(RECORD, "leT");
        assertEq(cs.length, 81, "leT: case count");
        for (uint256 i; i < cs.length; ++i) {
            assertEq(
                Evidence.leqT(_tally(cs[i].args[0]), _tally(cs[i].args[1])), cs[i].result, string.concat("leT ", vm.toString(i))
            );
        }
    }

    /// @dev Record.add counts both operands' evidence. On the bitmap carrier that is a union of
    ///      DISJOINT witness sets, so the second tally is placed above the first's bits.
    function test_lean_record_add_as_disjoint_union() public view {
        RecordCase[] memory cs = _leanRecordCases(RECORD, "add");
        assertEq(cs.length, 81, "add: case count");
        for (uint256 i; i < cs.length; ++i) {
            uint256[] memory x = cs[i].args[0];
            uint256[] memory y = cs[i].args[1];
            Evidence.Pair memory px = _tally(x);
            Evidence.Pair memory py = Evidence.measured(_prefix(y[0]) << x[0], _prefix(y[1]) << x[1]);
            (uint256 pos, uint256 neg) = Evidence.record(Evidence.joinK(px, py));
            assertEq(pos, cs[i].result[0], string.concat("add pos ", vm.toString(i)));
            assertEq(neg, cs[i].result[1], string.concat("add neg ", vm.toString(i)));
        }
    }

    // ───────────────────────── declarations with no Solidity realizer ─────────────────────────
    // These tests only pin that the Lean vectors are present and well-formed; they judge nothing.
    // They exist so the gap is a visible, counted fact and not a silent omission.

    function test_unrealized_record_meetK_joinT_meetT_topMass() public view {
        assertEq(_leanRecordCases(RECORD, "meetK").length, 81);
        assertEq(_leanRecordCases(RECORD, "joinT").length, 81);
        assertEq(_leanRecordCases(RECORD, "meetT").length, 81);
        assertTrue(vm.exists(_leanPath(RECORD, "topMass")));
    }
}
