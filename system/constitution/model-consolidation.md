---
type: Policy
title: "MODEL CONSOLIDATION"
description: Evidence-based consolidation of the ensemble's trade-decision core toward 1-2 units. Documentation-level objective; NOT part of the runtime prompt tree.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-08T08:25:00Z }
stale_after: 2027-03-25T11:15:00Z
tags: [constitution, consolidation, ensemble, learning, draft]
version: "0.5"
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
* `lib/order-arbiter.js` (`magi-core#584`, contract v0.2) — verdict-only
  shared execution authority implementing Jun's 2026-10-08 determinations:
  independent allocation, pre-fixed versioned competition rule, exits never
  wait, long-only sell scope, no averaging-down adds, peer-stop halts all
  new risk, account must be verified paper, fail-closed on L0
  `halted`/authority outage.
* `lib/experiment-gates.js` — the Jun-approved USD limits and the
  loss-adjusted budget invariant (below), pure functions over an injected
  ledger snapshot.
* `lib/account-guard.js` — paper/REAL proven from broker-confirmed account
  info + an allowlist; never from an LLM claim or a lone env var.
* `lib/reservation-store-firestore.js` — persistent reservation backend
  (Firestore-transaction shape over an injected `db` facade): serialized
  capacity via a budget doc, per-decision reservation docs, epoch fencing
  against stale dispatchers, `hydrate()` restart restore, terminal-only
  release. Broker POST is never inside a transaction.
* `fc26b7e` (`magi-core#583`) — UNKNOWN→SELL blind-resubmission fix
  implementing the order-intents contract
  ("reconciliation, never blind resubmission"). Verified against a real
  HTTP wire path (local bridge stub, real TCP, only service discovery and
  auth mocked) in `lib/__tests__/sell-retry-real-path.test.js`.
* `splitReservationOnFill` (`lib/experiment-gates.js`) — partial-fill
  ledger split: held principal + remaining reservation + released
  slippage must conserve the original reservation exactly; fill above
  limit or overfill fails closed.
* `docs/arc-sig-firestore-setup.md` (`magi-core`) — provisioning package
  for Jun: schema, transaction boundaries, IAM, commands, cost, rollback.

These are candidate modules tested against fixtures/stubs only. They are
**not** connected to production sessions, brokers, BigQuery or prompts.

## Jun determinations (approved 2026-10-08 — paper account only)

Scope: **paper trading only**. NAV at approval 1,062,192.79 USD; total
experiment loss budget **1,000 USD** — not daily, not per-trade, never
reset by date change/restart/model/snapshot updates, never increased by
profit. Earlier provisional %-based limits are replaced by these USD caps.
REAL trading, margin, short, options and leveraged products are outside
this approval. Learning is input-level **B only** — no weight updates, no
autonomous A generation/promotion, no new paid services.

* **L1.7**: dual protection — per-unit limit stops that unit's new risk;
  account-wide limit stops the whole account's new risk. Realized daily
  loss and flow-adjusted valuation loss are separate metrics (never
  double-counted). See `system/guards/l1-7.md`.
* **Arbitration**: independent allocation + deterministic shared execution
  authority; consensus not required; no third LLM arbitrates. Same-symbol
  same-direction entries resolved by a pre-fixed versioned competition
  rule (never summed); opposite-direction new exposure deferred; exits
  never wait; SELL limited to reducing existing longs (no shorts);
  no-averaging-down enforced programmatically; adopted `thought_id`↔order
  lineage preserved; non-adopted intents go to virtual evaluation only.
* **Unit failure**: any stopped/unhealthy unit stops ALL new risk; exits
  continue; no quota transfer; solo continuation NOT approved this round.
* **Approved USD limits** (experiment only — ceilings, not targets):
  loss budget 1000; total principal 800; per-unit principal 400; per-order
  principal 200; fee reserve 200; per-trade stress ≤20; total stress ≤80;
  unit daily realized loss −50; account daily realized OR valuation −100;
  early stop at 500 consumed/drawdown (exits only after that; restarting
  needs fresh Jun approval); ≥1000 = violation → end + cause report.
