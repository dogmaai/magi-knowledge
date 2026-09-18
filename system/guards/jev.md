---
type: Guard Layer
title: JEV Decision Validator
description: Deterministic typed validator on the place_order path — cross-checks the order against the session's linked log_analysis before the shadow/broker path. Not an LLM.
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-18T12:30:00Z }
tags: [guard, jev, validation, decision-integrity]
layer: JEV
on_fail: warn (JEV_MODE=shadow) / block (JEV_MODE=enforce)
---

> **Draft.** Proposed in `magi-core` Issue #479. `JEV_MODE=shadow` records
> verdicts without stopping orders; enforcement requires a separate change,
> Jun approval, and independent review.

# Purpose

JEV is a **deterministic typed validator**, not a reasoning model. LLM units
own market reasoning; JEV only checks that the resulting order is
structurally consistent with the `log_analysis` it claims to follow —
catching decisions that have drifted "off the rails" before they can reach
the shadow/broker path. It performs no LLM calls and no I/O.

# Pipeline position

Runs inside `place_order` in `magi-core/src/llm.js`, immediately **after the
L0 emergency kill switch and before the shadow-mode short circuit**, so every
unit (live and `TRADE_MODE=SHADOW`) receives a verdict.

# Verdicts

`PASS | BLOCK | ESCALATE`. `CLAMP` is intentionally absent — sizing clamps
belong to L1.6/L2.6/L2.7.

| Code | Check | Severity |
|---|---|---|
| `JEV_SCHEMA_SYMBOL` | symbol format | block |
| `JEV_SCHEMA_SIDE` | side ∈ {buy, sell} | block |
| `JEV_SCHEMA_QTY` | qty finite and > 0 | block |
| `JEV_SCHEMA_REASON` | reason present and non-trivial | block |
| `JEV_CONFIDENCE_INVALID` | confidence finite within [0,1] | block |
| `JEV_THOUGHT_MISSING` | no linked log_analysis for the symbol | block |
| `JEV_THOUGHT_SYMBOL_MISMATCH` | analysis symbol ≠ order symbol | block |
| `JEV_THOUGHT_HOLD` | analysis action HOLD but an order was placed | block |
| `JEV_THOUGHT_ACTION_MISMATCH` | BUY↔sell / SELL↔buy | block |
| `JEV_REASONING_THIN` | analysis reasoning below minimum length | block |
| `JEV_CONFIDENCE_EXTREME` | confidence ≥ 0.99 (uncalibrated certainty) | escalate |
| `JEV_THOUGHT_ID_MISMATCH` | echoed thought_id ≠ session registry | escalate |
| `JEV_ANALYSIS_STALE` | analysis older than `JEV_MAX_ANALYSIS_AGE_MS` | escalate |

Verdict precedence: `BLOCK` > `ESCALATE` > `PASS`.

# Modes and fail policy

* `JEV_MODE=shadow` (default): non-PASS verdicts are recorded via
  `logGuardBlock('JEV', …)` as `WARN_ONLY` rows with `skipNotify`; orders are
  never stopped.
* `JEV_MODE=enforce`: `BLOCK`/`ESCALATE` reject the order (`blocked_by:
  'jev'`) and notify the operator.
* `JEV_MODE=off`: validator skipped.

Tunables: `JEV_MIN_REASONING_LEN` (20), `JEV_MIN_REASON_LEN` (4),
`JEV_MAX_ANALYSIS_AGE_MS` (30 min).

If the validator itself throws, the policy follows the L0 degraded
principle: risk-reducing orders pass, risk-increasing orders are blocked in
enforce mode.

# Input contract

`validateDecision({ params, analysis, config, now })` where `analysis` is the
normalized `log_analysis` record kept per symbol in `src/globals.js`
(`analysesBySymbol`: thoughtId, symbol, action, confidence, reasoning, ts).
The registry is populated in the `log_analysis` handler and cleared when the
order consumes it, alongside the existing thought_id/confidence linkage.

# Recording

Non-PASS verdicts are journaled through the existing guard-block path
(`logGuardBlock` → `thoughts` row with `action=WARN_ONLY` or `BLOCKED`,
`concerns='JEV'`). PASS verdicts log to console only so the table is not
flooded with uninformative rows. Shadow-mode evaluation uses these rows to
measure false-positive rates before enforcement.

# Constitution basis

* [CONFIDENCE CALIBRATION](/system/constitution/confidence-calibration.md) —
  LLM-reported confidence is not a calibrated probability;
  `JEV_CONFIDENCE_EXTREME` treats ≥0.99 self-certainty as an anomaly rather
  than a signal (see the measured 0.80–0.89 overconfidence bucket).
* [L1 Data Validation](l1.md) — JEV extends payload validation into
  thought↔order consistency, which L1 cannot see.

# Boundaries

* JEV never calls an LLM, never reads `_lilith_safe/`, and never modifies
  orders — it only accepts, rejects (enforce), or annotates (shadow).
* Enabling `JEV_MODE=enforce`, changing the check set, or moving JEV inside
  the order path's blocking sequence requires Jun approval and independent
  review.

# Citations

* `magi-core/lib/jev.js` (`validateDecision`, `readJevConfig`).
* `magi-core/src/llm.js` (JEV block in `place_order`; analysis capture in
  `log_analysis`).
* `magi-core/src/globals.js` (`analysesBySymbol` registry).
* `magi-core/lib/__tests__/jev.test.js`.
* `dogmaai/magi-core` Issue #479 (design record).
