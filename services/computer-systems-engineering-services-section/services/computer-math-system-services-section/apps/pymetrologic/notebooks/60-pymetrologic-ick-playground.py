# ---
# jupyter:
#   jupytext:
#     formats: ipynb,py:percent
#     text_representation:
#       extension: .py
#       format_name: percent
#       format_version: '1.3'
#       jupytext_version: 1.19.4
#   kernelspec:
#     display_name: Python 3
#     language: python
#     name: python3
# ---

# %% [markdown]
# # PyMetroLogic ICK Playground
#
# A compact notebook bench for the lab as an information-coherence kernel:
# one package, routed explorations, and Lean-earned executable shadows.

# %%
from fractions import Fraction

from pymetrologic import (
    BL,
    K4,
    BooleanLattice,
    closure_orbit,
    closure_step,
    drive_monotone,
    drive_step_inflationary,
    driven_flow,
    four,
    knowledge_lattice,
)
from pymetrologic.alexandrov import (
    AlexandrovTopology,
    FinitePoset,
    alexandrov_specialization_recovers_poset,
    continuous_iff_monotone,
    husainov_cech_acyclic_on_bounded_sites,
)
from pymetrologic.anderson_putnam import (
    APStageElement,
    ap_direct_limit_laws,
    ap_system,
    ap_system_stage_independent,
    step_n_invariant,
    step_two_is_four,
)
from pymetrologic.articulating import (
    articulating_recursion_witness,
)
from pymetrologic.articulating_primitives import (
    articulating_primitive_witness,
)
from pymetrologic.associated_sheaf import (
    designated_short_exact_sequence,
    settling_associated_sheaf,
)
from pymetrologic.autopoiesis import (
    default_autopoiesis_pair,
    history_filtration_distinct_from_value_order,
    history_separation_aperiodicity,
    nuclear_autopoiesis_cell,
)
from pymetrologic.bigraded_cohomology import (
    bigraded_refines_h1,
    bigraded_regime_of,
    bigraded_two_row_mapping_cone,
    inconsistency_content,
    trichotomy,
    truth_content,
)
from pymetrologic.bigraded_diamond_tower import (
    bigraded_diamond_tower,
)
from pymetrologic.bitopological_site import (
    SiteObj,
    bitopological_site_grothendieck,
    no_temporal_covers,
    strict_site_finite_fiber,
)
from pymetrologic.blowup import (
    blowup_classified,
    reconstruct_valuation,
)
from pymetrologic.calculus import triangle_sheaf
from pymetrologic.classification import (
    AperiodicSettling,
    aperiodic_not_trivial,
    aperiodic_witness,
    classifying_equivalent,
    clinv_dichotomy,
)
from pymetrologic.closure_2monad_kz import (
    sample_closure_2monad_kz_witness,
)
from pymetrologic.closure_operator_fiber import (
    charge_join_closure,
    closure_operator_fiber_laws,
    lfp_is_settled,
)
from pymetrologic.closure_ordinal import (
    closure_ordinal_witness,
)
from pymetrologic.closure_rules import (
    ClosureRule,
    ClosureRuleSystem,
    always_rule,
    immediate_consequence_lfp,
)
from pymetrologic.coclassification import (
    H1Homology,
    co_cl_inv,
    co_classifying_equivalent,
    co_clinv_aperiodic_witness_nonzero,
    d_spatial_isomorphism,
    dual_cosheaf,
)
from pymetrologic.collatz_valuation import (
    two_adic_valuation_witness,
)
from pymetrologic.colouring import (
    FOUR_CHARGE_PALETTE,
    chromatic_number,
    complete_graph_edges,
    k4_requires_four,
)
from pymetrologic.coordination import (
    coordination_cost,
    cover_nerve_from_edges,
    h1rank_is_coordination_cost,
    laplacian_kernel_cokernel,
)
from pymetrologic.d4_gauge import (
    D8,
    d4_is_aut_four,
    d4_is_dihedral,
    d8_order,
)
from pymetrologic.entropy import (
    colouring_entropy,
    complete_graph_colouring_count,
    full_shift_entropy,
    proper_edge_colourings,
    proper_triangle_colourings,
)
from pymetrologic.fca_lambek import (
    fca_lambek_circle,
)
from pymetrologic.frobenius_tqft import (
    commutative_frobenius_is_tqft,
    degree_of_class,
    handle_operator,
    settling_frobenius_algebra,
)
from pymetrologic.harmonic_cohomology import (
    lawvere_harmonic_section_classifying_invariant_zero,
)
from pymetrologic.inverse_hull import (
    ap_hull_has_distinct_threads,
    ap_hull_system,
    const_thread,
    hull_pairs_clinv,
    projection_coherence,
    seam_map,
)
from pymetrologic.kz_coherent import (
    FiniteKZSheaf,
    OneCell,
    id_cell,
    kz_coherent_descent,
    kz_coherent_identifies_parallel,
    onecell_comp,
)
from pymetrologic.laplacianizers import (
    settled_sections,
    settling_hodge_round_trips,
    settling_laplacianizability,
    settling_laplacianizer,
)
from pymetrologic.lax_slack import (
    FiniteRelation,
    closure_no_lax_slack,
    has_lax_slack,
    lax_slack_witness,
)
from pymetrologic.lightcones import (
    LightConeEvent,
    causal_diamond,
    interval_kind,
    spacelike_incomparable,
)
from pymetrologic.local_constancy import (
    constant_sheaf_locally_constant,
    predicate_locally_constant,
    vanishing_regime_local_constancy_model,
)
from pymetrologic.logarithms import (
    golden_log_bracket,
    golden_log_convergence_witness,
    log_additivity_defect,
    log_seq,
    log_step_bound_holds,
)
from pymetrologic.metallic import (
    char_poly_metallic,
    metallic_abs_convergent_gap,
    metallic_cassini_value,
    metallic_convergent,
    metallic_convergent_telescope_bound,
    metallic_gap_step_bound,
    metallic_matrix,
    metallic_matrix_power_succ,
    metallic_num,
    metallic_quadratic,
    metallic_real_convergent,
    metallic_real_witness,
)
from pymetrologic.modal_kripke import (
    kripke_hierarchy,
    s4_box_is_interior,
    sample_s4_frame,
    twist_split_negate,
)
from pymetrologic.moduli import (
    StepRule,
    moduli_point,
    moduli_stack_stratification,
    negation_gauge_invisible,
    step_shift,
)
from pymetrologic.negative_paraconsistent import (
    negative_paraconsistent_split,
    negative_sheaf_is_negation_mirror,
)
from pymetrologic.nsc_firing import (
    forall_antecedent_is_nsc,
    no_nsc_firing_for_closure,
    nsc_firing_source_witness,
)
from pymetrologic.pairwise_stone import (
    four_priestley_dual,
    pairwise_stone_topology,
    swap_is_z2_negation,
)
from pymetrologic.predication_fibration import (
    predication_fibration_witness,
)
from pymetrologic.predication_hyperdoctrine import (
    converse_hyperdoctrine_witness,
)
from pymetrologic.predication_hyperdoctrine_dual import (
    predication_hyperdoctrine_dual_witness,
)
from pymetrologic.probability_measure import (
    probability_measure_witness,
    sample_probability_events,
    sample_probability_space,
)
from pymetrologic.quantale_enriched import (
    h0_laplacian_fixed_points,
    q_fuzzy_equivalence_composes,
    qcat_is_quantale_category,
)
from pymetrologic.reals import (
    bishop_product_estimate,
    constructive_sqrt_witness,
    metallic_root_equation_holds,
    metallic_root_surd,
    metallic_root_witness,
    real_multiplication_witness,
)
from pymetrologic.regimes import (
    ClosureRegime,
    ClosureRegimeData,
    classify_closure_regime,
    curvature_regime_correspondence,
    four_regime_dichotomy,
    is_curved_regime,
    is_flat_regime,
    regime_is_four_corner,
    salem_vs_pisot_regime,
    spine_is_strict,
)
from pymetrologic.salem import (
    char_poly_salem,
    det_salem_vs_pisot,
    golden_double_root,
    golden_root_equation_holds,
    salem_companion_cayley_hamilton,
    salem_trace_double_root,
    salem_trace_real_root,
    salem_trace_root_equation_holds,
    salem_trace_unit_circle,
)
from pymetrologic.settling_coalgebra import (
    canonical_coalgebra,
    cclosed_iff_closure_algebra,
    coalgebra_dual_of_algebra,
    coalgebra_orbit_limit_witness,
)
from pymetrologic.settling_monotonicity_quiescence import (
    sample_settling_monotonicity_quiescence,
)
from pymetrologic.sofic import (
    fibonacci_substitute,
    fibonacci_substitution_golden,
    golden_mean_words,
)
from pymetrologic.stepn_fixedpoint import (
    chain_preserves_point,
    embed_depth_independent,
    sigma_infinity_embed_fixed,
    step_n_embed,
    step_shift_chain_colimit,
)
from pymetrologic.stochastic import (
    FiniteMarkovKernel,
    advance_distribution,
    uniform_distribution,
)
from pymetrologic.synonymy import (
    FiringType,
    StrongSettling,
    antonymy,
    strong_mld,
    synonymy,
)
from pymetrologic.temporal_two_category import (
    TemporalZeroCell,
    sample_temporal_bc_square,
    temporal_beck_chevalley,
    temporal_two_category,
)
from pymetrologic.theory_relative_ideal import (
    sample_relative_ideal_witness,
)
from pymetrologic.transfinite_cell_complex import (
    TransfiniteCellComplex,
    transfinite_complex_is_colimit_of_finite,
)
from pymetrologic.transfinite_flow import (
    tflow_continuous_at_omega,
    transfinite_settling_continuity,
)
from pymetrologic.truth_order import (
    truth_order_witness,
)
from pymetrologic.universality import (
    cl_inv_invariant_of_coord,
    identity_matrix,
    matrix_multiply,
    matrix_power,
    same_universality_class,
    strong_shift_equivalent,
)
from pymetrologic.valuation_quartet_discharge import (
    sample_valuation_fibers,
    valuation_fiber_discharge_witness,
)
from pymetrologic.value_settling import (
    ValueRegimeData,
    boolean_recovers_spine,
    boolean_value_category,
    charge_value_category,
    four_regime_v_independent,
    vclosure,
)
from pymetrologic.yoneda import (
    knowledge_presheaf_category,
    yoneda_arrows_first,
)

