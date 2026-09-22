---
type: PLM Unit
title: BOREAS
description: Local Mistral-family Ollama unit (ministral-3:14b) on TIALA, entering in SHADOW mode.
lilith_safe: false
status: draft
generated: { by: devin/cloud, at: 2026-09-22T00:10:00Z }
stale_after: 2027-03-22T00:10:00Z
tags: [plm, ollama, self-hosted, mistral, ministral, shadow, proposed]
provider: ollama
model: ministral-3:14b
unit_status: shadow
budget_weight_normal: 1.0
cloud_run_job: magi-core-boreas
---

# Overview

BOREAS is a proposed self-hosted Ollama PLM unit running the Mistral-family
`ministral-3:14b` model locally on TIALA (Mac mini M4 16 GB). The model was
selected because `mistral-small3.x:24b` (~14 GB) does not fit comfortably in
TIALA's unified-memory GPU budget alongside resident services, while
`ministral-3:14b` (~8.5 GB download, ~8.7 GB resident at 4096 context) loads
100% on Metal. The weights live on TIALA's external SSD at
`/Volumes/Extention_SSD/ollama-models/` (the `~/.ollama/models` symlink
target), shared with the existing `qwen2.5:7b` / `qwen3.5:9b` models.

Like [ADAM](adam.md), BOREAS uses the `ollama` provider path with an explicit
`UNIT_NAME=BOREAS` override, so the session prompt resolves to the shared
`[BOREAS IDENTITY - COLLABORATIVE ANALYST]` block in
`magi-core/src/session.js`. It enters in `TRADE_MODE=SHADOW` — the same
onboarding convention as [CASPER](casper.md) and [MELCHIOR-1](melchior-1.md) —
so it generates decisions into `trades_shadow` / `thoughts_shadow` without
submitting live orders. Promotion to live trading is a separate decision.

Note the naming: the `mistral` *provider* is [SOPHIA-5](sophia-5.md) (the
Mistral API). BOREAS is a Mistral-*family open weight* served by the `ollama`
provider, not the Mistral API.

# Configuration

| Field | Value |
|---|---|
| Provider | `ollama` |
| Unit name | `BOREAS` (`UNIT_NAME=BOREAS`) |
| Model | `ministral-3:14b` (`OLLAMA_MODEL=ministral-3:14b`) |
| Trade mode | `TRADE_MODE=SHADOW` |
| Budget weight (NORMAL) | `1.0` (shares `ollama_NORMAL`) |
| Cloud Run job | `magi-core-boreas` |
| Cloud Scheduler | `magi-scheduler-boreas`, `45 14,16,18,20 * * 1-5` UTC |
| Memory / timeout / retries | `512Mi` / `10m` / `0` |

The `:45` minute keeps the standard 14/16/18/20 UTC weekday cadence without
colliding with the other PLM minute slots (`:15` ADAM, `:30` SOPHIA-5, `:40`
TYPHON, `:50` PROMETHEUS, `:54` CASPER, `:55` QWEN) and leaves a 30-minute
gap after ADAM's `:15` runs — relevant because ADAM and BOREAS share TIALA's
single GPU, and `qwen2.5:7b` + `ministral-3:14b` (~13 GB combined) cannot
both stay resident in the ~10.7 GB Metal budget, so simultaneous runs would
pay a model-reload penalty each turn.

# Relationships

* The Ollama provider path is shared with [ADAM](adam.md) and legacy
  [TIARA](tiara.md); BOREAS does not displace either — it is an additional
  unit on the same provider/budget slot.
* Inference reaches TIALA through the same `OLLAMA_BASE_URL` path as ADAM
  (Cloudflare `magi-ollama` Named Tunnel; see
  [cloudflare](/system/services/cloudflare.md)).
* Do not confuse with the `mistral` provider ([SOPHIA-5](sophia-5.md)),
  which calls the hosted Mistral API, not local Ollama.

# Trading history & performance

SHADOW unit: query `trades_shadow` / `thoughts_shadow` where
`unit_name='BOREAS'` once deployed.

# Citations

* `magi-core/lib/config.js` (`UNIT_NAME` override in `getUnitName`,
  `OLLAMA_MODEL` in `getLLMModel`, `ollama_NORMAL` budget weight).
* `magi-core/src/session.js` (Ollama collaborative analyst prompt,
  parameterized by resolved unit name).
* `magi-core/.github/workflows/deploy.yml` (`magi-core-boreas`,
  `magi-scheduler-boreas`) — prepared on branch `feat/boreas-ollama-unit`.
