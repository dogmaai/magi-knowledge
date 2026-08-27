---
type: PLM Unit
title: TIARA
description: Legacy self-hosted Ollama identity using qwen3.5:9b.
lilith_safe: false
tags: [plm, active, ollama, self-hosted]
provider: ollama
model: qwen3.5:9b
status: active
budget_weight_normal: 1.0
---

# Overview

TIARA is the **legacy self-hosted local** Ollama identity. Its model default is
`qwen3.5:9b`, from the `OLLAMA_MODEL` default in `magi-core/lib/config.js` and
`magi-core/lib/vix.js`. Because inference is self-hosted (no per-token API
cost), it carries a full `1.0` budget allocation.

TIARA no longer has its own PLM trading job. The only deployment using
`LLM_PROVIDER=ollama` without a `UNIT_NAME` override is `magi-vix-oracle` with
`MODE=VIX_ONLY`. The Ollama PLM slot is held by [ADAM](adam.md).

# Configuration

| Field | Value |
|---|---|
| Provider | `ollama` |
| Model | `qwen3.5:9b` (`OLLAMA_MODEL` default) |
| Budget weight (NORMAL) | `1.0` (self-hosted, full allocation) |

# Relationships

* The Ollama provider path is shared by legacy TIARA and [ADAM](adam.md).
* [QWEN](qwen.md) is the DashScope provider, not the Ollama identity.
* The unit name is resolved from `UNIT_NAME` through `getUnitName()`.
* [LILITH](lilith.md) is the fine-tuned `lilith` provider served from
  `lilith-inference-svc`.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='TIARA'`.

# Citations

* `magi-core/lib/config.js` (`OLLAMA_MODEL`, `getUnitName`).
* `magi-core/lib/vix.js` (VIX-only Ollama default).
