---
type: Service
title: Secrets inventory (Grafana Cloud, Cloudflare, GitHub, GCP tokens)
description: Single ledger of the infrastructure tokens (Grafana Cloud, Cloudflare, GitHub, GCP) referenced across the MAGI repositories — canonical env var name, auth scheme, target endpoint, required scopes, source of truth, usage sites and rotation owner. GCP Secret Manager is the only source of truth; injected env-var copies can go stale.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-22T09:30:00Z }
verified: [{ by: human:jun, at: 2026-09-17T17:23:06Z }, { by: devin/local, at: 2026-10-02T16:00:00Z }, { by: devin/cli, at: 2026-10-06T04:30:00Z }, { by: human:jun, at: 2026-10-06T05:36:00Z }, { by: devin/cloud, at: 2026-10-07T06:25:37Z }, { by: human:jun, at: 2026-10-20T10:11:00Z }]
stale_after: 2027-04-18T10:11:00Z
tags: [service, secrets, grafana, cloudflare, github, gcp, security]
repo: infra (GCP project screen-share-459802, Cloudflare account c3b51b9f35d16713caab757feca638d8, Grafana stack aka / tenant 1557976)
---

# Overview

Infrastructure tokens used by MAGI — Grafana Cloud, Cloudflare, GitHub and GCP
— are scattered across `dogmaai/magi-core`, `dogmaai/magi-knowledge`,
`dogmaai/magi-moomoo` and `dogmaai/magi-moni`, plus the Devin org secret store
and the GitHub Actions secret stores of each repo. This document is the one
ledger for that group. It records the *canonical* env var name per token;
legacy aliases are listed in the notes column and are scheduled for removal.

Out of scope here: LLM / data-provider API keys (`GEMINI_API_KEY`,
`BRAVE_SEARCH_API_KEY`, `MISTRAL_API_KEY`, …), broker credentials (Alpaca,
MooMoo) and Telegram. Those live in Secret Manager under the names listed in
[magi-core](magi-core.md) and follow the same source-of-truth rule; a second
ledger can be added when they are audited.