# %% [markdown]
# ## Lean-Earned Lab Surface

# %%
theory_surface = {
    "calculus": triangle_sheaf("0", "1", "0"),
    "FOUR": four(),
    "Klein gauge": K4.ID,
    "closure orbit": closure_orbit(
        knowledge_lattice(BooleanLattice()),
        lambda value: four().join_k(value, four().true),
        four().none,
        steps=3,
    ),
}

[(name, type(value).__name__) for name, value in theory_surface.items()]

# %% [markdown]
# ## RelMath Information Shadows

# %%
edge_count = len(proper_edge_colourings())
triangle_count = len(proper_triangle_colourings())
salem_regime, pisot_regime = salem_vs_pisot_regime()
coordination_nerve = cover_nerve_from_edges(
    ("a", "b", "c", "d"),
    (
        frozenset({"a", "b"}),
        frozenset({"b", "c"}),
        frozenset({"c", "d"}),
        frozenset({"d", "a"}),
        frozenset({"a", "c"}),
    ),
)
coordination_laplacian = laplacian_kernel_cokernel(coordination_nerve)
alexandrov_source = AlexandrovTopology(
    FinitePoset(
        elements=("bot", "left", "right", "top"),
        leq=frozenset(
            {
                ("bot", "bot"),
                ("left", "left"),
                ("right", "right"),
                ("top", "top"),
                ("bot", "left"),
                ("bot", "right"),
                ("bot", "top"),
                ("left", "top"),
                ("right", "top"),
            }
        ),
    )
)
alexandrov_target = AlexandrovTopology(
    FinitePoset(
        elements=("0", "1", "2"),
        leq=frozenset(
            {
                ("0", "0"),
                ("1", "1"),
                ("2", "2"),
                ("0", "1"),
                ("1", "2"),
                ("0", "2"),
            }
        ),
    )
)
alexandrov_map = {"bot": "0", "left": "1", "right": "1", "top": "2"}
alexandrov_recovery = alexandrov_specialization_recovers_poset(
    alexandrov_source,
    sample_maps=((alexandrov_target, alexandrov_map),),
)
husainov_cech = husainov_cech_acyclic_on_bounded_sites(ClosureRegime.strict)
articulating_primitives = articulating_primitive_witness()
articulating_recursion = articulating_recursion_witness()
bigraded_tower = bigraded_diamond_tower()
collatz_depth = two_adic_valuation_witness(5)
truth_order = truth_order_witness()

