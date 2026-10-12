"""Closure-rule systems (RelMath.Closure.ClosureRuleSystem).

A closure-rule system is an immediate-consequence operator: each positive rule
has an antecedent predicate on the current value and a consequent value to join
in when it fires. The generated closure is the least fixed point of this
operator above the seed.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

from pymetrologic.closure import FiniteLattice, iterate_to_fixpoint

E = TypeVar("E")

__all__ = [
    "ClosureRule",
    "ClosureRuleClosureWitness",
    "ClosureRuleSystem",
    "always_rule",
    "generated_closure_is_least",
    "immediate_consequence_lfp",
]


@dataclass(frozen=True)
class ClosureRule(Generic[E]):
    """A positive rule with a single consequent contribution."""

    antecedent: Callable[[E], bool]
    consequent: E
    name: str = "rule"


@dataclass(frozen=True)
class ClosureRuleClosureWitness(Generic[E]):
    """The generated closure as a least fixed point above a seed."""

    seed: E
    closure: E
    iterations: int
    inflationary: bool
    closed: bool
    rule_respecting: bool
    least_closed_above_seed: bool

    @property
    def holds(self) -> bool:
        """All legs of the generated-closure theorem hold."""
        return (
            self.inflationary
            and self.closed
            and self.rule_respecting
            and self.least_closed_above_seed
        )


@dataclass(frozen=True)
class ClosureRuleSystem(Generic[E]):
    """A finite closure-rule system over a finite lattice."""

    lattice: FiniteLattice[E]
    rules: tuple[ClosureRule[E], ...]

    def rule_is_positive(self, rule: ClosureRule[E]) -> bool:
        """Check positivity: ``a <= b`` and antecedent(a) implies antecedent(b)."""
        return all(
            not rule.antecedent(a) or rule.antecedent(b)
            for a in self.lattice.elements
            for b in self.lattice.elements
            if self.lattice.leq(a, b)
        )

    def is_positive(self) -> bool:
        """Return whether every rule is positive in the lattice order."""
        return all(self.rule_is_positive(rule) for rule in self.rules)

    def fire(self, value: E) -> E:
        """Join all consequents whose antecedents hold at ``value``."""
        acc = self.lattice.bot
        for rule in self.rules:
            if rule.antecedent(value):
                acc = self.lattice.join(acc, rule.consequent)
        return acc

    def step(self, value: E) -> E:
        """The immediate-consequence operator ``T_S(v) = v join fire_S(v)``."""
        return self.lattice.join(value, self.fire(value))

    def is_closed(self, value: E) -> bool:
        """A value is ``S``-closed iff one immediate-consequence step adds nothing."""
        return self.lattice.eq(self.step(value), value)

    def respects_rules(self, value: E) -> bool:
        """Every fired consequent already sits below an ``S``-closed value."""
        return all(
            not rule.antecedent(value) or self.lattice.leq(rule.consequent, value)
            for rule in self.rules
        )

    def generated_closure(self, seed: E) -> tuple[E, int]:
        """Iterate ``T_S`` to the generated closure ``cl^S(seed)``."""
        if not self.is_positive():
            msg = "closure-rule systems require positive antecedents"
            raise ValueError(msg)
        return iterate_to_fixpoint(self.lattice, self.step, seed)

    def generated_closure_witness(self, seed: E) -> ClosureRuleClosureWitness[E]:
        """Bundle the generated-closure least-fixed-point laws."""
        closure, iterations = self.generated_closure(seed)
        closed_above = [
            candidate
            for candidate in self.lattice.elements
            if self.lattice.leq(seed, candidate) and self.is_closed(candidate)
        ]
        return ClosureRuleClosureWitness(
            seed=seed,
            closure=closure,
            iterations=iterations,
            inflationary=self.lattice.leq(seed, closure),
            closed=self.is_closed(closure),
            rule_respecting=self.respects_rules(closure),
            least_closed_above_seed=all(
                self.lattice.leq(closure, candidate) for candidate in closed_above
            ),
        )


def always_rule(consequent: E, *, name: str = "always") -> ClosureRule[E]:
    """A trivial-antecedent rule that always contributes ``consequent``."""
    return ClosureRule(lambda _value: True, consequent, name=name)


def generated_closure_is_least(system: ClosureRuleSystem[E], seed: E) -> bool:
    """Return whether ``cl^S(seed)`` is inflationary, closed, rule-respecting, and least."""
    return system.generated_closure_witness(seed).holds


def immediate_consequence_lfp(
    system: ClosureRuleSystem[E], seed: E
) -> ClosureRuleClosureWitness[E]:
    """Return the least fixed-point witness for the immediate-consequence operator."""
    return system.generated_closure_witness(seed)
