// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { MARSH } from "../src/MARSH.sol";
import { LegacyMARSHFixture } from "./LegacyMARSHFixture.sol";

interface MarshVm {
    struct Log { bytes32[] topics; bytes data; address emitter; }
    function addr(uint256 privateKey) external returns (address);
    function prank(address caller) external;
    function expectRevert(bytes calldata revertData) external;
    function recordLogs() external;
    function getRecordedLogs() external returns (Log[] memory);
    function chainId(uint256 newChainId) external;
}

/// @dev Independent black-box effect assays. Calls use selectors and ABI
/// decoding rather than importing candidate errors or relying on its helpers.
contract MARSHBoundAdmissionAssay {
    MarshVm private constant vm = MarshVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    MARSH private marsh;
    address private controllerA;
    address private controllerB;

    bytes32 private constant KIND = keccak256(bytes("SharedWorkReference@1"));
    bytes32 private constant SUBJECT = 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;
    bytes32 private constant CONTENT_1 = 0x1111111111111111111111111111111111111111111111111111111111111111;
    bytes32 private constant CONTENT_2 = 0x2222222222222222222222222222222222222222222222222222222222222222;
    bytes32 private constant EVIDENCE_1 = 0x3333333333333333333333333333333333333333333333333333333333333333;
    bytes32 private constant EVIDENCE_2 = 0x4444444444444444444444444444444444444444444444444444444444444444;

    bytes32 private constant ADMIT_EVENT = keccak256("ResourceAdmitted(bytes32,address,bytes32,bytes32,bytes32,uint64)");
    bytes32 private constant TRANSITION_EVENT = keccak256("ResourceTransitioned(bytes32,address,bytes32,bytes32,bytes32,bytes32,uint64)");
    bytes4 private constant EMPTY_FIELD = bytes4(keccak256("EmptyResourceField(bytes32)"));
    bytes4 private constant ALREADY_EXISTS = bytes4(keccak256("ResourceAlreadyExists(bytes32)"));
    bytes4 private constant NOT_FOUND = bytes4(keccak256("ResourceNotFound(bytes32)"));
    bytes4 private constant CONTROLLER_REQUIRED = bytes4(keccak256("ResourceControllerRequired(bytes32,address)"));
    bytes4 private constant PRIOR_MISMATCH = bytes4(keccak256("PriorContentMismatch(bytes32,bytes32,bytes32)"));

    function setUp() public {
        marsh = new MARSH();
        controllerA = vm.addr(0xA11CE);
        controllerB = vm.addr(0xB0B);
    }

    function _admit(address caller, bytes32 kind, bytes32 subject, bytes32 content, bytes32 evidence)
        private returns (bool ok, bytes memory result)
    {
        vm.prank(caller);
        return address(marsh).call(abi.encodeWithSignature(
            "admitBoundResource(bytes32,bytes32,bytes32,bytes32)", kind, subject, content, evidence
        ));
    }

    function _raw(bytes32 resource) private view returns (bool ok, bytes memory result) {
        (ok, result) = address(marsh).staticcall(abi.encodeWithSignature("resources(bytes32)", resource));
    }

    function _requireFailure(bytes memory result, bytes4 selector, bytes32 arg) private pure {
        require(result.length == 36, "unexpected revert data length");
        bytes4 actual;
        bytes32 actualArg;
        assembly {
            actual := mload(add(result, 32))
            actualArg := mload(add(result, 36))
        }
        require(actual == selector && actualArg == arg, "unexpected custom error");
    }

    function _derived(address controller, bytes32 kind, bytes32 subject) private view returns (bytes32) {
        return keccak256(abi.encode("MARSH", block.chainid, address(marsh), controller, kind, subject));
    }

    function testAdmissionDerivesExactIdentityWritesTupleAndEmitsOneAdmission() public {
        bytes32 expected = _derived(controllerA, KIND, SUBJECT);
        require(marsh.resourceId(controllerA, KIND, SUBJECT) == expected, "identity encoding differs");
        vm.recordLogs();
        (bool ok, bytes memory result) = _admit(controllerA, KIND, SUBJECT, CONTENT_1, EVIDENCE_1);
        require(ok, "bound admission rejected");
        require(result.length == 0, "admission unexpectedly returned data");

        (bool readable, bytes memory encoded) = _raw(expected);
        require(readable && encoded.length == 192, "six-field getter ABI changed");
        (address owner, bytes32 kind, bytes32 content, bytes32 evidence, uint64 sequence, bool exists) =
            abi.decode(encoded, (address, bytes32, bytes32, bytes32, uint64, bool));
        require(owner == controllerA && kind == KIND && content == CONTENT_1 && evidence == EVIDENCE_1, "stored tuple differs");
        require(sequence == 1 && exists, "first admission sequence/existence differs");

        MarshVm.Log[] memory logs = vm.getRecordedLogs();
        require(logs.length == 1, "admission did not emit exactly one event");
        require(logs[0].emitter == address(marsh) && logs[0].topics.length == 4, "admission event shape differs");
        require(logs[0].topics[0] == ADMIT_EVENT && logs[0].topics[1] == expected, "admission event identity differs");
        require(logs[0].topics[2] == bytes32(uint256(uint160(controllerA))) && logs[0].topics[3] == KIND, "admission indexed fields differ");
        (bytes32 eventContent, bytes32 eventEvidence, uint64 eventSequence) = abi.decode(logs[0].data, (bytes32, bytes32, uint64));
        require(eventContent == CONTENT_1 && eventEvidence == EVIDENCE_1 && eventSequence == 1, "admission event payload differs");
    }

    function _assertCandidateIdentity(MARSH target, address controller, bytes32 kind, bytes32 subject)
        private view returns (bytes32 actual)
    {
        bytes32 standard = keccak256(abi.encode(
            "MARSH", block.chainid, address(target), controller, kind, subject
        ));
        actual = target.resourceId(controller, kind, subject);
        require(actual == standard, "candidate resourceId differs from standard ABI encoding");
    }

    function testIdentityChangesWithEveryNamespaceInput() public {
        bytes32 base = _assertCandidateIdentity(marsh, controllerA, KIND, SUBJECT);
        bytes32 otherController = _assertCandidateIdentity(marsh, controllerB, KIND, SUBJECT);
        bytes32 otherKind = _assertCandidateIdentity(marsh, controllerA, bytes32(uint256(KIND) ^ 1), SUBJECT);
        bytes32 otherSubject = _assertCandidateIdentity(marsh, controllerA, KIND, bytes32(uint256(SUBJECT) ^ 1));
        require(base != otherController, "controller omitted from candidate identity");
        require(base != otherKind, "kind omitted from candidate identity");
        require(base != otherSubject, "subject omitted from candidate identity");

        uint256 chain = block.chainid;
        vm.chainId(chain + 1);
        bytes32 otherChain = _assertCandidateIdentity(marsh, controllerA, KIND, SUBJECT);
        require(base != otherChain, "chain id omitted from candidate identity");
        vm.chainId(chain);

        MARSH second = new MARSH();
        bytes32 secondBase = _assertCandidateIdentity(second, controllerA, KIND, SUBJECT);
        bytes32 secondOtherController = _assertCandidateIdentity(second, controllerB, KIND, SUBJECT);
        bytes32 secondOtherKind = _assertCandidateIdentity(second, controllerA, bytes32(uint256(KIND) ^ 1), SUBJECT);
        bytes32 secondOtherSubject = _assertCandidateIdentity(second, controllerA, KIND, bytes32(uint256(SUBJECT) ^ 1));
        require(secondBase != base, "contract address omitted from candidate identity");
        require(secondBase != secondOtherController, "controller omitted on second candidate");
        require(secondBase != secondOtherKind, "kind omitted on second candidate");
        require(secondBase != secondOtherSubject, "subject omitted on second candidate");
        vm.chainId(chain + 1);
        bytes32 secondOtherChain = _assertCandidateIdentity(second, controllerA, KIND, SUBJECT);
        require(secondBase != secondOtherChain, "chain id omitted on second candidate");
        vm.chainId(chain);
    }

    function testDuplicateRefusesWithoutChangingHead() public {
        bytes32 key = _derived(controllerA, KIND, SUBJECT);
        (bool first,) = _admit(controllerA, KIND, SUBJECT, CONTENT_1, EVIDENCE_1);
        require(first, "initial admission failed");
        (bool second, bytes memory result) = _admit(controllerA, KIND, SUBJECT, CONTENT_2, EVIDENCE_2);
        require(!second, "duplicate admission succeeded");
        _requireFailure(result, ALREADY_EXISTS, key);
        (,,,, uint64 sequence, bool exists) = marsh.resources(key);
        (,, bytes32 content, bytes32 evidence,,) = marsh.resources(key);
        require(exists && sequence == 1 && content == CONTENT_1 && evidence == EVIDENCE_1, "duplicate mutated state");
    }

    function testOtherControllerCannotReserveOrMutateControllersDerivedKey() public {
        bytes32 keyA = _derived(controllerA, KIND, SUBJECT);
        bytes32 keyB = _derived(controllerB, KIND, SUBJECT);
        (bool ok,) = _admit(controllerB, KIND, SUBJECT, CONTENT_1, EVIDENCE_1);
        require(ok, "independent caller namespace admission failed");
        (,,,,, bool existsA) = marsh.resources(keyA);
        (address ownerB,,,,, bool existsB) = marsh.resources(keyB);
        require(!existsA && existsB && ownerB == controllerB, "caller namespace was crossed");

        vm.expectRevert(abi.encodeWithSelector(CONTROLLER_REQUIRED, keyB, controllerA));
        vm.prank(controllerA);
        marsh.transitionResource(keyB, CONTENT_1, CONTENT_2, EVIDENCE_2);
    }

    function testLegacyArbitraryKeySelectorCannotMutateCandidate() public {
        bytes32 arbitrary = 0x9999999999999999999999999999999999999999999999999999999999999999;
        vm.prank(controllerB);
        (bool ok,) = address(marsh).call(abi.encodeWithSignature(
            "admitResource(bytes32,bytes32,bytes32,bytes32)", arbitrary, KIND, CONTENT_1, EVIDENCE_1
        ));
        require(!ok, "legacy arbitrary-key selector still callable");
        (,,,,, bool exists) = marsh.resources(arbitrary);
        require(!exists, "unsupported selector mutated candidate");
    }

    function testZeroInputsAreRejectedWithExactFieldTags() public {
        bytes32[] memory kinds = new bytes32[](4);
        kinds[0] = bytes32(0); kinds[1] = KIND; kinds[2] = KIND; kinds[3] = KIND;
        bytes32[] memory subjects = new bytes32[](4);
        subjects[0] = SUBJECT; subjects[1] = bytes32(0); subjects[2] = SUBJECT; subjects[3] = SUBJECT;
        bytes32[] memory contents = new bytes32[](4);
        contents[0] = CONTENT_1; contents[1] = CONTENT_1; contents[2] = bytes32(0); contents[3] = CONTENT_1;
        bytes32[] memory evidences = new bytes32[](4);
        evidences[0] = EVIDENCE_1; evidences[1] = EVIDENCE_1; evidences[2] = EVIDENCE_1; evidences[3] = bytes32(0);
        bytes32[4] memory fields = [bytes32("kind"), bytes32("subject"), bytes32("content"), bytes32("evidence")];
        for (uint256 i; i < 4; ++i) {
            (bool ok, bytes memory result) =
                _admit(controllerA, kinds[i], subjects[i], contents[i], evidences[i]);
            require(!ok, "zero admission unexpectedly succeeded");
            _requireFailure(result, EMPTY_FIELD, fields[i]);
        }
    }

    function testControllerOnlyCASAndTransitionEventRemainIntact() public {
        bytes32 key = _derived(controllerA, KIND, SUBJECT);
        (bool ok,) = _admit(controllerA, KIND, SUBJECT, CONTENT_1, EVIDENCE_1);
        require(ok, "admission failed");
        vm.expectRevert(abi.encodeWithSelector(CONTROLLER_REQUIRED, key, controllerB));
        vm.prank(controllerB);
        marsh.transitionResource(key, CONTENT_1, CONTENT_2, EVIDENCE_2);
        vm.expectRevert(abi.encodeWithSelector(PRIOR_MISMATCH, key, CONTENT_1, bytes32(0)));
        vm.prank(controllerA);
        marsh.transitionResource(key, bytes32(0), CONTENT_2, EVIDENCE_2);
        (,, bytes32 beforeContent, bytes32 beforeEvidence, uint64 beforeSequence,) = marsh.resources(key);
        require(beforeContent == CONTENT_1 && beforeEvidence == EVIDENCE_1 && beforeSequence == 1, "refused CAS changed state");

        vm.recordLogs();
        vm.prank(controllerA);
        marsh.transitionResource(key, CONTENT_1, CONTENT_2, EVIDENCE_2);
        (,, bytes32 afterContent, bytes32 afterEvidence, uint64 afterSequence,) = marsh.resources(key);
        require(afterContent == CONTENT_2 && afterEvidence == EVIDENCE_2 && afterSequence == 2, "CAS transition effect differs");
        MarshVm.Log[] memory logs = vm.getRecordedLogs();
        require(logs.length == 1 && logs[0].topics[0] == TRANSITION_EVENT, "transition event missing or duplicated");
        require(logs[0].topics[1] == key && logs[0].topics[2] == bytes32(uint256(uint160(controllerA))) && logs[0].topics[3] == KIND, "transition event identity differs");
        (bytes32 prior, bytes32 content, bytes32 evidence, uint64 sequence) = abi.decode(logs[0].data, (bytes32, bytes32, bytes32, uint64));
        require(prior == CONTENT_1 && content == CONTENT_2 && evidence == EVIDENCE_2 && sequence == 2, "transition event payload differs");
    }

    function testMissingResourceTransitionRetainsErrorAndNoMutation() public {
        bytes32 missing = _derived(controllerA, KIND, SUBJECT);
        vm.expectRevert(abi.encodeWithSelector(NOT_FOUND, missing));
        vm.prank(controllerA);
        marsh.transitionResource(missing, CONTENT_1, CONTENT_2, EVIDENCE_2);
    }

    function testLegacyFixtureRawKeyRemainsReadableAndUnbound() public {
        LegacyMARSHFixture legacy = new LegacyMARSHFixture();
        bytes32 arbitrary = bytes32(uint256(0x1234));
        vm.prank(controllerA);
        legacy.admitResource(arbitrary, KIND, CONTENT_1, EVIDENCE_1);
        (address owner, bytes32 kind, bytes32 content, bytes32 evidence, uint64 sequence, bool exists) = legacy.resources(arbitrary);
        require(owner == controllerA && kind == KIND && content == CONTENT_1 && evidence == EVIDENCE_1, "legacy getter tuple differs");
        require(sequence == 1 && exists, "legacy raw key became unreadable");
        require(arbitrary != legacy.resourceId(controllerA, KIND, SUBJECT), "fixture key unexpectedly derived");
    }
}
