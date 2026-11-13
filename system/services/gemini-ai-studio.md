---
type: Service
title: Gemini AI Studio API Policy
description: AI Studio-only Gemini generation for MAGI research and analysis, with explicit API-key authentication.
lilith_safe: false
status: draft
generated: { by: devin/cloud, at: 2026-11-13T00:33:08Z }
stale_after: 2027-04-29T12:02:14Z
tags: [service, gemini, ai-studio, hermes, daphne, analysis]
repo: dogmaai/magi-core
---

# Policy

Jun's 2026-10-29 instruction: Vertex AI cannot be used; Gemini generation
must use **Google AI Studio**. This applies to the Gemini trading provider,
HERMES news/macro analysis, DAPHNE narratives and hint rewriting, the Gemini
pattern analyzer, and Gemini health probes. Models and their role assignments
are unchanged by this connection-policy change.

This is a **draft implementation update**, not a statement that the new
code is deployed or human-verified.

# Pending Kimi cutover

The consumer list above records the pre-cutover Gemini scope. Jun's
2026-11-09 decision moves DAPHNE narratives / hint rewriting and the batch
pattern analyzer to Kimi K3.1 Pro only on Jun-approved merge + deploy of
[magi-core#713](https://github.com/dogmaai/magi-core/pull/713). Until that
cutover, their Gemini paths remain the baseline; the citations below do not
establish a completed migration.

After cutover, those two analyzers are outside this Gemini connection policy.
The Gemini trading provider, HERMES and Gemini health probes remain in scope;
no PLM model change or retirement of Gemini as a whole is implied. Kimi's
separate request configuration is defined in `magi-core/lib/kimi-analysis.js`.

# Connection and failure behavior

* Generation uses `generativelanguage.googleapis.com` with `GEMINI_API_KEY`.
  REST analyzers authenticate with `x-goog-api-key`; HERMES macro uses the
  Google Gen AI SDK configured with the API key, explicit `vertexai: false`,
  and the AI Studio base URL.
* HERMES macro retains Google Search Grounding and its existing report format.
  Its SDK configuration cannot be switched to Vertex by an inherited
  `GOOGLE_GENAI_USE_VERTEXAI` variable or SDK base-URL environment overrides.
* The shared research/analyzer client accepts `GEMINI_API_MODE` unset/blank or
  `aistudio`; another backend value is an explicit configuration error. Missing
  API keys never fall back to project/ADC generation credentials.
* HERMES returns its existing unavailable-result value on generation errors.
  Before the Kimi cutover, the Gemini analyzer validates generation
  configuration before table/schema work and DAPHNE retains its per-provider
  Gemini narrative failure handling. These are historical Gemini analyzer
  contracts after cutover, not descriptions of the Kimi implementation.
* The retired analyzer selectors `GEMINI_VERTEX_MODEL` and
  `GEMINI_VERTEX_REGION` are no longer read. `HERMES_GEMINI_MODEL` and
  `GEMINI_MODEL` (trading provider) remain Gemini model selectors after
  cutover. `GEMINI_ANALYZER_MODEL` and `DAPHNE_GEMINI_MODEL` apply only to the
  old analyzer paths and retire with them; the replacement instead uses
  `KIMI_ANALYZER_MODEL`, not either Gemini analyzer selector.
* The pre-cutover Gemini analyzer retry/backoff, concurrency/rate limits,
  token budgets and truncation handling were retained by the AI Studio
  connection-policy change. They do not configure the Kimi replacement.
  Exhausted Gemini retries never cause a backend switch.
* BigQuery, Cloud Run and other GCP authentication are separate from Gemini
  generation and retain their existing configuration. No infrastructure,
  credential, trading-mode, table/schema, RECON or LILITH-boundary change is
  implied by this policy.

# Reference revisions

Historical AI Studio migration implementation base:
magi-core `7a8175a9f0885f313a2157e80dd7de654fc9e88a`.
Pinned OKF: `c00baf0b4be1766536923aa41c13ffa4196e5cbb`.

The pinned [DAPHNE concept](/system/echidna-tables/daphne-feedback.md)
described Gemini as Vertex; the implementation already used AI Studio.
That description is corrected alongside this draft. HERMES macro still had
a Vertex SDK client and the Gemini analyzer had a Vertex fallback at the
implementation base; removing those paths implements Jun's new instruction.

Pending Kimi implementation: magi-core#713 at
`5e31e197a41d266a1f20955ed34e21e942a12ac2` (OKF pin
`437d1d68a7f0f157ff88180ba9be721025760f37`). This source comparison is not
verification of a production cutover.

# Citations

* `magi-core/lib/gemini-api.js` — shared AI Studio connection settings.
* `magi-core/src/hermes.js` — macro grounding and news analysis.
* `magi-core/daphne-analyzer.js` — pre-cutover Gemini loss narrative and hint
  generation; replaced by Kimi `kimi-analyzer.js` on magi-core#713 deployment.
* `magi-core/jobs/gemini-analyzer/` — pre-cutover pattern analysis and bounded
  retries; removed on magi-core#713 deployment. Historical rows stay in
  [Gemini pattern analysis](/system/echidna-tables/gemini-pattern-analysis.md).
* [magi-core](magi-core.md),
  [Gemini pattern analysis](/system/echidna-tables/gemini-pattern-analysis.md).
