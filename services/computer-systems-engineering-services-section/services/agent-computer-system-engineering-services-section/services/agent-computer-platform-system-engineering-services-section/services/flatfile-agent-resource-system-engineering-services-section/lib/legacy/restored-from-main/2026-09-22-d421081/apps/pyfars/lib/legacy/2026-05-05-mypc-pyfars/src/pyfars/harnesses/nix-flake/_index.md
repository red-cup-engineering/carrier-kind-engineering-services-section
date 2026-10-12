---
kind: harness
title: "Nix flake harness"
type: harness
target-default: "."
target-runtime: "repo-root"
---


Generates the repo-root `flake.nix` from substrate state plus a template owned by this harness, so the deployment description is in sync with the substrate's polity record rather than drifting as static prose.

This is a **rough first cut** — a deployment-substrate harness in the agent-runtime-harness mold, before the FARS *Harness surfaces & interfacers* spec section is drafted. It works for the self-hosted-Unix swarm-participation class (the captain's VPS, the captain's laptop). Other participation classes (MCP-client cloud agents, routable-LLM-endpoints) are out of scope per [`questions/mcp-client-as-swarm-participant.md`](../../../library/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/mcp-client-as-swarm-participant.md) and siblings.

## What it writes

| File | Template | Consumer |
|---|---|---|
| `flake.nix` | [`templates/flake.nix.j2`](templates/flake.nix.j2) | `nix develop`, `nix build`, `nix run`; any nix-aware deployment |

The manifest is written to `.fars/harness-manifests/nix-flake.json`.

## What the flake provides

- `devShells.default` — a shell with Python 3.13, `pyfars`, and git on PATH. Entry point for any human or agent doing substrate work on a host with Nix.
- `packages.pyfars` — PyFARS built as a Nix derivation from the PyFARS flake input.
- `packages.default` — alias for `packages.pyfars`.
- `apps.pyfars` — `nix run .#pyfars -- <args>` invokes PyFARS.

## Substrate context the template sees

- **`polity`** — title and slug from `operations/command/group/<polity>.md`. Used in the flake's `description` and devShell name.
- **`generated_at`** — UTC ISO timestamp.
- **`generation_command`** — the literal command that regenerates the file.

## Run

```bash
pyfars install-harness nix-flake                  # write flake.nix at repo root
pyfars install-harness nix-flake --dry-run        # show what would be written
pyfars install-harness nix-flake --uninstall      # remove via manifest
```

## Status

v0.1, deliberately rough. Known limitations:

- Single output (no per-deployment variants for VPS vs. local-with-LLM yet).
- Nixpkgs pin is by branch (`nixos-unstable`), not by revision — pin to a revision before relying on this for reproducibility across time.
- No NixOS module or home-manager module yet; just a flake providing devShell + package + app.
- Doesn't model FARS's federation/confederation participation classes; the flake describes one host, not a swarm member's role in the swarm.

These are tracked as friction-log entries when they're hit during use.
