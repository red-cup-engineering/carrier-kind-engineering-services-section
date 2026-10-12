# Cold Red Gate projection

This directory is a reviewed, non-activating projection for the recovered gateway. Nothing here installs, enables, starts, or reloads a service.

An operator performing a later cutover must:

1. build and verify an immutable package release;
2. place it at the release path referenced by the unit and update the `current` link recoverably;
3. create `%h/.config/561-group/ops-561-group-mcp-gateway.env` with `OPS_MCP_ALLOWED_EMAIL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`, mode `0600`; to opt into ActivityPub, also provide the complete five-value actor configuration from `.env.example` and provision the referenced key file before startup;
4. verify the upstream `infography-mcp.service` owns loopback port 18811 and answers `/mcp`;
5. verify the actual Caddy configuration routes only the intended public paths to loopback port 18807;
6. install the unit, run `systemd-analyze --user verify`, and inspect the preflight output;
7. only then enable/start it and assay OAuth discovery, rejection, admission, and streaming from an external MCP client.

The Cold Red Gate capture contains a gateway unit but no captured Caddy route proving the public ingress contract. That route remains an explicit deployment prerequisite.
