---
type: Workflow
title: Telegram to Discord staged migration
description: Cutover, acceptance, rollback and retirement gates for OpenClaw and MAGI communications.
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-11-13T01:30:00Z }
tags: [discord, telegram, migration, operations, aka-1]
---

# Scope and authority

Jun selected Discord and separate applications for OpenClaw and MAGI operations
in Devin session `9b1f896e65e140a99f39aad19b30587a`. The direction is approved;
the MAGI side was deployed on 2026-11-12 and passed the option-A delivery
tests on 2026-11-13 (see [Live status](#live-status-2026-11-13)); OpenClaw's
side (gates 7–8) and gate 5 are **not yet done**. This document stays `draft`:
the live evidence below is recorded by an agent and has no `verified` entry.
The existing stable service/guard/table concepts remain the baseline until the
replacement is accepted. Production deployment, IAM, Scheduler and secret changes
are Jun's operation, not authorized by this document.

## Jun's decisions (2026-11-08, Claude session)

Jun decided the following in a Claude session on 2026-11-08 (JST), after the
Devin session above chose Discord; these are separate, later decisions. The
rest of this draft has been updated to match them.

1. **Retire every Telegram route.** OpenClaw conversations and cron
   announcements, AKA-1 (magi-moni) and all MAGI notifications move to
   Discord. Telegram is removed, not kept as a fallback.
2. **No parallel operation.** No producer or command path ever delivers to
   or accepts from both Telegram and Discord, including during acceptance:
   each producer switches to Discord in the same deployment that removes its
   Telegram path (the cleanup PRs), so "staged" in gate 6 means producer by
   producer, never duplicated. State C (Telegram rollback) is **retired**.
3. **Mitigation for the lost rollback: option A.** Before the cutover is
   considered complete, Jun runs a live delivery test of **every** producer
   to its Discord destination and confirms the watchdog's Discord path. These
   checks are mandatory acceptance criteria, not optional smoke tests. No
   secondary out-of-band alert channel is added (option B was not chosen).
   Jun accepts the consequence: if Discord delivery later fails (for example a
   revoked webhook), the failure is visible only in Cloud Logging until
   someone looks.
4. **Clean up the Telegram code and configuration.** Removal changes are
   prepared as PRs stacked on the companion implementation PRs
   ([magi-core#710](https://github.com/dogmaai/magi-core/pull/710),
   [magi-moni#59](https://github.com/dogmaai/magi-moni/pull/59)) and are merged
   into the companion branches first, so each repository reaches `main` (and
   deploys) once, already Telegram-free. Because
   they leave no Telegram path, they deploy only after Jun has provisioned
   the Discord secrets (gate 2 below), and the option-A tests run
   immediately after that deployment.

Further decisions (Jun, 2026-11-09, Claude session):

5. **magi-moni runs as a single Cloud Run instance** (`--max-instances 1`) so
   pending approvals stay process-local without a shared store. A deployment
   or restart still drops pending approvals (fail closed); request again.
6. **`scripts/operate-tiala.js` becomes read-only** (status and screenshot).
   Its restart, command and GUI operations are removed; TIALA mutations go
   only through Discord with Jun's confirmation button.
7. **OpenClaw's Telegram channel is retired too** (decision 1 covers it): it
   switches to Discord in one step, with no parallel period.

A magi-moni reply produced outside a Discord interaction is dropped, never
sent to the notification webhook, so operator-only content cannot leak there.

## Revisions referenced

| Revision | Role |
|---|---|
| `b118744a0765a0b03c63ecb7adf56791e0960715` | `magi-knowledge` main when this documentation branch was created and re-checked; base of this change. |
| `437d1d68a7f0f157ff88180ba9be721025760f37` | magi-core's existing `vendor/magi-knowledge` pin. It is older than `b118744` and is **not** advanced by this change. |
| `4035ac393d30a1135e48f64a7f2636ee1d6ba105` | magi-knowledge main at task start; task-fixed reference for magi-moni, which has no pin. |
| magi-core `84ab0a0f4c3111d04d234a0da490541f8e9675db` | Inspected pre-change implementation (Telegram-only notifications). |
| magi-moni `2ec39dcda90641bc250e51b0108a96b4d36a5f31` | Inspected pre-change implementation (Telegram AKA-1, `confirmed=true` drift). |

Between these three OKF revisions, the relevant stable service/guard/table
concepts are identical except `system/services/magi-core.md`, which gained
unrelated content in `b118744`.

## Implementation states

Statements in this document belong to one of three states. Only state A was
inspected; nothing in states B or C is deployed or live-verified.

| State | Revisions | Behavior |
|---|---|---|
| **A. Inspected pre-change code** | core `84ab0a0`, moni `2ec39dc` | Telegram for all channels. Contrary to the stable [order approvals](../echidna-tables/order-approvals.md) Notes, moni `lib/tools.js` issues an approval token on model `confirmed=true` (drift). Which revision production runs was not verified. |
| **B. Deployed (2026-11-12)** | [magi-core#708](https://github.com/dogmaai/magi-core/pull/708) → `208e3c5`, [magi-moni#58](https://github.com/dogmaai/magi-moni/pull/58) → `4fc17bb` (cleanup PRs folded in) | The Discord behavior below. Unit-tested, independently reviewed, deployed; live acceptance per [Live status](#live-status-2026-11-13). |
| **C. Rollback (retired 2026-11-08)** | Same revisions as B | Formerly `NOTIFICATION_TRANSPORT=telegram` and the retained Telegram webhook. Retired by Jun's decision above: no Telegram rollback and no parallel operation. This code exists only on the companion branches and never reaches `main`: the cleanup PRs are folded in before merge. |

Reverting moni to state A is **not** a sanctioned rollback because it
reinstates the `confirmed=true` drift; it requires Jun's explicit decision.
State C is retired by Jun's decision, so there is no Telegram rollback path.
(The Devin session reported the Telegram account as deleted; that is not
verified here, and the external webhook, Bot configuration and secrets remain
Jun's pending physical deletions.)

Everything in the following sections up to the cutover gates describes
**state B**, unless marked otherwise. State B is now deployed (see below).

## Live status (2026-11-13)

Recorded from Cloud Run configuration, Cloud Logging and Jun's Discord
observations; details and times are in [log.md](../../log.md) (2026-11-13
entry). Not human-verified as a concept change.

| Item | State |
|---|---|
| Deployed revisions | magi-core `208e3c5d8420859c9b77f8d8e42c8746f45b209a` (#708 with #710), magi-moni `4fc17bbdeb02a421b235142bde890c050a0399ff` (#58 with #59 and a deploy fix binding `DISCORD_WEBHOOK_URL` on every deploy), 2026-11-12. |
| magi-moni instances | `--max-instances 1` confirmed on the service (decision 5). |
| MAGI application | A separate **MAGI Ops** application, created 2026-11-12 after magi-moni was found configured with OpenClaw's `aka` application (corrected; `aka`'s Interactions Endpoint URL cleared, registration token replaced). The owner check had held a username instead of the numeric user ID (fail closed, corrected). |
| Gate 1 | CI green on both companion PRs; Jun approved the merges. |
| Gate 2 | Done: MAGI Ops application, its configuration, the registration token and the notification webhook secret exist. |
| Gate 3 | Done 2026-11-12 17:41 JST: signed PING verified, 11 guild commands registered. Channel privacy relies on Discord channel permissions; MAGI Ops needed explicit view access to the private operations channel before its commands appeared. |
| Gate 4 | Partly: `/help` answered for Jun in the operations channel. Rejection of other users/guilds/channels and button replay were not exercised live (unit-tested only). |
| Gate 5 | **Open**: `/kill`, `/resume` not exercised. |
| Gate 6 | **Passed** (option A): every live MAGI producer delivered to Discord, confirmed by Jun and Cloud Logging; anomaly-only and muted producers were exercised with one-off `[TEST]` sends from their own jobs. magi-moni's daily/weekly report endpoints have no scheduler caller (pre-existing) and are recorded as not live, by Jun's decision. |
| Gates 7–8 | **Open**. Read-only TIALA check 2026-11-13 (TIALA Claude CLI): OpenClaw's Discord channel (the `aka` application) has been stopped since 2026-11-12 17:08 JST on gateway close code 4004 (invalid bot token) — most likely `aka`'s token was reset during the MAGI Ops correction, when `aka` was still the only application; this is why `aka`'s `/help` did not respond. No Discord inbound conversation has ever been processed by OpenClaw, and its owner allowlist has no Discord entry yet. Gate 8 inventory: no active LaunchAgent or crontab references Telegram; the remaining Telegram producers are OpenClaw's Telegram channel and three OpenClaw cron jobs (chat-log save, daily memory update, memory backup report), all three disabled since 2026-11-08 after repeated failures caused by unresolved model IDs (gate 7). **Progress 2026-11-13 (Jun-approved, TIALA CLI)**: OpenClaw's Telegram channel disabled 09:28 JST; `aka`'s bot token re-issued by Jun and installed, Discord owner allowlist added, Gateway restarted 09:36 JST (`gateway.mode` unchanged); Discord connected as `aka`, and in Jun's DM `/help` (09:38) and a conversation (09:39) were answered. Still open in gate 7: model IDs (memory crons), `aka`'s Discord permissions review, scheduled announcements to Discord. |
| Gate 9 | MAGI side done 2026-11-13: Telegram webhook already absent, Telegram secret bindings removed from every Cloud Run service and job, Telegram secrets deleted. OpenClaw holds its own Telegram bot credential in its configuration, so OpenClaw/TIALA Telegram destinations remain (gates 7–8). |

Inventory gap found during gate 9: `magi-alert-webhook`, a Cloud Monitoring
alert relay to Telegram deployed from source outside the repositories, was not
listed below. It had not delivered for at least 30 days and was retired by
Jun (service deleted). A replacement destination for those Cloud Monitoring
alerts is a separate follow-up.

# Channel separation

- **OpenClaw**: existing `aka` application for Jun-only conversations and cron
  announcements. Preserve the existing agent, workspace and memory. Do not create
  a second agent or assume a new Discord session inherits Telegram's recent chat.
- **MAGI operations**: a distinct Discord application for AKA-1 slash commands,
  read-only tools and explicit operator approvals. Do not overwrite `aka`'s
  application commands. No Administrator permission or message-content intent is
  required for the interaction endpoint.
- **MAGI notifications**: a webhook to a private Jun-only channel for reports and
  monitoring alerts. Treat the webhook URL as a secret. Separate webhooks/channels
  can be chosen by Jun per producer; this plan does not grant channel permissions.

# MAGI operations boundary

The HTTP interaction endpoint validates Ed25519 over the exact raw body and
timestamp, rejects timestamps outside five minutes, then checks application ID,
Jun's Discord user ID, guild ID and private operations channel ID. Missing
configuration rejects access. Discord PING receives a signed-request-validated
PONG. No Discord application token or interaction token is exposed to the LLM.

`/ask` preserves AKA-1 read-only tools. Model-generated `confirmed=true` and
natural-language assent are not authorization, including on the companion
PRs' Telegram model path (unlike state A); that path is removed by the cleanup PRs. Mutations are proposed with an immutable parameter snapshot
and an ephemeral confirm/cancel button. Confirmation is bound to the authenticated
actor, guild, channel, exact operation/parameters, random nonce and 60-second TTL;
it is removed before execution. The backend passes a single-use, parameter-bound
capability to the tool, not an LLM-controlled boolean. New tools default to
requiring confirmation unless explicitly classified read-only.

`/kill` is an authenticated immediate stop. `/resume` always requires the button.
Natural-language mutations, including a proposed emergency stop, use the button;
AKA-1 must direct urgent users to `/kill`. Audit identities are `discord:<user>`.
Order tokens remain bound to symbol/side/quantity and retain the existing
60-second broker-gate TTL. The existing L0 and order-gate failure/unknown-state
behavior is not weakened. BigQuery schemas, trading modes, policy thresholds,
guard logic and LILITH boundaries are unchanged.

Pending confirmations are intentionally **process-local**, not durable storage.
Work and proposals start only after Discord accepts the one-shot interaction
callback. Duplicate delivery/uncertain ACK acceptance does no work.
The HTTP request remains open until command execution and followup delivery
finish, including after headers are flushed; work must not depend on Cloud Run
CPU after the response ends. `/report` calls the existing daily report generator.
Concurrent
button presses consume the local pending entry once. Restart, deployment, expiry
or routing the click to another instance fails closed; decision 5 pins
magi-moni to one instance so routing elsewhere does not occur in normal
operation. A replacement operation
must be requested explicitly after checking actual state; never auto-retry a
mutation after an uncertain result. This is not broker exactly-once execution.
Jun must review this safety/availability trade-off before enabling operations.

# Notification contract

- Companion PRs: `NOTIFICATION_TRANSPORT=telegram|discord`; unset preserves
  Telegram. Cleanup PRs remove the selector and the Telegram branch, leaving
  Discord as the only transport. Invalid/missing Discord configuration never
  falls back to another channel; it fails and is logged.
- `DISCORD_WEBHOOK_URL` is a Secret Manager binding. Restrict destinations to
  HTTPS `discord.com/api/webhooks/<id>/<token>`; never log the URL or API token.
- Use `allowed_mentions: {parse: []}` and split messages within 2,000 UTF-16 units
  without splitting surrogate pairs. Preserve escaped data when removing the
  Telegram formatting subset. Treat any rejected/timed-out chunk as failure.
- Core categories and default suppression remain unchanged.
  `NOTIFICATION_MUTED_CATEGORIES` is the only mute setting (default `TRADE,OPS`);
  the cleanup PRs remove `TELEGRAM_MUTED_CATEGORIES` and move its production
  values to the new name.
  Monitoring cooldown/deduplication behavior must remain unchanged.
- Migrate shared JavaScript callers, watchdog, direct Python Optuna senders,
  daily/weekly reports, bridge down/recovery alerts and host alerts.
- In the companion PR, core deployment selects the transport's secret bindings
  through the GitHub `NOTIFICATION_TRANSPORT` variable. The cleanup PR removes
  that variable and binds only `DISCORD_WEBHOOK_URL`; the single `main` deployment
  of the companion PR with the cleanup folded in is the switch.
  Jun provisions the secret before deploying. MAGI moni uses `--update-env-vars` so future
  deployments retain Jun's Discord configuration instead of erasing it.

# Cutover gates (Jun-operated)

1. Review linked implementation PRs and independent review of approval issuance,
   L0 command authorization, and notification failure handling. Run unit tests,
   static checks and OKF gates. Telegram rollback is retired (Jun 2026-11-08);
   the Telegram removal PRs deploy only after the step 2 secrets exist.
2. Create the separate MAGI application. Configure its public key, application ID,
   owner user ID, guild and private channel IDs. Store `MAGI_DISCORD_BOT_TOKEN`
   securely only for command registration; never overwrite or reuse OpenClaw's
   `DISCORD_BOT_TOKEN`. Run registration
   dry-run first; the explicit `--apply` replaces only the MAGI guild commands.
   Also create the private notification webhook secret `DISCORD_WEBHOOK_URL` now:
   no repository may deploy Telegram-free code before it exists.
3. Jun deploys magi-moni with the cleanup PR already folded into the companion
   PR (magi-moni#59 merged into #58's branch, then #58 to `main`), so the Discord
   endpoint goes live in the same deployment that removes the Telegram webhook.
   Then Jun sets Interactions Endpoint URL to `/webhook/discord`
   and verifies Discord's signed PING challenge. Ensure commands are visible only
   as intended. Verify the channel is actually private in Discord permissions;
   an endpoint allowlist alone does not make a public channel private.
4. Verify `/ask`, read-only commands, text chunking and a screenshot; other users,
   applications, guilds and channels must be rejected. Verify confirmed buttons
   cannot be replayed, altered, used after expiry or used by another user.
5. Jun validates `/kill`, status read-back and `/resume` in an explicitly agreed
   maintenance window; do not toggle trading controls merely to test deployment.
   Validate a simulated order/approval only with explicit approval and a mocked
   or safely isolated broker. Verify failure of approvals storage blocks orders.
6. Using the `DISCORD_WEBHOOK_URL` secret from step 2, the
   switch itself is the cleanup PRs' deployment, one repository at a time
   (magi-moni at step 3; magi-core here, magi-core#708 with #710 folded in); each deployment moves its producers to
   Discord and removes their Telegram path together. Preserve category mutes. Verify a critical
   alert, down/recovery path, scheduler report failure, cooldown and long report.
   Avoid duplicate production alerts during acceptance.
   **Mandatory (option A, Jun 2026-11-08):** a live delivery test of every
   producer to its Discord destination, plus the watchdog's Discord path, passes
   before the cutover is declared complete. Record the date and producer list in
   `log.md`. There is no Telegram fallback, so a failed producer is fixed on
   Discord before proceeding.
7. Approve the OpenClaw operator device in Settings → Devices, inspect configuration,
   channel/plugin support, current agent/workspace and models. Resolve the observed
   unresolved model identifiers with Jun before changing models. Configure Jun-only
   Discord access through the approved device. Verify a conversation, agent identity,
   memory recall and a scheduled announcement against the preserved workspace.
   *Status 2026-11-09:* the operator device `Devin Discord migration` is paired
   (approved by Jun 2026-11-08 17:42 JST); two extra `Devin Discord config write`
   devices were removed by Jun on 2026-11-09. The remaining checks in this step
   are not yet recorded. A Discord send test from the `aka` Bot via the Discord
   API (not through OpenClaw) reached Jun on 2026-11-08; it proves only the send
   path. Details and the 2026-11-08 Gateway outage: [tiala-host](tiala-host.md).
8. Enumerate **live** OpenClaw cron destinations and TIALA LaunchAgents. The existing
   `aka-memory` and `tiala-host` draft descriptions are hypotheses, not proof of live
   Telegram producers. Never commit keys.
9. After every producer passes the option-A tests, Jun removes what the
   repositories cannot: the external Telegram webhook and Bot configuration,
   remaining OpenClaw/TIALA Telegram destinations, Cloud Run Telegram env and
   secret bindings, and finally the Secret Manager entries. The cleanup PRs
   have already removed the Telegram routes and send code. Keep retirement
   tracking open until Jun confirms these physical deletions.

# Retirement inventory and rollback

| Surface | Before acceptance | After Jun confirms acceptance |
|---|---|---|
| OpenClaw Telegram channel | Switch to Discord in one step once the Discord channel is configured (no parallel) | Remove token binding/config and all Telegram announce targets |
| TIALA cron/LaunchAgents | Inspect live inventory; keep unrelated memory jobs | Retire only verified Telegram-specific producers; retain memory/runtime |
| moni webhook/setup | Done: #58 deployed (model mutations fail closed); Telegram webhook confirmed absent 2026-11-13 | — |
| moni reports | Discord-only since #58; daily/weekly endpoints have no scheduler caller (not live) | Telegram bindings removed 2026-11-13; recreating a schedule is a separate task |
| core JavaScript/Python | Done: Discord is the only transport since `208e3c5`; mutes preserved | Rename remaining Telegram-named modules/identifiers in a later follow-up |
| bridge/host monitor jobs | Done: Discord binding deployed with `208e3c5`; test sends delivered 2026-11-13 | Down/recovery alerts on Discord not yet observed live |
| Secret Manager | No rollback interval (no Telegram rollback) | Done 2026-11-13: Telegram secrets deleted after no service or job bound them |
| Cloud Monitoring alert relay (`magi-alert-webhook`) | Not in the original inventory | Retired 2026-11-13 (service deleted); new alert destination is a follow-up |
| AKA-1 order gate / L0 / tables | Keep fail-closed semantics and schemas | Keep; these are not retirement targets |
| OKF / consumer pins | Live evidence recorded (this section, log.md) | Stable service/guard/table concepts carry an unverified status pointer; Jun re-verifies their channel wording, then pins advance explicitly |

There is no Telegram rollback (state C retired, Jun 2026-11-08). A failed
Discord rollout is fixed forward on Discord, never by restoring Telegram and
never by reverting moni to state A without Jun's decision. The option-A live
delivery tests are the safeguard. Keep the authenticated OpenClaw browser
interface as a recovery path. A failed Discord rollout pauses retirement; it never triggers
automatic trading actions, new Bot creation, or secret deletion.

# Sources

- [Discord interaction responses](https://docs.discord.com/developers/interactions/receiving-and-responding)
- [OpenClaw Discord setup](https://docs.openclaw.ai/channels/discord/setup)
- [magi-moni](magi-moni.md), [magi-core](magi-core.md)
- [L0 kill switch](../guards/l0-kill-switch.md), [system control](../echidna-tables/system-control.md)
- [order approvals](../echidna-tables/order-approvals.md)
