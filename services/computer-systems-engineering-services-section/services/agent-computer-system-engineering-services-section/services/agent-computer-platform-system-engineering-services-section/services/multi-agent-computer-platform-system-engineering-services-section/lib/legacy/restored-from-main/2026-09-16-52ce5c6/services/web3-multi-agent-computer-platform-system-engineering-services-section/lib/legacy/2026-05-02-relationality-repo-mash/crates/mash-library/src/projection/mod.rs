//! Projection — projector-role ports.
//!
//! Agents that project (in the mathematical sense) between the
//! substrate and something external, or that mint new subjects in
//! response to settled cells. Welcome flows, effectors for movement
//! and perception, dispatch selection, cardinality aggregation,
//! string resolution, staleness detection, duty-to-op bridging, and
//! similar reactive agents whose act is computational rather than
//! purely declarative.
//!
//! Every member of this module is an Agent whose behavior crosses a
//! boundary — external event, subject minting, or derivation that
//! would otherwise require off-substrate state. V4 will review each
//! and determine whether its logic collapses to morphism-wiring
//! claims in another corpus or genuinely belongs here.
//!
//! Incoming content will migrate here during V3f: welcome,
//! movement_effector, perception_effector, dispatch_selector,
//! cardinality, resolver, staleness (extracted from clock),
//! duty_bridge, commanders_aid, harness.

#![warn(missing_docs)]

pub mod cardinality;
pub mod commanders_aid;
pub mod dispatch_selector;
pub mod duty_bridge;
pub mod harness;
pub mod movement;
pub mod perception;
pub mod resolver;
pub mod task_dispatch;
pub mod welcome;
