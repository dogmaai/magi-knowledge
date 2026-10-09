---
type: BigQuery Table
title: method_cards (proposed)
description: L2 method-card registry — distilled, evidence-backed decision methods as model-independent cards; usability is bound by approvals in method_card_approvals, never by fields on the card itself.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-09T23:03:00Z }
stale_after: 2027-04-09T23:03:00Z
tags: [echidna, bigquery, distillation, method-cards, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — does not exist yet)
---

> **Draft — proposed table, not yet created.** The card registry mirrors
> `lib/method-card.js` (schema `0.2.0-draft`); any live-path reader or
> prompt injection is a separate, independently reviewed change. The DDL
> lives in `magi-core` (`sql/`) for Jun to apply.

L2 of the corpus: method cards are the distilled product — a decision
method whose effect reproduced on frozen evidence. Per the option-A
determination in
[model-consolidation](/system/constitution/model-consolidation.md), a card
is inert documentation until approved: `draft → approved → revoked/expired`
with every transition journaled in
[method_card_approvals](method-card-approvals.md).

# Model-independent by contract (schema v0.2)

The card describes the **method and its evidence**, not a model binding —
ARC/SIG base models are unselected, so `target_model_*` is optional
provenance (which model produced the evidence), never a constraint. Which
cohort/model a card may be applied to is bound by the **approval scope**,
not the card body. This matches the distillation contract fix in
`magi-core#591`.

# Schema (proposed)

| Column | Type | Description |
|---|---|---|
| card_id | STRING | Card identifier (`card-…`). |
| schema_version | STRING | Card schema (`0.2.0-draft`). |
| content_hash | STRING | Hash of the semantic card content — the value approvals bind. |
| target_unit | STRING | Slot the method applies to (`ARC`/`SIG` semantics, not a model). |
| target_model_provider | STRING | Provenance only — provider that produced the evidence (NULL allowed). |
| target_model_version | STRING | Provenance only — model that produced the evidence (NULL allowed). |
| method_summary | STRING | What the method does. |
| applies_when | STRING | Condition under which the method applies. |
| falsified_when | STRING | Condition under which the method is considered falsified. |
| stats_json | STRING | `{sample_count, eval_period{from,to}, uncertainty, supporting/refuting counts, cost-adjusted results}`. |
| provenance_corpus_manifest_hash | STRING | Manifest hash of the frozen `distill_bundles` input the card was distilled from. |
| provenance_bundle_id | STRING | `bundle_id` of the source bundle (`provenance.bundleId` in the card contract). |
| provenance_source_cohort | STRING | Cohort that produced the evidence rows. |
| evaluation_refs | ARRAY&lt;STRING&gt; | References to evaluations run against this card (`evaluationRefs` in the card contract — part of content identity). |
| generation_by | STRING | Actor that drafted the card (`devin/cli`, …). |
| generation_pipeline_version | STRING | Distillation pipeline version. |
| state | STRING | `draft` / `approved` / `revoked` / `expired` (derived from latest approval event + validity). |
| expires_at | TIMESTAMP | Card validity end — extension requires re-approval. |
| created_at | TIMESTAMP | Card creation instant. |
| ingested_at | TIMESTAMP | BigQuery insert time. |

# Contracts

* **Content hash is the identity.** Editing card content after approval
  changes `content_hash`, which invalidates every approval bound to the
  old hash — silent edits cannot ride an existing approval.
* **Evidence stays attached.** `provenance_corpus_manifest_hash` links the
  card to the exact frozen bundle that supports it; a card whose evidence
  bundle is invalidated is flagged for re-review.
* **A card is never self-authorizing.** `state = approved` exists only in
  the presence of a matching `method_card_approvals` row from a `human:*`
  actor.
