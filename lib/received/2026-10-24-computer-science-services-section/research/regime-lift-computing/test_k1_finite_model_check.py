import unittest
from k1_finite_model_check import (
    FiniteCausalSet, k_admissible, componentwise_lift, preserves_sequencing,
    causal_monotone_on_listed, exhaustive_summary, randomized_summary, boundary_mutation_summary
)

class TestK1FiniteModel(unittest.TestCase):
    def test_constant_map_collapse_counterexample(self):
        C=FiniteCausalSet(2,frozenset({0,1}),frozenset({(0,1)}))
        D=FiniteCausalSet(1,frozenset({0}),frozenset())
        f=(0,0)
        self.assertTrue(causal_monotone_on_listed(f,C,D))
        self.assertFalse(k_admissible(f,C,D))
        self.assertIsNone(componentwise_lift(f,C,D))

    def test_identity_is_k_admissible(self):
        C=FiniteCausalSet(3,frozenset({0,1,2}),frozenset({(0,1),(1,2),(0,2)}))
        self.assertTrue(k_admissible((0,1,2),C,C))
        self.assertTrue(preserves_sequencing((0,1,2),C,C))

    def test_isolated_listed_event_imposes_no_diamond_obligation(self):
        C=FiniteCausalSet(2,frozenset({0}),frozenset({(0,1)}))
        D=FiniteCausalSet(1,frozenset({0}),frozenset())
        self.assertTrue(k_admissible((0,0),C,D))

    def test_bad_transitivity_rejected(self):
        with self.assertRaises(ValueError):
            FiniteCausalSet(3,frozenset({0,1,2}),frozenset({(0,1),(1,2)})).validate()

    def test_exhaustive_up_to_three_has_no_sequence_failure(self):
        s=exhaustive_summary(3)
        self.assertGreater(s["maps_tested"],100000)
        self.assertGreater(s["k_admissible_maps"],0)
        self.assertEqual(s["sequencing_failures"],0)
        self.assertGreater(s["monotone_not_k"],0)
        self.assertTrue(s["found_collapse_counterexample"])

    def test_randomized_size_four_has_no_sequence_failure(self):
        s=randomized_summary(n=4,trials=2000,seed=561)
        self.assertEqual(s["sequencing_failures"],0)
        self.assertGreater(s["source_diamond_trials"],0)
        self.assertGreater(s["k_admissible_maps"],0)

    def test_randomized_summary_is_replayable(self):
        self.assertEqual(randomized_summary(n=4,trials=200,seed=7),randomized_summary(n=4,trials=200,seed=7))

    def test_randomized_summary_rejects_boolean_seed_and_trials(self):
        with self.assertRaises(ValueError): randomized_summary(n=4,trials=True,seed=0)
        with self.assertRaises(ValueError): randomized_summary(n=4,trials=10,seed=True)
    def test_boundary_mutation_targets_admissible_neighbors_without_failure(self):
        s=boundary_mutation_summary(n=4,seed_maps=100,seed=901,max_seed_attempts=100)
        self.assertGreater(s["accepted_seed_maps"],0)
        self.assertGreater(s["neighbor_maps_tested"],0)
        self.assertGreater(s["k_admissible_neighbors"],0)
        self.assertEqual(s["sequencing_failures"],0)
    def test_boundary_mutation_is_replayable(self):
        self.assertEqual(
            boundary_mutation_summary(n=4,seed_maps=20,seed=77,max_seed_attempts=50),
            boundary_mutation_summary(n=4,seed_maps=20,seed=77,max_seed_attempts=50),
        )
    def test_boundary_mutation_rejects_boolean_controls(self):
        with self.assertRaises(ValueError): boundary_mutation_summary(n=True)
        with self.assertRaises(ValueError): boundary_mutation_summary(seed_maps=True)
        with self.assertRaises(ValueError): boundary_mutation_summary(max_seed_attempts=True)

if __name__=="__main__": unittest.main()