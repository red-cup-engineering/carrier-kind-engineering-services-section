// Landauer's principle — the thermal price of erasing information. SI-2019 exact constants.

export const k_B = 1.380649e-23; // Boltzmann constant, J/K (exact)
export const LN2 = Math.LN2; // nats per bit
export const eV = 1.602176634e-19; // J per electronvolt (exact)

// Minimum heat dissipated to erase `bits` of information at temperature T (kelvin): bits·kT·ln2.
// At T = 0 there is no thermal rung and the price is identically zero — erasure is free where
// temperature is undefined, which is the whole point: forgetting loses the bit in every regime,
// but the COST appears only once the descent reaches thermal-spacetime.
export const landauerJoules = (T, bits = 1) => bits * k_B * T * LN2;
export const landauerEV = (T, bits = 1) => landauerJoules(T, bits) / eV;
