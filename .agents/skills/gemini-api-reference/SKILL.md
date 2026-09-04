---
name: gemini-api-reference
description: Google Gemini API (ai.google.dev) reference for magi-core. Covers REST endpoints, authentication, SDK usage, and common operations like generateContent, streamGenerateContent, embedContent, and file management. Use when integrating or debugging Gemini Developer API calls in MAGI.
type: Reference
lilith_safe: false
tags: [reference, gemini, google, api, plm]
---

# Gemini API Reference

Official docs (Japanese): https://ai.google.dev/api?hl=ja  
All methods: https://ai.google.dev/api/all-methods

## Service Endpoint

```
https://generativelanguage.googleapis.com
```

All endpoint paths below are relative to this base URL. The docs primarily target `v1beta`; a stable `v1` path also exists.

## Authentication

All requests must include an API key from [Google AI Studio](https://aistudio.google.com/apikey).

Recommended header:

```
x-goog-api-key: $GEMINI_API_KEY
```

The key can also be passed as a query parameter (`?key=$GEMINI_API_KEY`), but the header is preferred.

<Warning>
Do not commit API keys. Load `GEMINI_API_KEY` from environment variables / Secret Manager.
</Warning>

## SDK Installation (Node.js)

The project uses `@google/genai`:

```bash
npm install @google/genai
```

Initialize and generate text:

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-3.5-flash',
  contents: 'Explain how AI works in a few words',
});

console.log(response.text);
```

Streaming:

```javascript
const stream = await ai.models.generateContentStream({
  model: 'gemini-3.5-flash',
  contents: 'Write a 100-word poem.',
});

for await (const chunk of stream) {
  console.log(chunk.text);
}
```

## Common Request Headers

| Header          | Value              | Description          |
| --------------- | ------------------ | -------------------- |
| `Content-Type`  | `application/json` | Request body format  |
| `x-goog-api-key`| `$GEMINI_API_KEY`  | Authentication token |

## Primary Endpoints

| Endpoint / Method                               | REST path                                                        | Description                                           |
| ----------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| `models.generateContent`                        | `POST /v1beta/{model=models/*}:generateContent`                  | Standard unary content generation                     |
| `models.streamGenerateContent`                  | `POST /v1beta/{model=models/*}:streamGenerateContent`            | Server-Sent Events streaming generation               |
| `models.batchGenerateContent`                   | `POST /v1beta/{batch.model=models/*}:batchGenerateContent`        | Batch generation job (long-running)                   |
| `models.embedContent`                           | `POST /v1beta/{model=models/*}:embedContent`                     | Generate text embedding                               |
| `models.batchEmbedContents`                     | `POST /v1beta/{model=models/*}:batchEmbedContents`               | Batch embedding                                       |
| `models.asyncBatchEmbedContent`                 | `POST /v1beta/{batch.model=models/*}:asyncBatchEmbedContent`    | Async batch embedding job                             |
| `models.countTokens`                            | `POST /v1beta/{model=models/*}:countTokens`                      | Count tokens for a request                            |
| `models.predict`                                | `POST /v1beta/{model=models/*}:predict`                          | Generic prediction                                    |
| `models.predictLongRunning`                     | `POST /v1beta/{model=models/*}:predictLongRunning`               | Long-running prediction                               |
| `models.get`                                    | `GET /v1beta/{name=models/*}`                                    | Get model metadata                                    |
| `models.list`                                   | `GET /v1beta/models`                                             | List available models                                 |
| `files.list` / `files.get` / `files.delete`     | `GET /v1beta/files`, `GET/DELETE /v1beta/{name=files/*}`       | File metadata management                              |
| `media.upload`                                  | `POST /upload/v1beta/files`                                      | Upload a file for use with Gemini                     |
| `files.register`                                | `POST /v1beta/files:register`                                    | Register an existing Cloud Storage file               |
| `cachedContents.create/patch/get/delete/list`   | `/v1beta/cachedContents`                                         | Cache reusable context                                |
| `batches.*`                                     | `/v1beta/batches`                                                | Long-running batch operations                         |
| `auth_tokens.create`                            | `POST /v1beta/auth_tokens`                                       | Token for constraining `BidiGenerateContent` sessions |
| `BidiGenerateContent`                           | WebSocket: `wss://generativelanguage.googleapis.com/v1beta/models/{model}:bidiGenerateContent` | Real-time bidirectional streaming         |
| `CreateInteraction`                             | See [Interactions API docs](https://ai.google.dev/api/generate-content) | Stateful, multi-turn sessions                         |

## REST Example: generateContent

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          { "text": "Explain how AI works in a few words" }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 256
    }
  }'
```

## Thinking budget

`gemini-2.5-flash` returns hidden reasoning as separate `thought` parts. Cap the
reasoning budget with `generationConfig.thinkingConfig.thinkingBudget`. This
budget is **in addition to** visible output tokens, so raise `maxOutputTokens`
by the same amount to preserve the desired visible-output length.

```json
{
  "contents": [...],
  "generationConfig": {
    "maxOutputTokens": 556,
    "thinkingConfig": {
      "thinkingBudget": 256
    }
  }
}
```

Response parts with `thought: true` should be excluded from the visible response;
use only parts with `text` and no `thought` flag.

> **Note:** `thinkingConfig` behavior is model-specific. It is observed to work
> with `gemini-2.5-flash`; Gemini 3.x models may handle thinking differently and
> should be verified before relying on this field.

Response shape:

```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [{ "text": "..." }]
      },
      "finishReason": "STOP"
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 8,
    "candidatesTokenCount": 42,
    "totalTokenCount": 50
  }
}
```

## Model Names

Use the model ID from `models.list`. Examples commonly seen in the docs:

- `gemini-3.5-flash`
- `gemini-3.5-flash-latest`
- `gemini-2.5-flash`
- `gemini-2.5-pro`

In REST paths, prefix with `models/` (e.g. `models/gemini-3.5-flash`).

## Error Handling

Failures return a JSON error object with `error.code`, `error.status`, and `error.message`. Common HTTP codes:

| Code | Meaning                                  |
| ---- | ---------------------------------------- |
| 400  | Invalid request / bad parameters         |
| 401  | Invalid or missing API key               |
| 403  | Permission / quota / API not enabled     |
| 429  | Rate limit exceeded                      |
| 500  | Internal server error                      |
| 503  | Service temporarily unavailable            |

## Useful Links

- Getting started: https://ai.google.dev/gemini-api/docs/get-started
- Generate content reference: https://ai.google.dev/api/generate-content
- Models reference: https://ai.google.dev/api/models
- Files reference: https://ai.google.dev/api/files
- Embeddings reference: https://ai.google.dev/api/embeddings
- Token counting: https://ai.google.dev/api/tokens
