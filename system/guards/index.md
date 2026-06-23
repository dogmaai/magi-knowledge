# Guard layers (L-1 → L7)

The sequential safety pipeline every trade tool-call passes through before an
order is placed. Orchestrated in `magi-core/src/llm.js`; the L4/L5/L7
implementations live in `src/paperGuards.js`. Blocks are logged to the
`guard_blocks` table via `logGuardBlock()`.

# Pipeline order

| Layer | Name | Checks | On fail |
|---|---|---|---|
| [L-1](l-1.md) | Broker Availability | Broker reachable / tradable | block |
| [L0](l0.md) | PositionManager | PositionManager veto on symbol/side | block |
| [L1](l1.md) | Data Validation (データ検証層) | Required params present & valid | block |
| [L3](l3.md) | Symbol Exclusion | Symbol on `L3_EXCLUDED_SYMBOLS` (optuna_params) | block BUY |
| [L1.5](l1-5.md) | Position Sizing (Hard Limit) | Max concurrent positions; max position % | block |
| [L2](l2.md) | Confidence (コンフィデンス層) | `confidence >= L2_THRESHOLD` (Optuna) | block |
| [L4](l4.md) | Direction Suitability (方向適性層) | Provider/side probation | block |
| [L5](l5.md) | Thought Similarity (思考類似度層) | Reasoning too similar to past losers | block |
| [L6](l6.md) | Market Regime (市場環境層) | VIX regime vs side | warn (BUY) |
| [L7](l7.md) | Composite Score (複合スコア層) | Optuna 1000-trial composite gate | block |

Note: in code, L3 (symbol exclusion) is evaluated right after L1 and before
L1.5; the numeric label reflects the original design, not strict execution
order.

# Constitution basis

The guard pipeline is the programmatic enforcement layer for the
[PLM Runtime Constitution](/system/constitution/). Each guard doc links back to
the specific constitutional section it enforces.

# Backing data

* [l4-probation](/system/echidna-tables/l4-probation.md) — L4 state.
* [optuna-params](/system/echidna-tables/optuna-params.md) — L2 threshold, L3 exclusions, L7 weights.
* `guard_blocks` — every block, for audit.