{
    "articulating_primitives": (
        articulating_primitives.holds,
        articulating_primitives.corner_cardinality,
    ),
    "articulating_recursion": (
        articulating_recursion.holds,
        articulating_recursion.depth,
        articulating_recursion.path_length,
    ),
    "bigraded_diamond_tower": (
        bigraded_tower.holds,
        bigraded_tower.axes_are_independent,
        bigraded_tower.cross_order_enters_as_grade,
    ),
    "collatz_saturating_depth": (
        collatz_depth.holds,
        collatz_depth.expanded,
        collatz_depth.factor.exponent,
        collatz_depth.shortcut_successor,
        collatz_depth.halving_run,
    ),
    "truth_order": (
        truth_order.holds,
        truth_order.truth_bounds,
        truth_order.truth_bottom_settles_to_bound,
    ),
    "edge_colourings": edge_count,
    "edge_entropy_bits": full_shift_entropy(edge_count),
    "triangle_colourings": triangle_count,
    "triangle_entropy_per_vertex": colouring_entropy(triangle_count, 3),
    "complete_graph_k3_count": complete_graph_colouring_count(3, 3),
    "salem_regime": salem_regime,
    "pisot_regime": pisot_regime,
    "salem_is_aperiodic": salem_regime == ClosureRegime.aperiodic,
    "coordination_h0_components": coordination_nerve.H0rank,
    "coordination_h1_cost": coordination_cost(coordination_nerve),
    "coordination_rank_formula": h1rank_is_coordination_cost(coordination_nerve),
    "coordination_laplacian_dual": coordination_laplacian.holds,
    "alexandrov_open_count": len(alexandrov_source.opens()),
    "alexandrov_specialization": alexandrov_recovery.specialization_recovers_order,
    "alexandrov_continuous_iff_monotone": continuous_iff_monotone(
        alexandrov_source,
        alexandrov_target,
        alexandrov_map,
    ),
    "husainov_cech_side_only": husainov_cech.holds,
}

# %%
curvature_witnesses = {
    regime.value: curvature_regime_correspondence(regime) for regime in ClosureRegime
}
regime_dichotomy = four_regime_dichotomy(ClosureRegimeData(False, False, True))
finite_closure_ordinal = closure_ordinal_witness()

