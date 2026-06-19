---
type: PLM Unit
title: ZEROEL
description: Realtime news / X social-signal algo trader powered by Grok.
lilith_safe: false
tags: [plm, active, xai, grok, news, social]
provider: xai
model: grok-4.3
status: active
budget_weight_normal: 0.5
cloud_run_job: magi-core-xai
---

# Overview

ZEROEL is the **realtime news-driven algo trader**: its edge is direct access to
X (Twitter) realtime social signals and breaking news the other units cannot
see. It acts on genuine catalysts (earnings leaks, regulatory news, viral
narratives, unusual social volume) and weights by source credibility.

# Configuration

| Field | Value |
|---|---|
| Provider | `xai` |
| Model | `grok-4.3` |
| Budget weight (NORMAL) | `0.5` (no Optuna data yet) |
| Cloud Run job | `magi-core-xai` (SECONDARY_JOB) |

# Relationships

* Complements HERMES (Brave Search + Gemini): ZEROEL covers the *social* layer HERMES misses.
* Invoked as the surge detector's second opinion after [SOPHIA-5](sophia-5.md).

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='ZEROEL'`.

# Citations

* `magi-core/src/session.js` (ZEROEL IDENTITY); `magi-core/surge-detector.js` (SECONDARY_JOB).
* `magi-core/lib/config.js`.
