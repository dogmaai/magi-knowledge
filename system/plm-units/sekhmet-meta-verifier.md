---
type: Analysis Component
title: SEKHMET Meta Verifier
description: Deployed weekly cost-bounded SHADOW reviewer for evaluated hard cases.
lilith_safe: false
status: stable
generated: { by: "process:github-actions", at: 2026-09-08T09:17:58Z }
verified: { by: "human:jun", at: 2026-09-08T09:17:58Z }
stale_after: 2027-03-07T09:17:58Z
tags: [sekhmet, sakana, fugu, shadow, hard-cases, offline-analysis]
provider: sakana
model: fugu-ultra
unit_status: shadow-active
---

# Status

The implementation is deployed from `magi-core`
`71722acce9b86b0d965ae368f1c204399b65ea12`. GitHub Actions deployment run
`34208044793` completed successfully on 2026-09-08. Jun created and visually
verified `magi_core.sekhmet_reviews` in BigQuery location `US`.

The weekly job is active. The first successful SHADOW review row remains an
operational verification item in `magi-core` Issue #429.

# Purpose

The verifier supplements, but does not replace, the stable
[legacy SEKHMET analyzer](sekhmet.md). Instead of summarizing the latest trade
window, it selects a small set of evaluated hard cases where expensive Fugu
reasoning is more likely to produce a testable finding.

# Candidate selection

`sekhmet-meta-verifier.js` reads the US-region
`magi_core.thoughts × magi_core.trades` join for the preceding 90 days and
selects at most 12 unreviewed cases. Current deterministic triggers are:

* `HIGH_CONFIDENCE_LOSS`: a losing directional thought with confidence at
  least 0.70.
* `LOW_SAMPLE_PATTERN`: fewer than five evaluated rows for the same
  symbol/action/VIX-regime tuple.
* `HIGH_IMPACT_OUTCOME`: absolute realized PnL of at least 3 percent.

These are implementation defaults, not trading thresholds. Selection only
controls which historical cases consume Fugu budget.

Priority is proportional to absolute realized PnL, reported confidence, and a
low-sample uncertainty multiplier. A SHA-256 fingerprint prevents the same
evaluated outcome from being reviewed repeatedly. If no candidate remains, the
job skips the Sakana API call.

# Output contract

Each input `thought_id` must receive exactly one `PASS`, `CHALLENGE`, or
`ABSTAIN` review. Allowed finding types are `FAILURE_PATTERN`,
`GUARD_CANDIDATE`, `POLICY_CARD`, `EXPERIMENT`, and
`NO_ACTIONABLE_FINDING`.

Every response carries evidence, counterexamples, applicability, exclusions,
a falsifiable acceptance test, and optional read-only validation SQL. The
runtime accepts one `SELECT` or `WITH` statement only and rejects
multi-statement, DDL, DML, scripting, export, and privilege operations.

# Immutable SHADOW boundary

* Reviews are audit records only.
* Reviews do not change orders, guards, quantities, trade mode, or PLM prompts.
* Reviews must never be consumed by LILITH or copied into `_lilith_safe/`.
* API, timeout, JSON, validation, and BigQuery failures end the batch with a
  non-zero result; they never fall through to a trading action.
* A future enforcement path requires a separate specification, Jun approval,
  and independent review.

# Cost controls

The defaults are 12 candidates, 6,000 maximum output tokens, a 180-second
request timeout, and a 90-day candidate window. Environment overrides are
`SEKHMET_MAX_CANDIDATES`, `SEKHMET_MAX_OUTPUT_TOKENS`,
`SEKHMET_REQUEST_TIMEOUT_MS`, and `SEKHMET_WINDOW_DAYS`.

# Approved weekly operating policy

Jun approved the initial SHADOW envelope on 2026-09-08:

* Job: `magi-sekhmet-meta-verifier`.
* Scheduler: `magi-sekhmet-meta-verifier-weekly`.
* Schedule: Saturday 00:30 `America/New_York`.
* At most 12 candidates and 6,000 output tokens per run.
* 90-day candidate window, 180-second API timeout, zero Cloud Run retries.
* An empty candidate set makes zero Sakana API calls.
* Review cost and actionable findings after four completed weekly runs.
* If value is weak, reduce to eight candidates and 4,000 output tokens before
  considering higher frequency.

These values govern retrospective SHADOW analysis only; they are not trading
thresholds.

# Operations and evaluation

* Confirm the first successful SHADOW row in `sekhmet_reviews`.
* Review token cost and actionable findings after four completed weekly runs.
* Any non-SHADOW consumer or enforcement behavior requires a separate
  specification, Jun approval, and independent review.

# Citations

* `dogmaai/magi-core/sekhmet-meta-verifier.js`.
* `dogmaai/magi-core/lib/__tests__/sekhmet-meta-verifier.test.js`.
* `dogmaai/magi-core/sql/create_sekhmet_reviews.sql`.
* `dogmaai/magi-core` PR #428, merge
  `6f53dadfe9260cd195b6481574bc768c722afa96`.
* `dogmaai/magi-core` PR #430, merge
  `71722acce9b86b0d965ae368f1c204399b65ea12`.
* GitHub Actions Deploy to Cloud Run run `34208044793` (success).
