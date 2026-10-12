# Contracted A2A agent service

This package owns the HTTP/A2A server and the state-source contract required
to run it. A caller chooses exactly one state composition:

- inject `taskStore` or `taskSource` together with `coordinationSource`; or
- set `EMSWEB_A2A_STATE_ROOT` to an absolute filesystem path and
  `EMSWEB_PROVIDER_NAME` to a bounded provider identity.

The filesystem composition is exported as
`@red-cup-engineering/a2a-contracted-agent-service/filesystem-state-sources`.
It partitions records by provider and preserves task and coordination state
across process restarts. It never infers authority from the current working
directory.

Deployment tooling must not rewrite provider source files to inject state.
It supplies the two environment values or passes source objects directly;
`serveContractedAgent` performs the same validation in every runtime.
