// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title Four
/// @notice FOUR, Belnap's four-valued bilattice, carried by the EVM as its two evidence bits.
/// @dev A point is the pair (positive, negative) of "has anything been told for / against".
///      The enum value IS the bit pattern: bit 0 = told for, bit 1 = told against. That is the
///      same index the JS `four` module uses (`names[(for ? 1 : 0) + (against ? 2 : 0)]`), so a
///      point crosses the JS/Lean/EVM boundary as the integer 0..3.
///
///      | value | told-family | truth-family | knowledge-family (Lean Corner) | extremal   |
///      |-------|-------------|--------------|--------------------------------|------------|
///      | 0     | told none   | neither      | absurd   (kBot)                | unknown    |
///      | 1     | told true   | true         | potential (tTop)               | held       |
///      | 2     | told false  | false        | active    (tBot)               | denied     |
///      | 3     | told both   | both         | stable    (kTop)               | contested  |
///
///      Every operation is computed from the two bits, never tabulated, exactly as in
///      `computer-data-engineering-services-section/four`. Two orders: knowledge (how much has
///      been told; Both is the top) and truth (which way it leans; True is the top, False the
///      bottom). The twist product supplies the linear connectives (tensor/par) per FourMix.
library Four {
    /// @dev Declaration order is load-bearing: it is the bit pattern (for = 1, against = 2).
    enum Point {
        None, // (0,0) told nothing; knowledge bottom
        True, // (1,0) told for only; truth top
        False, // (0,1) told against only; truth bottom
        Both // (1,1) told both: a held contradiction; knowledge top
    }

    // — construction and projection —

    function fromBits(bool pos, bool neg) internal pure returns (Point) {
        return Point((pos ? 1 : 0) | (neg ? 2 : 0));
    }

    function positive(Point p) internal pure returns (bool) {
        return uint8(p) & 1 != 0;
    }

    function negative(Point p) internal pure returns (bool) {
        return uint8(p) & 2 != 0;
    }

    /// @notice Whether a point is consistent: not told both ways.
    function isConsistent(Point p) internal pure returns (bool) {
        return p != Point.Both;
    }

    /// @notice Whether a point is designated: told for (a held contradiction stays designated).
    function isDesignated(Point p) internal pure returns (bool) {
        return positive(p);
    }

    // — the poles —

    function knowledgeBottom() internal pure returns (Point) {
        return Point.None;
    }

    function knowledgeTop() internal pure returns (Point) {
        return Point.Both;
    }

    function truthTop() internal pure returns (Point) {
        return Point.True;
    }

    function truthBottom() internal pure returns (Point) {
        return Point.False;
    }

    // — knowledge order: more told is higher —

    function joinK(Point a, Point b) internal pure returns (Point) {
        return Point(uint8(a) | uint8(b));
    }

    function meetK(Point a, Point b) internal pure returns (Point) {
        return Point(uint8(a) & uint8(b));
    }

    function leqK(Point a, Point b) internal pure returns (bool) {
        return uint8(a) & ~uint8(b) == 0;
    }

    // — truth order: told-for rises, told-against falls —

    function joinT(Point a, Point b) internal pure returns (Point) {
        return Point((uint8(a) | uint8(b)) & 1 | (uint8(a) & uint8(b)) & 2);
    }

    function meetT(Point a, Point b) internal pure returns (Point) {
        return Point((uint8(a) & uint8(b)) & 1 | (uint8(a) | uint8(b)) & 2);
    }

    function leqT(Point a, Point b) internal pure returns (bool) {
        return (!positive(a) || positive(b)) && (!negative(b) || negative(a));
    }

    // — the Klein four-group of symmetries —

    /// @notice Negation swaps told-for and told-against. Monotone in knowledge, antitone in truth.
    function negate(Point p) internal pure returns (Point) {
        return fromBits(negative(p), positive(p));
    }

    /// @notice Conflation exchanges None and Both, fixing True and False. It moves the value only
    ///         (never witnesses): monotone in truth, antitone in knowledge.
    function conflate(Point p) internal pure returns (Point) {
        return fromBits(!negative(p), !positive(p));
    }

    // — Heyting implications of the two orders —

    /// @notice Knowledge-order implication: for when left is not for or right is; likewise against.
    function impK(Point a, Point b) internal pure returns (Point) {
        return fromBits(!positive(a) || positive(b), !negative(a) || negative(b));
    }

    /// @notice Truth-order implication (against runs backwards).
    function impT(Point a, Point b) internal pure returns (Point) {
        return fromBits(!positive(a) || positive(b), !negative(a) && negative(b));
    }

    // — linear (MIX) connectives: the twist product of Two —

    /// @notice The multiplicative unit: told both.
    function unit() internal pure returns (Point) {
        return Point.Both;
    }

    /// @notice Fusion / tensor: (x ∧ z, (x → v) ∧ (z → y)) for a = (x,y), b = (z,v). FourMix.tensor.
    function tensor(Point a, Point b) internal pure returns (Point) {
        return fromBits(
            positive(a) && positive(b),
            (!positive(a) || negative(b)) && (!positive(b) || negative(a))
        );
    }

    /// @notice Residuum (linear implication), the truth-order right adjoint of tensor.
    function residuum(Point a, Point b) internal pure returns (Point) {
        return fromBits(
            (!positive(a) || positive(b)) && (!negative(b) || negative(a)), positive(a) && negative(b)
        );
    }

    /// @notice Linear negation: the residuum into the unit. Equals `negate`.
    function linearNegate(Point p) internal pure returns (Point) {
        return residuum(p, unit());
    }

    /// @notice Par, the De Morgan dual of tensor: ∼(∼a ⊗ ∼b). FourMix.par.
    function par(Point a, Point b) internal pure returns (Point) {
        return negate(tensor(negate(a), negate(b)));
    }

    /// @notice Coordination premium: tensor and par disagree, so a local decision needs consensus.
    function requiresConsensus(Point a, Point b) internal pure returns (bool) {
        return tensor(a, b) != par(a, b);
    }

    // — heights and the WIT ledger (Obsmetrologia FreeEnergyLyapunov) —

    /// @notice How many sides are told: 0, 1 or 2. Knowledge height.
    function knowledgeHeight(Point p) internal pure returns (uint8) {
        return (uint8(p) & 1) + (uint8(p) >> 1);
    }

    /// @notice Rank in the truth order: False 0, None/Both 1, True 2.
    function truthHeight(Point p) internal pure returns (uint8) {
        return (positive(p) ? 1 : 0) + (negative(p) ? 0 : 1);
    }

    /// @notice A cell's move along the knowledge order.
    enum Flux {
        None,
        Commit, // none -> one side
        Mint, // one side -> both
        Jump // none -> both (worth two wits)
    }

    error NotKnowledgeAscent(Point prior, Point next);

    function flux(Point prior, Point next) internal pure returns (Flux) {
        if (!leqK(prior, next)) revert NotKnowledgeAscent(prior, next);
        uint8 from = knowledgeHeight(prior);
        uint8 to = knowledgeHeight(next);
        if (from == to) return Flux.None;
        if (from == 0) return to == 2 ? Flux.Jump : Flux.Commit;
        return Flux.Mint;
    }

    // — folds over a list (empty: the identity of the order) —

    function joinKAll(Point[] memory ps) internal pure returns (Point acc) {
        acc = Point.None;
        for (uint256 i; i < ps.length; ++i) acc = joinK(acc, ps[i]);
    }

    function meetKAll(Point[] memory ps) internal pure returns (Point acc) {
        acc = Point.Both;
        for (uint256 i; i < ps.length; ++i) acc = meetK(acc, ps[i]);
    }

    function joinTAll(Point[] memory ps) internal pure returns (Point acc) {
        acc = Point.False;
        for (uint256 i; i < ps.length; ++i) acc = joinT(acc, ps[i]);
    }

    function meetTAll(Point[] memory ps) internal pure returns (Point acc) {
        acc = Point.True;
        for (uint256 i; i < ps.length; ++i) acc = meetT(acc, ps[i]);
    }
}