{
    "flat_regimes": [regime.value for regime in ClosureRegime if is_flat_regime(regime)],
    "curved_regimes": [regime.value for regime in ClosureRegime if is_curved_regime(regime)],
    "all_correspondence_legs_hold": all(
        witness.flat_iff_not_curved
        and witness.vanishes_iff_flat
        and witness.nonvanishes_iff_curved
        and witness.no_curved_omega_terminating
        and witness.rank_zero_iff_flat
        for witness in curvature_witnesses.values()
    ),
    "curvature_ranks": {
        regime: witness.curvature_rank for regime, witness in curvature_witnesses.items()
    },
    "closure_regime_dichotomy": (
        regime_dichotomy.holds,
        regime_dichotomy.regime,
        regime_is_four_corner(),
        spine_is_strict(),
    ),
    "finite_closure_ordinal": (
        finite_closure_ordinal.holds,
        finite_closure_ordinal.k_height,
        finite_closure_ordinal.inflationary_endomaps_checked,
        finite_closure_ordinal.omega_lub_collapses,
    ),
    "closure_regime_classifier": classify_closure_regime(ClosureRegimeData(True, False, True)),
}

# %%
bl = four()
lat = knowledge_lattice(bl.L)
associated_valuation = {
    "truth": bl.true,
    "conflict": bl.conflict,
    "false": bl.false,
    "none": bl.none,
}
associated_cochain = {"truth": 7, "conflict": -3, "false": 0, "none": 0}
associated_cover = (frozenset({"truth", "false"}), frozenset({"conflict", "none"}))
associated_sheaf = settling_associated_sheaf(
    associated_valuation,
    associated_cochain,
    associated_cover,
)
associated_sequence = designated_short_exact_sequence(associated_valuation, associated_cochain)
bigraded_mapping_cone = bigraded_two_row_mapping_cone(associated_valuation, associated_cochain)
bigraded_refinement = bigraded_refines_h1(ClosureRegime.strict)
add_true = closure_step(lat, lambda x: x, bl.true)
increments = (bl.none, bl.false, bl.none)
nsc_source = nsc_firing_source_witness(lat)
laplacian_witness = settling_laplacianizability(lat, add_true)
omega_flow_witness = transfinite_settling_continuity(lat, add_true, bl.none)
triangle_complex = TransfiniteCellComplex(
    cells=("v0", "v1", "v2", "e01", "e12", "e20", "f"),
    dimensions={"v0": 0, "v1": 0, "v2": 0, "e01": 1, "e12": 1, "e20": 1, "f": 2},
    faces=frozenset(
        {
            ("v0", "e01"),
            ("v1", "e01"),
            ("v1", "e12"),
            ("v2", "e12"),
            ("v2", "e20"),
            ("v0", "e20"),
            ("e01", "f"),
            ("e12", "f"),
            ("e20", "f"),
        }
    ),
)
triangle_colimit = transfinite_complex_is_colimit_of_finite(triangle_complex)
settling_coalgebra = canonical_coalgebra(lat, add_true, bl.none, bl.false)
coalgebra_limit = coalgebra_orbit_limit_witness(lat, add_true, bl.none)
coalgebra_duality = coalgebra_dual_of_algebra(lat, add_true, bl.true)
cclosed_algebra = cclosed_iff_closure_algebra(lat, add_true, bl.true)
boolean_closure = vclosure(boolean_value_category(), lambda value: value or True)
four_value_category = charge_value_category()
four_value_closure = vclosure(
    four_value_category,
    lambda value: four_value_category.lattice.join(value, bl.true),
)
value_regime_witness = four_regime_v_independent(
    boolean_closure,
    four_value_closure,
    ValueRegimeData(scott_continuous=False, finite_base=False, countable_cofinality=True),
)
value_spine_recovery = boolean_recovers_spine()
frobenius_witness = settling_frobenius_algebra()
tqft_witness = commutative_frobenius_is_tqft()
stone_duality = four_priestley_dual()
stone_swap = swap_is_z2_negation()
stone_topology = pairwise_stone_topology()
d4_dihedral = d4_is_dihedral()
d4_aut_four = d4_is_aut_four()
kripke_s4 = sample_s4_frame()
kripke_hierarchy_witness = kripke_hierarchy(s4_frame=kripke_s4)
kripke_s4_witness = s4_box_is_interior(kripke_s4)
autopoiesis_pair = default_autopoiesis_pair()
autopoiesis_cell = nuclear_autopoiesis_cell(autopoiesis_pair)
history_separation = history_separation_aperiodicity()
history_filtration = history_filtration_distinct_from_value_order(autopoiesis_pair)
negative_mirror = negative_sheaf_is_negation_mirror()
negative_split = negative_paraconsistent_split()
qcat_witness = qcat_is_quantale_category()
qfuzzy_witness = q_fuzzy_equivalence_composes()
q_h0_true = h0_laplacian_fixed_points(bl.true)
bitopological_site = bitopological_site_grothendieck()
temporal_cover_witness = no_temporal_covers()
strict_site_regime, strict_site_fiber = strict_site_finite_fiber()
kz_x = SiteObj("kz", 0, strict_site_fiber[0])
kz_y = SiteObj("kz", 0, strict_site_fiber[1])
kz_z = SiteObj("kz", 0, strict_site_fiber[-1])
kz_f = OneCell(kz_x, kz_y, "f")
kz_g = OneCell(kz_y, kz_z, "g")
kz_gf = onecell_comp(kz_g, kz_f)
kz_sheaf = FiniteKZSheaf(
    routes=(id_cell(kz_x), id_cell(kz_y), id_cell(kz_z), kz_f, kz_g, kz_gf),
    sections={
        id_cell(kz_x): 0,
        id_cell(kz_y): 0,
        id_cell(kz_z): 0,
        kz_f: 2,
        kz_g: 3,
        kz_gf: 5,
    },
    rest_ids={kz_x: 0, kz_y: 0, kz_z: 0},
    rest_comp=lambda outer, inner: outer + inner,
)
kz_parallel = kz_coherent_identifies_parallel(kz_sheaf)
kz_descent = kz_coherent_descent(
    kz_sheaf,
    lambda value: value % 2,
    lambda outer, inner: (outer + inner) % 2,
)
yoneda_witness = yoneda_arrows_first()
temporal_category = knowledge_presheaf_category()
temporal_cells = (
    TemporalZeroCell(2, "none"),
    TemporalZeroCell(1, "true"),
    TemporalZeroCell(1, "false"),
    TemporalZeroCell(0, "conflict"),
)
temporal_witness = temporal_two_category(temporal_category, temporal_cells)
temporal_bc_square = sample_temporal_bc_square()
temporal_bc_witness = temporal_beck_chevalley(
    temporal_bc_square,
    {
        "none": "bottom",
        "true": "positive",
        "false": "negative",
        "conflict": "top",
    },
)
relative_ideal_reindex, relative_ideal_settled = sample_relative_ideal_witness()
valuation_quartet_discharge = valuation_fiber_discharge_witness(sample_valuation_fibers())
probability_measure = probability_measure_witness(
    sample_probability_space(),
    sample_probability_events(),
)
hyperdoctrine_witness = converse_hyperdoctrine_witness()
fibration_witness = predication_fibration_witness()
dual_hyperdoctrine_witness = predication_hyperdoctrine_dual_witness()
fca_lambek_witness = fca_lambek_circle()
local_constancy = vanishing_regime_local_constancy_model(ClosureRegime.strict, kz_sheaf)
constant_local_constancy = constant_sheaf_locally_constant(kz_sheaf.routes, 0, kz_sheaf)
nonthin_rel = FiniteRelation(("a", "b"), lambda _left, _right: True)
closure_rule_system = ClosureRuleSystem(
    lat,
    (
        always_rule(bl.true, name="admit-truth"),
        ClosureRule(
            antecedent=lambda value: lat.leq(bl.true, value),
            consequent=bl.conflict,
            name="truth-forces-conflict",
        ),
    ),
)
closure_rule_lfp = immediate_consequence_lfp(closure_rule_system, bl.none)
fiber_closure = charge_join_closure(bl.true)
fiber_closure_seed = {"truth": bl.none, "conflict": bl.false}
fiber_closure_laws = closure_operator_fiber_laws(
    fiber_closure,
    ("truth", "conflict"),
)
closure_kz_witness, closure_kz_algebra = sample_closure_2monad_kz_witness()
settling_mq = sample_settling_monotonicity_quiescence()
triangle_predication_sheaf, triangle_assignment = triangle_sheaf(
    "0",
    "0",
    "0",
).to_predication_sheaf()
harmonic_cohomology = lawvere_harmonic_section_classifying_invariant_zero(
    lat,
    add_true,
    bl.none,
    triangle_predication_sheaf,
    triangle_assignment,
    ClosureRegime.strict,
)
predecessor = {"truth": bl.none, "conflict": bl.true, "rest": bl.conflict}
actual = {"truth": bl.true, "conflict": bl.conflict, "rest": bl.conflict}
blowup = blowup_classified(predecessor, actual)

