// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title MARSH
/// @notice The EVM resource world for the Blockchain Agent Engine.
/// @dev A resource's semantic body and evidence remain content-addressed
///      carriers outside the chain. MARSH stores only the current typed head
///      and records every accepted replacement as an event. Consequently the
///      chain is the authoritative mutable state and witness log without
///      importing a Node, filesystem, or application runtime into the engine.
contract MARSH {
    struct Resource {
        address controller;
        bytes32 kind;
        bytes32 content;
        bytes32 evidence;
        uint64 sequence;
        bool exists;
    }

    mapping(bytes32 resource => Resource) public resources;

    error EmptyResourceField(bytes32 field);
    error ResourceAlreadyExists(bytes32 resource);
    error ResourceNotFound(bytes32 resource);
    error ResourceControllerRequired(bytes32 resource, address caller);
    error PriorContentMismatch(bytes32 resource, bytes32 expected, bytes32 supplied);

    event ResourceAdmitted(
        bytes32 indexed resource,
        address indexed controller,
        bytes32 indexed kind,
        bytes32 content,
        bytes32 evidence,
        uint64 sequence
    );

    event ResourceTransitioned(
        bytes32 indexed resource,
        address indexed controller,
        bytes32 indexed kind,
        bytes32 priorContent,
        bytes32 content,
        bytes32 evidence,
        uint64 sequence
    );

    /// @notice A domain-separated identity for a resource governed by one controller.
    function resourceId(address controller, bytes32 kind, bytes32 subject)
        public
        view
        returns (bytes32)
    {
        return
            keccak256(abi.encode("MARSH", block.chainid, address(this), controller, kind, subject));
    }

    /// @notice Admit the first typed, content-addressed state of a resource.
    function admitResource(bytes32 resource, bytes32 kind, bytes32 content, bytes32 evidence)
        external
    {
        _requireNonzero(resource, "resource");
        _requireNonzero(kind, "kind");
        _requireNonzero(content, "content");
        _requireNonzero(evidence, "evidence");
        if (resources[resource].exists) revert ResourceAlreadyExists(resource);

        resources[resource] = Resource({
            controller: msg.sender,
            kind: kind,
            content: content,
            evidence: evidence,
            sequence: 1,
            exists: true
        });
        emit ResourceAdmitted(resource, msg.sender, kind, content, evidence, 1);
    }

    /// @notice Replace a resource head only from its current content head.
    /// @dev The compare-and-swap precondition gives concurrent writers a
    ///      deterministic refusal instead of silently discarding a transition.
    function transitionResource(
        bytes32 resource,
        bytes32 priorContent,
        bytes32 content,
        bytes32 evidence
    ) external {
        Resource storage current = resources[resource];
        if (!current.exists) revert ResourceNotFound(resource);
        if (current.controller != msg.sender) {
            revert ResourceControllerRequired(resource, msg.sender);
        }
        _requireNonzero(content, "content");
        _requireNonzero(evidence, "evidence");
        if (current.content != priorContent) {
            revert PriorContentMismatch(resource, current.content, priorContent);
        }

        uint64 sequence = current.sequence + 1;
        current.content = content;
        current.evidence = evidence;
        current.sequence = sequence;
        emit ResourceTransitioned(
            resource, msg.sender, current.kind, priorContent, content, evidence, sequence
        );
    }

    function _requireNonzero(bytes32 value, bytes32 field) private pure {
        if (value == bytes32(0)) revert EmptyResourceField(field);
    }
}
