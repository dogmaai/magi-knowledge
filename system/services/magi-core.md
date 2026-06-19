---
type: Service
title: magi-core
description: The MAGI trading engine — trade loop, LLM orchestration, and guard layers.
lilith_safe: false
tags: [service, magi-core, core, trading]
repo: dogmaai/magi-core
---

# Overview

magi-core is the heart of MAGI: it runs trading sessions, orchestrates the
[PLM units](/system/plm-units/), enforces the [guard layers](/system/guards/),
and writes the core ECHIDNA tables.

# Key modules

| Module | Responsibility |
|---|---|
| `src/session.js` / `magi-core.js` | Session lifecycle, unit personas. |
| `src/llm.js` | LLM call orchestration + guard pipeline (L-1…L7). |
| `src/paperGuards.js` | L4 / L5 / L7 guard implementations. |
| `src/positionMgmt.js` / `positionManager.js` | Position management + L0 guard. |
| `src/hermes.js` | HERMES intelligence + Deep Research surfacing. |
| `src/vix.js` | VIX regime detection (L6, hard gate). |
| `lib/config.js` | Unit/model mapping + budget weights. |
| `lib/bigquery.js` | ECHIDNA writers (`safeInsert`, validators). |
| `lib/constitution.js` | Constitution prompt builder. |

# Writes

[trades](/system/echidna-tables/trades.md),
[thoughts](/system/echidna-tables/thoughts.md),
[sessions](/system/echidna-tables/sessions.md),
[llm-metrics](/system/echidna-tables/llm-metrics.md),
[consensus-signals](/system/echidna-tables/consensus-signals.md), guard_blocks,
[lilith-hard-gate-events](/system/echidna-tables/lilith-hard-gate-events.md).

# Depends on

[magi-moomoo](magi-moomoo.md) (broker), [magi-isabel](magi-isabel.md) (patterns),
[magi-deep-research](magi-deep-research.md) (research), Cohere (embeddings).