{
    "plain_closure_orbit": closure_orbit(lat, add_true, bl.none, steps=3),
    "associated_sheaf": associated_sheaf.holds,
    "associated_sheaf_ses": associated_sequence.holds,
    "bigraded_regime": bigraded_regime_of(
        truth_content(associated_valuation),
        inconsistency_content(associated_valuation),
    ),
    "bigraded_trichotomy": trichotomy(
        truth_content(associated_valuation),
        inconsistency_content(associated_valuation),
    ),
    "bigraded_mapping_cone": bigraded_mapping_cone.holds,
    "bigraded_refinement": bigraded_refinement.holds,
    "driven_closure_flow": driven_flow(lat, add_true, increments, bl.none),
    "drive_step_inflationary": drive_step_inflationary(lat, add_true, increments, bl.none),
    "drive_monotone": drive_monotone(lat, add_true, increments, bl.none),
    "blowup_incidence": sorted(blowup.local_data.incidence),
    "blowup_reconstructs": reconstruct_valuation(predecessor, blowup.local_data) == actual,
    "laplacianizable": laplacian_witness.holds,
    "laplacian_harmonic_kernel": settled_sections(lat, add_true),
    "hodge_round_trips": settling_hodge_round_trips(settling_laplacianizer(lat, add_true)),
    "harmonic_cohomology_bridge": harmonic_cohomology.holds,
    "harmonic_h0_extent": harmonic_cohomology.h0_extent,
    "omega_settling_continuity": omega_flow_witness.holds,
    "omega_lub": tflow_continuous_at_omega(lat, add_true, bl.none),
    "triangle_face_subcomplex": sorted(triangle_complex.generated_subcomplex("f").cells),
    "transfinite_cell_colimit": triangle_colimit.holds,
    "settling_coalgebra_target": settling_coalgebra.target,
    "settling_coalgebra_holds": settling_coalgebra.holds,
    "coalgebra_limit_lub": coalgebra_limit.holds,
    "coalgebra_duality_at_quiescence": coalgebra_duality.holds,
    "cclosed_is_closure_algebra": cclosed_algebra.holds,
    "value_regime_v_independent": value_regime_witness.holds,
    "value_regime": value_regime_witness.left_regime,
    "boolean_four_recover_spine": value_spine_recovery.holds,
    "settling_frobenius": frobenius_witness.holds,
    "abrams_tqft_roundtrip": tqft_witness.holds,
    "four_priestley_dual": stone_duality.holds,
    "stone_swap_negation": stone_swap.holds,
    "stone_order_recovery": stone_topology.holds,
    "stone_duality_table": stone_duality.table,
    "d4_dihedral": d4_dihedral.holds,
    "d4_aut_four": d4_aut_four.holds,
    "d4_rotation_order": d8_order(D8.negSwap),
    "kripke_hierarchy": kripke_hierarchy_witness.holds,
    "s4_box_interior": kripke_s4_witness.holds,
    "twist_split_negates_truth": twist_split_negate(bl.true),
    "autopoiesis_cell": autopoiesis_cell.holds,
    "autopoiesis_core": [charge for charge in bl.sample() if autopoiesis_pair.pi(charge) == charge],
    "history_separation_aperiodicity": history_separation.holds,
    "history_filtration_distinct": history_filtration.holds,
    "negative_sheaf_mirror": negative_mirror.holds,
    "negative_paraconsistent_split": negative_split.holds,
    "charge_quantale_qcat": qcat_witness.holds,
    "q_fuzzy_equiv_composes": qfuzzy_witness.holds,
    "q_h0_true_fixed_points": q_h0_true.fixed_points,
    "bitopological_site_grothendieck": bitopological_site.holds,
    "no_temporal_covers": temporal_cover_witness.holds,
    "strict_site_fiber": (strict_site_regime, strict_site_fiber),
    "kz_parallel_identification": kz_parallel.holds,
    "kz_coherent_descent": kz_descent.holds,
    "yoneda_arrows_first": yoneda_witness.holds,
    "temporal_two_category": temporal_witness.holds,
    "temporal_beck_chevalley": temporal_bc_witness.holds,
    "theory_relative_ideal": (
        relative_ideal_reindex.holds,
        relative_ideal_settled.holds,
    ),
    "valuation_quartet_discharge": (
        valuation_quartet_discharge.heyting.holds,
        valuation_quartet_discharge.nuclei.holds,
        valuation_quartet_discharge.fix_pi_iff,
        valuation_quartet_discharge.holds,
    ),
    "probability_measure": (
        probability_measure.valuation.holds,
        probability_measure.conditioning.holds,
        probability_measure.holds,
    ),
    "predication_hyperdoctrine": (
        hyperdoctrine_witness.converse_adjunction,
        hyperdoctrine_witness.converse_frobenius,
        hyperdoctrine_witness.beck_chevalley,
        hyperdoctrine_witness.holds,
    ),
    "predication_fibration": (
        fibration_witness.generators.holds,
        fibration_witness.bilattice_hom.holds,
        fibration_witness.transpose.holds,
        fibration_witness.holds,
    ),
    "dual_predication_hyperdoctrine": (
        dual_hyperdoctrine_witness.galois_transport.holds,
        dual_hyperdoctrine_witness.dual_adjoint_system.holds,
        dual_hyperdoctrine_witness.two_equalities,
        dual_hyperdoctrine_witness.holds,
    ),
    "fca_lambek_circle": fca_lambek_witness.holds,
    "predicate_locally_constant": predicate_locally_constant(kz_sheaf),
    "local_constancy_vanishing": local_constancy.holds,
    "constant_sheaf_local_constancy": constant_local_constancy.holds,
    "h0_h1_axes": (degree_of_class(0, 3), degree_of_class(1, 5)),
    "handle_mu_after_delta": handle_operator((3, 4)),
    "thin_closure_has_no_lax_slack": closure_no_lax_slack(lat, add_true),
    "closure_rule_cascade": (
        closure_rule_system.step(bl.none),
        closure_rule_system.step(bl.true),
        closure_rule_lfp.closure,
    ),
    "closure_rule_lfp": closure_rule_lfp.holds,
    "closure_operator_fiber": fiber_closure_laws.holds,
    "closure_fiber_lfp": lfp_is_settled(fiber_closure, fiber_closure_seed),
    "closure_2monad_kz": (
        closure_kz_witness.holds,
        closure_kz_algebra.holds,
        closure_kz_algebra.fixed_points,
    ),
    "settling_monotonicity_quiescence": (
        settling_mq.holds,
        settling_mq.orbit_is_monotone,
        settling_mq.cosettling.preimage_count,
    ),
    "nonthin_lax_slack": lax_slack_witness(
        nonthin_rel,
        lambda x: "b" if x == "a" else "a",
        "a",
    ),
    "nonthin_has_lax_slack": has_lax_slack(
        nonthin_rel,
        lambda x: "b" if x == "a" else "a",
    ),
    "finite_closure_has_no_nsc": no_nsc_firing_for_closure(lat, add_true),
    "forall_antecedent_is_nsc": forall_antecedent_is_nsc(lat),
    "nsc_source_regime": nsc_source.regime,
    "nsc_source_nonvanishing": nsc_source.cohomology_nonvanishing,
}

