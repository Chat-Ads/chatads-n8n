## ChatAds n8n Wrapper

Custom n8n node + credential that calls the ChatAds API endpoint `/v1/chatads/messages`. Handles authentication via the `x-api-key` header and exposes all supported API fields so you can orchestrate ChatAds inside n8n workflows.

### Layout

- `credentials/ChatAdsApi.credentials.ts` – stores the base URL and API key reused by every node call.
- `nodes/ChatAds/ChatAds.node.ts` – single `Analyze Prospect` operation that posts to `/v1/chatads/messages`.
- `nodes/ChatAds/chatads.svg` – lightweight icon so the node is recognizable inside the n8n editor.
- `package.json`, `tsconfig.json`, `.gitignore` – helper files so you can compile to `dist/` with `tsc` (the artifacts n8n loads).

### Using in n8n

1. Install dependencies and build the TypeScript sources:
   ```bash
   cd n8n
   npm install
   npm run build
   ```
   This produces `dist/credentials/ChatAdsApi.credentials.js` and `dist/nodes/ChatAds/ChatAds.node.js`.
2. Copy the compiled `dist` directory into your n8n custom nodes directory (for example `~/.n8n/custom/`) or publish the package to your internal npm registry and install it where your n8n instance can resolve it.
3. Restart n8n. The new **ChatAds** node will appear under the "Transform" group. Add it to a workflow, select the `ChatAds API` credential, and supply either:
   - A simple `message` plus optional fields (IP, country, etc.), or
   - A raw JSON payload (only documented fields are accepted; unexpected keys are rejected to prevent tampering).
4. Optionally tune `Max Concurrent Requests` (default 4) and `Request Timeout (seconds)` for high-volume workflows. The node keeps item ordering consistent even when issuing requests in parallel.
5. When executed, the node sends a POST request to `{{baseUrl}}/v1/chatads/messages` (configurable via the `Endpoint Override` parameter) with your `x-api-key` header and returns the API response verbatim so downstream nodes can branch on `error` (null for success) or any affiliate offers the backend generated.

Because the wrapper still uses `this.helpers.httpRequest`, it honors n8n's retry/backoff settings and the `Continue On Fail` toggle while layering per-node timeouts and error payloads for easier debugging.
`Extra Fields (JSON)` is validated to prevent conflicts with reserved parameter keys, so untrusted workflows cannot silently override core fields.

### Releasing/Patching

1. Bump the version in `package.json` whenever you change behavior (validation rules, new fields, etc.).
2. Run `npm run build` to regenerate `dist/` artifacts—**these compiled files are what n8n loads**, so they must stay in sync with the TypeScript sources.
3. Copy/publish the updated `dist/` directory to your custom nodes location or npm registry, then restart n8n.
4. If the backend `FunctionItem` schema changes, update both the parameter list in `ChatAds.node.ts` and the `OPTIONAL_FIELDS` set near the top of the file to keep validation in sync.

Consider keeping a short changelog (GitHub release notes or a `CHANGELOG.md`) so downstream workflows know when to reinstall the node.

### Request Fields

The node accepts the following fields (via parameters or `Extra Fields (JSON)`):

| Field | Type | Description |
|-------|------|-------------|
| `message` | string (required) | Message to analyze (1-5000 chars) |
| `ip` | string | IPv4/IPv6 address for country detection (max 45 characters) |
| `country` | string | Country code (e.g., 'US'). If provided, skips IP-based country detection |
| `quality` | string | Variable for playing around with keyword quality, link accuracy, and response times. 'fast' = quickest, but less likely to find a working affiliate link (~150ms), 'standard' = strong keyword quality and decent link matching (~1.4s), 'best' = strong keyword and strong matching (~2.5s). |
