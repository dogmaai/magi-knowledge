---
type: BigQuery Table
title: arbiter_verdicts (proposed)
description: L0 append-only BigQuery mirror of the Firestore arbitration verdicts — every unit proposal and its adoption outcome, so NOT_ADOPTED decisions are part of the comparable corpus instead of existing only in Firestore.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-09T23:56:00Z }
stale_after: 2027-04-09T23:03:00Z
tags: [echidna, bigquery, distillation, arbitration, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — created 2026-10-10; draft schema)
---

> **Draft — proposed schema; table created 2026-10-10 in `magi_core`.** The mirror writer (verdict
> → BigQuery) is a new write path requiring a separate reviewed change;
> the DDL lives in `magi-core` (`sql/`) and was applied by Jun on 2026-10-10.

The shared execution authority records its verdict per decision in
Firestore. `arbiter_verdicts` mirrors those verdicts into ECHIDNA so the
distillation corpus sees **every** proposal — including `NOT_ADOPTED`
ones, which today exist only in Firestore and would otherwise be invisible
to same-condition unit comparison (selection-bias guard in
[model-consolidation](/system/constitution/model-consolidation.md)).

The proposed action is preserved independently of the outcome: a verdict
row stores *what the unit wanted* (`proposed_action`) and *what the
authority did* (`verdict`) as separate facts, so a suppressed BUY is still
evaluable as a virtual decision.

# Schema (proposed)

| Column | Type | Description |
|---|---|---|
| decision_id | STRING | Decision this verdict resolves. |
| opportunity_id | STRING | Same-time / same-information comparison key shared across units (NULL when not emitted). |
| unit_name | STRING | Proposing unit. |
| experiment_id | STRING | Owning experiment (`arc-sig-paper-1`). |
| session_id | STRING | Session that produced the proposal. |
| proposed_action | STRING | `BUY` / `SELL` / `HOLD` — the unit's original proposal, never overwritten by the verdict. |
| verdict | STRING | `ADOPTED` / `NOT_ADOPTED` / `DEFERRED` / `REJECTED`. |
| rule_version | STRING | Version of the competition rule that decided the verdict. |
| reason | STRING | Deterministic rule reason (e.g. `same_symbol_conflict`, `capacity_exceeded`). |
| rival_decision_id | STRING | Winning decision when the verdict resolved a competition. |
| reservation_id | STRING | Firestore reservation doc for adopted new-risk orders. |
| verdict_doc_path | STRING | Source Firestore document path (audit trail back to the authority of record). |
| record_version | INT64 | Correction chain; latest version wins (≥1). |
| record_hash | STRING | Content hash for dedupe/conflict detection. |
| created_at | TIMESTAMP | Verdict issuance instant. |
| ingested_at | TIMESTAMP | BigQuery insert time. |

# Contracts

* **Append-only.** Firestore remains the authority of record; this table
  is a mirror. Divergence between the two is drift to report, never
  silently repaired.
* **Mirror drift is checked, not assumed.** The mirror writer's contract
  includes a scheduled verification pass: per `verdict_doc_path`, compare
  the **max `record_version`** row (and its `record_hash`) against the
  current Firestore verdict document — older versions are legitimate
  history, not drift. A missing path, a divergent max version, or several
  different hashes at the same max version are reported as drift /
  conflicts; repair is a new `record_version` ingest after review, never
  an in-place rewrite. History completeness (a contiguous version chain
  per path) is a separate check from current-value agreement. (The
  verification pass ships with the mirror writer — a separate reviewed
  change, not yet wired.)
* **Verdicts are per decision, not per order.** A `NOT_ADOPTED` row has no
  `reservation_id`; that absence is expected data, not a missing join.
