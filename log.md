# Bundle Update Log

## 2026-10-07
* **SA key cleanup (devin-bq-admin)**: all 5 user-managed keys on
  `devin-bq-admin@screen-share-459802.iam.gserviceaccount.com`
  (`27830b59`, `3c584ee5`, `5928b1d3`, `73029fb8`, `ed2cd589`) **deleted**
  after the audit found no key JSON for this SA in any Devin-reachable
  store — the Devin org secrets hold only `GCP_SERVICE_ACCOUNT_KEY` (SA
  `github-actions@`, key `1f618b92…`), a full GSM scan found SA JSONs only
  for the now-deleted `grafana-bigquery` SA, and repo / CI-secret / MCP
  checks found none. Key lineage was reconstructed from Admin Activity
  audit logs: 9 `CreateServiceAccountKey` events between 2026-04-27 and
  2026-07-14 minus 4 previously deleted keys = the 5. Four of the five
  post-dated the last observed real API use (2026-04-27) and were most
  likely never used. Jun granted `github-actions@`
  `roles/iam.serviceAccountKeyAdmin` **on this SA only** for the deletion;
  the post-delete `keys list` shows only the 2 Google-managed keys
  (`748216a7`, `b137f00b`, expiring 2027-04-27, not deletable). The SA
  itself and its project roles (`owner`, `editor`, `bigquery.admin`,
  `discoveryengine.*`) are unchanged. Revoking the temporary KeyAdmin
  binding is left to Jun; recorded in
  [secrets-inventory](system/services/secrets-inventory.md).
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