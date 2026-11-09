---
name: kimi-api-reference
description: Kimi Open Platform API reference for magi-core. Covers the OpenAI-compatible HTTP API, authentication, SDK initialization, request/response format, error handling, all documented endpoints, and the Kimi K3.1 Pro model (reasoning_effort, fixed sampling params, K2 retirement). Use when adding, modifying, or debugging the Kimi PLM provider or any other Kimi API integration.
type: Reference
lilith_safe: false
tags: [reference, kimi, moonshot, api, plm, k3.1-pro]
---

# Kimi Open Platform API Reference

Official docs index: https://platform.kimi.ai/docs/llms.txt

## Service Address

```
https://api.moonshot.ai
```

Kimi Open Platform provides OpenAI-compatible HTTP APIs. You can use the OpenAI SDK directly.

When using SDKs, set `base_url` to `https://api.moonshot.ai/v1`. When calling HTTP endpoints directly, use the full path such as `https://api.moonshot.ai/v1/chat/completions`.

## OpenAI Compatibility

Our API is compatible with the OpenAI Chat Completions API in request/response format. This means:

* You can use the official OpenAI SDKs (Python / Node.js) directly
* Most OpenAI-compatible third-party tools and frameworks (LangChain, Dify, Coze, etc.) are supported
* Simply point `base_url` to `https://api.moonshot.ai/v1` to switch

<Note>
  Some parameters are Kimi-specific extensions: the `thinking` parameter needs to be passed via the SDK's `extra_body`; `partial` is a field on assistant messages within the messages array (`"partial": true`), not a top-level request parameter. See [Tool Use](/api/tool-use) and [Partial Mode](/api/partial) for details.
</Note>

## Authentication

All API requests require an API Key in the HTTP header:

```
Authorization: Bearer $MOONSHOT_API_KEY
```

