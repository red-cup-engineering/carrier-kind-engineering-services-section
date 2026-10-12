// Shannon entropy in bits. The information a forgotten distinction carries: with one composite,
// "was it present?" is one fair bit; k independent composites carry k bits.

export const shannonBits = (weights) => {
  const Z = weights.reduce((a, b) => a + b, 0);
  if (Z === 0) return 0;
  return -weights
    .map((w) => w / Z)
    .filter((p) => p > 0)
    .reduce((h, p) => h + p * Math.log2(p), 0);
};

// Entropy erased when k independent distinctions are forgotten: a fair binary prior over
// {present, absent} for each → exactly k bits.
export const erasureEntropyBits = (k = 1) => k * shannonBits([1, 1]);
