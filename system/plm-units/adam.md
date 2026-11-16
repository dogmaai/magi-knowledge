---
type: PLM Unit
title: ADAM
description: RETIRED — collaborative Ollama analyst (last model qwen2.5:7b) with shared ISABEL context.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-11-16T11:30:00Z }
verified: [{ by: human:jun, at: 2026-08-27T23:14:38Z }, { by: human:jun, at: 2026-10-27T05:15:00Z }]
stale_after: 2027-04-27T05:15:00Z
tags: [plm, retired, ollama, collaborative, analyst]
provider: ollama
model: qwen2.5:7b
unit_status: retired
budget_weight_normal: excluded
cloud_run_job: retired — magi-core-adam + magi-scheduler-adam removed from deploy.yml; GCP deletion pending Jun
---

# Overview

> **Retired (2026-11-16, Jun's decision).** ADAM is retired. Over the last 30
> days it posted a 79.5% success rate, a 68 s median response time and a
> single trade, and TIALA's 16 GB cannot keep `qwen2.5:7b` resident alongside
> BOREAS's `ministral-3:8b-ctx32k` — swap on the host is exhausted. Last
> model: `qwen2.5:7b`. The `(ADAM, qwen2.5:7b)` cohort ends here; historical
> `thoughts`/`trades` rows remain under that cohort per the draft
> [model-cohorting](/system/constitution/model-cohorting.md) rule. `magi-core-adam`
> and `magi-scheduler-adam` are removed from `deploy.yml`; the GCP
> job/scheduler deletions and `ollama rm qwen2.5:7b` on TIALA are pending
> Jun's execution. Recorded by devin/cli — **not human-verified**.

ADAM was the collaborative Ollama PLM unit. Its job set `UNIT_NAME=ADAM` and
`OLLAMA_MODEL=qwen2.5:7b`. The Ollama branch in `magi-core/src/session.js`
builds the `[ADAM IDENTITY - COLLABORATIVE ANALYST]` prompt parameterised by
the resolved unit name; that shared Ollama path remains in use by
[BOREAS](boreas.md).

# Configuration

| Field | Value |
|---|---|
| Provider | `ollama` |
| Unit name | `ADAM` (`UNIT_NAME=ADAM`) |
| Model | `qwen2.5:7b` (last model at retirement) |
| Budget weight (NORMAL) | `1.0` → excluded at retirement (was shared `ollama_NORMAL` with BOREAS) |
| Cloud Run job | `magi-core-adam` — retired 2026-11-16 (removed from `deploy.yml`; GCP deletion pending Jun) |
| Cloud Scheduler | `magi-scheduler-adam`, `15 14,16,18,20 * * 1-5` UTC — retired 2026-11-16 (pause/delete pending Jun) |
| Memory / timeout / retries | `512Mi` / `10m` / `0` |

# Relationships

The collaborative analyst prompt injects ISABEL high-win-rate patterns, the
current watchlist, ISABEL per-symbol stats, and the other units' same-day
thoughts, excluding ADAM's own rows. The unit name is resolved from
`UNIT_NAME` through `getUnitName()`.

The exported `ADAM_IDENTITY` block in `magi-core/lib/constitution.js` is an
independent-reasoner identity and is **not** what this Ollama job uses. That
block is applied to [QWEN](qwen.md). The Ollama provider path was shared
with legacy [TIARA](tiara.md) and remains in use by [BOREAS](boreas.md).

**Outage (2026-10-05 → 2026-10-23, resolved)**: ADAM shares the same
authenticated Ollama ingress path as [BOREAS](boreas.md) and likewise
produced no LLM decisions from 2026-10-05 to 2026-10-23 — every call
failed client-side because streamed responses were left unterminated
(server-side inference completed normally; failures are journaled as
`CALL_FAILED` thoughts). The ingress-path fix was deployed and verified
against production traffic on 2026-10-23 (see [BOREAS](boreas.md));
ADAM's scheduled runs on that day were exit(0) but skipped LLM calls via
the normal probabilistic throttle, so ADAM-side call evidence is pending
its next unthrottled run. Detail is in the private record
(dogmaai/magi-core#665). As of 2026-10-27 ADAM-side call evidence is
**still absent** (no ADAM `thoughts` rows 2026-10-23→27 — every
scheduled run throttled). This document remains `draft` pending Jun's
re-verification (the 2026-11-16 retirement edit is likewise unverified).

# Citations

* `magi-core/src/session.js` (Ollama collaborative analyst prompt).
* `magi-core/lib/config.js` (`getUnitName`, `ollama_NORMAL`).
* `magi-core/.github/workflows/deploy.yml` (`magi-core-adam`,
  `magi-scheduler-adam` — removed 2026-11-16).
