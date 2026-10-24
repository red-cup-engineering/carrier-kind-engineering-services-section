from datetime import datetime, timezone, timedelta
import pytest
import proof_lead_benchmark as p

T=datetime(2026,10,5,11,0,tzinfo=timezone.utc)

def r(**kw):
    base=dict(
      benchmark_id="b1",claim_id="c1",input_digest="sha256:"+"1"*64,
      baseline_solver_id="causal-solver@1",lift_id="lift@1",descent_verifier_id="verifier@1",
      baseline_runtime_id="cpu-local@1",lift_runtime_id="cpu-local@1",descent_runtime_id="cpu-local@1",
      resource_policy="matched-runtime",launch_policy="simultaneous",
      regime="kinetic-open-world",success_rule="either",
      comparison_started_at=T,baseline_started_at=T,lift_started_at=T,lift_available_at=T,
      descended_verified_at=T+timedelta(seconds=5),baseline_verified_at=T+timedelta(seconds=20),
      baseline_work=100,lift_work=20,descent_work=10,verification_work=5,rollback_work=0)
    base.update(kw); return p.ProofLeadReceipt(**base)

def test_positive_clock_and_work_lead():
    x=r(); assert p.proof_lead_seconds(x)==15; assert p.settlement_work_lead(x)==65; assert p.descent_ahead(x) is True

def test_negative_clock_lead_is_preserved_not_clipped():
    x=r(descended_verified_at=T+timedelta(seconds=25))
    assert p.proof_lead_seconds(x)==-5

def test_preregistered_either_rule_can_accept_work_without_clock_lead():
    x=r(descended_verified_at=T+timedelta(seconds=25),baseline_work=100,success_rule="either")
    assert p.proof_lead_seconds(x)<0 and p.settlement_work_lead(x)>0 and p.descent_ahead(x) is True

def test_clock_rule_does_not_metric_switch_to_positive_work():
    x=r(descended_verified_at=T+timedelta(seconds=25),baseline_work=100,success_rule="clock")
    assert p.settlement_work_lead(x)>0 and p.descent_ahead(x) is False

def test_both_rule_requires_both_observed_positive_metrics():
    assert p.descent_ahead(r(success_rule="both")) is True
    assert p.descent_ahead(r(success_rule="both",baseline_work=None)) is None
    assert p.descent_ahead(r(success_rule="both",baseline_work=30)) is False

def test_either_rule_with_one_nonpositive_and_other_censored_is_unresolved():
    x=r(success_rule="either",baseline_work=None,descended_verified_at=T+timedelta(seconds=25))
    assert p.descent_ahead(x) is None

def test_rollback_cost_counts_against_work_lead():
    assert p.settlement_work_lead(r(rollback_work=70))==-5

def test_censored_baseline_does_not_become_infinite_lead():
    x=r(baseline_verified_at=None,baseline_work=None,observation_horizon=T+timedelta(seconds=30))
    assert p.proof_lead_seconds(x) is None and p.settlement_work_lead(x) is None and p.descent_ahead(x) is None
    assert p.baseline_censored_at(x)==25

def test_observed_baseline_cannot_use_censoring_helper():
    with pytest.raises(ValueError,match="observed"):
        p.baseline_censored_at(r())

def test_descended_verification_cannot_precede_lift():
    with pytest.raises(ValueError,match="cannot precede"):
        p.proof_lead_seconds(r(descended_verified_at=T-timedelta(seconds=1)))

def test_naive_timestamps_are_refused():
    with pytest.raises(ValueError,match="timezone-aware"):
        p.proof_lead_seconds(r(lift_available_at=datetime(2026,10,5,11,0)))

def test_work_inputs_refuse_boolean_text_negative_and_nonfinite():
    for bad in (True,"10",-1,float("nan"),float("inf")):
        with pytest.raises(ValueError):
            p.settlement_work_lead(r(lift_work=bad))

def test_regime_label_is_bounded_software_mode_not_free_text():
    with pytest.raises(ValueError,match="preregistered"):
        p.proof_lead_seconds(r(regime="quantum"))

def test_success_rule_must_be_preregistered():
    with pytest.raises(ValueError,match="success_rule"):
        p.descent_ahead(r(success_rule="best-looking-metric"))

def test_provenance_identity_fields_are_required():
    for field in ("benchmark_id","claim_id","input_digest","baseline_solver_id","lift_id","descent_verifier_id",
                  "baseline_runtime_id","lift_runtime_id","descent_runtime_id"):
        with pytest.raises(ValueError,match=field):
            p.proof_lead_seconds(r(**{field:""}))

def test_baseline_work_can_be_censored_independently_of_clock():
    x=r(baseline_work=None,success_rule="clock")
    assert p.proof_lead_seconds(x)==15 and p.settlement_work_lead(x) is None and p.descent_ahead(x) is True

