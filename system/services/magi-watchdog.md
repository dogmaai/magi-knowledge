---
type: Service
title: magi-watchdog
description: Daily trade-activity monitor — classifies a no-trade NYSE trading day as a system stop, a partial execution gap, or an expected guard/HOLD outcome.
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-11-25T03:37:03Z }
tags: [service, monitoring, watchdog, trades]
repo: dogmaai/magi-core
---

# Overview

Cloud Run job `magi-watchdog` (`magi-core/watchdog.js`, logic in
`lib/watchdog-eval.js`), triggered by Cloud Scheduler `magi-watchdog-daily`
at `0 23 * * 1-5` (UTC) — after the US close — as listed in
[magi-core](magi-core.md). Read-only: SELECTs against `magi_core.trades`,
[sessions](/system/echidna-tables/sessions.md),
[thoughts](/system/echidna-tables/thoughts.md),
[order_intents](/system/echidna-tables/order-intents.md) and
[arbiter_verdicts](/system/echidna-tables/arbiter-verdicts.md). Notifies
Discord through `lib/telegram.js`. Behaviour below is as of magi-core
`296ef9d` (magi-core#735, deployed 2026-11-25).

Replaces a 48 h wall-clock rule that alerted on Monday runs (the window was
the weekend), printed `Last trade: N/A` whenever the window was empty, and
could not tell a guard-limited day from a pipeline stop (2026-11-23/24:
every BUY was refused by [L6](/system/guards/l6.md) on a flat cash account).

# Window

* The ET date of the run must be an NYSE trading day
  (`lib/trading-calendar.js`); otherwise the run logs a skip and sends
  nothing. The scheduler fires on holidays too (e.g. Thanksgiving).
* The window is that one trading day, from 00:00 ET.
* "Last trade" is the latest `trades.timestamp` in the past 30 days.
* `TRADE_MODE=SHADOW` sessions and thoughts are excluded from every count.

# Classification

When the window has at least one `trades` row the result is `OK` and nothing
is sent. Otherwise, in this order:

| Code | Severity | Condition |
|---|---|---|
| `INVALID_INPUT` | CRITICAL | The watchdog could not read its own counts. Headline "Watchdog check failed", not a trading stop. |
| `NO_SESSIONS` | CRITICAL | No live session — max(`sessions` rows, distinct `thoughts.session_id`), because the `sessions` row is written only at session end. |
| `NO_THOUGHTS` | CRITICAL | Sessions ran but no thoughts other than `CALL_FAILED`. |
| `ORDERS_WITHOUT_TRADES` | CRITICAL | An intent reached `CONFIRMED` (the `place_order` path that writes the `trades` row) but no `trades` row exists. |
| `ORDERS_NOT_ACCEPTED` | CRITICAL / WARN | Intents ended `REJECTED` (not by the L1.5 reservation) / `LOST`, or are unresolved. CRITICAL only when no guard was involved and the broker path refused every decision. |
| `ALL_HOLD` | INFO | Every decision was `HOLD`. |
| `GUARD_BLOCKED` | INFO | Every BUY/SELL decision, matched per (session, symbol), has a guard block: a `BLOCKED` thought, an L1.5-reservation `REJECTED` intent, or a non-`ADOPTED` arbiter verdict (by `decision_id`). Blocks journaled with `session_id='unknown'` match on symbol. |
| `DECISIONS_NOT_EXECUTED` | WARN | Some BUY/SELL decisions were neither blocked nor sent — e.g. a unit ended before calling `place_order`. Reports "N of M". |

Every non-OK result is sent in the `ALERT` category (`OPS` is muted by
default); the headline carries the severity and code, and only CRITICAL adds
"Check Cloud Run logs immediately."

# Known limits

* "Decision" means `action` in `BUY` / `SELL` / `SHORT` / `COVER` or starting
  `SELL `; other model-written variants (see
  [thoughts action values](/system/echidna-tables/thoughts.md#action-values))
  are not counted.
* No baseline: a quiet but healthy day and a guard-limited day are both
  INFO; the watchdog does not judge whether the guard outcome is desirable.

# Citations

* `magi-core/watchdog.js` (`STATS_SQL`, `checkTradeActivity`).
* `magi-core/lib/watchdog-eval.js` (`watchdogWindow`, `classifyTradeActivity`,
  `buildWatchdogMessage`); tests in `lib/__tests__/watchdog-eval.test.js`.
* Read-only verification on production, 2026-11-24/25: 11-24 window →
  `DECISIONS_NOT_EXECUTED` (1 of 4); on days with trades, `CONFIRMED`
  intents equal `trades` rows (11-20: 5 = 5).
