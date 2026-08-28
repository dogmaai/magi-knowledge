# Guard layers (execution order)

The sequential safety pipeline every trade tool-call passes through before an
order is placed. It is orchestrated in `magi-core/src/llm.js`; the L4/L5/L7
implementations live in `src/paperGuards.js`. Blocks are logged to the
`guard_blocks` table via `logGuardBlock()`.

# Pipeline order

| Layer | Name | Checks | On fail |
|---|---|---|---|
| [L0](l0-kill-switch.md) | Emergency Kill Switch | Global halt from `magi_core.system_control` | block all orders |
| Shadow short circuit | Shadow-mode recording | `isConfiguredShadowMode()` → `recordShadowOrder()`; no broker call | record |
| [L-1](l-1.md) | Broker Availability | Broker reachable / tradable | block |
| [L0](l0.md) | PositionManager | PositionManager veto on symbol/side | block |
| [L0.5](l0-5.md) | Cash Account Guard | Block new short SELLs in cash accounts | block |
| [L0.9](l0-9.md) | HOLD / zero-quantity | Reject missing or non-positive quantities | block |
| [L1](l1.md) | Data Validation (データ検証層) | Required params present and valid | block |
| [L1.6](l1-6.md) | Sellable Quantity | Clamp exit SELL to `can_sell_qty` | block or clamp |
| [L2.6/L2.7](l2.md) | Entry Sizing | Confidence-band and short-entry sizing (warn-only) | warn |
| [L3](l3.md) | Symbol Exclusion | Symbol on `L3_EXCLUDED_SYMBOLS` (optuna_params) | block BUY |
| [L1.5](l1-5.md) | Position Sizing (Hard Limit) | Max concurrent positions; max position % | block |
| [L1.7](l1-7.md) | Daily-loss Kill Switch | Per-unit realized P&L against daily loss limit | block risk increases |
| [L2](l2.md) | Confidence (コンフィデンス層) | `confidence >= L2_THRESHOLD` (Optuna) | block |
| [L4](l4.md) | Direction Suitability (方向適性層) | Provider/side probation | block |
| [L5](l5.md) | Thought Similarity (思考類似度層) | Reasoning too similar to past losers | block |
| [L6](l6.md) | Market Regime (市場環境層) | VIX regime vs side | warn |
| [L7](l7.md) | Composite Score (複合スコア層) | Optuna 1000-trial composite gate | block |

The numeric labels are historical and the table is in actual code execution
order. The L0 emergency kill switch runs first. The shadow-mode short circuit
then applies `isConfiguredShadowMode()` and `recordShadowOrder()`; units in
`TRADE_MODE=SHADOW` (MELCHIOR-1 and CASPER) never reach L-1 or below.

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
* `guard_blocks` — every block, for audit.
