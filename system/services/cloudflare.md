---
type: Service
title: Cloudflare (AI Search, R2 Data Catalog, Named Tunnel, AI Gateway)
description: How MAGI uses Cloudflare — the magi-document AI Search mirror and okf.system Iceberg mirror of this spec on the magi-system bucket, the Named Tunnels exposing TIALA services, and the default AI Gateway behind AI Search.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-05T02:30:00Z }
verified: [{ by: human:jun, at: 2026-09-03T09:04:15Z }, { by: devin/cli, at: 2026-09-16T07:25:00Z }]
stale_after: 2027-03-16T07:25:00Z
tags: [service, cloudflare, r2, ai-search, tunnel, ai-gateway]
repo: infra (Cloudflare account c3b51b9f35d16713caab757feca638d8)
---

# Overview

Cloudflare is infrastructure, not a MAGI repository. The account
`c3b51b9f35d16713caab757feca638d8` (Dogma.ai) is used for four things:

| # | Product | MAGI resource | Role |
|---|---|---|---|
| 1 | AI Search (AutoRAG) | instance `magi-document` | Retrieval mirror of this bundle's `system/` tree. |
| 2 | R2 + R2 Data Catalog (Apache Iceberg) | bucket `magi-system`, table `okf.system` | Analytical (SQL) mirror of the same tree. |
| 3 | Named Tunnel (`cloudflared`) | `magi-bridge`, `magi-ollama`, `magi-openclaw` on TIALA | Stable HTTPS hostnames for on-prem services. |
| 4 | AI Gateway | gateway `default` | Carries AI Search's own model calls (separate from `magi-llm`). |

Both spec mirrors (1, 2) are **caches**: this repository is the source of
truth, and every refresh regenerates them from `main`. Operational runbooks
live in `.agents/skills/` and are referenced below rather than duplicated.

# 1. AI Search — `magi-document`

* Source: R2 bucket `magi-system`, include `okf/system/**`, exclude
  `__r2_data_catalog/**` (the Iceberg internals from #2 live in the same
  bucket and must not be embedded).
* Objects are uploaded by `scripts/ai_search_r2_sync.py` (workflow
  `ai-search-sync.yml`, on push to `main`) with the OKF frontmatter fields
  (`type`, `lilith_safe`, `version`, `status`, `tags`) as custom metadata.
  The sync lists the managed prefix once and re-uploads only objects whose
  ETag differs from the local file's MD5, so unchanged runs cost a single
  `ListObjects` instead of a PUT per document.
* The index refreshes on a 6 h schedule; an immediate re-index is a
  `PATCH .../autorag/rags/magi-document/sync`.
* Runbook: `.agents/skills/configuring-cloudflare-ai-search/SKILL.md`
  (path-filter globs, metadata schema, API access, verification).

# 2. R2 Data Catalog — `okf.system`

* Iceberg REST catalog on the `magi-system` bucket (warehouse
  `c3b51b9f35d16713caab757feca638d8_magi-system`), namespace `okf`, table
  `system` — one row per concept doc in `system/`, with `source_revision`
  set to the git short SHA that was synced.
* Refreshed by the `R2 Data Catalog Sync` workflow
  (`.github/workflows/r2-catalog-sync.yml`) on merges to `main` that touch
  `system/`; `scripts/r2_catalog_sync.py` scans the table and skips the
  overwrite entirely when the built rows match (no Iceberg commit, no R2
  writes), so `source_revision` records the revision that last changed the
  content. `--force` rewrites unconditionally.
* Consumers: R2 SQL Studio, Spark, DuckDB, PyIceberg — analytical access
  only. Runtime PLM units do not read it.
* Runbook: `.agents/skills/syncing-spec-to-r2-data-catalog/SKILL.md`
  (token requirements, manual refresh, verification).
* The workflow is also the cicd-sensor PoC target (Jun-approved,
  monitor-only intent): `r2-catalog-sync.yml` runs
  `cicd-sensor/cicd-sensor-action` first and forwards runtime traces to
  the Takumi Shisho Cloud Manager via OIDC
  (`flatt-security/shisho-cloud-action`, `environment: cicd-sensor`,
  `id-token: write`). Under manager mode the project-local
  `.cicd-sensor/config.yaml` is ignored, so `monitor_mode` is enforced
  manager-side — see `log.md` 2026-10-05 for rollout state.

# 3. Named Tunnels — TIALA services

`cloudflared` Named Tunnels give TIALA-hosted services fixed hostnames
(`<name>.khaos.company` in the `khaos.company` zone) instead of rotating
`*.trycloudflare.com` Quick Tunnel URLs. All ingresses are plain
`http://localhost:<port>`; the tunnel gRPC setting stays disabled.

| Tunnel | Public hostname | Origin on TIALA | Consumer |
|---|---|---|---|
| `magi-bridge` | `bridge.khaos.company` (`service='opend-proxy'`) | Flask, `localhost:11436` | [magi-moomoo](magi-moomoo.md) proxy → magi-core — since 2026-09 the **fallback** leg of magi-moomoo's dual-route bridge path (private WireGuard route preferred; see magi-moomoo.md). Retirement planned after a private-route stability observation period. |
| `magi-ollama` | `ollama.khaos.company` | Ollama REST API | [ADAM](/system/plm-units/adam.md) and [BOREAS](/system/plm-units/boreas.md) (legacy: [TIARA](/system/plm-units/tiara.md)) |
| `magi-openclaw` | `openclaw.khaos.company` | OpenClaw Gateway | AKA / [magi-moni](magi-moni.md), Devin |

