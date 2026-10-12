---
name: stellar-evolution
kind: morphism
domain: star
codomain: star
generator-of: stellar-remnant
status: hacking
---

**Stellar-evolution advances a [star](../../star.md) along its thermalizing orbit** — the morphism that moves a star through the four phases as its composition profile changes, and terminates it at a remnant.
It does not act from outside: it is the star's own [realizing](../../../../../../../../../../../../../realizing/realizing.md) and [forgetting](../../../../../../../../../../../../../forgetting/forgetting.md) being driven by nuclear burning, one stage at a time.
(Translated from the prior research's StellarEvolution triple, staged at `_archive/cosmology/relating-cosmology/stellar-evolution.md`.)

## The orbit

Each burning stage changes what `realizing` backward-recognizes (the composition the history now supports), which knocks the star off the [balancing](../../../../../balancing/balancing.md) fixed point and forces a re-equilibration:

- **Main sequence** — both fixed; H→He in the core, the state drifts slowly *along* the equilibrium locus as hydrogen depletes.
- **Subgiant / red-giant** — core H exhausted; `realizing` commits to the He-core composition but the expanding envelope drives $\gamma<4/3$, so `forgetting` fails: the star falls into the composition-fixed-only phase.
  The local $H^1$ (the "evolution depth") is now nonzero.
- **Helium flash / horizontal branch** — degenerate He ignites, $\gamma>4/3$ is restored, and the star returns to the balancing fixed point under the new He-burning regime.
  Balance can be *re-won* as long as a degenerate equation of state still supplies pressure.
- **AGB / thermal pulses** — each shell flash is a perturbation with no forward preimage; balance is broken repeatedly and irreversibly.

The Hertzsprung–Russell trajectory is the projection of this orbit onto $(\log L, \log T_{\rm eff})$.
The main-sequence turnoff of a star cluster is the orbit's clock: the most thermalizing-debt stars leave first, so the turnoff slides down the band as the cluster ages.

## Where the orbit ends — the spectral horizon

Mass fixes the terminus.
Below the spectral horizon, the orbit halts at a **stellar-remnant** that holds balance permanently on degeneracy pressure — a white dwarf, a neutron star: a thermal-but-not- collapsed pocket.
At the horizon, balance cannot be restored by any equation of state:

- **Chandrasekhar limit ≈ 1.4 $M_\odot$** (white dwarfs) and **Tolman–Oppenheimer–Volkoff ≈ 2–3 $M_\odot$** (neutron stars) are the thresholds where $\gamma_{\rm eff}\to 4/3$ globally and every mode's thermalizing-debt exceeds what the structure can carry.

Past it, the star drops to the *neither-fixed* phase and `thermalizing` completes locally: the remnant is the [black-hole](../../../black-hole/black-hole.md).
The **Type Ia supernova** is the sharp case — an accreting white dwarf crossing Chandrasekhar releases its entire accumulated thermalizing-debt as thermonuclear energy; because the threshold is set by fundamental constants, every Type Ia releases nearly the same debt, which is *why* it is a standard candle (the spectral horizon is universal).
That standardizability is what the [cosmic-distance-ladder](../../../../../cosmology/cosmology.md) leans on — so the star's thermalizing orbit feeds directly back into how the field is measured.
