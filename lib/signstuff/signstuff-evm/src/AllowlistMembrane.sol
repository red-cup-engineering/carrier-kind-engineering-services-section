// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { IMembrane } from "./interfaces/IMembrane.sol";

/// @title AllowlistMembrane
/// @notice The simplest membrane: an owner-managed table of (teller, predicate) -> grant bits.
/// @dev `predicate == ANY` is a wildcard over predicates; `teller == address(0)` is a wildcard over
///      tellers ("anyone may tell this predicate", e.g. anyone may contest a receipt). RELAY can never
///      be granted to the wildcard teller: vouching for a foreign witness is always accountable to a
///      named address. The owner should be the pool's governance (a Safe, an office account).
contract AllowlistMembrane is IMembrane, Ownable2Step {
    uint8 public constant FOR = 1;
    uint8 public constant AGAINST = 2;
    uint8 public constant RELAY = 4;
    bytes32 public constant ANY = bytes32(0);

    error RelayNeedsNamedTeller();
    error UnknownGrantBits(uint8 bits);

    event GrantSet(address indexed teller, bytes32 indexed predicate, uint8 bits);

    mapping(address teller => mapping(bytes32 predicate => uint8 bits)) private _grants;

    constructor(address owner_) Ownable(owner_) { }

    function setGrant(address teller, bytes32 predicate, uint8 bits) external onlyOwner {
        if (bits > (FOR | AGAINST | RELAY)) revert UnknownGrantBits(bits);
        if (teller == address(0) && bits & RELAY != 0) revert RelayNeedsNamedTeller();
        _grants[teller][predicate] = bits;
        emit GrantSet(teller, predicate, bits);
    }

    function grantOf(address teller, bytes32 predicate) public view returns (uint8) {
        return _grants[teller][predicate] | _grants[teller][ANY] | _grants[address(0)][predicate]
            | _grants[address(0)][ANY];
    }

    function admits(address teller, bytes32 predicate, uint8 side, bool relayed)
        external
        view
        returns (bool)
    {
        uint8 g = grantOf(teller, predicate);
        uint8 need = side == 0 ? FOR : AGAINST;
        if (g & need == 0) return false;
        // RELAY is only ever held by a named teller, so the wildcard union cannot leak it
        return !relayed || g & RELAY != 0;
    }
}
