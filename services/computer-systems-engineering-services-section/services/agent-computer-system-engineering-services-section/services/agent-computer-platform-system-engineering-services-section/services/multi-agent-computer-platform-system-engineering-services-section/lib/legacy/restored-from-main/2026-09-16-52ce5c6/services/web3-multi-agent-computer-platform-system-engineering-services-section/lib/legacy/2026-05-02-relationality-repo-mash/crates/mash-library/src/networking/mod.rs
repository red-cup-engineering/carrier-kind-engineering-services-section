//! Networking — protocol terms and their conduit fusions.
//!
//! Declares network-protocol terms (`telnet`, `stdio`, `irc`) and
//! the corresponding concrete conduits as fusions `conduit ⊙ protocol`.
//! A subject witnessed diagonally at both `(X, conduit, X) True` and
//! `(X, telnet, X) True` lights up at `(X, telnet-conduit, X) True`
//! via the fusion morphism.
//!
//! # Why fusion rather than composition
//!
//! Fusion (⊙, truth-extending) is classical-AND-like on the
//! True/False core of the bilattice:
//!
//! | a | b | a ⊙ b | (knowledge-meet: a ∧ₖ b) |
//! |---|---|-------|--------------------------|
//! | T | T | T     | T                        |
//! | T | F | F     | None                     |
//! | T | N | N     | None                     |
//! | T | B | T     | T                        |
//!
//! For "X is a telnet-conduit iff X is a conduit AND X speaks telnet,"
//! we want (True, False) → False ("X is not a telnet-conduit") rather
//! than None ("no consensus"). Fusion matches the semantics.
//!
//! # Specialization chain
//!
//! Each concrete conduit also specializes its role and protocol so
//! direct witnesses propagate upward. `telnet-conduit specializes-as
//! conduit` (lifts into the conduit fiber) and `telnet-conduit
//! specializes-as telnet` (lifts into the telnet fiber). A subject
//! announced directly as a telnet-conduit is recognized as both a
//! conduit and a telnet-speaker by the cascade.

#![warn(missing_docs)]

pub mod telnet;

use async_trait::async_trait;
use mash_engine::sdk::agent::Agent;
use mash_engine::sdk::client::Claim;

use crate::foundation::agency::CONDUIT;
use crate::foundation::{
    FUSES_INTO, IS_A_PREDICATE, IS_A_TERM, SPECIALIZES_AS, USES_AS_FUSION_LEFT,
    USES_AS_FUSION_RIGHT,
};

/// Owner identity for the networking corpus.
pub const IDENTITY: &str = "mash-library-networking";

// ─────────────────────────────────────────────────────────────────────
// Protocol terms
//
// Each is both a term (declarable as a subject) and a predicate
// (used diagonally: `(X, telnet, X) True` means "X speaks telnet").
// ─────────────────────────────────────────────────────────────────────

/// Telnet protocol.
pub const TELNET: &str = "telnet";

/// Stdio protocol (stdin/stdout line-oriented).
pub const STDIO: &str = "stdio";

/// IRC protocol.
pub const IRC: &str = "irc";

// ─────────────────────────────────────────────────────────────────────
// Concrete conduits — fusions of conduit ⊙ protocol
// ─────────────────────────────────────────────────────────────────────

/// Telnet conduit — `conduit ⊙ telnet`.
pub const TELNET_CONDUIT: &str = "telnet-conduit";

/// Stdio conduit — `conduit ⊙ stdio`.
pub const STDIO_CONDUIT: &str = "stdio-conduit";

/// IRC conduit — `conduit ⊙ irc`.
pub const IRC_CONDUIT: &str = "irc-conduit";

// ─────────────────────────────────────────────────────────────────────
// Corpus
// ─────────────────────────────────────────────────────────────────────

/// Networking corpus. Mounted at hub boot, declares the three
/// network protocol terms and wires each concrete conduit as a
/// `conduit ⊙ protocol` fusion plus the upward specialization chain.
#[derive(Debug, Clone, Copy, Default)]
pub struct Networking;

#[async_trait]
impl Agent for Networking {
    fn identity(&self) -> &'static str {
        IDENTITY
    }

    fn claims(&self) -> Vec<Claim> {
        let mut out = Vec::new();

        // Protocol terms — both terms and diagonal-presence predicates.
        for proto in [TELNET, STDIO, IRC] {
            out.push(Claim::new(proto, IS_A_TERM, IDENTITY));
            out.push(Claim::new(proto, IS_A_PREDICATE, IDENTITY));
        }

        // Each concrete conduit: term + predicate + fusion wiring +
        // specialization upward to both its role (conduit) and its
        // protocol (so direct witnesses at the concrete conduit
        // propagate to both parent fibers).
        for (concrete, protocol) in [
            (TELNET_CONDUIT, TELNET),
            (STDIO_CONDUIT, STDIO),
            (IRC_CONDUIT, IRC),
        ] {
            out.push(Claim::new(concrete, IS_A_TERM, IDENTITY));
            out.push(Claim::new(concrete, IS_A_PREDICATE, IDENTITY));

            // Fusion: (conduit ⊙ protocol) → concrete. Anchor
            // subject is the concrete term itself.
            out.push(Claim::new(concrete, USES_AS_FUSION_LEFT, CONDUIT));
            out.push(Claim::new(concrete, USES_AS_FUSION_RIGHT, protocol));
            out.push(Claim::new(concrete, FUSES_INTO, concrete));

            // Specialization chain: concrete lifts upward to both
            // parents.
            out.push(Claim::new(concrete, SPECIALIZES_AS, CONDUIT));
            out.push(Claim::new(concrete, SPECIALIZES_AS, protocol));
        }

        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn protocols_declared() {
        let claims = Networking.claims();
        for proto in [TELNET, STDIO, IRC] {
            assert!(
                claims
                    .iter()
                    .any(|c| c.subject == proto && c.predicate == IS_A_PREDICATE),
                "{proto} should be declared as a predicate"
            );
        }
    }

    #[test]
    fn telnet_conduit_fused_from_conduit_and_telnet() {
        let claims = Networking.claims();
        assert!(claims.iter().any(|c| c.subject == TELNET_CONDUIT
            && c.predicate == USES_AS_FUSION_LEFT
            && c.object == CONDUIT));
        assert!(claims.iter().any(|c| c.subject == TELNET_CONDUIT
            && c.predicate == USES_AS_FUSION_RIGHT
            && c.object == TELNET));
        assert!(claims.iter().any(|c| c.subject == TELNET_CONDUIT
            && c.predicate == FUSES_INTO
            && c.object == TELNET_CONDUIT));
    }

    #[test]
    fn concrete_conduits_specialize_both_parents() {
        let claims = Networking.claims();
        for (concrete, protocol) in [
            (TELNET_CONDUIT, TELNET),
            (STDIO_CONDUIT, STDIO),
            (IRC_CONDUIT, IRC),
        ] {
            assert!(
                claims.iter().any(|c| c.subject == concrete
                    && c.predicate == SPECIALIZES_AS
                    && c.object == CONDUIT),
                "{concrete} should specialize conduit"
            );
            assert!(
                claims.iter().any(|c| c.subject == concrete
                    && c.predicate == SPECIALIZES_AS
                    && c.object == protocol),
                "{concrete} should specialize {protocol}"
            );
        }
    }
}
