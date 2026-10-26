---
type: Service
title: TIALA host (Mac mini) — launchd job inventory
description: The always-on TIALA Mac mini's launchd job inventory after the 2026-10-22 cleanup — active bridge/Ollama/OpenClaw/observability agents, OpenClaw cron jobs, the jobs disabled that day, the netdata log fix, and open security/maintenance items.
lilith_safe: false
status: draft
generated: { by: devin/cloud, at: 2026-10-26T10:30:00Z }
stale_after: 2027-01-22T09:30:00Z
tags: [service, infra, tiala, launchd, ollama, openclaw, netdata, tailscale]
repo: infra (TIALA Mac mini M4)
---

# Overview

This doc exists separately from [aka-memory](aka-memory.md) because that is a
human-verified stable doc about AKA's memory pipeline, while the TIALA host
inventory is cross-cutting: the moomoo broker bridge, Ollama, OpenClaw,
observability and the Devin worker all live on the same box.

**TIALA** — Mac mini M4 (16 GB), desktop user session (launchd `gui`
domain), timezone JST, reachable over the tailnet, 24/7. Hostnames,
tailnet IPs and absolute paths are intentionally not recorded here —
they live in the private record (dogmaai/magi-core#662). There is **no
user crontab**; all scheduled work runs through user LaunchAgents
plus OpenClaw's own cron. All facts below were
verified on the host on 2026-10-22.

**gcloud on TIALA**: a local Google Cloud SDK (561.0.0) plus Homebrew
`gcloud`/`bq` shims exist, but `gcloud` is **not on the launchd PATH**,
so launchd-run scripts that call `gcloud` fail (this is what killed
`local.vix-collector`). `gcloud auth list`: active account
`aka-agent@screen-share-459802.iam.gserviceaccount.com` (service-account
key stored on TIALA; project roles `bigquery.dataViewer`,
`bigquery.jobUser`, `cloudscheduler.viewer`, `logging.viewer`,
`run.viewer`, `secretmanager.secretAccessor`), also configured
`aka-mac-mini@…` (`bigquery.dataViewer`/`jobUser`,
`cloudscheduler.jobRunner`, `run.invoker`, `secretAccessor`) and
`jun@dogma.jp`. See [secrets-inventory](secrets-inventory.md) for the
ledger entries.

# Active launchd jobs

State after the 2026-10-22 cleanup (all user LaunchAgents under
`gui/501`, loaded and running unless noted). Plist file paths and
program paths are host-local and intentionally not recorded here.

| Label | Schedule | Role | OKF doc |
|---|---|---|---|
| `com.magi.bridge` | RunAtLoad + KeepAlive watchdog | Watchdog for the moomoo bridge + `magi-bridge` cloudflared tunnel (`bridge.khaos.company`); sources an injected `MOOMOO_BRIDGE_AUTH_TOKEN` env file | [magi-moomoo](magi-moomoo.md), [cloudflare](cloudflare.md) §3 |
| `com.magi.ollama.cloudflared` | RunAtLoad | Named Tunnel `magi-ollama` → `ollama.khaos.company` | [cloudflare](cloudflare.md) §3 |
| `com.magi.openclaw.cloudflared` | RunAtLoad | Named Tunnel `magi-openclaw` → `openclaw.khaos.company` | [cloudflare](cloudflare.md) §3 |
| `com.magi.ollama-auth-proxy` | RunAtLoad | Bearer-auth enforcement (`OLLAMA_AUTH_TOKEN` injected env file) in front of raw Ollama | [cloudflare](cloudflare.md), [secrets-inventory](secrets-inventory.md) |
| `local.ollama-proxy` | RunAtLoad | The local Host-rewrite proxy in front of Ollama — **no auth**; never in the tunnel path | [cloudflare](cloudflare.md) |
| `local.ollama-env` | at login | `launchctl setenv OLLAMA_CONTEXT_LENGTH 65536` — host tuning | — |
| `local.tailscale-funnel` | — | **Disabled 2026-10-23** (unauthenticated publication remediated — see [cloudflare](cloudflare.md); details in magi-core#659) | [cloudflare](cloudflare.md), [aka-memory](aka-memory.md) |
| `ai.openclaw.gateway` | RunAtLoad | OpenClaw Gateway v2026.6.1 (env wrapper under the OpenClaw service-env dir) | [aka-memory](aka-memory.md), [cloudflare](cloudflare.md) |
| `com.openclaw.gcs-memory-sync` | daily 21:00 JST | AKA memory backup → `gs://screen-share-459802-memory`; last run 2026-10-21 21:00:11 JST ok (86 objects) | [aka-memory](aka-memory.md) |
| `com.openclaw.memory-sync` | daily 22:30 JST | AKA memory backup → SSD + Drive. **Known problem**: launchd rsync to the external SSD fails `Operation not permitted` (macOS TCC); ends `status=1` — see [aka-memory](aka-memory.md) | [aka-memory](aka-memory.md) |
| `local.ttyd` | RunAtLoad | The web terminal; basic-auth credential embedded in the plist (not in [secrets-inventory](secrets-inventory.md)) | [aka-memory](aka-memory.md) |
| `ai.devin.worker` | RunAtLoad | Devin worker (`--outpost=my-outpost`); log on host | — |
| `homebrew.mxcl.netdata` | RunAtLoad | Host metrics — see Observability | — |
| `com.magi.alloy` | RunAtLoad + KeepAlive on crash | Grafana Alloy — `prometheus.exporter.unix` host metrics, remote-written to Hosted Metrics (stack `aka`); token + endpoint user live in a host-local env file, never in the repo. Templates in magi-moomoo `scripts/` (`alloy/config.alloy`, `start-alloy.sh`, `com.magi.alloy.plist`, `install-alloy-launchagent.sh`, `alloy/magi-alloy.newsyslog.conf`). Installed via `brew tap grafana/grafana` + `brew pin alloy`; running since 2026-10-26 — `job="tiala-host"` series confirmed live in `grafanacloud-aka-prom` | [secrets-inventory](secrets-inventory.md) |

Ollama's historical consumer on this box was TIARA, which is **legacy**;
current consumers are ADAM/BOREAS via the authenticated
`magi-ollama` Named Tunnel (see [aka-memory](aka-memory.md)).

# OpenClaw cron jobs

Not launchd — `openclaw cron list` (all status ok, matching
[aka-memory](aka-memory.md)):

| Cron | Schedule (JST) | Role |
|---|---|---|
| `save-daily-chat-log` | 21:45 | Writes `memory/chat_logs/YYYY-MM-DD_chat.md` |
| `daily-memory-update` | 22:00 | Appends durable facts to `memory/YYYY-MM-DD.md` |
| `546ad7e7` | 23:00 (`0 14 * * *` UTC) | Runs `sync-memory-backup.sh` — the SSD leg **succeeds** under this context (TCC-granted), unlike the 22:30 launchd run |

# Disabled 2026-10-22

Method (approved by Jun in-session 2026-10-22 — "推奨行動でいいから対応してほしい" —
executed by Devin CLI): `launchctl bootout gui/501/<label>`, then the
plist archived under the launchd disabled dir (host-local).
Restore: re-add the plist + `launchctl bootstrap` — details in
magi-core#659.

| Label | Reason | Date | Approved by |
|---|---|---|---|
| `com.magi.opend-tunnel` | `RunAtLoad` job ran `start-opend-tunnel.sh`: `opend-proxy.py` plus an ngrok tunnel, and **INSERTed the ngrok URL into `magi_core.service_endpoints` as `service='opend-proxy'` on every login**, conflicting with the spec (opend-proxy = `bridge.khaos.company` via `register-tunnel.py`). magi-moomoo resolves the latest `updated_at` row, so a stale ngrok row could hijack the Cloudflare fallback leg. Latest row is now `https://bridge.khaos.company` (2026-10-17 23:37:08+00); fallback healthy (real `private->cloudflare fallback` 2026-10-21 13:31 UTC resolved correctly); **no DB change made**. | 2026-10-22 | Jun (in-session) |
| `local.vix-collector` | Every 900 s ran `magi-intel/vix-collector.mjs` → Yahoo ^VIX → POST `magi-query-api…/api/market-indicators`. Failed every run (`gcloud: command not found` — launchd PATH lacks the SDK) and the target Cloud Run service `magi-query-api` **no longer exists**. VIX aggregation is specified as deterministic inside `magi-isabel-cache` ([plm-units/index](/system/plm-units/index.md), [oracle](/system/plm-units/oracle.md)). | 2026-10-22 | Jun (in-session) |
| `com.magi.hermes` | Daily 14:00 `magi-intel/collect-intelligence.mjs`: Brave news → Ollama `ariel:latest` → POST to the same dead `magi-query-api` (last exit 78). `ariel:latest` is gone from Ollama. Canonical HERMES is Cloud Run `magi-hermes-refresh` ([magi-core](magi-core.md), [hermes-observability](hermes-observability.md)). The archived plist contains plaintext tokens — see open items and the private record. | 2026-10-22 | Jun (in-session) |
| `com.magi.telegram-bot` | `magi-telegram-bot/bot.js` (KeepAlive) referenced the deleted `magi-stg` Cloud Run URL and Ollama `qwen3.5:9b` (no longer deployed); `bot.log` full of request errors. AKA Telegram surface is OpenClaw / [magi-moni](magi-moni.md). | 2026-10-22 | Jun (in-session) |
| `com.magi.openclaw-funnel` | A second Tailscale Funnel publication for the OpenClaw gateway could never start — the host's HTTPS funnel listener was already owned by `local.tailscale-funnel`. OpenClaw public ingress is the `magi-openclaw` Named Tunnel. | 2026-10-22 | Jun (in-session) |
| `com.magi.moomoo-bridge` | Earlier bridge implementation, superseded by `com.magi.bridge`. Disabled **before** this session. | 2026-10-18 | Jun (pre-session) |

# Observability — netdata fix (2026-10-22)

`homebrew.mxcl.netdata` had died repeatedly (`LastExitStatus 6`):
`collector.log` had grown to **~40 GB** (root volume 52% used, 11 GiB free)
because `apps.plugin` — which cannot read other users' task info on macOS
without root — logged ~25 lines/s of `Failed to get task info for PID N`
(1,981 of the last 2,000 lines were `comm=apps.plugin`).

Fix applied 2026-10-22: `apps.plugin` disabled in the netdata config dir
(`netdata.conf` backed up first, `[plugins] apps = no` appended);
`collector.log` truncated in place; `launchctl kickstart -k
gui/501/homebrew.mxcl.netdata`. After: root volume 20% used / 49 GiB free,
netdata serving again (HTTP 200), `collector.log` ~22 KB and quiet.
Rotation added via `newsyslog.d` (passwordless sudo): the four netdata
logs at 102,400 KB × 3 generations, bzip2 (`J` flag);
`newsyslog -nv -f` parses clean.

# Observability — Grafana Alloy (2026-10-26, draft)

`prometheus.exporter.unix` (the Alloy-embedded node exporter) collects
host metrics — per magi-core#667, NOT a netdata scrape (netdata emits no
node_* series and is slated for removal in the same issue). Live check
2026-10-26: `node_filesystem_*`, `node_cpu_seconds_total`, `node_memory_*`,
`node_load*`, `node_network_*` and `node_disk_*` all reach
`grafanacloud-aka-prom` as `job="tiala-host"` — darwin collector
coverage is partial but sufficient (filesystem for the disk alert,
cpu/memory/load/network present). A `com.magi.alloy` LaunchAgent
remote-writes to Grafana Cloud Hosted Metrics (stack `aka`) — the
"Alloy" leg whose token (`GRAFANA_ALLOY_REMOTE_WRITE_TOKEN`,
`metrics:write` only) is registered in
[secrets-inventory](secrets-inventory.md). Layout (Jun-approved
2026-10-26): templates in magi-moomoo `scripts/` (`alloy/config.alloy`,
`com.magi.alloy.plist`, `install-alloy-launchagent.sh`, `start-alloy.sh`,
`alloy/magi-alloy.newsyslog.conf`); installed with the official tap
(`brew tap grafana/grafana` -> `brew install grafana/grafana/alloy` ->
`brew pin alloy`); the token and Hosted Metrics instance ID live only in
a host-local credential env file (mode 600; path in the private record),
pulled into the brew wrapper via a shim env file. The remote-write
basic_auth username is the Hosted Metrics instance ID, not the stack ID.
Logs go to the host's user log dir (path in the private record) and are
rotated by newsyslog: after rotation newsyslog SIGTERMs the agent and
KeepAlive restarts it so the new process reopens the fresh file — plain
rename rotation would leave the running process writing to the moved
inode (same gap as #93).

Provenance: the running agent was installed from the magi-moomoo#97
branch layout before that PR merged (2026-10-26); re-verify parity with
merged `main` (or re-run the installer) — pending Jun's timing.

Alerts for the agent itself (it exits 0 — no restart loop — on missing
config): `tiala-alloy-metrics-stale` (no `job="tiala-host"` samples for
15m) and `tiala-disk-usage-high` (root filesystem >=85%) are provisioned
in the Grafana `magi` folder by magi-core `grafana/provision-tiala-alerts.mjs`;
Telegram ALERT delivery for the same two conditions comes from the
`magi-tiala-host-monitor` Cloud Run job (15-min schedule, state in
[tiala_host_checks](/system/echidna-tables/tiala-host-checks.md)) — Grafana routing itself only has the
GCP-Alerts-email receiver today (magi-core#669).

# Open items (NEEDS_JUN_DECISION)

* **Tailscale Funnel Ollama exposure — remediated 2026-10-23** by
  disabling the Tailscale Funnel publication (LaunchAgent archived); the
  authenticated Named Tunnel path is unaffected; operational details in
  dogmaai/magi-core#659. magi-core additionally hardens `OLLAMA_BASE_URL`
  fail-closed (see dogmaai/magi-core ollama-base-url fail-closed PR).
* **22:30 JST `com.openclaw.memory-sync` TCC failure**: SSD leg fails
  `Operation not permitted` under launchd while the same script succeeds
  under OpenClaw cron at 23:00. Fix needs a GUI Full Disk Access grant —
  Jun-only.
* **TIALA infra split**: host-monitoring assets (Alloy, tunnels,
  launchd templates) keep accumulating in magi-moomoo — a repo whose
  scope is the broker bridge. Extracting a dedicated TIALA-infra
  repository is deferred but recorded as a Jun decision.
* **ttyd credential in plist**: `local.ttyd` carries a basic-auth
  `user:password` literal inside the LaunchAgent on TIALA; not in Secret
  Manager — a credential-location gap recorded in
  [secrets-inventory](secrets-inventory.md).
* **`com.magi.hermes` plaintext tokens**: the archived plist contained
  plaintext `BRAVE_SEARCH_API_KEY` / `TELEGRAM_BOT_TOKEN` /
  `TELEGRAM_CHAT_ID` — **scrubbed 2026-10-23** (values replaced with
  dummy strings; the file stays in the disabled archive). The live
  tokens themselves were not rotated — Jun to decide whether rotation
  is still warranted. Private record: magi-core#659.

# Boundary

Host ops inventory — no trading path, no LILITH relevance;
`lilith_safe: false` and never flows into `_lilith_safe/`.
