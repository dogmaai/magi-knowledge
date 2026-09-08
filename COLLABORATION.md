---
type: Workflow
title: MAGI development collaboration
description: Shared task ownership, handoff and review rules for GPT/Codex, Devin and Antigravity.
lilith_safe: false
tags: [workflow, collaboration, development, github]
---

# MAGI development collaboration

This document adds GPT/Codex to the existing
[Antigravity–Devin workflow](.agents/skills/collaborating-with-antigravity/SKILL.md).
It governs development work, not the PLM trading units. Repository-specific
instructions and Jun's explicit task instructions still apply. Access to an
API or a permissive app setting does not itself authorize a deployment.

## Shared reference

- `dogmaai/magi-knowledge` is already the authoritative shared specification.
  Start at [index.md](index.md); do not create another copy of the legacy
  `magi-stg` specification.
- Read the relevant concept documents and the target repository's `AGENTS.md`.
  Record the specification revision and implementation revision used in a PR.
- The specification describes intended behavior; source code and deployed
  configuration establish actual behavior. A mismatch is evidence to resolve,
  not permission to change either side silently.
- Keep approved implementation and corresponding reference docs aligned in
  linked PRs. Generated exports and Cloudflare mirrors remain derived copies.

## Ownership

| Actor | Default contribution |
|---|---|
| GPT / Codex | Scope tasks, inspect specs and code, implement bounded changes with tests, review Devin PRs. |
| Devin | Implement tasks needing its established environment or integrations, run cross-service verification, review GPT PRs. |
| Antigravity | Architecture, local debugging and review, as in the existing workflow. |
| Jun | Priorities, unresolved policy decisions, final approval and deployments under repository rules. |

Assignments can change with access and task needs. Use one implementation
owner per task; do not ask multiple agents to implement the same change.
Another agent reviews when the change affects the sensitive areas below.
Small documentation or cosmetic changes can use the normal repository checks
without an extra agent session.

## Task and handoff record

Use GitHub Issues and PRs as the shared record. Check open work before starting.
Each task should identify:

- goal and acceptance criteria;
- implementation owner and, when required, independent reviewer;
- affected repositories and paths;
- reference documents and commit revisions;
- commands needed for verification and any access blockers;
- the existing branch / PR when work is being handed off.

Do not invent access, a reviewer assignment or an agreement from another
agent. Update the same PR branch for review fixes. PR descriptions use
**Summary**, **Key Changes** and **Verification**, including checks not run
and their reason. Escalate unresolved architectural or trading-policy choices
to Jun with the conflicting sources and a specific decision to make.

Once agreement is reached, execute. Do not send acknowledgement-only replies
or restart an agreed discussion. Report again for a concrete result or a new
blocker.

## GitHub access for GPT / Codex

ChatGPT and Codex reach GitHub through the **ChatGPT Codex Connector**
GitHub App (`https://github.com/apps/chatgpt-codex-connector`, owner
`openai`). The App itself requests `issues: write`, `pull_requests: write`,
`contents: write` and `metadata: read`; those permissions cannot be edited
from this side. What Jun controls is the **installation** on the `dogmaai`
account (a User account, not an Organization):

- Reads of a public repository succeed even when that repository is not in the
  installation, because the connector falls back to public access. Writes
  (`POST /repos/{owner}/{repo}/issues`, comments, updates) use the
  installation token and fail with
  `403 Resource not accessible by integration` when the repository is missing
  from the installation or a permission update is still pending approval.
- Before treating such a 403 as a repository or PAT problem, open
  `https://github.com/settings/installations` → **ChatGPT Codex Connector** →
  **Configure** and confirm the repository is listed under *Repository access*
  and that no "requesting an update to its permissions" banner is pending.
  Adding the repository (or accepting the update) is the fix; no repository
  setting, PAT or GitHub Actions `GITHUB_TOKEN` change is involved.
