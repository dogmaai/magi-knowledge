---
type: Guard Layer
title: JEV Decision Validator
description: Deterministic typed validator on the place_order path — cross-checks the order against the session's linked log_analysis before the shadow/broker path. Not an LLM.
lilith_safe: false
status: stable
generated: { by: devin/local, at: 2026-09-19T03:20:00Z }
verified: { by: human:jun, at: 2026-09-22T01:09:00Z }
stale_after: 2027-03-22T01:09:00Z
tags: [guard, jev, validation, decision-integrity]
layer: JEV
on_fail: warn (JEV_MODE=shadow) / block (JEV_MODE=enforce)
---

> Implemented in `magi-core` (#480, #485). `JEV_MODE=shadow` (default)
> records verdicts without stopping orders; enforcement requires a separate
> change, Jun approval, and independent review.

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
| `JEV_THOUGHT_ACTION_UNSUPPORTED` | analysis action outside {BUY, SELL, HOLD} | block |
| `JEV_THOUGHT_ACTION_MISMATCH` | BUY↔sell / SELL↔buy | block |
| `JEV_REASONING_THIN` | analysis reasoning below minimum length | block |
| `JEV_ANALYSIS_BAD_TIMESTAMP` | analysis timestamp missing or invalid | block |
| `JEV_CONFIDENCE_EXTREME` | confidence ≥ 0.99 (uncalibrated certainty) | escalate |
| `JEV_THOUGHT_ID_MISMATCH` | echoed thought_id ≠ session registry | escalate |
| `JEV_ANALYSIS_STALE` | analysis older than `JEV_MAX_ANALYSIS_AGE_MS` | escalate |

Verdict precedence: `BLOCK` > `ESCALATE` > `PASS`.

# Modes and fail policy

* `JEV_MODE=shadow` (default): non-PASS verdicts are recorded via
  `logGuardBlock('JEV', …)` as `WARN_ONLY` rows with `skipNotify`; orders are
  never stopped.
* `JEV_MODE=enforce`: `BLOCK`/`ESCALATE` reject the order (`blocked_by:
  'jev'`) and notify the operator. **Exception (Jun decision
  2026-09-21):** a non-PASS verdict on a *risk-reducing* order (an exit
  or a pure short cover, measured via `isIncreasingExposure` against
  live positions) never blocks — it is journaled as `WARN_ONLY`
  instead. Positions must always be unwindable, same principle as the
  validator-error policy below, L0 degraded mode, and L1.7.
  Position-lookup failure treats the order as risk-increasing
  (fail-closed).
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
The registry is populated in the `log_analysis` handler and consumed when the
order **reaches the broker** (or is shadow-recorded) — a validation alone does
not consume it, so an order blocked by a later guard can be retried against the
same analysis. Consumption happens even when the fill is unconfirmed
(conservative: the order may be live at the broker, and a retained analysis
could justify a duplicate). A retry therefore requires a fresh `log_analysis`.

`analysis.confidence` deliberately preserves the **raw** LLM-reported value,
captured before the `safeFloat(...) ?? 0` normalization the handler applies
for sizing. Missing or non-numeric confidence must reach JEV un-normalized —
normalizing first would make `JEV_CONFIDENCE_INVALID` unreachable and hide
miscalibrated units. Downstream consumers keep using the normalized value.

# Recording

Non-PASS verdicts are journaled through the existing guard-block path
(`logGuardBlock` → [`thoughts`](/system/echidna-tables/thoughts.md) row with
`action=WARN_ONLY` or `BLOCKED`, `concerns='JEV'`). PASS verdicts log to
console only so the table is not flooded with uninformative rows. Shadow-mode
evaluation uses these rows to measure false-positive rates before
enforcement.

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
* JEV runs on the LLM `place_order` tool path only. PositionManager
  `AUTO_CLOSE` exits call `executeMoomooOrder` directly and never reach JEV —
  out of scope by design, but it matters for enforce planning (JEV cannot
  block or annotate risk-reducing auto-closes).
* Enabling `JEV_MODE=enforce`, changing the check set, or moving JEV inside
  the order path's blocking sequence requires Jun approval and independent
  review.

# Open items (2026-09-19 shadow-phase review)

Observed while verifying the merged implementation (`magi-core` PR #480,
deployed 2026-09-18 in `JEV_MODE=shadow`; first verdicts expected with the
2026-09-21 session batch). These are known gaps or candidates, not
spec-code violations:

* **Medium** — In `shadow` mode a `validateDecision` exception journals to
  console only — no [`thoughts`](/system/echidna-tables/thoughts.md) row — so
  shadow-period evaluation cannot count validator failures. Candidate: emit a
  WARN_ONLY guard-block row on validator error.
* **Medium** — `JEV_MAX_ANALYSIS_AGE_MS` has no upper bound; a misconfigured
  huge value silently disables `JEV_ANALYSIS_STALE`. Candidate: sanity ceiling.
* **Low** — An analysis `ts` in the future yields a negative age and passes
  `JEV_ANALYSIS_STALE`. Candidate: bound negative age.
* **Resolved 2026-09-21** — First shadow data (45 evaluations across the
  Monday session batch): 36 PASS, 9 non-PASS `WARN_ONLY` rows, 0 validator
  errors, 0 enforce leaks. All 9 violations were exit orders: 4×
  `JEV_THOUGHT_HOLD` (HOLD analysis followed by a SELL — true drift
  detections) and 5× `JEV_THOUGHT_MISSING` (exits with no same-session
  analysis, plus re-orders after a consumed analysis — correct
  anti-reuse). Jun decision: exits are never JEV-blocked → carve-out
  implemented in `magi-core#485`.
* **High** — Integration coverage: partially addressed —
  `llm-place-order.test.js` now covers the enforce reject, the exit
  carve-out journaling, and lookup fail-closed (`magi-core#485`);
  remaining wiring paths still untested. Required before any
  `JEV_MODE=enforce` proposal (Phase 2 gate).
* **Awaiting Jun decision** — Candidate spec additions raised in review, not
  implemented: a richer typed verdict record (`analysis_age_ms`, per-check
  `checks` map, `validator_version`, `evaluated_at`) and a
  position-consistency check. (The risk-reducing input was resolved
  2026-09-21 — handled in the enforce path via live-position
  `isIncreasingExposure`, not as a validator input.)

# Citations

* `magi-core/lib/jev.js` (`validateDecision`, `readJevConfig`).
* `magi-core/src/llm.js` (JEV block in `place_order`; analysis capture in
  `log_analysis`).
* `magi-core/src/globals.js` (`analysesBySymbol` registry).
* `magi-core/lib/__tests__/jev.test.js`.
* `dogmaai/magi-core` Issue #479 (design record).
