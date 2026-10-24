"""Minimal executable measurement contract for Regime-Lift proof-lead experiments.

This instrument measures timestamps/work after a causal verifier has accepted a descended
claim. It does not decide that a lift is sound, quantum, kinetic, valuable, or physically
realizable. Unobserved baseline completion is treated as censoring, not infinite lead.
Benchmark, solver, lift, verifier, input identity, launch policy/times, and the success metric
are declared on the receipt so a positive result cannot be manufactured by swapping
implementations, delaying the baseline, or choosing clock-vs-work after seeing the outcome.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
import math
import re


def _nonempty(name: str, value: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{name} must be a nonempty string")
    return value



def _sha256_digest(name: str, value: str) -> str:
    _nonempty(name, value)
    if not re.fullmatch(r"sha256:[0-9a-fA-F]{64}", value):
        raise ValueError(f"{name} must be a sha256: digest with 64 hexadecimal digits")
    return value.lower()


def _aware(name: str, value: datetime) -> datetime:
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{name} must be a timezone-aware datetime")
    return value


def _nonnegative(name: str, value: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be finite nonnegative numeric without coercion")
    value=float(value)
    if not math.isfinite(value) or value < 0:
        raise ValueError(f"{name} must be finite nonnegative numeric without coercion")
    return value


@dataclass(frozen=True)
class ProofLeadReceipt:
    benchmark_id: str
    claim_id: str
    input_digest: str
    baseline_solver_id: str
    lift_id: str
    descent_verifier_id: str
    baseline_runtime_id: str
    lift_runtime_id: str
    descent_runtime_id: str
    resource_policy: str
    launch_policy: str
    regime: str
    success_rule: str
    comparison_started_at: datetime
    baseline_started_at: datetime
    lift_started_at: datetime
    lift_available_at: datetime
    descended_verified_at: datetime
    baseline_verified_at: datetime | None
    baseline_work: float | None
    lift_work: float
    descent_work: float
    verification_work: float
    rollback_work: float = 0.0
    observation_horizon: datetime | None = None

    def validate(self) -> "ProofLeadReceipt":
        for name in (
            "benchmark_id", "claim_id", "baseline_solver_id",
            "lift_id", "descent_verifier_id", "baseline_runtime_id",
            "lift_runtime_id", "descent_runtime_id",
        ):
            _nonempty(name, getattr(self, name))
        _sha256_digest("input_digest", self.input_digest)
        if self.resource_policy not in {"matched-runtime", "declared-end-to-end"}:
            raise ValueError("resource_policy must preregister matched-runtime or declared-end-to-end")
        if self.resource_policy == "matched-runtime" and len({
            self.baseline_runtime_id, self.lift_runtime_id, self.descent_runtime_id
        }) != 1:
            raise ValueError("matched-runtime policy requires identical runtime identities")
        if self.launch_policy not in {"simultaneous", "declared-staggered"}:
            raise ValueError("launch_policy must preregister simultaneous or declared-staggered")
        if self.regime not in {"quantum-structured","kinetic-open-world","combined-k-q"}:
            raise ValueError("regime must name a preregistered higher-regime software mode")
        if self.success_rule not in {"clock", "work", "either", "both"}:
            raise ValueError("success_rule must preregister clock, work, either, or both")
        comparison=_aware("comparison_started_at",self.comparison_started_at)
        baseline_started=_aware("baseline_started_at",self.baseline_started_at)
        lift_started=_aware("lift_started_at",self.lift_started_at)
        if baseline_started < comparison or lift_started < comparison:
            raise ValueError("solver/lift start cannot precede comparison start")
        if self.launch_policy == "simultaneous" and not (
            baseline_started == lift_started == comparison
        ):
            raise ValueError("simultaneous launch requires equal comparison/baseline/lift start times")
        lift=_aware("lift_available_at",self.lift_available_at)
        descended=_aware("descended_verified_at",self.descended_verified_at)
        if lift < lift_started:
            raise ValueError("lift availability cannot precede lift start")
        if descended < lift:
            raise ValueError("descended verification cannot precede lift availability")
        if self.baseline_verified_at is not None:
            baseline_verified=_aware("baseline_verified_at",self.baseline_verified_at)
            if baseline_verified < baseline_started:
                raise ValueError("baseline verification cannot precede baseline start")
            if self.observation_horizon is not None:
                raise ValueError("observation_horizon must be absent when baseline verification is observed")
        else:
            if self.baseline_work is not None:
                raise ValueError("baseline_work must be censored when baseline verification is unobserved")
            if self.observation_horizon is None:
                raise ValueError("censored baseline requires a receipt-bound observation_horizon")
            horizon=_aware("observation_horizon", self.observation_horizon)
            if horizon < descended:
                raise ValueError("observation horizon cannot precede descended verification")
            if horizon < baseline_started:
                raise ValueError("observation horizon cannot precede baseline start")
        if self.baseline_work is not None:
            _nonnegative("baseline_work",self.baseline_work)
        for name in ("lift_work","descent_work","verification_work","rollback_work"):
            _nonnegative(name,getattr(self,name))
        return self


def proof_lead_seconds(receipt: ProofLeadReceipt) -> float | None:
    """Observed verification-time difference; clock evidence requires simultaneous launch."""
    r=receipt.validate()
    if r.baseline_verified_at is None:
        return None
    return (r.baseline_verified_at-r.descended_verified_at).total_seconds()


def settlement_work_lead(receipt: ProofLeadReceipt) -> float | None:
    r=receipt.validate()
    if r.baseline_work is None:
        return None
    used=r.lift_work+r.descent_work+r.verification_work+r.rollback_work
    return float(r.baseline_work-used)


def descent_ahead(receipt: ProofLeadReceipt) -> bool | None:
    """Evaluate only the preregistered operational success rule.

    None means the metric(s) needed by the declared rule are censored enough that the
    receipt cannot yet be classified. A baseline completing before lift availability is
    negative evidence for descent-ahead regardless of work accounting.
    """
    r=receipt.validate()
    time_lead=proof_lead_seconds(r)
    work_lead=settlement_work_lead(r)
    if r.baseline_verified_at is not None and not r.lift_available_at < r.baseline_verified_at:
        return False

    time_positive=None if time_lead is None or r.launch_policy != "simultaneous" else time_lead > 0
    work_positive=None if work_lead is None else work_lead > 0
    if r.success_rule == "clock":
        return time_positive
    if r.success_rule == "work":
        return work_positive
    if r.success_rule == "either":
        if time_positive is True or work_positive is True:
            return True
        if time_positive is False and work_positive is False:
            return False
        return None
    # both
    if time_positive is False or work_positive is False:
        return False
    if time_positive is True and work_positive is True:
        return True
    return None


def baseline_censored_at(receipt: ProofLeadReceipt) -> float:
    """Receipt-bound lower bound when baseline is incomplete at its declared observation horizon."""
    r=receipt.validate()
    if r.baseline_verified_at is not None:
        raise ValueError("baseline is observed; use proof_lead_seconds")
    return (r.observation_horizon-r.descended_verified_at).total_seconds()