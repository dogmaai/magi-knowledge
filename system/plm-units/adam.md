---
type: PLM Unit
title: ADAM
description: Collaborative Ollama analyst using qwen2.5:7b with shared ISABEL context.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-25T07:30:00Z }
verified: { by: human:jun, at: 2026-08-27T23:14:38Z }
stale_after: 2027-02-23T23:14:38Z
tags: [plm, active, ollama, collaborative, analyst]
provider: ollama
model: qwen2.5:7b
unit_status: active
budget_weight_normal: 1.0
cloud_run_job: magi-core-adam
---

# Overview

ADAM is the collaborative Ollama PLM unit. Its job sets `UNIT_NAME=ADAM` and
`OLLAMA_MODEL=qwen2.5:7b`. The Ollama branch in `magi-core/src/session.js`
builds the `[ADAM IDENTITY - COLLABORATIVE ANALYST]` prompt parameterised by
the resolved unit name.

# Configuration

| Field | Value |
|---|---|
| Provider | `ollama` |
| Unit name | `ADAM` (`UNIT_NAME=ADAM`) |
| Model | `qwen2.5:7b` |
| Budget weight (NORMAL) | `1.0` (shares `ollama_NORMAL`) |
| Cloud Run job | `magi-core-adam` |
| Cloud Scheduler | `magi-scheduler-adam`, `15 14,16,18,20 * * 1-5` UTC |
| Memory / timeout / retries | `512Mi` / `10m` / `0` |

# Relationships

The collaborative analyst prompt injects ISABEL high-win-rate patterns, the
current watchlist, ISABEL per-symbol stats, and the other units' same-day
thoughts, excluding ADAM's own rows. The unit name is resolved from
`UNIT_NAME` through `getUnitName()`.

The exported `ADAM_IDENTITY` block in `magi-core/lib/constitution.js` is an
independent-reasoner identity and is **not** what this Ollama job uses. That
block is applied to [QWEN](qwen.md). The Ollama provider path is shared with
legacy [TIARA](tiara.md).

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
re-verification.

# Citations

* `magi-core/src/session.js` (Ollama collaborative analyst prompt).
* `magi-core/lib/config.js` (`getUnitName`, `ollama_NORMAL`).
* `magi-core/.github/workflows/deploy.yml` (`magi-core-adam`,
  `magi-scheduler-adam`).
