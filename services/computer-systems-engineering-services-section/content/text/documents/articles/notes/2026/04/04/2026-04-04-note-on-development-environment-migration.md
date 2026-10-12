---
title: Development Environment Migration
description: Specification for migrating Claude Code development from Windows to a Linux VPS to solve performance, persistence, and remote access limitations.
date-created: 2026-04-04
type: note
name: development-environment-migration
keywords:
  - vps-migration
  - persistent-services
  - remote-development
  - claude-code
  - infrastructure-provisioning
specialization: plan
date-completed: 2026-04-04
department: engineering
cross-cuts: [command]
project: local-service-system
in-service-of: lib/emsenn/services/561-group/services/561-group-services-section
---

## The problem

The current development environment is Claude Code running inside VS Code on Windows 11. This has three documented problems:

1. **Platform bugs.** Claude Code on Windows with WSL installed has a known issue where hook execution resolves to WSL's `bash.exe` instead of Git Bash. The Windows filesystem is measurably slower for file operations than Linux.

2. **No persistence.** When a session ends, nothing keeps running. There is no background engine, no event system, no persistent agent process. The local-service-system project requires a running process — which requires a server.

3. **No remote access.** The system is accessible only from the physical Windows machine. No SSH access, no mobile access, no multi-device workflow.

## The solution

Move the repository and primary development to a Linux VPS accessed via SSH. The VPS provides:
- Native Linux performance for Claude Code and all tooling
- Persistent tmux sessions that survive disconnection
- A machine capable of running local services (SQLite, Node.js engine, HTTP API)
- SSH access from any device
- A path to the local-service-system project's runtime requirements

## What this does NOT change

- The repository structure, FARS substrate, and harness architecture stay the same
- Git remains the sync mechanism — the repo is pushed to GitHub from the VPS just as it is from Windows
- The flatfile system continues working — the VPS is just a better host for it
- Claude Code is the same tool, just running on Linux instead of Windows

## Provider selection

Based on research in the library text on compute infrastructure for small organizations:

**Hetzner CX43 or CX53** is the likely choice — 4-8 vCPU, 16-32 GB RAM, 160-320 GB SSD, 20 TB transfer, at €12-22/month. Closest datacenter to user's location determines region. DigitalOcean is the backup if Hetzner doesn't serve the needed geography.

## Sequencing

The migration is sequential — each step depends on the previous:

1. **Bundle local work** — commit all uncommitted changes, push to GitHub, verify clean state
2. **Provision VPS** — create account, provision server, configure SSH access
3. **Configure environment** — install Node.js, git, tmux, Claude Code on the VPS
4. **Migrate repo** — clone from GitHub, verify all hooks and tooling work
5. **Verify harness** — run install.js, confirm hooks fire, confirm datastore builds
6. **Establish workflow** — set up tmux session structure, configure VS Code Remote SSH or terminal workflow, confirm the daily development pattern works
