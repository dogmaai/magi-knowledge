---
type: PLM Unit
title: ZEROEL
description: Retired realtime news / X social-signal algo trader powered by Grok.
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-22T00:50:00Z }
verified: { by: human:jun, at: 2026-09-06T23:55:32Z }
stale_after: 2027-03-05T23:55:32Z
tags: [plm, retired, xai, grok, news, social]
provider: xai
model: grok-4.3
unit_status: retired
budget_weight_normal: null
cloud_run_job: magi-core-xai
---

# Overview

ZEROEL is retired and its code has been fully removed. The `magi-core-xai`
Cloud Run job was disabled in `magi-core/.github/workflows/deploy.yml`, and
a `gcloud` inventory of `asia-northeast1`/`asia-southeast1` on 2026-09-22
confirmed no xAI scheduler or Cloud Run job exists. All xAI models routed to
`grok-4.3` ($1.25/$2.50 per M tokens), and the PLM job alone cost
approximately $47/month.

The ZEROEL persona block (`src/session.js`), the `xai` provider dispatch
path (`src/llm.js`), the provider/unit/model map entries and the
`XAI_API_KEY` secret wiring (`lib/config.js`, `lib/secrets.js`,
`src/globals.js`, `isabel/l4-batch.js`) have all been deleted. The X
(Twitter) social layer `[HERMES:X_SEARCH]` (xAI Responses API in
`src/hermes.js`, writing to `magi_core.x_social_sentiment`) was dropped for
cost reasons along with the PLM job (confirmed by @dogmaai 2026-09-06) and
its code is now removed as well; historical rows remain in the table. See
the HERMES decision record in
[magi-core](/system/services/magi-core.md#why-brave-search-decision-record).
`xai` stays in `DEPRECATED_PROVIDERS` so nothing can select it again.

# Configuration

| Field | Value |
|---|---|
| Provider | `xai` |
| Model | `grok-4.3` |
| Budget weight (NORMAL) | none (`xai` has no `xai_NORMAL` entry) |
| Cloud Run job | `magi-core-xai` (disabled) |

# Relationships

* HERMES no longer has an X social layer; `[HERMES:X_SEARCH]` (xAI
  Responses API) was removed with the rest of the xAI integration.
* The surge detector now uses [CASPER](casper.md) as its second opinion after
  [SOPHIA-5](sophia-5.md); it no longer escalates to ZEROEL.

# Trading history & performance

Query historical [trades](/system/echidna-tables/trades.md) where
`unit_name='ZEROEL'`.

# Citations

* `magi-core/.github/workflows/deploy.yml` (removed job note);
  `magi-core/lib/config.js` (`DEPRECATED_PROVIDERS` keeps `xai` excluded).
