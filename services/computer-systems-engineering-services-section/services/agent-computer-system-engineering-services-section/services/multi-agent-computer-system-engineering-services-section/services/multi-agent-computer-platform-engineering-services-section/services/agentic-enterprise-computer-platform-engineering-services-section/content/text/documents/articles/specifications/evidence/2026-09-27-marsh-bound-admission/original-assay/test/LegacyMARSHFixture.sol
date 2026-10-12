// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @dev Private behavioral fixture of the captured legacy first-admission ABI.
/// It demonstrates that raw-key historical reads remain distinguishable; it
/// is not deployment evidence and is not a migration implementation.
contract LegacyMARSHFixture {
    struct Resource {
        address controller;
        bytes32 kind;
        bytes32 content;
        bytes32 evidence;
        uint64 sequence;
        bool exists;
    }
    mapping(bytes32 => Resource) public resources;

    event ResourceAdmitted(
        bytes32 indexed resource,
        address indexed controller,
        bytes32 indexed kind,
        bytes32 content,
        bytes32 evidence,
        uint64 sequence
    );

    function resourceId(address controller, bytes32 kind, bytes32 subject)
        public view returns (bytes32)
    {
        return keccak256(abi.encode("MARSH", block.chainid, address(this), controller, kind, subject));
    }

    function admitResource(bytes32 resource, bytes32 kind, bytes32 content, bytes32 evidence)
        external
    {
        require(resource != bytes32(0) && kind != bytes32(0) && content != bytes32(0) && evidence != bytes32(0));
        require(!resources[resource].exists);
        resources[resource] = Resource(msg.sender, kind, content, evidence, 1, true);
        emit ResourceAdmitted(resource, msg.sender, kind, content, evidence, 1);
    }
}
