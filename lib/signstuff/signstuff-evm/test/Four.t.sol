// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Four } from "../src/Four.sol";
import { Vectors } from "./helpers/Vectors.sol";

/// @dev Independent oracle: the FOUR-MIX formulas of ETH `FourMixConsensusProfile`, written on bare
///      bools so this suite does not depend on the library under test for them.
library MixOracle {
    function tensor(bool x, bool y, bool z, bool v) internal pure returns (bool, bool) {
        return (x && z, (!x || v) && (!z || y));
    }

    function equalityLocus(bool x, bool y, bool z, bool v) internal pure returns (bool) {
        bool leftBoth = x && y;
        bool rightBoth = z && v;
        bool leftNeither = !x && !y;
        return leftBoth || rightBoth || ((x == z && y == v) && !leftNeither);
    }
}

contract FourTest is Vectors {
    using Four for Four.Point;

    enum Op {
        JoinK,
        MeetK,
        JoinT,
        MeetT
    }

    function _p(uint8 x) internal pure returns (Four.Point) {
        return Four.Point(bound(x, 0, 3));
    }

    function _op(Op op, Four.Point a, Four.Point b) internal pure returns (Four.Point) {
        if (op == Op.JoinK) return Four.joinK(a, b);
        if (op == Op.MeetK) return Four.meetK(a, b);
        if (op == Op.JoinT) return Four.joinT(a, b);
        return Four.meetT(a, b);
    }

    // ───────────── representation: the enum is the two evidence bits ─────────────

    function test_pointsAreTheirEvidenceBits() public pure {
        assertEq(uint8(Four.fromBits(false, false)), 0);
        assertEq(uint8(Four.fromBits(true, false)), 1);
        assertEq(uint8(Four.fromBits(false, true)), 2);
        assertEq(uint8(Four.fromBits(true, true)), 3);
        for (uint8 i; i < 4; ++i) {
            Four.Point p = Four.Point(i);
            assertEq(uint8(Four.fromBits(p.positive(), p.negative())), i);
        }
    }

    function test_polesAreWhereTheNamesSayTheyAre() public pure {
        assertTrue(Four.knowledgeBottom() == Four.Point.None);
        assertTrue(Four.knowledgeTop() == Four.Point.Both);
        assertTrue(Four.truthTop() == Four.Point.True);
        assertTrue(Four.truthBottom() == Four.Point.False);
    }

    // ───────────── exhaustive lattice laws (the whole carrier is four points) ─────────────

    function test_exhaustive_latticeLaws() public pure {
        for (uint8 oi; oi < 4; ++oi) {
            Op op = Op(oi);
            for (uint8 i; i < 4; ++i) {
                Four.Point a = Four.Point(i);
                assertTrue(_op(op, a, a) == a, "idempotent");
                for (uint8 j; j < 4; ++j) {
                    Four.Point b = Four.Point(j);
                    assertTrue(_op(op, a, b) == _op(op, b, a), "commutative");
                    for (uint8 k; k < 4; ++k) {
                        Four.Point c = Four.Point(k);
                        assertTrue(
                            _op(op, _op(op, a, b), c) == _op(op, a, _op(op, b, c)), "associative"
                        );
                    }
                }
            }
        }
    }

    function test_exhaustive_absorptionAndIdentities() public pure {
        for (uint8 i; i < 4; ++i) {
            Four.Point a = Four.Point(i);
            assertTrue(Four.joinK(a, Four.Point.None) == a);
            assertTrue(Four.meetK(a, Four.Point.Both) == a);
            assertTrue(Four.joinT(a, Four.Point.False) == a);
            assertTrue(Four.meetT(a, Four.Point.True) == a);
            assertTrue(Four.joinK(a, Four.Point.Both) == Four.Point.Both);
            assertTrue(Four.meetK(a, Four.Point.None) == Four.Point.None);
            assertTrue(Four.joinT(a, Four.Point.True) == Four.Point.True);
            assertTrue(Four.meetT(a, Four.Point.False) == Four.Point.False);
            for (uint8 j; j < 4; ++j) {
                Four.Point b = Four.Point(j);
                assertTrue(Four.joinK(a, Four.meetK(a, b)) == a);
                assertTrue(Four.meetK(a, Four.joinK(a, b)) == a);
                assertTrue(Four.joinT(a, Four.meetT(a, b)) == a);
                assertTrue(Four.meetT(a, Four.joinT(a, b)) == a);
            }
        }
    }

    /// FOUR is a distributive bilattice: each of the four operations distributes over each other one.
    function test_exhaustive_allTwelveDistributiveLaws() public pure {
        for (uint8 oi; oi < 4; ++oi) {
            for (uint8 pi; pi < 4; ++pi) {
                if (oi == pi) continue;
                for (uint8 i; i < 4; ++i) {
                    for (uint8 j; j < 4; ++j) {
                        for (uint8 k; k < 4; ++k) {
                            _distributes(Op(oi), Op(pi), Four.Point(i), Four.Point(j), Four.Point(k));
                        }
                    }
                }
            }
        }
    }

    function _distributes(Op outer, Op inner, Four.Point a, Four.Point b, Four.Point c) private pure {
        // a outer (b inner c) == (a outer b) inner (a outer c)
        assertTrue(
            _op(outer, a, _op(inner, b, c)) == _op(inner, _op(outer, a, b), _op(outer, a, c)),
            "distributivity"
        );
    }

    function test_exhaustive_orderCharacterisations() public pure {
        for (uint8 i; i < 4; ++i) {
            for (uint8 j; j < 4; ++j) {
                Four.Point a = Four.Point(i);
                Four.Point b = Four.Point(j);
                assertEq(Four.leqK(a, b), Four.joinK(a, b) == b);
                assertEq(Four.leqK(a, b), Four.meetK(a, b) == a);
                assertEq(Four.leqT(a, b), Four.joinT(a, b) == b);
                assertEq(Four.leqT(a, b), Four.meetT(a, b) == a);
                if (Four.leqK(a, b) && Four.leqK(b, a)) assertTrue(a == b);
                if (Four.leqT(a, b) && Four.leqT(b, a)) assertTrue(a == b);
                // Both orders are bounded
                assertTrue(Four.leqK(Four.Point.None, a) && Four.leqK(a, Four.Point.Both));
                assertTrue(Four.leqT(Four.Point.False, a) && Four.leqT(a, Four.Point.True));
            }
        }
    }

    // ───────────── fuzz: every law, over the same carrier (ties the suite to the fuzz harness) ─────────────

    function testFuzz_commutativeAssociativeIdempotent(uint8 x, uint8 y, uint8 z, uint8 o) public pure {
        Op op = Op(bound(o, 0, 3));
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        Four.Point c = _p(z);
        assertTrue(_op(op, a, b) == _op(op, b, a));
        assertTrue(_op(op, _op(op, a, b), c) == _op(op, a, _op(op, b, c)));
        assertTrue(_op(op, a, a) == a);
    }

    function testFuzz_absorption(uint8 x, uint8 y) public pure {
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        assertTrue(Four.joinK(a, Four.meetK(a, b)) == a);
        assertTrue(Four.meetK(a, Four.joinK(a, b)) == a);
        assertTrue(Four.joinT(a, Four.meetT(a, b)) == a);
        assertTrue(Four.meetT(a, Four.joinT(a, b)) == a);
    }

    function testFuzz_distributivity(uint8 x, uint8 y, uint8 z, uint8 o, uint8 q) public pure {
        Op outer = Op(bound(o, 0, 3));
        Op inner = Op(bound(q, 0, 3));
        vm.assume(outer != inner);
        _distributes(outer, inner, _p(x), _p(y), _p(z));
    }

    function testFuzz_deMorgan(uint8 x, uint8 y) public pure {
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        assertTrue(Four.negate(Four.joinT(a, b)) == Four.meetT(Four.negate(a), Four.negate(b)));
        assertTrue(Four.negate(Four.meetT(a, b)) == Four.joinT(Four.negate(a), Four.negate(b)));
        // negation is monotone in knowledge: it commutes with the knowledge operations
        assertTrue(Four.negate(Four.joinK(a, b)) == Four.joinK(Four.negate(a), Four.negate(b)));
        assertTrue(Four.negate(Four.meetK(a, b)) == Four.meetK(Four.negate(a), Four.negate(b)));
    }

    function testFuzz_negationInvolutiveAndOrderEffects(uint8 x, uint8 y) public pure {
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        assertTrue(Four.negate(Four.negate(a)) == a);
        assertEq(Four.leqK(Four.negate(a), Four.negate(b)), Four.leqK(a, b)); // preserves knowledge
        assertEq(Four.leqT(Four.negate(a), Four.negate(b)), Four.leqT(b, a)); // reverses truth
        assertTrue(Four.negate(Four.Point.True) == Four.Point.False);
        assertTrue(Four.negate(Four.Point.None) == Four.Point.None);
        assertTrue(Four.negate(Four.Point.Both) == Four.Point.Both);
    }

    function testFuzz_conflation(uint8 x, uint8 y) public pure {
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        assertTrue(Four.conflate(Four.conflate(a)) == a);
        assertEq(Four.leqT(Four.conflate(a), Four.conflate(b)), Four.leqT(a, b)); // preserves truth
        assertEq(Four.leqK(Four.conflate(a), Four.conflate(b)), Four.leqK(b, a)); // reverses knowledge
        assertTrue(Four.conflate(Four.joinK(a, b)) == Four.meetK(Four.conflate(a), Four.conflate(b)));
        assertTrue(Four.conflate(Four.meetK(a, b)) == Four.joinK(Four.conflate(a), Four.conflate(b)));
        assertTrue(Four.conflate(Four.joinT(a, b)) == Four.joinT(Four.conflate(a), Four.conflate(b)));
        assertTrue(Four.conflate(Four.meetT(a, b)) == Four.meetT(Four.conflate(a), Four.conflate(b)));
        // Klein four-group: negation and conflation commute, each is self-inverse
        assertTrue(Four.negate(Four.conflate(a)) == Four.conflate(Four.negate(a)));
    }

    function test_kleinFourGroupActsAsAdvertised() public pure {
        // negation fixes the knowledge poles and swaps the truth poles; conflation the reverse
        assertTrue(Four.conflate(Four.Point.None) == Four.Point.Both);
        assertTrue(Four.conflate(Four.Point.Both) == Four.Point.None);
        assertTrue(Four.conflate(Four.Point.True) == Four.Point.True);
        assertTrue(Four.conflate(Four.Point.False) == Four.Point.False);
    }

    /// The interlacing property: every operation is monotone in BOTH orders.
    function testFuzz_operationsMonotoneInBothOrders(uint8 a1, uint8 a2, uint8 b1, uint8 b2, uint8 o)
        public
        pure
    {
        Op op = Op(bound(o, 0, 3));
        Four.Point a = _p(a1);
        Four.Point a2p = _p(a2);
        Four.Point b = _p(b1);
        Four.Point b2p = _p(b2);
        if (Four.leqK(a, a2p) && Four.leqK(b, b2p)) {
            assertTrue(Four.leqK(_op(op, a, b), _op(op, a2p, b2p)));
        }
        if (Four.leqT(a, a2p) && Four.leqT(b, b2p)) {
            assertTrue(Four.leqT(_op(op, a, b), _op(op, a2p, b2p)));
        }
    }

    function testFuzz_orderIsTransitive(uint8 x, uint8 y, uint8 z) public pure {
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        Four.Point c = _p(z);
        if (Four.leqK(a, b) && Four.leqK(b, c)) assertTrue(Four.leqK(a, c));
        if (Four.leqT(a, b) && Four.leqT(b, c)) assertTrue(Four.leqT(a, c));
    }

    // ───────────── evidence monotonicity: joinK never lowers, and heights count wits ─────────────

    function testFuzz_knowledgeJoinOnlyClimbs(uint8 x, uint8 y) public pure {
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        Four.Point j = Four.joinK(a, b);
        assertTrue(Four.leqK(a, j) && Four.leqK(b, j));
        assertGe(Four.knowledgeHeight(j), Four.knowledgeHeight(a));
        // flux is defined exactly on ascents, and its wit weight is the height gain
        Four.Flux f = Four.flux(a, j);
        uint8 gain = Four.knowledgeHeight(j) - Four.knowledgeHeight(a);
        uint8 weight = f == Four.Flux.None ? 0 : f == Four.Flux.Jump ? 2 : 1;
        assertEq(weight, gain);
    }

    function test_fluxRefusesDescent() public {
        vm.expectRevert(
            abi.encodeWithSelector(Four.NotKnowledgeAscent.selector, Four.Point.Both, Four.Point.True)
        );
        this.fluxExternal(Four.Point.Both, Four.Point.True);
    }

    function fluxExternal(Four.Point a, Four.Point b) external pure returns (Four.Flux) {
        return Four.flux(a, b);
    }

    function test_heights() public pure {
        assertEq(Four.truthHeight(Four.Point.False), 0);
        assertEq(Four.truthHeight(Four.Point.None), 1);
        assertEq(Four.truthHeight(Four.Point.Both), 1);
        assertEq(Four.truthHeight(Four.Point.True), 2);
    }

    // ───────────── implications ─────────────

    function testFuzz_heytingAdjunctionInKnowledgeOrder(uint8 x, uint8 y, uint8 z) public pure {
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        Four.Point c = _p(z);
        assertEq(Four.leqK(Four.meetK(a, c), b), Four.leqK(c, Four.impK(a, b)));
    }

    // ───────────── MIX connectives (tensor / par) ─────────────

    function testFuzz_tensorParLaws(uint8 x, uint8 y, uint8 z) public pure {
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        Four.Point c = _p(z);
        assertTrue(Four.tensor(a, b) == Four.tensor(b, a));
        assertTrue(Four.par(a, b) == Four.par(b, a));
        assertTrue(Four.tensor(Four.tensor(a, b), c) == Four.tensor(a, Four.tensor(b, c)));
        assertTrue(Four.par(Four.par(a, b), c) == Four.par(a, Four.par(b, c)));
        assertTrue(Four.tensor(a, Four.unit()) == a); // told-both is the multiplicative unit
        assertTrue(Four.linearNegate(a) == Four.negate(a)); // linear negation is negation
        // par is the De Morgan dual of tensor
        assertTrue(Four.par(a, b) == Four.negate(Four.tensor(Four.negate(a), Four.negate(b))));
        // lax MIX: tensor <=t par
        assertTrue(Four.leqT(Four.tensor(a, b), Four.par(a, b)));
    }

    function testFuzz_residuationAdjunction(uint8 x, uint8 y, uint8 z) public pure {
        Four.Point a = _p(x);
        Four.Point b = _p(y);
        Four.Point c = _p(z);
        // a (x) b <=t c   iff   a <=t (b -o c)
        assertEq(Four.leqT(Four.tensor(a, b), c), Four.leqT(a, Four.residuum(b, c)));
    }

    /// The EVM-side oracle of the Lean theorem: tensor == par exactly on the equality locus.
    function test_exhaustive_consensusLocusMatchesLean() public pure {
        for (uint8 i; i < 4; ++i) {
            for (uint8 j; j < 4; ++j) {
                Four.Point a = Four.Point(i);
                Four.Point b = Four.Point(j);
                bool equal = Four.tensor(a, b) == Four.par(a, b);
                assertEq(
                    equal,
                    MixOracle.equalityLocus(a.positive(), a.negative(), b.positive(), b.negative())
                );
                assertEq(Four.requiresConsensus(a, b), !equal);
                (bool tp, bool tn) = MixOracle.tensor(a.positive(), a.negative(), b.positive(), b.negative());
                assertTrue(Four.tensor(a, b) == Four.fromBits(tp, tn), "tensor == FourMix.tensor");
            }
        }
    }

    function test_directConflictIsStrictMix() public pure {
        // a claim told true against one told false needs consensus: tensor and par part ways
        assertTrue(Four.requiresConsensus(Four.Point.True, Four.Point.False));
        // agreeing, informative tellings do not
        assertFalse(Four.requiresConsensus(Four.Point.True, Four.Point.True));
        // anything with a contradiction in it is already on the locus
        assertFalse(Four.requiresConsensus(Four.Point.Both, Four.Point.True));
    }

    // ───────────── folds ─────────────

    function test_folds() public pure {
        Four.Point[] memory empty = new Four.Point[](0);
        assertTrue(Four.joinKAll(empty) == Four.Point.None);
        assertTrue(Four.meetKAll(empty) == Four.Point.Both);
        assertTrue(Four.joinTAll(empty) == Four.Point.False);
        assertTrue(Four.meetTAll(empty) == Four.Point.True);
        Four.Point[] memory ps = new Four.Point[](2);
        ps[0] = Four.Point.True;
        ps[1] = Four.Point.False;
        assertTrue(Four.joinKAll(ps) == Four.Point.Both); // two disagreeing witnesses fold to a held contradiction
        assertTrue(Four.meetKAll(ps) == Four.Point.None);
        assertTrue(Four.joinTAll(ps) == Four.Point.True);
        assertTrue(Four.meetTAll(ps) == Four.Point.False);
    }

    // ───────────── golden vectors (JS, and Lean when present) ─────────────

    function _bin(string memory op, uint8 a, uint8 b) internal pure returns (int256) {
        Four.Point x = Four.Point(a);
        Four.Point y = Four.Point(b);
        bytes32 h = keccak256(bytes(op));
        if (h == keccak256("joinK")) return int256(uint256(uint8(Four.joinK(x, y))));
        if (h == keccak256("meetK")) return int256(uint256(uint8(Four.meetK(x, y))));
        if (h == keccak256("joinT")) return int256(uint256(uint8(Four.joinT(x, y))));
        if (h == keccak256("meetT")) return int256(uint256(uint8(Four.meetT(x, y))));
        if (h == keccak256("impK")) return int256(uint256(uint8(Four.impK(x, y))));
        if (h == keccak256("impT")) return int256(uint256(uint8(Four.impT(x, y))));
        if (h == keccak256("tensor")) return int256(uint256(uint8(Four.tensor(x, y))));
        if (h == keccak256("residuum")) return int256(uint256(uint8(Four.residuum(x, y))));
        if (h == keccak256("par")) return int256(uint256(uint8(Four.par(x, y))));
        if (h == keccak256("leqK")) return Four.leqK(x, y) ? int256(1) : int256(0);
        if (h == keccak256("leqT")) return Four.leqT(x, y) ? int256(1) : int256(0);
        return -1; // unknown operation: tolerated, skipped
    }

    function _un(string memory op, uint8 a) internal pure returns (int256) {
        Four.Point x = Four.Point(a);
        bytes32 h = keccak256(bytes(op));
        if (h == keccak256("negate")) return int256(uint256(uint8(Four.negate(x))));
        if (h == keccak256("conflate")) return int256(uint256(uint8(Four.conflate(x))));
        if (h == keccak256("linearNegate")) return int256(uint256(uint8(Four.linearNegate(x))));
        if (h == keccak256("knowledgeHeight")) return int256(uint256(Four.knowledgeHeight(x)));
        if (h == keccak256("truthHeight")) return int256(uint256(Four.truthHeight(x)));
        if (h == keccak256("isConsistent")) return Four.isConsistent(x) ? int256(1) : int256(0);
        return -1;
    }

    function _binaryOps() internal pure returns (string[11] memory) {
        return ["joinK", "meetK", "joinT", "meetT", "leqK", "leqT", "impK", "impT", "tensor", "residuum", "par"];
    }

    function _unaryOps() internal pure returns (string[6] memory) {
        return ["negate", "conflate", "linearNegate", "knowledgeHeight", "truthHeight", "isConsistent"];
    }

    /// @return checked how many table entries were compared
    function _checkTables(string memory json) internal view returns (uint256 checked) {
        string[11] memory bins = _binaryOps();
        for (uint256 o; o < bins.length; ++o) {
            string memory key = string.concat(".binary.", bins[o]);
            if (!_has(json, key)) continue;
            if (_isBoolTable(bins[o])) {
                bool[] memory table = vm.parseJsonBoolArray(json, key);
                assertEq(table.length, 16, bins[o]);
                for (uint8 i; i < 16; ++i) {
                    assertEq(_bin(bins[o], i / 4, i % 4), table[i] ? int256(1) : int256(0), bins[o]);
                    ++checked;
                }
            } else {
                uint256[] memory table = vm.parseJsonUintArray(json, key);
                assertEq(table.length, 16, bins[o]);
                for (uint8 i; i < 16; ++i) {
                    assertEq(_bin(bins[o], i / 4, i % 4), int256(table[i]), bins[o]);
                    ++checked;
                }
            }
        }
        string[6] memory uns = _unaryOps();
        for (uint256 o; o < uns.length; ++o) {
            string memory key = string.concat(".unary.", uns[o]);
            if (!_has(json, key)) continue;
            if (keccak256(bytes(uns[o])) == keccak256("isConsistent")) {
                bool[] memory table = vm.parseJsonBoolArray(json, key);
                for (uint8 i; i < 4; ++i) {
                    assertEq(_un(uns[o], i), table[i] ? int256(1) : int256(0), uns[o]);
                    ++checked;
                }
            } else {
                uint256[] memory table = vm.parseJsonUintArray(json, key);
                for (uint8 i; i < 4; ++i) {
                    assertEq(_un(uns[o], i), int256(table[i]), uns[o]);
                    ++checked;
                }
            }
        }
        if (_has(json, ".constants.unit")) {
            assertEq(uint8(Four.unit()), vm.parseJsonUint(json, ".constants.unit"));
            assertEq(uint8(Four.knowledgeBottom()), vm.parseJsonUint(json, ".constants.knowledgeBottom"));
            assertEq(uint8(Four.knowledgeTop()), vm.parseJsonUint(json, ".constants.knowledgeTop"));
            assertEq(uint8(Four.truthTop()), vm.parseJsonUint(json, ".constants.truthTop"));
            assertEq(uint8(Four.truthBottom()), vm.parseJsonUint(json, ".constants.truthBottom"));
            checked += 5;
        }
    }

    function _isBoolTable(string memory op) private pure returns (bool) {
        bytes32 h = keccak256(bytes(op));
        return h == keccak256("leqK") || h == keccak256("leqT");
    }

    // — row-shaped vectors: {rows: [{op|decl|name, args: [..], result}]}, points as bits or any-family names —

    function _bitsOfName(string memory s) internal pure returns (int256) {
        bytes memory b = bytes(s);
        if (b.length == 1 && b[0] >= "0" && b[0] <= "3") return int256(uint256(uint8(b[0]) - 48));
        string[4][4] memory families = [
            ["absurd", "potential", "active", "stable"],
            ["told none", "told true", "told false", "told both"],
            ["neither", "true", "false", "both"],
            ["unknown", "held", "denied", "contested"]
        ];
        for (uint256 f; f < 4; ++f) {
            for (uint256 i; i < 4; ++i) {
                if (keccak256(bytes(families[f][i])) == keccak256(b)) return int256(i);
            }
        }
        return -1;
    }

    function _lastSegment(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        uint256 cut;
        for (uint256 i; i < b.length; ++i) {
            if (b[i] == ".") cut = i + 1;
        }
        bytes memory out = new bytes(b.length - cut);
        for (uint256 i; i < out.length; ++i) out[i] = b[cut + i];
        return string(out);
    }

    function _canonicalOp(string memory op) internal pure returns (string memory) {
        string memory s = _lastSegment(op);
        bytes32 h = keccak256(bytes(s));
        if (h == keccak256("leK")) return "leqK";
        if (h == keccak256("leT")) return "leqT";
        if (h == keccak256("fuse") || h == keccak256("fusion")) return "tensor";
        if (h == keccak256("imp")) return "residuum";
        if (h == keccak256("negation")) return "negate";
        return s;
    }

    function _checkRows(string memory json) internal view returns (uint256 checked) {
        string[] memory ops;
        if (_has(json, ".rows[0].op")) ops = vm.parseJsonStringArray(json, ".rows[*].op");
        else if (_has(json, ".rows[0].decl")) ops = vm.parseJsonStringArray(json, ".rows[*].decl");
        else return 0;
        for (uint256 r; r < ops.length; ++r) {
            string memory base = string.concat(".rows[", vm.toString(r), "]");
            string memory op = _canonicalOp(ops[r]);
            string memory arg0 = vm.parseJsonString(json, string.concat(base, ".args[0]"));
            int256 a = _bitsOfName(arg0);
            if (a < 0) continue;
            int256 expected;
            string memory res = vm.parseJsonString(json, string.concat(base, ".result"));
            int256 got;
            if (_has(json, string.concat(base, ".args[1]"))) {
                int256 b = _bitsOfName(vm.parseJsonString(json, string.concat(base, ".args[1]")));
                if (b < 0) continue;
                got = _bin(op, uint8(uint256(a)), uint8(uint256(b)));
            } else {
                got = _un(op, uint8(uint256(a)));
            }
            if (got < 0) continue; // an operation this suite does not model
            expected = keccak256(bytes(res)) == keccak256("true")
                ? int256(1)
                : keccak256(bytes(res)) == keccak256("false") ? int256(0) : _bitsOfName(res);
            assertEq(got, expected, string.concat(op, " row ", vm.toString(r)));
            ++checked;
        }
    }

    function test_goldenVectors_four() public view {
        string[] memory dirs = _sourcesFor("four.json");
        uint256 jsChecked;
        for (uint256 d; d < dirs.length; ++d) {
            string memory json = _read(dirs[d], "four.json");
            uint256 n = _checkTables(json) + _checkRows(json);
            if (d == 0) jsChecked = n;
        }
        // 11 binary tables x 16 + 5 unary-ish x 4 + 1 bool unary + constants: the JS file is complete
        assertEq(jsChecked, 11 * 16 + 6 * 4 + 5, "js four.json must be fully exercised");
    }
}
