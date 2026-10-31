# Bundle Update Log

## 2026-10-29 (L1.6.RECON blocked the 2026-10-28 night: orphan AMAT 349653 — root cause confirmed, ledger back-filled)
* **Incident**: AMAT sell 75 (349652, CASPER) and AMAT sell 31 (349653, the
  CASPER-session AUTO_CLOSE `TAKE_PROFIT_HIGH`) both filled at the broker,
  but 349653 has **no trades row**. From 17:00Z RECON read AMAT ledger 31
  vs broker 0 (`PHANTOM_LEDGER`) and blocked 6 risk-increasing orders
  until close (BAC ×2, SNDK, CVX ×2, WMT). (XOM buy 120 349450 was
  journaled unconfirmed; broker order history now shows it still
  `SUBMITTED` with no fill — it never became a position.)
* **Root cause (confirmed in Cloud Logging by Devin, 2026-10-29)**:
  `validateTradeRow`
  (`magi-core/lib/bigquery.js`) keyed duplicates on
  `symbol:side:price:llm_provider` over 5 min. Unconfirmed fills carry
  `price = NULL`, so a second unconfirmed close of the same symbol by the
  same provider (349652 → 349653, ~1 min apart) collided and was
  DQ-blocked; DQ blocks are intentionally not retried, so the row was
  lost. `position_guard_evals` shows the close reached `ORDER_PENDING_FILL`.
  * AMAT 349653: `magi-core-deepseek` logged
    `[DQ BLOCKED] trades insert blocked: DUPLICATE within 5min` at
    2026-10-28 16:57:59.588930Z, followed by `[AUTO_CLOSE BQ MISMATCH]
    Close order 349653 (AMAT sell x31) … enqueued for retry` (16:58:00Z;
    the retry claim was wrong — fixed in magi-core#682). Deployed image:
    `main:89280e74ff22717b64fbd1be67de9ae334458542` (ReplaceJob
    13:59:53Z).
  * CVX 348838 (2026-10-27 orphan): `magi-core-boreas` logged the same
    `[DQ BLOCKED] trades insert blocked: DUPLICATE within 5min` at
    2026-10-27 20:52:49.082445Z (`session_id 9992f137-07fa-43a7-9d62-000340a54aa3`,
    `llm_provider ollama`), then `[TRADE BQ MISMATCH] Broker order 348838
    (CVX sell x10) filled but … enqueued for retry`. Deployed image:
    `main:4e410d184e8c9ae2ca97063e85db2fa5f61b96b3` (ReplaceJob
    09:55:50Z). Same mechanism — closes the open root cause on 348838.
* **Fix (magi-core#682)**: rows with an `order_id` dedupe on the broker
  order id; rows without one keep the legacy key. Mismatch logs no longer
  claim "enqueued for retry" for DQ-blocked rows (they never are).
* **Data fix (Jun-approved 2026-10-29 08:09 JST; executed by Devin
  2026-10-28 23:43Z / 08:43 JST, job
  `bqjob_r1bf28b2fdddfa851_000001a184e6ec43_1`, 1 row inserted)**: backup `magi_core.trades_recon_fix_backup_20261029`
  taken. The missing row was recreated as positionMgmt would have written
  it — unconfirmed (`qty 0`, `requested_qty 31`, `price NULL`,
  `price_confirmed FALSE`, `result AUTO_CLOSE`, `entry_price` = broker avg
  cost 341.625, `signal_price` 414.7 from `position_guard_evals`,
  `thought_id 0c6f78c2-05bf-43f1-82e8-751d80973694`) — so RECON resolves
  it from broker order history and the evaluator back-fills the price; no
  fill price is guessed (broker history: FILLED_ALL @ 415.34).
* **Verification (Devin, 2026-10-31)**: RECON stayed consistent through
  the next two trading nights — all magi-core-* units ran 2026-10-29
  14:38–20:58Z and 2026-10-30 13:31Z onward (audit-log `Jobs.RunJob`), and
  `thoughts` gained **no** `concerns='L1.6.RECON'` row in
  2026-10-29 12:30Z → 2026-10-30 21:00Z (577 thoughts total, 15 new
  `trades` rows). Normal trading resumed; the AMAT 349653 back-fill let
  the ledger reconcile. The leftover XOM 349450 buy self-resolved to
  `CANCELLED_ALL` unfilled — no broker position, ledger 0 = broker 0.

## 2026-10-28 (Mistral #190 review: clarify verified scope)
* Checked the Mistral review on #190 head `f6901a135909272a9a9f8cbabac8660e164d56e8`
  and the later-posted review of `ce540a1` against the actual sources.
* Clarified caller-environment conditions, seven unit config declarations,
  test commands/CI evidence, and the separation of document lifecycle from
  unverified live-deployment status.
* Documented existing bridge margin-value normalisation, REAL account-row
  matching, price precedence, rejection logs and upstream HTTP 403 handling.
* Limited the zero-cash/zero-position filter claim to the checked portfolio
  dashboard, including its genuine-zero/null ambiguity. Identified the
  initial-capital constant and the effect of editing it.
* Asset-allocation discrepancy remains unverified. Added a concrete
  same-account/currency/time reconciliation procedure; no cause or
  correction factor is asserted. Existing ledger/RECON semantics and the
  historical NKE classification are not changed by this documentation.
* No policy, guard implementation, table/schema, historical row, infrastructure
  or LILITH-boundary changes. Draft concepts and existing verification
  history are retained. This PR's guard/constitution documentation is in
  the independent-review scope defined by COLLABORATION.md; automated
  Mistral output alone is not approval.

## 2026-10-28 (clarification: SIMULATE margin/shorts; REAL cash-only)
* **Decision (Jun, clarified in ChatGPT)**: SIMULATE retains margin buying
  and short selling. Only REAL is cash-only for now. This supersedes the
  rejected “SIMULATE mirrors REAL” wording at PR revision `fc67c0a`; the
  final diff against main therefore contains only the corrected policy.
* **magi-moomoo#99**: skip the cash-only guard entirely in SIMULATE;
  retain REAL CASH-account / sellable-long / cash-coverage checks and
  the independent REAL order-enable gate. `/health.cash_only` reports
  the effective environment-specific policy.
* **magi-core#679**: permit margin only with explicit `TRD_ENV=SIMULATE`
  and `ACCOUNT_TYPE=margin`; configure those values for unit jobs.
  REAL or unknown/missing routing stays cash-only. The REAL bridge
  enforces its own policy even if caller configuration is wrong.
* **Scope**: account-type prompt/L0.5 and bridge order guard; no RECON,
  fixed-universe, table/schema, historical ledger or LILITH changes.
  Existing draft #189's cash default is superseded only for the explicit
  simulator pair. The amended cash-account constitution concept is downgraded to draft
  pending re-verification; existing verification history is retained.
  No new human verification
  entry or deployment is claimed. Independent review is required.

## 2026-10-28 (Grafana portfolio chart aligned with the MooMoo demo app)
* **Request (Jun)**: Grafana (BigQuery) figures should match the MooMoo
  simulator app. App reference 2026-10-28: 損益合計 +68,797.80, 損益率
  +6.88% → initial capital $1,000,000.
* **Drift found**: magi-core#668's `grafana/portfolio-chart.json` was merged
  but never provisioned; the live dashboard still showed the last
  session's equity delta as "Total P&L %" / "Daily P&L", and endSession
  fallback rows (cash=0, positions=0) polluted the stat panels.
* **Fix**: magi-core PR `claude/portfolio-align-moomoo-app` + live dashboard
  synced (Grafana version 8). Amendment:
  [portfolio-snapshots](system/echidna-tables/portfolio-snapshots.md).
* **Open**: the app's 預り金 / 株式 split (96.65% / 3.35%) does not match
  the bridge's `cash` / `market_val` (≈92.6% / 7.4%) for the same holdings;
  needs the app's 資産 tab to reconcile.

## 2026-10-28 (L1.6.RECON blocked the 2026-10-27 night after an unconfirmed fill; ledger back-fill)
* **Incident**: from 18:45Z on 2026-10-27, RECON read AMAT ledger 81 vs
  broker 106 and blocked every risk-increasing order (QWEN XOM ×2, AMAT ×1).
  Cause: AMAT buy 348816 filled at the broker but was journaled `qty=0`
  (`price_confirmed=FALSE`); the evaluator back-fills only rows older than
  24h, so the next session (2026-10-28) would also have started divergent.
  Also found: CVX sell 348837 journaled `qty=0`, and an **orphan fill** —
  CVX sell 348838 (BOREAS, intent `i_61f19b037d90`) filled with no trades
  row (root cause open; needs the Cloud Run logs for session
  `9992f137-…`). Earlier that night RECON was clean (first session after
  the 2026-10-27 fix: no RECON rows; 6 buys + 3 sells filled).
* **Data fix (Jun-approved, 2026-10-28 01:51Z,
  job_UuJifn1ZqrhKzRFFbwRPc8k9gNyA)**: from `order_intents` RECONCILED
  evidence (broker FILLED_ALL) — 348816 qty 25 @395.10, 348837 qty 25
  @228.345 (both `price_confirmed=TRUE`); orphan 348838 inserted (sell 10
  @228.345, `result` NULL for the evaluator). Ledger net since the epoch
  after the fix: AMAT 106, CVX 15, WMT 215. Backup:
  `magi_core.trades_recon_fix_backup_20261028`.
* **Amendment**: [l1-6-recon](system/guards/l1-6-recon.md) — RECON resolves
  unconfirmed fills read-only from broker order history (magi-core PR).

## 2026-10-27 (SES and GRRR removed from the trading universe)
* **Decision (Jun 2026-10-27)**: SES and GRRR are no longer monitored or
  traded. **Reason**: both cannot be sold short on margin (信用の空売り不可).
  They are acceptable for the cash account, but are removed so the universe
  stays usable for a future margin account; if margin trading starts, a
  margin-only "not shortable" list blocking new short SELLs would let them
  return to the universe for cash buys (design not started). magi-core#676 removes them from `TRADING_UNIVERSE` (62 → 60) and
  every derived list (`VIX_SYMBOLS`, `FINDINGS_SYMBOLS`; HERMES collection
  and ISABEL symbol lists alias the universe).
* **Universe filters added** (implementation, magi-core#676): ISABEL's daily
  [focus-symbols](system/echidna-tables/focus-symbols.md) selection and the
  PLM prompt's ISABEL "High win rate / Caution" lines now only include
  `TRADING_UNIVERSE` symbols — otherwise SES (in `focus_symbols` daily until
  2026-10-26) kept resurfacing from its historical win rate. "Avoid"
  warnings remain for all symbols. The focus-symbols doc (stable) does not
  yet state the universe filter — to be added with a `human:jun`
  re-verification.
* **Not enforced**: `place_order` does not validate the universe; a hard
  block (e.g. L3 exclusion) would be a guard change and is Jun's decision.
* [trading-universe](system/constitution/trading-universe.md) documents the
  universe as dynamic (no symbol list) — unchanged.

## 2026-10-27 (Node.js Oct 2026 security release; OpenClaw → Gemini 3.8 Flash; Sakana fully retired)
* **Node.js runtimes** (2026-10-21 security release: 10 CVEs, 4 High incl.
  CVE-2026-111497 Brotli decoder RCE; patched only in 22.23.4 / 24.22.1 /
  26.12.1 — Node 18/20 are EOL and never patched). Moved every Cloud Run
  image to `node:24.22.1-bookworm-slim`: magi-core#674 (was `node:20-slim`;
  main/briefing/sentiment/thought-scorer), magi-moomoo#98 (was
  `node:20-slim`), magi-moni#55 (was `node:18-slim`) — all deployed
  2026-10-27 ~07:05–07:29Z. TIALA: Homebrew `node@22` 22.22.0 → 22.23.4
  (OpenClaw Gateway restarted on it), unversioned `node` 25.9.0 → 26.12.1.
  central-dogma is archived (not deployed) — n/a.
* **Amendment**: [tiala-host](system/services/tiala-host.md)
  `ai.openclaw.gateway` row — Node runtime and model routing recorded.
  OpenClaw now uses `google/gemini-3.8-flash` (primary) +
  `google/gemini-3.5-flash-lite` (fallback), replacing `sakana/fugu` and
  `google/gemini-2.5-flash` (Gemini API deprecations page recommends 3.8
  Flash / 3.5 Flash-Lite; 2.5 shutdown dates are inconsistent and early
  404s were reported). The `sakana` provider definition is removed from
  the OpenClaw config — Sakana is fully retired (Jun 2026-10-27).
* **Drift found (not edited — stable doc, needs Jun)**:
  [melchior-1](system/plm-units/melchior-1.md) says the config fallback is
  `gemini-2.5-flash`; magi-core `lib/config.js` (`c242498`) falls back to
  `gemini-3.8-flash` and no `gemini-2.5` reference remains in magi-core
  code. Fix together with a `human:jun` re-verification.
* magi-core#675 removes the executed one-shot
  `scripts/delete-retired-jobs-and-schedulers.sh` (all five targets
  deleted 2026-09-23).

## 2026-10-27 (L1.6.RECON fail-closed halt — ledger fix, epoch-based recon, cash-only account policy)
* **Incident**: no `trades` rows on 2026-10-21, 22, 23 and 26 (four US
  sessions). L1.6.RECON blocked every risk-increasing order because WMT
  (ledger 66), NKE (840) and AMAT (35) read as `PHANTOM_LEDGER` against
  broker 0. Root cause: the reconciler summed only `exit_timestamp IS NULL`
  rows, while close legs are stamped terminal per row since
  magi-core#625/#630 and `RECON_BASELINE` seed rows (no `order_id`/price)
  can never be settled by the evaluator. Separate finding: the NKE position
  was a real 840-share short (2026-10-07, QWEN) opened while the L0.5 code
  default was `margin` (before magi-core#631).
* **Data fix (Jun-approved, executed 2026-10-27 02:54Z,
  job_7lKcvabi8GD4QKfaSbq1vwHt0wsn)**: AMAT/WMT `RECON_BASELINE` →
  `BASELINE_SETTLED`; WMT AUTO_CLOSE 334659 `exit_timestamp` stamped; NKE
  cover 332758 → `CLOSE` (short P&L +$0.84). Backup:
  `magi_core.trades_recon_fix_backup_20261027`. Open ledger net is zero
  on all symbols after the fix.
* **New doc (draft)**: [l1-6-recon](system/guards/l1-6-recon.md) — the
  guard had no concept doc; records the epoch-based ledger semantics
  (`RECON_LEDGER_EPOCH`, default 2026-10-27T03:00Z), the reset procedure
  and the incident. Linked from the guard index.
* **New doc (draft)**: [cash-account-constraint](system/constitution/cash-account-constraint.md)
  — the `[CASH ACCOUNT CONSTRAINT]` prompt block has rendered on every
  unit since magi-core#631 but had no section doc (pre-existing drift,
  surfaced by `okf-constitution-drift` once the default flips to cash).
  Needs `human:jun` verification → `stable` before the magi-core change
  can pass that test.
* **Amendment**: [l0-5](system/guards/l0-5.md) — account policy (Jun
  2026-10-27): cash account only; short path kept for a future margin
  account behind an explicit `ACCOUNT_TYPE=margin`; fail-safe default
  `cash` (magi-core PR pending).
* **Amendment**: [trades](system/echidna-tables/trades.md) — `result`
  vocabulary gains `BASELINE_SETTLED`; `trade_mode` documents
  `RECON_BASELINE`; Close-events rule 5a records short round-trips (cover
  buy = `CLOSE`, margin only); related tables list the backup table.

## 2026-10-27 (magi-tiala-host-monitor deployed + first run verified)
* **Amendment**: [magi-core](system/services/magi-core.md) operational
  jobs table — the `magi-tiala-host-monitor` row now records the job +
  scheduler as deployed (magi-core#669 + #670, magi-core `979283f`),
  replacing the "proposed — pending Jun approval" wording. Job exists
  in asia-northeast1; scheduler enabled at `*/15 * * * *`; the 14:15Z
  first run wrote `overall=ok` / `stale_leg=ok` / `disk_leg=ok` to
  `magi_core.tiala_host_checks`. The cited `deploy.yml` revision was
  bumped to magi-core main `c36aa91` (post-#670).
* **Amendment**: [tiala-host-checks](system/echidna-tables/tiala-host-checks.md)
  Status updated to "deployed 2026-10-26 14:00Z, first run verified
  14:15Z" (magi-knowledge#181). The prior entry's "table not yet
  created" note is superseded — the table exists and is receiving
  15-minute rows. `verified` on magi-core.md gained a `devin/cloud`
  stamp; `human:jun` verification of the new wording is pending.
* **Corrections (magi-core#670)**: post-merge fixes to the alert
  transitions — unmeasured (unknown-leg) runs are transition-neutral
  (no false recovery), `alerted` is recorded only when Telegram
  accepts the send, unknown-streak re-alerting is bounded per streak,
  and the Grafana disk rule threshold is `gte` to match the job's
  `>=85` classification (live rule needs re-provisioning — a Jun
  operation).

## 2026-10-26 (echidna catalog — portfolio_snapshots doc, freshness proposal, positions design)
* **New doc (draft)**: [portfolio-snapshots](system/echidna-tables/portfolio-snapshots.md)
  — live schema catalogued (6 columns, no partitioning); documents the
  `daily_pnl`/`total_pnl_percent` naming drift (per-session deltas, not
  daily/total aggregates). Column rename/writer change deferred — a Jun
  decision, not silently resolved. Removed from the index's
  uncatalogued-table backlog.
* **New doc (draft proposal)**: [data-freshness-expectations](system/echidna-tables/data-freshness-expectations.md)
  — staleness thresholds derived from observed write cadence (probe
  >20/>60 min amber/red; session-driven >25/>72 h; market snapshots
  >12/>72 h). Referenced as the single source for the Grafana threshold
  values in magi-core#668.
* **New doc (draft proposal)**: [broker-position-snapshots](system/echidna-tables/broker-position-snapshots.md)
  — design for a new append-only per-symbol positions table written by
  the existing 15-min bridge-monitor probe (new table, not columns on
  `bridge_health_checks`). Table creation and implementation are Jun
  operations — not performed.
* Trigger: moomoo↔Grafana sync audit (magi-core#668) — values matched
  the broker; connectivity/freshness display and P&L semantics did not.


## 2026-10-26 (Grafana tokens for TIALA Alloy + bridge Pyroscope registered)
* **Amendment**: [secrets-inventory](system/services/secrets-inventory.md) —
  registered `GRAFANA_ALLOY_REMOTE_WRITE_TOKEN` (Access Policy
  `tiala-alloy-remote-write`, `metrics:write` only) and
  `PYROSCOPE_BASIC_AUTH_PASSWORD` (Access Policy `tiala-bridge-pyroscope-2`,
  `profiles:write` only) in `screen-share-459802` Secret Manager; both
  granted per-secret `secretAccessor` to TIALA's `aka-agent@` SA.
  Recorded `GRAFANA_OTLP_TOKEN`'s `profiles:write` scope as a drift from
  its documented metrics+traces scope (probe: `POST
  profiles-prod-019.grafana.net/ingest` reaches body validation), with an
  open item to strip it after the bridge's OTLP fallback is retired —
  see the inventory's open item. Recorded the Prom remote-write gotcha:
  `basic_auth.username` must be the Hosted Metrics instance ID, not
  `1557976`.
* **Incident note (secrets-inventory rows)**: 2026-10-26 token rotation —
  the tokens under the two TIALA access policies (Alloy remote-write and
  bridge Pyroscope) were deleted portal-side; other stack credentials
  (OTLP, SA token) were unaffected. Only `tiala-alloy-remote-write` was
  recreated (same name, `metrics:write`) — the Pyroscope token was
  re-issued under the existing `tiala-bridge-pyroscope-2`. The first
  Alloy re-issue was minted under the wrong policy (`401 invalid scope
  requested`); the corrected token was remote_write-verified before the
  host-local env swap (~13:02 UTC, fresh samples ~13:05 UTC). The bridge
  env + restart landed ~13:10 UTC. All superseded GSM versions disabled;
  current versions' values never transited chat (the rotation trigger
  was that the first Alloy token's value had).
* **Amendment**: [tiala-host](system/services/tiala-host.md) — `com.magi.alloy`
  recorded as running: `prometheus.exporter.unix` (per magi-core#667, not a
  netdata scrape; node_* series live-verified in `grafanacloud-aka-prom`),
  installed via the official `grafana/grafana` brew tap + `brew pin`, logs
  to `~/Library/Logs` with newsyslog rotation. Companion alerts:
  `tiala-alloy-metrics-stale` (15m absent) and `tiala-disk-usage-high`
  (>=85%) provisioned in Grafana; Telegram ALERT delivery via the
  `magi-tiala-host-monitor` job (magi-core#669).
* **New**: [tiala-host-checks](system/echidna-tables/tiala-host-checks.md) —
  concept doc for `magi_core.tiala_host_checks` (DDL in magi-core#669;
  table applied later the same day — see the 2026-10-27 entry). [magi-core](system/services/magi-core.md) job
  table gained the `magi-tiala-host-monitor` row;
  [data-freshness-expectations](system/echidna-tables/data-freshness-expectations.md)
  gained a TIALA host-metrics row (same 20/60-min thresholds as
  `bridge_health_checks`).

## 2026-10-25 (GRAFANA_OTLP_TOKEN — Pyroscope fallback recorded)
* **Amendment**: [secrets-inventory](system/services/secrets-inventory.md)
  `GRAFANA_OTLP_TOKEN` row — recorded that the bridge reuses this token
  as the Pyroscope basic-auth password fallback
  (`PYROSCOPE_BASIC_AUTH_PASSWORD` unset → `GRAFANA_OTLP_TOKEN`; the three
  dead `PYROSCOPE_*` GSM reads were removed in magi-moomoo#94). Noted
  the `profiles:write` scope requirement for Profiles ingest as an open
  verification item and the rotation coupling between the two consumers.

## 2026-10-25 (Ollama units outage — resolved, docs stay draft)
* **Amendment**: [boreas](system/plm-units/boreas.md) and
  [adam](system/plm-units/adam.md) outage notes updated from
  "remediation pending" to resolved: the ingress-path fix deployed on
  2026-10-23 was verified against same-day production traffic — seven of
  eight real Ollama calls completed end-to-end and normal
  `WARN_ONLY`/`HOLD` decisions resumed; the single failure traced to a
  short-lived tunnel transport flap, unrelated to the defect. ADAM's
  scheduled runs that day exited 0 but skipped LLM calls via the normal
  probabilistic throttle, so ADAM-side call evidence is pending its next
  unthrottled run. Both docs remain `draft` until Jun re-verifies.
  Private evidence: dogmaai/magi-core#665.

## 2026-10-23 (llm_metrics status vocabulary + launchd PATH correction)
* **Correction**: [llm-metrics](system/echidna-tables/llm-metrics.md)
  demoted `stable` → `draft` — the `status` column was documented as
  `ok` / error class but `magi-core/src/llm.js` currently writes only
  `success` / `failed` (the nine historical `truncated` rows came from
  the since-deleted Sakana/FUGU analyzer, 2026-08-03→09-15; plus
  historical NULLs); a spec–implementation drift found while building
  the llm_metrics-based health-monitor alerting (magi-core#666).
  Pending Jun re-verification.
* **Correction**: [secrets-inventory](system/services/secrets-inventory.md)
  — the `com.magi.bridge` plist *does* set `PATH` including
  `/opt/homebrew/bin`, so the bridge's `gcloud` Secret Manager fetches
  work under launchd (traces confirmed arriving 2026-10-23); the
  "gcloud absent from launchd PATH" note applies to the default PATH
  only.

## 2026-10-23 (TIALA `aka-agent@` least-privilege Secret Manager access)
* **Amendment**: [secrets-inventory](system/services/secrets-inventory.md)
  TIALA SA row — project-wide `secretAccessor` on `aka-agent@` was removed
  and replaced by per-secret bindings on exactly the three GSM secrets the
  live bridge start path reads (`MOOMOO_BRIDGE_AUTH_TOKEN`,
  `GRAFANA_OTLP_TOKEN`, `SIGIL_AUTH_TOKEN`), verified on-host by reading
  each as the SA (three OK, unrelated secret PERMISSION_DENIED). Also
  recorded the drift that the start script names three `PYROSCOPE_*`
  secrets absent from GSM. Jun-approved scope; no other SA or secret
  touched.

## 2026-10-23 (public-repo sanitization — magi-core#662 audit rewrite)
* **Amendment**: applied the #662 audit list to existing docs —
  host identifiers (tailnet hostnames/IPs, hostnames, LAN/WG IPs),
  listen ports, and credential/config file paths were generalized to
  role descriptions pointing at the private record (dogmaai/magi-core#662).
  Touched: [aka-memory](system/services/aka-memory.md),
  [cloudflare](system/services/cloudflare.md),
  [magi-moomoo](system/services/magi-moomoo.md),
  [secrets-inventory](system/services/secrets-inventory.md),
  [tiala-host](system/services/tiala-host.md),
  [magi-deep-research](system/services/magi-deep-research.md) and three
  `.agents/skills/` files. `*.khaos.company` public DNS hostnames are
  kept per the audit's exemption recommendation (Jun to confirm);
  historical `log.md` entries left as-is. `magi-moomoo.md` and
  `magi-deep-research.md` demoted `stable` → `draft` pending Jun's
  re-verification.
* **Ops state changes recorded**: `aka-mac-mini@` SA's project-wide
  `secretAccessor` removed (no consumer found); GSM versions disabled
  for `MAGI_QUERY_API_KEY` / `NGROK_AUTHTOKEN` / `BRAVE_API_KEY`;
  `GH:magi-core` Actions secret `MAGI_KNOWLEDGE_TOKEN` deleted (all
  workflow references already had `github.token` fallbacks). Details in
  [secrets-inventory](system/services/secrets-inventory.md).

## 2026-10-23 (Ollama units outage — root cause identified, remediation pending)
* **Amendment**: [boreas](system/plm-units/boreas.md) and
  [adam](system/plm-units/adam.md) — recorded that
  BOREAS and ADAM (shared Ollama provider path) produced no LLM decisions
  since 2026-10-05: every call failed client-side because a
  response-termination defect in the authenticated ingress path left
  streamed responses unterminated (server-side inference completed
  normally; failed calls journaled `CALL_FAILED`). Root cause identified
  2026-10-23, fixes proposed in magi-moomoo + magi-core PRs, deploy
  pending; private detail in dogmaai/magi-core#665. Both docs demoted
  `stable` → `draft` pending Jun's re-verification.

## 2026-10-23 (public-repo hygiene — visibility wording + public-writing rule draft)
* **Host security (private record)**: funnel remediation was carried out
  on the host. Per the new public-writing rule, the details live in the
  private `magi-core` record, not in this public repository.
* **Visibility**: `dogmaai/magi-knowledge` confirmed **public** and
  intended (`gh api repos/dogmaai/magi-knowledge` → `visibility: public`;
  Jun, 2026-10-23).
  [secrets-inventory](system/services/secrets-inventory.md) wording
  fixed: the `GITHUB_TOKEN` row no longer claims the repo is private, and
  the `MAGI_KNOWLEDGE_TOKEN` row now records all five magi-core consumer
  workflows (`test.yml`, `okf-drift.yml`, `okf-pin-bump.yml`,
  `auto-review.yml`, `claude-review.yml`).
* **Policy (draft)**: [COLLABORATION.md](COLLABORATION.md) gains a
  **draft / pending Jun verification** section "Writing rules for the
  public repository" — never record unremediated-vulnerability details,
  credential locations, internal ports or host identifiers here; record
  vulnerabilities only after remediation; reviewers check PRs for leaks;
  the rule covers PR bodies, issues, comments, commit messages and
  review replies, not just committed files.
* **Lifecycle**: `MAGI_KNOWLEDGE_TOKEN` marked *scheduled for removal* —
  the repo is public, so the PAT is unnecessary. The companion magi-core
  PR removes the `secrets.MAGI_KNOWLEDGE_TOKEN || github.token`
  references (submodule clone falls back to `github.token`); tracked
  under magi-core#659. Retirement: Jun deletes the `GH:magi-core`
  Actions secret, then disables and destroys the `SM` secret after a
  soak.
* **Audit (private)**: a documentation audit for passages in existing
  docs that violate the new rule (credential paths, listen ports,
  hostnames) is recorded in a private `magi-core` issue; the findings
  are intentionally not reproduced in this repository.
* **Host (TIALA, Jun 2026-10-23 — verified on host)**: `local.ttyd` is
  now bound to loopback only and published tailnet-only via an
  intentional `tailscale serve` entry (no LAN exposure); its basic-auth
  credential rotation + Secret Manager registration remain pending.
  Recorded in [tiala-host](system/services/tiala-host.md).

## 2026-10-22 (TIALA host cleanup — launchd inventory, netdata, Drive dedupe, gcloud correction)
* **Amendment**: new [tiala-host](system/services/tiala-host.md) —
  launchd inventory of the TIALA Mac mini after the 2026-10-22 cleanup:
  13 active user agents (bridge watchdog + 3 Named Tunnels + Ollama
  proxies + tailscale funnel + OpenClaw + memory syncs + ttyd + Devin
  worker + netdata), 3 OpenClaw cron jobs, and 6 disabled jobs
  (`com.magi.opend-tunnel`, `local.vix-collector`, `com.magi.hermes`,
  `com.magi.telegram-bot`, `com.magi.openclaw-funnel` on 2026-10-22;
  `com.magi.moomoo-bridge` earlier on 2026-10-18). The 5 disables were
  executed **on the host** by Devin CLI with Jun's in-session approval
  (`launchctl bootout` + plist archived under the launchd disabled dir);
  restore details in magi-core#659. No GCP/BigQuery write was made — the
  `opend-proxy` endpoint table's latest row already points at
  `https://bridge.khaos.company`, so the stale-ngrok-row risk was
  removed by stopping the writer, not by touching data.
* **Amendment**: [aka-memory](system/services/aka-memory.md) — the Drive
  backup folder held **two different** `MEMORY.md` objects, causing the
  sync script's `Drive MISMATCH` + `status=1` on every run; the older
  copy (pre-truncation 2026-07-21 content) was renamed in place to
  `MEMORY-20260721-pre-truncation.md` on 2026-10-22. Also recorded: the
  22:30 JST launchd SSD leg fails on macOS TCC (removable-volume access,
  GUI fix is Jun's) while the same script succeeds under OpenClaw cron
  at 23:00; `MEMORY.md` unchanged since 2026-09-10. Host section
  corrected (raw Ollama, the local Host-rewrite proxy, the auth proxy;
  TIARA → ADAM/BOREAS) and netdata rotation noted.
* **Amendment**: [cloudflare](system/services/cloudflare.md) — corrected
  the "TIALA has no gcloud" clause (the SDK is present with SA
  `aka-agent@` holding `secretAccessor`; the env-file injection is a
  deliberate start-up design, not an absence of access). Recorded a
  finding: a `local.tailscale-funnel` Tailscale Funnel publication
  exposed the unauthenticated local Ollama rewrite-proxy to the public
  internet (verified 2026-10-22), and magi-core `dee48bf0`
  `lib/secrets.js` still defaults `OLLAMA_BASE_URL` to the funnel host
  when the env var is unset.
* **Amendment**: [secrets-inventory](system/services/secrets-inventory.md)
  — same gcloud correction; new ledger rows for the TIALA `aka-agent@`
  SA key (service-account key stored on TIALA, roles listed) and
  the ttyd basic-auth credential embedded as a literal in the `local.ttyd`
  LaunchAgent (not in SM — gap). Tier 1 follow-up: `MAGI_QUERY_API_KEY`,
  `NGROK_AUTHTOKEN`, `BRAVE_API_KEY` have no remaining consumer after
  the cleanup (`magi-query-api` service and `market_indicators` already
  absent; `BRAVE_API_KEY` ≠ `BRAVE_SEARCH_API_KEY` which HERMES uses) —
  tracked in magi-core#659.
* **Infrastructure** (all executed on the TIALA host, not GCP): netdata
  `apps.plugin` disabled after its logging grew `collector.log` to ~40 GB
  (root volume 52% → 20% used); a `newsyslog.d` entry rotates
  the four netdata logs at 100 MB × 3 (bzip2). Revisions: magi-knowledge
  base `5271e2ca`, magi-core `dee48bf0`, magi-moomoo `536e1de`.
* **Lifecycle**: `aka-memory` and `cloudflare` demoted `stable` →
  `draft` pending Jun's re-verification (`verified` lists unchanged);
  `secrets-inventory` stays `draft`; `tiala-host` new `draft`.
* **Update 2026-10-23**: the Tailscale Funnel publication was disabled
  (LaunchAgent archived) — the unauthenticated-Ollama finding is
  **remediated**; the authenticated Named Tunnel path is unaffected and
  magi-core hardens `OLLAMA_BASE_URL` fail-closed (details:
  dogmaai/magi-core#659). This entry's content was also sanitized for
  the public repo — host-local file paths, listen ports, archive
  filenames and the funnel URL removed; operational detail stays in the
  private record.

## 2026-10-22 (FLAT result vocabulary — magi-core#654)
* **Amendment**: [trades](system/echidna-tables/trades.md) — add `FLAT`
  to the result vocabulary: a fully covered entry whose realized
  `pnl_percent` stays inside the ±2% WIN/LOSE band resolves `FLAT`
  (terminal), fixing the rule-5 violation where such rows stayed `HOLD`
  forever on a closed position (PLTR 45 @ −0.97%, 2026-10-22 run). The
  ±2% band itself is now spelled out in the `WIN`/`LOSE` row, and `FLAT`
  joins the realized/exit_timestamp column notes and the close-events
  rule-5 invariant. Doc demoted `stable` → `draft` pending Jun's
  re-verification (`verified` unchanged).
* **Aggregation decision (Jun, 2026-10-22 — magi-knowledge#167 review)**:
  `FLAT` is excluded from the win-rate denominator only — win rate stays
  `WIN / (WIN + LOSE)` — but is **included** in expectancy
  (`AVG(pnl_percent)`) and realized P&L (`SUM(pnl_amount)`), which
  aggregate over `result IN ('WIN','LOSE','FLAT')`. The FLAT vocabulary
  row was rewritten to match, and its `|pnl_percent| < 2%` was re-escaped
  as `ABS(pnl_percent) < 2%` — the raw `|` broke the Markdown table cell.
* **Amendment**: [l1-7](system/guards/l1-7.md) — the L1.7 FIFO owner
  predicate (close attributed to the earliest entry still open at close
  time) now names `WIN`/`LOSE`/`FLAT` as the terminal results whose
  `exit_timestamp` bounds ownership, matching `lib/daily-loss.js`.
  Doc demoted `stable` → `draft` pending Jun's re-verification
  (`verified` unchanged).

## 2026-10-21 (Claude PR review workflow for magi-core)
* **Collaboration**: [COLLABORATION.md](COLLABORATION.md#claude-pr-review-magi-core)
  records the new `magi-core` Claude PR review workflow
  (`.github/workflows/claude-review.yml`, `anthropics/claude-code-action`)
  and Jun's 2026-10-21 egress approval to the Anthropic API. Scope is wider
  than the Mistral review (the agent can read any file in the checkout plus
  the pinned `system/` + `scripts/` + root documents); the review stays
  reference-only and does not satisfy independent review. Also records
  Jun's decision to keep probe-test execution in the reviewer, and which
  restrictions are enforced by the job token, by the allowed-tools list, or
  by the prompt only.
* **Lifecycle**: [secrets-inventory](system/services/secrets-inventory.md)
  demoted `stable` → `draft` for the unverified `ANTHROPIC_API_KEY`
  (GitHub Actions secret in `magi-core`, source of truth `SM`
  `ANTHROPIC_API_KEY_PR_REVIEW`) note, plus the unrecorded legacy `SM`
  `ANTHROPIC_API_KEY`; restore `stable` on Jun's verification (check
  that `ANTHROPIC_API_KEY_PR_REVIEW` exists in `SM` and that
  `ANTHROPIC_API_KEY` is listed in `gh secret list -R dogmaai/magi-core`).

## 2026-10-21 (L3 position-lookup-failure semantics — magi-core#640 / PR #645)
* **Amendment**: [l3](system/guards/l3.md) — record the agreed
  lookup-failure behaviour (PR #645 review decision (a)): on a failed
  position lookup only a cash-account BUY is treated as
  exposure-increasing and fails closed; SELL and margin-account BUY fail
  open so exits are never blocked by a transient lookup error. Under
  `L3_WARN_ONLY=true`, the would-be cash BUY block is journaled as
  `WARN_ONLY` and the order proceeds — the same warn-only path as any
  other L3 verdict. Doc remains `status: draft` pending Jun's
  re-verification.

## 2026-10-20 (Claude review of magi-core — verified doc corrections)
* **Amendments** (external Claude review of magi-core `eba1b0e`, each
  finding verified against code before adoption — `status: draft`
  pending Jun's re-verification):
  - [l2](system/guards/l2.md) / [l3](system/guards/l3.md): record that
    `L2_WARN_ONLY=true` / `L3_WARN_ONLY=true` are **live on all six
    production units** (magi-core#565, merged 2026-10-03 by Jun) for the
    counterfactual window — the code default stays `block` and formal
    demotion remains pending. Previously the docs said only "default
    block, demotion pending", which read as though warn-only were not
    yet enabled.
  - [l0-5](system/guards/l0-5.md): correct the `isHeldPosition`
    citation — it lives in `src/llm.js` (session-scoped `heldSymbols`
    populated by `get_positions` calls), not `positionMgmt.js`; noted
    the caveat that a session that never calls `get_positions` cannot
    prove a SELL is an exit.
  - [magi-model-health-check](system/services/magi-model-health-check.md):
    `repo` corrected — no standalone repo exists; the implementation is
    magi-core's `magi-llm-health-monitor` job (`health-monitor.js`).
    Coverage gap recorded: only the five hosted providers are probed;
    Ollama units (ADAM/BOREAS), the HERMES Gemini model, and Cohere are
    unmonitored. `llm_health_checks` remains uncatalogued.
  - [echidna-tables/index](system/echidna-tables/index.md): drift
    backlog gains `trades_shadow` and `trades_simulation`
    (`thoughts_shadow`/`thoughts_simulation` were already listed).
* Findings routed to magi-core issues instead of doc changes: L3
  fail-open on position-lookup failure (guard fix, independent review
  required), model-ID double definition in `callLLM`, Gemini API key
  in URL query param, create-only Cloud Scheduler entries, undeployed
  `magi-simulator.js`.

## 2026-10-20 (Jun re-verification — second batch, 9 more docs to stable)
* **Lifecycle**: Jun verified the remaining re-verification queue
  in-session — [jev](system/guards/jev.md),
  [magi-deep-research](system/services/magi-deep-research.md),
  [lilith](system/plm-units/lilith.md),
  [lilith-training](system/services/lilith-training.md),
  [magi-isabel](system/services/magi-isabel.md),
  [secrets-inventory](system/services/secrets-inventory.md),
  [views](system/echidna-tables/views.md),
  [echidna-priors](_lilith_safe/distributions/echidna-priors.md) and
  [cross-unit](_lilith_safe/hallucination-patterns/cross-unit.md) all
  restored `draft` → `stable`, `verified` stamped human:jun
  2026-10-20T10:11Z, `stale_after` 2027-04-18. The changes under review
  were the 2026-10-07 repo/job deletion records, repo-pointer
  corrections, the JEV implemented-state update, the LILITH-safe
  cross-unit-name removal (boundary strengthening) and the detector
  roster expansion. This clears the okf_lint re-verification warning
  set to zero.

## 2026-10-20 (Jun re-verification — draft docs restored to stable)
* **Lifecycle**: Jun verified the recent amendments in-session —
  [position-management](system/constitution/position-management.md),
  [l1-7](system/guards/l1-7.md), [trades](system/echidna-tables/trades.md),
  [order-intents](system/echidna-tables/order-intents.md),
  [magi-core](system/services/magi-core.md),
  [thoughts](system/echidna-tables/thoughts.md) and the new
  [bridge-health-checks](system/echidna-tables/bridge-health-checks.md)
  all restored `draft` → `stable`, `verified` stamped human:jun
  2026-10-20T08:44Z, `stale_after` 2027-04-18. Inline
  pending-verification notes in position-management, l1-7 and trades
  rewritten to record the verification. Factual corrections folded in:
  `magi-bridge-monitor` and the order-time `CLOSE` journaling marked
  merged (magi-core#624, #632 — deploy.yml on main carries job +
  scheduler).

## 2026-10-20 (order_intents partial-fill reconciliation)
* **Amendment**: [order-intents](system/echidna-tables/order-intents.md)
  Reconciliation contract aligned with magi-core#634 (fixes magi-core#626):
  the open set now keeps `CONFIRMED` intents until the recorded fill covers
  `qty` (`filled_qty < qty`), so partially-filled orders no longer drop out
  of the sweep; an intent closes `RECONCILED` only on a terminal broker
  order status (`FILLED_ALL`/`FILLED` or the no-fill terminal set), while a
  still-working partial fill stays open and each sweep journals the
  incremental delta into `order_fills`; ORPHAN FILL alerts fire once via an
  `[orphan-notified]` `detail` tag and now run before the terminal branch.
* **Record**: magi-core#635 fixed the evaluator write path
  (`bulkUpdateTrades` coalescing `undefined` array params to `null`) that
  had discarded the 2026-10-20 01:00Z close-settlement flush, unblocking
  the magi-core#625 PLTR settlement; implementation-only fix, no spec
  change.

## 2026-10-19 (long-only enforcement + L1.7 classification-lag notes)
* **Lifecycle**: [position-management](system/constitution/position-management.md)
  and [l1-7](system/guards/l1-7.md) demoted `stable` → `draft` (with
  `generated.at` refreshed) because they now carry unverified amendments —
  per the OKF lifecycle, AI-authored additions are `draft` until human
  verification. On Jun's confirmation, restore `stable` and re-stamp
  `verified` (PR #160 review finding).
* **Amendment**: [trades](system/echidna-tables/trades.md) Close events
  rule 3 — "long-only" is now described as *enforced* (`ACCOUNT_TYPE=cash`
  activating [L0.5](system/guards/l0-5.md), decision magi-core#629), not
  merely observed in the SIMULATE account. Implementation: magi-core#631
  (merged `ab6dac1`; `ACCOUNT_TYPE=cash` deploy-verified on all seven
  unit session jobs).
* **Amendment**: [position-management](system/constitution/position-management.md)
  — the short-entry rules (0.7x sizing, -3.5% short SL) are annotated as
  dormant while `ACCOUNT_TYPE=cash` keeps L0.5 active; they remain the
  margin-account rules and stay in the doc. Reinstating shorts requires
  symmetric FIFO accounting first (magi-core#629).
* **Amendment**: [L1.7](system/guards/l1-7.md) — the AUTO_CLOSE-only drift
  resolved in magi-core#627; new open note: discretionary sells only reach
  `CLOSE` via the daily evaluator (rows ≥24h old), so same-day
  discretionary losses are not visible to the switch until magi-core#630
  writes the result at order time. Unit-attribution owner predicate also
  updated (entries settled WIN/LOSE at/after the close were still open
  at close time).

## 2026-10-19 (trades result semantics: discretionary sells are close events)
* **Amendment**: [trades](system/echidna-tables/trades.md) Result vocabulary —
  added `CLOSE` (confirmed unit-initiated `side='sell'` row acting as a FIFO
  close event, distinct from guard-triggered `AUTO_CLOSE`) and
  `ORPHAN_CLOSE` (confirmed sell with zero open-buy coverage; terminal
  anomaly flag, not mark-to-market). New "Close events" section pins the
  rules: only `price_confirmed=TRUE` sells settle entries; account-level
  FIFO per symbol; the sell row is terminal (never MTM); overhang is an
  anomaly, never a short; every filled sell must reach a terminal result.
  Resolves magi-core#625 — the 2026-10-13 PLTR sell (335505, realized
  +$2,674.80) stayed `HOLD` and its two buy rows kept being marked down
  because only `AUTO_CLOSE` rows counted as close events. Warn-only
  counterfactual entry-path predicate extended to exclude `CLOSE` too.
  Implementation (trade-evaluator.mjs) and PLTR backfill tracked under
  magi-core#625 — evaluator change needs independent review.

## 2026-10-19 (bridge_health_checks liveness log + magi-bridge-monitor)
* **Creation**: [bridge-health-checks](system/echidna-tables/bridge-health-checks.md)
  (draft) — append-only broker-path liveness log written/read by the new
  `bridge-monitor.js` job (magi-core `feat/bridge-health-monitor`; probes
  tunnel `/health`, proxy `/route_status` and `/trade/positions`; classifies
  ok/degraded/down; Telegram ALERT on down transitions + recovery, 6h
  re-alert, dedupe via the same table). Closes the alerting gap from the
  2026-10-14→17 bridge outage (magi-moomoo#88/#89): ~3.5 days DEGRADED with
  no human notified. Also catalogued the `magi-bridge-monitor` /
  `magi-bridge-monitor-scheduler` pair in
  [magi-core](system/services/magi-core.md) operational jobs (pending the
  magi-core PR merge — deploy.yml carries the definitions).

## 2026-10-17 (order_intents reconciliation of CONFIRMED-unfilled intents)
* **Spec follow-up to the 2026-10-13 PLTR incident** (broker order 335505,
  intent `i_8c8b97e4e2a3`): the bridge answered `success:true` with status
  `UNKNOWN` and no fill, leaving the intent `CONFIRMED` with `filled_qty` 0 —
  a state the old open set (`PENDING`/`UNKNOWN` only) never reconciled.
  [order-intents](system/echidna-tables/order-intents.md) Reconciliation
  contract extended: the open set now includes `CONFIRMED` with no recorded
  fill (`filled_qty` 0/NULL, `broker_order_id` set); matching is by remark
  OR `broker_order_id`; a `CONFIRMED` intent absent from the history window
  stays open (`UNKNOWN`) instead of aging to `LOST`. Implemented in magi-core
  branch `fix/reconcile-confirmed-unfilled` (`lib/order-intents.js`).
  Review follow-up (same heading): the per-symbol order_history lookback now
  scales to the oldest open intent's age (+2d, floor 7, cap 90 — the bridge
  limit); the absence-from-window UNKNOWN is a one-shot transition event;
  and intents carrying `broker_order_id` that are absent from the window get
  one UNKNOWN transition event and are thereafter only counted/logged — they
  are never marked `LOST` (Jun decision 2026-10-17), while the 24h LOST rule
  now applies only to intents without `broker_order_id`. Intent age for the
  lookback sizing and the 24h rule is measured from the intent's first
  journaled event (`MIN(created_at)` per `intent_id`).

## 2026-10-12 (L6 policy change)
* **Policy change (Jun decision, 2026-10-12)**: [L6](system/guards/l6.md)
  rewritten for the new policy — `EXTREME_FEAR` drops the VIX-only
  directional veto (BUY/SHORT both allowed under a locked 0.3x → 4.5%
  account-wide per-symbol cap; oversize clamped, zero headroom skipped, no
  forced liquidation); `PANIC` now blocks risk-increasing orders on **both**
  sides including adds and flips. Rollout is staged via `L6_POLICY`
  (`legacy` default → `observe` on live units → `live` after the ~1-month
  observation review); observe mode keeps legacy enforcement while journaling
  new-policy verdicts (`L6_OBSERVE` WARN_ONLY rows + `trades_shadow`
  candidates for legacy-blocked EXTREME_FEAR BUYs). Same-change updates:
  [vix-regime](system/constitution/vix-regime.md) table/Intent/Modes,
  [l1-5](system/guards/l1-5.md) (EXTREME_FEAR multiplier lock vs Optuna
  overrides + no double application + live-mode clamp),
  [guards index](system/guards/index.md) L6 row, and the
  [constitution index](system/constitution/index.md) section 6 summary and
  PLM/LILITH comparison row. `l6.md`, `vix-regime.md`, `l1-5.md` demoted
  `stable` → `draft` pending Jun's verification. `magi-core` code in the
  linked PR (`lib/l6-policy.js`, `src/llm.js` L1.5/L6, `lib/vix.js` lock,
  `lib/constitution.js` mode-dependent rendering, `deploy.yml`
  `L6_POLICY=observe` on the six live units).
* **Verification**: Jun reviewed the L6 policy documents in-session on
  2026-10-12 and instructed Devin to record `verified: human:jun @
  2026-10-12T03:56:00Z` on [l6](system/guards/l6.md),
  [vix-regime](system/constitution/vix-regime.md) and
  [l1-5](system/guards/l1-5.md); all three restored `draft` → `stable`,
  `stale_after` extended to 2027-04-12.

## 2026-10-12
* **Correction**: [MARKET REGIME AWARENESS - VIX](system/constitution/vix-regime.md)
  — the VIX table used four bands (`<15` / `15-25` / `25-35` / `>35`) that did
  not match the five-level regime enum in `magi-core/lib/vix.js`
  (`CALM` / `LOW_FEAR` / `HIGH_FEAR` / `EXTREME_FEAR` / `PANIC`, boundaries
  15/20/25/30) and told units "25-35: both directions allowed" while
  [L6](system/guards/l6.md) (stable, Jun 2026-10-06) hard-blocks
  risk-increasing BUYs from VIX 25. Table rewritten to the enum bands with
  the L6 outcome and L1.5 size multiplier per regime; Intent now records the
  2026-09-21 option-A tightening instead of calling L6 warn-only. Stale L6
  "warn" wording also fixed in the [guards index](system/guards/index.md)
  pipeline table and the [constitution index](system/constitution/index.md)
  section row. Surfaced by an external review (GPT) of guard strictness;
  this entry aligns documents to the existing decision and does **not**
  change the block threshold — relaxing L6 remains a Jun risk-policy call.
  The matching prompt text in `magi-core/lib/constitution.js` (and the
  stray "8-symbol limit" in SWING TRADING DISCIPLINE, which contradicts
  the 5-symbol `MAX_CONCURRENT_POSITIONS` default) is fixed in the linked
  magi-core PR. Review follow-ups (PR #154): band boundaries written
  lower-inclusive (`15 to < 20`) so VIX 25.0 is unambiguously
  `EXTREME_FEAR`; a *Legacy enum mapping* note records that the pre-v2
  `NORMAL` band (still listed in the historical LILITH-safe
  [MACRO_BLOCK schema](_lilith_safe/schemas/macro-block.md)) maps to
  today's `LOW_FEAR`; the PLM/LILITH comparison row in the constitution
  index no longer attributes hard gating to LILITH-safe alone; and
  [L1.5](system/guards/l1-5.md) now documents the VIX regime multiplier on
  the exposure cap (1.0/0.7/0.3), the boost-clamp path and the shared
  account-wide position count it actually enforces. Both docs were first
  demoted `stable` → `draft` per lifecycle; Jun reviewed the PR #154 diff
  and review triage in-session on 2026-10-12 and instructed Devin to record
  the `verified: human:jun @ 2026-10-12T02:46Z` entries and restore `stable`
  (the entries record Jun's review act, written at Jun's explicit
  instruction). The magi-core `vendor/magi-knowledge` pin follows in
  magi-core#616 (its `okf-constitution-drift.test.js` requires a stable doc
  for every rendered prompt section).

## 2026-10-11
* **Policy**: Jun approved extending the Mistral auto-review egress scope —
  the magi-knowledge workflow may send post-change content of PR-touched
  `.md` files (≤24k chars total / ≤8k each) and the magi-core workflow may
  send pinned `vendor/magi-knowledge` spec excerpts selected by diff
  keywords (≤30k total / ≤6k each) as review context. Recorded in
  [COLLABORATION.md](COLLABORATION.md) under *Automated PR review bots*.
  Motivation: repeated Mistral hallucinations (non-existent spec quotes,
  "not documented" claims, "future date" claims) traced to missing context.
* **Enhancement**: `auto-review.yml` (this repo, PR #153) — inject the
  review date, changed-`.md` post-change content (budget-capped, renamed
  files included, `..` paths refused, per-file clamp to remaining budget),
  repo-specific review premises, read-failure logging and a
  budget-exhaustion marker into the Mistral prompt.
* **Application** (partial): magi-core#609 closed the three remaining
  corpus coverage gaps — decision attempts that produced no
  `decision_id`-bearing thoughts row and so never reached
  `distill_decisions`. `AUTO_CLOSE` system closes now journal a
  `llm_provider='system'` thoughts row before dispatch (with the close
  `trades` row linked by `thought_id`); `logGuardBlock` rows mint a
  fresh `decision_id` per guard verdict (reusing the analysis id would
  collide in the extractor's single-key dedupe — one thoughts row = one
  corpus decision); `lib/call-failed-journal.js` writes `CALL_FAILED`
  rows for thrown/unusable LLM calls, best-effort so journaling never
  masks the original failure. `thoughts`/`trades` docs updated. Every
  decision attempt is now L1-visible: analysis, system close, guard
  block and call failure.
* **Application** (partial): magi-core#608 added the B2 outcome kinds —
  `mark_to_market` (open position at the 10-trading-day mark, valued at
  the last [moomoo-snapshots](system/echidna-tables/moomoo-snapshots.md)
  quote at/before the maturity instant) and `shadow_virtual` (SHADOW
  trade results are virtual by definition — never `realized`;
  NOT_ADOPTED BUY proposals get counterfactual virtual entries at the
  last snapshot ≤ decided_at on the same 10-trading-day clock). Maturity
  uses `lib/trading-calendar.js` (`us-nyse-holidays-v1`, algorithmic
  NYSE calendar; 16:00 ET of the 10th trading day after the entry's ET
  date). No pre-maturity counterfactual exit rule exists in the OKF —
  v1 exits at maturity only (`eval_rule_version = maturity-10td-v1`);
  adding one is a spec decision, not an implementation choice.
* **Application** (partial): magi-core#607 shipped the B1 offline
  extractor — `scripts/distill-extractor.mjs` + `lib/distill-extract.js`
  writes `distill_decisions`/`distill_outcomes` (v1 kinds: realized /
  immature / unevaluable; mark_to_market + shadow_virtual are B2).
  Manual invocation only — `node scripts/distill-extractor.mjs
  --from=YYYY-MM-DD --to=YYYY-MM-DD [--write]`; scheduling is Jun's
  separate decision and no rows
  exist until the first run. Determinism contract: identical L0 input
  produces identical record_hash; run instants are bookkeeping, never
  hashed.
* **Application** (partial): magi-core#606 shipped the `decision_sources`
  live-path writer (`lib/decision-sources.js` + `src/session.js` evidence
  journal) — flag-gated behind `DECISION_SOURCES_ENABLED` (default OFF),
  pending Jun's IAM grant (`storage.objects.create` on
  `magi-pandorabox-screen-share-459802`) and deploy-env enablement. Bodies
  land content-addressed with `#generation` URIs; same-batch tool results
  are excluded from a decision's evidence (lookahead boundary).
  [decision-sources](/system/echidna-tables/decision-sources.md) banner
  updated. This completes Phase A (A1–A4) of the corpus lineage work —
  A1 `decision_id` + A2 `order_fills` (magi-core#602, DDL applied
  2026-10-10), A3 `arbiter_verdicts` mirror (#604/#605, flag-gated).

## 2026-10-10
* **Application**: Jun applied the `decision_id` column migrations to
  production `screen-share-459802.magi_core` — `thoughts.decision_id`
  and `order_intents.decision_id` (magi-core PR #602,
  `sql/alter_thoughts_add_decision_id.sql` +
  `sql/alter_order_intents_add_decision_id.sql`, `bq` DONE at
  ~23:35 UTC). [thoughts](/system/echidna-tables/thoughts.md) schema
  table gains the same `decision_id` row — the doc had omitted it
  (same drift class as order-intents). Pre-apply rows carry NULL
  `decision_id` by design;
  producers had been omitting the field via schema probe and now write
  it on every new row. Also on this date: magi-core#604/#605 shipped
  the `arbiter_verdicts` mirror writer (flag-gated behind
  `ARCSIG_EXPERIMENT`).
* **Correction**: added the `decision_id` column to
  [order-intents](/system/echidna-tables/order-intents.md) — the doc
  omitted a column the implementation already writes (magi-core PR
  #602, migration `sql/alter_order_intents_add_decision_id.sql`).
  `decision_id` (`d_` + 12 hex) is minted at decision time for every
  attempt including `CALL_FAILED`, matching the corpus identifier
  contract in [decision-sources](/system/echidna-tables/decision-sources.md)
  and the `order_fills` lineage spine
  `decision_id → intent_id → broker_order_id → fill_id`. Producers
  schema-probe and omit the field until the migration lands, so
  pre-apply rows carry NULL. The migration itself is pending Jun's
  `bq query` apply; this closes the spec↔code drift flagged by
  automated review, not the production schema gap. The doc is demoted
  to `draft` per the lifecycle rule (generated revision post-dates the
  2026-10-06 `human:jun` verification) and returns to `stable` on
  Jun's re-verification.
* **Application**: Jun applied the experience-distillation drafts to
  production `screen-share-459802` (all 9 referenced concepts are
  `status: draft` with no `verified.by`; applied under Jun's explicit
  approval, operator `jun@dogma.jp`). Created GCS bucket
  `magi-pandorabox-screen-share-459802` (US, UBLA, public access
  prevention enforced, versioning on, unlocked `P2Y` retention —
  confirmed via `describe`: `retentionPeriod: 63115200`) and the 8
  BigQuery tables (`decision_sources`, `arbiter_verdicts`,
  `order_fills`, `distill_decisions`, `distill_outcomes`,
  `distill_bundles`, `method_cards`, `method_card_approvals`) and added
  the `model_version` column to `magi_core.trades`, all verified with
  `bq ls`/`bq show`.
  Applied at knowledge pin `8fffc33e6d6e559bf2ee76e080c740bf0d420d2a`,
  core `e6348e8ee6511b3d0e5c57ccc6c130cee4b7a37a` (runbook hardened in
  magi-core#596–#598 during apply). The concepts remain drafts — this
  records that production now matches the draft DDL; it does not promote
  them to verified specification. L0 live-path writers are still not
  wired and need separate review.
* **Decision**: Jun set context-body minimum retention to **2 years** and
  delegated bucket naming (PandoraBoX suggested). Recorded
  `magi-pandorabox-screen-share-459802` in
  [decision-sources](/system/echidna-tables/decision-sources.md), replacing
  the earlier `magi-distill-context` runbook proposal. The policy uses
  `P2Y`, remains unlocked, and adds no automatic deletion schedule.
  Reference baseline: knowledge `0bb2aeed53c16519b166c61356b88b59203aae72`,
  core `b2b2d72613ccf54a41a530f4bde5e56898bdfcd2`. Bucket availability and
  provisioning are unverified; no GCS/IAM operation was performed. The
  concept remains draft and the core runbook must follow the merged pin.
* **Correction**: magi-core#592 persistence review — added independent
  `symbol` / `unit_name` / `session_id` / `mode` attribution to
  [distill-outcomes](/system/echidna-tables/distill-outcomes.md) and the
  ordered `provenance_sample_decision_ids` array to
  [method-cards](/system/echidna-tables/method-cards.md). DDL at magi-core
  `6765900f27deeacbe51fbf8c379250230ccd00ed` omitted these fields; the
  offline contracts at `9e4067356acfd3c69075bf43c526fbf8e61f43ba`
  require them for pair consistency and card content-hash round-trips.
  Both concepts remain unverified drafts. No production DDL, writer,
  approval policy or LILITH boundary change is implied.
* **Enhancement**: Experience-distillation corpus drafts under
  [echidna-tables](/system/echidna-tables/index.md) — review-fix pass on
  PR #143 (Codex/Gemini/Mistral findings). Clarified `model_version` as
  the decision-time served-model identifier (mutable aliases never prove
  weight identity); defined all content/manifest/record hashes as
  SHA-256 over canonical JSON (`lib/method-card.js` `canonicalJson`);
  fixed the bundle cutoff predicate to the persisted `extracted_at`;
  documented `distill_bundles` mutability (only `state`/`superseded_by`
  change; bundles are written frozen); made `method_cards.state` a
  derived projection — never an authorization source; defined
  `shadow_virtual` maturity on the same clock as real outcomes; required
  finite `published_at`/`fetched_at` for `external` sources
  (`checkLineage` parity — NULL is a lineage failure); documented
  `retention_state` values, the private-bucket/access posture, the
  Firestore↔BigQuery mirror drift check, and conflict-quarantine
  semantics. Rejected findings recorded on the PR: BigQuery `JSON` type
  (implementation DDL uses `STRING`), `verdict_doc_uri` rename (column is
  a Firestore document path), and the "missing `order-fills`" note (file
  is in the PR).

## 2026-10-09
* **Enhancement**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  (draft, v0.8) + 8 new draft table concepts under
  [echidna-tables](/system/echidna-tables/index.md) — recorded the
  GPT-reviewed three-layer learning-dataset design for the ARC×SIG path
  (magi-core#581). L0 raw evidence: `decision_sources` (decision-time
  context lineage; bodies in GCS — **Jun approved GCS object storage
  2026-10-09**), `arbiter_verdicts`, `order_fills`. L1 normalized records:
  `distill_decisions`, `distill_outcomes`, `distill_bundles` (frozen,
  input-pinned). L2: `method_cards` + `method_card_approvals`
  (append-only audit ledger, closes an option-A gap). Invariants:
  `decision_id` as corpus key (issued even for CALL_FAILED), 5-element
  model-independent cohort, `opportunity_id` for same-condition
  comparison, realized vs 10d mark-to-market vs virtual kept distinct,
  corrections-as-versions with conflict quarantine. All drafts — tables
  do not exist; DDL prepared in `magi-core` `sql/` for Jun; L0 live-path
  writers each need separate review.
* **Enhancement**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  — recorded Jun's stated direction (planning note, not an approved
  determination): ARC/SIG slots are intended to run as local-LLM units
  on TIALA (Ollama, HTTP-only Cloudflare tunnel). No slot↔name/model
  binding; the shared host/tunnel correlated-failure domain and its
  open prerequisites are noted for evaluation at unit/model selection.
* **Governance**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  (draft, v0.7) — Jun approved the measurement-plan values as the
  experiment's evaluation criteria (≥60 outcome-matured pairs per
  configuration AND per unit; 10-trading-day maturity; ≤60-trading-day
  frozen window; time-ordered/walk-forward validation with watermark +
  1-day embargo; after-cost expectancy bootstrap 95% CI lower bound > 0;
  insufficient samples never become a winner; `shadow_virtual` kept
  separate). Unit naming recorded: TYPHON/QWEN keep their existing names
  as ledger `unitId`s; ARC/SIG remain unbound slot identifiers pending
  Jun's local-model selection. Open decision updated: Firestore backend
  provisioned and its atomicity/restart/fencing verified by the real-DB
  integration suite (6/6); remaining step is dispatcher wiring at
  experiment start.
* **Verification**: [L1.7 Daily-loss Kill Switch](/system/guards/l1-7.md)
  re-verified by human:jun (2026-10-09) covering the dual-scope
  (unit −50 / account −100) change; status restored `draft → stable`.

## 2026-10-09
* **Enhancement**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  (draft, v0.6) — recorded Jun's 2026-10-08 determinations on magi-core#581:
  option **A** (agent-curated method-card loop) adopted conditionally,
  superseding the draft's B-only stance, provided cost does not materially
  increase; A cards keep the `draft → human:jun verify` promotion gate and
  stay offline until the candidate-path gaps close (approver
  authentication, append-only audit ledger, fee/close attribution, the
  `thought_id` join incl. `llm_provider`/`trade_mode`). Correlated-losses
  mitigation is structural — differentiated base models ("two pros"), no
  numeric threshold; the pair collapses to one lane if redundancy value
  is absent. Implementation owner: Devin.

## 2026-10-08
* **Correction**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  / [L1.7](/system/guards/l1-7.md) — per review on PR #139: pinned the
  merged magi-core revisions (`#583` → `4e05af4`, `#584` → `b4fc555`;
  inspected revisions `fc26b7e` / `2e737e4`) replacing the "unmerged"
  status, linked the L1.7 reference, clarified baseline NAV
  (1,062,382.85 measured) vs approval NAV (1,062,192.79) as NAV drift,
  and added the same-change update obligation for future production
  wiring. L1.7 notes that the `verified` stamp predates the dual-layer
  update (Jun re-verification pending) and flags the BQ-lookup fail-open
  behaviour as an open question for Jun.
* **Correction**: log entry below — `182729395` was labelled "paper
  account"; corrected to name broker `acc_id` `1302593` as the dedicated
  PLM paper account (182729395 is the user-level MooMooID).
* **Enhancement**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  (draft, v0.5) — updated *Account isolation* per Jun's decision: the
  dedicated PLM paper account is the broker trading **`acc_id` `1302593`**
  (SIMULATE, broker-confirmed; `182729395` is the user-level MooMooID, not
  the trading acc_id the allowlist binds). All PLM order flow routes
  through the shared authority
  once wired (`externalReconciled` stays fail-closed until then);
  `MOOMOO_ACC_ID` pinning and the `acc_id` response field
  (magi-moomoo#87) recorded as prerequisites; measured baseline NAV
  1,062,382.85 USD; pre-existing PLM holdings recorded, not covered by
  the experiment budget.
* **Enhancement**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  (draft, v0.5) — added a *Measurement plan* **proposal** (pending Jun;
  none of the values below are approved yet — listed under Open
  decisions): ≥60 matured decision-outcome pairs per configuration, 10-trading-day
  outcome maturity, 60-trading-day frozen comparison window,
  watermark/purge/embargo walk-forward for method cards, after-cost
  expectancy with 95% CI lower bound > 0 as the pass threshold, and
  `shadow_virtual` scoring for the non-adopted arbitration side. Also
  recorded the Firestore provisioning package, the real-wire UNKNOWN
  regression test and the partial-fill ledger split
  (`splitReservationOnFill`).
* **Enhancement**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  (draft, v0.5) — recorded Jun's 2026-10-08 determinations (paper-only
  scope, 1000 USD loss budget with the loss-adjusted invariant, USD caps,
  independent-allocation arbitration + shared authority, both-stop on unit
  failure, long-only SELL, dual L1.7, B-only learning, experiment start
  conditions) and the updated candidates (arbiter contract v0.2,
  experiment gates, account guard, Firestore reservation adapter).
* **Correction**: [L1.7 daily-loss kill switch](/system/guards/l1-7.md) —
  the doc previously claimed "per-unit, not portfolio-wide" while
  `lib/daily-loss.js` (since `5879a8e7`) already implemented an additional
  account-wide trip. Jun approved the dual scope 2026-10-08; the doc now
  describes both layers and notes the gross-of-fees `pnl_amount`
  understatement. Needs Jun re-verification (`verified` predates this edit).
* **Enhancement**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  (draft, v0.4) — recorded the offline implementation candidates for
  magi-core#581: deterministic Experience-Distillation (option B) and the
  ARC×SIG verdict-only order arbiter in `magi-core#584`, plus the
  UNKNOWN→SELL reconciliation-contract fix in `magi-core#583`. Both
  candidates are unmerged, fixture-tested, and unconnected to production.
  Added to Open decisions: arbitration policy (consensus vs independent
  allocation), production atomic-reservation backend, production
  numerical thresholds/allocations, and the L1.7 per-unit vs
  account-wide spec↔code drift.
* **Enhancement**: [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md)
  (draft, v0.3) — recorded Jun's final-form concept: the converged decision
  core's two slots carry codenames **ARC** (production-A) and **SIG**
  (production-B) in an **Active×Active** redundancy arrangement, not a
  judge+challenger split. Codenames are slot identifiers decoupled from
  existing units — ARC is not the retired LILITH, SIG is not the deployed
  ADAM; occupying models/providers remain evidence-selected. Added the
  correlated-losses bound as a hard constraint for Active×Active
  (same-corpus training yields shared failure modes) and clarified that
  judge+challenger stays a comparison candidate. Sensitive-path change
  (`system/constitution/**`): independent review required before Jun's
  re-verification promotes it beyond draft.

## 2026-10-07
* **SA key cleanup (devin-bq-admin)**: all 5 user-managed keys on
  `devin-bq-admin@screen-share-459802.iam.gserviceaccount.com`
  (`27830b59`, `3c584ee5`, `5928b1d3`, `73029fb8`, `ed2cd589`) **deleted**
  after the audit found no key JSON for this SA in any store Devin can
  reach. Audited scope: Devin org secrets (all ~35, only
  `GCP_SERVICE_ACCOUNT_KEY` → SA `github-actions@`, key `1f618b92…`),
  session env / `~/gcp-key.json` / `~/.config/gcloud` on this VM, every
  GSM secret in `screen-share-459802` (~60; the only SA JSON was for the
  now-deleted `grafana-bigquery` SA), the four live MAGI repos, magi-core
  GitHub Actions secrets, and the cognition-bigquery MCP install
  (unconfigured). Locations outside Devin's reach — jun's local machine,
  third-party password stores, other GCP projects — are inherently out
  of audit scope; deleting the keys removes the risk regardless of any
  copy surviving there. Key lineage was reconstructed from Admin
  Activity audit logs (key IDs cannot be listed: `github-actions@` lacks
  `iam.serviceAccountKeys.list`): 9 `CreateServiceAccountKey` events
  between 2026-04-27 and 2026-07-14 minus 4 previously deleted keys =
  the 5. Four of the five were created after the last recorded API use
  by this SA (2026-04-27, per jun's audit) and have no recorded usage in
  the retained logs. Jun granted `github-actions@`
  `roles/iam.serviceAccountKeyAdmin` **on this SA only** for the
  deletion; the post-delete `keys list` shows only the 2 Google-managed
  keys (`748216a7`, `b137f00b`, expiring 2027-04-27, not deletable), and
  all 5 deletions are recorded as `DeleteServiceAccountKey` events in
  Admin Activity (2026-10-07T06:19Z). The temporary KeyAdmin binding was
  revoked by jun the same day — verified when `keys list` returned to
  PERMISSION_DENIED. The SA itself and its project roles (`owner`,
  `editor`, `bigquery.admin`, `discoveryengine.agentspaceAdmin`,
  `discoveryengine.agentspaceUser`) are unchanged — its `owner`/`editor`
  grants are over-privileged for an unused SA and are recorded as a
  follow-up in [secrets-inventory](system/services/secrets-inventory.md).
* **IAM cleanup (orphaned SAs)**: enabled-but-dead service accounts
  `lilith-trainer` (LILITH pipeline deleted 2026-10-07) and `magi-ac`
  (repo already absent) deleted — zero auth events in 90 days, no
  user-managed keys, no code/doc references. Audit of the remaining
  enabled SAs: `github-actions` (CI/CD, active), `aka-agent` and
  `aka-mac-mini` (AKA on TIALA, BQ activity 2026-10-05),
  `cloudflare-gcp` (BQ queries 2026-09-21), `firebase-adminsdk-fbsvc`
  (Firebase agent) all show use or documented purpose. Zero-activity SAs
  left for Jun's decision pending out-of-band config checks:
  `grafana` (monitoring.viewer — verify Grafana datasource auth),
  `cloudflare` (possible duplicate of `cloudflare-gcp`),
  `magi-run-sa` (Jun holds tokenCreator/serviceAccountUser — manual
  impersonation target), `magi-trading-sa`, `devin-bq-admin` (now Owner;
  5 user keys outstanding — key hygiene recommended).
* **IAM cleanup (disabled SAs)**: 12 disabled service accounts deleted from
  `screen-share-459802` — `devin-bq` (superseded by `devin-bq-admin`),
  `cloud-scheduler-invoker`, `hermes-writer`, `magi-ui-sa`, `colab-optuna`,
  `pubsub-invoker`, `pubsub-push-invoker`, `grafana-bigquery`,
  `grafana-bq-new`, `magi-caller-sa`, `tableplus-readonly`,
  `github-actions-deploy`. All were already disabled, had no inbound IAM
  bindings, no live-workload attachments and no code/doc references
  (verified via org-wide `gh search code` and repo greps). Recoverable via
  `gcloud iam service-accounts undelete` within 30 days. Side finding: GSM
  secret `BQ_SERVICE_ACCOUNT_KEY` holds a key for the deleted
  `grafana-bigquery` SA — dead by construction; removal is a pending
  secret-hygiene item for Jun, not done here.
* **IAM cleanup**: service account `magi-optuna-scheduler@screen-share-459802.iam.gserviceaccount.com`
  deleted. It carried only `roles/aiplatform.user`, had no user-managed keys
  and no auth events in the last 90 days; it belonged to the retired Optuna
  pipeline (`magi-optuna-job` / `magi-optuna-optimizer`, already absent) and
  Feb-2026 `magi-optuna-test*` Vertex AI test jobs. Recoverable via
  `gcloud iam service-accounts undelete` within 30 days. Noted in
  [magi-core](/system/services/magi-core.md) (draft pending re-verification).
* **Drift fix (repo pointer)**: [magi-isabel](/system/services/magi-isabel.md)
  `repo` corrected `dogmaai/magi-isabel` → `dogmaai/magi-core`. The standalone
  repo does not exist on GitHub (verified 404); the ISABEL implementation has
  lived in the magi-core monorepo (`isabel/`, `isabel-cache.mjs`,
  `src/isabel.js`) and deploys via `magi-core/.github/workflows/deploy.yml`.
  All three `magi-isabel-*` Cloud Run Jobs and their schedulers are live and
  unchanged. Demoted to `draft` pending Jun's re-verification.
* **Cloud Build connection cleanup**: dead repository links removed from
  connection `magi` (asia-northeast1): `dogmaai-magi-stg`,
  `dogmaai-magi-shared` (repos deleted 2026-10-07) plus `dogmaai-magi-isabel`,
  `dogmaai-magi-ac`, `dogmaai-magi-gateway`, `dogmaai-alpaca-mcp-server`
  (repos already absent, so the links could not resolve anyway). Remaining
  links all resolve to live repos: `magi-core`, `magi-moni`,
  `magi-moomoo`, `magi-model-health-check`. The connection itself, its
  GitHub App installation, and the live repos' builds are unchanged — no
  deploy pipeline references the removed links (org-wide `gh search code`
  verified zero references to the deleted repos).
* **Repository deletions (Jun-approved)**: `dogmaai/lilith-training`,
  `dogmaai/magi-shared`, `dogmaai/magi-core-public` and `dogmaai/magi-stg`
  deleted. lilith-training was the retired LILITH fine-tuning/DPO pipeline;
  all 18 of its Cloud Run Jobs in `asia-southeast1` (the 15 `*-poc`/`*-diag`/
  `*-smoke` experiments plus the 3 `*-prod` jobs) were deleted the same day —
  no Scheduler, Eventarc or Cloud Build trigger referenced them, and no
  `magi-stg`-named Cloud Run service exists anywhere in
  `screen-share-459802` (the old `magi-stg` deploy.yml target was already
  absent). `magi-shared` and `magi-core-public` had no corresponding
  production service and no inbound references from live repos (verified by
  org-wide `gh search code`). Mirror backups of all four repos plus
  per-job `describe` YAML exports are retained on Jun's machine
  (`~/magi-deletion-work/`). Docs updated: the service map row records the
  deletion, [lilith-training](/system/services/lilith-training.md),
  [lilith](/system/plm-units/lilith.md) and the ECHIDNA consumer notes
  (`trades`, `thoughts`, `views`) mark the retired pipeline/repo as deleted,
  the auto-review inventory drops the `lilith-training` row, and
  `index.md`/`AGENTS.md`/`README.md`/`secrets-inventory.md` now say
  `magi-stg` is deleted rather than archived. Edited `stable` concepts are
  demoted to `draft` per the lifecycle rule; `stable` returns on Jun's
  re-verification. BigQuery datasets/tables, GCS data, Artifact Registry
  images and shared IAM/service accounts were untouched per the deletion
  scope.
* **Repository deletions (Jun-approved)**: `dogmaai/magi-ui` and
  `dogmaai/magi-deep-research` deleted. The deep-research repo was the
  Gemini Enterprise `streamAssist` Cloud Run Job reference
  implementation; the production brief flow has been the Devin
  Automation `MAGI 日次市場ブリーフ投入` +
  `magi-core/scripts/upload-deep-research.mjs` since 2026-09. Verified
  before deletion: no Cloud Run Job/Service or Scheduler named
  `magi-deep-research` exists in project `screen-share-459802` — the job
  was never deployed. Docs updated: the service doc repo pointer moved
  to `magi-core`, the service-map row records the deletion, and the
  auto-review inventory and `MISTRAL_API_KEY` injected-copy list were
  pruned. `system/services/magi-deep-research.md` and
  `system/services/secrets-inventory.md` are demoted to `draft` per the
  lifecycle rule (generated.at now postdates the human `verified`
  entries); `stable` returns on Jun's re-verification.

## 2026-10-06
* **Re-verified and restored stable** on Jun's merge of PR #128 (his
  review of the rewritten bodies): `guards/{l4,l5,l7}.md`,
  `echidna-tables/isabel-patterns.md`,
  `services/{magi-core,magi-isabel,magi-moni}.md` — each gained
  `verified: human:jun` + `stale_after` +180d and returned to `stable`.
* **Spec↔impl drift audit + remediation** (spec `7dfe03a` vs impl
  `magi-core@baa5388` + live `bq ls/show`): every job the spec documented
  matched on name/schedule/TZ (retired jobs correctly absent); one
  impl-only pair (`magi-thought-scorer` service + `magi-stale-update`
  scheduler) was undocumented. Findings
  fixed here: (a) `guards/{l4,l5,l7}.md` — `on_fail: block` → `warn`,
  bodies rewritten to the warn-only implementation already recorded in
  `guards/index.md` (demotion decision still pending independent review);
  (b) `l4-probation.md` — deprecated: the table does not exist in
  `magi_core` and no code references it (links removed from `l4.md`,
  `guards/index.md`, `magi-moni.md`, `model-cohorting.md`,
  `echidna-tables/index.md`); (c) `isabel-patterns.md` — rewritten to the
  live `isabel_l4_patterns` table (schema verified via `bq show`; the
  originally documented centroid schema never materialized);
  (d) `magi-core.md` — added undocumented `magi-thought-scorer` service +
  `magi-stale-update` weekly scheduler, removed the resolved
  openai-scheduler TZ note, source pin bumped `07c1767` → `baa5388`;
  (e) `echidna-tables/index.md` — added a "not yet catalogued" list of
  ~25 live tables/views. **Not fixed**: whether L4/L5/L7 stay warn-only
  permanently is the pending independent-review decision, not an agent
  call. Docs edited by devin/cli now carry `generated` ahead of `human`
  verification — re-verification via this PR's review.
* **Audit (spec mirrors, run by Devin CLI 2026-10-06)**: both live mirrors
  verified in-sync with `main` @ `1d77b9e`. Method: R2 Data Catalog
  `okf.system` scanned via PyIceberg (`CLOUDFLARE_R2_CATALOG_TOKEN` from
  GSM); AI Search `magi-document` read via AutoRAG REST
  (`/rags`, `/jobs`, `/files`) with `CLOUDFLARE_AI_SEARCH_TOKEN`, and the
  indexed objects compared byte-for-byte against local `main` via the
  derived R2 S3 credentials. R2 catalog: 92/92 rows, zero field diffs
  (`status` / `trust_tier` / `stale_after`), `source_revision=1d77b9e`,
  `synced_at` 2026-10-05 22:58 UTC. AI Search: 92/92 objects indexed (no
  missing/extra/errored), index-metadata diffs 0, latest scheduled sync
  2026-10-06 01:30 UTC — after the last content upload. The Gemini
  Enterprise data store is excluded: subscription cancelled, sync
  automation disabled (frozen snapshot; see
  `.agents/skills/syncing-spec-to-gemini-enterprise/`).
* **New token (secrets-inventory)**: `CLOUDFLARE_AI_SEARCH_TOKEN`
  (AI Search Read scope) minted by Jun and registered in GSM — closes the
  AutoRAG-read gap that the R2-scoped catalog token could not cover. Read
  scope verified for `GET /rags`, `/jobs`, `/files`;
  `POST .../search` returns `Authentication error` (query probes need
  AI Search Edit + AI Search Run scopes). Ledger row added; Tier-2
  Global-Key replacement noted as partially unblocked.
* **Follow-up closed (secrets-inventory)**: `MOOMOO_BRIDGE_AUTH_TOKEN`
  version 1 — destroyed by Jun in GSM on 2026-10-05 (the trailing-newline
  value cannot be revived); terminal state verified by Devin via
  `gcloud secrets versions list` on 2026-10-06 (v1 `destroyed`, only the
  enabled v2 remains). Struck from Tier-1 follow-ups.
* **Promoted 17 concepts draft → stable** on Jun's review/approval:
  services/ (`magi-core`, `magi-moomoo`, `magi-moni`, `cloudflare`,
  `lilith-training`, `secrets-inventory`), guards/ (`l6`), plm-units/
  (`lilith`, `oracle`, `sophia-5`, `tiara`), echidna-tables/ (`trades`,
  `order-approvals`, `trades-unverifiable`, `pre-trade-intelligence`,
  `hermes-collection-runs`, `optuna-params`). Each gained a fresh
  `verified: human:jun` entry at promotion. Left `draft` deliberately:
  `guards/jev.md`, `constitution/model-consolidation.md`,
  `constitution/model-cohorting.md` (awaiting Jun decisions), plus six
  human-unverified concepts (`services/hermes-observability`,
  `echidna-tables/{focus-symbols, moomoo-snapshots, order-intents,
  position-guard-evals, system-control}`).
* **Promoted 6 more concepts draft → stable** on Jun's review/approval:
  echidna-tables/ (`system_control`, `position_guard_evals`,
  `order_intents`, `focus_symbols`, `moomoo_snapshots`) and services/
  (`hermes-observability`). All five table schemas were verified against
  `bq show` (zero column/type diffs) before promotion;
  `position_guard_evals`'s "Draft — unverified" body marker was removed
  (the table exists; the degrade-path note is retained). Fresh
  `verified: human:jun` + `stale_after` = +180d on each. Remaining
  `system/` drafts: `guards/jev.md`, `constitution/model-consolidation.md`,
  `constitution/model-cohorting.md` — all intentionally awaiting Jun
  decisions.

## 2026-10-05
* **Ollama tunnel ingress cutover (enforced)**: the `magi-ollama` tunnel
  on TIALA is remotely managed (`source: cloudflare`) — editing the local
  `config-magi-ollama.yml` alone did nothing until the ingress was updated
  via the Cloudflare API (config `version` 2 → 3, service
  `http://127.0.0.1:11437`). A stale second `cloudflared` process from
  2026-09-11 (outside launchd) kept serving the raw-Ollama ingress and was
  killed. Post-cutover probes: unauthenticated `GET /api/tags`,
  `GET /api/version`, `POST /api/pull`, `DELETE /api/delete` → 401;
  correct Bearer → 200; wrong token → 401. `OLLAMA_AUTH_TOKEN` consumed by
  ADAM/BOREAS via magi-core `9641da36` + Cloud Run secret binding. See
  [cloudflare](system/services/cloudflare.md) §3 ingress-auth table.
* **Audit (tunnel ingress auth)**: [cloudflare](system/services/cloudflare.md)
  §3 gained a measured ingress-authentication table for the three
  `*.khaos.company` hostnames. No Cloudflare Access application exists on the
  account (API, 2026-10-05), so origin auth is the only gate.
  `openclaw.khaos.company` enforces `OPENCLAW_GATEWAY_TOKEN` in the gateway
  itself (unauthenticated `/v1/chat/completions` → 401).
  `bridge.khaos.company` is running with `BRIDGE_AUTH_TOKEN` unset
  (`/health` `auth_required:false`, `/positions` answers unauthenticated;
  GSM `MOOMOO_BRIDGE_AUTH_TOKEN` does not exist — REAL `/place_order` still
  fails closed). `ollama.khaos.company` has no authentication at all —
  measured unauthenticated: `GET /api/tags` and `GET /api/version` → 200,
  and `POST /api/pull` / `DELETE /api/delete` reach the Ollama handler
  (400 validation errors, so writes are gated only by request shape,
  not auth); recorded as a measured fact with mitigation left as a
  Jun decision. Doc remains `draft`.
* **Remediation (tunnel ingress auth, same day, Jun-directed)**:
  `MOOMOO_BRIDGE_AUTH_TOKEN` and `OLLAMA_AUTH_TOKEN` were registered in
  GSM and added to the [secrets-inventory](system/services/secrets-inventory.md)
  ledger. The bridge now enforces auth (`auth_required:true`, unauthenticated
  `/positions` → 401) — GSM version 2 is live because v1 carried a trailing
  newline. For Ollama, a bearer-checking proxy
  (`magi-moomoo/scripts/ollama-auth-proxy.py`, `127.0.0.1:11437`) is installed
  on TIALA; the public ingress repoint waits on the deploy of magi-core
  PR #578 (`OLLAMA_AUTH_TOKEN` → `Authorization` header + job binding),
  which was squash-merged 2026-10-05 (`9641da36`), since jobs previously
  sent no credential.
* **Fix**: [secrets-inventory](system/services/secrets-inventory.md)
  `MAGI_KNOWLEDGE_TOKEN` usage sites — added `.github/workflows/test.yml`
  (line 23, `GH_TOKEN` env feeding `scripts/init_knowledge.sh`), which was
  missing from the ledger even though the workflow consumes the secret.
* **CI hardening**: pinned every `uses:` in this repo's workflows
  (`ai-search-sync`, `auto-review`, `okf-conformance`, `okf-freshness`,
  `r2-catalog-sync`) to commit SHAs of the latest release tags — the same
  code the floating tags resolve to today, now immutable against tag
  hijack. Part of the Jun-approved cicd-sensor PoC preparation; the OKF
  has no CI supply-chain policy yet (OKF 未定義).
* **cicd-sensor CI hardening initiative — plan + state (paused per Jun)**:
  Analysis of MAGI GitHub Actions vs cicd-sensor (eBPF CI/CD runtime
  sensor; GitHub-hosted `ubuntu-latest` x64 compatible; pre-release
  v0.0.x) found: deploy jobs in magi-core / magi-moomoo / magi-moni hold
  production GCP power via `id-token: write` WIF (magi-core: 5 docker
  builds + 29 `gcloud run` calls in one job), `magi-knowledge`'s
  `r2-catalog-sync.yml` runs `pip install` in a job that later executes
  installed code under `CLOUDFLARE_R2_CATALOG_TOKEN`, `magi-core`'s
  `lint.yml` ran `npm ci` without `--ignore-scripts`, and all actions
  were tag-pinned (not SHA). OKF has no CI supply-chain policy (OKF
  未定義).
  * **Jun decisions (2026-10-04/05)**: log destination = Takumi
    (Shisho Cloud hosted cicd-sensor Manager, OIDC keyless — option A);
    PoC approved on magi-knowledge `r2-catalog-sync` + magi-core
    `lint`/`test`; cheap fixes (SHA pinning + `--ignore-scripts`)
    approved as separate PRs first. `deploy.yml` sensor rollout is a
    boundary change requiring separate Jun approval — not started.
  * **PRs**: SHA pinning — magi-knowledge#118 (merged `f7718b7`,
    incl. secrets-inventory `MAGI_KNOWLEDGE_TOKEN`/`test.yml` drift
    fix), magi-core#575, magi-moomoo#84, magi-moni#54 (open).
    PoC — magi-knowledge#119,
    magi-core#577 (sensor as first step, SHA-pinned v0.0.38
    `6511eb44…`; OIDC via `flatt-security/shisho-cloud-action` v1.2.0
    `85917b87…`, trace-sender bot `BT01M44N2DQ04VGG88N7S66FTGK6`,
    `environment: cicd-sensor`, `id-token: write`;
    `manager-url=https://manager.cicdsensor.cloud.shisho.dev`).
  * **Known caveat**: under manager mode the project-local
    `.cicd-sensor/config.yaml` is ignored, so `monitor_mode: true` is
    inactive and baseline `terminate` rules can kill jobs on detection
    until `monitor_mode` is pushed to
    `configs.cicdsensor.cloud.shisho.dev/orgs/dogma.ai/config`. That
    push needs a second bot with the **「Takumi Runner設定管理者」**
    role — pending Jun provisioning.
  * **Paused**: rollout suspended per Jun 2026-10-05; resume by
    (1) merging the pinning PRs, (2) merging PoC PRs after deciding
    `monitor_mode` vs live `terminate`, (3) creating the 設定管理者 bot
    and adding the `.cicd-sensor/` ORAS push workflow, (4) separate
    approval for `deploy.yml` expansion and build attestation.
  * **PoC merged then reverted (2026-10-05)**: magi-knowledge#119
    (`637a61c`) and magi-core#577 (`f027b31`) were merged ahead of
    provisioning; on `main` the shisho-cloud-action OIDC exchange failed
    (`STS rejected the bot token exchange: Invalid input: invalid ID
    token`), breaking magi-core `lint`/`test` and this repo's
    `R2 Data Catalog Sync` on every push. Jun approved reverting (this
    repo: revert of `637a61c`; magi-core#579) over waiting on the
    Shisho-side trust-condition fix. SHA pinning (#118/#575) stays.
    Re-apply conditions unchanged: bot trust conditions must cover
    `dogmaai/magi-knowledge` + `dogmaai/magi-core`, and `monitor_mode`
    must be live manager-side first.

## 2026-10-04
* **trades.warn_only_layers measurement rule (magi-core#548)**: added a
  counterfactual aggregation note to
  [trades](system/echidna-tables/trades.md) — the exact measurement window
  is `timestamp >= TIMESTAMP '2026-10-03 10:40:42 UTC'` (magi-core#570
  deployed 10:01:02Z; Jun applied the DDL 10:35:13Z; column verified
  10:35:42Z, plus one 5-min `SCHEMA_CACHE_TTL_MS` against stale-schema
  drops). Pre-cutover rows are unmeasured and must be excluded from both
  numerator and denominator, not counted as "no hit"; the
  warn-only-enable→cutover gap stays a separate fuzzy (unit/symbol/date
  correlation) aggregate at degraded confidence via `WARN_ONLY` thoughts
  rows. Still `draft` — Jun re-verification pending.
* **trades.warn_only_layers denominator rule (magi-core#548)**: pinned the
  denominator in [trades](system/echidna-tables/trades.md) as directed by
  Jun — entry-path rows only (`thought_id IS NOT NULL AND result IS
  DISTINCT FROM 'AUTO_CLOSE'`; unidentifiable rows go to a reference
  aggregate), `CONTAMINATED` excluded from numerator and denominator
  (exclusion + hit counts kept as reference), and per-layer enablement
  windows evaluated at trade time (L2/L3 on `TYPHON`, `CASPER`,
  `PROMETHEUS`, `QWEN`, `ADAM`, `BOREAS` since magi-core#565 deploy
  2026-10-03T03:45:17Z; no retroactive or forward extension without a
  matching `deploy.yml` `*_WARN_ONLY` change). Canonical query lives at
  `sql/measure_warn_only_layers.sql` in magi-core. Still `draft` — Jun
  re-verification pending.

## 2026-10-03
* **trades.warn_only_layers (magi-core#548)**: new column
  `warn_only_layers` on [trades](system/echidna-tables/trades.md) records
  the opt-in warn-only guard ids that fired on the order (`L2`, `L3`,
  comma-joined in pipeline order; `NULL` = none). Written by
  `src/llm.js place_order` at insert time. WARN_ONLY guard thoughts carry
  no `thought_id`, so this column is the exact per-trade
  "would have been blocked" link for the 30-day counterfactual study.
  Implementation: magi-core#570, merged as
  `a66291ec4b0c2eae3e6dbeb4a66cfa09e178056c`;
  DDL `sql/alter_trades_add_warn_only_layers.sql` (Jun applies manually).
  [trades](system/echidna-tables/trades.md) was already `draft`, so only
  `generated.at` was re-stamped — Jun re-verification still pending.
* **Optuna job retired (magi-core, Jun-directed)**: the re-optimization
  pipeline is removed — `magi-optuna-job` Cloud Run job, the
  `magi-optuna-optimizer` scheduler, `Dockerfile.optuna`,
  `run_optuna.sh`, `requirements_optuna.txt`, `check_optuna_trigger.js`
  and `optuna_results.json`. The frozen `optuna_params` rows stay active
  via `lib/optuna.js`, and the custom optimizer sources (`optuna_*.py`,
  `report_optuna.py`, `test_optuna_utils.py`) are kept in-repo for
  reference/ad-hoc runs. Follow-up: Jun deletes the GCP job/scheduler/AR
  image; the AKA-1 `trigger_optuna` tool in magi-moni becomes dead and
  needs a separate magi-moni change. Updated
  [magi-core](system/services/magi-core.md) scheduler table.
* **Pipeline-order fix (drift correction)**: [index](system/guards/index.md)
  and [jev](system/guards/jev.md) placed L1.6.RECON between L1.6 (sellable
  quantity) and L2.6/L2.7, but the implementation
  (`magi-core/src/llm.js` `place_order`, magi-core#557) runs it immediately
  after the L0 kill switch — before JEV and before the shadow-mode short
  circuit (verified: L0 L533-571, L1.6.RECON L573-597, JEV L599-655, shadow
  short-circuit L658). Moved the table row and updated the prose to match
  the code: divergent state halts every unit including `TRADE_MODE=SHADOW`,
  and orders blocked by L1.6.RECON receive no JEV verdict and do not
  consume the linked analysis. Doc-side fix only; the code position is
  fail-closed by construction — the check sits before any shadow/broker
  effect and blocks whenever divergence is detected *or* the reconciler
  could not confirm consistency, so placing it earliest minimizes the
  window where a divergent ledger can drive orders. `jev.md` was edited
  while `stable`, so `status` reverted to `draft` and its `generated.at`
  was re-stamped — Jun re-verification needed: confirm the pipeline
  ordering claims against `magi-core/src/llm.js` (lines above) and the
  two added behavioral notes (SHADOW units also halted; RECON-blocked
  orders get no JEV verdict, analysis unconsumed).
* **Re-verification (Jun-approved 2026-10-03)**: the guard/schema docs
  recorded under the 2026-10-03 entries above are re-stamped `stable` with
  `verified: human:jun` — [l2](system/guards/l2.md),
  [l3](system/guards/l3.md),
  [trading-universe](system/constitution/trading-universe.md),
  [prohibitions](system/constitution/prohibitions.md) and
  [thoughts](system/echidna-tables/thoughts.md). Note this approves the
  docs as written (L2/L3 default `block` + dormant opt-in warn-only); it is
  NOT the demotion decision itself — `L2_WARN_ONLY`/`L3_WARN_ONLY`
  activation still requires Jun's explicit call.
* **Auto-review persona (magi-core#564 companion)**: `.github/workflows/auto-review.yml`
  Mistral step system prompt changed from the generic senior-engineer persona
  to a strict, neutral code reviewer — evidence required per finding, nits
  still reported at 低 severity, `## 良い点` section removed, `max_tokens`
  2000 → 4000. No concept-doc change: the persona text is an OKF-undefined
  implementation detail, and the COLLABORATION.md description of the bot
  (`COMMENT` review, sha marker, skip-if-exists) is unchanged.
* **Schema sync (magi-core#544)**: [thoughts](/system/echidna-tables/thoughts.md)
  schema table gained `model_version` (served-model id at decision time —
  cohort key per [model-cohorting](/system/constitution/model-cohorting.md))
  and the previously undocumented `feedback_injected` row. The doc was
  already `draft`; still pending Jun re-verification.
* **Guard warn-only opt-in (magi-core#548 / Issue #99 Fable item D)**:
  [L2](system/guards/l2.md) and [L3](system/guards/l3.md) gained an explicit
  opt-in warn-only mode — `L2_WARN_ONLY=true` / `L3_WARN_ONLY=true` let
  would-be-rejected orders proceed while journaling a `WARN_ONLY` thoughts
  row for counterfactual measurement. Default remains `on_fail: block`
  pending the per-layer demotion decision and independent review. Both
  docs flipped `stable` → `draft` pending Jun re-verification.
  [guards/index.md](system/guards/index.md) updated: L2/L3 rows now `warn`,
  new `L1.6.RECON` row records the opposite-direction promotion — the
  ledger↔broker reconciler (magi-core#547) blocks risk-increasing orders on
  divergence (`RECON_FAIL_CLOSED=false` reverts). Same-day follow-up (magi-core
  #558 review): the constitution prompt is now flag-driven —
  [trading-universe.md](system/constitution/trading-universe.md) documents both
  the default `BLOCKED (L3)` template and the `ADVISORY (L3)` variant rendered
  when `L3_WARN_ONLY=true`;
  [prohibitions.md](system/constitution/prohibitions.md) L2/L3 enforcement
  rows annotated as opt-in warn-only. Both flipped `stable` → `draft`. L4/L5/L7 spec rows still
  say `block` while implementation is warn-only — pre-existing drift from
  Issue #99, left visible pending a spec decision.
* **Sync (verification)**: [cloudflare](/system/services/cloudflare.md) §3 —
  Named Tunnel table now records the actual tunnel names and public
  hostnames verified against deploy config and DNS: `magi-bridge` →
  `bridge.khaos.company` (opend-proxy fallback leg), `magi-ollama` →
  `ollama.khaos.company` (ADAM + BOREAS), `magi-openclaw` →
  `openclaw.khaos.company`. The same naming was applied to the §Overview
  table, [magi-moomoo](/system/services/magi-moomoo.md) and the
  `cloudflare-tunnel-protocols` skill for consistency. Corrected two
  drifts: the `ollama` tunnel
  consumer list named only ADAM (BOREAS was added 2026-09-22), and the
  blanket claim that tunnel URLs are registered in `service_endpoints` —
  `magi-ollama` is not registered there; its URL reaches PLM jobs via the
  `OLLAMA_BASE_URL` secret in GCP Secret Manager (deployed value
  `https://ollama.khaos.company`, verified live: Ollama 0.35.0).
  Deployed `magi-moomoo` re-confirmed `BRIDGE_ROUTE_MODE=auto` with
  `BRIDGE_PRIVATE_URL=http://10.42.0.10:11436` (private WireGuard route
  preferred, Cloudflare tunnel fallback). The dead `CLOUDFLARE_API_TOKEN`
  found during this sync was rotated (see the 2026-10-02 entry); the
  rotated token then API-verified the tunnel names — `cfd_tunnel` lists
  `magi-bridge`/`magi-ollama`/`magi-openclaw` (all `healthy`) and the
  hostnames CNAME to `<id>.cfargotunnel.com`. The
  [secrets-inventory](/system/services/secrets-inventory.md) tunnel names
  were corrected to match (`stable` → `draft` pending Jun
  re-verification).

## 2026-10-02
* **Rotation (Jun-approved, Devin-executed)**: `CLOUDFLARE_API_TOKEN` in
  [secrets-inventory](/system/services/secrets-inventory.md) — the previous
  user-scoped token was deleted on Cloudflare's side (verify → Invalid API
  Token; found during the PR #107 tunnel-doc sync). New account-scoped token
  `magi-tunnel-devin-20261002` (Cloudflare Tunnel:Edit + DNS:Edit on
  khaos.company) minted via the Global API Key and stored as GCP Secret
  Manager `CLOUDFLARE_API_TOKEN` version 2. No injected copies exist outside
  Secret Manager.
* **Creation (draft)**: [model-cohorting](/system/constitution/model-cohorting.md)
  — cohort-reset rule: a model change makes a unit a statistically new
  entity; evaluation aggregates (ISABEL patterns, L4 probation, scorecards)
  key on `(unit_name, model_version)` and do not carry across the boundary.
  Depends on `thoughts.model_version` (magi-core#544); aggregation-key
  implementation is a separate phase (magi-core#545). Cross-referenced from
  [constitution/index](/system/constitution/index.md) and
  [plm-units/index](/system/plm-units/index.md).
* **Reclassification + freeze (Jun-approved)**: [guards/index](/system/guards/index.md) —
  layers now carry a `Class` column: `risk-control` (deterministic hard
  guards, never learned), `statistical-gate` (Optuna/probation/similarity
  driven — parameters frozen), plus bookkeeping `validator`/`pipeline`.
  Optuna re-optimization suspended: `magi-optuna-job` runs with
  `OPTUNA_FREEZE=true`, weekly `magi-optuna-optimizer` scheduler unmanaged
  (Jun pauses the existing one). Last `optuna_params` rows stay in effect.
  Per-layer demotion of blocking statistical gates to warn-only is a separate
  reviewed decision. Source: Issue #99 Fable review item D.
* **Status change**: [optuna_params](/system/echidna-tables/optuna-params.md) —
  `stable` → `draft` pending human re-verification after adding the
  writer-frozen note (`updated_at` no longer advances; expected, not stale).
* **Change**: [BOREAS](/system/plm-units/boreas.md) — model replaced
  `ministral-3:14b` → `ministral-3:8b-ctx32k` (Modelfile `num_ctx 32768`).
  The 14b Q4_K_M (~16.8 GB) exceeded TIALA's 16 GB RAM, thrashing at
  ~130 tok/s and timing out through the Cloudflare tunnel (HTTP 524).
  Approved by Jun on 2026-10-02; pairs with magi-core#536 (SSE streaming +
  ollama prompt budget). Cross-references synced in
  [plm-units/index](/system/plm-units/index.md), [SOPHIA-5](/system/plm-units/sophia-5.md),
  [TIARA](/system/plm-units/tiara.md) and [magi-core](/system/services/magi-core.md).
* **Schema sync**: [thoughts](/system/echidna-tables/thoughts.md) — documented
  the new `side` column (guard-block rows carry buy/sell direction;
  previously sent by `logGuardBlock` but silently dropped by
  `ignoreUnknownValues`). Column added via DDL per magi-core#535.
* **Enhancement**: [magi-moni](/system/services/magi-moni.md) — AKA-1's LLM
  consolidated to a single provider, Gemini `gemini-3.8-flash`
  (`GEMINI_MODEL`). The Sakana AI (`fugu`) caller was removed (the provider
  is in magi-core `DEPRECATED_PROVIDERS` since 2026-09-17) and the
  Ollama-on-TIALA fallback (`OLLAMA_BASE_URL` / `OLLAMA_MODEL=qwen3.5:9b`)
  was removed — `qwen3.5:9b` is no longer deployed on TIALA anyway (see
  2026-09-25). TIALA's Ollama service stays: it still serves the
  ADAM/BOREAS/TIARA PLM units via the `magi-ollama` tunnel. Also corrected
  the stale "Claude/Gemini" description of AKA-1 (the implementation ran
  Sakana/Ollama/Gemini, never Claude). Implementation: magi-moni
  `lib/llm.js` / `lib/config.js` / `deploy.yml`.

## 2026-10-01
* **Creation (draft)**: [position_guard_evals](/system/echidna-tables/position-guard-evals.md)
  — per-position evaluation ledger for `checkAndClosePositions()`, introduced
  by issue #99 (R1) after the P-1 finding that short positions were absent
  from `position_list_query` and blew past the -3.5% short stop undetected.

## 2026-09-27
* **Fix**: [hermes-observability](/system/services/hermes-observability.md)
  — the Git Sync repository (`rv5tbk`) now scopes `spec.github.path` to
  `grafana/git-sync/`; the dashboard source of truth moved to
  `magi-core/grafana/git-sync/hermes-intelligence.json` (magi-core#523).
  This separates Git Sync-managed resources from the `provision.mjs`
  manual-upsert dashboards in `grafana/`, clearing the
  `MissingFolderMetadata` and unmanaged-UID-conflict warnings on the
  provisioning page.

## 2026-09-26
* **Enhancement**: Documented the thought↔trade attribution-integrity contract
  in [thoughts](/system/echidna-tables/thoughts.md) and [trades](/system/echidna-tables/trades.md)
  — `thought_id` remains the join key, and `symbol` / `llm_provider` /
  `session_id` / `trade_mode` must agree (`IS NOT DISTINCT FROM`);
  inconsistent pairs are excluded and counted. Implemented in magi-core#516
  (post-merge review follow-up to #514; production measurement: 56 of 1025
  id-matched WIN/LOSE pairs had a symbol mismatch).

## 2026-09-25
* **Review fix (PR #93 follow-up, P2)**:
  [model-consolidation](/system/constitution/model-consolidation.md) v0.2 —
  scope clarified so the non-goal is specifically reviving the retired
  LILITH unit or reusing/loosening the `_lilith_safe/` boundary. Final
  consolidation candidates may include units improved by verified decision
  methods or by additional training whose method and learning-data
  boundary Jun separately approves (both left as open decisions).
* **Re-verification (Jun)**: [NORTH STAR](/system/constitution/north-star.md)
  returns to `status: stable` (`verified.by: human:jun` at
  2026-09-25T11:07:05Z). The v3.3 text — three objectives plus the
  [model-consolidation](/system/constitution/model-consolidation.md)
  reference — is confirmed to match the runtime prompt built by
  `lib/constitution.js`; the referenced model-consolidation doc itself stays
  `draft` (documentation-level proposal, not a runtime section).
* **Retirement**: the `magi-vix-oracle` Cloud Run job (`MODE=VIX_ONLY`, Ollama
  `qwen3.5:9b` — the "VIX担当のQwen") was retired. Its LLM analysis
  (`handleVixOnlyMode` / `callOracleOllama` in `magi-core/lib/vix.js`) was
  removed along with the deploy + `magi-vix-premarket` scheduler steps in
  `deploy.yml`. Replacement: deterministic, zero-LLM aggregation —
  `runVixAggregation()` (writes `magi_analytics_us.vix_comparison` with
  `unit_name='HERMES'`, `llm_provider='none'`) and `calculateSymbolVix()`
  (writes `symbol_vix`, `together_analysis` now NULL) run inside the
  `magi-isabel-cache` job in the same 08:00 ET weekday slot.
* **Enhancement**: [ORACLE](/system/plm-units/oracle.md) documents the retired
  VIX-specialist name reuse; [TIARA](/system/plm-units/tiara.md) and the
  [PLM unit registry](/system/plm-units/index.md) note that `qwen3.5:9b` is no
  longer deployed; the [magi-core service map](/system/services/magi-core.md)
  drops the `magi-vix-oracle` job row.
* **Teardown executed (Jun-approved)**: Cloud Run job `magi-vix-oracle` and
  Cloud Scheduler `magi-vix-premarket` deleted on 2026-09-25 (verified
  NOT_FOUND in asia-northeast1). The `vix_comparison` and `symbol_vix`
  tables are kept — they remain live writers/readers. TIALA's local Ollama
  `qwen3.5:9b` model removal is optional (only a `lib/config.js` fallback
  default references it).
* **Proposal (draft, awaiting Jun verification)**:
  [model-consolidation](/system/constitution/model-consolidation.md) records
  the preparation-phase objective — consolidate the ensemble's trade-decision
  core to 1-2 units selected by evidence under identical conditions. It is
  ensemble selection, not the retired item-4 distillation; the LILITH data
  boundary is unchanged and no unit is preselected.
  [NORTH STAR](/system/constitution/north-star.md) references the draft and
  drops to `status: draft` pending re-verification; the runtime prompt text
  (the three objectives) is unchanged.

## 2026-09-23
* **Teardown executed (Jun-approved)**: all retired GCP resources deleted —
  Sakana/SEKHMET jobs + schedulers (`magi-fugu-analyzer`, `magi-sekhmet-meta-verifier`,
  `magi-thought-quality-ranker`), the LILITH pair (`magi-core-lilith`,
  `magi-lilith-gate-monitor`), and the SOPHIA-5 remnants (`magi-core-job`,
  `magi-scheduler-mistral`). Seven retired `magi_core` tables dropped:
  `sekhmet_reviews`, `fugu_sequential_patterns`, `fugu_thought_quality_scores`,
  `thought_quality_rankings`, `lilith_hard_gate_events`,
  `lilith_confidence_gate_events`, `lilith_forecast_gate_events`. Live shadow
  tables (`trades_shadow`, `thoughts_shadow`, `lilith_training_examples`)
  preserved — `magi-shadow-evaluator` still writes them.
* **Update**: [lilith-hard-gate-events](/system/echidna-tables/lilith-hard-gate-events.md)
  demoted to `deprecated` (table dropped); deprecated notes on
  [sekhmet-reviews](/system/echidna-tables/sekhmet-reviews.md),
  [fugu-sequential-patterns](/system/echidna-tables/fugu-sequential-patterns.md)
  and [thought-quality-scores](/system/echidna-tables/thought-quality-scores.md)
  now record the drops. [lilith](/system/plm-units/lilith.md),
  [sophia-5](/system/plm-units/sophia-5.md) and
  [sekhmet-meta-verifier](/system/plm-units/sekhmet-meta-verifier.md) record
  the completed resource teardown.
* **Fix**: [magi-core](/system/services/magi-core.md) surge table — primary
  reaction corrected to `magi-core-qwen` (QWEN) and secondary to
  `magi-core-boreas` (BOREAS), matching `surge-detector.js`
  `PRIMARY_JOB`/`SECONDARY_JOB` (stale since the 2026-09-22 SOPHIA-5
  retirement); offline-job rows marked with the 2026-09-23 deletions.
* **Companion (magi-core)**: dead-code removal PRs #494–#505 — LILITH provider
  path (`src/lilith.js`, `runLilithSession`, dispatch), orphaned DDL,
  dangerous legacy eval scripts, dead re-exports/getters, `lib/grafana-ml.js`,
  retired-provider scratch test + doc, `GRAFANA_ML_TOKEN` alias.

## 2026-09-22
* **Update (draft)**: [CASPER](/system/plm-units/casper.md) promoted back to
  LIVE per Jun's decision — `TRADE_MODE=SHADOW` removed from
  `magi-core-deepseek` in `deploy.yml` (magi-core PR). `casper.md` demoted
  to `draft` pending Jun re-verification; [index](/system/plm-units/index.md)
  updated. MELCHIOR-1 remains in SHADOW. Jun subsequently confirmed the
  promotion content, so `casper.md` is back to `stable` (`verified:
  human:jun` 2026-09-22) — required by the okf-drift gate, which rejects
  deployed jobs mapping to non-stable unit docs. [guards/index](/system/guards/index.md)
  synced: CASPER removed from the `TRADE_MODE=SHADOW` enumeration, and the
  stale "(draft)" labels dropped now that jev.md is stable.
* **Verified**: [jev](/system/guards/jev.md), [l6](/system/guards/l6.md) and
  [zeroel](/system/plm-units/zeroel.md) re-verified by Jun and returned to
  `stable` (`verified: human:jun` 2026-09-22). `jev.md` also gained the
  `verified`/`stale_after` fields it was missing, and its banner now notes
  the merged implementation (#480, #485).
* **Creation (draft)**: [BOREAS](/system/plm-units/boreas.md) — proposed
  Ollama PLM unit running the Mistral-family `ministral-3:14b` locally on
  TIALA (weights on the external SSD at
  `/Volumes/Extention_SSD/ollama-models/`). Deploy wiring
  (`magi-core-boreas` + `magi-scheduler-boreas`, `TRADE_MODE=NORMAL`,
  `45 14,16,18,20 * * 1-5` UTC) prepared on magi-core branch
  `feat/boreas-ollama-unit`. Jun decided on 2026-09-22 to enter live NORMAL
  directly rather than SHADOW. Jun subsequently reviewed and confirmed the
  doc content, so `boreas.md` is `stable` (`verified: human:jun`
  2026-09-22) — required by the okf-drift gate, which rejects deployed jobs
  mapping to non-stable unit docs. Deploy remains Jun's.
* **Retirement**: [SOPHIA-5](/system/plm-units/sophia-5.md) moved to
  `unit_status: retired` — Jun decided on 2026-09-22 that the hosted-Mistral
  unit retires because the Mistral-family slot moves to local BOREAS.
  `mistral` joins `DEPRECATED_PROVIDERS` and `mistral_NORMAL` leaves
  `BASE_BUDGET_WEIGHTS`; provider/unit/model defaults move to
  `qwen`/`QWEN`/`qwen-plus`; surge detector repoints to
  `PRIMARY_JOB=magi-core-qwen` / `SECONDARY_JOB=magi-core-boreas`; `mistral`
  leaves `isabel/l4-batch.js`, `health-monitor.js`, `off-hours-chat.mjs` and
  `isabel-cache.mjs` rosters (all on magi-core branch
  `feat/retire-sophia-mistral`). `magi-core-job` +
  `magi-scheduler-mistral` leave `deploy.yml`; live GCP resource
  deletion remains Jun's. Jun subsequently reviewed and confirmed the
  retirement doc, so `sophia-5.md` is back to `stable` (`verified:
  human:jun` 2026-09-22).

## 2026-09-21
* **Update**: [ZEROEL](/system/plm-units/zeroel.md) and
  [magi-core](/system/services/magi-core.md) — xAI/Grok code fully removed
  from magi-core (provider dispatch, ZEROEL persona, provider/model/unit
  maps, `XAI_API_KEY` wiring, `isabel/l4-batch.js` provider list, and the
  `[HERMES:X_SEARCH]` social-sentiment path in `src/hermes.js`). `xai`
  stays in `DEPRECATED_PROVIDERS` as the guardrail; historical rows remain
  in `magi_core.x_social_sentiment`. HERMES per-symbol news is now
  Brave + Gemini only.
* **Docs**: [COLLABORATION.md](COLLABORATION.md) gained a *Devin operating
  boundaries* subsection under Ownership — Devin proposes with evidence but
  does not decide trading policy or activate modes; spec/code conflicts are
  reported to Jun with options; `verified: human:jun` entries record Jun's
  actual review act only; automated review findings are leads verified
  against code, not instructions; deploys/GCP ops stay Jun's; observation
  jobs must not write to trading paths.
* **Update (draft)**: [l6](/system/guards/l6.md) — standard-lane
  `EXTREME_FEAR`/`PANIC` BUY is now **hard-blocked** per
  [risk-rules](/_lilith_safe/constitution/risk-rules.md), resolving the
  warn-only divergence (Jun option A, `dogmaai/magi-core#484` merged).
  Short-cover BUYs stay allowed via `isIncreasingExposure`; lookup
  failure fails closed; `HIGH_FEAR` stays warn-only. `on_fail` flipped
  to `block`; `stable` → `draft` pending Jun re-verification.

## 2026-09-19
* **Clarification (draft)**: [JEV Decision Validator](/system/guards/jev.md)
  input contract — `analysis.confidence` preserves the raw LLM-reported
  value (pre-normalization) so `JEV_CONFIDENCE_INVALID` stays reachable.
  Adds `JEV_THOUGHT_ACTION_UNSUPPORTED` (block) for analysis actions
  outside {BUY, SELL, HOLD} and `JEV_ANALYSIS_BAD_TIMESTAMP` (block) for
  missing/invalid analysis timestamps. Follow-up fixes on
  `dogmaai/magi-core#480` (review feedback).
* **Fix**: Guard-block audit destination corrected — the `guard_blocks`
  table never existed; `logGuardBlock()` writes guard-block rows to
  `magi_core.thoughts` (`action='BLOCKED'|'WARN_ONLY'`,
  `concerns=<layer>`; no data/audit impact — historical blocks already
  live in `thoughts`). Fixed [guards index](/system/guards/index.md),
  [l6](/system/guards/l6.md), the
  [magi-core](/system/services/magi-core.md) writes list, and the
  [thoughts](/system/echidna-tables/thoughts.md) schema (documented
  `action`/`trade_mode` guard-block values and `concerns` layer-id
  usage). `l6` and `thoughts` flipped `stable` → `draft` per lifecycle —
  the prior `human:jun` verifications predated these generations —
  then **re-verified and restored to `stable` by Jun on 2026-09-21**.
  `stale_after` deadlines kept unchanged — unverified revisions do not
  extend the re-verification window.
* **Review notes (draft)**: [JEV Decision Validator](/system/guards/jev.md)
  gained a prioritized *Open items* section from the 2026-09-19
  shadow-phase implementation review (`magi-core` PR #480, deployed
  `JEV_MODE=shadow`; first verdicts expected 2026-09-21) — see the doc
  for the items.
* **2026-09-21 shadow results + decisions (draft)**: first JEV data —
  45 evaluations, 36 PASS / 9 `WARN_ONLY` / 0 errors / 0 enforce leaks.
  All 9 violations were exits (4× `JEV_THOUGHT_HOLD` drift detections,
  5× `JEV_THOUGHT_MISSING` incl. consumed-analysis re-orders).
  Decisions recorded in [jev](/system/guards/jev.md): risk-reducing
  orders are never JEV-blocked even in enforce (carve-out,
  `magi-core#485`); analysis consumption stays at broker-attempt
  (anti-double-fill); enforce remains unscheduled pending further
  shadow observation on the fixed build.
* **Correction (draft)**: [L6 Market Regime](/system/guards/l6.md) — the
  prior text attributed `WARN_ONLY` rows to `HIGH_FEAR`; per
  `magi-core/src/llm.js` the row is written for `EXTREME_FEAR`/`PANIC`
  (`HIGH_FEAR` is console-only). Also documented that the hard BUY→HOLD
  gate (`applyHardGate`) is wired only into the LILITH provider lane —
  standard providers have no hard VIX block, diverging from
  `risk-rules` (`EXTREME_FEAR` BUY system-blocked). **Jun decision
  2026-09-21: option A — tighten the standard lane to match the
  constitution** (`dogmaai/magi-core#484` adds the hard gate with a
  risk-reducing-cover exemption, fail-closed on lookup failure);
  `l6.md` wording to be re-aligned once the code lands.

## 2026-09-18
* **Creation (draft)**: [JEV Decision Validator](/system/guards/jev.md) —
  deterministic typed validator on the `place_order` path (`magi-core`
  Issue #479). Cross-checks the order against the session's linked
  `log_analysis` (symbol/action/confidence consistency, reasoning
  sufficiency, staleness) and emits `PASS`/`BLOCK`/`ESCALATE`. Not an LLM;
  `JEV_MODE=shadow` records WARN_ONLY guard-block rows without stopping
  orders — enforcement requires separate approval and independent review.
  Also registered in the [guard pipeline order](/system/guards/index.md)
  between L0 kill switch and the shadow short circuit.
* **Enhancement**: `scripts/ai_search_r2_sync.py` now lists the managed
  prefix once and uploads only objects whose ETag differs from the local
  file's MD5 — an unchanged sync costs one `ListObjects` instead of a
  `PutObject` per document (R2 Class A reduction; `--prune` unchanged).
* **Enhancement**: `scripts/r2_catalog_sync.py` scans `okf.system` and
  skips the Iceberg overwrite entirely when the built rows match the
  table modulo volatile columns (`synced_at`, `source_revision`) — no
  commit, no R2 writes; `--force` rewrites unconditionally. Column-set
  mismatches still trigger the write so schema evolution keeps working.
* **Docs**: [cloudflare](/system/services/cloudflare.md) and the
  `syncing-spec-to-r2-data-catalog` / `configuring-cloudflare-ai-search`
  runbooks updated for the change-detection behavior; `source_revision`
  now records the revision that last changed content.

## 2026-09-17
* **Deprecation**: Retired the SEKHMET stack with Jun's approval —
  [sekhmet](/system/plm-units/sekhmet.md) (no `fugu_sequential_patterns` row
  since 2026-09-01; graceful-skip masked failures) and
  [sekhmet-meta-verifier](/system/plm-units/sekhmet-meta-verifier.md) (first
  scheduled run exited non-zero, `sekhmet_reviews` still empty) are
  `deprecated`, as are their artifact docs
  [fugu-sequential-patterns](/system/echidna-tables/fugu-sequential-patterns.md)
  and [sekhmet-reviews](/system/echidna-tables/sekhmet-reviews.md). The LLM
  causal-analysis role is unassigned; generic pattern analysis stays with
  `magi-gemini-analyzer` and static classification with `magi-daphne-analyzer`.
  Infra teardown (jobs, schedulers, `lib/fugu.js`, deploy.yml, dead `sakana`
  personality in session.js) is pending. `magi-thought-quality-ranker` remains
  the only Sakana consumer, under retirement review.
* **Deprecation**: Sakana fully abolished per Jun's 2026-09-17 decision —
  `magi-thought-quality-ranker` retired as Sakana's last consumer and
  [thought-quality-scores](/system/echidna-tables/thought-quality-scores.md)
  deprecated (its documented table never existed; the ranker actually wrote
  `fugu_thought_quality_scores`, which has no consumer). magi-core removal
  PR: `dogmaai/magi-core#477`. Sakana has no active consumer in MAGI.
  Jun cancelled the Sakana account on 2026-09-17, so the `SAKANA_API_KEY`
  credential is now dead and any leftover scheduled job can only fail
  fast at the API call.
* **Policy**: Added [Automated PR review bots](/COLLABORATION.md#automated-pr-review-bots)
  to COLLABORATION.md — the `auto-review.yml` Mistral/template `COMMENT`
  reviews are reference-only, never approve, and never satisfy independent
  review; records Jun's 2026-09-17 approval to send PR diffs (including
  private `magi-core`) to the external Mistral API for this workflow only.
* **Service**: Recorded the GitHub Actions `MISTRAL_API_KEY` injected copies
  (six repos, GSM remains source of truth) in
  [secrets-inventory](/system/services/secrets-inventory.md); `magi-ui` and
  `lilith-training` deliberately excluded.
* **Lint**: `scripts/okf_lint.py` now detects stale verification — a
  `stable` doc whose every human `verified.at` predates `generated.at` is
  an ERROR (the verification covers an older revision), and the same
  condition on a `draft` doc is a WARN. Nine drafts currently warn, all
  awaiting `human:jun` re-verification.
* **Fix**: [echidna-tables index](/system/echidna-tables/index.md)
  corrected its [sekhmet-reviews](system/echidna-tables/sekhmet-reviews.md)
  entry — the index claimed "table not yet created" while the stable,
  Jun-verified doc records the table created in BigQuery on 2026-09-08;
  the index now matches the verified doc.
* **Sync**: [magi-moomoo](/system/services/magi-moomoo.md) updated to the
  hardened order-gate behaviour: legacy `source='magi-core'` trust now
  requires the explicit `GATE_ALLOW_LEGACY_SOURCE=true` opt-in, deploy
  fails closed without a trusted-caller allowlist, approval tokens are
  consumed atomically in a BigQuery transaction, and the on-prem bridge
  fails closed on REAL `/place_order` when `BRIDGE_AUTH_TOKEN` is unset.
  Remains `draft` pending `human:jun` re-verification.
* **Model change**: [order-approvals](/system/echidna-tables/order-approvals.md)
  moved `stable` → `draft` — atomic token consumption now requires a
  conditional `UPDATE` stamping `claim:<uuid>` on the `ISSUED` row (pure
  `INSERT ... WHERE NOT EXISTS` cannot serialize under BigQuery snapshot
  isolation, as concurrent appends do not conflict — Codex P1 on
  magi-moomoo#81). `USED` rows remain append-only; the `ISSUED` row is
  mutated once at consumption. Pending `human:jun` re-verification.
* **Fix**: `scripts/okf_lint.py` — `CROSS_UNIT_NAMES` synced with the PLM
  registry: added `adam`, `qwen`, `sekhmet` (a non-detector `_lilith_safe`
  doc naming them previously passed the linter — Codex P1 on #63).
* **Enhancement**: `scripts/check_unit_detector_sync.py` now also fails CI
  when `okf_lint.CROSS_UNIT_NAMES` drifts from the registry, closing the
  detector-vs-linter gap permanently.
* **Boundary fix**: the widened linter immediately caught a live leak —
  [echidna-priors](/_lilith_safe/distributions/echidna-priors.md) spelled
  the renamed unit's name in the ISABEL data-sufficiency scope note. The
  note now describes the pre-rename own-lineage label without naming it
  (the exact filter string stays in `lilith-training`'s code); moved to
  `draft` pending re-verification.
* **Trust metadata**: [cross-unit detector](/_lilith_safe/hallucination-patterns/cross-unit.md)
  moved `stable` → `draft` — the September unit_names additions were never
  human-verified while the June `verified` event predated them (Codex P1 on
  #63). Pending `human:jun` re-verification.
* **Fix**: [trades-unverifiable](/system/echidna-tables/trades-unverifiable.md)
  anti-join now uses the documented `order_id` key with `NOT EXISTS` (the
  previous `id`-based snippet referenced a column absent from the published
  [trades](/system/echidna-tables/trades.md) schema — Codex P2 on #63);
  moved to `draft` pending re-verification.
* **Fix**: [magi-moni](/system/services/magi-moni.md) now records the role
  absorbed from the deprecated central-dogma (ported tools, policy engine,
  OpenClaw/TIALA control — Codex P2 on #66); moved to `draft` pending
  re-verification.
* **Fix**: [hermes-observability](/system/services/hermes-observability.md)
  no longer equates an empty `hermes_collection_runs` ledger with a stopped
  job (missing/unwritable table produces the same state — check
  `[HERMES:RUN:BQ]` job logs first), and records the corrected degraded
  denominator `ceil((attempted - skipped)/2)` per magi-core#470 (Codex P2s
  on #70).
* **Fix**: [hermes-collection-runs](/system/echidna-tables/hermes-collection-runs.md)
  cites magi-core `9ae8a966b732da5a735ad8c1a5554777fa07c215` (+ #470)
  instead of the moving `feat/hermes-collection-runs` branch (Codex P1 on
  #70); status formula and provenance refreshed.
* **Fix**: [pre-trade-intelligence](/system/echidna-tables/pre-trade-intelligence.md)
  records the magi-core revision (`9ae8a96`) behind the live-schema
  correction and refreshes provenance timestamps (Codex P1/P2 on #71).
* **Fix**: [echidna-tables index](/system/echidna-tables/index.md) qualifies
  the blanket "schemas pulled live 2026-06-19" claim — post-June tables
  carry per-document provenance (Codex P2 on #70).
* **Correction**: the order_intents verification record now names the
  immutable magi-core merge commit `c5dc811976539e855a404d2bb16d98a55bf1ab48`
  alongside the (now-deletable) branch name (Codex P1 on #65).
* **Retirement**: [LILITH](/system/plm-units/lilith.md) moved to
  `unit_status: retired` — the canary (`magi-core-lilith`, `LILITH_AUTOTRADE=0`)
  was paused and `lilith-inference-svc` was decommissioned; `lilith` joined
  `DEPRECATED_PROVIDERS` in `magi-core/lib/config.js` / `optuna_utils.py`, and
  the `magi-core-lilith` + `magi-lilith-gate-monitor` jobs left `deploy.yml`.
  Moved `stable` → `draft` pending `human:jun` re-verification.
  Companion source revision: magi-core `82e9adf4ba7a6f0b77200365b185153b0e9503b9`
  (PR [dogmaai/magi-core#476](https://github.com/dogmaai/magi-core/pull/476)
  head — intended source change, not yet merged/deployed). Observed deployment
  state: scheduler paused, `LILITH_AUTOTRADE=0`, `lilith-inference-svc` absent;
  Cloud Run job/scheduler deletion remains pending Jun execution.
* **Retirement**: [lilith-training](/system/services/lilith-training.md) marked
  retired — the pipeline no longer feeds a deployed model; the
  `asia-southeast1` Cloud Run jobs are decommission candidates and
  `dogmaai/lilith-training` can be archived. `stable` → `draft`.
* **Fix**: [PLM unit registry](/system/plm-units/index.md) — LILITH moved to
  the deprecated-units table; the SEKHMET Meta Verifier entry corrected from
  "draft, code-merged but not deployed" to deployed weekly
  (`magi-sekhmet-meta-verifier`, per the Jun-verified unit doc, deployed
  2026-09-08); `DEPRECATED_PROVIDERS` list gained `lilith`; the LILITH
  relationship note re-tensed as historical.
* **Fix**: [magi-core](/system/services/magi-core.md) job table — removed the
  retired `magi-lilith-gate-monitor` row and re-scoped `magi-shadow-evaluator`
  to all `TRADE_MODE=SHADOW` units.
* **Constitution (Jun decision 2026-09-17)**: [NORTH STAR](system/constitution/north-star.md)
  item 4 removed — the "fine-tune LILITH into MAGI's production specialist"
  objective is deleted with the LILITH retirement, leaving three cardinal
  objectives. Doc kept `stable` / `verified: human:jun` (decision taken in
  review). Companion runtime change: `magi-core/lib/constitution.js` drops the
  rendered item 4 and bumps the constitution header to v3.9 — see
  [constitution index](system/constitution/index.md) Version 3.9.
* **Fix (review)**: [services index](system/services/index.md) — `lilith-training`
  moved from the active Services table to Retired; contamination note re-tensed
  as historical (Codex P2 on #75).
* **Fix (review)**: [lilith](system/plm-units/lilith.md) and
  [lilith-training](system/services/lilith-training.md) — restored required
  `verified` / `stale_after` lifecycle fields with their historical values
  (gemini-code-assist on #75); docs remain `draft` pending re-verification.

## 2026-09-16
* **Enhancement**: [magi-moomoo](/system/services/magi-moomoo.md) —
  documented the dual-route bridge path shipped in magi-moomoo#66 / PRs
  #76–#78: `BRIDGE_ROUTE_MODE` (`auto`/`private`/`legacy`),
  `BRIDGE_PRIVATE_URL`, the Cloud Run → Direct VPC Egress → `bridge-gw` VM →
  WireGuard → TIALA topology, `/route_status`, and the Cloudflare tunnel as
  the `auto` fallback leg. `status` moved to `draft` pending Jun
  re-verification.
* **Enhancement**: [cloudflare](/system/services/cloudflare.md) —
  `moomoo-bridge` Named Tunnel re-labelled as the fallback leg of the
  magi-moomoo dual-route path (retirement pending a private-route stability
  observation period); `status` moved to `draft`.
* **Creation**: [system-control](/system/echidna-tables/system-control.md) —
  the ECHIDNA table behind the L0 kill switch and the magi-moomoo order
  gate's HALTED/RUNNING/UNKNOWN read; schema live-verified via `bq show` on
  2026-09-16. `status: draft`, verified `devin/cli`.
* **Creation**: [hermes-observability](/system/services/hermes-observability.md) —
  the `magi-hermes-intelligence` Grafana Cloud dashboard spec: panel
  inventory, per-source freshness thresholds, the `hermes_collection_runs`
  up/down + success/failure + error-rate surface, Git Sync / `provision.mjs`
  provisioning and the CI verify workflow (magi-knowledge#51; implementation
  in magi-core `feat/hermes-collection-runs`).
* **Creation**: four ECHIDNA table docs that the dashboard and the HERMES
  pipeline read/write — [hermes-collection-runs](/system/echidna-tables/hermes-collection-runs.md)
  (new run ledger; table created and schema live-verified via `bq show`
  on 2026-09-16), [pre-trade-intelligence](/system/echidna-tables/pre-trade-intelligence.md),
  [moomoo-snapshots](/system/echidna-tables/moomoo-snapshots.md)
  and [focus-symbols](/system/echidna-tables/focus-symbols.md) — all three
  schemas live-verified against `bq show` on 2026-09-16 (`key_events` /
  `risk_factors` are STRING REPEATED, `raw_sources` is native JSON;
  `pre_trade_intelligence` is unpartitioned). All `status: draft`,
  verified `devin/local`, pending Jun re-verification.
* **Enhancement**: [magi-core](/system/services/magi-core.md) — Writes list
  extended with the five HERMES tables and a cross-link to the observability
  doc; frontmatter moved to `status: draft` (`generated`/`verified` by
  `devin/local`, prior `human:jun` verification retained in the list)
  pending Jun re-verification.
* **Correction**: removed a stray `<<<<<<< HEAD` merge marker committed
  into the 2026-09-13 section of this file.

## 2026-09-14
* **Creation**: [consulting-magi-north-star](/.agents/skills/consulting-magi-north-star/SKILL.md)
  adds a reusable, value-free OKF-first workflow for GPT/Codex, Devin and
  Antigravity. It resolves each target repository's committed
  `magi-knowledge` pin, reads the pinned `AGENTS.md` / `COLLABORATION.md` and
  relevant safety boundaries, records exact revisions and lifecycle state,
  and stops on inaccessible or contradictory authority instead of guessing.
  Initial review baseline: `magi-core` pin
  `8533a4b379fdabb27a704ab8982406d6db2e6428`; `magi-knowledge` main
  `df6de9b57c0ff1cfb84d77c4df9e7c2d7a96e297`. This workflow does not grant
  production-operation authority and does not alter trading or LILITH data
  paths.


## 2026-09-13
* **Enhancement**: [PROMPT.md](/PROMPT.md) gains a value-free **Consumer
  Preamble** (6 lines) at the top — the only text that has to be pasted into
  the system prompt of an LLM that cannot read this repo (GPT / Gemini /
  Antigravity chat). Spec values live only in OKF; the preamble tells the
  consumer where the authority is and how to read `status` / `trust_tier`,
  so it never needs rewriting when the spec changes. Full version retained.
* **Correction**: [cross-unit detector](/_lilith_safe/hallucination-patterns/cross-unit.md)
  list extended 9 → 14 names — added `typhon`, `prometheus`, `adam`, `qwen`,
  `sekhmet` so the LILITH clean-source guard covers the current
  [PLM unit registry](/system/plm-units/index.md) (R19). Legacy names retained
  for historical references. Verified against `system/plm-units/index.md`.
* **Creation**: `scripts/check_unit_detector_sync.py` — CI gate (okf-conformance)
  that fails when a registry unit stem is missing from the detector list.
* **Creation**: [order-intents](/system/echidna-tables/order-intents.md) —
  append-only order-intent journal (R10 phase 1): PENDING-before-POST contract,
  `UNKNOWN`/`LOST`/`RECONCILED` lifecycle, remark-embedded `intent_id` as the
  broker-side durable key, ORPHAN FILL alerting, and the fail-closed /
  reduce-only journal-write policy. Verified against `magi-core`
  `fix/r10-order-intents` (merged as `c5dc811976539e855a404d2bb16d98a55bf1ab48`;
  `lib/order-intents.js`, `lib/moomoo.js`,
  `trade-evaluator.mjs`) and the live `magi_core.order_intents` schema.
* **Enhancement**: [magi-moomoo](/system/services/magi-moomoo.md) order-gate
  step 4 updated — the trusted-caller exemption is granted by OIDC subject
  verification (Google-signed ID token `email` claim allowlisted via
  `GATE_TRUSTED_CALLER_EMAILS`), replacing the spoofable `source='magi-core'`
  request-body label. Platform-forwarded tokens (`X-Serverless-Authorization`)
  arrive unsigned and are validated by claims (`iss`/`aud`/`exp`/
  `email_verified`) since Cloud Run already verified the signature; the label
  is retained as a transition-mode fallback until the per-service service
  account is configured.
* **Enhancement**: [magi-moomoo](/system/services/magi-moomoo.md) now documents the
  `POST /trade/place_order` server-side order gate (L0 three-state kill switch,
  reduce-only detection, `qty ≤ 1000`, `source='magi-core'` trusted-caller label,
  single-use `order_approvals` tokens, no POST retry) and the correct
  `service_endpoints` keys (`magi-moomoo` for callers, `opend-proxy` for the
  bridge tunnel).
* **Correction**: [trades](/system/echidna-tables/trades.md) vocabulary updated to
  match implementation — `result` gains `HOLD`, `AUTO_CLOSE`, `CANCELLED` and
  `CONTAMINATED`; `trade_mode` corrected to `NORMAL`/`VIX_ONLY`/`SHADOW`/
  `POSITION_GUARD`; `price_confirmed`, `exit_timestamp`, `requested_qty` and
  unrealized-vs-realized `pnl_*` semantics documented. Verified against
  `magi-core@92c8b4b` (main after R03/R04 merges) plus live
  `magi_core.trades` GROUP BY counts; order-gate behavior verified against
  `magi-moomoo` `lib/order-gate.mjs` (deployed PR #71) and magi-moni
  `lib/order-approvals.js` (deployed PR #50).
* **Creation**: [order-approvals](/system/echidna-tables/order-approvals.md),
  [trades-quarantine](/system/echidna-tables/trades-quarantine.md) and
  [trades-price-corrections](/system/echidna-tables/trades-price-corrections.md)
  table docs.
* **Deprecation**: [central-dogma](/system/services/central-dogma.md) marked
  `status: deprecated`. The `dogmaai/central-dogma` repository was archived on
  GitHub on 2026-07-14, is not deployed on Cloud Run or Cloud Scheduler, and
  magi-core carries no references to it. Its role was absorbed by
  [magi-moni](/system/services/magi-moni.md): the AKA-1 Telegram bot hosts the
  ported tools (`unblock_l4`, `trigger_job`, `trigger_optuna`,
  `query_thoughts`) and policy engine, and the former central-dogma REST
  client for TIALA operations was replaced by OpenClaw Gateway tool
  invocations (magi-moni `lib/tiala.js`, `lib/openclaw.js`). The services index
  moves the entry to a Retired section, and the bundle root drops ARIEL from
  the list of operating agents.

## 2026-09-09
* **Clarification**: [AGENTS.md](AGENTS.md) now makes human-verified `stable`
  OKF concepts authoritative for role, ownership, lifecycle and policy intent.
  Historical code paths, comments, names or disabled jobs cannot revive an
  offline/retired unit; conflicts are implementation drift to report with both
  revisions, not a basis for guessing live-trading participation.

* **Enhancement / PR pending**: [COLLABORATION.md](COLLABORATION.md) defines a
  cross-agent consultation protocol for GPT/Codex, Devin and Antigravity. Until
  a repo-independent responder exists, `dogmaai/magi-core` Issues are the
  operational meeting hub: explicit `To:` routing, one implementation owner,
  `Status: AGREED` / `Status: NEEDS_JUN_DECISION`, and stop-on-agreement
  semantics. The linked `magi-core` change adds the `Agent consultation` Issue
  template, explicit Jun-safe `To: Antigravity` routing, bounded Issue/comment
  context, and routing tests. `To: GPT` / `To: Devin` are protocol destinations
  for active sessions; asynchronous GitHub-triggered startup of those agents is
  not claimed or implemented by this change.

## 2026-09-08
* **Deployment**: SEKHMET Meta Verifier was activated as a weekly SHADOW-only
  Cloud Run Job and Scheduler by `magi-core` #430
  (`71722acce9b86b0d965ae368f1c204399b65ea12`). Deploy run `34208044793`
  succeeded. Jun created and visually verified the US-region
  `magi_core.sekhmet_reviews` table. The first successful review row and the
  four-week cost/value evaluation remain open in `magi-core` #429.

* **Draft / code merged, not deployed**: [SEKHMET Meta Verifier](/system/plm-units/sekhmet-meta-verifier.md) documents the cost-bounded SHADOW hard-case reviewer merged in `magi-core` PR #428 (`6f53dadfe9260cd195b6481574bc768c722afa96`). It selects at most 12 high-value evaluated outcomes, permits `ABSTAIN` / `NO_ACTIONABLE_FINDING`, and writes only to the proposed [sekhmet_reviews](/system/echidna-tables/sekhmet-reviews.md) audit table. No BigQuery DDL, Cloud Run job, Scheduler, order, guard, prompt, or LILITH path is active yet.

* **Creation**: [secrets-inventory](/system/services/secrets-inventory.md) — single
  ledger of every Grafana Cloud / Cloudflare / GitHub / GCP token referenced across
  magi-core, magi-knowledge, magi-moomoo and magi-moni (canonical env var, auth
  scheme, endpoint, scopes, source of truth, usage sites, rotation owner). States
  the rule that GCP Secret Manager `screen-share-459802` is the only source of
  truth and that injected env-var copies can go stale (the `operate-tiala` 401
  case). Marks `SIGIL_AUTH_TOKEN` as a deprecated OTLP fallback and
  `GRAFANA_ML_TOKEN` as a legacy alias of `GRAFANA_ML_API_TOKEN`; lists Tier 1
  (no re-issue) and Tier 2 (token re-issue, human approval) follow-ups. Linked
  from the services index Infrastructure section.

* **Enhancement**: [NORTH STAR](/system/constitution/north-star.md) now makes MAGI's
  long-term learning objective explicit: validated multi-LLM trading reasoning
  and realized outcomes are to become reproducible learning assets that
  progressively fine-tune LILITH into MAGI's production securities-trading
  specialist model. The text preserves the existing priority order and states
  that model training serves profit, not the reverse. It also distinguishes the
  architectural objective from current implementation: the documented
  `lilith-training` pipeline still uses synthetic prompt blocks +
  anti-hallucination DPO, and any future cross-PLM reasoning ingestion must obey
  the LILITH contamination boundary.

## 2026-09-07
* **Enhancement**: [COLLABORATION.md](COLLABORATION.md) documents how GPT/Codex
  reach GitHub (the `ChatGPT Codex Connector` App installation on the `dogmaai`
  User account) and the check for `403 Resource not accessible by integration`
  on writes: the repository must be in the installation's *Repository access*.
  Root cause of the failing `create_issue` on this repository was the missing
  repository in that installation; verified with #50 after adding it.

* **Enhancement**: Bundle moves to **OKF v0.2** and adopts the trust/lifecycle
  family as *required* frontmatter (`status`, `generated`, `verified`,
  `stale_after`) on every `system/` and `_lilith_safe/` concept, so consumers
  can tell canonical, human-reviewed knowledge from an AI draft. See
  [index.md — Knowledge authority](/index.md#knowledge-authority-trust--lifecycle).
  Initial values were derived from git history (`generated` = last content
  commit author/date, `verified` = `human:jun` at the merge to `main`,
  `stale_after` = verified + 180 days). PLM unit lifecycles moved from `status`
  to `unit_status`. `okf_lint.py` now enforces the family, forbids links to
  `deprecated` concepts, and gains `--fail-on-stale` (weekly `okf-freshness.yml`).
  `okf_common.py` parses inline flow mappings; the R2 Data Catalog and AI Search
  mirrors carry `status` / `trust_tier` / `verified_at` / `stale_after`.

* **Decision**: [POSITION MANAGEMENT](/system/constitution/position-management.md)
  max concurrent positions set to **5 symbols** (was 8), aligning the Constitution
  with [L1.5](/system/guards/l1-5.md). Decided by Jun. Implementation
  (`magi-core/src/llm.js` `MAX_CONCURRENT_POSITIONS` default, `lib/constitution.js`
  text) still says 8 and must follow in a reviewed magi-core PR; `okf-drift` will
  flag the mismatch once the submodule pin is advanced.

* **Enhancement**: [magi-core](/system/services/magi-core.md) now documents the
  daily `magi-evaluator` schedule and the remaining operational Cloud Run jobs
  and Cloud Scheduler wrappers from `magi-core/.github/workflows/deploy.yml`.

* **Creation**: [AGENTS.md](AGENTS.md) and [COLLABORATION.md](COLLABORATION.md)
  add a common development entry point for GPT/Codex, Devin and Antigravity,
  with one implementation owner, scoped independent review and a handoff format.
  Existing per-repo deployment rules remain in force. Machine-readable spec
  extraction and CI drift-check expansion remain follow-up work after inspecting
  the existing magi-core check.

## 2026-09-06
* **Enhancement**: [magi-core](/system/services/magi-core.md) HERMES section
  gains a "Why Brave Search" decision record (cost — now on a paid tier —,
  `freshness=pd` REST fit, division of labour vs Google Search Grounding) and
  states that xAI `[HERMES:X_SEARCH]` is not in use (dropped for cost).
  [ZEROEL](/system/plm-units/zeroel.md) updated to match.
* **Enhancement**: [magi-core](/system/services/magi-core.md) HERMES decision
  record gains a TIP on why per-symbol news uses Brave rather than Gemini
  Google Search Grounding (unit cost, freshness/result-set control, separation
  of search and scoring); Grounding stays for the macro report.

## 2026-09-04
* **Enhancement**: [magi-core](/system/services/magi-core.md) gains a
  "Surge detector" section: `magi-surge-detector` polls MooMoo batch snapshots
  only (no LLM / search API), gates on fresh RTH `change_pct` vs
  `SURGE_THRESHOLD` / `CRASH_THRESHOLD`, guards re-triggers via Cloud Run
  execution history, and fires `magi-core-job` ([SOPHIA-5](/system/plm-units/sophia-5.md))
  then `magi-core-deepseek` ([CASPER](/system/plm-units/casper.md)) on 2+
  simultaneous surges. Cross-linked from SOPHIA-5, CASPER and
  [magi-moomoo](/system/services/magi-moomoo.md).
* **Enhancement**: [magi-core](/system/services/magi-core.md) gains a
  "HERMES intelligence stack" section documenting where the Brave Search API is
  consumed across the trade lifecycle: pre-trade only, by Gemini
  (`HERMES_GEMINI_MODEL`) in `[HERMES:BRAVE]` via the hourly `magi-hermes-refresh`
  job (fallback: [MELCHIOR-1](/system/plm-units/melchior-1.md) in-session), read by
  all PLM units through `buildHermesPrompt()`; not used in-trade or post-trade.
* **Enhancement**: `.agents/skills/` is now the home for cross-cutting Devin
  reference skills that are not tied to one repo's code. Moved in from
  `magi-core`: [devin-cli](/.agents/skills/devin-cli/SKILL.md),
  [gemini-api-reference](/.agents/skills/gemini-api-reference/SKILL.md),
  [kimi-api-reference](/.agents/skills/kimi-api-reference/SKILL.md); from
  `magi-moomoo`:
  [cloudflare-tunnel-protocols](/.agents/skills/cloudflare-tunnel-protocols/SKILL.md),
  [moomoo-api-reference](/.agents/skills/moomoo-api-reference/SKILL.md). All
  carry `type: Reference` / `lilith_safe: false`. Repo-bound skills
  (`testing-*`, `operate-tiala`, `opend-manual`) stay co-located with their
  code; `magi-moomoo`'s `cloudflare-api-reference` (abuse-reports endpoints
  only) is dropped in favour of `consulting-cloudflare-docs`.

## 2026-09-03
* **Creation**: [cloudflare](/system/services/cloudflare.md) — documents MAGI's
  four Cloudflare uses: the `magi-document` AI Search mirror and the
  `okf.system` R2 Data Catalog (Iceberg) mirror of this spec on the
  `magi-system` bucket, the Named Tunnels exposing `moomoo-bridge`, `ollama`
  and `openclaw-gateway` on TIALA, and the `default` AI Gateway behind AI
  Search. Runbooks stay in `.agents/skills/` and are referenced, not copied.
* **Enhancement**: [service map](/system/services/index.md) gains an
  Infrastructure section linking to `cloudflare`.
* **Enhancement**: `dogmaai/magi-stg` is now formally treated as archived and
  this bundle is declared the single source of truth in [index.md](/index.md).
  On the `magi-stg` side, `AGENTS.md` was added and archive banners pointing to
  this bundle were placed at the top of `specifications/README.md`,
  `docs/README.md`, `docs/00_SYSTEM_SPEC_LATEST.md`, and `MEMORY.md`, replacing
  the former "this directory is the single source of truth" wording.

## 2026-08-31
* **Creation**: [magi-deep-research](/system/services/magi-deep-research.md) — documents the
  current weekday daily Deep Research brief flow as a Devin Automation writing
  `DAILY_DEEP_RESEARCH` rows into `magi_core.market_research` via
  `magi-core/scripts/upload-deep-research.mjs`.
* **Enhancement**: [market_research](/system/echidna-tables/market-research.md) now lists
  `DAILY_DEEP_RESEARCH` as a `research_type` value and cites the new upload script.
* **Enhancement**: [service map](/system/services/index.md) now links to `magi-deep-research`.

## 2026-08-27
* **Enhancement**: Realigned the [PLM unit registry](/system/plm-units/index.md) with
  `magi-core`: ZEROEL is retired for cost, PROMETHEUS is live with
  `gpt-5.6-luna`, QWEN and ADAM are split out of the former dual-slot/TIARA
  rows, LILITH is narrowed to the fine-tuned `lilith` provider plus its canary
  job, ORACLE's name reuse for the VIX specialist is documented, and the
  SOPHIA-5, MELCHIOR-1, and TIARA model details are refreshed.
* **Creation**: Added [ADAM](/system/plm-units/adam.md) and
  [QWEN](/system/plm-units/qwen.md), and documented the
  [ORACLE VIX specialist](/system/plm-units/oracle.md).
* **Creation**: Added the L0 emergency kill switch, L0.5 cash-account guard,
  L0.9 HOLD/zero-quantity guard, L1.6 sellable-quantity guard, and L1.7
  daily-loss kill switch under [system/guards](/system/guards/index.md).
* **Enhancement**: Rewrote the [guard pipeline index](/system/guards/index.md)
  in actual execution order, including the shadow-mode short circuit and the
  new `magi_core.system_control` and per-unit realized-P&L backing data.
* **Fix**: The AI Search instance `magi-document` was embedding the R2 Data
  Catalog's Iceberg metadata under `__r2_data_catalog/` — `magi-system` holds
  both surfaces. `source_params.exclude_items` now carries
  `__r2_data_catalog/**`; the following sync job saw 65 files, all under
  `okf/system/`.
* **Enhancement**: [configuring-cloudflare-ai-search](/.agents/skills/configuring-cloudflare-ai-search/SKILL.md) —
  recorded that a `PUT` replaces `source_params` wholesale, the equivalent
  `ai-search/instances/...` routes, the S3-vs-catalog credential split for the
  push side, and how to attribute AI Gateway traffic: AI Search's own
  embedding/answer calls run through the `default` gateway (identifiable by the
  log `metadata`), while `magi-llm` carries the PLM units' provider traffic.
  Cross-referenced from
  [syncing-spec-to-r2-data-catalog](/.agents/skills/syncing-spec-to-r2-data-catalog/SKILL.md).
* **Enhancement**: Brought `system/constitution/position-management.md`,
  `system/guards/l2.md`, and the [PLM unit registry](/system/plm-units/)
  in line with the Antigravity-agreed changes in `magi-core` #387, #388, #389:
  confidence-band sizing (0.80–0.89 `0.5x`, 0.90+ `1.2x`), short-entry sizing
  `0.7x`, short stop-loss tightened to `-3.5%`, concerns soft penalty `-0.15`,
  QWEN/TYPHON 1.5x budget-weight multiplier, and CASPER/MELCHIOR-1
  `TRADE_MODE=SHADOW`.
* **Deprecation**: Disabled the Devin Automation “MAGI GE spec 同期
  (magi-knowledge main → Gemini Enterprise)” because the GeminiEnterprise App
  subscription was cancelled. Cloudflare R2 / AI Search sync workflows remain
  active.

## 2026-08-24
* **Creation**: [AKA memory](system/services/aka-memory.md) — documents the
  confirmed host-local launchd backup from `~/clawd/MEMORY.md` +
  `~/clawd/memory/*.md` to `gs://screen-share-459802-memory` daily at 21:00 JST /
  12:00 UTC, as specified by the plist; it is not a Cloud Scheduler job.
  `MEMORY.md`'s own "21:00 UTC (06:00 JST)" claim is incorrect.

## 2026-08-23
* **Creation**: [syncing-spec-to-gemini-enterprise](/.agents/skills/syncing-spec-to-gemini-enterprise/SKILL.md) — the procedure for publishing the `system/` digest to a Discovery Engine (Gemini Enterprise / Vertex AI Search) data store: GCS object with a stable name, `documents:import` with `dataSchema: content` + `reconciliationMode: FULL`, attach to the Gemini Enterprise app, and the boundary rules (`_lilith_safe/` never indexed, PLM jobs stay off Gemini Enterprise per MAGI-GE-DESIGN-001-v2 §2.3).
* **Creation**: [scripts/okf_export.py](/scripts/okf_export.py) — flattens one tree (`system/` or `_lilith_safe/`) into a single Markdown digest for syncing the common spec to LLMs without repository access. Exactly one tree per run, and a `lilith_safe` flag that disagrees with its tree aborts the export, so a digest can never straddle the contamination boundary. Documented under `Consuming the bundle` in the [README](/README.md).

## 2026-08-22
* **Enhancement**: Added rule 4 to [collaborating-with-antigravity](/.agents/skills/collaborating-with-antigravity/SKILL.md) — an exchange with Antigravity ends the moment the agents agree; no acknowledgement-only replies, no re-confirming an agreed spec (prevents infinite agent-to-agent loops).
* **Creation**: [collaborating-with-antigravity](/.agents/skills/collaborating-with-antigravity/SKILL.md) — the Antigravity × Devin collaboration workflow (GitHub Issues/PRs as the shared hub, role split, PR description structure, review feedback loop, escalation to @dogmaai).

## 2026-08-19
* **Creation**: [SEKHMET](/system/plm-units/sekhmet.md) — offline sequential/causal analyzer (Sakana `fugu-ultra`, `magi-fugu-analyzer`), plus the [fugu-sequential-patterns](/system/echidna-tables/fugu-sequential-patterns.md) and [daphne-feedback](/system/echidna-tables/daphne-feedback.md) table docs.
* **Enhancement**: Added a `Causal analysis ownership` section to the [PLM unit registry](/system/plm-units/index.md) — SEKHMET owns causal analysis, MELCHIOR-1/Gemini owns generic logical & quantitative pattern analysis, DAPHNE does SQL-based static causal classification. Cross-referenced from [MELCHIOR-1](/system/plm-units/melchior-1.md) and [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md).
* **Enhancement**: Catalogued the offline analysis jobs (Cloud Run + Cloud Scheduler names, schedules, models) in [magi-core](/system/services/magi-core.md), cross-checked against `magi-core/.github/workflows/deploy.yml`.

## 2026-06-23
* **Creation**: PLM Runtime Constitution v3.0 under [system/constitution](/system/constitution/) — 14 modular per-section docs mirroring `buildSwingConstitution()` in `magi-core/lib/constitution.js`. Each section is independently editable for easy iteration as the constitution evolves.
* **Enhancement**: Added `# Constitution basis` cross-references to guard layer docs (L0, L1.5, L2, L3, L5, L6) linking each guard to the constitutional section it enforces.
* **Enhancement**: Added OKF reference section to [constitution BQ table doc](/system/echidna-tables/constitution.md) linking to both the PLM and LILITH-safe constitution trees.

## 2026-06-19
* **Initialization**: Created the OKF v0.1 bundle skeleton — root [index](/index.md), `_lilith_safe/` and `system/` trees, and the conformance + LILITH-boundary tooling under `scripts/`.
* **Creation**: ECHIDNA BigQuery data catalog under [system/echidna-tables](/system/echidna-tables/), schemas pulled live from `magi_core.INFORMATION_SCHEMA`.
* **Creation**: LILITH-safe ground truth — prompt-block [schemas](/_lilith_safe/schemas/), the six [hallucination patterns](/_lilith_safe/hallucination-patterns/), and the [constitution](/_lilith_safe/constitution/) clean-source rule.
