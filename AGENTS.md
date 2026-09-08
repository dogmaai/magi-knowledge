---
type: Workflow
title: Agent instructions for magi-knowledge
description: Entry point and validation rules for development agents working on the MAGI knowledge bundle.
lilith_safe: false
tags: [workflow, agents, development]
---

# Agent instructions

Read [index.md](index.md), [README.md](README.md) and
[COLLABORATION.md](COLLABORATION.md) before changing this bundle.
Then read the relevant documents under `system/` or `_lilith_safe/`.

- This repository is the shared specification. The old `magi-stg`
  specification is archived; exports and Cloudflare mirrors are derived.
- Check open Issues/PRs before starting. Use one implementation owner and
  preserve the existing branch on handoff or review fixes.
- Preserve the LILITH contamination boundary. Never copy full-system
  knowledge or development instructions into `_lilith_safe/`.
- Concept Markdown requires a non-empty `type` frontmatter field.
  `system/` concepts use `lilith_safe: false`; training concepts use
  `lilith_safe: true`. Follow the reserved-file rules in `okf_common.py`.
- Compare disputed values against the implementation and record the source
  revision. If access is blocked, report it; do not guess current defaults,
  deployed settings or the resolution of a policy conflict.
- Sensitive changes require independent review as listed in
  [COLLABORATION.md](COLLABORATION.md). Repository-specific deployment rules
  continue to apply; this document grants no production-operation authority.
- Update the relevant concept documents and `log.md` for approved changes.
  Regenerate exports rather than editing generated copies.

Run the existing gates from the repository root:

```bash
python scripts/okf_lint.py
python scripts/test_lilith_safe_loader.py
```

Report the actual results in the PR, using Summary, Key Changes and
Verification. Stop acknowledgement loops once agreement is reached.