def test_horizon_must_follow_descended_verification():
    x=r(baseline_verified_at=None,baseline_work=None,observation_horizon=T+timedelta(seconds=4))
    with pytest.raises(ValueError,match="horizon"):
        p.baseline_censored_at(x)


def test_baseline_that_finished_before_lift_is_negative_evidence_not_invalid_input():
    x=r(lift_available_at=T+timedelta(seconds=10),descended_verified_at=T+timedelta(seconds=12),baseline_verified_at=T+timedelta(seconds=5),baseline_work=100)
    assert p.proof_lead_seconds(x)==-7
    assert p.descent_ahead(x) is False


def test_unobserved_baseline_cannot_supply_a_completed_work_total():
    x=r(baseline_verified_at=None, baseline_work=100, observation_horizon=T+timedelta(seconds=30), success_rule="work")
    with pytest.raises(ValueError, match="baseline_work must be censored"):
        p.descent_ahead(x)


def test_runtime_comparison_policy_prevents_hidden_resource_substitution():
    with pytest.raises(ValueError, match="identical runtime identities"):
        p.descent_ahead(r(lift_runtime_id="gpu-remote@1", resource_policy="matched-runtime"))
    x=r(lift_runtime_id="gpu-remote@1", descent_runtime_id="gpu-remote@1", resource_policy="declared-end-to-end")
    assert p.descent_ahead(x) is True


def test_resource_policy_must_be_preregistered():
    with pytest.raises(ValueError, match="resource_policy"):
        p.descent_ahead(r(resource_policy="whatever-wins"))


def test_simultaneous_clock_comparison_rejects_a_delayed_baseline_start():
    with pytest.raises(ValueError, match="simultaneous launch"):
        p.descent_ahead(r(baseline_started_at=T+timedelta(seconds=1)))


def test_declared_staggered_run_does_not_turn_timestamp_difference_into_clock_win():
    x=r(
        launch_policy="declared-staggered",
        baseline_started_at=T+timedelta(seconds=10),
        baseline_verified_at=T+timedelta(seconds=30),
        success_rule="clock",
    )
    assert p.proof_lead_seconds(x)==25
    assert p.descent_ahead(x) is None


def test_declared_staggered_run_can_still_use_preregistered_settlement_work():
    x=r(
        launch_policy="declared-staggered",
        baseline_started_at=T+timedelta(seconds=10),
        baseline_verified_at=T+timedelta(seconds=30),
        success_rule="work",
    )
    assert p.settlement_work_lead(x)==65
    assert p.descent_ahead(x) is True


def test_launch_policy_and_start_order_are_fail_closed():
    with pytest.raises(ValueError, match="launch_policy"):
        p.descent_ahead(r(launch_policy="whatever-wins"))
    with pytest.raises(ValueError, match="cannot precede comparison"):
        p.descent_ahead(r(baseline_started_at=T-timedelta(seconds=1)))
    with pytest.raises(ValueError, match="baseline start"):
        p.descent_ahead(r(baseline_verified_at=T-timedelta(seconds=1)))


def test_censored_baseline_requires_horizon_bound_into_the_receipt():
    x=r(baseline_verified_at=None, baseline_work=None)
    with pytest.raises(ValueError, match="receipt-bound observation_horizon"):
        p.descent_ahead(x)


def test_observed_baseline_rejects_a_censoring_horizon_to_keep_states_disjoint():
    with pytest.raises(ValueError, match="must be absent"):
        p.proof_lead_seconds(r(observation_horizon=T+timedelta(seconds=30)))


def test_censoring_bound_comes_only_from_the_receipt_horizon():
    x=r(baseline_verified_at=None, baseline_work=None, observation_horizon=T+timedelta(seconds=42))
    assert p.baseline_censored_at(x)==37


def test_input_digest_is_a_real_sha256_identity_not_a_free_text_label():
    for bad in ("digest", "sha256:input-1", "sha256:"+"g"*64, "sha256:"+"1"*63):
        with pytest.raises(ValueError,match="64 hexadecimal"):
            p.proof_lead_seconds(r(input_digest=bad))
    assert p.proof_lead_seconds(r(input_digest="sha256:"+"A"*64))==15


def test_censoring_horizon_cannot_precede_a_staggered_baseline_start():
    x=r(launch_policy="declared-staggered",
        baseline_started_at=T+timedelta(seconds=40),
        baseline_verified_at=None, baseline_work=None,
        observation_horizon=T+timedelta(seconds=30),
        success_rule="clock")
    with pytest.raises(ValueError,match="cannot precede baseline start"):
        p.baseline_censored_at(x)