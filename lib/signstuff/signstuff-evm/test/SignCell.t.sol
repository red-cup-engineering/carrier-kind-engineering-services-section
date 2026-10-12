// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Cbor } from "../src/Cbor.sol";
import { SignCell } from "../src/SignCell.sol";
import { Vectors } from "./helpers/Vectors.sol";

contract SignCellTest is Vectors {
    // ───────── identity parity with the JS content address ─────────

    function test_cellIdMatchesJsContentAddress_textCells() public view {
        string[] memory dirs = _sourcesFor("cell-address.json");
        for (uint256 d; d < dirs.length; ++d) {
            string memory json = _read(dirs[d], "cell-address.json");
            string[] memory subjects = _col(json, ".cells", ".encoded.subject");
            string[] memory predicates = _col(json, ".cells", ".encoded.predicate");
            string[] memory objects = _col(json, ".cells", ".encoded.object");
            string[] memory ids = _col(json, ".cells", ".cellId");
            string[] memory converse = _col(json, ".cells", ".converseCellId");
            string[] memory reflexive = _col(json, ".cells", ".reflexiveCellId");
            assertGt(ids.length, 5);
            for (uint256 i; i < ids.length; ++i) {
                bytes memory s = _bytes(subjects[i]);
                bytes memory p = _bytes(predicates[i]);
                bytes memory o = _bytes(objects[i]);
                assertEq(SignCell.cellId(s, p, o), _bytes32(ids[i]), "cellId");
                assertEq(SignCell.converseId(s, p, o), _bytes32(converse[i]), "converse");
                assertEq(SignCell.utteranceCellId(s, p), _bytes32(reflexive[i]), "reflexive");
            }
        }
    }

    function test_onChainTermBuildersMatchJsEncoding() public view {
        string memory json = _read(JS_DIR, "cell-address.json");
        string[] memory subjects = _col(json, ".cells", ".encoded.subject");
        string[] memory ids = _col(json, ".cells", ".termIds.subject");
        // the same strings the emitter used, rebuilt on-chain
        string[7] memory texts = ["alice", "tidepool", unicode"é", "", new string(0), "urn:561:pool:7", "hive:emsenn"];
        assertEq(SignCell.textTerm(texts[0]), _bytes(subjects[0]));
        assertEq(SignCell.textTerm(texts[1]), _bytes(subjects[1]));
        assertEq(SignCell.textTerm(texts[2]), _bytes(subjects[2]));
        assertEq(SignCell.textTerm(texts[3]), _bytes(subjects[3]));
        assertEq(SignCell.termId(SignCell.textTerm("alice")), _bytes32(ids[0]));
        assertEq(SignCell.textTerm("urn:561:pool:7"), _bytes(subjects[5]));
        assertEq(SignCell.textTerm("hive:emsenn"), _bytes(subjects[6]));
        // lengths straddling the CBOR head widths (23 / 24 / 300 bytes)
        assertEq(SignCell.textTerm(_repeat("a", 23)), _bytes(subjects[4]));
    }

    function test_uintAndBytesTermsMatchJs() public view {
        string memory json = _read(JS_DIR, "cell-address.json");
        string[] memory values = _col(json, ".uintTerms", ".value");
        string[] memory encoded = _col(json, ".uintTerms", ".encoded");
        for (uint256 i; i < values.length; ++i) {
            assertEq(SignCell.uintTerm(uint64(vm.parseUint(values[i]))), _bytes(encoded[i]), values[i]);
        }
        assertEq(
            SignCell.bytesTerm(hex"00ff10"), _bytes(vm.parseJsonString(json, ".bytesTerms[0].encoded"))
        );
    }

    function test_longTextHeadsMatchJs() public view {
        string memory json = _read(JS_DIR, "cell-address.json");
        string[] memory objects = _col(json, ".cells", ".encoded.object");
        assertEq(SignCell.textTerm(_repeat("c", 300)), _bytes(objects[4])); // 0x79 0x01 0x2c head
        string[] memory predicates = _col(json, ".cells", ".encoded.predicate");
        assertEq(SignCell.textTerm(_repeat("b", 24)), _bytes(predicates[4])); // 0x78 0x18 head
    }

    function test_nonTextTermsRideThePreEncodedPath() public view {
        string memory json = _read(JS_DIR, "cell-address.json");
        bytes memory s = _bytes(vm.parseJsonString(json, ".mixed[0].subject"));
        bytes memory p = _bytes(vm.parseJsonString(json, ".mixed[0].predicate"));
        bytes memory o = _bytes(vm.parseJsonString(json, ".mixed[0].object"));
        assertEq(SignCell.cellId(s, p, o), _bytes32(vm.parseJsonString(json, ".mixed[0].cellId")));
        // and that the object really was the integer 7 (CBOR 0x07)
        assertEq(o, hex"07");
        assertEq(SignCell.uintTerm(7), o);
    }

    function test_cellIsOrdered_converseIsADifferentCell() public pure {
        bytes memory a = SignCell.textTerm("alice");
        bytes memory p = SignCell.textTerm("trusts");
        bytes memory b = SignCell.textTerm("bob");
        assertTrue(SignCell.cellId(a, p, b) != SignCell.cellId(b, p, a));
        assertEq(SignCell.converseId(a, p, b), SignCell.cellId(b, p, a));
        assertEq(SignCell.utteranceCellId(a, p), SignCell.cellId(a, p, a));
    }

    function test_identityIsIndependentOfChain() public {
        bytes memory s = SignCell.textTerm("x");
        bytes memory p = SignCell.textTerm("y");
        bytes memory o = SignCell.textTerm("z");
        bytes32 here = SignCell.cellId(s, p, o);
        vm.chainId(8453);
        assertEq(SignCell.cellId(s, p, o), here);
        vm.chainId(42161);
        assertEq(SignCell.cellId(s, p, o), here);
    }

    // ───────── tellings ─────────

    function test_tellingRowIdMatchesSignChainRows() public view {
        string[] memory dirs = _sourcesFor("telling.json");
        string memory json = _read(dirs[0], "telling.json");
        string[] memory ss = _col(json, ".rows", ".encoded.subject");
        string[] memory ps = _col(json, ".rows", ".encoded.predicate");
        string[] memory os = _col(json, ".rows", ".encoded.object");
        string[] memory ws = _col(json, ".rows", ".encoded.witness");
        string[] memory sides = _col(json, ".rows", ".side");
        string[] memory rowIds = _col(json, ".rows", ".rowId");
        string[] memory cells = _col(json, ".rows", ".cellId");
        string[] memory witnessIds = _col(json, ".rows", ".witnessId");
        string[] memory tellingIds = _col(json, ".rows", ".tellingId");
        assertEq(rowIds.length, 4);
        for (uint256 i; i < rowIds.length; ++i) {
            SignCell.Side side = keccak256(bytes(sides[i])) == keccak256("for")
                ? SignCell.Side.For
                : SignCell.Side.Against;
            assertEq(
                SignCell.tellingRowId(_bytes(ss[i]), _bytes(ps[i]), _bytes(os[i]), side, _bytes(ws[i])),
                _bytes32(rowIds[i]),
                "SignChain telling row"
            );
            bytes32 cell = SignCell.cellId(_bytes(ss[i]), _bytes(ps[i]), _bytes(os[i]));
            assertEq(cell, _bytes32(cells[i]));
            bytes32 w = SignCell.witnessId(_bytes(ws[i]));
            assertEq(w, _bytes32(witnessIds[i]));
            assertEq(SignCell.tellingId(cell, side, w), _bytes32(tellingIds[i]), "chain-native telling id");
        }
    }

    function test_tellingIdSeparatesSidesAndWitnesses() public pure {
        bytes32 c = bytes32(uint256(1));
        bytes32 w = bytes32(uint256(2));
        assertTrue(SignCell.tellingId(c, SignCell.Side.For, w) != SignCell.tellingId(c, SignCell.Side.Against, w));
        assertTrue(
            SignCell.tellingId(c, SignCell.Side.For, w) != SignCell.tellingId(c, SignCell.Side.For, bytes32(uint256(3)))
        );
    }

    // ───────── witnesses ─────────

    function test_accountWitnessesMatchJs() public view {
        string memory json = _read(JS_DIR, "account-witness.json");
        string[] memory addrs = _col(json, ".chainAgnostic", ".address");
        string[] memory enc = _col(json, ".chainAgnostic", ".encoded");
        string[] memory ids = _col(json, ".chainAgnostic", ".witnessId");
        for (uint256 i; i < addrs.length; ++i) {
            address a = vm.parseAddress(addrs[i]);
            assertEq(SignCell.accountWitness(a), _bytes(enc[i]));
            assertEq(SignCell.witnessId(SignCell.accountWitness(a)), _bytes32(ids[i]));
        }
        uint256[] memory chains = _colUint(json, ".chainScoped", ".chainId");
        string[] memory saddrs = _col(json, ".chainScoped", ".address");
        string[] memory senc = _col(json, ".chainScoped", ".encoded");
        assertEq(chains.length, 5);
        for (uint256 i; i < chains.length; ++i) {
            assertEq(SignCell.scopedAccountWitness(chains[i], vm.parseAddress(saddrs[i])), _bytes(senc[i]));
        }
    }

    // ───────── charge ─────────

    function test_chargeOfCountsAndTopMass() public pure {
        assertEq(uint8(SignCell.chargeOfCounts(0, 0)), 0);
        assertEq(uint8(SignCell.chargeOfCounts(5, 0)), 1);
        assertEq(uint8(SignCell.chargeOfCounts(0, 2)), 2);
        assertEq(uint8(SignCell.chargeOfCounts(1, 1)), 3);
        assertEq(SignCell.topMass(5, 2), 2);
        assertEq(SignCell.topMass(0, 9), 0);
    }

    // ───────── CBOR: single-item well-formedness ─────────

    function test_everyJsEncodedItemIsASingleItem() public view {
        string memory json = _read(JS_DIR, "cbor.json");
        string[] memory good = vm.parseJsonStringArray(json, ".wellFormed");
        for (uint256 i; i < good.length; ++i) {
            assertTrue(Cbor.isSingleItem(_bytes(good[i])), good[i]);
        }
    }

    function test_damagedOrDoubledItemsAreRejected() public view {
        string memory json = _read(JS_DIR, "cbor.json");
        string[] memory bad = vm.parseJsonStringArray(json, ".malformed");
        for (uint256 i; i < bad.length; ++i) {
            assertFalse(Cbor.isSingleItem(_bytes(bad[i])), bad[i]);
        }
    }

    function test_concatenationAttackIsBlocked() public pure {
        // two items glued together are not a term: a subject cannot smuggle in a predicate
        bytes memory glued = abi.encodePacked(SignCell.textTerm("a"), SignCell.textTerm("b"));
        assertFalse(Cbor.isSingleItem(glued));
        assertTrue(Cbor.isSingleItem(Cbor.arrayHead(2)) == false); // an array head alone is truncated
        assertTrue(Cbor.isSingleItem(abi.encodePacked(Cbor.arrayHead(2), glued)));
    }

    function test_requireTermsReverts() public {
        vm.expectRevert(abi.encodeWithSelector(SignCell.TermNotSingleItem.selector, hex"61"));
        this.requireTermsExternal(hex"61", hex"6161", hex"6161");
    }

    function requireTermsExternal(bytes memory s, bytes memory p, bytes memory o) external pure {
        SignCell.requireTerms(s, p, o);
    }

    function _repeat(string memory ch, uint256 n) internal pure returns (string memory) {
        bytes memory out = new bytes(n);
        for (uint256 i; i < n; ++i) out[i] = bytes(ch)[0];
        return string(out);
    }
}
