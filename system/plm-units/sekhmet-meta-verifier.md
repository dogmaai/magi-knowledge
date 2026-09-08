---
type: Analysis Component
title: SEKHMET Meta Verifier
description: Cost-bounded SHADOW reviewer for evaluated hard cases; code merged but not deployed.
lilith_safe: false
status: draft
generated: { by: "process:chatgpt-codex", at: 2026-09-08T08:34:25Z }
verified: { by: "process:github-ci", at: 2026-09-08T08:34:25Z }
stale_after: 2027-03-07T08:34:25Z
tags: [sekhmet, sakana, fugu, shadow, hard-cases, offline-analysis]
provider: sakana
model: fugu-ultra
unit_status: code-merged-not-deployed
---

# Status

The implementation was merged in `magi-core` PR #428 at
`6f53dadfe9260cd195b6481574bc768c722afa96`, but it is **not operational**.
The BigQuery table has not been confirmed as created, and no Cloud Run job or
Cloud Scheduler trigger has been added. This document remains `draft` until
those facts are verified by Jun.

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

# Dependencies and activation order

1. Jun reviews and executes `magi-core/sql/create_sekhmet_reviews.sql`.
2. Confirm the table in BigQuery location `US`.
3. Create a separately reviewed Cloud Run Job and Scheduler change.
4. Keep the component SHADOW-only and measure useful findings versus token cost.
5. Promote this document to `stable` only after the deployed configuration is
   checked against the implementation.

# Citations

* `dogmaai/magi-core/sekhmet-meta-verifier.js`.
* `dogmaai/magi-core/lib/__tests__/sekhmet-meta-verifier.test.js`.
* `dogmaai/magi-core/sql/create_sekhmet_reviews.sql`.
* `dogmaai/magi-core` PR #428, merge
  `6f53dadfe9260cd195b6481574bc768c722afa96`.
