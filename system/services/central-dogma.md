---
type: Service
title: central-dogma
description: Unified NL gateway — intent parsing, command execution, and risk policy (ARIEL).
lilith_safe: false
tags: [service, central-dogma, gateway, ariel, intent]
repo: dogmaai/central-dogma
---

# Overview

central-dogma is the **unified gateway / control plane** for MAGI: it turns
natural language into structured trading queries, command executions, and risk
operations. Hosts **ARIEL**, the local Ollama tool-calling agent.

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
