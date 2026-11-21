---
type: Service
title: plm-lifecycle-watch
description: PLM API update/deprecation watch — model-list presence, served-model drift, docs notice scan, Ollama version.
lilith_safe: false
status: draft
generated: { by: devin/web, at: 2026-11-21T06:30:00Z }
tags: [service, monitoring, plm, deprecation, lifecycle]
repo: dogmaai/magi-moni
---

# Overview

`POST /monitor/plm-lifecycle` on magi-moni (`lib/plm-lifecycle.js`), designed
for a daily Cloud Scheduler trigger. It watches every **active** PLM unit for
API lifecycle events and posts findings to the Discord notification webhook.
The full report is returned in the response JSON; Discord is only notified
when there is at least one finding.

This complements [magi-model-health-check](magi-model-health-check.md)
(`magi-llm-health-monitor`): the health monitor only sees a model that has
already started failing a synthetic probe, while this watch also catches
delistings and announced deprecations before the next trading session, plus
served-model drift that never fails a probe (e.g. the `deepseek-flash`
alias re-pointing, see [CASPER](/system/plm-units/casper.md#provider-model-lifecycle)).

# Checks

1. **Model list presence** — polls each hosted provider's models endpoint and
   verifies the configured model id is listed:
   `openai` `GET /v1/models`, `google` `GET /v1beta/models`,
   `deepseek` `GET /models`, `qwen` `GET /compatible-mode/v1/models`,
   `kimi` `GET /v1/models`, `ollama` `GET /api/tags` (also records the model
   `digest`).
2. **Served-model drift** — `thoughts.model_version` per `unit_name` over the
   last 7 days vs the configured model; any mismatch is a cohort-affecting
   drift (see [model-cohorting](/system/constitution/model-cohorting.md)).
3. **Docs watch** — fetches each provider's deprecations/changelog page
   (`DOC_WATCH` in `lib/plm-lifecycle.js`: platform.openai.com,
   ai.google.dev, api-docs.deepseek.com, alibabacloud model-studio,
   platform.kimi.ai `llms.txt`) and asks Gemini to extract notices that
   mention a watched model. Stateless — no BigQuery state table.
4. **Ollama version** — TIALA `GET /api/version` vs the latest tag in the
   `ollama/ollama` GitHub releases atom; flags when a minor release behind.

# Coverage and limits

- Watchlist = the active roster in
  [plm-units](/system/plm-units/index.md) (`PLM_WATCHLIST`,
  `lib/plm-lifecycle.js`): PROMETHEUS/openai, MELCHIOR-1/google,
  CASPER/deepseek, QWEN/qwen, TYPHON/kimi, BOREAS/ollama.
  `DEPRECATED_PROVIDERS` (together, groq, xai, sakana, lilith, mistral) are
  excluded — no live consumer.
- The docs watch is heuristic: pages without dated entries can be missed,
  and the Gemini extraction is advisory (its failures degrade to a `docs
  watch failed` finding, never a crash).
- Ollama checks are read-only (`/api/tags`, `/api/version`) but require
  `OLLAMA_BASE_URL` / `OLLAMA_AUTH_TOKEN` on the service — the first
  magi-moni→TIALA call path since TIALA remote ops were removed from
  magi-moni on 2026-11-16 (server.js header note; aka-memory is a
  TIALA-side launchd job, not a magi-moni call path). Skipped gracefully
  when unbound.
- Secrets: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`,
  `QWEN_API_KEY`, `KIMI_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_AUTH_TOKEN`
  (all bound via `--update-secrets` in `magi-moni/.github/workflows/deploy.yml`).
- Scheduler: none in-repo — the Cloud Scheduler job is a manual GCP step
  (Jun), POST with OIDC like `/report/daily`.

# Reads / relates to

* [magi-model-health-check](magi-model-health-check.md) — synthetic probes +
  `llm_metrics` failure-streak alerts (reactive layer).
* [plm-units](/system/plm-units/) — the roster under watch.
* [thoughts](/system/echidna-tables/thoughts.md) — `model_version` source
  for the drift check.