One injected copy is recorded here because it has its own usage site:
`MISTRAL_API_KEY` is also stored as a GitHub Actions secret in
`magi-knowledge`, `magi-moni`, `magi-moomoo`, `magi-price-tracker`
and `magi-core` (added 2026-09-17), where
`.github/workflows/auto-review.yml` uses it to send PR diffs to the Mistral
API (`mistral-large-latest`) for automated review comments — see
[COLLABORATION.md](../../COLLABORATION.md#automated-pr-review-bots). The GSM
secret remains the source of truth; the repo secrets are injected copies that
can go stale on rotation. Rotation owner: jun. `lilith-training`
never held one either (repo deleted 2026-10-07). `magi-ui` never held one and
`magi-deep-research`'s injected copy was deleted with the repository on
2026-10-07.

`ANTHROPIC_API_KEY` is likewise stored as a GitHub Actions secret in
`magi-core` (added 2026-10-21, Jun), where
`.github/workflows/claude-review.yml` uses it for Claude PR review comments
via `anthropics/claude-code-action` — see
[COLLABORATION.md](../../COLLABORATION.md#claude-pr-review-magi-core).
Source of truth: `SM` secret **`ANTHROPIC_API_KEY_PR_REVIEW`** (version 1,
registered 2026-10-21 by jun). The names differ on purpose: the `SM` name
`ANTHROPIC_API_KEY` was already taken by the legacy secret below, while
`claude-code-action` reads the GitHub secret as `ANTHROPIC_API_KEY`. The
GitHub secret is an injected copy set with
`gcloud secrets versions access latest --secret=ANTHROPIC_API_KEY_PR_REVIEW |
gh secret set ANTHROPIC_API_KEY -R dogmaai/magi-core`. Rotation owner: jun.
The workflow skips the review with a notice when the secret is absent.
A separate, older `SM` secret named `ANTHROPIC_API_KEY` (created
2025-09-19, versions 1–5, latest 2025-11-26) also exists; it has no
reference in `magi-core` main or this bundle and its consumer is
unrecorded — it was deliberately left untouched and is **not** the PR-review
key.

# Source-of-truth rule

**GCP Secret Manager (project `screen-share-459802`) is the only source of
truth for a token value.** Every other place a token appears — a Devin org
secret, a GitHub Actions secret, a Cloud Run `--set-secrets` binding, a shell
`export` on TIALA — is an *injected copy* and can go stale after rotation.

This is not theoretical: `dogmaai/magi-moni` `.agents/skills/operate-tiala/SKILL.md`
documents the case where the Devin-side copy of `OPENCLAW_GATEWAY_TOKEN` kept
returning 401 after the value had been rotated on TIALA, and the fix was to
re-read it from Secret Manager:

```bash
gcloud auth activate-service-account --key-file=<sa-key>.json --project=screen-share-459802
gcloud secrets versions access latest --secret=<NAME> --project=screen-share-459802
```

Operational consequences:

* When a call fails with 401/403, compare the injected copy against Secret
  Manager before assuming the token itself is broken.
* Rotation is complete only when the new value is in Secret Manager **and**
  every injected copy in the *Usage* column below has been refreshed.
* Tokens marked *not in Secret Manager* in the table are a known gap: they
  live only in the Devin org store and/or GitHub secrets today and should be
  registered in Secret Manager (tracked under *Follow-ups*).

Rotation procedure for a GSM-managed secret (nothing in MAGI pins a numeric
version — every consumer reads `:latest`):

1. `gcloud secrets versions add <NAME> --data-file=-` — pipe the value in,
   never paste it by hand (`MOOMOO_BRIDGE_AUTH_TOKEN` v1 shipped a trailing
   newline that produced `ERR_INVALID_CHAR` in the Authorization header).
2. Redeploy or restart each consumer in the *Usage* column so `:latest`
   resolves to the new version, and refresh every injected copy the same
   day — the host-local `*.env` files under the moomoo config dir sourced by TIALA's
   launchd plists deliberately do not read SM at start-up, so they go
   stale on rotation (TIALA's `aka-agent@` has gcloud + per-secret
   `secretAccessor` on the three secrets that path reads; the env-file
   design mostly doesn't use it — see the TIALA SA row below).
3. `gcloud secrets versions disable <old-version> --secret=<NAME>` — keep
   it disabled, not destroyed, until a soak confirms nothing pinned it.
4. `gcloud secrets versions destroy <old-version> --secret=<NAME>` after
   the soak.

# Ledger

Legend — *Truth*: `SM` = GCP Secret Manager `screen-share-459802` (secret of the same
name unless noted); `Devin org` = Devin organization secret store; `GH:<repo>` =
GitHub Actions secret on that repo. *Rotation owner* is the human who mints the
replacement; Devin may propagate copies but never mints — except as a one-off,
per-token exception explicitly approved by Jun for that rotation.

| Canonical env var | Auth scheme | Service / endpoint | Required scopes | Truth (as of 2026-10-05) | Usage (repo: files) | Rotation owner / notes |
|---|---|---|---|---|---|---|
| `GRAFANA_SA_TOKEN` | `Authorization: Bearer glsa_…` | Grafana instance API `https://aka.grafana.net/api/*` (dashboards, datasources, alerting, ML job provisioning, datasource proxy to `grafanacloud-ml-metrics`) | Service Account role **Admin** | `SM` + `Devin org` | magi-core: `lib/secrets.js`, `lib/grafana-ml.js` (proxy fallback), `grafana/provision.mjs`, `grafana/provision-alerts.mjs`, `grafana/provision-ml-forecast-jobs.mjs`, `.github/workflows/deploy.yml` (LILITH job `--set-secrets`), `.agents/skills/testing-*` | jun. Over-privileged for the runtime proxy read; Tier 2 candidate to split into a read-only SA. |
| `GRAFANA_ML_API_TOKEN` | `Authorization: Basic base64(1557976:<token>)` | Grafana ML prediction API `https://machine-learning-prod-ap-northeast-0.grafana.net/machine-learning/predict/api/v1/query_range` | Access Policy `mlops:read` (current token also has `mlops:write`, realm `aka`) | `SM` (registered 2026-09-08) + `Devin org`; not yet injected into any Cloud Run job (LILITH falls back to `GRAFANA_SA_TOKEN` proxy) | magi-core: `lib/secrets.js`, `lib/grafana-ml.js`, `.agents/skills/testing-lilith-shadow-pipeline` | jun. Legacy alias `GRAFANA_ML_TOKEN` still accepted by `lib/secrets.js` with a deprecation note; can now be removed and a `--set-secrets` binding added to deploy.yml. |
| `GRAFANA_OTLP_TOKEN` | `OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic base64(1557976:<token>)` | Grafana Cloud OTLP gateway `https://otlp-gateway-prod-ap-northeast-0.grafana.net/otlp` | Access Policy `metrics:write` + `traces:write` (realm `aka`) | `SM` + `Devin org` | magi-core: `src/sigil.js`, `.github/workflows/deploy.yml` (every PLM job), `scripts/test-sigil-phase-a.mjs`; magi-moomoo: `scripts/start-bridge.sh`, `bridge/moomoo_bridge.py` (OpenLIT) | jun. The **only** sanctioned OTLP credential. |
| `SIGIL_AUTH_TOKEN` | Sigil SDK Basic auth (`SIGIL_AUTH_TENANT_ID=1557976` + token) | Grafana Sigil AI Observability `https://sigil-prod-ap-northeast-0.grafana.net` | Access Policy `sigil:write` **only** | `SM` | magi-core: `src/sigil.js`, `.github/workflows/deploy.yml` (every PLM job); magi-moomoo: `scripts/start-bridge.sh`, `bridge/moomoo_bridge.py` (OTLP fallback) | jun. **Legacy / scheduled for removal as an OTLP fallback**: it lacks `metrics:write`/`traces:write`, so any OTLP path that falls back to it fails auth by construction. Still valid as the Sigil generation-tracking credential in magi-core until Tier 2 bundles it into one Access Policy with `GRAFANA_OTLP_TOKEN`. |
| `GRAFANA_SM_API_TOKEN` | `Authorization: Bearer <token>` | Grafana Synthetic Monitoring API `https://synthetic-monitoring-api-ap-northeast-0.grafana.net/api/v1` (`GRAFANA_SM_BACKEND`) | SM API access token (`synthetic-monitoring` app token generated from the SM UI / `sm-api` access policy) | `SM` | magi-core: `sm-moomoo-token-rotate.mjs`, `.github/workflows/deploy.yml` (`magi-sm-moomoo-token-rotate` job) | jun. Used to rotate the OIDC bearer on the `magi-moomoo-health` / `magi-moomoo-connectivity` checks every ~55 min. |
| `GRAFANA_COM_PASSWORD` + `_2FA_GRAFANA_COM` | Browser login (grafana.com SSO password + TOTP) | Grafana Cloud portal `https://grafana.com` → `aka.grafana.net` (Access Policy token minting) | Account owner `jun@dogma.jp` | `Devin org` only (human credential — **never** goes to Secret Manager or CI) | magi-core: `.agents/skills/testing-off-hours-chat/SKILL.md` (UI screenshots; skill notes the password has been rejected and falls back to the render API) | jun. This is the root credential that mints every other Grafana token in this table; rotate on suspicion, not on schedule. |
| `CLOUDFLARE_GLOBAL_API_KEY` | `X-Auth-Email: jun@dogma.jp` + `X-Auth-Key: <key>` (Bearer not accepted) | Cloudflare v4 API `https://api.cloudflare.com/client/v4/*` (AI Search/AutoRAG, R2, D1, KV, Queues, AI Gateway, Zones, Audit logs, GraphQL, Workers Builds) | Global — every product, read+write | `Devin org` only — **not in Secret Manager** | magi-knowledge: `.agents/skills/configuring-cloudflare-ai-search/SKILL.md` | jun. Legacy account-wide key; Tier 2 target is to replace with one scoped account API token. Never inject into CI or Cloud Run. |
| `CLOUDFLARE_R2_CATALOG_TOKEN` (org copy: `CLOUDFLARE_R2_CATALOG_TOKEN_V4`; V1–V3 revoked 2026-08-27) | `Authorization: Bearer <token>` (Iceberg REST); derived S3 creds `R2_ACCESS_KEY_ID` = the token's Cloudflare token ID, `R2_SECRET_ACCESS_KEY` = `sha256(token)` (both recorded in the Devin-store description, not here) | R2 Data Catalog `https://catalog.cloudflarestorage.com/c3b51b9f35d16713caab757feca638d8/magi-system` and R2 S3 endpoint `https://c3b51b9f35d16713caab757feca638d8.r2.cloudflarestorage.com` | Account API token: **R2 Data Catalog R/W** + **R2 Storage R/W** (token `magi-r2-catalog-devin-20260827`) | `Devin org` (`_V4`) + `GH:magi-knowledge` (`CLOUDFLARE_R2_CATALOG_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`); `SM` copy `CLOUDFLARE_R2_CATALOG_TOKEN` registered 2026-09-08 | magi-knowledge: `scripts/r2_catalog_sync.py`, `.github/workflows/r2-catalog-sync.yml`, `.github/workflows/ai-search-sync.yml`, `.agents/skills/syncing-spec-to-r2-data-catalog/SKILL.md`, `.agents/skills/configuring-cloudflare-ai-search/SKILL.md`; magi-core: `vendor/magi-knowledge` (submodule copy) | jun mints; Devin propagates the GitHub copies via `MAGI_KNOWLEDGE_SECRETS_ADMIN_PAT`. The `_Vn` suffix is a Devin-store versioning convention only — code always reads the unsuffixed name. A separate older pair `R2_ACCESS_KEY_ID_V2`/`R2_SECRET_ACCESS_KEY_V2` (token `magi-r2-devin-20260825`, R2 Storage R/W) exists in the Devin store for log reads. |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | `Authorization: Bearer <token>` (consumed by `cloudflared` / Cloudflare API) | Cloudflare Tunnel API for Named Tunnels on TIALA (`magi-bridge`, `magi-ollama`, `magi-openclaw` — names + `*.cfargotunnel.com` CNAMEs verified via API 2026-10-03); `CLOUDFLARE_ACCOUNT_ID=c3b51b9f35d16713caab757feca638d8` | Account API token: **Cloudflare Tunnel Edit** (+ DNS Edit on the zone for the hostname) | `SM` (`CLOUDFLARE_API_TOKEN`); account ID is not secret | magi-moomoo: `scripts/setup-openclaw-named-tunnel.sh` (fallback when `cloudflared tunnel login` cert is absent) | jun. Only needed at tunnel-creation time; runtime tunnels use per-tunnel credentials files / `*_TUNNEL_TOKEN` secrets. **Rotated 2026-10-02** (Devin-minted via Global API Key — a one-off exception to the *Devin never mints* legend, explicitly approved by Jun in-session): new account token `magi-tunnel-devin-20261002` stored as `SM` version 2; the previous user-scoped token was already deleted on Cloudflare's side (verify → Invalid API Token), and the account-token list carries no dead row. No injected copies exist outside `SM`. |
| `CF_AI_GATEWAY_TOKEN` + `CF_AI_GATEWAY_ACCOUNT_ID` + `CF_AI_GATEWAY_ID` | `cf-aig-authorization: Bearer <token>` on gateway-routed provider calls | Cloudflare AI Gateway `https://gateway.ai.cloudflare.com/v1/c3b51b9f35d16713caab757feca638d8/magi-llm/<provider>` (`CF_AI_GATEWAY_ID=magi-llm`) | Account API token: **AI Gateway Run** (token `magi-llm-gateway-run`) | `SM` + `Devin org` (token); account ID and gateway ID are plain env vars in `deploy.yml` | magi-core: `lib/secrets.js`, `src/llm.js`, `.github/workflows/deploy.yml` (every PLM job) | jun. Required because the `magi-llm` gateway has Authenticated Gateway enabled; see [cloudflare](cloudflare.md) §4 for the separate `default` gateway used by AI Search (no token in our code). |
| `CLOUDFLARE_AI_SEARCH_TOKEN` | `Authorization: Bearer <token>` | Cloudflare v4 AutoRAG API `https://api.cloudflare.com/client/v4/accounts/c3b51b9f35d16713caab757feca638d8/autorag/*` — instance `magi-document` (RAG config, sync jobs, per-file index metadata) | API token scoped to **AI Search Read** on this account (Cloudflare token id `b69bbcc8…` per `/user/tokens/verify`) | `SM` (registered 2026-10-06T03:14:07Z, version 1) | magi-knowledge: `.agents/skills/configuring-cloudflare-ai-search/SKILL.md`; Devin local sessions reading it from GSM for mirror-freshness audits of `magi-document` vs `main` — closes the AutoRAG-read gap the R2-scoped token could not cover | jun (minted in the Cloudflare dashboard; registered to GSM by jun via `gcloud secrets create --data-file=-`). Verified coverage 2026-10-06: `GET /rags`, `/rags/{id}/jobs`, `/rags/{id}/files`. `POST .../search` requires **AI Search Edit + AI Search Run** (legacy `Auto Rag Write`) per Cloudflare docs — a Read token gets `Authentication error`; remint with those scopes if query-level probes are needed. Distinct from `CLOUDFLARE_R2_CATALOG_TOKEN` (R2 catalog/storage) and `CF_AI_GATEWAY_TOKEN` (AI Gateway). |
| `GITHUB_TOKEN` | `Authorization: Bearer <token>` (GitHub REST) | GitHub API for the current repo only | GitHub Actions default `github.token` (`GITHUB_TOKEN`), permissions per workflow | Ephemeral — minted per workflow run by GitHub. (An unrelated long-lived `GITHUB_TOKEN` also exists in `SM`; it is **not** the Actions token.) | magi-core: `.github/workflows/antigravity_issue_responder.yml`, `scripts/antigravity_issue_responder.py`; fallback in `okf-drift.yml` / `okf-pin-bump.yml` | n/a (GitHub-managed). `magi-knowledge` is public (confirmed 2026-10-23), so the Actions token can read it; `MAGI_KNOWLEDGE_TOKEN` below is scheduled for removal. |
| `MAGI_KNOWLEDGE_TOKEN` | `Authorization: Bearer github_pat_…` (as `GH_TOKEN` for `gh`/git) | GitHub API + git fetch of `dogmaai/magi-knowledge` from `dogmaai/magi-core` CI | Fine-grained PAT, **Contents: read** on `dogmaai/magi-knowledge` only | `SM` (registered 2026-09-08) + `Devin org` + `GH:magi-core` | magi-core: `.github/workflows/test.yml`, `.github/workflows/okf-drift.yml`, `.github/workflows/okf-pin-bump.yml`, `.github/workflows/auto-review.yml`, `.github/workflows/claude-review.yml` — all as `secrets.MAGI_KNOWLEDGE_TOKEN || github.token`, purely to clone this repo as a submodule (`scripts/init_knowledge.sh`) | jun (PAT owner). **Scheduled for removal**: `dogmaai/magi-knowledge` is a public repository (confirmed 2026-10-23 via `gh api` → `visibility: public`; Jun confirmed public is intended), so the PAT is unnecessary — the companion magi-core PR removes all five workflow references and the submodule clone falls back to `github.token` (tracked under magi-core#659). Retirement: Jun deletes the `GH:magi-core` Actions secret, then disables and destroys the `SM` secret after a soak. |
| `GCP_SERVICE_ACCOUNT_KEY` | Service-account JSON → `GOOGLE_APPLICATION_CREDENTIALS=<sa-key>.json` | GCP project `screen-share-459802`: BigQuery, Secret Manager (`secretmanager.versions.access`), Cloud Run / Logging read | SA `github-actions@screen-share-459802.iam.gserviceaccount.com`; observed capabilities: BigQuery read/DML, `secretmanager.versions.access`, Cloud Run / Logging read (exact IAM roles not audited here) | `Devin org` + `GH:*` (deploy workflows). This *is* the key that unlocks Secret Manager, so by definition it cannot live there. | magi-core: `.agents/skills/testing-*` (all), Devin blueprint; magi-moni: `scripts/operate-tiala.js`, `.agents/skills/operate-tiala`, `.agents/skills/testing-magi-moni`; magi-moomoo: `.agents/skills/testing-moomoo-*` | jun (IAM). Rotate via `gcloud iam service-accounts keys create` and refresh every copy the same day. |
| — (no env var; SA `devin-bq-admin@screen-share-459802.iam.gserviceaccount.com`) | service-account JSON keys — **none stored anywhere audited** | GCP project `screen-share-459802` (BigQuery access originally created for Devin; display name "Devin BigQuery Admin") | `roles/owner` + `roles/editor` + `roles/bigquery.admin` + `roles/discoveryengine.agentspaceAdmin` + `roles/discoveryengine.agentspaceUser` (project-level) — over-privileged for an unused SA; see Tier 2 | none — 2026-10-07 audit covered: Devin org secrets, session env and default gcloud key locations, every GSM secret, the four live MAGI repos, magi-core GH Actions secrets, and the cognition-bigquery MCP install. Places Devin cannot reach (jun's machine, third-party stores, other GCP projects) are out of scope — deletion covered them anyway | none found; last real API use 2026-04-27 per audit logs | jun — **all 5 user-managed keys deleted 2026-10-07** (`27830b59`, `3c584ee5`, `5928b1d3`, `73029fb8`, `ed2cd589`; none existed in any audited store, 4 of 5 minted after the last recorded API use). Only the 2 Google-managed keys remain (expire 2027-04-27). The `roles/iam.serviceAccountKeyAdmin` binding jun granted `github-actions@` for the cleanup was **revoked same-day** (verified: `keys list` PERMISSION_DENIED again). The SA and its project roles are unchanged. See log.md 2026-10-07. |
| `OPENCLAW_GATEWAY_TOKEN` | `Authorization: Bearer <token>` | `openclaw` tailnet address / `openclaw.khaos.company` → OpenClaw Gateway API (`/v1/*`, Control UI RPC) | n/a | `SM` | magi-moni: `config.py` (`OPENCLAW_GATEWAY_TOKEN`), `adapters/council_openclaw.py`; the `gateway.auth.token` field of the host-local OpenClaw config on TIALA (enforcement side — gateway verifies against this value; file path in the private record) | jun. Registered during the 2026-10-05 tunnel-auth audit; was previously only referenced in prose above. |
| `MOOMOO_BRIDGE_AUTH_TOKEN` | `Authorization: Bearer <token>` | `bridge.khaos.company` → `moomoo_bridge.py` (every path except `GET /health`); injected into the bridge as `BRIDGE_AUTH_TOKEN` | n/a | `SM` (registered 2026-10-05 — **use version ≥2**: v1 carried a trailing newline that produced `ERR_INVALID_CHAR` in the proxy's Authorization header) | magi-moomoo: `bridge/moomoo_bridge.py`, `scripts/start-bridge.sh`, `server.js` (`BRIDGE_AUTH_TOKEN` env), `.github/workflows/deploy.yml` (Cloud Run `--set-secrets`); TIALA injected copy in a host-local env file sourced by the `com.magi.bridge` plist (path in the private record) (the bridge reads the env file by design rather than calling SM at start-up; TIALA's `aka-agent@` SA *has* per-secret `secretAccessor` on this secret, so the copy goes stale on rotation and must be refreshed — see the TIALA SA row) | jun. Value minted in-session 2026-10-05 under Jun's implementation instruction (same class of one-off exception as `CLOUDFLARE_API_TOKEN`). |
| `OLLAMA_AUTH_TOKEN` | `Authorization: Bearer <token>` | `ollama.khaos.company` → `ollama-auth-proxy` (dedicated loopback port) → Ollama (loopback; ports in the private record) | n/a | `SM` (registered 2026-10-05) | magi-core: `lib/secrets.js`, `src/llm.js`, `.github/workflows/deploy.yml` (`magi-core-adam` / `magi-core-boreas` `--set-secrets`); TIALA injected copy in a host-local env file sourced by the `com.magi.ollama-auth-proxy` plist (path in the private record); magi-moomoo: `scripts/ollama-auth-proxy.py` (enforcement side) | jun. Proxy refuses to start without the env var (fail-closed). Minted in-session 2026-10-05 under Jun's implementation instruction. |
| — (no env var; SA `aka-agent@screen-share-459802.iam.gserviceaccount.com` on TIALA) | service-account key stored on TIALA (+ active `gcloud auth` account) | GCP project `screen-share-459802` — read-only ops from TIALA: BigQuery read/jobs, Cloud Scheduler / Logging / Cloud Run viewer, Secret Manager `versions.access` on three named secrets only | `roles/bigquery.dataViewer`, `roles/bigquery.jobUser`, `roles/cloudscheduler.viewer`, `roles/logging.viewer`, `roles/run.viewer` (project IAM); `roles/secretmanager.secretAccessor` — **project-wide binding removed 2026-10-23**, replaced by per-secret bindings on `MOOMOO_BRIDGE_AUTH_TOKEN`, `GRAFANA_OTLP_TOKEN`, `SIGIL_AUTH_TOKEN` (Jun-approved least privilege) | TIALA local key file — a credential **location** (no value recorded here); a local SDK + Homebrew `gcloud`/`bq` shims exist but are *not* on the *default* launchd PATH (they do work under plists that set `PATH`, e.g. `com.magi.bridge` includes `/opt/homebrew/bin`) | TIALA: the daily GCS memory-backup script (activates this key); interactive `gcloud`/`bq` use | jun. The bridge/ollama-auth-proxy deliberately read injected `magi-moomoo` env-file copies instead of SM at start-up — with one exception: the live bridge still *optionally* fetches `GRAFANA_OTLP_TOKEN` (plus `MOOMOO_BRIDGE_AUTH_TOKEN` and the deprecated `SIGIL_AUTH_TOKEN` fallback) via `gcloud secrets versions access` when the env file lacks them, so this SA's SM access is scoped to exactly those three secrets. Verified as `aka-agent@` on TIALA 2026-10-23: the three return OK while an unrelated secret returns PERMISSION_DENIED. The same script also names three `PYROSCOPE_*` secrets that do not exist in GSM — those calls are best-effort and resolve empty (drift recorded; no binding added). `gcloud` is absent from the *default* launchd PATH, which is why launchd-run scripts that do not set PATH fail when calling it (the dead `local.vix-collector` hit this) — the `com.magi.bridge` plist does set `PATH` including `/opt/homebrew/bin`, where the Homebrew `gcloud` symlink lives, so the bridge's SM fetches do work under launchd (stdout log: `Fetched GRAFANA_OTLP_TOKEN from Secret Manager`; traces confirmed arriving in Grafana Cloud 2026-10-23). Also configured on TIALA: `aka-mac-mini@screen-share-459802.iam.gserviceaccount.com` (`bigquery.dataViewer`/`jobUser`, `cloudscheduler.jobRunner`, `run.invoker`; its project-wide `secretAccessor` was **removed 2026-10-23** — no consumer found) and `jun@dogma.jp`. |
| — (no env var; ttyd basic-auth credential) | HTTP basic `user:password` embedded **as a literal argument in the `local.ttyd` LaunchAgent** on TIALA | the web terminal on TIALA | n/a | **Not in Secret Manager** — known gap (2026-10-22) | basic-auth credential embedded as a literal in the ttyd LaunchAgent on TIALA — not in SM, gap recorded 2026-10-22 | jun. Value lives only inside the plist; registering a managed copy and scrubbing the plist is Jun's call — see [tiala-host](tiala-host.md) open items. |

# Follow-ups

Tier 1 (this ledger, no token re-issue):

* ~~Register `GRAFANA_ML_API_TOKEN`, `CLOUDFLARE_R2_CATALOG_TOKEN`,
  `MAGI_KNOWLEDGE_TOKEN` in Secret Manager~~ — done 2026-09-08 (version 1 each,
  values copied from the Devin org store). `CLOUDFLARE_GLOBAL_API_KEY` is
  intentionally excluded until Tier 2 replaces it.
* Add `GRAFANA_ML_API_TOKEN=GRAFANA_ML_API_TOKEN:latest` to the LILITH job
  `--set-secrets` in magi-core `deploy.yml` now that the secret exists.
* ~~Disable `MOOMOO_BRIDGE_AUTH_TOKEN` version 1 in GSM (it carried a
  trailing newline; v2 is live)~~ — done: v1 **destroyed** 2026-10-05
  (verified via `gcloud secrets versions list` 2026-10-06); only the
  enabled v2 remains, so the broken value can no longer be revived.
* Remove the `SIGIL_AUTH_TOKEN` OTLP fallback from `magi-moomoo`
  `scripts/start-bridge.sh` / `bridge/moomoo_bridge.py` and from magi-core
  `src/sigil.js` `buildOtlpExporterConfig()` once every deployment has
  `GRAFANA_OTLP_TOKEN` bound.
* Drop the `GRAFANA_ML_TOKEN` alias from magi-core `lib/secrets.js`.
* GSM secrets with no remaining consumer in any dogmaai repo after the
  2026-10-22 TIALA launchd cleanup — `MAGI_QUERY_API_KEY` (v1, 2026-02-27;
  the `magi-query-api` Cloud Run service and `market_indicators` table are
  already absent), `NGROK_AUTHTOKEN` (v1–v3, 2026-03-23; the
  `com.magi.opend-tunnel` ngrok job is disabled) and `BRAVE_API_KEY` (v1,
  2026-02-27; the disabled telegram-bot's name — distinct from
  `BRAVE_SEARCH_API_KEY`, which HERMES still uses). Zero code references
  verified via GitHub code search across dogmaai on 2026-10-23; **all
  versions disabled 2026-10-23** (reversible) — destroy after a soak,
  tracked in magi-core#659.
  `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` stay (magi-core `deploy.yml`
  and magi-moni still consume them).
* Retire `MAGI_KNOWLEDGE_TOKEN` — `magi-knowledge` is public since
  2026-10-23, so the PAT is no longer needed to clone it. The companion
  magi-core PR merged (magi-core#661) leaving `secrets.MAGI_KNOWLEDGE_TOKEN
  || github.token` fallbacks, so the `GH:magi-core` Actions secret was
  **deleted 2026-10-23**; the `SM` copy is disabled+destroyed after a
  soak, and the `Devin org` copy goes with it — tracked in
  magi-core#659.

Tier 2 (requires re-issuing real tokens — **human approval before any step**):

* `devin-bq-admin` SA keys — **done 2026-10-07**: all 5 user-managed keys
  deleted (none existed in any audited store; `DeleteServiceAccountKey`
  events recorded in Admin Activity at 2026-10-07T06:19Z) and the
  temporary `roles/iam.serviceAccountKeyAdmin` grant for the cleanup was
  revoked. If Devin-side BigQuery access to this project is ever wanted
  again, mint a fresh key and register it as a Devin org secret — note
  `GCP_SERVICE_ACCOUNT_KEY` (SA `github-actions@`) already covers BQ
  read/DML.
* `devin-bq-admin` SA role reduction: the SA is unused since 2026-04-27
  yet still holds `roles/owner` + `roles/editor` +
  `roles/bigquery.admin` + `roles/discoveryengine.agentspace{Admin,User}`
  at project level — far above what an idle BQ-only SA needs. Jun to
  decide whether to reduce it to `roles/bigquery.admin` (or less), or
  disable/delete the SA entirely. Not changed in the 2026-10-07 cleanup
  (IAM changes were out of scope).
* Grafana: mint one Access Policy bundling `sigil:write` + `metrics:write` +
  `traces:write` (+ `logs:write`) so Sigil and OTLP share a single token, and
  a read-only Service Account for the ML datasource proxy instead of Admin.
* Cloudflare: replace `CLOUDFLARE_GLOBAL_API_KEY` with one scoped account API
  token (AI Search + R2 + AI Gateway read/write) and retire the Global Key.
  AI Search **read** path migrated 2026-10-06 (`CLOUDFLARE_AI_SEARCH_TOKEN`
  in `SM`); R2 write and AI Gateway scopes still ride the Global Key —
  retirement stays blocked until those are minted.

# Related

* [cloudflare](cloudflare.md) — what each Cloudflare product is used for.
* [magi-moni](magi-moni.md) — `operate-tiala` runbook that motivated the
  source-of-truth rule.
* `dogmaai/magi-knowledge` `.agents/skills/syncing-spec-to-r2-data-catalog/SKILL.md`
  and `.agents/skills/configuring-cloudflare-ai-search/SKILL.md` — Cloudflare
  token operations.
