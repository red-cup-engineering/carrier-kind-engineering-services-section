//! Task dispatch — bridge task/run/op declarations into scheduler decisions.
//!
//! This is the first OS-shaped bridge between "a task exists" and
//! "an effector may run it". Task minters declare intent, target,
//! dependencies, approvals, and pending operations. This projection
//! mints dispatch candidates from that structure, lets the dispatch
//! selector choose a candidate, then binds the selected worker to the
//! op. The existing worker gate derives per-kind readiness from
//! `is-intent-set` and `uses-<kind>-worker`.
//!
//! The important invariant is negative: task creation must not
//! directly assert effector readiness. Readiness is an OS decision
//! after routing, not a property of a freshly minted op.

use std::collections::{HashMap, HashSet};

use mash_engine::algebra::Value;
use mash_engine::sdk::agent::Projection;
use mash_engine::sdk::client::Claim;

use crate::foundation::IS_A_TERM;
use crate::operation::approval::HAS_ALL_APPROVALS_SATISFIED;
use crate::operation::dispatch::{
    CANDIDATE, CONSIDERS_OP, CONSIDERS_PERFORMER, IDENTITY as DISPATCH_MARKER, IS_OP_READY,
    IS_PERFORMER_AVAILABLE, IS_SELECTED,
};
use crate::operation::worker::{
    CONTAINER_WORKER, CURRENTLY_ASSIGNED, HUMAN_WORKER, IS_WORKER_AVAILABLE, LLM_WORKER,
    SHELL_WORKER, USES_CONTAINER_WORKER, USES_HUMAN_WORKER, USES_LLM_WORKER, USES_SHELL_WORKER,
};
use crate::operation::{EXECUTES_ON, IS_INTENT_SET, IS_PENDING};
use crate::planning::task::{
    HAS_ALL_DEPENDENCIES_SATISFIED, HAS_OPERATION, HAS_TARGET, IS_ASSIGNED_TO_TASK,
};

/// Projection identity.
pub const IDENTITY: &str = "mash-library-task-dispatch";

/// Stateful task-to-dispatch bridge.
#[derive(Debug, Default)]
pub struct TaskDispatchPort {
    task_target: HashMap<String, String>,
    task_ops: HashMap<String, HashSet<String>>,
    op_task: HashMap<String, String>,
    pending_ops: HashSet<String>,
    intent_worker_for_op: HashMap<String, String>,
    dependencies_satisfied: HashSet<String>,
    approvals_satisfied: HashSet<String>,
    available_workers: HashSet<String>,
    candidate_op: HashMap<String, String>,
    candidate_worker: HashMap<String, String>,
    minted_candidates: HashSet<String>,
    routed_candidates: HashSet<String>,
}

impl TaskDispatchPort {
    /// Fresh task dispatcher.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    fn try_mint_for_op(&mut self, op: &str) -> Vec<Claim> {
        let Some(task) = self.op_task.get(op).cloned() else {
            return Vec::new();
        };
        if !self.pending_ops.contains(op)
            || !self.dependencies_satisfied.contains(&task)
            || !self.approvals_satisfied.contains(&task)
        {
            return Vec::new();
        }

        let Some(worker) = self
            .intent_worker_for_op
            .get(op)
            .cloned()
            .or_else(|| self.task_target.get(&task).cloned())
        else {
            return Vec::new();
        };
        if self.task_target.get(&task) != Some(&worker) || !self.available_workers.contains(&worker)
        {
            return Vec::new();
        }

        let candidate = candidate_for(op, &worker);
        if !self.minted_candidates.insert(candidate.clone()) {
            return Vec::new();
        }

        self.candidate_op.insert(candidate.clone(), op.to_owned());
        self.candidate_worker
            .insert(candidate.clone(), worker.clone());

