// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { MARSH } from "../src/MARSH.sol";
import { LegacyMARSHFixture } from "../test/LegacyMARSHFixture.sol";

contract LocalMulticall3Fixture {
    struct Call3 { address target; bool allowFailure; bytes callData; }
    struct Result { bool success; bytes returnData; }
    function aggregate3(Call3[] calldata calls) external payable returns (Result[] memory results) {
        results = new Result[](calls.length);
        for (uint256 i; i < calls.length; ++i) {
            (bool success, bytes memory returnData) = calls[i].target.staticcall(calls[i].callData);
            require(success || calls[i].allowFailure, "subcall failed");
            results[i] = Result(success, returnData);
        }
    }
}

contract ReaderFixture {
    LocalMulticall3Fixture public multicall;
    MARSH public candidate;
    LegacyMARSHFixture public legacy;
    bytes32 public candidateResource;
    bytes32 public legacyResource;
    bytes32 public absentResource;

    constructor() {
        multicall = LocalMulticall3Fixture(0xcA11bde05977b3631167028862bE2a173976CA11);
        candidate = new MARSH();
        legacy = new LegacyMARSHFixture();
        bytes32 kind = keccak256("ReaderFixture.Kind");
        bytes32 subject = keccak256("ReaderFixture.Subject");
        bytes32 content = keccak256("ReaderFixture.Content");
        bytes32 evidence = keccak256("ReaderFixture.Evidence");
        candidateResource = candidate.resourceId(address(this), kind, subject);
        (bool admitted,) = address(candidate).call(abi.encodeWithSignature(
            "admitBoundResource(bytes32,bytes32,bytes32,bytes32)", kind, subject, content, evidence
        ));
        if (!admitted) {
            (admitted,) = address(candidate).call(abi.encodeWithSignature(
                "admitResource(bytes32,bytes32,bytes32,bytes32)", candidateResource, kind, content, evidence
            ));
            require(admitted, "candidate seed failed");
        }
        legacyResource = keccak256("ReaderFixture.LegacyRawKey");
        legacy.admitResource(legacyResource, kind, content, evidence);
        absentResource = keccak256("ReaderFixture.AbsentRawKey");
    }
}
