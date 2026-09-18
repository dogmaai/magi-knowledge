# Bundle Update Log

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