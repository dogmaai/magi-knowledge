---
type: Service
title: lilith-training
description: Retired LILITH fine-tuning + anti-hallucination DPO pipeline (Qwen2.5-3B QLoRA).
lilith_safe: false
status: draft
generated: { by: devin/cloud, at: 2026-09-17T17:34:00Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
tags: [service, lilith, training, dpo, qlora, retired]
repo: dogmaai/lilith-training
---

# Overview

> **Retired (2026-09).** The LILITH unit was retired from the live roster and
> `lilith-inference-svc` was decommissioned, so this pipeline no longer feeds a
> deployed model. Its Cloud Run jobs in `asia-southeast1` (including the
> `*-poc` / `*-diag` / `*-smoke` experiments and the dormant `*-prod` jobs) are
> decommission candidates; `dogmaai/lilith-training` itself can be archived.

The pipeline that produces the [LILITH](/system/plm-units/lilith.md) model:
Qwen2.5-3B QLoRA on Cloud Run Jobs + NVIDIA L4 GPU, followed by
anti-hallucination DPO. Served in production from `lilith-inference-svc`.

# Key scripts

| Script | Role |
|---|---|
| `scripts/distill_analysis_methods.py` | Builds synthetic prompt blocks (ISABEL/fundamentals/technicals/macro); holds `CROSS_UNIT_NAMES`, `LANE_SYSTEM_PROMPTS`. |
| `scripts/generate_chosen_examples.py` | Generates `chosen` DPO examples; `parse_stats_from_prompt()`. |
| `scripts/extract_hallucination_negatives.py` | Mines `rejected` examples; the six `HALLUCINATION_*` classes. |
| `scripts/evaluate_anti_hallucination.py` | Evaluates outputs against the hallucination taxonomy. |

# Contamination boundary (the whole point of this bundle)

`lilith-training` is the **only** consumer of the
[_lilith_safe/](/_lilith_safe/) tree, and only through
`scripts/lilith_safe_loader.py`, which:

* reads only docs under `_lilith_safe/` with `lilith_safe: true`;
* **fail-loud** (raises `LilithContaminationError`) on any attempt to read
  `system/`, traverse `..`, or load an unflagged doc.

It must never read this `system/` tree (cross-unit win-rates, PLM registry,
Section 5 research). Ground truth currently hard-coded across the scripts above
(value ranges, hallucination definitions, lane prompts, Constitution rules) is
what [_lilith_safe/](/_lilith_safe/) consolidates.

# Phase 2 (not yet implemented)

Wiring `lilith-training` to fetch this bundle (git submodule / curl) and read
via the loader is **Phase 2** and requires explicit confirmation before
implementation.
