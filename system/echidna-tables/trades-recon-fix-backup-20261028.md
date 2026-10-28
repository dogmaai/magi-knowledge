---
type: BigQuery Table
title: trades_recon_fix_backup_20261028
description: One-off pre-fix snapshot of two unconfirmed trades rows back-filled on 2026-10-28.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=trades_recon_fix_backup_20261028&page=table
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-10-28T10:28:30Z }
stale_after: 2027-04-28T10:28:30Z
tags: [echidna, bigquery, trades, audit, backup, recon]
dataset: magi_core
table_type: BASE TABLE
---

`trades_recon_fix_backup_20261028` is the pre-fix snapshot for the
Jun-approved 2026-10-28 back-fill recorded in [the bundle log](/log.md).
The log identifies the back-fill job as
`job_UuJifn1ZqrhKzRFFbwRPc8k9gNyA`.

# Schema

The snapshot contains the `trades` columns as they were before the back-fill,
plus:

| Column | Type | Description |
|---|---|---|
| backed_up_at | TIMESTAMP | Time the row was copied into the snapshot. |

# Provenance and lifecycle

The snapshot preserves the two existing unconfirmed rows changed by the
back-fill: AMAT order 348816 and CVX order 348837. The related [trades
concept](trades.md) records the data fix and identifies this table as its
backup. CVX order 348838 was an orphan fill inserted by the fix and therefore
has no pre-fix row in this snapshot.

This is a one-off rollback source, not a live ledger. No application reader or
writer is documented. No automated retention or cleanup lifecycle is
documented.

# Rollback scope

The snapshot covers restoring the pre-fix values of AMAT 348816 and CVX
348837 only. It does not contain CVX 348838 and does not by itself reverse
that inserted row or any other ledger change. Any rollback must be limited to
the intended rows and handled as a separate, human-reviewed data operation.
