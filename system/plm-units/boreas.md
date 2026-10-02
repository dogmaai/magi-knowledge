---
type: PLM Unit
title: BOREAS
description: Local Mistral-family Ollama unit (ministral-3:8b-ctx32k) on TIALA, entering live NORMAL trading per Jun's 2026-09-22 decision.
lilith_safe: false
status: stable
generated: { by: devin/cloud, at: 2026-10-02T00:00:00Z }
verified: { by: human:jun, at: 2026-10-02T00:00:00Z }
stale_after: 2027-03-22T00:10:00Z
tags: [plm, ollama, self-hosted, mistral, ministral, proposed]
provider: ollama
model: ministral-3:8b-ctx32k
unit_status: active
budget_weight_normal: 1.0
cloud_run_job: magi-core-boreas
---

# Overview

BOREAS is a self-hosted Ollama PLM unit running the Mistral-family
`ministral-3:8b-ctx32k` model locally on TIALA (Mac mini M4 16 GB). It
originally ran `ministral-3:14b`, which was selected because
`mistral-small3.x:24b` (~14 GB) did not fit comfortably in TIALA's
unified-memory GPU budget; however the 14b Q4_K_M weight file (~16.8 GB)
still exceeded physical RAM, so every request thrashed pages from disk
(~130 tok/s prompt eval, HTTP 524 timeouts through the Cloudflare tunnel).
On 2026-10-02 Jun approved replacing it with `ministral-3:8b` (6.0 GB),
rebuilt locally as `ministral-3:8b-ctx32k` with `PARAMETER num_ctx 32768`
(KV cache ~4.5 GB; ~3k tok/s prompt eval observed). The weights live on
TIALA's external SSD at `/Volumes/Extention_SSD/ollama-models/` (the
`~/.ollama/models` symlink target), shared with `qwen2.5:7b` (ADAM).

Like [ADAM](adam.md), BOREAS uses the `ollama` provider path with an explicit
`UNIT_NAME=BOREAS` override, so the session prompt resolves to the shared
`[BOREAS IDENTITY - COLLABORATIVE ANALYST]` block in
`magi-core/src/session.js`. Jun decided on 2026-09-22 to onboard it directly
in `TRADE_MODE=NORMAL` (live order submission via `BROKER=moomoo`), skipping
the SHADOW onboarding convention used by [CASPER](casper.md) and
[MELCHIOR-1](melchior-1.md). Because the `ollama` provider is shared, BOREAS
and ADAM each draw the full `ollama_NORMAL` budget weight per session — the
combined ollama-provider capital allocation is therefore 2× the single-unit
share until Optuna re-optimizes the weights.

Note the naming: the `mistral` *provider* is [SOPHIA-5](sophia-5.md) (the
Mistral API). BOREAS is a Mistral-*family open weight* served by the `ollama`
provider, not the Mistral API.

# Configuration

| Field | Value |
|---|---|
| Provider | `ollama` |
| Unit name | `BOREAS` (`UNIT_NAME=BOREAS`) |
| Model | `ministral-3:8b-ctx32k` (`OLLAMA_MODEL=ministral-3:8b-ctx32k`) |
| Context | `num_ctx 32768` (baked into the model via Modelfile) |
| Trade mode | `TRADE_MODE=NORMAL` (live) |
| Budget weight (NORMAL) | `1.0` (shares `ollama_NORMAL`) |
| Cloud Run job | `magi-core-boreas` |
| Cloud Scheduler | `magi-scheduler-boreas`, `45 14,16,18,20 * * 1-5` UTC |
| Memory / timeout / retries | `512Mi` / `15m` / `0` |

The `:45` minute keeps the standard 14/16/18/20 UTC weekday cadence without
colliding with the other PLM minute slots (`:15` ADAM, `:30` SOPHIA-5, `:40`
TYPHON, `:50` PROMETHEUS, `:54` CASPER, `:55` QWEN) and leaves a 30-minute
gap after ADAM's `:15` runs — relevant because ADAM and BOREAS share TIALA's
single GPU: `qwen2.5:7b` (~4.7 GB) + `ministral-3:8b` (6.0 GB) weights alone
already total ~10.7 GB against the ~10.7 GB Metal budget, and BOREAS's
~4.5 GB KV cache at `num_ctx 32768` pushes the combined footprint to ~15 GB.
The two models cannot stay resident together, so simultaneous runs still pay
a model-reload penalty.

# Relationships

* The Ollama provider path is shared with [ADAM](adam.md) and legacy
  [TIARA](tiara.md); BOREAS does not displace either — it is an additional
  unit on the same provider/budget slot.
* BOREAS succeeds [SOPHIA-5](sophia-5.md): the hosted-Mistral unit was
  retired on 2026-09-22 because the Mistral-family slot moved to this
  self-hosted model. BOREAS also takes over as surge-detector
  `SECONDARY_JOB` (`magi-core-boreas`).
* Inference reaches TIALA through the same `OLLAMA_BASE_URL` path as ADAM
  (Cloudflare `magi-ollama` Named Tunnel; see
  [cloudflare](/system/services/cloudflare.md)). Sessions stream via SSE
  (`stream: true`) since magi-core#536 to stay under the tunnel's ~100 s
  idle limit, and the ollama provider caps the assembled system prompt at
  60,000 chars (`PROMPT_BUDGET_CHARS`, `lib/promptBudget.js`), dropping
  briefing → findings → symbol-vix → ISABEL-insights before HERMES.
* Do not confuse with the `mistral` provider ([SOPHIA-5](sophia-5.md)),
  which calls the hosted Mistral API, not local Ollama.

# Trading history & performance

Live unit: query `trades` / `thoughts` where `unit_name='BOREAS'`. All
sessions before 2026-10-02 failed inside the LLM call path (Ollama 0.33.1
tool-call 500s on 14b, then 524 proxy timeouts), so `sessions` rows exist
without matching `thoughts`/`trades` for that window.

# Citations

* `magi-core/lib/config.js` (`UNIT_NAME` override in `getUnitName`,
  `OLLAMA_MODEL` in `getLLMModel`, `ollama_NORMAL` budget weight).
* `magi-core/src/session.js` (Ollama collaborative analyst prompt,
  parameterized by resolved unit name).
* `magi-core/src/llm.js` (`readOllamaStream` SSE reader, magi-core#536).
* `magi-core/.github/workflows/deploy.yml` (`magi-core-boreas`,
  `magi-scheduler-boreas`).
