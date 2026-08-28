---
type: PLM Unit
title: LILITH
description: Independent reasoner; fine-tuned LILITH model served from lilith-inference-svc.
lilith_safe: false
tags: [plm, active, lilith, fine-tuned, independent]
provider: lilith
model: lilith-v1.0-b2-prod
status: active
budget_weight_normal: 0.5
cloud_run_job: magi-core-lilith / lilith-inference-svc
---

# Overview

LILITH is the **independent reasoner** for the `lilith` provider. Its model is
`LILITH_VERSION` (`lilith-v1.0-b2-prod`), served by `lilith-inference-svc`.
Its edge is deciding solely from factual, verifiable data — price action,
volume, technicals, VIX, macro — and its **own** ISABEL stats. It does NOT use
other units' opinions, summaries, or processed intelligence, and never
references another AI's interpretation.

> This registry entry is `lilith_safe: false` and lives in `system/`. It exists
> for cross-agent reference. The clean-source rules LILITH is *trained* on live
> under [_lilith_safe/](/_lilith_safe/) and are the only thing the training
> pipeline reads.

# Configuration

| Field | Value |
|---|---|
| Provider | `lilith` |
| Model | `LILITH_VERSION` (`lilith-v1.0-b2-prod`) |
| Budget weight (NORMAL) | `0.5` (`lilith_NORMAL`; no multiplier) |
| Cloud Run job | `magi-core-lilith` (canary, `LILITH_AUTOTRADE=0`, `LILITH_MAX_DECISIONS=12`) |
| Serving side | `lilith-inference-svc` |

# Canary deployment

The canary PLM job is `magi-core-lilith`, configured with
`LILITH_AUTOTRADE=0` and `LILITH_MAX_DECISIONS=12`. The `cloud_run_job` entry
covers both this canary job and the `lilith-inference-svc` serving side.

# Production safety

The VIX hard-gate can rewrite a LILITH action (e.g. BUY → HOLD under
`EXTREME_FEAR`); every rewrite is audited in
[lilith-hard-gate-events](/system/echidna-tables/lilith-hard-gate-events.md).

# Training

LILITH's training pipeline is `dogmaai/lilith-training` (Qwen2.5-3B QLoRA →
anti-hallucination DPO). See [services/lilith-training](/system/services/lilith-training.md)
and the [LILITH-safe ground truth](/_lilith_safe/).

# Citations

* `magi-core/src/session.js` (lilith provider path); `magi-core/lib/config.js`.
* `magi-core/.github/workflows/deploy.yml` (canary job).
