//! Correlation — n-ary rules that fire when all premise predicates
//! settle True on the same subject.
//!
//! # How correlation is expressed
//!
//! Correlation rules are declared directly via the engine's
//! composition-morphism trigger predicates, not via a projection.
//! An n-ary rule is a chain of (n-1) binary compositions:
//!
//! ```text
//! // Three-premise rule: P1 ∧ P2 ∧ P3 → Output
//! (anchor-12, uses-as-composition-left,  P1)
//! (anchor-12, uses-as-composition-right, P2)
//! (anchor-12, composes-into,             T12)
//! (anchor-123, uses-as-composition-left,  T12)
//! (anchor-123, uses-as-composition-right, P3)
//! (anchor-123, composes-into,             Output)
//! ```
//!
//! Composition is pointwise knowledge-meet at matching `(s, o)`, so
//! correlation rules fire when all premise cells co-occur at the
//! same `(s, o)` coordinate. Under the diagonalization discipline,
//! Quality presence-flags at `(X, P, X)` coordinates make this work
//! naturally: a subject X with True at every premise's diagonal
//! cell also has True at the output's diagonal cell.
//!
//! # Why no CorrelationPort
//!
//! An earlier version shipped a `CorrelationPort` that held off-
//! substrate state (per-rule-per-subject satisfaction sets) and
//! emitted outputs when its internal bookkeeping saw all premises
//! settle regardless of their object slot. That is an existential-
//! over-object projection, not a bilattice morphism (paper §2.5 /
//! p2.12 — existential projection fails to preserve `∧_t`). Under
//! the principle that MASH's math is complete and state lives as
//! claims, the port was a patch for cascade-incompatible premise
//! shapes. The correct move is to shape premises diagonally and let
//! the cascade's composition morphism do the work.
//!
//! This module now carries only the `correlation-rule` vocabulary
//! term as a namespace label for authors composing such rules.

#![warn(missing_docs)]

use async_trait::async_trait;

use mash_engine::sdk::agent::Agent;
use mash_engine::sdk::client::Claim;

use crate::foundation::{IS_A_TERM, RELATION, SPECIALIZES_AS};

/// Owner identity.
pub const IDENTITY: &str = "mash-library-correlation";

// ─────────────────────────────────────────────────────────────────────
// Term
// ─────────────────────────────────────────────────────────────────────

/// A correlation rule subject — the anchor used to group the
/// composition-trigger cells of a multi-premise rule. Subject naming
/// convention: `correlation-rule:<slug>`.
pub const CORRELATION_RULE: &str = "correlation-rule";

// ─────────────────────────────────────────────────────────────────────
// Owner-agent
// ─────────────────────────────────────────────────────────────────────

/// Owner-agent declaring the correlation-rule term.
#[derive(Debug, Clone, Copy, Default)]
pub struct Correlation;

#[async_trait]
impl Agent for Correlation {
    fn identity(&self) -> &'static str {
        IDENTITY
    }

    fn claims(&self) -> Vec<Claim> {
        vec![
            Claim::new(CORRELATION_RULE, IS_A_TERM, IDENTITY),
            Claim::new(CORRELATION_RULE, SPECIALIZES_AS, RELATION),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::foundation::{IS_A_TERM, RELATION};

    #[test]
    fn correlation_rule_term_declared() {
        let claims = Correlation.claims();
        assert!(claims
            .iter()
            .any(|c| c.subject == CORRELATION_RULE && c.predicate == IS_A_TERM));
        assert!(claims
            .iter()
            .any(|c| c.subject == CORRELATION_RULE && c.object == RELATION));
    }
}
