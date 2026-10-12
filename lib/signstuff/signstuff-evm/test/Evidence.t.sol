// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Four } from "../src/Four.sol";
import { Evidence } from "../src/Evidence.sol";
import { WitnessSet } from "../src/WitnessSet.sol";
import { Vectors } from "./helpers/Vectors.sol";

contract EvidenceTest is Vectors {
    function _pair(uint256 f, uint256 a, uint8 v) internal pure returns (Evidence.Pair memory) {
        return Evidence.valued(f, a, Four.Point(bound(v, 0, 3)));
    }

    function _same(Evidence.Pair memory x, Evidence.Pair memory y) internal pure returns (bool) {
        return x.forBits == y.forBits && x.againstBits == y.againstBits && x.value == y.value;
    }

    // ───────── laws on the bitmap carrier ─────────

    function testFuzz_joinsAreLosslessAndSemilattice(
        uint256 f1, uint256 a1, uint8 v1, uint256 f2, uint256 a2, uint8 v2, uint256 f3, uint256 a3, uint8 v3
    ) public pure {
        Evidence.Pair memory x = _pair(f1, a1, v1);
        Evidence.Pair memory y = _pair(f2, a2, v2);
        Evidence.Pair memory z = _pair(f3, a3, v3);
        // every operation unions both sides: no witness is ever dropped
        Evidence.Pair[4] memory rs = [Evidence.joinK(x, y), Evidence.meetK(x, y), Evidence.joinT(x, y), Evidence.meetT(x, y)];
        for (uint256 i; i < 4; ++i) {
            assertEq(rs[i].forBits, f1 | f2);
            assertEq(rs[i].againstBits, a1 | a2);
            assertEq(rs[i].forBits & f1, f1);
            assertEq(rs[i].againstBits & a2, a2);
        }
        // commutative, associative, idempotent (on the whole pair, value included)
        assertTrue(_same(Evidence.joinK(x, y), Evidence.joinK(y, x)));
        assertTrue(_same(Evidence.meetK(x, y), Evidence.meetK(y, x)));
        assertTrue(_same(Evidence.joinT(x, y), Evidence.joinT(y, x)));
        assertTrue(_same(Evidence.meetT(x, y), Evidence.meetT(y, x)));
        assertTrue(_same(Evidence.joinK(Evidence.joinK(x, y), z), Evidence.joinK(x, Evidence.joinK(y, z))));
        assertTrue(_same(Evidence.meetT(Evidence.meetT(x, y), z), Evidence.meetT(x, Evidence.meetT(y, z))));
        assertTrue(_same(Evidence.joinK(x, x), x));
        assertTrue(_same(Evidence.meetK(x, x), x));
        // the value is the four-point operation on the values
        assertTrue(Evidence.joinK(x, y).value == Four.joinK(x.value, y.value));
        assertTrue(Evidence.meetT(x, y).value == Four.meetT(x.value, y.value));
    }

    function testFuzz_evidenceMonotoneUnderEveryOperation(uint256 f1, uint256 a1, uint256 f2, uint256 a2) public pure {
        Evidence.Pair memory x = Evidence.measured(f1, a1);
        Evidence.Pair memory y = Evidence.measured(f2, a2);
        assertTrue(Evidence.leqK(x, Evidence.joinK(x, y)));
        assertTrue(Evidence.leqK(y, Evidence.joinK(x, y)));
        assertTrue(Evidence.leqK(x, Evidence.meetK(x, y))); // meet drops values, never witnesses
        assertTrue(Evidence.leqK(x, Evidence.joinT(x, y)));
        assertTrue(Evidence.leqK(x, Evidence.meetT(x, y)));
        // leqK is a preorder on evidence; leqT needs no more for and no less against
        assertTrue(Evidence.leqK(x, x));
        assertEq(Evidence.leqK(x, y), Evidence.leqK(Evidence.joinK(x, y), y));
    }

    function testFuzz_joinKKeepsMeasured(uint256 f1, uint256 a1, uint256 f2, uint256 a2) public pure {
        Evidence.Pair memory r = Evidence.joinK(Evidence.measured(f1, a1), Evidence.measured(f2, a2));
        assertTrue(Evidence.isMeasured(r)); // joinK_measured
    }

    function test_meetKReachesAbsurdAndKeepsWitnesses() public pure {
        // a potential told by w0 met with an active told by w1: value kBot, both witnesses on record
        Evidence.Pair memory p = Evidence.measured(1, 0);
        Evidence.Pair memory a = Evidence.measured(0, 2);
        Evidence.Pair memory m = Evidence.meetK(p, a);
        assertTrue(m.value == Four.Point.None);
        assertEq(m.forBits, 1);
        assertEq(m.againstBits, 2);
        assertFalse(Evidence.isMeasured(m)); // meetK_not_measured
        assertTrue(Evidence.presence(m) == Four.Point.Both);
        (uint256 pos, uint256 neg) = Evidence.record(m);
        assertEq(pos, 1);
        assertEq(neg, 1);
    }

    function testFuzz_negation(uint256 f, uint256 a, uint8 v, uint256 f2, uint256 a2) public pure {
        Evidence.Pair memory x = _pair(f, a, v);
        Evidence.Pair memory y = Evidence.measured(f2, a2);
        assertTrue(_same(Evidence.negate(Evidence.negate(x)), x));
        assertEq(Evidence.isMeasured(Evidence.negate(y)), Evidence.isMeasured(y) ? true : Evidence.isMeasured(Evidence.negate(y)));
        assertTrue(Evidence.isMeasured(Evidence.negate(y))); // negate_measured
        // a witness for is a witness against the negation
        assertEq(Evidence.negate(x).againstBits, x.forBits);
        // De Morgan at the evidence level
        Evidence.Pair memory lhs = Evidence.negate(Evidence.joinT(x, y));
        Evidence.Pair memory rhs = Evidence.meetT(Evidence.negate(x), Evidence.negate(y));
        assertTrue(_same(lhs, rhs));
    }

    function testFuzz_conflationTouchesOnlyTheValue(uint256 f, uint256 a, uint8 v) public pure {
        Evidence.Pair memory x = _pair(f, a, v);
        Evidence.Pair memory c = Evidence.conflate(x);
        assertEq(c.forBits, x.forBits);
        assertEq(c.againstBits, x.againstBits);
        assertTrue(_same(Evidence.conflate(c), x));
    }

    function testFuzz_presumeFree(uint256 f, uint256 a, uint8 v) public pure {
        Evidence.Pair memory x = _pair(f, a, v);
        Evidence.Pair memory r = Evidence.presumeFree(x);
        assertTrue(Four.leqK(x.value, r.value)); // presumeFree_ge
        assertEq(r.forBits, x.forBits); // no witness is manufactured
        assertEq(r.againstBits, x.againstBits);
        if (f != 0 && a != 0) assertTrue(_same(r, x)); // presumeFree_of_full
    }

    function test_presumeOneSidedGoesToTop() public pure {
        assertTrue(Evidence.presumeFree(Evidence.measured(4, 0)).value == Four.Point.Both);
    }

    function test_witnessingBySlot() public pure {
        Evidence.Pair memory x = Evidence.measured(0, 0);
        x = Evidence.witnessFor(x, 3);
        x = Evidence.witnessAgainst(x, 200);
        assertTrue(x.value == Four.Point.Both);
        assertEq(x.forBits, 1 << 3);
        assertEq(x.againstBits, uint256(1) << 200);
        x = Evidence.witnessFor(x, 3); // idempotent
        (uint256 pos, uint256 neg) = Evidence.record(x);
        assertEq(pos, 1);
        assertEq(neg, 1);
    }

    // ───────── bitmap carrier against JS signchain/bilattice ─────────

    function _fromRow(string memory json, string memory base) internal view returns (Evidence.Pair memory) {
        uint256 f;
        uint256 a;
        for (uint256 i; _has(json, string.concat(base, ".for[", vm.toString(i), "]")); ++i) {
            f |= uint256(1) << vm.parseJsonUint(json, string.concat(base, ".for[", vm.toString(i), "]"));
        }
        for (uint256 i; _has(json, string.concat(base, ".against[", vm.toString(i), "]")); ++i) {
            a |= uint256(1) << vm.parseJsonUint(json, string.concat(base, ".against[", vm.toString(i), "]"));
        }
        return Evidence.valued(f, a, Four.Point(vm.parseJsonUint(json, string.concat(base, ".value"))));
    }

    function _bin(string memory op, Evidence.Pair memory a, Evidence.Pair memory b) internal pure returns (Evidence.Pair memory) {
        bytes32 h = keccak256(bytes(op));
        if (h == keccak256("joinK")) return Evidence.joinK(a, b);
        if (h == keccak256("meetK")) return Evidence.meetK(a, b);
        if (h == keccak256("joinT")) return Evidence.joinT(a, b);
        return Evidence.meetT(a, b);
    }

    function test_goldenVectors_signchainBilattice() public view {
        string memory json = _read(JS_DIR, "evidence.json");
        string[] memory ops = _col(json, ".binary", ".op");
        assertGt(ops.length, 10);
        for (uint256 i; i < ops.length; ++i) {
            string memory base = string.concat(".binary[", vm.toString(i), "]");
            Evidence.Pair memory a = _fromRow(json, string.concat(base, ".a"));
            Evidence.Pair memory b = _fromRow(json, string.concat(base, ".b"));
            Evidence.Pair memory expected = _fromRow(json, string.concat(base, ".result"));
            assertTrue(_same(_bin(ops[i], a, b), expected), string.concat(ops[i], " #", vm.toString(i)));
            assertEq(Evidence.leqK(a, b), vm.parseJsonBool(json, string.concat(base, ".leqK")));
            assertEq(Evidence.leqT(a, b), vm.parseJsonBool(json, string.concat(base, ".leqT")));
        }
        string[] memory uops = _col(json, ".unary", ".op");
        assertGt(uops.length, 8);
        for (uint256 i; i < uops.length; ++i) {
            string memory base = string.concat(".unary[", vm.toString(i), "]");
            Evidence.Pair memory a = _fromRow(json, string.concat(base, ".a"));
            Evidence.Pair memory expected = _fromRow(json, string.concat(base, ".result"));
            bytes32 h = keccak256(bytes(uops[i]));
            Evidence.Pair memory got = h == keccak256("negate")
                ? Evidence.negate(a)
                : h == keccak256("conflate") ? Evidence.conflate(a) : Evidence.presumeFree(a);
            assertTrue(_same(got, expected), string.concat(uops[i], " #", vm.toString(i)));
        }
    }

    // ───────── WitnessSet: JS parity, proofs, union ─────────

    function test_goldenVectors_witnessSetRootsAndProofs() public view {
        string memory json = _read(JS_DIR, "witness-set.json");
        for (uint256 s; _has(json, string.concat(".sets[", vm.toString(s), "]")); ++s) {
            string memory base = string.concat(".sets[", vm.toString(s), "]");
            bytes32[] memory ids = _ids(json, string.concat(base, ".ids"));
            bytes32 root = _bytes32(vm.parseJsonString(json, string.concat(base, ".root")));
            assertEq(WitnessSet.root(ids), root, "root");
            for (uint256 i; i < ids.length; ++i) {
                string memory pb = string.concat(base, ".proofs[", vm.toString(i), "].proof");
                bytes32[] memory proof = _ids(json, pb);
                assertTrue(WitnessSet.contains(proof, root, ids[i]), "member proof");
                assertFalse(WitnessSet.contains(proof, root, keccak256("stranger")), "non-member");
            }
        }
    }

    function test_goldenVectors_witnessSetUnions() public view {
        string memory json = _read(JS_DIR, "witness-set.json");
        for (uint256 u; _has(json, string.concat(".unions[", vm.toString(u), "]")); ++u) {
            string memory base = string.concat(".unions[", vm.toString(u), "]");
            bytes32[] memory a = _ids(json, string.concat(base, ".a"));
            bytes32[] memory b = _ids(json, string.concat(base, ".b"));
            bytes32[] memory want = _ids(json, string.concat(base, ".union"));
            bytes32[] memory got = WitnessSet.union(a, b);
            assertEq(got.length, want.length);
            for (uint256 i; i < got.length; ++i) assertEq(got[i], want[i]);
            assertEq(WitnessSet.root(got), _bytes32(vm.parseJsonString(json, string.concat(base, ".unionRoot"))));
        }
    }

    function _ids(string memory json, string memory key) internal view returns (bytes32[] memory out) {
        uint256 n;
        while (_has(json, string.concat(key, "[", vm.toString(n), "]"))) ++n;
        out = new bytes32[](n);
        for (uint256 i; i < n; ++i) {
            out[i] = _bytes32(vm.parseJsonString(json, string.concat(key, "[", vm.toString(i), "]")));
        }
    }

    function _set(uint256 seed, uint256 n) internal pure returns (bytes32[] memory out) {
        bytes32[] memory raw = new bytes32[](n);
        for (uint256 i; i < n; ++i) raw[i] = keccak256(abi.encode(seed % 17, i));
        // insertion sort + dedupe
        for (uint256 i = 1; i < n; ++i) {
            bytes32 k = raw[i];
            uint256 j = i;
            while (j > 0 && raw[j - 1] > k) {
                raw[j] = raw[j - 1];
                --j;
            }
            raw[j] = k;
        }
        uint256 m;
        bytes32[] memory tmp = new bytes32[](n);
        for (uint256 i; i < n; ++i) {
            if (i == 0 || raw[i] != raw[i - 1]) tmp[m++] = raw[i];
        }
        out = new bytes32[](m);
        for (uint256 i; i < m; ++i) out[i] = tmp[i];
    }

    function testFuzz_setUnionIsALosslessSemilattice(uint256 s1, uint256 s2, uint256 s3, uint8 n1, uint8 n2, uint8 n3) public pure {
        bytes32[] memory a = _set(s1, bound(n1, 0, 12));
        bytes32[] memory b = _set(s2, bound(n2, 0, 12));
        bytes32[] memory c = _set(s3, bound(n3, 0, 12));
        bytes32[] memory ab = WitnessSet.union(a, b);
        assertEq(WitnessSet.root(ab), WitnessSet.root(WitnessSet.union(b, a)));
        assertEq(
            WitnessSet.root(WitnessSet.union(ab, c)), WitnessSet.root(WitnessSet.union(a, WitnessSet.union(b, c)))
        );
        assertEq(WitnessSet.root(WitnessSet.union(a, a)), WitnessSet.root(a));
        assertTrue(WitnessSet.isSubset(a, ab) && WitnessSet.isSubset(b, ab)); // nothing dropped
        assertTrue(WitnessSet.isStrictlyAscending(ab));
    }

    function test_unsortedSetsAreRefused() public {
        bytes32[] memory bad = new bytes32[](2);
        bad[0] = bytes32(uint256(2));
        bad[1] = bytes32(uint256(1));
        vm.expectRevert(abi.encodeWithSelector(WitnessSet.NotStrictlyAscending.selector, 1));
        this.rootExternal(bad);
        bad[1] = bad[0]; // duplicates too
        vm.expectRevert(abi.encodeWithSelector(WitnessSet.NotStrictlyAscending.selector, 1));
        this.rootExternal(bad);
    }

    function rootExternal(bytes32[] memory ids) external pure returns (bytes32) {
        return WitnessSet.root(ids);
    }

    // ───────── Committed carrier: joins are checked by opening ─────────

    function test_committedJoinKeepsEveryWitness() public pure {
        bytes32[] memory f1 = _set(1, 5);
        bytes32[] memory a1 = _set(2, 3);
        bytes32[] memory f2 = _set(3, 4);
        bytes32[] memory a2 = new bytes32[](0);
        Evidence.Committed memory x = Evidence.commitMeasured(f1, a1);
        Evidence.Committed memory y = Evidence.commitMeasured(f2, a2);
        Evidence.Opening memory xo = Evidence.Opening(f1, a1);
        Evidence.Opening memory yo = Evidence.Opening(f2, a2);
        Evidence.Committed memory j = Evidence.joinK(x, xo, y, yo);
        assertEq(j.forCount, WitnessSet.union(f1, f2).length);
        assertEq(j.againstCount, a1.length);
        assertEq(j.forRoot, WitnessSet.root(WitnessSet.union(f1, f2)));
        assertTrue(Evidence.isMeasured(j));
        assertTrue(Evidence.leqK(x, xo, j, Evidence.Opening(WitnessSet.union(f1, f2), a1)));
        // the meet drops the value but not a witness
        Evidence.Committed memory m = Evidence.meetK(x, xo, y, yo);
        assertEq(m.forRoot, j.forRoot);
        assertEq(m.againstRoot, j.againstRoot);
        assertTrue(m.value == Four.meetK(x.value, y.value));
    }

    function test_committedJoinRefusesAFalseOpening() public {
        bytes32[] memory f1 = _set(1, 5);
        bytes32[] memory none = new bytes32[](0);
        Evidence.Committed memory x = Evidence.commitMeasured(f1, none);
        Evidence.Opening memory lie = Evidence.Opening(_set(9, 5), none);
        vm.expectRevert();
        this.joinExternal(x, lie);
    }

    function joinExternal(Evidence.Committed memory x, Evidence.Opening memory o) external pure returns (Evidence.Committed memory) {
        return Evidence.joinK(x, o, x, o);
    }
}
