//! Driver for an in-process embedded agent. Calls [`Agent::enact`]
//! against the kernel command bus — no socket, no wire encoding.

use crate::inference::wire::Message;
use crate::sdk::agent::Agent;
use crate::sdk::client::Handle;
use tokio::sync::mpsc;
use tracing::warn;

use super::kernel::{Cmd, SessionId};

/// Drive one embedded agent to completion.
///
/// The caller is responsible for mounting `agent.claims()` directly
/// into the substrate; this driver does not witness them through
/// the kernel (that path would persist them to the event log on
/// every boot). After Connect + Hello, the driver invokes
/// [`Agent::enact`] with a handle that forwards witnesses into the
/// kernel command bus. When enact returns, the session closes.
///
/// Agents that need inbound events today override `enact` and open
/// their own subscription loops inside it. A future unification may
/// pass an event-receiver alongside the handle; for closed-term
/// agents (vocabulary, ontology, theory, scene corpora) the
/// outbound-only handle is sufficient.
pub async fn drive_embedded(
    agent: Box<dyn Agent>,
    id: SessionId,
    cmd_tx: mpsc::UnboundedSender<Cmd>,
) {
    let identity = agent.identity().to_owned();
    let subscriptions: Vec<String> = agent
        .subscriptions()
        .iter()
        .map(|s| (*s).to_owned())
        .collect();

    // Hub → agent events. Unused for closed-term agents; the channel
    // is held to keep the kernel session open for the duration of
    // enact. Events that arrive during enact accumulate here and
    // drop when the channel closes.
    let (event_tx, mut event_rx) = mpsc::unbounded_channel::<Message>();
    // Agent → hub asserts (forwarded into the kernel below).
    let (witness_tx, mut witness_rx) = mpsc::unbounded_channel::<Message>();

    if cmd_tx
        .send(Cmd::Connect {
            id,
            outbound: event_tx,
        })
        .is_err()
    {
        return;
    }

    if cmd_tx
        .send(Cmd::Message {
            id,
            msg: Message::Hello {
                agent: identity.clone(),
                version: env!("CARGO_PKG_VERSION").to_owned(),
                subscriptions,
            },
        })
        .is_err()
    {
        return;
    }

    let forward_cmd_tx = cmd_tx.clone();
    tokio::spawn(async move {
        while let Some(msg) = witness_rx.recv().await {
            if forward_cmd_tx.send(Cmd::Message { id, msg }).is_err() {
                break;
            }
        }
    });

    // Drain inbound events in the background so the kernel's
    // broadcast doesn't stall. Log any hub-errors; discard the rest
    // (closed-term agents don't consume events).
    let identity_for_drain = identity.clone();
    tokio::spawn(async move {
        while let Some(msg) = event_rx.recv().await {
            if let Message::Error { code, message } = msg {
                warn!(%code, %message, agent = %identity_for_drain, "hub reported error");
            }
        }
    });

    let handle = Handle::from_outbound(witness_tx);

    // The agent's act.
    agent.enact(handle).await;

    let _ = cmd_tx.send(Cmd::Disconnect { id });
}
