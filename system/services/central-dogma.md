---
type: Service
title: central-dogma
description: Unified NL gateway — intent parsing, command execution, and risk policy (ARIEL). DEPRECATED.
lilith_safe: false
status: deprecated
generated: { by: devin/cloud, at: 2026-09-13T21:50:00Z }
verified: { by: human:jun, at: 2026-09-13T21:50:00Z }
tags: [service, central-dogma, gateway, ariel, intent]
repo: dogmaai/central-dogma
---

> **Deprecated.** `dogmaai/central-dogma` was archived on GitHub on
> 2026-07-14 and is not deployed on Cloud Run or Cloud Scheduler. Its role
> was absorbed by [magi-moni](magi-moni.md): the AKA-1 Telegram bot now hosts
> the ported tools (`unblock_l4`, `trigger_job`, `trigger_optuna`,
> `query_thoughts`) and policy engine, and the former central-dogma REST
> client for TIALA operations was replaced by OpenClaw Gateway tool
> invocations (magi-moni `lib/tiala.js`, `lib/openclaw.js`). This doc is kept
> for historical reference only.

# Overview

central-dogma was the **unified gateway / control plane** for MAGI: it turned
natural language into structured trading queries, command executions, and risk
operations. It hosted **ARIEL**, the local Ollama tool-calling agent.

# Key modules

| Module | Role |
|---|---|
| `index.js` | Express API entrypoint / router. |
| `intent-parser.js` | NL → SQL/tool-calling via sanitized templates (injection-safe; non-generative SQL). |
| `command-parser.js` | Administrative instruction processor + policy enforcement. |
| `policy-engine.js` | Risk-based gatekeeper (`confirm_required` → human approval via Telegram). |
| `ariel-tools.js` | Tool definitions for market data + DB access. |
| `sql-templates.js` | Sanitized BigQuery query templates. |
| `magi_schema.json` | Master MAGI Control Plane definition. |
| `openclaw.yaml` | Tool manifest for OpenClaw agent integration. |

# Relationships

* Reads `magi_core` ([echidna-tables](/system/echidna-tables/)) via templated queries.
* Surfaces [L4 probation](/system/echidna-tables/l4-probation.md) and the [guard layers](/system/guards/) to operators.
* Tech: Node.js, Express, Cloud Run, BigQuery, Cloud Scheduler, Ollama (ARIEL), Gemini, Alpha Vantage, Finnhub.
