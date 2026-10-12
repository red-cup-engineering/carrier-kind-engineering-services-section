---
name: dequantizing
kind: morphism
symbol: "λ_trop = ln λ_R"
description: "Maslov dequantization: the morphism relating the additive (tropical) and multiplicative (real) readings of the cosmic-scott-skeleton eigenvalue. The corpus runs the SAME continuous-V theorem over the multiplicative-real semiring R and the tropical semirings; tropical is the ln-limit of R. Since H = dN/dt is an e-fold rate (N = ln a), H lives natively in tropical/log space, so the FUNDAMENTAL Hubble tension is the additive difference ΔH, and the multiplicative ratio (~φ^(1/6)) is its exp-dual artifact. Discharges the units gap."
member-of: weighted-tropical-reading
kind-of: dequantization
domain: weighted-tropical-reading
codomain: weighted-tropical-reading
status: hacking
---

**Dequantizing** is the morphism that fixes the additive-vs-multiplicative units of the [`duality-gap`](../duality-gap/duality-gap.md), grounded — not invented.

## It is Maslov dequantization (grounded)

The corpus benchmark runs the **same** continuous-V theorem over both the **multiplicative-real semiring $\mathbf{R}$** (§2D) and the **tropical** semirings (§2E).
That relationship is exactly **Maslov dequantization**: tropical (max/min-plus, additive) is the $\ln$-limit of multiplicative $\mathbf{R}$.
So additive-vs-multiplicative is not a units fudge — it is the two corpus value-categories of one theorem, related by $\log$:

- multiplicative-$\mathbf{R}$ eigenvalue $\lambda_R$ — a dimensionless growth *factor* (like $\varphi$);
- tropical eigenvalue $\lambda_{\text{trop}} = \ln \lambda_R$ — an e-fold *rate*, the $H$-like object.

## $H$ is natively a log-space object

Cosmology: $N = \ln a$ (e-folds) is *the* additive expansion variable, and $H = dN/dt$ is an e-fold **rate**.
So the **fundamental** Hubble tension is the *additive difference* $\Delta H \approx 5.7$ km/s/Mpc (the corpus tropical eigenvalue), and the multiplicative ratio $\approx \varphi^{1/6}$ is its $\exp$-dual — a derived artifact, not the deep object.
Numerically:

$$\ln\frac{H_{\text{late}}}{H_{\text{early}}} = \ln\frac{73.04}{67.36} = 0.0810 \;\approx\; \frac{\ln\varphi}{6} = 0.0802 \quad (0.9\%).$$

The [`duality-gap`](../duality-gap/duality-gap.md)'s closed form $|w_a-w_b|/2$ is *already additive* — consistent with $H$ in tropical/log space, no conversion needed.

## Consequence

This **discharges** the units bound: the additive form is primary.
It also retires the old "why a sixth root" puzzle — $\varphi^{1/6}$ is a *multiplicative restatement* of an additive gap, the natural form here (the cell's [phi-sixth-root note](../../../../../docs/dev/notes/phi-sixth-root-numerology.md) is its prior record).