* **Budget invariant** (checked on every new BUY):
  `consumedRealizedLoss + heldPrincipal + pendingBuyCommitment
   + newOrderMaxPayable + feeReserve ≤ 1000`.
  BUYs must bound max payment (limit price required). Partial fills split
  between held principal and remaining reservation; UNKNOWN / cancel
  request / timeout never release a reservation; stress estimate ≥10%
  adverse move + fees (higher for gap/liquidity risk; never a maximum-loss
  guarantee).
* **Account isolation** (Jun decision 2026-10-08, updated): the paper
  account `182729395` (MooMoo SIMULATE, broker-confirmed `trd_env`) is
  the **dedicated PLM paper account**. All PLM order flow — including the
  ARC×SIG experiment and existing units (TYPHON, QWEN observed live) —
  belongs to this account and routes through the shared execution
  authority once wired; until every PLM order path goes through the
  arbiter, the experiment `externalReconciled` gate stays fail-closed.
  Non-PLM flows are not present in this account. Existing holdings
  (XOM/AMAT/WMT/CVX/PLTR ≈ $117.6k at 2026-10-08) are pre-existing PLM
  positions, not experiment positions; they are recorded in the baseline
  and never disposed or reattributed. `MOOMOO_ACC_ID=182729395` should be
  pinned explicitly on the bridge (auto-discovery only as fallback);
  `/account_info` must return `acc_id` (dogmaai/magi-moomoo#87) for the
  allowlist check to pass. Baseline record (account id, confirmed paper
  mode, positions, open orders, baseline NAV, experiment id) at start —
  measured NAV 1,062,382.85 USD on 2026-10-08 (approval-time figure
  1,062,192.79 USD also recorded); any order path not reflected in the
  shared state → no new experiment orders; existing holdings are not
  disposed of nor covered by the budget.

## Measurement plan (proposal — pending Jun; not approved yet)

Draft proposal answering Jun directive §9 ("sample size and comparison
period fixed in advance; an experiment stopped early stays 'insufficient',
never a winner"). Numbers below are proposals, not approved values.

* **Unit of comparison**: a decision-outcome pair (intent → fill → exit or
  horizon expiry), namespaced per (unit, model, boundary). Both C (fixed
  baseline) and B (distillation-fed) are scored on identical
  same-time / same-information / same-symbol samples.
* **Minimum evaluable sample**: ≥60 outcome-matured decision pairs per
  configuration AND per unit before any comparative verdict. Fewer →
  report "insufficient sample" with the observed distribution and its
  uncertainty interval; never rounded into a winner.
* **Outcome maturity**: position closed, or 10 trading days after fill,
  whichever comes first. Immature outcomes are excluded from comparison
  and reported separately (they are neither profit nor loss).
* **Comparison window**: up to 60 trading days from first live dispatch,
  ending earlier at early stop or budget violation. The window is frozen
  at experiment start; it is not extended to reach a sample count.
* **Time-ordered validation for method cards**: a card is distilled only
  from fills reconciled before its watermark; it is evaluated only on
  decisions after that watermark (purge overlapping windows + 1 trading
  day embargo around the boundary; walk-forward, never reshuffled).
* **Pass threshold (proposed)**: after-cost expectancy improvement whose
  bootstrap 95% CI lower bound is > 0, with drawdown not worse than the
  baseline at the same confidence. Win rate alone is never sufficient
  (selection criteria above).
* **Non-adopted side**: the unit whose intent lost arbitration is scored
  separately as `shadow_virtual` — real capital is never attributed twice.

## Open decisions for Jun

* Production atomic-reservation backend on GCP (Firestore provisioning,
  IAM, deploy) — Jun executes; adapter contract exists, real-backend
  atomicity not yet proven.
* Approval of the measurement-plan proposal above (sample size, window,
  thresholds).
* Cost assumptions where fills/fees cannot be confirmed.
* Scope of "1–2": decision core only (this document) vs. wider processing —
  undecided.
* Learning method and learning-data boundary for any additional training
  evaluated under procedure step 4 — each requires separate Jun approval;
  nothing in this document pre-approves a boundary.
* Experiment start conditions (Jun §8): isolated real-path verification of
  the UNKNOWN fix, real-backend concurrency/restart/stale-dispatcher
  tests, unit-stop/authority-outage/L0-HALTED checks, budget-exhaustion
  and daily-rollover behaviour, paper/REAL mixup rejection, no double
  attribution, no guard-bypassing order path. InMemory+fixture passes do
  NOT satisfy these.

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
