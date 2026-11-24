---
type: BigQuery Table
title: thought_embeddings
description: Cohere embeddings of thoughts reasoning, labelled with the trade outcome — the WIN/LOSE corpus behind the ISABEL centroids that the L5 guard compares against. Daily-synced from thoughts; coverage is monitored by the evaluator.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=thought_embeddings&page=table
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-11-24T10:17:00Z }
stale_after: 2027-05-24T10:17:00Z
tags: [echidna, bigquery, embeddings, isabel, l5, data-quality]
dataset: magi_core
table_type: BASE TABLE
---

> **Draft — written 2026-11-24 from magi-core `a46c545` (magi-core#734
> merged) and read-only queries against production** (`bq show`, `SELECT`
> only). Not yet human-verified. Previously listed under *Live tables not
> yet catalogued* in the [ECHIDNA index](index.md). The embedding target,
> the 7-day sync window and the guard-row exclusion below are described
> from code; whether they are intended policy is listed under
> [Decisions pending](#decisions-pending).

`thought_embeddings` holds one Cohere embedding per embedded
[thoughts](thoughts.md) row, with the reasoning text and, once the trade
resolves, its outcome label. Its main reader is ISABEL: the WIN/LOSE rows
form the win/lose centroids that the [L5 guard](/system/guards/l5.md)
(warn-only) compares a new reasoning against.

# Producer

`magi-sync-embeddings` (`sync_embeddings.mjs`), scheduled by
`magi-sync-embeddings-daily` — schedule in
[magi-core](/system/services/magi-core.md). Each run:

1. **Label refresh** (`TRADE_RESULT_BACKFILL_SQL`, an `UPDATE`): re-resolves
   `trade_result` on already-embedded rows whose label is `NULL` or `HOLD`
   and whose `created_at` is within 90 days, joining `trades` on
   `thought_id` with the attribution-integrity conditions of
   [thoughts](thoughts.md#attribution-integrity). Ambiguous ids stay
   unlabelled; a `NULL` resolution never overwrites a label.
2. **Candidate selection**: thoughts rows matching the **embedding target**
   — `reasoning` non-NULL and longer than 10 characters, `thought_id`
   non-NULL (`embeddingTargetPredicate`, `lib/embedding-candidates.js`) —
   written within the last **7 days** (`EMBED_SYNC_WINDOW_DAYS`), and not
   already embedded under either id form (two anti-joins; see
   [Id forms](#id-forms)).
3. **Per-id validation** (`selectEmbeddingCandidates`): a `thought_id` whose
   rows disagree on reasoning or on session / symbol / provider /
   trade_mode, or that joins more than one independent `order_id`, is
   excluded and logged (`[EMB-EXCLUDED]`) — on every run while it stays in
   the window. Identical duplicate rows collapse to one write.
4. **Embed and append** (`embedAndInsert`): Cohere `embed-v4.0`,
   `input_type: search_document`, 1024 dimensions, text truncated to 500
   characters, batches of 96; each batch is appended with a load job.

Guard audit rows (`action` `BLOCKED` / `WARN_ONLY`) carry no `thought_id`, so
they fall outside the target and are **not embedded** — by the predicate,
not by an action-name filter. Rows that leave the 7-day window unembedded
are never picked up again by the daily sync; only the backfill script
(below) reaches them.

# Readers

* **ISABEL / L5** — `getIsabelEmbeddings` (`lib/embeddings.js`) reads every
  row with `trade_result IN ('WIN','LOSE')` and `reasoning` longer than 30
  characters, with no row limit and no de-duplication. It does **not** use
  the stored `embedding` column: it re-embeds the reasoning texts with
  Cohere (`input_type: classification`) and builds confidence-weighted
  WIN/LOSE centroids. The `magi-isabel-cache` job stores the result in
  `isabel_daily_cache`; PLM sessions load it from there (≤ 18 h old) and
  fall back to the direct query (`lib/isabel-cache-loader.js`).
* **Optuna L5 scripts** (`optuna_l5_embedding.py`, `optuna_l5_sweep.py`) also
  query the table; the Optuna re-optimization infrastructure was retired
  (magi-core#568), the scripts were kept.

# Schema

Live `bq show`, 2026-11-24. Partitioned by `created_at` (DAY), clustered by
`llm_provider`, `trade_result`. Created 2026-02-05.

| Column | Type | Description |
|---|---|---|
| id | STRING | `thought_id`, or the legacy `session_id-symbol` key — see [Id forms](#id-forms). |
| session_id | STRING | From the thoughts row. |
| symbol | STRING | From the thoughts row. |
| reasoning | STRING | Full reasoning text (the embedding input is its first 500 characters). |
| llm_provider | STRING | From the thoughts row. |
| confidence | FLOAT64 | From the thoughts row; the centroid weight in ISABEL. |
| action | STRING | **Not written by the current sync.** Set on 270 legacy rows only. |
| trade_result | STRING | Outcome label from `trades.result`; `NULL` until resolved. 2026-11-24: `NULL` 38,896 · `HOLD` 633 · `WIN` 393 · `LOSE` 274 · `AUTO_CLOSE` 122 · `CONTAMINATED` 49 · `CLOSE` 44 · `FLAT` 35 · `CANCELLED` 7 · `ORPHAN_CLOSE` 4. |
| return_pct | FLOAT64 | **Never written** (NULL on every row, 2026-11-24). |
| embedding | FLOAT64 REPEATED | 1024-dim Cohere `embed-v4.0` vector (`search_document`). |
| created_at | TIMESTAMP | Embedding write time (not the decision time). |

# Id forms

| Form | Rows (2026-11-24) | `created_at` | Notes |
|---|---|---|---|
| `thought_id` | 4,167 | 2026-09-28 → | One row per id; joins `thoughts.thought_id`. |
| legacy `session_id-symbol` | 36,290 | 2026-02-05 → 2026-09-25 | Written before the sync keyed on `thought_id`. **Not unique**: several reasonings of one session and symbol share an id. |

Consequences:

* `COUNT(DISTINCT id)` does not count embedded thoughts, and neither does
  `COUNT(*)` (40,457 rows, 31,523 distinct ids).
* A legacy row can be matched to a thoughts row only by
  `id = CONCAT(session_id, '-', IFNULL(symbol, 'NA'))` **and** equal
  `reasoning`; the match is 1:1 only when exactly one embedding row and
  one thoughts row share that key.
* 1,487 legacy `(id, reasoning)` keys occur more than once (3,563 rows, up
  to 60 copies). In the L5 read set this is 36 WIN and 13 LOSE rows by
  `(id, reasoning)` (44 / 16 by text alone), so duplicates weigh more on
  the WIN centroid — tracked in magi-core#733.
* Legacy rows also match 7,939 guard audit rows by key and reasoning, so
  the legacy sync appears to have embedded guard rows that the current
  target excludes. (Inference from the key match; the legacy producer's
  code was not re-read.)

# Coverage monitoring

Since magi-core#734 the evaluator's data-quality pass
(`trade-evaluator.mjs` `checkDataQuality`, daily — schedule in
[magi-core](/system/services/magi-core.md)) counts coverage with
`lib/embedding-coverage.js`. It replaced `EMBED_GAP`, which divided
`COUNT(*)` of this table by `COUNT(*)` of `thoughts` against an 80 %
floor and alerted daily at ~59 % while the sync was healthy: about half of
`thoughts` are guard audit rows outside the target, and legacy ids make
the numerator a row count rather than a count of covered thoughts.

The check reads one set — thoughts rows matching the embedding target, no
time window — and classifies each row:

| Class | Meaning |
|---|---|
| strict | Embedded under its `thought_id`, or under a legacy key that maps 1:1. |
| content-equivalent | A legacy embedding with the same key and reasoning exists, but the key is shared — covered, not attributable 1:1. |
| excluded | Unembedded, and its `thought_id` has conflicting reasoning or metadata (the sync excludes it every run). Left out of the denominator. |
| missing | No embedding. Split by age into *pending* (inside the window, within the lag budget), *lagging*, *backlog* and *known gap*. |

Alerts (sent with the other data-quality alerts in one `[MAGI DATA QUALITY
ALERT]` notification):

| Alert | Condition |
|---|---|
| `EMBED_LAG` | A target row inside the 7-day window is unembedded for more than **72 h**. The sync runs weekdays only, so a row written after Friday's run is about 60 h old at Monday's evaluator run; 72 h clears that. |
| `EMBED_BACKLOG` | A target row written on/after **2026-11-17T00:00:00Z** left the window unembedded. Older ones are the *known gap*, logged but not alerted; the cutoff is a date so a backfill never needs it changed. |
| `EMBED_COVERAGE` | (strict + content-equivalent) / (target − excluded) below **90 %**. |
| `EMBED_CHECK_FAILED` | The coverage query returned no row or an invalid count. |

Not detected: a `thought_id` that joins several independent orders is
excluded by the sync but needs the trades join to recognize, so the check
counts it as missing (two such ids on 2026-11-24, both in the known gap).

Measured 2026-11-24 with the new query (read-only, ~27 MB scan): target
33,721 · strict 31,374 · content-equivalent 478 · excluded 10 · missing
1,859 (pending 96, lagging 0, backlog 0, known gap 1,763) — 94.4 % covered,
no alert.

# Backfill

`scripts/backfill_thought_embeddings.mjs` embeds target rows older than the
sync window with the sync's own selection, validation and write path (time
predicate flipped). It defaults to a dry run (`SELECT` only); writing needs
`--execute` and `--confirm-count=<N>` equal to the embeddable count found at
run time, and it must not run concurrently with `magi-sync-embeddings`.

Dry run, 2026-11-24: 1,768 candidate ids, 1,761 embeddable, 7 excluded
(5 conflicting reasoning, 2 multiple independent orders); 81 rows would
carry a WIN/LOSE label and enter the L5 read set; 19 Cohere calls.
**Not executed** — it changes the ISABEL centroids, so it needs Jun's
approval and a reviewer other than the implementer.

# Decisions pending

For Jun; until decided, the items above are described from code only.

1. Guard audit rows are not embedded (no `thought_id`). Confirm as
   intended policy.
2. The 7-day sync window: confirm whether rows that leave it unembedded are
   meant to be recovered (backfill) or accepted as out of scope.
3. Duplicate legacy rows in the L5 read set (magi-core#733): read-side
   de-duplication, row deletion, or accept.
4. Whether to run the backfill.

# Citations

* magi-core `a46c545`: `sync_embeddings.mjs`, `lib/embedding-candidates.js`,
  `lib/embedding-coverage.js`, `trade-evaluator.mjs` (`checkDataQuality`),
  `scripts/backfill_thought_embeddings.mjs`, `lib/embeddings.js`,
  `lib/isabel-cache-loader.js`.
* magi-core#734 (coverage check + backfill script), magi-core#733
  (duplicates in the L5 read set).
* Live metadata: `bq show magi_core.thought_embeddings`, 2026-11-24. Counts:
  read-only `SELECT`s, 2026-11-24.