# %%
flat = AperiodicSettling(ClosureRegime.strict)
aperiodic = aperiodic_witness().base

{
    "flat_clinv": flat.cl_inv,
    "aperiodic_witness": aperiodic,
    "same_class_as_flat": classifying_equivalent(flat, aperiodic),
    "dichotomy": clinv_dichotomy(),
    "aperiodic_not_trivial": aperiodic_not_trivial(),
}

# %%
cosheaf = dual_cosheaf(frozenset({"left", "right"}), aperiodic)

{
    "co_cl_inv": co_cl_inv(aperiodic),
    "co_class_same_as_flat": co_classifying_equivalent(flat, aperiodic),
    "verdier_inverse_laws": d_spatial_isomorphism(aperiodic.cl_inv, H1Homology(3)),
    "cosheaf": cosheaf,
    "aperiodic_co_clinv_nonzero": co_clinv_aperiodic_witness_nonzero(),
}

# %%
ap_samples = [
    APStageElement(0, flat.cl_inv),
    APStageElement(3, flat.cl_inv),
    APStageElement(5, aperiodic.cl_inv),
]

{
    "flat_stage_independent": ap_system_stage_independent(0, 3, flat.cl_inv),
    "direct_limit_laws": ap_direct_limit_laws(ap_system(), ap_samples),
    "step_three_invariant": step_n_invariant(3, (1, 0, -1)),
    "step_two_is_four": step_two_is_four(),
}

