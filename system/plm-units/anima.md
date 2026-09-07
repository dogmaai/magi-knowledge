---
type: PLM Unit
title: ANIMA
description: DEPRECATED — fast Groq Llama unit; replaced by TYPHON.
lilith_safe: false
status: stable
generated: { by: devin/cloud, at: 2026-06-19T01:02:48Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
tags: [plm, deprecated, groq]
provider: groq
model: llama-3.3-70b-versatile
unit_status: deprecated
successor: TYPHON
deprecated_pr: "#157"
---

# Overview

ANIMA was the **fast Groq** unit (low-latency Llama inference). It was
**deprecated in #157** and replaced by [TYPHON](typhon.md) (kimi). `groq` is in
`DEPRECATED_PROVIDERS`, so it is excluded from budget-weight loading and does not
dilute active units' allocation.

`getUnitName('groq')` still returns `ANIMA` for backward compatibility with
historical rows in [trades](/system/echidna-tables/trades.md) and
[thoughts](/system/echidna-tables/thoughts.md).

# Configuration

| Field | Value |
|---|---|
| Provider | `groq` (DEPRECATED) |
| Model | `llama-3.3-70b-versatile` |
| Budget weight | excluded (`DEPRECATED_PROVIDERS`) |

# Citations

* `magi-core/lib/config.js` (`DEPRECATED_PROVIDERS = {together, groq}`).
* Historical attribution only; not in active rotation.
