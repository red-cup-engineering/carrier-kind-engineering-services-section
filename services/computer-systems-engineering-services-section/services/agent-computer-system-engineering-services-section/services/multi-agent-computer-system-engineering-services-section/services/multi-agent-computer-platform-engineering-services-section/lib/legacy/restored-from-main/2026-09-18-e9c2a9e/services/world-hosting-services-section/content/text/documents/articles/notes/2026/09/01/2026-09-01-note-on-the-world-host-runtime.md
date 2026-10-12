---
title: The World-Host Runtime
description: A public game world site is data, not a fork. The serving runtime composes once in world-hosting-services-section custody, completing multi-tenancy for the goal-stack roadmap.
date-created: 2026-09-01
type: note
name: world-host-runtime
keywords:
  - world-hosting-architecture
  - parameterization
  - game-sites
  - multi-tenancy
  - runtime-composition
  - footing-gcs-persistence
---


**Ruling:** Chief Engineer, this session, 2026-09-01. Current law.

---

## The hosting law

A public game world site is data, not a fork. The serving runtime — HTTP wiring, qwzspace room mounting, feltos world boot, footing GCS persistence, the TUFTE web face, identity tiers — composes once, in this section's custody, completing the multi-tenancy edge the goal-stack roadmap names for world-hosting. A site (farstone, tidepool, any tenant world) reduces to: a world definition (feltos world modules and seed), a parameter set (domain, bucket, tier, identity policy), and a TUFTE document parameterization.

## Measured violation

Farstone and tidepool are forked copies of the same site skeleton (serve, http-wiring, world-store, clock-store, gcs transport — the GCS transport half is already consolidated into @red-cup-engineering/footing). The public-properties law (org-layering: properties are parameterizations over shared upstream services, never bespoke daemons) applies to game worlds exactly.

## Sequence

After the footing cut-over lands, extract the host runtime from farstone (the deeper implementation) into this section; farstone becomes the first parameterization; tidepool the second, gaining its TUFTE face per the games-substrate DAG ruling (games section note, same date); tenant worlds follow, turning the tier catalog's provisioning plan into runnable tenancy. This section's absent public face (noted in its README thread) is downstream of the runtime existing.

## Deploy lane

Worlds deploy to cold-red-gate under the release convention (release dir + `current` symlink + release-local `.npmrc` + systemd `--user` unit + Caddy block), fronted by the cloudflare-router Worker mapping the domain to `http://ops.561.group:<port>` (farstone: 8080→18820, live). Static catalog faces (mud.561.group, play.561.group) are Workers static-assets deployments with no origin. World state on the VPS is a local file under `~/.local/state/561-group/<world>/` (`FELTOS_SAVE`); GCS is unreachable from the VPS by design — the house GCS client authenticates by ambient workload identity only, and no metadata server exists there — so footing's GCS transport is a capability of the runtime, not the VPS production path. Tidepool serves at `tidepool.561.group` (already a Cloudflare route; its Cloud Run origin is dead with billing off); `tidepool.emsenn.net` has no DNS record and is not the property's address.
