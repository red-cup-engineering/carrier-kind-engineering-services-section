# Legacy Anvil actuator

This namespace preserves the former Anvil runner, its systemd configuration,
and its restorable state snapshot as historical reference only. It is not a
live Besu unit and is intentionally absent from the package's public command
exports.

The live settlement trace chain's ID is enforced in `lib/status.mjs`. This package contains no
Besu runtime unit; that absence must be repaired by the owner of a real Besu
deployment, not by reactivating this historical runner.
