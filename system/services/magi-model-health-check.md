---
type: Service
title: magi-model-health-check
description: Periodic provider/model health checks across the PLM roster.
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-11-09T10:30:00Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
tags: [service, health-check, providers, ops, lifecycle]
repo: dogmaai/magi-core
---

# Overview

Periodically pings each configured provider/model to verify availability,
latency, and cost behaviour, so degraded providers can be flagged before they
affect live trading.

The implementation is the `magi-llm-health-monitor` Cloud Run job in
`magi-core` (`health-monitor.js` at the repo root — no standalone
`magi-model-health-check` repo exists). Coverage note (2026-10-20, Claude
review): the monitor probes the five hosted LLM providers only (google,
deepseek, qwen, kimi, openai — `PROVIDERS` in `health-monitor.js`); the Ollama
units (ADAM/BOREAS on TIALA), the HERMES Gemini model, and the Cohere
models are not covered. The `llm_health_checks` output table exists in
`magi_core` but remains uncatalogued (see the drift backlog in
[echidna-tables/index.md](/system/echidna-tables/index.md)).

# Lifecycle monitor (proposal, draft)

> **Draft — unverified proposal (2026-11-09).** Implementation drafted on
> magi-core branch `feat/model-lifecycle-monitor` (not merged, not deployed).
> Nothing below is live.

The health monitor above only notices a retired model once calls fail
(`model_not_found`). The proposed `magi-model-lifecycle-monitor` Cloud Run job
(`model-lifecycle-monitor.js`, daily) looks for the retirement *before* it
happens.

**Targets — no fixed list, rebuilt every run:**

| Source | How | `runtime` |
|---|---|---|
| Deployed Cloud Run jobs/services (Run Admin API v2) | `LLM_PROVIDER` resolved through `lib/config.js` `getLLMModel()` / `getUnitName()` with that resource's env overlaid; every `*_MODEL` env value | true |
| `lib/config.js` defaults | Only when Cloud Run cannot be listed (providers taken from the OKF roster); the bare Ollama default is not treated as deployed | true (Ollama: false) |
| OKF `system/plm-units/index.md` *Active units* + backticked model IDs in `system/services/*.md` (non-deprecated docs), read from GitHub at `MODEL_LIFECYCLE_OKF_REF` (default `main`) | Specification side | false |
| Model-ID string literals in the deployed image's source | Non-PLM call sites (e.g. ISABEL Cohere, analyzers) | false |

`DEPRECATED_PROVIDERS` from `lib/config.js` are excluded everywhere. The
container image does not include `.github/` or `vendor/`, hence the Run Admin
API and GitHub reads.

**Checks:**

1. *Catalog* — is the model in the provider's model-list endpoint
   (Gemini, OpenAI, DeepSeek, DashScope compatible-mode, Moonshot, Cohere,
   Ollama `/api/tags` on TIALA)? A missing runtime model is `critical`;
   a missing OKF/code-only model is recorded as `missing_unconfirmed`
   (it may be a historical mention or a prefix check). Endpoint failures are
   `error`, never "missing".
2. *Announcements* — official deprecation / changelog pages per provider are
   fetched, fingerprinted and scanned for the model ID or its family
   ("K2 series") next to a retirement keyword; a date and a replacement near
   the mention become *candidates*.
3. *Proposal* — findings are compared with
   [llm_config](/system/echidna-tables/llm-config.md); a change to
   `status` / `successor` / `deprecated_date` is **proposed and notified,
   never written**. No unit model is switched. Successor choice and timing
   are Jun's decision.

Results go to the proposed
[llm_lifecycle_checks](/system/echidna-tables/llm-lifecycle-checks.md) table.
Notifications use magi-core `sendNotification` (introduced by magi-core#708,
Discord-only after #710); on a revision without it the job records results
without sending.

**Cohorts:** a successor switch would not split cohorts while Jun's
2026-11-07 decision stands
([model-cohorting](/system/constitution/model-cohorting.md), draft — "not
applied for now"); the notification does not propose a cohort split.

**Open items (Jun):**

* Grant the job's runtime service account `run.jobs.list` /
  `run.services.list` (e.g. `roles/run.viewer`) — without it the monitor
  falls back to `config.js` defaults.
* Apply the DDL; merge order relative to magi-core#708/#710 (notification).
* Coverage outside this GCP project/region is not reached: magi-moni
  (AKA-1) only if deployed in the listed region, OpenClaw models on TIALA,
  and the Mistral PR-review model in GitHub Actions (`mistral` is in
  `DEPRECATED_PROVIDERS`, so it is excluded by rule even though CI uses it —
  whether to monitor CI-only models is a Jun decision).

# Reads / relates to

* [llm-config](/system/echidna-tables/llm-config.md) — registry of providers/models.
* [llm-metrics](/system/echidna-tables/llm-metrics.md) — telemetry baseline.
* [plm-units](/system/plm-units/) — the roster under test.
* [llm-lifecycle-checks](/system/echidna-tables/llm-lifecycle-checks.md) — proposed lifecycle-monitor output (draft).

# Note

Expand with the concrete health-check schedule and output table in a follow-up
pass.