# %%
hull_thread = const_thread(aperiodic.cl_inv, (0, 2, 5))
hull_witness, hull_nonzero = hull_pairs_clinv((0, 2, 5))

{
    "hull_thread_coherent": projection_coherence(ap_hull_system(), hull_thread),
    "hull_seam": seam_map(hull_thread),
    "hull_witness_seam": seam_map(hull_witness),
    "hull_witness_nonzero": hull_nonzero,
    "hull_has_distinct_threads": ap_hull_has_distinct_threads((0, 2, 5)),
}

# %%
rule = StepRule(substitution=((0, 1), (0,)), primitive=True, coord=aperiodic.cl_inv.coord)
shifted_rule = step_shift(rule)

{
    "moduli_point": moduli_point(rule),
    "shifted_depth": shifted_rule.n,
    "shift_preserves_moduli": moduli_point(shifted_rule) == moduli_point(rule),
    "sampled_moduli_stratification": moduli_stack_stratification(
        [rule],
        [moduli_point(rule), flat.cl_inv],
    ),
    "negation_gauge_invisible": negation_gauge_invisible(K4.NEG, [BL(0, 0), BL(1, 1)]),
}

# %%
substitution_matrix = ((1, 1), (1, 0))
identity_2 = identity_matrix(2)
same_coord_rule = StepRule(substitution=((1,), (0, 1)), primitive=True, coord=rule.coord)

{
    "matrix_square": matrix_power(substitution_matrix, 2),
    "right_identity": matrix_multiply(substitution_matrix, identity_2) == substitution_matrix,
    "sse_reflexive_witness": strong_shift_equivalent(
        substitution_matrix,
        substitution_matrix,
        substitution_matrix,
        identity_2,
    ),
    "universality_class": same_universality_class(
        [substitution_matrix, substitution_matrix],
        [(substitution_matrix, identity_2)],
    ),
    "cl_inv_invariant": cl_inv_invariant_of_coord(rule, same_coord_rule),
}

# %%
m_infinity_point = step_n_embed(rule.n, moduli_point(rule))

{
    "chain_preserves_point": chain_preserves_point(rule),
    "m_infinity_point": m_infinity_point,
    "depth_collapse": embed_depth_independent(rule.n, shifted_rule.n, moduli_point(rule)),
    "sigma_infinity_fixed": sigma_infinity_embed_fixed(rule.n, moduli_point(rule)),
    "chain_colimit_laws": step_shift_chain_colimit(
        [rule],
        [moduli_point(rule), flat.cl_inv],
    ),
}

