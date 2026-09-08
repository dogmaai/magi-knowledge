---
type: Service
title: Secrets inventory (Grafana Cloud, Cloudflare, GitHub, GCP tokens)
description: Single ledger of the infrastructure tokens (Grafana Cloud, Cloudflare, GitHub, GCP) referenced across the MAGI repositories — canonical env var name, auth scheme, target endpoint, required scopes, source of truth, usage sites and rotation owner. GCP Secret Manager is the only source of truth; injected env-var copies can go stale.
lilith_safe: false
status: stable
generated: { by: devin/cloud, at: 2026-09-08T01:30:00Z }
verified: { by: human:jun, at: 2026-09-08T01:30:00Z }
stale_after: 2027-03-07T01:30:00Z
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
gcloud auth activate-service-account --key-file=/home/ubuntu/gcp-key.json --project=screen-share-459802
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

# Ledger

Legend — *Truth*: `SM` = GCP Secret Manager `screen-share-459802` (secret of the same
name unless noted); `Devin org` = Devin organization secret store; `GH:<repo>` =
GitHub Actions secret on that repo. *Rotation owner* is the human who mints the
replacement; Devin may propagate copies but never mints.

| Canonical env var | Auth scheme | Service / endpoint | Required scopes | Truth (as of 2026-09-08) | Usage (repo: files) | Rotation owner / notes |
|---|---|---|---|---|---|---|
| `GRAFANA_SA_TOKEN` | `Authorization: Bearer glsa_…` | Grafana instance API `https://aka.grafana.net/api/*` (dashboards, datasources, alerting, ML job provisioning, datasource proxy to `grafanacloud-ml-metrics`) | Service Account role **Admin** | `SM` + `Devin org` | magi-core: `lib/secrets.js`, `lib/grafana-ml.js` (proxy fallback), `grafana/provision.mjs`, `grafana/provision-alerts.mjs`, `grafana/provision-ml-forecast-jobs.mjs`, `.github/workflows/deploy.yml` (LILITH job `--set-secrets`), `.agents/skills/testing-*` | jun. Over-privileged for the runtime proxy read; Tier 2 candidate to split into a read-only SA. |
| `GRAFANA_ML_API_TOKEN` | `Authorization: Basic base64(1557976:<token>)` | Grafana ML prediction API `https://machine-learning-prod-ap-northeast-0.grafana.net/machine-learning/predict/api/v1/query_range` | Access Policy `mlops:read` (current token also has `mlops:write`, realm `aka`) | `Devin org` only — **not in Secret Manager**; not injected into any Cloud Run job (LILITH falls back to `GRAFANA_SA_TOKEN` proxy) | magi-core: `lib/secrets.js`, `lib/grafana-ml.js`, `.agents/skills/testing-lilith-shadow-pipeline` | jun. Legacy alias `GRAFANA_ML_TOKEN` still accepted by `lib/secrets.js` with a deprecation note; remove after Secret Manager registration. |
| `GRAFANA_OTLP_TOKEN` | `OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic base64(1557976:<token>)` | Grafana Cloud OTLP gateway `https://otlp-gateway-prod-ap-northeast-0.grafana.net/otlp` | Access Policy `metrics:write` + `traces:write` (realm `aka`) | `SM` + `Devin org` | magi-core: `src/sigil.js`, `.github/workflows/deploy.yml` (every PLM job), `scripts/test-sigil-phase-a.mjs`; magi-moomoo: `scripts/start-bridge.sh`, `bridge/moomoo_bridge.py` (OpenLIT) | jun. The **only** sanctioned OTLP credential. |
| `SIGIL_AUTH_TOKEN` | Sigil SDK Basic auth (`SIGIL_AUTH_TENANT_ID=1557976` + token) | Grafana Sigil AI Observability `https://sigil-prod-ap-northeast-0.grafana.net` | Access Policy `sigil:write` **only** | `SM` | magi-core: `src/sigil.js`, `.github/workflows/deploy.yml` (every PLM job); magi-moomoo: `scripts/start-bridge.sh`, `bridge/moomoo_bridge.py` (OTLP fallback) | jun. **Legacy / scheduled for removal as an OTLP fallback**: it lacks `metrics:write`/`traces:write`, so any OTLP path that falls back to it fails auth by construction. Still valid as the Sigil generation-tracking credential in magi-core until Tier 2 bundles it into one Access Policy with `GRAFANA_OTLP_TOKEN`. |
| `GRAFANA_SM_API_TOKEN` | `Authorization: Bearer <token>` | Grafana Synthetic Monitoring API `https://synthetic-monitoring-api-ap-northeast-0.grafana.net/api/v1` (`GRAFANA_SM_BACKEND`) | SM API access token (`synthetic-monitoring` app token generated from the SM UI / `sm-api` access policy) | `SM` | magi-core: `sm-moomoo-token-rotate.mjs`, `.github/workflows/deploy.yml` (`magi-sm-moomoo-token-rotate` job) | jun. Used to rotate the OIDC bearer on the `magi-moomoo-health` / `magi-moomoo-connectivity` checks every ~55 min. |
| `GRAFANA_COM_PASSWORD` + `_2FA_GRAFANA_COM` | Browser login (grafana.com SSO password + TOTP) | Grafana Cloud portal `https://grafana.com` → `aka.grafana.net` (Access Policy token minting) | Account owner `jun@dogma.jp` | `Devin org` only (human credential — **never** goes to Secret Manager or CI) | magi-core: `.agents/skills/testing-off-hours-chat/SKILL.md` (UI screenshots; skill notes the password has been rejected and falls back to the render API) | jun. This is the root credential that mints every other Grafana token in this table; rotate on suspicion, not on schedule. |
| `CLOUDFLARE_GLOBAL_API_KEY` | `X-Auth-Email: jun@dogma.jp` + `X-Auth-Key: <key>` (Bearer not accepted) | Cloudflare v4 API `https://api.cloudflare.com/client/v4/*` (AI Search/AutoRAG, R2, D1, KV, Queues, AI Gateway, Zones, Audit logs, GraphQL, Workers Builds) | Global — every product, read+write | `Devin org` only — **not in Secret Manager** | magi-knowledge: `.agents/skills/configuring-cloudflare-ai-search/SKILL.md` | jun. Legacy account-wide key; Tier 2 target is to replace with one scoped account API token. Never inject into CI or Cloud Run. |
| `CLOUDFLARE_R2_CATALOG_TOKEN` (org copy: `CLOUDFLARE_R2_CATALOG_TOKEN_V4`; V1–V3 revoked 2026-08-27) | `Authorization: Bearer <token>` (Iceberg REST); derived S3 creds `R2_ACCESS_KEY_ID` = the token's Cloudflare token ID, `R2_SECRET_ACCESS_KEY` = `sha256(token)` (both recorded in the Devin-store description, not here) | R2 Data Catalog `https://catalog.cloudflarestorage.com/c3b51b9f35d16713caab757feca638d8/magi-system` and R2 S3 endpoint `https://c3b51b9f35d16713caab757feca638d8.r2.cloudflarestorage.com` | Account API token: **R2 Data Catalog R/W** + **R2 Storage R/W** (token `magi-r2-catalog-devin-20260827`) | `Devin org` (`_V4`) + `GH:magi-knowledge` (`CLOUDFLARE_R2_CATALOG_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) — **not in Secret Manager** | magi-knowledge: `scripts/r2_catalog_sync.py`, `.github/workflows/r2-catalog-sync.yml`, `.github/workflows/ai-search-sync.yml`, `.agents/skills/syncing-spec-to-r2-data-catalog/SKILL.md`, `.agents/skills/configuring-cloudflare-ai-search/SKILL.md`; magi-core: `vendor/magi-knowledge` (submodule copy) | jun mints; Devin propagates the GitHub copies via `MAGI_KNOWLEDGE_SECRETS_ADMIN_PAT`. The `_Vn` suffix is a Devin-store versioning convention only — code always reads the unsuffixed name. A separate older pair `R2_ACCESS_KEY_ID_V2`/`R2_SECRET_ACCESS_KEY_V2` (token `magi-r2-devin-20260825`, R2 Storage R/W) exists in the Devin store for log reads. |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | `Authorization: Bearer <token>` (consumed by `cloudflared` / Cloudflare API) | Cloudflare Tunnel API for Named Tunnels on TIALA (`moomoo-bridge`, `ollama`, `openclaw-gateway`); `CLOUDFLARE_ACCOUNT_ID=c3b51b9f35d16713caab757feca638d8` | Account API token: **Cloudflare Tunnel Edit** (+ DNS Edit on the zone for the hostname) | `SM` (`CLOUDFLARE_API_TOKEN`); account ID is not secret | magi-moomoo: `scripts/setup-openclaw-named-tunnel.sh` (fallback when `cloudflared tunnel login` cert is absent) | jun. Only needed at tunnel-creation time; runtime tunnels use per-tunnel credentials files / `*_TUNNEL_TOKEN` secrets. |
| `CF_AI_GATEWAY_TOKEN` + `CF_AI_GATEWAY_ACCOUNT_ID` + `CF_AI_GATEWAY_ID` | `cf-aig-authorization: Bearer <token>` on gateway-routed provider calls | Cloudflare AI Gateway `https://gateway.ai.cloudflare.com/v1/c3b51b9f35d16713caab757feca638d8/magi-llm/<provider>` (`CF_AI_GATEWAY_ID=magi-llm`) | Account API token: **AI Gateway Run** (token `magi-llm-gateway-run`) | `SM` + `Devin org` (token); account ID and gateway ID are plain env vars in `deploy.yml` | magi-core: `lib/secrets.js`, `src/llm.js`, `.github/workflows/deploy.yml` (every PLM job) | jun. Required because the `magi-llm` gateway has Authenticated Gateway enabled; see [cloudflare](cloudflare.md) §4 for the separate `default` gateway used by AI Search (no token in our code). |
| `GITHUB_TOKEN` | `Authorization: Bearer <token>` (GitHub REST) | GitHub API for the current repo only | GitHub Actions default `github.token` (`GITHUB_TOKEN`), permissions per workflow | Ephemeral — minted per workflow run by GitHub. (An unrelated long-lived `GITHUB_TOKEN` also exists in `SM`; it is **not** the Actions token.) | magi-core: `.github/workflows/antigravity_issue_responder.yml`, `scripts/antigravity_issue_responder.py`; fallback in `okf-drift.yml` / `okf-pin-bump.yml` | n/a (GitHub-managed). Cannot read the private `magi-knowledge` repo — that is what `MAGI_KNOWLEDGE_TOKEN` is for. |
| `MAGI_KNOWLEDGE_TOKEN` | `Authorization: Bearer github_pat_…` (as `GH_TOKEN` for `gh`/git) | GitHub API + git fetch of `dogmaai/magi-knowledge` from `dogmaai/magi-core` CI | Fine-grained PAT, **Contents: read** on `dogmaai/magi-knowledge` only | `Devin org` + `GH:magi-core` — **not in Secret Manager** | magi-core: `.github/workflows/okf-drift.yml`, `.github/workflows/okf-pin-bump.yml`, `scripts/init_knowledge.sh` (submodule) | jun (PAT owner). Fine-grained PATs expire — record the expiry when rotating. `okf-pin-bump.yml` pushes the bump branch with the workflow's own `contents: write` permission, not this PAT. |
| `GCP_SERVICE_ACCOUNT_KEY` | Service-account JSON → `GOOGLE_APPLICATION_CREDENTIALS=/home/ubuntu/gcp-key.json` | GCP project `screen-share-459802`: BigQuery, Secret Manager (`secretmanager.versions.access`), Cloud Run / Logging read | SA `github-actions@screen-share-459802.iam.gserviceaccount.com`; observed capabilities: BigQuery read/DML, `secretmanager.versions.access`, Cloud Run / Logging read (exact IAM roles not audited here) | `Devin org` + `GH:*` (deploy workflows). This *is* the key that unlocks Secret Manager, so by definition it cannot live there. | magi-core: `.agents/skills/testing-*` (all), Devin blueprint; magi-moni: `scripts/operate-tiala.js`, `.agents/skills/operate-tiala`, `.agents/skills/testing-magi-moni`; magi-moomoo: `.agents/skills/testing-moomoo-*` | jun (IAM). Rotate via `gcloud iam service-accounts keys create` and refresh every copy the same day. |

