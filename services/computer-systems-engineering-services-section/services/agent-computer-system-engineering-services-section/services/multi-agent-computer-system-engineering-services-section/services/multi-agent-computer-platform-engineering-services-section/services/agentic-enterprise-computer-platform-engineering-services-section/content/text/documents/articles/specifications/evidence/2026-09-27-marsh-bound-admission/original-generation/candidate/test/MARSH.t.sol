// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { MARSH } from "../src/MARSH.sol";

interface MarshVm {
    function addr(uint256 privateKey) external returns (address);
    function prank(address caller) external;
    function expectRevert(bytes calldata revertData) external;
}

contract MARSHTest {
    MarshVm private constant vm = MarshVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MARSH private marsh;
    address private controller;
    address private other;
    bytes32 private constant KIND = keccak256("561-group.operation");
    bytes32 private constant SUBJECT = keccak256("publish-package");
    bytes32 private constant CONTENT_1 =
        0x84612e3f4a7a826b4b9cd887a5f9d9e27b2aa1568ec7085157bea6bf48aa842a;
    bytes32 private constant CONTENT_2 =
        0xe6619746f91787f48a9dab227c3bcc176860cd2af436bc1b58883e4d5079e2d7;
    bytes32 private constant EVIDENCE_1 =
        0x35b9079d9c727e19d3bab63b94b5136246a0155df911d25023cd726a23407900;
    bytes32 private constant EVIDENCE_2 =
        0x768a853dab5eca84fea0a45f63ab2c6528d04c28ec99511aa06d6363e967b7e7;

    function setUp() public {
        marsh = new MARSH();
        controller = vm.addr(0xA11CE);
        other = vm.addr(0xB0B);
    }

    function testAdmissionProducesTypedChainStateAndDeterministicIdentity() public {
        bytes32 resource = marsh.resourceId(controller, KIND, SUBJECT);
        vm.prank(controller);
        marsh.admitBoundResource(KIND, SUBJECT, CONTENT_1, EVIDENCE_1);

        (
            address owner,
            bytes32 kind,
            bytes32 content,
            bytes32 evidence,
            uint64 sequence,
            bool exists
        ) = marsh.resources(resource);
        require(owner == controller, "resource controller drift");
        require(
            kind == KIND && content == CONTENT_1 && evidence == EVIDENCE_1, "resource state drift"
        );
        require(sequence == 1 && exists, "resource admission missing");
        require(resource == marsh.resourceId(controller, KIND, SUBJECT), "resource identity drift");
    }

    function testOnlyControllerCanAdvanceTheCurrentHead() public {
        bytes32 resource = marsh.resourceId(controller, KIND, SUBJECT);
        vm.prank(controller);
        marsh.admitBoundResource(KIND, SUBJECT, CONTENT_1, EVIDENCE_1);

        vm.expectRevert(
            abi.encodeWithSelector(MARSH.ResourceControllerRequired.selector, resource, other)
        );
        vm.prank(other);
        marsh.transitionResource(resource, CONTENT_1, CONTENT_2, EVIDENCE_2);

        vm.prank(controller);
        marsh.transitionResource(resource, CONTENT_1, CONTENT_2, EVIDENCE_2);
        (,, bytes32 content, bytes32 evidence, uint64 sequence,) = marsh.resources(resource);
        require(
            content == CONTENT_2 && evidence == EVIDENCE_2 && sequence == 2,
            "resource transition missing"
        );
    }

    function testStaleTransitionIsRefusedRatherThanOverwritingState() public {
        bytes32 resource = marsh.resourceId(controller, KIND, SUBJECT);
        vm.prank(controller);
        marsh.admitBoundResource(KIND, SUBJECT, CONTENT_1, EVIDENCE_1);

        vm.expectRevert(
            abi.encodeWithSelector(
                MARSH.PriorContentMismatch.selector, resource, CONTENT_1, bytes32(0)
            )
        );
        vm.prank(controller);
        marsh.transitionResource(resource, bytes32(0), CONTENT_2, EVIDENCE_2);
    }
}
