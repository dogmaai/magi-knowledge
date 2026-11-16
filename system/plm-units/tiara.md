---
type: PLM Unit
title: TIARA
description: Legacy self-hosted Ollama identity using qwen3.5:9b.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-11-16T11:30:00Z }
verified: [{ by: human:jun, at: 2026-08-27T23:15:42Z }, { by: human:jun, at: 2026-10-06T05:36:00Z }]
stale_after: 2027-04-04T05:36:00Z
tags: [plm, legacy, ollama, self-hosted]
provider: ollama
model: qwen3.5:9b
unit_status: legacy
budget_weight_normal: 1.0
---

# Overview

TIARA is the **legacy self-hosted local** Ollama identity. Its model default is
`qwen3.5:9b`, from the `OLLAMA_MODEL` default in `magi-core/lib/config.js`.
Because inference is self-hosted (no per-token API
cost), it carries a full `1.0` budget allocation.

TIARA no longer has its own PLM trading job. Until 2026-09-25 the only
deployment using `LLM_PROVIDER=ollama` without a `UNIT_NAME` override was
`magi-vix-oracle` (`MODE=VIX_ONLY`); that job was retired and replaced by
deterministic aggregation inside `magi-isabel-cache` (see
[ORACLE](oracle.md#oracle-vix-specialist-retired-2026-09-25)). The remaining
Ollama deployments set explicit models — [BOREAS](boreas.md) uses
`ministral-3:8b-ctx32k` ([ADAM](adam.md) used `qwen2.5:7b` until its
2026-11-16 retirement) — so `qwen3.5:9b` is no longer
deployed anywhere; it survives only as the `OLLAMA_MODEL` fallback default in
`lib/config.js`.

# Configuration

| Field | Value |
|---|---|
| Provider | `ollama` |
| Model | `qwen3.5:9b` (`OLLAMA_MODEL` default) |
| Budget weight (NORMAL) | `1.0` (self-hosted, full allocation) |

# Relationships

* The Ollama provider path is shared by legacy TIARA and
  [BOREAS](boreas.md); [ADAM](adam.md) shared it until its 2026-11-16
  retirement.
* [QWEN](qwen.md) is the DashScope provider, not the Ollama identity.
* The unit name is resolved from `UNIT_NAME` through `getUnitName()`.
* [LILITH](lilith.md) is the fine-tuned `lilith` provider served from
  `lilith-inference-svc`.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='TIARA'`.

# Citations

* `magi-core/lib/config.js` (`OLLAMA_MODEL`, `getUnitName`).
* `magi-core/lib/vix.js` (VIX-only Ollama default, removed 2026-09-25).
