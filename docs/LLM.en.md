# Language models

Excellence can run **Qwen3.5 2B locally** through Ollama, without an API key or per-token fee. This compact model helps explain data and propose simple spreadsheet formulas. Review its answers: small models can make mistakes. Server hosting and computation still use resources. Optional OpenAI-compatible Chat Completions, Anthropic Messages, and Gemini generateContent adapters remain available when configured by the operator.

## Local Qwen3.5 2B

Set these variables in the server environment, never in browser code, then restart Excellence:

```dotenv
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen3.5:2b-q4_K_M
OLLAMA_NUM_THREAD=2
```

Install the model on the Ollama service with `ollama pull qwen3.5:2b-q4_K_M`. The application does not download models or start inference automatically. The [official model artifact](https://ollama.com/library/qwen3.5:2b-q4_K_M) uses Q4_K_M quantization, is approximately 1.9 GB, and carries the Apache 2.0 license. Runtime and context memory add to model weight memory. Record the installed digest for reproducible deployments; tags can change.

Keep Ollama on a private server network. Do not expose port 11434 to the Internet. The browser talks to the Excellence server through the authenticated API or the separately restricted demo API. Inside Docker, `127.0.0.1` refers to the current container; `ollama` is a service hostname on a shared Docker network. Adjust the URL to your deployment.

The local profile requests a 4,096-token context, up to 768 output tokens, temperature zero, and `think: false` for Qwen3/Qwen3.5. The JSON payload containing the request, range, and cells is limited to 2,000 UTF-8 bytes. This is stricter than the general 500-cell ceiling; long text needs smaller selections. Oversized input is rejected before sending, without silently dropping cells. Malformed and truncated answers are rejected. The local timeout is 90 seconds, including loading and generation; this is not a latency guarantee. No tools or images are supplied to the model.

For an unavailable-service message, check Ollama and the internal network. For a missing-model error, check `ollama list` and the configured model name. For context or response limits, select less data or request fewer changes. Errors never trigger an automatic retry or paid-provider fallback.

`OLLAMA_NUM_THREAD` controls the per-request CPU thread count, defaulting to two; only integers from one through four are accepted. Tune against the container's actual CPU quota and measure representative requests. More threads do not necessarily improve latency. An Ollama entry in `EXCELLENCE_LLM_PROVIDERS` may override this with `numThread`.

The JSON profile explicitly disables presence, frequency, and repetition penalties (`presence_penalty: 0`, `frequency_penalty: 0`, `repeat_penalty: 1`), avoiding inherited model settings that discourage repeating cell references. Instructions include separate formula and explanation examples, but neither examples nor structured JSON guarantee a correct answer.

## Observed local results

On 17 October 2026, the selected Qwen3.5 2B profile passed three synthetic
requests on a CPU-only Proxmox container: sum into the requested destination,
an IF formula into a different destination, and a Portuguese explanation with
no proposed changes. The observed times were 16.4, 17.6 and 14.9 seconds with the
model loaded. These are three examples, not a general quality or speed benchmark.
Cold loading and competing workloads can be slower; the demo still times out
after 30 seconds. Earlier candidate configurations returned incorrect answers
or exceeded that timeout and were not accepted as the selected profile.

## External provider configuration

```dotenv
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini

ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-sonnet-4-5

GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
```

Only configure providers you intend to use. External services may charge fees. Model names are configurable examples, not promises of availability or access. For an OpenAI-compatible local service, set its base URL, including `/v1` when required, and its model name. A key may be omitted when that private service does not require one. Model and service licenses are separate from Excellence's MIT license.

`EXCELLENCE_LLM_PROVIDERS` overrides individual provider variables with a JSON array of up to ten entries:

```json
[
  {"id":"local","label":"Qwen3.5 2B · local","kind":"ollama","endpoint":"http://ollama:11434","model":"qwen3.5:2b-q4_K_M"}
]
```

Entries support `id`, `label`, `kind`, `endpoint`, `model`, and optional `apiKey`. Treat this environment variable as secret when it includes keys. Endpoints are operator configuration, never user request parameters. Endpoints and credentials are not returned to the browser.

## Use and privacy

1. Open the AI assistant and choose the provider.
2. Select the range and review the data that will be sent.
3. Describe the task and explicitly send the selection.
4. Review the explanation and every proposed change.
5. Apply or discard the proposal. Request a new proposal if the sheet changed meanwhile.

Only the task, selected range, and selected scalar cell values are sent. The server checks coordinates and duplicates and removes extra fields. It does not send the whole workbook or account name. Private Ollama keeps that selection on the operator's infrastructure; selecting a configured external provider sends it there.

Model output does not execute Python, JavaScript, VBA, shell commands, or model tools. Proposed target cells must stay inside the selection. External-access formulas are rejected, and suggested functions must belong to the server allowlist, including SUM, AVERAGE, IF, COUNTIF, SUMIF, and common text, date, and lookup functions. This restricts capability; it does not prove formula correctness. The assistant never runs on recalculation. The private AI API requires authentication and CSRF protection; the demo uses a separate restricted route below.

Proposal validation also normalizes cell addresses, rejects duplicate destinations, unbalanced formula quotes or parentheses, and direct same-sheet self-references, including containing ranges. These are limited checks, not a complete formula parser or cycle detector: indirect and cross-sheet cycles are not covered. Always review the destination and calculation before applying.

## Public demo assistant

Operators may enable `EXCELLENCE_DEMO_AI=true` with a configured Ollama provider. It is disabled by default. Without the flag or Ollama configuration, the demo fails closed and never falls back to a paid provider. Inference starts only after an explicit visitor request.

`POST /api/demo/ai/assist` accepts only `{prompt, selection, cells}` and returns `{message, proposal}`. Proposed changes require review and manual application to the temporary sheet. This route does not read sessions, accounts, or private workbooks.

- Three demo requests per socket source in a rolling 30-minute window, and twenty demo requests globally per rolling hour.
- A 300-character prompt, twenty selected cells, and 1,500 UTF-8 bytes for the complete JSON payload. The HTTP reader rejects bodies above 2,048 bytes.
- Up to 256 output tokens, five proposed changes, and a 30-second timeout.
- One inference at a time across both private and demo routes. Concurrent requests return 503 without queuing.

Budgets and the inference lease persist in SQLite. Provider failures consume quota; invalid or busy requests do not. Cookies and restarts do not reset the quota. Client disconnects abort the provider HTTP request. Timeouts, network failures, and interrupted responses retain the lease until 100 seconds after admission, because cancelling HTTP does not prove that provider computation stopped. The same expiry recovers leases left by a crashed process. The global budget bounds active usage rows to twenty; these rows contain no prompts, cell values, or responses.

Also keep `OLLAMA_NUM_PARALLEL=1` and a small provider queue. The application lease bounds its own requests; provider settings contain work that may continue after disconnects or beyond lease expiry.

Source identity uses only the socket address, stored as a hash. Forwarded IP headers and cookies are ignored. **Behind a reverse proxy, all visitors through that proxy share its three-request/30-minute quota.** Distinct visitor buckets would require explicitly trusting the immediate proxy, overwriting an IP header there, and blocking direct backend access; this deployment does not assume that trust. Set `EXCELLENCE_PUBLIC_URL` to the public origin. Missing or mismatched `Origin` and cross-site requests are rejected. Origin checks alone do not stop automated clients; server quotas and bounded work also apply.

429 means exhausted quota; 503 means disabled, unconfigured, or busy service; `Retry-After` supplies a delay where applicable. Model errors return 502. Requests are never retried automatically. These limits bound demo inference work; the reverse proxy should also limit general HTTP traffic and connections.

Accounts share the server's configured providers and any paid-provider balance. The API limits requests to ten per minute per account, but does not provide monetary budgets per account. Operators must manage external-provider costs separately.

Adapter tests use local HTTP fixtures to check protocols, privacy, limits, errors, and rejected proposals. These tests do not establish real-model quality or speed. Verify representative tasks and timings on the deployed service.

Protocol references: [Ollama chat](https://docs.ollama.com/api/chat), [structured outputs](https://docs.ollama.com/capabilities/structured-outputs), [thinking controls](https://docs.ollama.com/capabilities/thinking), [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat), [Anthropic Messages](https://docs.anthropic.com/en/api/messages), and [Gemini](https://ai.google.dev/api/generate-content).
