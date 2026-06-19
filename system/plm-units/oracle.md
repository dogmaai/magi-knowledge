---
type: PLM Unit
title: ORACLE
description: DEPRECATED — Together.ai unit; removed in #139.
lilith_safe: false
tags: [plm, deprecated, together]
provider: together
model: null
status: deprecated
deprecated_pr: "#139"
---

# Overview

ORACLE was the **Together.ai** unit. It was **deprecated in #139**. `together`
is in `DEPRECATED_PROVIDERS` and is excluded from budget-weight loading.

It is retained here for historical attribution: older
[trades](/system/echidna-tables/trades.md) /
[thoughts](/system/echidna-tables/thoughts.md) rows may carry
`unit_name='ORACLE'`.

# Configuration

| Field | Value |
|---|---|
| Provider | `together` (DEPRECATED) |
| Budget weight | excluded (`DEPRECATED_PROVIDERS`) |

# Citations

* `magi-core/lib/config.js` (`DEPRECATED_PROVIDERS`).
