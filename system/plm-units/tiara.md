---
type: PLM Unit
title: TIARA
description: Self-hosted local reasoner running Qwen2.5-14B via Ollama.
lilith_safe: false
tags: [plm, active, ollama, self-hosted]
provider: ollama
model: qwen2.5:14b
status: active
budget_weight_normal: 1.0
---

# Overview

TIARA is the **self-hosted local** unit, running `qwen2.5:14b` through Ollama on
owned infrastructure. Because inference is self-hosted (no per-token API cost),
it carries a full `1.0` budget allocation.

# Configuration

| Field | Value |
|---|---|
| Provider | `ollama` |
| Model | `qwen2.5:14b` |
| Budget weight (NORMAL) | `1.0` (self-hosted, full allocation) |

# Relationships

* Distinct from [LILITH](lilith.md): TIARA runs stock Qwen2.5-14B via Ollama,
  whereas LILITH is the *fine-tuned* Qwen2.5-3B served from `lilith-inference-svc`.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='TIARA'`.

# Citations

* `magi-core/lib/config.js`.
