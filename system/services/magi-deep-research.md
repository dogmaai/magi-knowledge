---
type: Service
title: magi-deep-research
description: Deep Research agent producing the daily brief — strips Section 5 before insert.
lilith_safe: false
tags: [service, deep-research, hermes, research, boundary]
repo: dogmaai/magi-deep-research
---

# Overview

The Deep Research agent (Gemini Enterprise) produces the morning brief written to
[market_research](/system/echidna-tables/market-research.md) with
`research_type='DAILY_DEEP_RESEARCH'`. magi-core surfaces it to PLM units via
`ask_market_context()` / `buildHermesPrompt()` (HERMES).

# Absolute boundary — Section 5 stripping (§2.3)

> The Deep Research writer is **contractually required to strip Section 5
> ("## 5. Jun Review Only") before the BigQuery insert**, so the `summary`
> column never contains ticker picks / entry / stop / target. The reader
> (`ask_market_context`) trusts this contract and does not re-strip.

This is the same prohibition the LILITH boundary enforces from the other side:
Jun-review ticker picks must never reach a model prompt. See
[clean-source rule](/_lilith_safe/constitution/clean-source-rule.md).

# Manual path

`magi-core/scripts/upload-deep-research.mjs` + `lib/deep-research.js` allow a
human-authored brief to be uploaded into the same `DAILY_DEEP_RESEARCH` row.

# Citations

* `magi-core/src/hermes.js` (`ask_market_context`, §2.3 / §7.5 boundary).
