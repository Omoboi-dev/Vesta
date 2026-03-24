# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

This project was created using `bun init` in bun v1.2.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## 0G Compute chat configuration

`/api/chat` now uses 0G Compute inference. Set these environment variables before starting the backend:

```bash
ZG_SERVICE_URL=https://<your-0g-provider-service-url>
ZG_API_KEY=app-sk-<your-provider-secret>
ZG_MODEL=<your-provider-model-name>
```

The backend sends chat requests to:

```text
POST <ZG_SERVICE_URL>/v1/proxy/chat/completions
```

with the existing DeFi assistant system prompt and chat history, so the frontend API contract does not change.
