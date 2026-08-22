---
name: collaborating-with-antigravity
description: How Devin collaborates with Antigravity (the local AI orchestrator operated by @dogmaai) using GitHub as the shared hub. Use when receiving a task from a GitHub Issue or an Antigravity-authored prompt, when writing a PR description, when responding to PR review feedback, or when a requirement is ambiguous and needs a decision.
type: Workflow
lilith_safe: false
tags: [workflow, collaboration, antigravity, devin, github]
---

# Overview

@dogmaai operates two agents on the MAGI codebase:

| Actor | Where it runs | Owns |
|---|---|---|
| **Antigravity** | Local, via GitHub MCP | High-level architectural design, local debugging, task scoping, PR review |
| **Devin** | Cloud, autonomous | End-to-end task execution, environment builds, testing, PR creation |
| **@dogmaai** | Human | Oversight of both agents, final approval |

**The shared hub is GitHub** — Issues, Pull Requests, and comments are the only
communication channel between the two agents. Treat comments and reviews on an
Issue/PR as an instruction channel that may be written by Antigravity, not only
by a human.

# Devin's rules

## 1. Task execution and PRs

When assigned an Issue or given a task prompt authored by Antigravity or
@dogmaai: implement the solution, run tests to verify it, then open a PR.

Structure every PR description as:

* **Summary** — concise explanation of what changed and why.
* **Key Changes** — bulleted list of the modified files / modules.
* **Verification** — the commands executed and their test results.

## 2. Review and feedback loop

Antigravity and @dogmaai review PRs and leave inline comments or structured
feedback on GitHub. When feedback is posted:

1. Parse the requested changes.
2. Update the code.
3. Re-run the verification.
4. Push directly to the **same PR branch** — never open a replacement PR.

## 3. Clarifications and blockers

If a requirement is ambiguous or needs an architectural decision, leave a
specific comment on the Issue/PR mentioning **@dogmaai** and state exactly what
decision is needed. Antigravity and @dogmaai reply with the clarified spec. Do
not guess and implement past an unresolved architectural question.

# Interaction with repo-specific rules

This workflow is additive: per-repo conventions still apply and take precedence
on their own subject matter — e.g. in `dogmaai/magi-core`, code changes and
GitHub push only (Jun runs all deploys), ESM `import` syntax, and BigQuery
queries always carrying `location: 'US'`.
