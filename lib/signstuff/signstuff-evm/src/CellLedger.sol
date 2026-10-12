// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Cbor } from "./Cbor.sol";
import { Four } from "./Four.sol";
import { SignCell } from "./SignCell.sol";
import { Settlement } from "./Settlement.sol";
import { IMembrane } from "./interfaces/IMembrane.sol";

/// @title CellLedger
/// @notice An append-only SignCell telling ledger: tellings go in, the knowledge join is folded, the
///         FOUR value of every cell is readable, and a contradiction is a held, counted, designated
///         state, never a revert, never an overwrite.
/// @dev SignChain's `TellingLog` + `KnowledgeBase` section, as EVM state:
///        - a telling = (cell, side, witness). Telling again is idempotent (G-Set per side).
///        - a cell's value is the presence of its two sides (it is always Measured here: the ledger
///          folds by knowledge join only; meets and presumptions are readings, not writes).
///        - the only things that can stop a telling are the membrane (who may tell this predicate)
///          and malformed terms. Disagreement never stops anything.
///        - the cell id is SignCell's content address of the triple, identical on every chain and
///          in JS. Tellers cannot move it; evidence arriving cannot move it.
///        - events are content-addressed (`telling` = pure function of cell, side, witness) and the
///          ledger keeps a hash-chain `head` over arrival order, so a replica on another chain or
///          off-chain can be verified event by event.
///      What the ledger deliberately does not do: settle rules (SignChain `fire`), or interpret what
///      a held contradiction means. Resolution is a policy reading above (a pool's governance cell),
///      never a deletion here.
contract CellLedger {
    using Four for Four.Point;

    enum WitnessScope {
        ChainAgnostic, // witness "evm:0x..." - one account is one witness on every chain
        ChainScoped // witness "eip155:<id>:0x..." - authority that exists on one chain only
    }

    struct Terms {
        bytes subject; // each a single canonical-CBOR item (SignCell.textTerm, bytesTerm, ...)
        bytes predicate;
        bytes object;
    }

    struct Cell {
        bytes32 predicate; // sha256 of the predicate term; non-zero iff the cell is open
        bytes32 forHead; // hash chain over the for-witnesses in arrival order
        bytes32 againstHead;
        uint32 forCount; // distinct witnesses per side
        uint32 againstCount;
        uint64 openedSeq;
        uint64 lastSeq;
    }

    IMembrane public immutable membrane;
    WitnessScope public immutable witnessScope;

    mapping(bytes32 cell => Cell) private _cells;
    // bit 0: this witness told the cell for; bit 1: against
    mapping(bytes32 cell => mapping(bytes32 witness => uint8)) private _told;

    /// Number of fresh tellings so far; the next telling is `seq + 1`.
    uint64 public seq;
    /// Hash chain over every fresh telling: sha256(head, telling).
    bytes32 public head;
    /// How many cells sit at None, True, False, Both. `_census[3]` is the number of held contradictions.
    uint256[4] private _census;
    /// Total knowledge height over all cells (SignChain WIT ledger): only ever grows.
    uint256 public wits;

    error NotAdmitted(address teller, bytes32 predicate, SignCell.Side side, bool relayed);
    error CellNotOpen(bytes32 cell);
    error WitnessNotSingleItem();

    event CellOpened(
        bytes32 indexed cell,
        bytes32 indexed predicate,
        bytes subject,
        bytes predicateTerm,
        bytes object
    );

    event Told(
        bytes32 indexed cell,
        bytes32 indexed telling,
        bytes32 indexed witness,
        SignCell.Side side,
        address teller,
        bool relayed,
        Four.Point before,
        Four.Point current,
        uint64 seq,
        bytes32 head,
        bytes witnessCbor
    );

    /// A cell has just become told-both. A first-class state: it stays, and is counted.
    event Held(bytes32 indexed cell, uint32 forCount, uint32 againstCount, uint64 seq);

    constructor(IMembrane membrane_, WitnessScope scope_) {
        membrane = membrane_;
        witnessScope = scope_;
    }

    // ───────────────────────── tell ─────────────────────────

    /// @notice Tell a cell for/against, witnessed by msg.sender's own account. Opens the cell if new.
    function tell(Terms calldata t, SignCell.Side side)
        external
        returns (bytes32 cell, bytes32 telling, bool fresh)
    {
        bytes memory w = _selfWitness();
        bytes32 predicate = sha256(t.predicate);
        _admit(predicate, side, false);
        cell = _open(t, predicate);
        (telling, fresh) = _record(cell, side, sha256(w), w, false);
    }

    /// @notice Tell a cell that is already open (cheaper: no terms).
    function tellKnown(bytes32 cell, SignCell.Side side)
        external
        returns (bytes32 telling, bool fresh)
    {
        bytes memory w = _selfWitness();
        _admit(_openPredicate(cell), side, false);
        (telling, fresh) = _record(cell, side, sha256(w), w, false);
    }

    /// @notice Vouch for a foreign witness (a Hive account, another chain's ledger, an attestation).
    ///         Requires the membrane's relay grant. The event names the relayer; the witness is the
    ///         foreign party's, so two relayers carrying the same foreign telling collapse to one.
    function tellRelayed(Terms calldata t, SignCell.Side side, bytes calldata witnessCbor)
        external
        returns (bytes32 cell, bytes32 telling, bool fresh)
    {
        bytes memory w = witnessCbor;
        if (!Cbor.isSingleItem(w)) revert WitnessNotSingleItem();
        bytes32 predicate = sha256(t.predicate);
        _admit(predicate, side, true);
        cell = _open(t, predicate);
        (telling, fresh) = _record(cell, side, sha256(w), w, true);
    }

    function tellKnownRelayed(bytes32 cell, SignCell.Side side, bytes calldata witnessCbor)
        external
        returns (bytes32 telling, bool fresh)
    {
        bytes memory w = witnessCbor;
        if (!Cbor.isSingleItem(w)) revert WitnessNotSingleItem();
        _admit(_openPredicate(cell), side, true);
        (telling, fresh) = _record(cell, side, sha256(w), w, true);
    }

    // ───────────────────────── reads ─────────────────────────

    function isOpen(bytes32 cell) public view returns (bool) {
        return _cells[cell].predicate != bytes32(0);
    }

    /// @notice The FOUR value of a cell. An unopened cell reads None (told nothing).
    function valueOf(bytes32 cell) public view returns (Four.Point) {
        Cell storage c = _cells[cell];
        return SignCell.chargeOfCounts(c.forCount, c.againstCount);
    }

    function isHeld(bytes32 cell) external view returns (bool) {
        return valueOf(cell) == Four.Point.Both;
    }

    /// @notice A cell's evidence summary: distinct witnesses each way and the arrival-order chains.
    function evidenceOf(bytes32 cell)
        external
        view
        returns (uint32 forCount, uint32 againstCount, bytes32 forHead, bytes32 againstHead)
    {
        Cell storage c = _cells[cell];
        return (c.forCount, c.againstCount, c.forHead, c.againstHead);
    }

    /// @notice Which sides a witness has told on a cell.
    function toldBy(bytes32 cell, bytes32 witness) external view returns (bool forTold, bool againstTold) {
        uint8 m = _told[cell][witness];
        return (m & 1 != 0, m & 2 != 0);
    }

    function predicateOf(bytes32 cell) external view returns (bytes32) {
        return _cells[cell].predicate;
    }

    /// @notice Obsmetrologia Record.topMass: tellings held both ways at once.
    function topMassOf(bytes32 cell) external view returns (uint256) {
        Cell storage c = _cells[cell];
        return SignCell.topMass(c.forCount, c.againstCount);
    }

    function census() external view returns (uint256[4] memory) {
        return _census;
    }

    /// @notice Number of held contradictions (cells at Both). Told-both is absorbing, so this never falls.
    function heldCount() external view returns (uint256) {
        return _census[uint8(Four.Point.Both)];
    }

    /// @notice The values of a list of cells, in order.
    function read(bytes32[] calldata cells) external view returns (Four.Point[] memory values) {
        values = new Four.Point[](cells.length);
        for (uint256 i; i < cells.length; ++i) values[i] = valueOf(cells[i]);
    }

    /// @notice A settled section over canonical (strictly ascending) cells, and its digest.
    function section(bytes32[] calldata cells)
        external
        view
        returns (Four.Point[] memory values, bytes32 digest, uint256[4] memory counts)
    {
        values = new Four.Point[](cells.length);
        for (uint256 i; i < cells.length; ++i) values[i] = valueOf(cells[i]);
        digest = Settlement.sectionDigest(cells, values);
        counts = Settlement.census(values);
    }

    /// @notice The witness id msg.sender's own tellings carry here.
    function selfWitnessId(address account) external view returns (bytes32) {
        return sha256(_witnessOf(account));
    }

    // ───────────────────────── internals ─────────────────────────

    function _witnessOf(address account) private view returns (bytes memory) {
        return witnessScope == WitnessScope.ChainAgnostic
            ? SignCell.accountWitness(account)
            : SignCell.scopedAccountWitness(block.chainid, account);
    }

    function _selfWitness() private view returns (bytes memory) {
        return _witnessOf(msg.sender);
    }

    function _admit(bytes32 predicate, SignCell.Side side, bool relayed) private view {
        if (!membrane.admits(msg.sender, predicate, uint8(side), relayed)) {
            revert NotAdmitted(msg.sender, predicate, side, relayed);
        }
    }

    function _openPredicate(bytes32 cell) private view returns (bytes32 predicate) {
        predicate = _cells[cell].predicate;
        if (predicate == bytes32(0)) revert CellNotOpen(cell);
    }

    function _open(Terms calldata t, bytes32 predicate) private returns (bytes32 cell) {
        SignCell.requireTerms(t.subject, t.predicate, t.object);
        cell = SignCell.cellIdCalldata(t.subject, t.predicate, t.object);
        Cell storage c = _cells[cell];
        if (c.predicate == bytes32(0)) {
            c.predicate = predicate;
            c.openedSeq = seq;
            _census[uint8(Four.Point.None)] += 1;
            emit CellOpened(cell, predicate, t.subject, t.predicate, t.object);
        }
    }

    function _record(
        bytes32 cell,
        SignCell.Side side,
        bytes32 witness,
        bytes memory witnessCbor,
        bool relayed
    ) private returns (bytes32 telling, bool fresh) {
        Cell storage c = _cells[cell];
        uint8 bit = side == SignCell.Side.For ? 1 : 2;
        uint8 mask = _told[cell][witness];
        telling = SignCell.tellingId(cell, side, witness);
        if (mask & bit != 0) return (telling, false); // idempotent: a G-Set absorbs a repeat
        _told[cell][witness] = mask | bit;

        Four.Point before = SignCell.chargeOfCounts(c.forCount, c.againstCount);
        if (side == SignCell.Side.For) {
            c.forCount += 1;
            c.forHead = sha256(abi.encodePacked(c.forHead, witness));
        } else {
            c.againstCount += 1;
            c.againstHead = sha256(abi.encodePacked(c.againstHead, witness));
        }
        Four.Point current = SignCell.chargeOfCounts(c.forCount, c.againstCount);

        uint64 n = ++seq;
        c.lastSeq = n;
        head = sha256(abi.encodePacked(head, telling));
        if (current != before) {
            _census[uint8(before)] -= 1;
            _census[uint8(current)] += 1;
            wits += 1; // the knowledge height of exactly this cell rose by one
        }

        emit Told(cell, telling, witness, side, msg.sender, relayed, before, current, n, head, witnessCbor);
        if (current == Four.Point.Both && before != Four.Point.Both) {
            emit Held(cell, c.forCount, c.againstCount, n);
        }
        return (telling, true);
    }
}
