---
type: Service
title: magi-moni
description: Monitoring + admin layer with the AKA-1 natural-language operator bot.
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-17T00:29:00Z }
verified: [{ by: human:jun, at: 2026-08-24T11:03:39Z }, { by: devin/local, at: 2026-09-17T00:29:00Z }]
stale_after: 2027-03-17T00:29:00Z
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
| `lib/tools.js` | AKA-1 tool-calling surface — the tools ported from the archived central-dogma (`unblock_l4`, `trigger_job`, `trigger_optuna`, `query_thoughts`). |
| `lib/policy-engine.js` | Risk-based gatekeeper for admin commands (`confirm_required` → human approval via Telegram), ported from central-dogma. |
| `lib/tiala.js`, `lib/openclaw.js` | TIALA host operations via OpenClaw Gateway tool invocations (replaces the former central-dogma REST client). |

magi-moni absorbed the role of the archived `central-dogma` service
(deprecated 2026-09-13): natural-language operator commands, the ported tool
set and policy engine above, and TIALA control via OpenClaw.

# Reads / surfaces

* [trades](/system/echidna-tables/trades.md), [sessions](/system/echidna-tables/sessions.md), [llm-metrics](/system/echidna-tables/llm-metrics.md).
* [L4 probation](/system/echidna-tables/l4-probation.md) state and the [guard layers](/system/guards/).
* Periodic [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md).

# Notes

* AKA-1 is governed by the MAGI Constitution (forbidden actions; slash commands
  bypass the LLM for direct status/reports).
* [AKA memory](aka-memory.md) is held on TIALA: unlike the stateless Cloud Run
  AKA-1, which reads ECHIDNA, it holds `MEMORY.md` and `memory/*.md`.
* Tech: Node.js, Express, Cloud Run, BigQuery, Pub/Sub, Anthropic Claude, Gemini,
  Telegram, Terraform.
