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
| `src/hermes.js` | HERMES intelligence (see [HERMES intelligence stack](#hermes-intelligence-stack)). |
| `surge-detector.js` / `lib/surge.js` | Intraday surge/crash watcher (see [Surge detector](#surge-detector)). |
| `lib/vix.js` | VIX regime detection (L6, hard gate). |
| `lib/config.js` | Unit/model mapping + budget weights. |
| `lib/bigquery.js` | ECHIDNA writers (`safeInsert`, validators). |
| `lib/constitution.js` | Constitution prompt builder. |

# HERMES intelligence stack

`src/hermes.js` aggregates news / sentiment sources behind `buildHermesPrompt()`,
which every PLM unit calls while assembling its system prompt. The only source
that consumes an external search API is **`[HERMES:BRAVE]`**:

| Stage | Who | Role |
|---|---|---|
| Pre-trade (collect) | `magi-hermes-refresh` Cloud Run job (Scheduler `magi-hermes-refresh-1h`, `0 13-21 * * 1-5` UTC) and, as a fallback, [MELCHIOR-1](/system/plm-units/melchior-1.md) at the start of its cycle (`LLM_PROVIDER=google` only) | `collectHermesIntelligence()` — one **Brave Search** web query per symbol (`freshness=pd`, 5 results; optional catalyst query via `HERMES_CATALYST_QUERY_ENABLED`) → **Gemini** (`HERMES_GEMINI_MODEL`, structured-output schema) scores sentiment / key events → `pre_trade_intelligence`. Rows younger than `HERMES_REFRESH_INTERVAL_HOURS` (default 2h) are reused, which is the Brave cost lever. |
| Pre-trade (read) | All PLM units via `buildHermesPrompt()` → `buildHermesSection()` | Reads the latest `pre_trade_intelligence` row per symbol, computes tape bias / divergence, and injects the `[HERMES]` block into the prompt. LILITH clean-source mode (`skipLLMProcessed`) skips this block and receives only raw Alpha Vantage / MooMoo data. |
| In-trade / post-trade | — | Brave is **not** used. DAPHNE, thought-outcome, Fugu and Gemini pattern analyzers work on ECHIDNA tables only. |

The Brave-consuming LLM is therefore Gemini only (HERMES analyst role), not a
trading unit. Other HERMES sources: `[HERMES:ALPHA_VANTAGE]` (raw API),
`[HERMES:MARKET_RESEARCH]` (Gemini + Google Search Grounding →
[market-research](/system/echidna-tables/market-research.md)), `[HERMES:ORACLE]`
(Ollama VIX analyst), `[HERMES:MOOMOO]` (broker real-time data),
`[HERMES:X_SEARCH]` (xAI, social layer; see [ZEROEL](/system/plm-units/zeroel.md)).
Secrets: `BRAVE_SEARCH_API_KEY`, `GEMINI_API_KEY` (`deploy.yml`); collection is a
no-op when `BRAVE_SEARCH_API_KEY` is absent.

# Surge detector

`surge-detector.js` (Cloud Run job `magi-surge-detector`, Scheduler
`magi-surge-detector-scheduler`, `*/5 9-15 * * 1-5` America/New_York) is an
opportunistic intraday watcher that lets a PLM react in-cycle instead of waiting
for the next scheduled trading window. It calls **no LLM and no search API**
itself; its only market input is the MooMoo broker.

| Stage | What | Notes |
|---|---|---|
| Input | `getMoomooSnapshot()` batch snapshot of `INTELLIGENCE_SYMBOLS` via [magi-moomoo](/system/services/magi-moomoo.md) | ETFs (`SPY`, `QQQ`) are filtered out — the trading system is cash-equity only. |
| Gate (`lib/surge.js`) | `change_pct` vs previous close must reach `SURGE_THRESHOLD` (default `+2.0`) or `CRASH_THRESHOLD` (default `-2.0`) on a quote younger than `SURGE_MAX_QUOTE_AGE_SEC` (default 300s) during 09:30-16:00 ET | The broker snapshot has no pre/post-market ticks, so outside RTH `change_pct` is the previous session's move and is ignored unless `SURGE_TRADE_OUTSIDE_RTH=true`. |
| Re-trigger guards | Cloud Run executions API history of the PLM jobs (each surge run carries `SURGE_SYMBOLS` / `SURGE_CONTEXT` env overrides) | `SURGE_COOLDOWN_MIN` (default 45), `SURGE_RETRIGGER_DELTA_PCT` (default 1.0); `0` disables a guard. |
| Primary reaction | Cloud Run Jobs API `:run` of `magi-core-job` → Mistral / [SOPHIA-5](/system/plm-units/sophia-5.md) | Chosen for the most structured swing-trade reasoning (ISABEL L4) and no rate limit on the paid tier. `src/session.js` injects `formatSurgePromptSection()` so the unit focuses on the surged symbols. |
| Secondary reaction (2+ simultaneous surges) | `magi-core-deepseek` → DeepSeek / [CASPER](/system/plm-units/casper.md) | Second opinion; xAI was dropped as secondary trigger for cost. |
| Notification | `sendTelegramNotification` (`TelegramCategory.REVIEW`) | Suppressed while cooled down unless `SURGE_ALERT_ON_COOLDOWN=true`. |

Secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (`deploy.yml`). The Scheduler
step is `describe || create`, so cron changes must be applied to the live job
manually (`gcloud scheduler jobs update http magi-surge-detector-scheduler`).

# Offline analysis jobs

Cloud Run jobs and their Cloud Scheduler wrappers (separate resources with
separate names) as defined in `magi-core/.github/workflows/deploy.yml`:

| Cloud Run Job | Scheduler | Schedule (TZ) | Role |
|---|---|---|---|
| `magi-fugu-analyzer` | `magi-fugu-analyzer-daily` | `30 23 * * 1,5` (America/New_York) | [SEKHMET](/system/plm-units/sekhmet.md) offline sequential / **causal** outcome analysis, Sakana `fugu-ultra`, `reasoning_effort=high` → [fugu-sequential-patterns](/system/echidna-tables/fugu-sequential-patterns.md) |
| `magi-gemini-analyzer` | `magi-gemini-analyzer-daily` | `0 14 * * 1-5` (UTC) | Gemini **generic** WIN/LOSE pattern analysis (AI Studio `gemini-3.8-flash`); not causal analysis → [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md) |
| `magi-daphne-analyzer` | `magi-daphne-analyzer-daily` | `0 22 * * 1-5` (America/New_York) | LP-taxonomy classification of LOSE trades in BigQuery SQL + static `IS_CAUSAL` flag → [daphne-feedback](/system/echidna-tables/daphne-feedback.md) |
| `magi-thought-outcome-analyzer` | `magi-thought-outcome-analyzer-daily` | `0 23 * * 1-5` (America/New_York) | Links thoughts to realized outcomes (feeds the Fugu pass that follows at 23:30 ET) |
| `magi-thought-quality-ranker` | `magi-thought-quality-ranker` | `0 0 1,15 * *` (UTC) | Semi-monthly thought quality ranking (`SAKANA_MODEL=fugu-ultra`) → [thought-quality-scores](/system/echidna-tables/thought-quality-scores.md) |
| `magi-evaluator` | — (invoked by the trade pipeline) | — | Trade outcome evaluation |

Role boundaries: see
[causal analysis ownership](/system/plm-units/index.md#causal-analysis-ownership).

# Writes

[trades](/system/echidna-tables/trades.md),
[thoughts](/system/echidna-tables/thoughts.md),
[sessions](/system/echidna-tables/sessions.md),
[llm-metrics](/system/echidna-tables/llm-metrics.md),
[consensus-signals](/system/echidna-tables/consensus-signals.md), guard_blocks,
[lilith-hard-gate-events](/system/echidna-tables/lilith-hard-gate-events.md).

# Depends on

[magi-moomoo](magi-moomoo.md) (broker), [magi-isabel](magi-isabel.md) (patterns),
Cohere (embeddings).
