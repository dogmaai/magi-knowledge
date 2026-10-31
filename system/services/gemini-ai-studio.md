---
type: Service
title: Gemini AI Studio API Policy
description: AI Studio-only Gemini generation for MAGI research and analysis, with explicit API-key authentication.
lilith_safe: false
status: draft
generated: { by: codex/cloud, at: 2026-10-29T12:02:14Z }
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
* The Gemini analyzer validates generation configuration before table/schema
  work. HERMES returns its existing unavailable-result value on generation
  errors; DAPHNE retains its existing per-provider narrative failure handling.
* The retired analyzer selectors `GEMINI_VERTEX_MODEL` and
  `GEMINI_VERTEX_REGION` are no longer read. Existing model selectors remain
  `GEMINI_ANALYZER_MODEL`, `HERMES_GEMINI_MODEL`, `DAPHNE_GEMINI_MODEL`, and
  `GEMINI_MODEL` for the trading provider.
* Analyzer retry/backoff, concurrency/rate limits, token budgets and truncation
  handling remain in place. Exhausted retries never cause a backend switch.
* BigQuery, Cloud Run and other GCP authentication are separate from Gemini
  generation and retain their existing configuration. No infrastructure,
  credential, trading-mode, table/schema, RECON or LILITH-boundary change is
  implied by this policy.

# Reference revisions

Implementation base: magi-core `7a8175a9f0885f313a2157e80dd7de654fc9e88a`.
Pinned OKF: `c00baf0b4be1766536923aa41c13ffa4196e5cbb`.

The pinned [DAPHNE concept](/system/echidna-tables/daphne-feedback.md)
described Gemini as Vertex; the implementation already used AI Studio.
That description is corrected alongside this draft. HERMES macro still had
a Vertex SDK client and the Gemini analyzer had a Vertex fallback at the
implementation base; removing those paths implements Jun's new instruction.

# Citations

* `magi-core/lib/gemini-api.js` — shared AI Studio connection settings.
* `magi-core/src/hermes.js` — macro grounding and news analysis.
* `magi-core/daphne-analyzer.js` — loss narrative and hint generation.
* `magi-core/jobs/gemini-analyzer/` — pattern analysis and bounded retries.
* [magi-core](magi-core.md),
  [Gemini pattern analysis](/system/echidna-tables/gemini-pattern-analysis.md).
