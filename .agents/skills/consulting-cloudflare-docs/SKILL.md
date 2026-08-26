---
name: consulting-cloudflare-docs
description: How to consult the local mirror of the official Cloudflare developer documentation (dogmaai/cloudflare-docs, a fork of cloudflare/cloudflare-docs) when working on anything Cloudflare-related — Workers, R2, R2 Data Catalog, D1, KV, Queues, AI Search, AI Gateway, Wrangler, the Cloudflare API, etc. Use it to look up authoritative API/product behavior instead of guessing or relying on web search.
type: Workflow
lilith_safe: false
tags: [workflow, cloudflare, docs, reference]
---

# Overview

`dogmaai/cloudflare-docs` is our fork of the official
[cloudflare/cloudflare-docs](https://github.com/cloudflare/cloudflare-docs)
repository — the source of <https://developers.cloudflare.com>. It contains
the full documentation corpus (5,400+ MDX pages) and is the authoritative
reference for any Cloudflare question that comes up while working on the MAGI
system (R2 Data Catalog sync, Workers, AI Search, API token scopes, etc.).

Prefer grepping this repo over web search: it is exhaustive, versioned, and
searchable offline.

# Getting the docs

```bash
git clone --depth 1 https://github.com/dogmaai/cloudflare-docs.git ~/repos/cloudflare-docs
```

Note: the primary branch is `production` (not `main`). The checkout is ~56 MB
of MDX under `src/content/docs/`. To pick up upstream updates, sync the fork
on GitHub or pull from `cloudflare/cloudflare-docs` `production`.

# Where things live

- Docs pages: `src/content/docs/{product}/**/*.mdx` — one directory per
  product (`r2/`, `workers/`, `d1/`, `kv/`, `queues/`, `ai-search/`,
  `ai-gateway/`, `fundamentals/`, `api-shield/`, ~109 products total).
- Reusable snippets: `src/content/partials/{product}/` — page bodies often
  `import`/render these, so search both trees.
- Product changelogs: `src/content/changelog/{product}/`.
- Pages are MDX with YAML frontmatter (`title`, `description`,
  `pcx_content_type`); the URL path mirrors the file path, e.g.
  `src/content/docs/r2/data-catalog/index.mdx` →
  `developers.cloudflare.com/r2/data-catalog/`.

# Examples relevant to MAGI

- R2 Data Catalog (Iceberg REST catalog used by `okf.system`):
  `src/content/docs/r2/data-catalog/`
- R2 API tokens & S3 credential derivation: `src/content/docs/r2/api/tokens.mdx`
- AI Search (R2 source sync): `src/content/docs/ai-search/`
- Cloudflare API auth (Bearer vs X-Auth-Key): `src/content/docs/fundamentals/api/`

```bash
grep -ril "data catalog" ~/repos/cloudflare-docs/src/content/docs/r2/ | head
```

# Boundaries

- This fork is a **read-only reference** for MAGI work. Do not commit MAGI
  spec content into it; the MAGI spec lives in `magi-knowledge`.
- If contributing docs changes upstream, follow that repo's own
  `AGENTS.md` / `.agents/skills/contributing/` conventions (PRs target
  `production`).
