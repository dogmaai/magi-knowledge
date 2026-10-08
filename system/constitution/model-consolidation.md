---
type: Policy
title: "MODEL CONSOLIDATION"
description: Evidence-based consolidation of the ensemble's trade-decision core toward 1-2 units. Documentation-level objective; NOT part of the runtime prompt tree.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-08T07:19:37Z }
stale_after: 2027-03-25T11:15:00Z
tags: [constitution, consolidation, ensemble, learning, draft]
version: "0.4"
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

## Final-form codenames (Jun-stated concept, recorded 2026-10-08)

The two slots of the converged decision core carry the codenames **ARC**
(production-A) and **SIG** (production-B), run as an **Active×Active**
redundant pair: both units are full production voters, and the pair exists
to absorb single-unit degradation or failure — it is not a judge+challenger
split.

Concept origin (Jun): multiple LLMs trade; the thoughts that actually
reached fills are collected centrally and distilled into the training data
from which the final units are built.

The codenames are slot identifiers only, deliberately decoupled from
existing unit names:

* ARC is **not** the retired [LILITH](/system/plm-units/lilith.md)
  (`lilith-v1.0-b2-prod`). No pipeline, weights, or data of the retired
  LILITH line are implied; the "not a LILITH revival" boundary below stands.
* SIG is **not** the currently deployed [ADAM](/system/plm-units/adam.md)
  (Ollama `qwen2.5:7b` collaborative analyst). Deployed ADAM is a provisional
  swarm contributor bearing its own name; whether a slot ends up occupied by
  an improved/renamed existing unit or a new one is part of the
  evidence-based selection below.

Active×Active imposes a hard decorrelation constraint: two slots trained on
the same corpus with the same method share failure modes and provide no
real redundancy. The cross-unit correlated-losses criterion under
*Selection criteria* is therefore binding for this configuration, and
differentiated base models, information sets, or accumulated decision
methods are the expected decorrelators.

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
* **Not a preselected model.** The slot codenames are fixed (ARC / SIG,
  above); no model, provider, or occupying unit is named in advance.
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
  where the second unit's role is disproof rather than agreement. The
  reference final configuration is the Active×Active ARC×SIG pair defined
  above; judge+challenger remains a comparison candidate, not the stated
  end-state.

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

## Implementation status (recorded 2026-10-08)

Offline **candidate** contracts for this shape now exist in `magi-core`
(unmerged at time of writing):

* `lib/experience-distillation.js` + `lib/method-card.js`
  (`magi-core#584`) — option **B** of the C→B→A plan: deterministic
  extraction/validation/aggregation over injected fixtures only. Outcome
  kinds `realized` / `shadow_virtual` / `immature` / `unevaluable` are kept
  separate; an unevaluated decision is never relabelled a loss. Method
  cards carry a `draft → approved → revoked/expired` lifecycle where
  approval binds content hash, selector version, combination and scope —
  no `human:*` verification is fabricated by the code.
* `lib/order-arbiter.js` (`magi-core#584`) — verdict-only shared execution
  authority: deterministic competition rule, atomic-reservation contract,
  exit precedence, `decision_id` idempotency, fail-closed on L0
  `halted`/authority outage. No dispatch path exists.
* `fc26b7e` (`magi-core#583`) — UNKNOWN→SELL blind-resubmission fix
  implementing the order-intents contract
  ("reconciliation, never blind resubmission").

These are candidate modules tested against fixtures/stubs only. They are
**not** connected to production sessions, brokers, BigQuery or prompts, and
they do not resolve the open decisions below.

## Open decisions for Jun

* Order-arbitration policy for the Active×Active pair: consensus-required
  vs independent allocation with a shared risk ceiling; abstention on
  disagreement; solo-operation conditions when one side stops. The
  `order-arbiter` candidate implements a configurable version of
  "independent allocation" as a test fixture — that is a contract shape,
  not a policy choice.
* Production atomic-reservation backend (single-writer / transactional)
  and its atomicity proof — `InMemoryReservationStore` only models the
  contract.
* All numerical thresholds and per-unit capital allocations (candidate
  code injects them from config; no production values were chosen).
* L1.7 per-unit vs account-wide scope: `system/guards/l1-7.md` (stable)
  describes per-unit blocking while `lib/daily-loss.js` additionally trips
  on an account-wide limit (commit `5879a8e7`). Implementation drift —
  reported in magi-core#583, unresolved here.
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
