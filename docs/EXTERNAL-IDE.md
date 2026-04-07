# Running the repo in an external IDE

Use this guide to clone, configure, and run the **credential-mcp-server** in VS Code, WebStorm, or any other IDE outside Cursor.

---

## Prerequisites

- **Node.js** 18+
- **pnpm** (`npm install -g pnpm`)

---

## 1. Clone and open

```bash
git clone -b feat/private-key-auth https://github.com/mocaverse/credential-mcp-server.git
cd credential-mcp-server
```

Open the `credential-mcp-server` folder in your IDE.

---

## 2. Install and env

```bash
pnpm install
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | What to set |
|----------|-------------|
| `CREDENTIAL_MCP_ENVIRONMENT` | `staging` or `production` (sandbox not supported for testing). |
| `CREDENTIAL_MCP_PRIVATE_KEY` | Optional. 64-char hex wallet key for on-chain tools (set price, stake, payments). Use a dedicated, low-value wallet; never commit. |

Leave other optional vars (e.g. `CREDENTIAL_MCP_DEBUG`, `MCP_HTTP_PORT`) unset unless you need them. See `.env.example` for full list.

---

## 3. Build and run the MCP server

From the repo root in your IDE terminal (or system terminal):

```bash
pnpm run build
pnpm run run:server
```

Server runs at **http://localhost:3749**. MCP endpoint: **http://localhost:3749/mcp**.

- Override port: set `MCP_HTTP_PORT` in `.env` (default `3749`).

---

## 4. Connect your MCP client

Point your MCP client (e.g. Cursor, another IDE with MCP) at:

- **URL:** `http://localhost:3749/mcp`
- **Auth:** For HTTP transport, use the browser sign-in when the client connects; there are no separate auth tools to call.

---

## 5. Useful commands (run from repo root)

| Command | Description |
|---------|-------------|
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm run run:server` | Build and start HTTP server |
| `pnpm run watch` | Watch and recompile on change |
| `pnpm run lint` | Run ESLint |
| `pnpm run lint:fix` | ESLint with auto-fix |
| `pnpm run test` | Run tests (`node --test`) |
| `pnpm run inspector` | Run MCP inspector (debug tools) |

---

## 6. Where things live

| Path | Purpose |
|------|---------|
| `src/` | Server and tool implementations |
| `src/tools/` | MCP tools (create schema, program, pricing, etc.) |
| `src/config.ts` | Env and config loading |
| `src/httpServer.ts` | HTTP MCP server entry |
| `bin/` | CLI entry points |
| `.env` | Local config (do not commit) |

---

## 7. More detail

- **Full setup, auth, and tools:** [README](../README.md) in the repo root.
- **E2E / agent workflow:** [CLAUDE-AGENT-E2E-GUIDE.md](./CLAUDE-AGENT-E2E-GUIDE.md).
