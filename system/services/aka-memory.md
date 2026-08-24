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
| Scheduler | launchd user agent `~/Library/LaunchAgents/com.openclaw.gcs-memory-sync.plist` (label `com.openclaw.gcs-memory-sync`) |
| Script | `~/.openclaw/scripts/sync-memory-to-gcs.sh` on TIALA |
| Source | `~/clawd/MEMORY.md` + `~/clawd/memory/*.md` |
| Destination | `gs://screen-share-459802-memory/` |
| Schedule | `StartCalendarInterval`: Hour=21, Minute=0; daily at **21:00 JST (12:00 UTC)**; `RunAtLoad`: false |
| Command | `/bin/bash -c 'source ~/.zprofile && ~/.openclaw/scripts/sync-memory-to-gcs.sh >> /tmp/gcs-memory-sync.log 2>&1'` |
| Log | `/tmp/gcs-memory-sync.log` (stdout/stderr) |
| Identity | `aka-agent@screen-share-459802.iam.gserviceaccount.com` |
| Versioning | Suspended — each run overwrites, so only the newest copy survives |

The script uses `set -e`, activates `gcloud auth activate-service-account` with
`~/.config/gcloud/service-account-key.json`, then copies the source files with
`gsutil cp` (and `gsutil -m cp` for `memory/*.md`), using
`Cache-Control: no-cache`. This is copy/overwrite only, not `rsync`, so locally
deleted files are never removed from the bucket.

Bucket layout:

```
gs://screen-share-459802-memory/
├── MEMORY.md            # the long-term memory document
└── memory/*.md          # dated session notes (71 objects as of 2026-08-24)
```

The job is **host-local** launchd, not a
[Cloud Scheduler](/system/services/magi-core.md) entry, so it does not appear in
`gcloud scheduler jobs list`. TIALA's timezone is JST (`JST+0900`), and there is
no user crontab (`crontab: no crontab for jun`). The plist confirms the daily
21:00 JST / 12:00 UTC schedule, matching the observed object rewrite time; any
failure surfaces as a stale object timestamp in the bucket or in the local log.
`MEMORY.md` itself incorrectly states the schedule as "21:00 UTC (06:00 JST)" —
it states the local 21:00 as UTC. The correct schedule is 21:00 JST / 12:00
UTC.

# Host

TIALA — Mac mini M4 (16 GB), 24/7, Tailscale `aka.aegean-boa.ts.net`
(`100.114.185.1`). Also runs Ollama (`11435`, [TIARA](/system/plm-units/tiara.md)
inference), OpenD (`11111`, the MooMoo gateway behind
[magi-moomoo](magi-moomoo.md)), ttyd (`7681`) and Netdata (`19999`).

# Boundary

Memory content is operator context, not training data: this doc and the memory
it describes are `lilith_safe: false` and never flow into LILITH. The GCS bucket
is not an [ECHIDNA](/system/echidna-tables/) source — nothing reads it back into
BigQuery; it exists purely so AKA's memory survives a host loss.