# Follow-ups

Tier 1 (this ledger, no token re-issue):

* Register the *not in Secret Manager* rows (`GRAFANA_ML_API_TOKEN`,
  `CLOUDFLARE_R2_CATALOG_TOKEN`, `MAGI_KNOWLEDGE_TOKEN`) in Secret Manager so
  the rule above holds for every row. `CLOUDFLARE_GLOBAL_API_KEY` is
  intentionally excluded until Tier 2 replaces it.
* Remove the `SIGIL_AUTH_TOKEN` OTLP fallback from `magi-moomoo`
  `scripts/start-bridge.sh` / `bridge/moomoo_bridge.py` and from magi-core
  `src/sigil.js` `buildOtlpExporterConfig()` once every deployment has
  `GRAFANA_OTLP_TOKEN` bound.
* Drop the `GRAFANA_ML_TOKEN` alias from magi-core `lib/secrets.js`.

Tier 2 (requires re-issuing real tokens — **human approval before any step**):

* Grafana: mint one Access Policy bundling `sigil:write` + `metrics:write` +
  `traces:write` (+ `logs:write`) so Sigil and OTLP share a single token, and
  a read-only Service Account for the ML datasource proxy instead of Admin.
* Cloudflare: replace `CLOUDFLARE_GLOBAL_API_KEY` with one scoped account API
  token (AI Search + R2 + AI Gateway read/write) and retire the Global Key.

# Related

* [cloudflare](cloudflare.md) — what each Cloudflare product is used for.
* [magi-moni](magi-moni.md) — `operate-tiala` runbook that motivated the
  source-of-truth rule.
* `dogmaai/magi-knowledge` `.agents/skills/syncing-spec-to-r2-data-catalog/SKILL.md`
  and `.agents/skills/configuring-cloudflare-ai-search/SKILL.md` — Cloudflare
  token operations.
