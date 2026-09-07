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

## Why Brave Search (decision record)

Brave was introduced by @dogmaai on 2026-03-13 (magi-core `8bff62b`, first
HERMES injection) and has remained the sole per-symbol news search API since.
The rationale, as confirmed by @dogmaai on 2026-09-06:

* **Cost**: cheapest web-search API that fits the HERMES call pattern. It
  started on the Free tier (2,000 calls/month, PR #81) and is now on a **paid
  tier** as the universe and refresh cadence grew; the 2h reuse window
  (`HERMES_REFRESH_INTERVAL_HOURS`) and the opt-in catalyst query keep spend
  bounded.
* **Fit**: a plain REST call with a `freshness=pd` (last 24h) filter returns
  a small, recent result set per symbol that Gemini can score with a
  structured-output schema — no agentic search loop or LLM-side tokens needed
  to find the news.
* **Division of labour**: Google Search Grounding is reserved for the macro
  `[HERMES:MARKET_RESEARCH]` report, and Alpha Vantage / MooMoo supply raw
  quantitative data; Brave covers traditional-media, per-symbol headlines.

**xAI `[HERMES:X_SEARCH]` is not in use.** The X social layer was dropped for
cost reasons together with the ZEROEL PLM job (grok-4.3 at $1.25/$2.50 per M
tokens, ~$47/month for the PLM job alone). The code path in `src/hermes.js`
remains and is gated on `XAI_API_KEY`, but it is not part of the operating
HERMES stack; Brave + Gemini is the only live external news source.

**TIP — why not Gemini Google Search Grounding for per-symbol news?** It is
not that Grounding is weak; it already powers the macro `[HERMES:MACRO]`
report. It is the wrong tool for the repeated, per-symbol scan:

* **Unit cost**: Grounding is billed per grounded request (order of $35 per
  1,000 beyond the free daily quota) on top of Gemini tokens; Brave paid tiers
  are roughly $3–5 per 1,000 queries — about an order of magnitude cheaper for
  a universe that is re-scanned several times a day. (Re-check current price
  lists before quoting exact numbers.)
* **Control**: Brave returns the raw result set with explicit `freshness=pd`
  and `count` parameters, so the 24h window is enforced and the scored inputs
  are inspectable and cacheable. Grounding searches inside the model and
  returns a synthesised answer; freshness cannot be forced and the evidence
  set is not reproducible.
* **Separation of search and scoring**: search (Brave) and analysis (Gemini
  structured output) are independent stages, so the analyst model can be
  swapped (`HERMES_GEMINI_MODEL`), results reused for 2h, and Gemini's
  verdict audited against the headlines it saw.

Rule of thumb: Grounding for one-shot, open-ended synthesis (macro); Brave for
high-frequency, filterable, per-symbol retrieval.

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
| `magi-evaluator` | `magi-evaluator-daily` | `0 10 * * *` (Asia/Tokyo) | Trade outcome evaluation (daily) |

Role boundaries: see
[causal analysis ownership](/system/plm-units/index.md#causal-analysis-ownership).

# Operational jobs

Source: `magi-core/.github/workflows/deploy.yml` @ 07c1767. Scheduler and Job names are separate resources.
Note: `magi-scheduler-openai` has no explicit time zone in deploy.yml at this
revision; magi-core is adding UTC.

| Cloud Run Job | Scheduler | Schedule (TZ) | Role |
|---|---|---|---|
| `magi-vix-oracle` | `magi-vix-premarket` | `0 8 * * 1-5` (America/New_York) | HERMES ORACLE / VIX premarket |
| `magi-sentiment-monitor` | `magi-sentiment-monitor-schedule` | `*/15 13-22 * * 1-5` (UTC) | HERMES sentiment monitor |
| `magi-hermes-refresh` | `magi-hermes-refresh-1h` | `0 13-21 * * 1-5` (UTC) | HERMES intra-day refresh |
| `magi-isabel-l4` | `magi-isabel-l4-scheduler` | `0 8 * * 1-5` (America/New_York) | ISABEL L4 pattern analysis |
| `magi-llm-health-monitor` | `magi-llm-health-monitor-scheduler` | `*/5 13-22 * * 1-5` (UTC) | Provider health checks |
| `magi-off-hours-chat` | `magi-off-hours-chat-scheduler` | `0 19 * * 1-5` (America/New_York) | Off-hours unit round-table |
| `magi-off-hours-chat` | `magi-off-hours-chat-weekend-scheduler` | `0 12 * * 6,0` (America/New_York) | Off-hours weekend unit round-table |
| `magi-surge-detector` | `magi-surge-detector-scheduler` | `*/5 9-15 * * 1-5` (America/New_York) | Intraday surge/crash watcher |
| `magi-daily-report` | `magi-daily-report-scheduler` | `0 23 * * 1-5` (UTC) | Daily report |
| `magi-isabel-cache` | `magi-isabel-cache-daily` | `0 8 * * 1-5` (America/New_York) | Daily ISABEL pre-compute |
| `magi-isabel-briefing` | `magi-isabel-briefing-daily` | `30 13 * * 1-5` (UTC) | ISABEL morning briefing |
| `magi-position-guard` | `magi-position-guard-scheduler` | `*/15 9-16 * * 1-5` (America/New_York) | Intra-day exit enforcement |
| `magi-shadow-evaluator` | `magi-shadow-evaluator-daily` | `30 21 * * 1-5` (America/New_York) | LILITH shadow trade evaluation |
| `magi-sync-embeddings` | `magi-sync-embeddings-daily` | `0 8 * * 1-5` (America/New_York) | Thought embedding sync |
| `magi-optuna-job` | `magi-optuna-optimizer` | `0 6 * * 1` (UTC) | Optuna batch optimization (see deploy.yml) |
| `magi-lilith-gate-monitor` | `magi-lilith-gate-monitor-daily` | `30 22 * * 1-5` (America/New_York) | LILITH adapter drift check |
| `magi-sm-token-rotate` | `magi-sm-token-rotate-30min` | `*/30 * * * *` (UTC) | Rotate MooMoo Synthetic Monitoring token |
| `magi-fred-updater` | `magi-fred-updater-daily` | `0 2 * * *` (UTC) | Daily FRED macro data fetch |
| `magi-watchdog` | `magi-watchdog-daily` | `0 23 * * 1-5` (UTC) | Trade activity monitor |

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