# %%
{
    "silver_matrix": metallic_matrix(2),
    "silver_char_poly": char_poly_metallic(2),
    "silver_quadratic": metallic_quadratic(2),
    "silver_counts": [metallic_num(2, k) for k in range(8)],
    "silver_power_tabulation": metallic_matrix_power_succ(2, 5),
    "silver_convergent": metallic_convergent(2, 5),
    "silver_cassini_values": [metallic_cassini_value(2, k) for k in range(6)],
    "silver_real_convergent_1": metallic_real_convergent(2, 1),
    "silver_exact_gap_1": metallic_abs_convergent_gap(2, 1),
    "silver_gap_bound_1": metallic_gap_step_bound(2, 1),
    "silver_telescope_bound": metallic_convergent_telescope_bound(2, 1, 3),
    "silver_real_witness": metallic_real_witness(2).holds,
}

# %%
{
    "salem_polynomial": char_poly_salem(),
    "unit_circle_trace_root": salem_trace_unit_circle(),
    "real_salem_trace_root": salem_trace_real_root(),
    "determinant_split": det_salem_vs_pisot(),
    "salem_companion_ch": salem_companion_cayley_hamilton(),
    "salem_double_root": salem_trace_double_root(),
    "salem_root_equation": salem_trace_root_equation_holds(),
    "golden_double_root": golden_double_root(),
    "golden_root_equation": golden_root_equation_holds(),
    "silver_exact_root": metallic_root_surd(2),
    "silver_root_equation": metallic_root_equation_holds(2),
    "bronze_root_witness": metallic_root_witness(3).holds,
}

# %%
truth_strong = StrongSettling(aperiodic, FiringType.truth_only)
falsity_strong = StrongSettling(aperiodic, FiringType.falsity_only)

{
    "synonymy": synonymy(truth_strong.base, falsity_strong.base),
    "strong_mld": strong_mld(truth_strong, falsity_strong),
    "antonymy": antonymy(truth_strong, falsity_strong),
}

# %%
k3 = ("a", "b", "c")

{
    "chi_k3": chromatic_number(k3, complete_graph_edges(k3)),
    "chi_k4_four": chromatic_number(FOUR_CHARGE_PALETTE, complete_graph_edges(FOUR_CHARGE_PALETTE)),
    "k4_requires_four": k4_requires_four(),
}

# %%
source_word = ("a", "b", "a")
fib_image = fibonacci_substitute(source_word)

{
    "golden_mean_words_len_4": sorted(golden_mean_words(4)),
    "fibonacci_image": fib_image,
    "fibonacci_image_is_golden": fibonacci_substitution_golden(source_word),
}

# %%
origin = LightConeEvent(0, 0)
future = LightConeEvent(2, 0)
light_ray = LightConeEvent(2, 2)
off_cone = LightConeEvent(1, 2)

{
    "timelike": interval_kind(origin, future),
    "lightlike": interval_kind(origin, light_ray),
    "spacelike": interval_kind(origin, off_cone),
    "diamond": causal_diamond(origin, future),
    "off_cone_incomparable": spacelike_incomparable(origin, off_cone),
}

# %%
golden_bracket = golden_log_bracket(5)
golden_convergence = golden_log_convergence_witness(5)
real_mult = real_multiplication_witness()
sqrt_two = constructive_sqrt_witness(2, 12)
product_estimate = bishop_product_estimate(
    Fraction(2),
    Fraction(1),
    Fraction(79, 40),
    Fraction(39, 40),
    factor_bound=3,
    precision=4,
)

{
    "log_seq_2_3_level_4": log_seq(2, 3, 4),
    "log_additivity_defect_3_5_level_4": log_additivity_defect(2, 3, 5, 4),
    "log_step_bound_10_4": log_step_bound_holds(10, 4),
    "golden_phi_bracket": (golden_bracket.lower, golden_bracket.upper),
    "golden_log2_bracket": (golden_bracket.lower_log2, golden_bracket.upper_log2),
    "golden_log_convergence": (
        golden_convergence.holds,
        golden_convergence.log_width,
        golden_convergence.approximate_log2_phi,
    ),
    "real_multiplication_socket": (
        real_mult.holds,
        product_estimate.holds,
        product_estimate.product_difference,
        product_estimate.bound,
    ),
    "constructive_sqrt_two": (
        sqrt_two.holds,
        sqrt_two.final_approximation,
        sqrt_two.final_square_gap,
    ),
}

# %%
kernel = FiniteMarkovKernel(
    states=("left", "right"),
    transitions={
        ("left", "left"): Fraction(1, 4),
        ("left", "right"): Fraction(3, 4),
        ("right", "left"): Fraction(3, 4),
        ("right", "right"): Fraction(1, 4),
    },
)
uniform = uniform_distribution(kernel.states)

{
    "uniform": uniform,
    "advanced": advance_distribution(kernel, uniform),
    "stationary": advance_distribution(kernel, uniform) == uniform,
}
