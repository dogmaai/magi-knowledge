---
type: PLM Unit
title: ZEROEL
description: Retired realtime news / X social-signal algo trader powered by Grok.
lilith_safe: false
tags: [plm, retired, xai, grok, news, social]
provider: xai
model: grok-4.3
status: retired
budget_weight_normal: null
cloud_run_job: magi-core-xai
---

# Overview

ZEROEL is retired. The `magi-core-xai` Cloud Run job is commented out in
`magi-core/.github/workflows/deploy.yml` as "DISABLED: magi-core-xai
(xAI/ZEROEL)". All xAI models route to `grok-4.3` ($1.25/$2.50 per M tokens),
and the PLM job alone cost approximately $47/month.

The ZEROEL persona block still exists in `magi-core/src/session.js` for
historical compatibility. The X (Twitter) social layer survives as HERMES
`[HERMES:X_SEARCH]`, using the xAI Responses API with
`X_SEARCH_REFRESH_HOURS = 24` in `magi-core/src/hermes.js` and writing to
`magi_core.x_social_sentiment`.

# Configuration

| Field | Value |
|---|---|
| Provider | `xai` |
| Model | `grok-4.3` |
| Budget weight (NORMAL) | none (`xai` has no `xai_NORMAL` entry) |
| Cloud Run job | `magi-core-xai` (disabled) |

# Relationships

* HERMES retains the social layer through
  `[HERMES:X_SEARCH]` (xAI Responses API, 24-hour refresh).
* The surge detector now uses [CASPER](casper.md) as its second opinion after
  [SOPHIA-5](sophia-5.md); it no longer escalates to ZEROEL.

# Trading history & performance

Query historical [trades](/system/echidna-tables/trades.md) where
`unit_name='ZEROEL'`.

# Citations

* `magi-core/src/session.js` (ZEROEL identity); `magi-core/src/hermes.js`
  (X search); `magi-core/.github/workflows/deploy.yml` (disabled job).
* `magi-core/lib/config.js` (`DEPRECATED_PROVIDERS`, budget weights).