        vec![
            Claim::new(&candidate, IS_A_TERM, CANDIDATE),
            Claim::new(&candidate, CONSIDERS_OP, op),
            Claim::new(&candidate, CONSIDERS_PERFORMER, &worker),
            Claim::new(&candidate, IS_OP_READY, DISPATCH_MARKER),
            Claim::new(&candidate, IS_PERFORMER_AVAILABLE, DISPATCH_MARKER),
        ]
    }

    fn try_mint_for_task(&mut self, task: &str) -> Vec<Claim> {
        let ops: Vec<String> = self
            .task_ops
            .get(task)
            .into_iter()
            .flat_map(|ops| ops.iter().cloned())
            .collect();
        ops.into_iter()
            .flat_map(|op| self.try_mint_for_op(&op))
            .collect()
    }

    fn try_mint_for_worker(&mut self, worker: &str) -> Vec<Claim> {
        let ops: Vec<String> = self
            .intent_worker_for_op
            .iter()
            .filter(|(_, target)| target.as_str() == worker)
            .map(|(op, _)| op.clone())
            .collect();
        ops.into_iter()
            .flat_map(|op| self.try_mint_for_op(&op))
            .collect()
    }

    fn route_selected_candidate(&mut self, candidate: &str) -> Vec<Claim> {
        if !self.routed_candidates.insert(candidate.to_owned()) {
            return Vec::new();
        }
        let Some(op) = self.candidate_op.get(candidate).cloned() else {
            return Vec::new();
        };
        let Some(worker) = self.candidate_worker.get(candidate).cloned() else {
            return Vec::new();
        };
        let Some(uses_predicate) = uses_predicate_for_worker(&worker) else {
            return Vec::new();
        };

        vec![
            Claim::new(&op, EXECUTES_ON, &worker),
            Claim::new(&worker, CURRENTLY_ASSIGNED, &op),
            Claim::new(&op, uses_predicate, &worker),
        ]
    }
}

impl Projection for TaskDispatchPort {
    fn identity(&self) -> &str {
        IDENTITY
    }

    fn subscriptions(&self) -> Vec<String> {
        vec![
            HAS_TARGET.to_owned(),
            HAS_OPERATION.to_owned(),
            IS_ASSIGNED_TO_TASK.to_owned(),
            IS_PENDING.to_owned(),
            IS_INTENT_SET.to_owned(),
            HAS_ALL_DEPENDENCIES_SATISFIED.to_owned(),
            HAS_ALL_APPROVALS_SATISFIED.to_owned(),
            IS_WORKER_AVAILABLE.to_owned(),
            CONSIDERS_OP.to_owned(),
            CONSIDERS_PERFORMER.to_owned(),
            IS_SELECTED.to_owned(),
        ]
    }

    fn ingest(&mut self, subject: &str, predicate: &str, object: &str, value: Value) -> Vec<Claim> {
        if value != Value::True && value != Value::Both {
            return Vec::new();
        }

        match predicate {
            HAS_TARGET => {
                self.task_target
                    .insert(subject.to_owned(), object.to_owned());
                self.try_mint_for_task(subject)
            }
            HAS_OPERATION => {
                self.task_ops
                    .entry(subject.to_owned())
                    .or_default()
                    .insert(object.to_owned());
                self.op_task
                    .entry(object.to_owned())
                    .or_insert_with(|| subject.to_owned());
                self.try_mint_for_op(object)
            }
            IS_ASSIGNED_TO_TASK => {
                self.op_task.insert(subject.to_owned(), object.to_owned());
                self.task_ops
                    .entry(object.to_owned())
                    .or_default()
                    .insert(subject.to_owned());
                self.try_mint_for_op(subject)
            }
            IS_PENDING => {
                self.pending_ops.insert(subject.to_owned());
                self.try_mint_for_op(subject)
            }
            IS_INTENT_SET => {
                self.intent_worker_for_op
                    .insert(subject.to_owned(), object.to_owned());
                self.try_mint_for_op(subject)
            }
            HAS_ALL_DEPENDENCIES_SATISFIED => {
                self.dependencies_satisfied.insert(subject.to_owned());
                self.try_mint_for_task(subject)
            }
            HAS_ALL_APPROVALS_SATISFIED => {
                self.approvals_satisfied.insert(subject.to_owned());
                self.try_mint_for_task(subject)
            }
            IS_WORKER_AVAILABLE => {
                self.available_workers.insert(subject.to_owned());
                self.try_mint_for_worker(subject)
            }
            CONSIDERS_OP => {
                self.candidate_op
                    .insert(subject.to_owned(), object.to_owned());
                Vec::new()
            }
            CONSIDERS_PERFORMER => {
                self.candidate_worker
                    .insert(subject.to_owned(), object.to_owned());
                Vec::new()
            }
            IS_SELECTED => self.route_selected_candidate(subject),
            _ => Vec::new(),
        }
    }
}

