# Cloud Run carrier

RMN Semantic Conformance is a stateless RML/RMN canonicalization and typed
conformance checker. `src/*.mjs` and `bin/*.mjs` never write to the
filesystem; the service's only local state is the generic A2A protocol task
store that `@emsenn/a2a-contracted-agent-service` keeps for every provider
(one JSON envelope per task, used for task replay/resume), and it is disposable.
Unlike `rwil-rdf-projection-service` or `paid-ephemeris-gateway`, this carrier mounts no
volume and carries no single-instance ceiling — it scales like any other
stateless HTTP service.

Live: `https://rmn-semantic-conformance-1019481907460.us-central1.run.app`
(also reachable at the `*-a2d7mjqbfa-uc.a.run.app` hash form Cloud Run
assigns the same revision).

`deploy.sh` assumes these resources already exist (created once, out of
band, the same way `paid-ephemeris-gateway`'s prerequisites were):

- a billing-enabled Google Cloud project with Cloud Build, Artifact Registry,
  Cloud Run, and Secret Manager APIs enabled;
- the named Artifact Registry Docker repository (`obsmetrological-services`,
  shared with `rwil-rdf-projection-service`);
- a dedicated Cloud Run service account
  (`rmn-semantic-conformance@PROJECT.iam.gserviceaccount.com`);
- Secret Manager secrets `rmn-semantic-conformance-signing-key` (the real
  Ed25519 private key from `data/agent-card-signing/ed25519-private.pem`) and
  `rmn-semantic-conformance-jwks` (the matching public
  `content/agent-card-signing/jwks.json`), with
  `roles/secretmanager.secretAccessor` granted to the runtime service account
  on each secret.

The script does not create IAM, billing, or secrets — those acts require the
account owner's authority. It builds, deploys twice (once to learn the
Cloud Run-assigned URL, once to bind that URL into `BASE_URL` so the served
Agent Card and its JWKS `jku` are correct), and verifies
`/.well-known/agent-card.json` after those prerequisites exist.

Run from any directory:

```bash
GOOGLE_CLOUD_PROJECT=your-project ./ops/cloud-run/deploy.sh
```

## Deviations from the paid-ephemeris-gateway template

- No Rust builder stage and no pinned third-party binary download: this is a
  plain Express/Node A2A server, not a native-binary compute like
  OxiEphemeris.
- `npm install` replaces `npm ci`: the checked-in `package-lock.json` is out
  of sync with `package.json` (`@emsenn/a2a-rmn-task-client-service` moved
  1.0.0 -> 1.1.0, and `express`'s own subtree is missing from the lock
  entirely). `npm ci` refuses; `npm install` resolves the current graph.
- `npm@11` is installed before dependency resolution: the `node:22.18-
  bookworm-slim` base ships npm 10.9.3, which fails to resolve
  `--install-links` across this monorepo's chained `file:` dependencies
  (`a2a-contracted-agent-service` -> `a2a-agent-card-key-service` ->
  `a2a-agent-card-discovery-service`). npm 11 resolves them correctly.
