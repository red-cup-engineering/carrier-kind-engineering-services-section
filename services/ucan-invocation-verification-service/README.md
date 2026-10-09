# UCAN Invocation Verification Service

This service verifies one official UCAN 0.9.1 invocation against its proof DAG,
signature, audience, attenuation, time bounds, and an injected revocation
observer. It emits an `UcanInvocationVerificationReceipt` only for the exact
requested capability.

The receipt and exact-capability commitments use the v2 semantic-content
envelope with object kind `animating.ucan-semantic-material` and the explicit
empty witness root. This preserves the identity contract formerly provided by
the legacy `animating` aggregate without carrying that aggregate into a
protocol boundary.