fn candidate_for(op: &str, worker: &str) -> String {
    format!("candidate:{op}:{worker}")
}

fn uses_predicate_for_worker(worker: &str) -> Option<&'static str> {
    match worker.split(':').next().unwrap_or(worker) {
        SHELL_WORKER => Some(USES_SHELL_WORKER),
        LLM_WORKER => Some(USES_LLM_WORKER),
        CONTAINER_WORKER => Some(USES_CONTAINER_WORKER),
        HUMAN_WORKER => Some(USES_HUMAN_WORKER),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::foundation::Foundation;
    use crate::governance::os561::WORKER_REPOSITORY_LLM;
    use crate::operation::dispatch::{Dispatch, IS_ADMISSIBLE};
    use crate::operation::worker::{Workers, IS_READY_TO_RUN_ON_LLM};
    use crate::operation::Ops;
    use crate::projection::dispatch_selector::SelectorPort;
    use crate::testing::TestHub;

    #[test]
    fn task_dispatch_routes_selected_llm_op_to_worker_gate() {
        let mut hub = TestHub::builder()
            .with_owner_agent(Foundation)
            .with_owner_agent(Ops)
            .with_owner_agent(Dispatch)
            .with_owner_agent(Workers)
            .with_projection(TaskDispatchPort::new())
            .with_projection(SelectorPort::new())
            .build();

        hub.witness_true(
            WORKER_REPOSITORY_LLM,
            IS_WORKER_AVAILABLE,
            WORKER_REPOSITORY_LLM,
        );
        hub.witness_true("task:t", HAS_TARGET, WORKER_REPOSITORY_LLM);
        hub.witness_true("task:t", HAS_ALL_DEPENDENCIES_SATISFIED, "task:t");
        hub.witness_true("task:t", HAS_ALL_APPROVALS_SATISFIED, "task:t");
        hub.witness_true("task:t", HAS_OPERATION, "op:o");
        hub.witness_true("op:o", IS_ASSIGNED_TO_TASK, "task:t");
        hub.witness_true("op:o", IS_PENDING, "op:o");
        hub.witness_true("op:o", IS_INTENT_SET, WORKER_REPOSITORY_LLM);

        let candidate = candidate_for("op:o", WORKER_REPOSITORY_LLM);
        assert_eq!(
            hub.value(&candidate, IS_ADMISSIBLE, DISPATCH_MARKER),
            Value::True
        );
        assert_eq!(
            hub.value(&candidate, IS_SELECTED, DISPATCH_MARKER),
            Value::True
        );
        assert_eq!(
            hub.value("op:o", USES_LLM_WORKER, WORKER_REPOSITORY_LLM),
            Value::True
        );
        assert_eq!(
            hub.value("op:o", IS_READY_TO_RUN_ON_LLM, WORKER_REPOSITORY_LLM),
            Value::True
        );
    }

    #[test]
    fn task_dispatch_waits_for_dependency_and_approval_rollups() {
        let mut port = TaskDispatchPort::new();
        let _ = port.ingest(
            WORKER_REPOSITORY_LLM,
            IS_WORKER_AVAILABLE,
            WORKER_REPOSITORY_LLM,
            Value::True,
        );
        let _ = port.ingest("task:t", HAS_TARGET, WORKER_REPOSITORY_LLM, Value::True);
        let _ = port.ingest("task:t", HAS_OPERATION, "op:o", Value::True);
        let _ = port.ingest("op:o", IS_ASSIGNED_TO_TASK, "task:t", Value::True);
        let _ = port.ingest("op:o", IS_PENDING, "op:o", Value::True);
        let _ = port.ingest("op:o", IS_INTENT_SET, WORKER_REPOSITORY_LLM, Value::True);

        assert!(
            port.minted_candidates.is_empty(),
            "candidate must not mint before dependency and approval rollups settle"
        );

        let _ = port.ingest(
            "task:t",
            HAS_ALL_DEPENDENCIES_SATISFIED,
            "task:t",
            Value::True,
        );
        assert!(port.minted_candidates.is_empty());

        let out = port.ingest("task:t", HAS_ALL_APPROVALS_SATISFIED, "task:t", Value::True);
        assert!(out.iter().any(|claim| claim.predicate == CONSIDERS_OP));
    }
}