Tunnel names are verified via the Cloudflare Tunnel API (2026-10-03,
`cfd_tunnel` list: `magi-bridge`/`magi-ollama`/`magi-openclaw`, all
`healthy`; each hostname is a CNAME to `<id>.cfargotunnel.com`) and match
the magi-moomoo setup-script defaults (`OLLAMA_TUNNEL_NAME`,
`OPENCLAW_TUNNEL_NAME`, `CLOUDFLARE_TUNNEL_NAME`). URL discovery is split:
the `magi-bridge` and `magi-openclaw` hostnames are registered in
[service_endpoints](/system/echidna-tables/service-endpoints.md) by
`register-tunnel.py` (`service='opend-proxy'` / `service='openclaw'`), while
the `magi-ollama` hostname is not in that table — PLM jobs receive it via the
`OLLAMA_BASE_URL` secret in GCP Secret Manager (`deploy.yml`
`--set-secrets`). Setup scripts and protocol guidance are in
`dogmaai/magi-moomoo` (`scripts/README.md`,
`scripts/setup-*-named-tunnel.sh`,
`.agents/skills/cloudflare-tunnel-protocols/SKILL.md`).

## Ingress authentication (measured 2026-10-05)

No Cloudflare Access application covers any `*.khaos.company` hostname
(account `access/apps` returned zero entries on 2026-10-05; zone-scoped
Access/Workers checks could not be enumerated with the `magi-tunnel-devin-20261002`
token's Tunnel:Edit + DNS:Edit scope, but unauthenticated probes reach the
origins directly, which rules out an Access front door). Each hostname
therefore relies on its origin service's own authentication:

| Hostname | Auth mechanism | Enforcement point | Observed state (2026-10-05) |
|---|---|---|---|
| `bridge.khaos.company` | `BRIDGE_AUTH_TOKEN` Bearer on every path except `GET /health` | `magi-moomoo/bridge/moomoo_bridge.py` `require_bridge_auth` | **Enforced since 2026-10-05** — `/health` reports `auth_required:true` and unauthenticated `/positions` returns 401. `MOOMOO_BRIDGE_AUTH_TOKEN` was created in GSM the same day (the rollout merged in PRs #73–#82 had never created it); TIALA has no gcloud so the bridge reads `~/.config/magi-moomoo/bridge.env` via the `com.magi.bridge` plist, and the Cloud Run proxy binds `BRIDGE_AUTH_TOKEN=MOOMOO_BRIDGE_AUTH_TOKEN:latest`. |
| `openclaw.khaos.company` | `OPENCLAW_GATEWAY_TOKEN` Bearer | OpenClaw Gateway itself — `~/.openclaw/openclaw.json` `gateway.auth.mode=token` on TIALA | **Enforced** — unauthenticated `POST /v1/chat/completions` returns 401; `GET /health` and the Control UI static assets are public by design. GSM `OPENCLAW_GATEWAY_TOKEN` exists; injected copies can go stale on rotation (see [secrets-inventory](secrets-inventory.md)). |
| `ollama.khaos.company` | `OLLAMA_AUTH_TOKEN` Bearer | `magi-moomoo/scripts/ollama-auth-proxy.py` on `127.0.0.1:11437`, in front of `127.0.0.1:11434` raw Ollama | **Remediation in progress** — auth proxy + `com.magi.ollama-auth-proxy` LaunchAgent installed and verified on TIALA (unauthenticated → 401, token → 200 incl. streaming inference); public ingress still points at raw Ollama until the deploy of magi-core PR #578 (squash-merged 2026-10-05 as `9641da36`; adds the `Authorization` header + `OLLAMA_AUTH_TOKEN` secret binding to ADAM/BOREAS) rolls out, then `config-magi-ollama.yml` repoints to the proxy port. Until that flip the raw API answers unauthenticated: `GET /api/tags` and `GET /api/version` → 200, and `POST /api/pull` / `DELETE /api/delete` reach the Ollama handler (400 validation errors — gated only by request shape, not auth). |

Before remediation the Ollama exposure let any internet client run
inference against TIALA's models; unauthenticated probes on 2026-10-05
also reached the write handlers (`POST /api/pull` and `DELETE /api/delete`
returned Ollama validation errors, not an auth rejection), so model-store
mutation requests were accepted for processing too. The `local.ollama-proxy`
LaunchAgent on `127.0.0.1:11435` only rewrites Host headers for local
clients and was never in the tunnel path. Implementation revisions behind
the table above: magi-moomoo main `87d5410a` (bridge code), magi-moomoo
`feat/ollama-auth-proxy` `6b0c1def` (PR #85, `ollama-auth-proxy.py`),
magi-core `9641da36` (post-#578 caller side). Longer-term options
(Cloudflare Access service-token, or moving PLM jobs onto the private
WireGuard route once they have VPC egress) remain open policy decisions
for Jun.

# 4. AI Gateway — `default`

AI Search routes its own embedding and answer-generation calls (Workers AI
models such as `@cf/qwen/qwen3-embedding-0.6b`) through the `default`
gateway. This is deliberately separate from the `magi-llm` gateway, which
carries the PLM units' provider traffic; unfamiliar models in `default` are
identified by the log entry's `metadata` (`"ai-search": "magi-document"`),
not treated as leaks.

# Contamination boundary

Only `system/` is ever pushed to Cloudflare. [_lilith_safe/](/_lilith_safe/)
is never uploaded to `magi-system`, indexed by `magi-document`, or written to
`okf.system` — both surfaces are cross-unit, and `r2_catalog_sync.py`
refuses `--tree _lilith_safe`.