- Verify with a minimal issue (`title: integration write test`) from ChatGPT
  and close it afterwards. Verified 2026-09-07 with
  `dogmaai/magi-knowledge#50` after adding the repository to the installation.

## Changes requiring independent review

Changes to trade guards, order execution, trading mode, risk configuration or
the LILITH data boundary require review by an agent other than the implementer
(or Jun). This includes behavior changes made through configuration, scripts
or specifications rather than only source code.

The following paths are an initial review inventory. Paths in other
repositories are references from this bundle, not a claim that their current
checkout has been verified. Verify and extend the inventory in each target
repository before translating it into CI path filters or CODEOWNERS.

| Repository | Paths / areas |
|---|---|
| magi-knowledge | `system/guards/**`, `system/constitution/**`, `system/plm-units/**` |
| magi-knowledge | `_lilith_safe/**`, `scripts/lilith_safe_loader.py`, `scripts/okf_common.py`, `scripts/okf_lint.py`, `scripts/test_lilith_safe_loader.py` |
| magi-knowledge | `scripts/okf_export.py`, `scripts/fit_distributions.py`, `scripts/ai_search_r2_sync.py`, `scripts/r2_catalog_sync.py`, `.github/workflows/**` |
| magi-core | `src/llm.js`, `src/paperGuards.js`, `src/session.js`, `src/positionMgmt.js`, `src/sellGuard.js` |
| magi-core | `lib/config.js`, `lib/constitution.js`, `lib/moomoo.js`, `lib/bigquery.js`, `lib/kill-switch.js`, `lib/daily-loss.js`, `lib/sellable_qty.js`, `lib/vix.js` |
| magi-core | `lib/confidence-band-guard.js`, `lib/short-entry-guard.js`, `lib/concerns-guard.js`, `lib/symbols.js`, `lib/excluded_symbols.js`, `.github/workflows/deploy.yml` |
| magi-moomoo | Order and broker-bridge handlers; resolve exact paths from that repository before setting up automated review routing. |
| magi-moni | `server.js` command handlers affecting trading or kill switches; verify current routing. |
| lilith-training | Training input selection, output rules and contamination checks; verify current paths before setting up automated review routing. |

This is a review policy, not installed branch protection. CODEOWNERS requires
actual eligible GitHub users/teams; model names are not GitHub reviewers.
Do not claim merge enforcement until the repository checks and rules are
configured and verified.

## Drift checks: extend before adding

Devin reports an existing `okf-drift` check in magi-core. Inspect its workflow,
implementation, coverage and tests before introducing `spec:check`.
A check/job name need not match a workflow filename.

If a machine-readable specification is needed, define it from verified
runtime sources and approved intended values. Record source revisions and
distinguish defaults, environment overrides and observed deployment settings.
Cron expressions must include time zones; model mappings must include
provider/unit identity and shadow/canary mode. Do not turn conflicting or
unverified documentation values into authoritative configuration.

Prefer extending the existing check. Report expected and actual values and
their sources; never auto-repair a discrepancy. Test a deliberate mismatch
as well as a matching fixture. No new `spec.yaml` or `spec:check` is implied
by this documentation change.

## Cost and operating boundaries

- Use an agent for investigation or judgment; use existing deterministic
  scripts for repeatable validation, formatting and transfer.
- Bound each task with acceptance criteria. Avoid duplicate implementation,
  repeated full-repository reads and agent-to-agent acknowledgement loops.
- Track development sessions separately from scheduled Devin research and
  MAGI's runtime LLM costs; subscription budgets are not evidence of actual
  spend or included capacity.
- Keep credentials out of chat, issues and committed files.
- Preserve the existing magi-core rule: code changes and GitHub push only;
  Jun runs deployments. Do not trigger production operations to test a
  documentation or drift-check change.
- `system/` must never flow into LILITH training. Training consumes only
  `_lilith_safe/` via the approved loader. Keep operator/development
  instructions outside the training tree.
