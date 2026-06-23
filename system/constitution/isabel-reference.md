---
type: Constitution Section
title: "ISABEL REFERENCE - Advisory Only"
description: Runtime-injected ISABEL feedback block -- dynamic, not stored in OKF.
lilith_safe: false
tags: [constitution, v3, plm, isabel, dynamic]
section_order: 13
version: "3.0"
source: magi-core/lib/constitution.js
dynamic: true
---

# ISABEL REFERENCE - Advisory Only

**This section is dynamic** -- the content is injected at runtime from the
`isabelFeedback` parameter passed to `buildSwingConstitution()`.

The prompt template is:

```text
[ISABEL REFERENCE - Advisory Only]
${isabelFeedback || "No pattern data available yet."}
```

The feedback block typically contains:

- **Strengths**: symbol/side combos with high historical win rates.
- **Do-not-trade**: symbol/side combos with poor historical performance.
- **Patterns**: ISABEL-mined patterns (centroids, embeddings).

When no data is available, the fallback text is:
`"No pattern data available yet."`

# Cross-references

* [isabel-gateway](isabel-gateway.md) -- the constitutional directive to
  consult ISABEL.
* ISABEL service: [magi-isabel](/system/services/magi-isabel.md).
* ISABEL patterns table: [isabel-patterns](/system/echidna-tables/isabel-patterns.md).

# Citations

* Runtime builder: `buildSwingConstitution(isabelFeedback)` in
  `magi-core/lib/constitution.js`.
* Feedback assembler: `magi-core/src/isabel.js`.
