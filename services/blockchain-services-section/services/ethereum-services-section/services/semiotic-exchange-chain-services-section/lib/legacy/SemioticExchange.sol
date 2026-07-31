// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @notice The arena in which sovereign function-nodes seat themselves, take
/// demand, and settle it. This contract is the exchange chain's only durable
/// home: a node holds no local state, an actuator holds no durable/root key,
/// and every readout below is derived from the log this emits
/// rather than stored as a status anywhere off it.
///
/// @dev Identity is role-typed and plural. RMN names the semantic subject;
/// `did:pkh:eip155:<chainId>:<address>` names this contract's durable jural and
/// economic account locus; a standards-suite DID such as pairwise `did:key`
/// names the acting principal in the separately admitted UCAN proof. Here
/// `msg.sender` is only the EVM account locus authorized for this move. It is
/// not the node's semantic/root identity and this contract does not collapse
/// those coordinates.
///
/// A cell is the RMN content address of its own canonical carrier, and this
/// contract computes that address rather than inventing a second one. The
/// carrier is deterministic CBOR (RFC 8949 core: NFC-normalized text, safe
/// integers, map keys ordered by encoded-key length then lexicographically),
/// canonicalized off-chain because neither NFC normalization nor recursive
/// key-sorting has a sane on-chain form. It arrives here as `bytes calldata`
/// and is hashed with SHA-256 -- precompile 0x02, reached through Solidity's
/// builtin -- so the 32 bytes seated here are byte-identical to the digest
/// `semanticId` already emits off-chain. The `ni:///sha-256;<base64url>` string
/// is that same digest in its text encoding, not a second identity.
///
/// This contract does not decode the carrier. It binds `msg.sender` as the
/// account locus of record; a carrier whose embedded locus disagrees with
/// the seating caller is detectable by any reader comparing the two, and the
/// chain's jural/economic binding is authoritative only for EVM execution.
contract SemioticExchange {
    error CellAlreadySeated(bytes32 cell);
    error CellNotSeated(bytes32 cell);
    error NotCellController(bytes32 cell);
    error DemandAlreadyOpen(bytes32 demand);
    error DemandNotOpen(bytes32 demand);
    error DemandNotClaimed(bytes32 demand);
    error DemandAlreadyClaimed(bytes32 demand, bytes32 claimant);
    error DemandAlreadySettled(bytes32 demand);
    error DemandOfferMismatch(bytes32 demand, bytes32 offer);
    error DemandOfferNotFound(bytes32 offer);
    error OfferAlreadyPublished(bytes32 offer);
    error NotDemandRaiser(bytes32 demand);
    error NotClaimant(bytes32 demand, bytes32 claimant);
    error UntypedOffer();
    error UngroundedDemand();
    error UntypedCell();
    error UnsettleableResult();

    /// @dev A seated sovereign function-node. `retired` is kept rather than
    /// deleting the record so that history stays readable from the log alone.
    /// @dev The carrier digest is the mapping key, so it is not repeated here.
    struct Cell {
        address controller;
        bytes32 law;
        bool retired;
    }

    /// @dev `claimant` is the cell that took the demand; zero means unclaimed.
    /// `result` is the settled content digest; zero means unsettled.
    struct Demand {
        address raiser;
        bytes32 grounding;
        bytes32 wantedLaw;
        bytes32 claimant;
        bytes32 result;
    }

    /// @dev An RMN offer from one seated cell for one open demand. The complete
    /// offer (capability limits, consideration, and provider terms) is carried
    /// in the event log; consensus retains only its content address and joins.
    struct Offer {
        bytes32 demand;
        bytes32 cell;
    }

    mapping(bytes32 cellId => Cell cell) public cells;
    mapping(bytes32 demandId => Demand demand) public demands;
    mapping(bytes32 offerId => Offer offer) public offers;

    event CellSeated(
        bytes32 indexed cell, address indexed controller, bytes32 indexed law, bytes carrier
    );
    event CellRetired(bytes32 indexed cell, address indexed controller);
    event DemandRaised(
        bytes32 indexed demand,
        address indexed raiser,
        bytes32 indexed wantedLaw,
        bytes32 grounding,
        bytes carrier
    );
    event DemandOffered(
        bytes32 indexed demand,
        bytes32 indexed offer,
        bytes32 indexed cell,
        address controller,
        bytes carrier
    );
    event PurchaseMoved(
        bytes32 indexed demand,
        bytes32 indexed offer,
        bytes32 indexed cell,
        address raiser,
        address controller
    );
    event DemandSettled(
        bytes32 indexed demand,
        bytes32 indexed cell,
        address indexed controller,
        bytes32 result,
        bytes carrier
    );

    /// @notice The RMN content address of a canonical carrier.
    /// @dev Pure and public so an ephemeral runner can address a carrier cold,
    /// with no local index and no prior call. Equals `semanticId`'s digest.
    function contentAddress(bytes calldata carrier) public pure returns (bytes32) {
        return sha256(carrier);
    }

    /// @notice Seat the caller as a sovereign node offering one capability law.
    /// @param carrier The cell's canonical CBOR carrier. Its content address
    /// becomes the semantic cell coordinate. The caller is recorded separately
    /// as the EVM account locus authorized to operate that seated coordinate.
    /// @param law The content address of the capability law the cell offers,
    /// carried separately because claiming demand matches on it on-chain and
    /// this contract cannot read it out of the carrier.
    function seatCell(bytes calldata carrier, bytes32 law) external returns (bytes32 cell) {
        if (carrier.length == 0 || law == bytes32(0)) revert UntypedCell();
        cell = sha256(carrier);
        if (cells[cell].controller != address(0)) revert CellAlreadySeated(cell);
        cells[cell] = Cell({ controller: msg.sender, law: law, retired: false });
        emit CellSeated(cell, msg.sender, law, carrier);
    }

    /// @notice Withdraw a cell from taking further demand.
    function retireCell(bytes32 cell) external {
        Cell storage seated = _seatedCell(cell);
        if (seated.controller != msg.sender) revert NotCellController(cell);
        seated.retired = true;
        emit CellRetired(cell, msg.sender);
    }

    /// @notice Raise demand for work under a named capability law.
    /// @param carrier The demand's canonical CBOR carrier; its content address
    /// becomes the demand's identity, on the same RMN scheme as a cell's.
    /// @param grounding Content address of the demand's own grounding -- the
    /// paths, records, and prior art the work is to be discharged against.
    /// The bytes live off-chain; only their commitment is seated here.
    function raiseDemand(bytes calldata carrier, bytes32 grounding, bytes32 wantedLaw)
        external
        returns (bytes32 demand)
    {
        if (carrier.length == 0 || grounding == bytes32(0) || wantedLaw == bytes32(0)) {
            revert UngroundedDemand();
        }
        demand = sha256(carrier);
        if (demands[demand].raiser != address(0)) revert DemandAlreadyOpen(demand);
        demands[demand] = Demand({
            raiser: msg.sender,
            grounding: grounding,
            wantedLaw: wantedLaw,
            claimant: bytes32(0),
            result: bytes32(0)
        });
        emit DemandRaised(demand, msg.sender, wantedLaw, grounding, carrier);
    }

    /// @notice Publish one complete RMN offer for an open demand.
    /// @dev Provider-specific limits and consideration stay in the canonical
    /// carrier. Emitting those bytes makes a cold actuator able to reconstruct
    /// the move from the chain log without a local registry or FizzOS world.
    function offerDemand(bytes32 demand, bytes32 cell, bytes calldata carrier)
        external
        returns (bytes32 offer)
    {
        if (carrier.length == 0) revert UntypedOffer();
        Demand storage open = _openDemand(demand);
        if (open.claimant != bytes32(0)) revert DemandAlreadyClaimed(demand, open.claimant);
        Cell storage seated = _seatedCell(cell);
        if (seated.controller != msg.sender) revert NotCellController(cell);
        if (seated.retired || seated.law != open.wantedLaw) revert CellNotSeated(cell);
        offer = sha256(carrier);
        if (offers[offer].cell != bytes32(0)) revert OfferAlreadyPublished(offer);
        offers[offer] = Offer({ demand: demand, cell: cell });
        emit DemandOffered(demand, offer, cell, msg.sender, carrier);
    }

    /// @notice The demand owner purchases one offered provider move.
    function purchaseMove(bytes32 demand, bytes32 offer) external {
        Demand storage open = _openDemand(demand);
        if (open.raiser != msg.sender) revert NotDemandRaiser(demand);
        if (open.claimant != bytes32(0)) revert DemandAlreadyClaimed(demand, open.claimant);
        Offer storage proposed = offers[offer];
        if (proposed.cell == bytes32(0)) revert DemandOfferNotFound(offer);
        if (proposed.demand != demand) revert DemandOfferMismatch(demand, offer);
        Cell storage seated = _seatedCell(proposed.cell);
        if (seated.retired || seated.law != open.wantedLaw) revert CellNotSeated(proposed.cell);
        open.claimant = proposed.cell;
        emit PurchaseMoved(demand, offer, proposed.cell, msg.sender, seated.controller);
    }

    /// @notice Settle a claimed demand with its canonical RMN outcome carrier.
    function settleDemand(bytes32 demand, bytes calldata carrier) external {
        if (carrier.length == 0) revert UnsettleableResult();
        Demand storage open = _openDemand(demand);
        bytes32 claimant = open.claimant;
        if (claimant == bytes32(0)) revert DemandNotClaimed(demand);
        if (cells[claimant].controller != msg.sender) revert NotClaimant(demand, claimant);
        bytes32 result = sha256(carrier);
        open.result = result;
        emit DemandSettled(demand, claimant, msg.sender, result, carrier);
    }

    function _seatedCell(bytes32 cell) private view returns (Cell storage seated) {
        seated = cells[cell];
        if (seated.controller == address(0)) revert CellNotSeated(cell);
    }

    function _openDemand(bytes32 demand) private view returns (Demand storage open) {
        open = demands[demand];
        if (open.raiser == address(0)) revert DemandNotOpen(demand);
        if (open.result != bytes32(0)) revert DemandAlreadySettled(demand);
    }
}
