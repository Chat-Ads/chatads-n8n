# ChatAds n8n Node

Custom n8n node for integrating ChatAds with n8n workflows.

## Package Info

- **Package name**: `@getchatads/chatads-n8n`
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
2. Search for "@getchatads/chatads-n8n"
3. Install and configure with your API key

Or install manually:
```bash
npm install @getchatads/chatads-n8n
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
