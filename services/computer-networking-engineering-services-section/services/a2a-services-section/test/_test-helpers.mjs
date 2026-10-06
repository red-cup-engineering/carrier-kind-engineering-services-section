// Test-only helper: on this host, a socket that has just started listening on an
// ephemeral loopback port occasionally refuses its very first connection attempt
// (observed under WSL2) even though `createA2aServer` already awaited its
// "listening" event. That is a same-process test-timing artifact, not a defect in
// the server: two real, separately-started processes never race this way. Retry
// briefly instead of failing the test on that first connection.
export async function waitForListening(baseUrl, { attempts = 20, delayMs = 15 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fetch(baseUrl);
      return;
    } catch (error) {
      if (attempt === attempts || error?.cause?.code !== "ECONNREFUSED") throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
