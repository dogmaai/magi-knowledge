---
type: Service
title: AKA memory (TIALA → GCS / SSD / Drive)
description: AKA's long-term memory on TIALA, how it is written, and its daily backups to gs://screen-share-459802-memory, the external SSD and Google Drive.
lilith_safe: false
tags: [service, aka, tiala, memory, backup, gcs, ssd, drive]
repo: dogmaai/magi-moni
---

# Overview

**AKA** (あか) is the operator-facing agent Jun talks to on Telegram. It runs on
[TIALA](#host) through the OpenClaw Gateway (port `18789`) and keeps a
**long-term memory** as Markdown on the host: a single `MEMORY.md` plus dated
notes under `memory/`. That memory is the agent's own accumulated context —
environment facts, standing instructions from Jun, and session notes — and it is
backed up once a day to GCS, to TIALA's external SSD and to Google Drive.

AKA on TIALA and **AKA-1** (the Cloud Run bot in
[magi-moni](magi-moni.md)) share the same persona toward Jun but are separate
runtimes: AKA-1 is stateless per request and reads
[ECHIDNA](/system/echidna-tables/), while AKA on TIALA is the one that holds
`MEMORY.md`.

# How memory gets written

| Path | Written by | Notes |
|---|---|---|
| `~/clawd/memory/YYYY-MM-DD.md` | cron `daily-memory-update` (22:00 JST, isolated session, announce → Telegram) | The agent reads that day's chat log and appends durable facts. This is the only scheduled writer. |
| `~/clawd/MEMORY.md` | interactive main sessions with Jun only | The daily cron is explicitly forbidden from touching it: on 2026-08-28 a cron turn rewrote it from 47,899 to 19,019 bytes (819 lines lost) because the bootstrap-injected copy it echoed back was truncated. |
| `~/clawd/memory/chat_logs/YYYY-MM-DD_chat.md` (+ same file on the SSD) | cron `save-daily-chat-log` (21:45 JST) → `~/scripts/save_chat_log_runner.py` → `~/scripts/format_and_save_chat_log.py` | The runner scans **all** session files for the requested JST day and skips sessions whose first user turn is machine traffic (`[cron`, `[system]`, non-interactive command runner). |

`agents.defaults.compaction.memoryFlush` and `agents.defaults.heartbeat` are
configured but do **not** fire in practice — no compaction event appears in any
session trajectory — so without the `daily-memory-update` job nothing writes
memory at all. That is why `MEMORY.md` was frozen at 2026-07-21 and `memory/*.md`
at 2026-07-29 while daily backups kept copying the stale files.

The runner must not resolve "the current session id" from `sessions.json`:
OpenClaw rotates sessions and the cron job itself creates a fresh one, which is
why the chat logs were 263–958 byte stubs containing only the cron's own turns.
Both scripts accept an optional `YYYY-MM-DD` argument for backfilling a past day.

`agents.defaults.bootstrapMaxChars` is `32768`; below that, `MEMORY.md` was
injected truncated (30,781 → 19,999 chars, 35% lost). `openclaw doctor` reports
that truncation, and the total bootstrap budget is 60,000 chars.

# Daily backup to GCS

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

# Daily backup to the external SSD and Google Drive

| Property | Value |
|---|---|
| Scheduler | launchd user agent `~/Library/LaunchAgents/com.openclaw.memory-sync.plist` (label `com.openclaw.memory-sync`), daily **22:30 JST**, `RunAtLoad`: false |
| Script | `~/.openclaw/scripts/sync-memory-backup.sh` on TIALA |
| Source | `~/clawd/MEMORY.md` + `~/clawd/memory/` |
| Destinations | `/Volumes/Extention_SSD/clawd-memory/` (`MEMORY.md`, `memory/`, dated `history/MEMORY-YYYYMMDD-HHMM.md`) and Google Drive folder `1_lf3yBX-8unw-W_JW11VR681CdyXQIxp` via the `gdrive:` rclone remote |
| Log | `~/.openclaw/logs/memory-sync.log` (launchd stdout/stderr: `memory-sync.launchd.log`) |
| Verification | SHA-256 of the SSD copy and of every Drive copy is compared against the source; the folder holds two identical `MEMORY.md` objects and the script accepts that |
| Guards | Skips overwriting the SSD/Drive copies when the source shrank >20% vs. the last SSD copy; exits non-zero when `/Volumes/Extention_SSD` is not mounted; warns when `MEMORY.md` has not changed for 7 days |

The Drive leg used to be an agent-driven cron job ("upload MEMORY.md to Drive"),
which broke on 2026-08-28: the primary model turn ended with
`non_deliverable_terminal_turn`, the `gemini-2.5-flash` fallback then answered
that it "cannot directly upload files to Google Drive" without trying `rclone`.
The upload is now this deterministic script; cron `546ad7e7` (23:00 JST) only
runs it and reports the log to Telegram, so a model failure costs the report,
not the backup.

Snapshots under `history/` are append-only (a new file only when the content
changed) and are never pruned by the script — they are the recovery path for a
bad `MEMORY.md` rewrite.

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
