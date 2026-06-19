---
type: Service
title: magi-moni
description: Monitoring + admin layer with the AKA-1 natural-language operator bot.
lilith_safe: false
tags: [service, monitoring, reporting, alerts, aka-1]
repo: dogmaai/magi-moni
---

# Overview

The monitoring and administrative layer for MAGI: real-time visibility,
automated performance reporting, and a natural-language operator interface
(**AKA-1**, powered by Claude/Gemini with tool-calling into BigQuery).

# Key modules

| Module | Role |
|---|---|
| `server.js` | Main app + Telegram bot handler (AKA-1). |
| `index.js` | Pub/Sub ingestion + trade-results buffering (last 100 events). |
| `monitoring/` | System health-check config (SLA 99.9%, P99 latency). |
| `terraform/` | GCP infra-as-code. |

# Reads / surfaces

* [trades](/system/echidna-tables/trades.md), [sessions](/system/echidna-tables/sessions.md), [llm-metrics](/system/echidna-tables/llm-metrics.md).
* [L4 probation](/system/echidna-tables/l4-probation.md) state and the [guard layers](/system/guards/).
* Periodic [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md).

# Notes

* AKA-1 is governed by the MAGI Constitution (forbidden actions; slash commands
  bypass the LLM for direct status/reports).
* Tech: Node.js, Express, Cloud Run, BigQuery, Pub/Sub, Anthropic Claude, Gemini,
  Telegram, Terraform.
