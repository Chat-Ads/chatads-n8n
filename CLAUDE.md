# ChatAds n8n Node

Custom n8n node for integrating ChatAds with n8n workflows.

## Package Info

- **Package name**: `n8n-nodes-chatads`
- **Language**: TypeScript
- **Platform**: n8n workflow automation

## Purpose

Allows n8n users to:
- Add ChatAds to their workflows
- Automatically insert affiliate links into messages
- Build automated marketing and monetization workflows

## Installation

In n8n:
1. Install via Community Nodes
2. Search for "n8n-nodes-chatads"
3. Install and configure with your API key

Or install manually:
```bash
npm install n8n-nodes-chatads
```

## Usage

See README.md for workflow examples.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test locally in n8n
npm link
```

## Publishing

```bash
# Build and publish to npm
npm run build
npm publish
```

## Project Structure

- `/nodes` — n8n node implementations
- `/credentials` — Credential type definitions
- `/dist` — Compiled output (generated)
- `package.json` — Package configuration
- `README.md` — User-facing documentation

## Related

- `/api` — Backend API this node calls
- `/sdks/chatads-typescript-sdk` — TypeScript SDK (similar implementation)
