# Guard layers (execution order)

The sequential safety pipeline every trade tool-call passes through before an
order is placed. It is orchestrated in `magi-core/src/llm.js`; the L4/L5/L7
implementations live in `src/paperGuards.js`. Blocks are logged via
`logGuardBlock()` as guard-block rows in
[`magi_core.thoughts`](/system/echidna-tables/thoughts.md)
(`action='BLOCKED'`, or `'WARN_ONLY'` for warn-only layers; `concerns`
carries the layer id). There is no separate `guard_blocks` table —
historical blocks already live in `thoughts`, so nothing is lost.

# Pipeline order

| Layer | Name | Checks | On fail | Class |
|---|---|---|---|---|
| [L0](l0-kill-switch.md) | Emergency Kill Switch | Global halt from `magi_core.system_control` | block all orders | risk-control |
| [JEV](jev.md) | Decision Validator | Order ↔ linked `log_analysis` consistency; typed PASS/BLOCK/ESCALATE verdict | warn (`JEV_MODE=shadow`) / block (`enforce`) | validator |
| Shadow short circuit | Shadow-mode recording | `isConfiguredShadowMode()` → `recordShadowOrder()`; no broker call | record | pipeline |
| [L-1](l-1.md) | Broker Availability | Broker reachable / tradable | block | risk-control |
| [L0](l0.md) | PositionManager | PositionManager veto on symbol/side | block | risk-control |
| [L0.5](l0-5.md) | Cash Account Guard | Block new short SELLs in cash accounts | block | risk-control |
| [L0.9](l0-9.md) | HOLD / zero-quantity | Reject missing or non-positive quantities | block | risk-control |
| [L1](l1.md) | Data Validation (データ検証層) | Required params present and valid | block | risk-control |
| [L1.6](l1-6.md) | Sellable Quantity | Clamp exit SELL to `can_sell_qty` | block or clamp | risk-control |
| L1.6.RECON | Ledger↔broker Reconciliation | Open ledger net qty vs broker position list per symbol | block risk increases (`RECON_FAIL_CLOSED`) | risk-control |
| [L2.6/L2.7](l2.md) | Entry Sizing | Confidence-band and short-entry sizing (warn-only) | warn | statistical-gate |
| [L3](l3.md) | Symbol Exclusion | Symbol on `L3_EXCLUDED_SYMBOLS` (optuna_params) | warn (`L3_WARN_ONLY`) | statistical-gate |
| [L1.5](l1-5.md) | Position Sizing (Hard Limit) | Max concurrent positions; max position % | block | risk-control |
| [L1.7](l1-7.md) | Daily-loss Kill Switch | Per-unit realized P&L against daily loss limit | block risk increases | risk-control |
| [L2](l2.md) | Confidence (コンフィデンス層) | `confidence >= L2_THRESHOLD` (Optuna, frozen) | warn (`L2_WARN_ONLY`) | statistical-gate |
| [L4](l4.md) | Direction Suitability (方向適性層) | Provider/side probation | block | statistical-gate |
| [L5](l5.md) | Thought Similarity (思考類似度層) | Reasoning too similar to past losers | block | statistical-gate |
| [L6](l6.md) | Market Regime (市場環境層) | VIX regime vs side | warn | statistical-gate |
| [L7](l7.md) | Composite Score (複合スコア層) | Optuna 1000-trial composite gate | block | statistical-gate |

The numeric labels are historical and the table is in actual code execution
order. The L0 emergency kill switch runs first, then the JEV decision
validator (see [jev.md](jev.md)). The shadow-mode short circuit
then applies `isConfiguredShadowMode()` and `recordShadowOrder()`; units in
`TRADE_MODE=SHADOW` (MELCHIOR-1) never reach L-1 or below.

# Classes

Reclassified 2026-10-02 (Jun-approved, Issue #99 Fable review item D — "reduce
degrees of freedom": too many learned gates for too little live data).

* **risk-control** — deterministic protective controls: kill switches, broker
  reachability, quantity/position hard limits, data validation. They block on
  rule violations and are never learned from data. These are "guards" in the
  strict sense.
* **statistical-gate** — layers whose thresholds, lists or weights come from
  fitted statistics (Optuna `optuna_params`, L4 probation state, L5 similarity,
  confidence calibration). Their **re-optimization is frozen** as of
  2026-10-02: `magi-optuna-job` runs with `OPTUNA_FREEZE=true` and the weekly
  `magi-optuna-optimizer` scheduler is paused; the last `optuna_params` rows
  remain in effect. Whether a blocking statistical-gate is demoted to
  warn-only observation is a **per-layer decision requiring independent
  review**. As of 2026-10-03: **L2 and L3 are demoted to warn-only** in the
  implementation (magi-core#548 — would-be blocks are journaled as `WARN_ONLY`
  rows for counterfactual analysis; `L2_WARN_ONLY=false` / `L3_WARN_ONLY=false`
  restore hard blocking). L4/L5/L7 already run warn-only in the
  implementation (drift recorded in Issue #99 — spec rows pending update).
  L1.6.RECON moved the opposite direction: promoted from warn-only
  observation to fail-closed blocking of risk-increasing orders on
  ledger↔broker divergence (magi-core#547; `RECON_FAIL_CLOSED=false` reverts).
* **validator** / **pipeline** — bookkeeping classes for the JEV decision
  validator and the shadow-mode short circuit; not risk controls.

# Constitution basis

The guard pipeline is the programmatic enforcement layer for the
[PLM Runtime Constitution](/system/constitution/index.md). Each guard doc links
back to the specific constitutional section it enforces.

# Backing data

* [l4-probation](/system/echidna-tables/l4-probation.md) — L4 state.
* [optuna-params](/system/echidna-tables/optuna-params.md) — L2 threshold, L3
  exclusions, L7 weights.
* `magi_core.system_control` — L0 emergency kill-switch state.
* `magi_core.trades` — L1.7 per-unit realized P&L for the current ET day.
* [`magi_core.thoughts`](/system/echidna-tables/thoughts.md) — every block
  as a guard-block row (`action='BLOCKED'|'WARN_ONLY'`, `concerns=<layer>`),
  for audit.
