---
type: PLM Unit
title: LILITH
description: Independent reasoner; fine-tuned Qwen2.5-3B served from lilith-inference-svc.
lilith_safe: false
tags: [plm, active, qwen, lilith, fine-tuned, independent]
provider: qwen, lilith
model: qwen-plus (DashScope) / lilith-v1.0-b2-prod (fine-tuned)
status: active
budget_weight_normal: 0.5
cloud_run_job: lilith-inference-svc
---

# Overview

LILITH is the **independent reasoner**. Its edge is deciding solely from
factual, verifiable data — price action, volume, technicals, VIX, macro — and
its **own** ISABEL stats. It does NOT use other units' opinions, summaries, or
processed intelligence, and never references another AI's interpretation.

> This registry entry is `lilith_safe: false` and lives in `system/`. It exists
> for cross-agent reference. The clean-source rules LILITH is *trained* on live
> under [_lilith_safe/](/_lilith_safe/) and are the only thing the training
> pipeline reads.

# Configuration

| Field | Value |
|---|---|
| Provider | `qwen` (DashScope) or `lilith` (fine-tuned) |
| Model | `qwen-plus` / `lilith-v1.0-b2-prod` (`LILITH_VERSION`) |
| Budget weight (NORMAL) | `0.5` for both `qwen_NORMAL` and `lilith_NORMAL` |
| Cloud Run | `lilith-inference-svc` (fine-tuned serving) |

# Dual-provider unit slot

LILITH occupies one MAGI unit slot across two providers so consensus and
reporting keep working when `LLM_PROVIDER` swaps from `qwen` to `lilith`:

* `qwen` → DashScope `qwen-plus` (hosted).
* `lilith` → fine-tuned Qwen2.5-3B from `lilith-inference-svc`.

# Production safety

The VIX hard-gate can rewrite a LILITH action (e.g. BUY → HOLD under
`EXTREME_FEAR`); every rewrite is audited in
[lilith-hard-gate-events](/system/echidna-tables/lilith-hard-gate-events.md).

# Training

LILITH's training pipeline is `dogmaai/lilith-training` (Qwen2.5-3B QLoRA →
anti-hallucination DPO). See [services/lilith-training](/system/services/lilith-training.md)
and the [LILITH-safe ground truth](/_lilith_safe/).

# Citations

* `magi-core/src/session.js` (LILITH IDENTITY); `magi-core/lib/config.js`.
