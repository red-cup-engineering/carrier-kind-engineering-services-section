//! Agency — MASH's self-description of kinds of agents, as an
//! AgentialCorpus declared into the substrate.
//!
//! This module is the canonical, substrate-present declaration of
//! the abstract agency hierarchy:
//!
//! ```text
//! projector   ← broadest category (moves information between spaces)
//!   ↑ specializes-as
//! agent       ← projector with agency
//!   ↑ specializes-as
//! port        ← agent handling the substrate boundary
//!   ↑ specializes-as
//!   sensor, actuator, responder, effector, conduit, coupler, projection-role
//! ```
//!
//! Concrete ports (things like telnet-conduits, shell-effectors) and
//! the protocols they speak live in their own topic modules at the
//! library level (e.g. `networking`, `execution`). Each such module
//! declares its protocol terms and wires each concrete port as a
//! fusion of the relevant role with the relevant protocol.
//!
//! # Docs and code are the same thing
//!
//! Every term here is a claim in the substrate. The Rust constants
//! are labels for those claims; the claims are authoritative. To
//! change the vocabulary, edit this corpus.

#![warn(missing_docs)]

use async_trait::async_trait;
use mash_engine::sdk::agent::Agent;
use mash_engine::sdk::client::Claim;

use super::{IS_A_PREDICATE, IS_A_TERM, SPECIALIZES_AS, THING};

/// Owner identity for the agency corpus.
pub const IDENTITY: &str = "mash-library-foundation-agency";

// ─────────────────────────────────────────────────────────────────────
// Core hierarchy: projector ← agent ← port
// ─────────────────────────────────────────────────────────────────────

/// A projector. The broadest category: any participant whose act
/// moves information across a boundary (substrate ↔ external, or
/// between substrate regions). Used as a diagonal presence predicate:
/// `(X, projector, X)` True means "X is a projector."
pub const PROJECTOR: &str = "projector";

/// An agent — a projector with agency. Every agent projects.
/// Diagonal presence predicate: `(X, agent, X)` True.
pub const AGENT: &str = "agent";

/// A port — an agent that projects across the MASH substrate
/// boundary. Most ports are subprocesses communicating via the
/// socket; some run in-hub. Diagonal presence predicate.
pub const PORT: &str = "port";

// ─────────────────────────────────────────────────────────────────────
// Port roles (seven specializations of PORT)
// ─────────────────────────────────────────────────────────────────────

/// Sensor — port that reads external state, witnessing it into the
/// substrate as claims.
pub const SENSOR: &str = "sensor";

/// Actuator — port that effects external state from settled
/// substrate claims.
pub const ACTUATOR: &str = "actuator";

/// Responder — port that answers requests witnessed at the
/// substrate, emitting response claims for the session that issued.
pub const RESPONDER: &str = "responder";

/// Effector — port that executes bounded, committal external
/// operations (shell exec, container run, LLM completion, filesystem
/// write), reporting their outcome as claims.
pub const EFFECTOR: &str = "effector";

/// Conduit — bidirectional protocol bridge. A conduit simultaneously
/// witnesses incoming claims (from the external protocol) and reads
/// outgoing ones (to the external protocol) for the session it
/// serves.
pub const CONDUIT: &str = "conduit";

/// Coupler — port that connects two MASH substrates together for
/// federation; projects cells between them.
pub const COUPLER: &str = "coupler";

/// Projection-role — port whose role is deriving cells from other
/// cells in a way that crosses the substrate boundary (e.g., emits a
/// tool-schema render of substrate state for external consumption).
/// Distinct from the mathematical projection morphism; this is a
/// port-role classification.
pub const PROJECTION_ROLE: &str = "projection-role";

// ─────────────────────────────────────────────────────────────────────
// Corpus
// ─────────────────────────────────────────────────────────────────────

/// The Agency corpus. Mounted into the substrate at hub boot,
/// declaring the projector/agent/port DAG and the port-fusion
/// wirings for each protocol.
#[derive(Debug, Clone, Copy, Default)]
pub struct Agency;

#[async_trait]
impl Agent for Agency {
    fn identity(&self) -> &'static str {
        IDENTITY
    }

    fn claims(&self) -> Vec<Claim> {
        let mut out = Vec::new();

        // Core hierarchy. projector, agent, port are each terms AND
        // predicates — used as predicate-subjects for specialization
        // wiring, and as predicate-names for diagonal presence
        // cells.
        for t in [PROJECTOR, AGENT, PORT] {
            out.push(Claim::new(t, IS_A_TERM, IDENTITY));
            out.push(Claim::new(t, IS_A_PREDICATE, IDENTITY));
        }
        out.push(Claim::new(PROJECTOR, SPECIALIZES_AS, THING));
        out.push(Claim::new(AGENT, SPECIALIZES_AS, PROJECTOR));
        out.push(Claim::new(PORT, SPECIALIZES_AS, AGENT));

        // Port roles — each specializes port.
        for role in [
            SENSOR,
            ACTUATOR,
            RESPONDER,
            EFFECTOR,
            CONDUIT,
            COUPLER,
            PROJECTION_ROLE,
        ] {
            out.push(Claim::new(role, IS_A_TERM, IDENTITY));
            out.push(Claim::new(role, IS_A_PREDICATE, IDENTITY));
            out.push(Claim::new(role, SPECIALIZES_AS, PORT));
        }

        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn core_hierarchy_declared() {
        let claims = Agency.claims();
        assert!(claims
            .iter()
            .any(|c| c.subject == AGENT && c.predicate == SPECIALIZES_AS && c.object == PROJECTOR));
        assert!(claims
            .iter()
            .any(|c| c.subject == PORT && c.predicate == SPECIALIZES_AS && c.object == AGENT));
    }

    #[test]
    fn seven_port_roles_specialize_port() {
        let claims = Agency.claims();
        for role in [
            SENSOR,
            ACTUATOR,
            RESPONDER,
            EFFECTOR,
            CONDUIT,
            COUPLER,
            PROJECTION_ROLE,
        ] {
            assert!(
                claims.iter().any(|c| c.subject == role
                    && c.predicate == SPECIALIZES_AS
                    && c.object == PORT),
                "{role} should specialize-as port"
            );
        }
    }

    #[test]
    fn core_terms_are_predicates_for_diagonal_use() {
        // projector, agent, port are used both as terms AND as
        // diagonal-presence predicates (e.g. (X, port, X) True means
        // X is a port). They must be declared as both.
        let claims = Agency.claims();
        for t in [PROJECTOR, AGENT, PORT] {
            assert!(
                claims
                    .iter()
                    .any(|c| c.subject == t && c.predicate == IS_A_PREDICATE),
                "{t} should be declared as a predicate"
            );
            assert!(
                claims
                    .iter()
                    .any(|c| c.subject == t && c.predicate == IS_A_TERM),
                "{t} should be declared as a term"
            );
        }
    }
}