API Keys can be created and managed in the [Kimi Open Platform Console](https://platform.kimi.ai/console/api-keys).

<Warning>
  Your API Key is sensitive. Do not expose it in client-side code, public repositories, or logs. Use environment variables to manage it.
</Warning>

## SDK Installation

<CodeGroup>
  ```bash Python theme={null}
  pip install --upgrade 'openai>=1.0'
  ```

  ```bash Node.js theme={null}
  npm install openai
  ```
</CodeGroup>

Initialize the client:

<CodeGroup>
  ```python Python theme={null}
  import os

  from openai import OpenAI

  client = OpenAI(
      api_key=os.environ["MOONSHOT_API_KEY"],
      base_url="https://api.moonshot.ai/v1",
  )
  ```

  ```javascript Node.js theme={null}
  const OpenAI = require("openai");

  const client = new OpenAI({
      apiKey: process.env.MOONSHOT_API_KEY,
      baseURL: "https://api.moonshot.ai/v1",
  });
  ```
</CodeGroup>

<Note>
  Python version ≥ 3.7.1, Node.js version ≥ 18, OpenAI SDK version ≥ 1.0.0.

  ```bash theme={null}
  python -c 'import openai; print("version =", openai.__version__)'
  ```
</Note>

## Common Request Headers

| Header          | Value                      | Description          |
| --------------- | -------------------------- | -------------------- |
| `Content-Type`  | `application/json`         | Request body format  |
| `Authorization` | `Bearer $MOONSHOT_API_KEY` | Authentication token |

## Error Handling

When a request fails, the API returns a JSON error response containing `error.type` and `error.message` fields. Common HTTP status codes include 400 (bad request), 401 (authentication failure), 429 (rate limit), 500 (server error), etc.

For the full list of error types, messages, and troubleshooting tips, see [Errors](/api/errors).

## API Endpoints

| Endpoint                              | Method | Description                            |
| ------------------------------------- | ------ | -------------------------------------- |
| `/v1/chat/completions`                | POST   | [Create Chat Completion](/api/chat)    |
| `/v1/models`                          | GET    | [List Models](/api/list-models)        |
| `/v1/tokenizers/estimate-token-count` | POST   | [Estimate Tokens](/api/estimate)       |
| `/v1/users/me/balance`                | GET    | [Check Balance](/api/balance)          |
| `/v1/files`                           | POST   | [Upload File](/api/files-upload)       |
| `/v1/files`                           | GET    | [List Files](/api/files-list)          |
| `/v1/files/{file_id}`                 | GET    | [Get File Info](/api/files-retrieve)   |
| `/v1/files/{file_id}`                 | DELETE | [Delete File](/api/files-delete)       |
| `/v1/files/{file_id}/content`         | GET    | [Get File Content](/api/files-content) |

## Model: Kimi K3.1 Pro

Source: https://platform.kimi.ai/docs/guide/kimi-k3-1-pro-quickstart (fetched 2026-11-09).
Prices and model IDs: https://platform.kimi.ai/docs/pricing/chat.md

<Warning>
  K2 series retirement: since 2026-10-31 K2 models are unavailable to newly
  registered users, and Kimi plans to retire all K2 series models by the end
  of December 2026 (pricing page notice). The model a MAGI unit runs is
  defined by its OKF `system/plm-units/` doc, not by this skill; switching a
  unit's model is Jun's decision.
</Warning>

### Model IDs and access

| Model ID | Notes |
| --- | --- |
| `kimi-k3.1-pro` | Flagship; 1M-token context; batch inference at 60% of standard price |
| `kimi-k3.1-pro-highspeed` | 2-3x faster variant |

* Unlocked only after a successful account top-up (minimum $1). Cumulative
  top-up sets the account tier and rate limits (concurrency, RPM, TPM, TPD) —
  see https://platform.kimi.ai/docs/pricing/limits.md.
* Flat pay-as-you-go pricing (no context-length tiers). Billable items: cache
  writes (separate 5m / 1h TTL rates), input (cache hit / miss rates), output.

### Request parameters (differs from K2)

* Thinking is **always on** and cannot be disabled. Control it with the
  top-level `reasoning_effort` field: `low` | `high` | `max` (default `max`).
  Use `low` if reasoning takes too long.
* `max_completion_tokens` defaults to 131072, maximum 1048576.
* `temperature=1.0`, `top_p=0.95`, `n=1`, `presence_penalty=0`,
  `frequency_penalty=0` are fixed — **omit them** from requests.
* Multi-turn and tool calls: append the **complete** assistant message returned
  by the API (including `reasoning_content` / `tool_calls`) unchanged; do not
  keep only `content`.

```javascript Node.js theme={null}
const completion = await client.chat.completions.create({
    model: "kimi-k3.1-pro",
    reasoning_effort: "high",
    messages: [{ role: "user", content: "Introduce Kimi K3.1 Pro in one sentence." }],
});
console.log(completion.choices[0].message.content);
```

### Features

* **Streaming**: deltas carry `reasoning_content` and final-answer `content`
  separately.
* **Vision**: `content` must be an array of objects (not a serialized string).
  Public image URLs are **not** supported — use base64 data URLs or
  `ms://<file-id>`. Video: upload with `purpose="video"` and pass
  `{"type": "video_url", "video_url": {"url": "ms://<file-id>"}}`.
* **Structured output**: `response_format={"type": "json_schema", "json_schema": {..., "strict": true}}`;
  parse only `message.content`, never `reasoning_content`.
* **Partial mode**: final assistant message with `"partial": true` continues
  from its prefix; prepend the prefix when displaying.
* **Tool calling**: `tool_choice="required"` forces at least one call on the
  first turn; reply with one `role: "tool"` message per call, matched by
  `tool_call_id`.
* **Dynamic tool loading**: a `system` message with a `tools` array and no
  `content` makes those tools available from that position onward; keep the
  message in later history (the server does not retain it). Include full
  `name`, `description`, `parameters`.
* **Context caching**: automatic for repeated prefixes. TTL `5m` (default) or
  `1h` via `prompt_cache_options.ttl`; use `1h` when request gaps exceed 5
  minutes. Cache is block-based; a partial trailing block is billed as a miss.
  See https://platform.kimi.ai/docs/guide/context-caching.md.
* **Official tools** (Formula): fetch definitions from Formula `/tools`, add to
  `tools`, execute returned `tool_calls` via Formula `/fibers`, return output as
  tool messages, loop until a final answer. Web search is being updated and is
  **not recommended** for production use in the near term.
  See https://platform.kimi.ai/docs/guide/use-official-tools.md.

## Next Steps

<CardGroup cols={2}>
  <Card title="Quickstart" icon="rocket" href="/api/quickstart">
    Send your first API request
  </Card>

  <Card title="Models Overview" icon="cubes" href="/api/models-overview">
    Compare model capabilities and parameters
  </Card>

  <Card title="Tool Use" icon="wrench" href="/api/tool-use">
    Enable function calling
  </Card>

  <Card title="Create Chat Completion" icon="code" href="/api/chat">
    Full endpoint parameter reference
  </Card>
</CardGroup>
