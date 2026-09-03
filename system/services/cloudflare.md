---
type: Service
title: Cloudflare (AI Search, R2 Data Catalog, Named Tunnel, AI Gateway)
description: How MAGI uses Cloudflare — the magi-document AI Search mirror and okf.system Iceberg mirror of this spec on the magi-system bucket, the Named Tunnels exposing TIALA services, and the default AI Gateway behind AI Search.
lilith_safe: false
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
| 3 | Named Tunnel (`cloudflared`) | `moomoo-bridge`, `ollama`, `openclaw-gateway` on TIALA | Stable HTTPS hostnames for on-prem services. |
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
  `system/`; `scripts/r2_catalog_sync.py` fully replaces the table each run.
* Consumers: R2 SQL Studio, Spark, DuckDB, PyIceberg — analytical access
  only. Runtime PLM units do not read it.
* Runbook: `.agents/skills/syncing-spec-to-r2-data-catalog/SKILL.md`
  (token requirements, manual refresh, verification).

# 3. Named Tunnels — TIALA services

`cloudflared` Named Tunnels give TIALA-hosted services fixed hostnames
instead of rotating `*.trycloudflare.com` Quick Tunnel URLs. All ingresses
are plain `http://localhost:<port>`; the tunnel gRPC setting stays disabled.

| Service | Origin on TIALA | Consumer |
|---|---|---|
| `moomoo-bridge` (`opend-proxy`) | Flask, `localhost:11436` | [magi-moomoo](magi-moomoo.md) proxy → magi-core |
| `ollama` | Ollama REST API | ADAM ([PLM unit](/system/plm-units/adam.md)) |
| `openclaw-gateway` | OpenClaw Gateway | AKA / [magi-moni](magi-moni.md), Devin |

Tunnel URLs are registered in
[service_endpoints](/system/echidna-tables/service-endpoints.md) by
`register-tunnel.py`, so callers discover them dynamically. Setup scripts and
protocol guidance are in `dogmaai/magi-moomoo` (`scripts/README.md`,
`scripts/setup-*-named-tunnel.sh`,
`.agents/skills/cloudflare-tunnel-protocols/SKILL.md`).

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
