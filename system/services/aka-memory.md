---
type: Service
title: AKA memory (TIALA → GCS)
description: AKA's long-term memory on TIALA and its daily backup to gs://screen-share-459802-memory.
lilith_safe: false
tags: [service, aka, tiala, memory, backup, gcs]
repo: dogmaai/magi-moni
---

# Overview

**AKA** (あか) is the operator-facing agent Jun talks to on Telegram. It runs on
[TIALA](#host) through the OpenClaw Gateway (port `18789`) and keeps a
**long-term memory** as Markdown on the host: a single `MEMORY.md` plus dated
notes under `memory/`. That memory is the agent's own accumulated context —
environment facts, standing instructions from Jun, and session notes — and it is
backed up to GCS once a day.

AKA on TIALA and **AKA-1** (the Cloud Run bot in
[magi-moni](magi-moni.md)) share the same persona toward Jun but are separate
runtimes: AKA-1 is stateless per request and reads
[ECHIDNA](/system/echidna-tables/), while AKA on TIALA is the one that holds
`MEMORY.md`.

# Daily backup

| Property | Value |
|---|---|
| Script | `~/.openclaw/scripts/sync-memory-to-gcs.sh` on TIALA |
| Scope | `MEMORY.md` + `memory/*.md` (full re-upload, not incremental) |
| Destination | `gs://screen-share-459802-memory/` |
| Cadence | daily; objects observed rewritten at **12:00 UTC (21:00 JST)** |
| Identity | `aka-agent@screen-share-459802.iam.gserviceaccount.com` |
| Versioning | Suspended — each run overwrites, so only the newest copy survives |

Bucket layout:

```
gs://screen-share-459802-memory/
├── MEMORY.md            # the long-term memory document
└── memory/*.md          # dated session notes (71 objects as of 2026-08-24)
```

The job is **host-local** (launchd/cron on TIALA), not a
[Cloud Scheduler](/system/services/magi-core.md) entry, so it does not appear in
`gcloud scheduler jobs list` and its failures surface only as a stale object
timestamp in the bucket. `MEMORY.md` itself states the schedule as
"21:00 UTC (06:00 JST)", which disagrees with the observed 12:00 UTC upload
time; the observed time is authoritative until the TIALA-side schedule is
re-read.

# Host

TIALA — Mac mini M4 (16 GB), 24/7, Tailscale `aka.aegean-boa.ts.net`
(`100.114.185.1`). Also runs Ollama (`11435`, [ORACLE](/system/plm-units/oracle.md)
inference), OpenD (`11111`, the MooMoo gateway behind
[magi-moomoo](magi-moomoo.md)), ttyd (`7681`) and Netdata (`19999`).

# Boundary

Memory content is operator context, not training data: this doc and the memory
it describes are `lilith_safe: false` and never flow into LILITH. The GCS bucket
is not an [ECHIDNA](/system/echidna-tables/) source — nothing reads it back into
BigQuery; it exists purely so AKA's memory survives a host loss.
