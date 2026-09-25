---
type: Policy
title: "MODEL CONSOLIDATION"
description: Evidence-based consolidation of the ensemble's trade-decision core toward 1-2 units. Documentation-level objective; NOT part of the runtime prompt tree.
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-25T11:15:00Z }
stale_after: 2027-03-25T11:15:00Z
tags: [constitution, consolidation, ensemble, learning, draft]
version: "0.2"
source: none — documentation-level objective, not emitted by buildSwingConstitution()
---

# MODEL CONSOLIDATION — objective and procedure

> **Draft — unverified proposal.** This document records Jun's stated
> preparation-phase objective so that agents can cite one canonical place
> instead of inferring it from task prompts. It is documentation-level policy:
> it is **not** a section of `buildSwingConstitution()` and must not be
> injected into PLM prompts.

## Objective

The ensemble's **trade-decision core** converges to 1–2 units, selected by
measured evidence under identical conditions. A final candidate is not
restricted to an unmodified existing unit: it may be an existing unit, an
existing unit improved by accumulating verified decision methods, or — only
where Jun has separately approved it — a unit updated by additional
training. The current phase is a preparation period: collect decision data
that makes such a comparison possible before reducing candidates.

This objective answers "what are the stored learning assets (`thoughts`,
`thoughts_shadow`, `trades` outcomes) for?" — the question left open when the
former fourth north-star objective (distillation into a fine-tuned LILITH
specialist) was removed on 2026-09-17.

## What this is NOT — explicit boundaries

* **Not a LILITH revival, and not a data-boundary change.** The retired
  item 4 stays retired: this proposal does not permit reintroducing a
  dedicated fine-tuned production unit, and it neither reuses nor loosens
  the `_lilith_safe/` data boundary. It does not, however, prohibit
  improving a candidate unit through verified decision methods, nor
  evaluating additional training (weight updates) where the method and the
  learning-data boundary have separate approval.
* **Not whole-system consolidation.** "The trade-decision core is 1–2 units"
  and "all system information processing is limited to 1–2 models" are
  different claims. Whether HERMES collection, ISABEL memory, DAPHNE review
  and other supporting roles also consolidate is **undecided** and out of
  scope here.
* **Not a preselected model.** No unit or provider is named in advance.
  Selection happens only after same-condition evidence exists.
* **Not a goal of more models, more trades, or higher win rate.**
  Profitability improvements are hypotheses to be proven, not assumptions.
* **Not a permission to weaken guards.** Data collection must not loosen
  trade guards, raise order volume, or change risk configuration.

## Preparation requirements (gate for any selection)

Selection is premature until these hold — they are tracked as implementation
work in `magi-core`, not as prerequisites this document waives:

1. **Verified outcomes**: evaluator returns results for new decisions;
   backlog starvation resolved (magi-core PR #513).
2. **Attribution integrity**: thought↔trade joins use `thought_id` (1:1);
   close events allocated FIFO without double-use (magi-core PR #513/#514).
3. **Execution evidence**: fills, settlements and fees reconciled so outcomes
   are realised P&L, not mark-to-market guesses (`price_confirmed` gap —
   open).
4. **Decision-time evidence**: sources, publication/fetch timestamps and
   content versions preserved so "what the unit knew" is reproducible — open.
5. **Comparable samples**: decisions recorded for the same timestamp, symbol
   and information set across candidate units — including HOLD, guard
   rejections and failed calls, not just executed trades. SHADOW-mode
   collection may gather these without orders.
6. **Reproducible extraction**: deterministic, time-ordered extraction and
   validation that cannot leak future information into a decision record.

## Selection criteria (proposed — must be fixed before evaluation)

Win rate alone never qualifies a unit or pair. The comparison set is defined
against the [expectancy](expectancy.md) constitution rule:

* after-cost expected value and total P&L (fees/slippage: confirmed values
  where available, explicit assumptions elsewhere);
* maximum drawdown, loss concentration, and cross-unit correlated losses;
* market/sector-relative performance over matched holding period and risk;
* calibration of stated confidence/probability;
* coverage of the full opportunity set, including passed/rejected decisions;
* inference cost and latency;
* evaluable sample count and its uncertainty — small samples are reported
  with uncertainty, not rounded into a verdict.

Pass thresholds are fixed **before** evaluation runs. "5 wins" or "win rate
improved" is never sufficient. Validation is time-ordered; a final evaluation
period stays untouched by optimisation and is not repeatedly consumed.

## Candidate configurations

Compare, on identical same-time / same-information / same-symbol samples:

* current full ensemble (baseline);
* a single unit;
* pairs — not only the top two by aggregate score, but also pairs with
  complementary strong conditions, and a "judge + challenger" arrangement
  where the second unit's role is disproof rather than agreement.

## Procedure (proposed phases)

1. Build trustworthy decision/outcome data (preparation requirements above).
2. Compare ISABEL conditional-experience recall against the current version.
3. Organise decision methods whose effect reproduces as training candidates.
4. If and only if need and data justify it, compare additional training
   (weight updates) — input-level improvement and weight-level learning are
   never conflated.
5. Compare single / pair / full ensemble — where a "unit" may be an
   existing model or one improved under steps 3–4 — under identical
   conditions and the criteria above; select only with Jun's approval after
   independent review.

## Research hypotheses (not yet validated)

First-order candidates to evaluate with existing data, one at a time:

* post-earnings / post-guidance price drift over the following days;
* macro changes (rates, FX, oil) propagating into sectors and single names.

Each study records: what happened, the surprise vs market expectation, the
impact on profit, the expected horizon, and the falsification condition.

## Open decisions for Jun

* Consolidation pass thresholds and minimum sample size per configuration.
* Observation window for the final comparison and its freeze policy.
* Cost assumptions where fills/fees cannot be confirmed.
* Scope of "1–2": decision core only (this document) vs. wider processing —
  undecided.
* Learning method and learning-data boundary for any additional training
  evaluated under procedure step 4 — each requires separate Jun approval;
  nothing in this document pre-approves a boundary.

## Cross-references

* [north-star](north-star.md) — parent objectives; the removed item 4 this
  document does not revive.
* [expectancy](expectancy.md) — the profit formula behind selection criteria.
* [thought-recording](thought-recording.md) — the 1:1 thought↔trade link the
  attribution requirement relies on.
* [trades](/system/echidna-tables/trades.md) /
  [thoughts](/system/echidna-tables/thoughts.md) — outcome and reasoning rows.
* [daphne-feedback](/system/echidna-tables/daphne-feedback.md) — improvement
  hypotheses are experiments, not confirmed causes.
* [LILITH](/system/plm-units/lilith.md) — retired unit; boundary unchanged.
