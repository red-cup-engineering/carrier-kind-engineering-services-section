// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Four } from "../src/Four.sol";
import { SignCell } from "../src/SignCell.sol";
import { CellLedger } from "../src/CellLedger.sol";
import { AllowlistMembrane } from "../src/AllowlistMembrane.sol";
import { Settlement } from "../src/Settlement.sol";
import { GraphCohomology } from "../src/GraphCohomology.sol";
import { Vectors } from "./helpers/Vectors.sol";

contract CellLedgerTest is Vectors {
    AllowlistMembrane internal membrane;
    CellLedger internal ledger;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal carol = address(0xCA201);
    address internal relayer = address(0x7E1A);
    address internal stranger = address(0x5712);

    function setUp() public {
        membrane = new AllowlistMembrane(address(this));
        ledger = new CellLedger(membrane, CellLedger.WitnessScope.ChainAgnostic);
        membrane.setGrant(alice, bytes32(0), 3);
        membrane.setGrant(bob, bytes32(0), 3);
        membrane.setGrant(carol, bytes32(0), 1); // may only tell for
        membrane.setGrant(relayer, bytes32(0), 3 | 4);
    }

    function _terms(string memory s, string memory p, string memory o) internal pure returns (CellLedger.Terms memory) {
        return CellLedger.Terms(SignCell.textTerm(s), SignCell.textTerm(p), SignCell.textTerm(o));
    }

    function _tell(address who, CellLedger.Terms memory t, SignCell.Side side) internal returns (bytes32 cell, bool fresh) {
        vm.prank(who);
        (cell,, fresh) = ledger.tell(t, side);
    }

    // ───────── identity ─────────

    function test_ledgerOpensCellsAtTheJsContentAddress() public {
        string memory json = _read(JS_DIR, "cell-address.json");
        (bytes32 cell,) = _tell(alice, _terms("alice", "member-of", "tidepool"), SignCell.Side.For);
        assertEq(cell, _bytes32(vm.parseJsonString(json, ".cells[0].cellId")));
        assertTrue(ledger.isOpen(cell));
        assertEq(ledger.predicateOf(cell), SignCell.termId(SignCell.textTerm("member-of")));
    }

    // ───────── contradictions are held, not errors ─────────

    function test_disagreementIsHeldAsBothNotARevert() public {
        CellLedger.Terms memory t = _terms("receipt-9", "paid", "receipt-9");
        (bytes32 cell,) = _tell(alice, t, SignCell.Side.For);
        assertTrue(ledger.valueOf(cell) == Four.Point.True);

        vm.expectEmit(true, false, false, false);
        emit CellLedger.Held(cell, 1, 1, 2);
        _tell(bob, t, SignCell.Side.Against);

        assertTrue(ledger.valueOf(cell) == Four.Point.Both);
        assertTrue(ledger.isHeld(cell));
        assertEq(ledger.heldCount(), 1);
        assertEq(ledger.topMassOf(cell), 1);
        // a held contradiction stays designated (told for) and counted
        assertTrue(Four.isDesignated(ledger.valueOf(cell)));
        // it keeps accepting tellings: nothing is overwritten, nothing reverts
        (bytes32 c2, bool fresh) = _tell(carol, t, SignCell.Side.For);
        assertEq(c2, cell);
        assertTrue(fresh);
        (uint32 f, uint32 a,,) = ledger.evidenceOf(cell);
        assertEq(f, 2);
        assertEq(a, 1);
        assertTrue(ledger.valueOf(cell) == Four.Point.Both);
        assertEq(ledger.topMassOf(cell), 1);
        assertEq(ledger.heldCount(), 1); // still one held cell; Held fired once
    }

    function test_oneTellerMayTellBothSidesAndHoldItself() public {
        CellLedger.Terms memory t = _terms("x", "p", "y");
        (bytes32 cell,) = _tell(alice, t, SignCell.Side.For);
        _tell(alice, t, SignCell.Side.Against);
        assertTrue(ledger.valueOf(cell) == Four.Point.Both);
        (bool f, bool a) = ledger.toldBy(cell, ledger.selfWitnessId(alice));
        assertTrue(f && a);
    }

    function test_tellingTwiceIsIdempotent() public {
        CellLedger.Terms memory t = _terms("x", "p", "y");
        _tell(alice, t, SignCell.Side.For);
        uint64 s = ledger.seq();
        bytes32 h = ledger.head();
        (, bool fresh) = _tell(alice, t, SignCell.Side.For);
        assertFalse(fresh);
        assertEq(ledger.seq(), s);
        assertEq(ledger.head(), h);
    }

    function test_censusAndWitsTrackTheSection() public {
        CellLedger.Terms memory t1 = _terms("a", "p", "b");
        CellLedger.Terms memory t2 = _terms("b", "p", "c");
        CellLedger.Terms memory t3 = _terms("c", "p", "a");
        _tell(alice, t1, SignCell.Side.For);
        _tell(alice, t2, SignCell.Side.Against);
        (bytes32 c3,) = _tell(alice, t3, SignCell.Side.For);
        _tell(bob, t3, SignCell.Side.Against);
        uint256[4] memory census = ledger.census();
        assertEq(census[0], 0);
        assertEq(census[1], 1);
        assertEq(census[2], 1);
        assertEq(census[3], 1);
        assertEq(ledger.wits(), 4); // 1 + 1 + 2 sides told
        assertTrue(ledger.valueOf(c3) == Four.Point.Both);
    }

    // ───────── membrane ─────────

    function test_membraneRefusesTheUnadmitted() public {
        CellLedger.Terms memory t = _terms("x", "p", "y");
        vm.expectRevert(
            abi.encodeWithSelector(
                CellLedger.NotAdmitted.selector, stranger, SignCell.termId(SignCell.textTerm("p")), SignCell.Side.For, false
            )
        );
        vm.prank(stranger);
        ledger.tell(t, SignCell.Side.For);
        // carol may tell for but not against
        vm.prank(carol);
        ledger.tell(t, SignCell.Side.For);
        vm.expectRevert();
        vm.prank(carol);
        ledger.tell(t, SignCell.Side.Against);
    }

    function test_membraneIsScopedByPredicate() public {
        bytes32 vote = SignCell.termId(SignCell.textTerm("voted"));
        membrane.setGrant(stranger, vote, 3);
        vm.prank(stranger);
        ledger.tell(_terms("stranger", "voted", "yes"), SignCell.Side.For);
        vm.expectRevert();
        vm.prank(stranger);
        ledger.tell(_terms("stranger", "member-of", "tidepool"), SignCell.Side.For);
    }

    function test_openContestationGrant() public {
        // anyone may tell AGAINST the predicate "paid" (contest a receipt), nobody-in-particular may tell for
        membrane.setGrant(address(0), SignCell.termId(SignCell.textTerm("paid")), 2);
        CellLedger.Terms memory t = _terms("receipt-9", "paid", "receipt-9");
        _tell(alice, t, SignCell.Side.For);
        (bytes32 cell,) = _tell(stranger, t, SignCell.Side.Against);
        assertTrue(ledger.valueOf(cell) == Four.Point.Both);
        vm.expectRevert();
        vm.prank(stranger);
        ledger.tell(t, SignCell.Side.For);
    }

    function test_relayNeedsANamedRelayGrant() public {
        bytes memory foreign = SignCell.textTerm("hive:emsenn");
        CellLedger.Terms memory t = _terms("hive:emsenn", "approved", "proposal-3");
        vm.expectRevert();
        vm.prank(alice);
        ledger.tellRelayed(t, SignCell.Side.For, foreign);
        vm.expectRevert(AllowlistMembrane.RelayNeedsNamedTeller.selector);
        membrane.setGrant(address(0), bytes32(0), 4);
    }

    function test_twoRelayersCarryingOneForeignTellingCollapseToOneWitness() public {
        membrane.setGrant(stranger, bytes32(0), 3 | 4);
        bytes memory foreign = SignCell.textTerm("hive:emsenn");
        CellLedger.Terms memory t = _terms("proposal-3", "approved", "proposal-3");
        vm.prank(relayer);
        (bytes32 cell,, bool f1) = ledger.tellRelayed(t, SignCell.Side.For, foreign);
        vm.prank(stranger);
        (,, bool f2) = ledger.tellRelayed(t, SignCell.Side.For, foreign);
        assertTrue(f1);
        assertFalse(f2);
        (uint32 f,,,) = ledger.evidenceOf(cell);
        assertEq(f, 1);
    }

    function test_relayRejectsAGluedWitness() public {
        bytes memory glued = abi.encodePacked(SignCell.textTerm("a"), SignCell.textTerm("b"));
        vm.expectRevert(CellLedger.WitnessNotSingleItem.selector);
        vm.prank(relayer);
        ledger.tellRelayed(_terms("x", "p", "y"), SignCell.Side.For, glued);
    }

    function test_malformedTermsAreRefused() public {
        CellLedger.Terms memory t = _terms("x", "p", "y");
        t.subject = abi.encodePacked(t.subject, t.subject);
        vm.expectRevert();
        vm.prank(alice);
        ledger.tell(t, SignCell.Side.For);
    }

    function test_tellKnownNeedsAnOpenCell() public {
        vm.expectRevert(abi.encodeWithSelector(CellLedger.CellNotOpen.selector, bytes32(uint256(1))));
        vm.prank(alice);
        ledger.tellKnown(bytes32(uint256(1)), SignCell.Side.For);
        (bytes32 cell,) = _tell(alice, _terms("x", "p", "y"), SignCell.Side.For);
        vm.prank(bob);
        (, bool fresh) = ledger.tellKnown(cell, SignCell.Side.Against);
        assertTrue(fresh);
        assertTrue(ledger.valueOf(cell) == Four.Point.Both);
    }

    // ───────── cross-chain: one account, one witness ─────────

    function test_chainAgnosticWitnessIsTheSameOnEveryChain() public {
        vm.chainId(8453);
        bytes32 onBase = ledger.selfWitnessId(alice);
        vm.chainId(42161);
        assertEq(ledger.selfWitnessId(alice), onBase);
        CellLedger scoped = new CellLedger(membrane, CellLedger.WitnessScope.ChainScoped);
        bytes32 scopedArb = scoped.selfWitnessId(alice);
        vm.chainId(8453);
        assertTrue(scoped.selfWitnessId(alice) != scopedArb);
        string memory json = _read(JS_DIR, "account-witness.json");
        assertEq(scoped.selfWitnessId(vm.parseAddress(vm.parseJsonString(json, ".chainScoped[1].address"))), _bytes32(vm.parseJsonString(json, ".chainScoped[1].witnessId")));
    }

    function test_twoChainsDisagreeingIsHeldNotAnError() public {
        // chain A's ledger says true, chain B's says false; a third ledger imports each as a relayed witness
        CellLedger.Terms memory t = _terms("proposal-3", "passed", "proposal-3");
        bytes memory fromBase = SignCell.textTerm("ledger:eip155:8453:0xbase");
        bytes memory fromArb = SignCell.textTerm("ledger:eip155:42161:0xarb");
        vm.startPrank(relayer);
        (bytes32 cell,,) = ledger.tellRelayed(t, SignCell.Side.For, fromBase);
        ledger.tellRelayed(t, SignCell.Side.Against, fromArb);
        vm.stopPrank();
        assertTrue(ledger.valueOf(cell) == Four.Point.Both);
        assertEq(ledger.heldCount(), 1);
    }

    // ───────── content-addressed history ─────────

    function test_headIsAHashChainOverTellingIds() public {
        CellLedger.Terms memory t = _terms("x", "p", "y");
        vm.prank(alice);
        (bytes32 cell, bytes32 telling,) = ledger.tell(t, SignCell.Side.For);
        assertEq(telling, SignCell.tellingId(cell, SignCell.Side.For, ledger.selfWitnessId(alice)));
        bytes32 h1 = sha256(abi.encodePacked(bytes32(0), telling));
        assertEq(ledger.head(), h1);
        vm.prank(bob);
        (, bytes32 telling2,) = ledger.tell(t, SignCell.Side.Against);
        assertEq(ledger.head(), sha256(abi.encodePacked(h1, telling2)));
        assertEq(ledger.seq(), 2);
    }

    // ───────── order independence: the section is a join-semilattice fold ─────────

    function testFuzz_foldIsIndependentOfTellingOrder(uint64 seed) public {
        CellLedger a = new CellLedger(membrane, CellLedger.WitnessScope.ChainAgnostic);
        CellLedger b = new CellLedger(membrane, CellLedger.WitnessScope.ChainAgnostic);
        membrane.setGrant(address(0), bytes32(0), 3);
        uint256 n = 12;
        CellLedger.Terms[3] memory cells = [_terms("a", "p", "b"), _terms("b", "p", "c"), _terms("c", "p", "a")];
        uint256[] memory who = new uint256[](n);
        uint256[] memory which = new uint256[](n);
        uint256[] memory side = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            uint256 r = uint256(keccak256(abi.encode(seed, i)));
            who[i] = (r % 5) + 1;
            which[i] = (r >> 8) % 3;
            side[i] = (r >> 16) % 2;
        }
        for (uint256 i; i < n; ++i) {
            vm.prank(address(uint160(who[i])));
            a.tell(cells[which[i]], SignCell.Side(side[i]));
            uint256 j = n - 1 - i;
            vm.prank(address(uint160(who[j])));
            b.tell(cells[which[j]], SignCell.Side(side[j]));
        }
        for (uint256 c; c < 3; ++c) {
            bytes32 id = SignCell.cellId(cells[c].subject, cells[c].predicate, cells[c].object);
            assertTrue(a.valueOf(id) == b.valueOf(id));
            (uint32 fa, uint32 aa,,) = a.evidenceOf(id);
            (uint32 fb, uint32 ab,,) = b.evidenceOf(id);
            assertEq(fa, fb);
            assertEq(aa, ab);
        }
        uint256[4] memory ca = a.census();
        uint256[4] memory cb = b.census();
        for (uint256 k; k < 4; ++k) assertEq(ca[k], cb[k]);
        assertEq(a.wits(), b.wits());
    }

    /// The value never falls as tellings arrive (the Lyapunov quantity wits only grows).
    function testFuzz_valueOnlyClimbs(uint64 seed) public {
        membrane.setGrant(address(0), bytes32(0), 3);
        CellLedger.Terms memory t = _terms("x", "p", "y");
        Four.Point prior = Four.Point.None;
        uint256 priorWits;
        for (uint256 i; i < 10; ++i) {
            uint256 r = uint256(keccak256(abi.encode(seed, i)));
            vm.prank(address(uint160((r % 4) + 1)));
            (bytes32 cell,,) = ledger.tell(t, SignCell.Side(uint8((r >> 8) % 2)));
            Four.Point now_ = ledger.valueOf(cell);
            assertTrue(Four.leqK(prior, now_));
            assertGe(ledger.wits(), priorWits);
            prior = now_;
            priorWits = ledger.wits();
        }
    }

    // ───────── sections and graph audit ─────────

    function test_goldenVectors_sectionDigest() public view {
        string memory json = _read(JS_DIR, "section-digest.json");
        for (uint256 s; _has(json, string.concat(".sections[", vm.toString(s), "]")); ++s) {
            string memory base = string.concat(".sections[", vm.toString(s), "]");
            uint256 n;
            while (_has(json, string.concat(base, ".cells[", vm.toString(n), "]"))) ++n;
            bytes32[] memory cells = new bytes32[](n);
            Four.Point[] memory values = new Four.Point[](n);
            for (uint256 i; i < n; ++i) {
                cells[i] = _bytes32(vm.parseJsonString(json, string.concat(base, ".cells[", vm.toString(i), "]")));
                values[i] = Four.Point(vm.parseJsonUint(json, string.concat(base, ".values[", vm.toString(i), "]")));
            }
            assertEq(
                Settlement.sectionDigest(cells, values),
                _bytes32(vm.parseJsonString(json, string.concat(base, ".digest")))
            );
        }
    }

    function test_ledgerSectionReadsHeldCellsAndDigests() public {
        CellLedger.Terms[3] memory ts = [_terms("x", "p", "y"), _terms("y", "p", "z"), _terms("z", "p", "x")];
        bytes32[] memory ids = new bytes32[](3);
        for (uint256 i; i < 3; ++i) ids[i] = SignCell.cellId(ts[i].subject, ts[i].predicate, ts[i].object);
        _tell(alice, ts[0], SignCell.Side.For);
        _tell(alice, ts[1], SignCell.Side.For);
        _tell(bob, ts[1], SignCell.Side.Against);
        _tell(alice, ts[2], SignCell.Side.Against);
        // canonical order
        for (uint256 i; i < 3; ++i) for (uint256 j = i + 1; j < 3; ++j) if (ids[j] < ids[i]) (ids[i], ids[j]) = (ids[j], ids[i]);
        (Four.Point[] memory values, bytes32 digest, uint256[4] memory counts) = ledger.section(ids);
        assertEq(counts[3], 1);
        assertEq(counts[1], 1);
        assertEq(counts[2], 1);
        assertEq(digest, Settlement.sectionDigest(ids, values));
        assertEq(Settlement.heldIndices(values).length, 1);
        assertEq(Settlement.wits(values), 4);
        assertEq(Settlement.designatedCount(values), 2);
        // a non-canonical order is refused rather than digested
        bytes32 tmp = ids[0];
        ids[0] = ids[1];
        ids[1] = tmp;
        vm.expectRevert();
        ledger.section(ids);
    }

    function test_goldenVectors_graphCohomology() public view {
        string memory json = _read(JS_DIR, "cohomology.json");
        for (uint256 g; _has(json, string.concat(".graphs[", vm.toString(g), "]")); ++g) {
            string memory base = string.concat(".graphs[", vm.toString(g), "]");
            uint256 n;
            while (_has(json, string.concat(base, ".subjects[", vm.toString(n), "]"))) ++n;
            bytes32[] memory subs = new bytes32[](n);
            bytes32[] memory objs = new bytes32[](n);
            for (uint256 i; i < n; ++i) {
                subs[i] = _bytes32(vm.parseJsonString(json, string.concat(base, ".subjects[", vm.toString(i), "]")));
                objs[i] = _bytes32(vm.parseJsonString(json, string.concat(base, ".objects[", vm.toString(i), "]")));
            }
            GraphCohomology.Betti memory b = GraphCohomology.betti(subs, objs);
            assertEq(b.entities, vm.parseJsonUint(json, string.concat(base, ".entities")));
            assertEq(b.cells, vm.parseJsonUint(json, string.concat(base, ".cells")));
            assertEq(b.h0, vm.parseJsonUint(json, string.concat(base, ".h0")), "H0");
            assertEq(b.h1, vm.parseJsonUint(json, string.concat(base, ".h1")), "H1");
        }
    }
}
