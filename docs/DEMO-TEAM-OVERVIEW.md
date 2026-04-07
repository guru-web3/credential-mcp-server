# Credential MCP Server — Team Demo Overview

**One AI-powered credential backend. Two ways to use it.**

---

## In 30 seconds

| Branch | What it is | Who uses it |
|--------|------------|-------------|
| **`main`** | MCP server for **Cursor / VSCode** (and any MCP client). Natural language → create schemas, set pricing, create programs, get docs and app config. | Developers in the IDE; can also act as a **connector for Claude Desktop and ChatGPT** (OpenAI Codex) where MCP is supported. |
| **`feat/dashboard-chat`** | Same server **plus** a **`POST /chat`** endpoint so the **Credential Dashboard** can offer an in-app AI assistant. | Partners and issuers/verifiers **inside the Credential Dashboard** — no Cursor or CLI needed. |

Same tools (create schema, pricing, programs, list, docs, JWKS, etc.), two entry points: **IDE** and **Dashboard**.

---

## Architecture (crisp)

```
┌─────────────────────────────────────────────────────────────────┐
│  credential-mcp-server (one codebase, two modes)                 │
│  • MCP tools: create_schema, setup_pricing, create_program,      │
│    create_verification_programs, list_*, docs, app_config, etc.  │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ stdio / HTTP + OAuth               │ POST /chat (feat/dashboard-chat)
         ▼                                    ▼
┌──────────────────────┐            ┌──────────────────────────────┐
│  Cursor / VSCode     │            │  Credential Dashboard       │
│  Claude Desktop      │            │  (Assistant page)           │
│  ChatGPT (Codex)     │            │  → x-dashboard-auth,        │
│  Any MCP client      │            │    x-issuer-id, x-verifier  │
└──────────────────────┘            └──────────────────────────────┘
         │                                    │
         └────────────────┬───────────────────┘
                          ▼
              credential-api (staging/prod)
```

- **main**: Exposes MCP over stdio (Cursor/VSCode) and HTTP with OAuth. No `/chat`.
- **feat/dashboard-chat**: Adds `POST /chat` with CORS, plus `runChatLoop` that uses the same MCP tools; auth comes from Dashboard headers (`x-dashboard-auth`, `x-issuer-id`, `x-verifier-id`, etc.). The **Credential Dashboard** Assistant UI calls this endpoint.

---

## Use cases (why it matters)

### 1. **Faster partner onboarding**
- **Before:** Partner reads docs, learns dashboard UI, learns API shapes and field names.
- **With MCP:** Partner says in natural language: *“Create a schema for trading volume with address (string) and volume (number)”* or *“Set pricing to pay on success”*. Same in Cursor or in the Dashboard Assistant (feat/dashboard-chat).
- **Result:** Less time to first schema and first program; fewer support tickets.

### 2. **Developer experience in the IDE**
- In Cursor (or another MCP client): *“Set up the issuance app for my last schema”* → clone template, generate `.env`, keys, run dev, tunnel, configure JWKS — all driven by MCP tools.
- No need to remember tool names or JSON; the model picks the right tools and parameters.

### 3. **In-dashboard assistant (feat/dashboard-chat)**
- Partners who never open Cursor still get the same power: inside **Credential Dashboard** they open the Assistant and ask the same questions (list schemas, create program, set pricing, “how do I verify in my app?”).
- Session is already authenticated via Dashboard; no separate MCP OAuth in the browser.

### 4. **One connector, many clients**
- MCP is an open protocol. The same server works with:
  - **Cursor / VSCode** (primary today)
  - **Claude Desktop** (MCP supported)
  - **ChatGPT / OpenAI Codex** (MCP with stdio/HTTP)
- Publish once (e.g. npm or private registry); partners choose their preferred AI environment.

---

## How this reduces onboarding and hypes the product

| Benefit | How we say it in the demo |
|--------|----------------------------|
| **No “read the manual” moment** | “Just tell the AI what you want: ‘Create a schema for age verification with an integer age.’ No need to find the right form or API field.” |
| **Same experience in IDE and Dashboard** | “If you live in Cursor, you do it in Cursor. If you live in the Credential Dashboard, we’ve got an Assistant there too — same brain, same actions.” |
| **Fewer support and back-and-forth** | “Partners describe intent; the AI maps it to the right tools and parameters. Fewer mistakes and fewer ‘where do I set this?’ questions.” |
| **Future-proof and ecosystem-friendly** | “We ship one MCP server. Cursor today; Claude and ChatGPT wherever they support MCP. One integration, multiple surfaces.” |
| **Differentiator** | “First-class AI for the full credential lifecycle — schema, pricing, issuance and verification programs, app config, and docs — in the tools your team already uses.” |

---

## Demo flow suggestions

### Option A — Cursor (main)
1. Add the MCP server in Cursor (from npm or from source).
2. Connect (OAuth or wallet sign-in).
3. In chat: *“Create a schema for NFT holders with numberOfNfts (integer).”*
4. Then: *“Set pricing: pay on success.”* → *“Create an issuance program for that schema.”* → *“Create a verification program where numberOfNfts >= 1.”*
5. *“List my verification programs.”* → show programId for use in app.
6. *“How do I verify in my app?”* → show `credential_docs` output.

### Option B — Dashboard Assistant (feat/dashboard-chat)
1. Run credential-mcp-server HTTP server from `feat/dashboard-chat` with CORS set for the Dashboard origin.
2. Open Credential Dashboard → Assistant.
3. Same prompts as above; reply comes from the same MCP tools via `POST /chat`.
4. Emphasize: “No Cursor required — this is inside the product your partners already use.”

### One-liner for the slide
**“One credential brain. In your IDE and in your Dashboard.”**

---

## Branch summary

| Branch | Deliverable |
|--------|-------------|
| **main** | MCP server for Cursor/VSCode (and other MCP clients). stdio + HTTP with OAuth. Use as connector in Claude Desktop / ChatGPT where MCP is supported. |
| **feat/dashboard-chat** | Same server + `POST /chat` for the Credential Dashboard’s in-app AI Assistant. Auth via Dashboard token and issuer/verifier headers. |

Same tools, same credential-api backend; two entry points for maximum reach and minimal partner friction.

---

## Technical spec (how we did this)

*Medium-level description for understanding and answering “how we did this.”*

### Protocol and stack

- **MCP (Model Context Protocol):** Open protocol so AI clients discover and call tools. We use `@modelcontextprotocol/sdk` to build a **server** that exposes **tools** (and optionally resources/prompts).
- **Runtime:** Node.js, TypeScript, Express (HTTP server). Tools call **credential-api** over REST; the MCP server is an adapter between “natural language + AI” and the existing credential API.

### Two transports (main)

1. **stdio (Cursor / VSCode / Claude Desktop)**  
   - Entry: `src/index.ts`. Creates one MCP server via `createMcpServer()` and connects it to `StdioServerTransport()`.  
   - The IDE spawns the process (e.g. `node dist/index.js`) and talks JSON-RPC over stdin/stdout. No HTTP.  
   - Auth: User “connects” in the IDE; for HTTP-capable clients we use the HTTP server with OAuth. For stdio, auth is typically done by the user pasting wallet sign-in result or private key so the server can call `credential_authenticate` (or equivalent) and set session.

2. **HTTP + OAuth (remote / “Needs authentication”)**  
   - Entry: `src/httpServer.ts`. Express app exposes `/mcp` with `StreamableHTTPServerTransport`, plus MCP OAuth routes (login, callback).  
   - Client (e.g. Cursor) adds the server by URL; user clicks Connect → browser OAuth → Bearer token. Subsequent requests send `Mcp-Session-Id` and Bearer; server resolves session and runs tool calls in that context.  
   - Session is stored per `Mcp-Session-Id`; each session has its own MCP Server + Transport instance so re-initialize works cleanly.

### Tool layer (single source of truth)

- **Registry:** `src/server/toolRegistry.ts` defines all tools: **name**, **description**, **inputSchema** (JSON Schema for the AI), **Zod schema** (validation), **handler** (async function).  
- **Handlers:** Live in `src/tools/*.ts` (e.g. `create-schema`, `setup-pricing`, `create-programs`). They read **session** (e.g. `session.get('apiUrl')`, `session.get('dashboardToken')`, `issuerId`, `verifierId`) and call credential-api with axios. No duplicate tool definitions.  
- **MCP request handling:** `createMcpServer.ts` sets `ListToolsRequestSchema` → returns `getToolsList()` from the registry; `CallToolRequestSchema` → looks up tool by name, normalizes args (`normalizeToolArgs`), validates with Zod, runs handler, returns result as MCP content.  
- **Session:** In-memory singleton `session.ts` holds `apiUrl`, `dashboardToken`, `issuerId`, `verifierId`, `environment`, etc. Populated by **setSessionFromAuthInfo(authInfo)** from (a) OAuth `AuthInfo.extra` after HTTP login, or (b) after credential_authenticate (wallet/private key). So both “IDE + OAuth” and “IDE + credential_authenticate” end up with the same session shape for tools.

### Dashboard chat (feat/dashboard-chat)

- **Goal:** Same tools, but invoked from the Credential Dashboard UI without an MCP client. The Dashboard already has a logged-in user (dashboard token, issuer/verifier IDs).  
- **New surface:** `POST /chat` on the same HTTP server. Body: `{ message: string }`. Headers: `x-dashboard-auth` (dashboard token), `x-issuer-id`, `x-verifier-id`, `x-issuer-did`, optional `x-api-url`. CORS allowed for Dashboard origin (`MCP_CORS_ORIGIN`).  
- **Auth mapping:** `authFromHeadersToAuthInfo()` turns those headers into an `AuthInfo`-like object with `extra: { dashboardToken, issuerId, verifierId, ... }`. We call **setSessionFromAuthInfo(authInfo)** before running the chat loop so every tool execution sees the same session as if the user had logged in via MCP.  
- **Chat loop:** `runChatLoop(message, authInfo)` in `src/chat/chatLoop.ts`:  
  - Uses **OpenAI** (or compatible) API: `OPENAI_API_KEY`, optional `OPENAI_BASE_URL` / `OPENAI_CHAT_MODEL`.  
  - **TOOLS_LIST** (on this branch: `src/server/toolsList.ts`) mirrors the registry’s name/description/inputSchema and is converted to **OpenAI function-calling** format.  
  - Loop: send system prompt + user message; `chat.completions.create` with `tools` and `tool_choice: 'auto'`. If the model returns `tool_calls`, we **executeTool(name, args)** for each (same handlers as MCP), inject results as `role: 'tool'` messages, and repeat until the model returns a final text reply.  
  - **executeTool** (on this branch) is a thin wrapper: normalize args, Zod-validate, call the same handler functions used by the MCP `CallTool` handler. Tool runs inside `asyncLocalStorage.run({ auth: authInfo })` so request-scoped auth is available.  
- **Response:** `POST /chat` returns `{ reply: string }` (the final assistant content). The Dashboard Assistant page shows this in the chat UI.

### Data flow summary

| Step | main (IDE) | feat/dashboard-chat (Dashboard) |
|------|------------|----------------------------------|
| 1. Auth | IDE OAuth or credential_authenticate → session set from AuthInfo or login response | Dashboard sends existing login: x-dashboard-auth, x-issuer-id, x-verifier-id |
| 2. Request | Client sends MCP JSON-RPC (e.g. CallTool) over stdio/HTTP | Dashboard sends POST /chat { message } |
| 3. Who runs tools? | IDE’s AI model chooses tools; MCP server executes CallTool requests | Our server: OpenAI chooses tools; we execute via executeTool in a loop |
| 4. Session | Set once per connection/session (OAuth or auth tool) | Set per request from headers (setSessionFromAuthInfo) |
| 5. Backend | Tools call credential-api (REST) using session.get('apiUrl') + token/IDs | Same: tools call credential-api with same session |

### Dashboard chat: behind the scenes (how the OpenAI loop works)

This section explains **how** “we run an OpenAI loop that does function-calling and we execute those functions server-side, then return the final reply.”

**1. Request hits the server**

- Dashboard sends `POST /chat` with body `{ message: "Create a schema for trading volume with address (string) and volume (number)" }` and headers: `x-dashboard-auth`, `x-issuer-id`, `x-verifier-id`, etc. (`httpServer.ts`: `app.post('/chat', ...)`).
- We build `authInfo` from those headers via `authFromHeadersToAuthInfo()` and call **setSessionFromAuthInfo(authInfo)**. That writes into the global **session** singleton: `dashboardToken`, `issuerId`, `verifierId`, `apiUrl`, `environment`. So for this request, every tool that runs later will see the same “logged-in” session (same as if the user had connected via MCP OAuth).

**2. Tool list for OpenAI**

- We don’t invent new tools for chat. We reuse the **same** tool definitions the MCP server uses. On this branch, `TOOLS_LIST` (`server/toolsList.ts`) has one entry per tool: `name`, `description`, `inputSchema` (JSON Schema with `properties` and `required`).
- **getOpenAITools()** in `chatLoop.ts` maps each entry into **OpenAI function-calling** format: `{ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } }`. So the LLM sees “credential_create_schema”, “credential_setup_pricing”, etc., with the same descriptions and parameters the MCP client would see.

**3. The loop (runChatLoop)**

- We build a **messages** array: `[ system, user ]` (system = instructions + “don’t call authenticate”; user = the Dashboard message).
- We call **OpenAI `chat.completions.create`** with `messages`, `tools`, and `tool_choice: 'auto'`. So the **model** decides whether to reply with text or to call one or more tools.
- **If the model returns `tool_calls`:**
  - We append the **assistant** message (which contains `tool_calls`) to `messages`.
  - For each tool call we have: `name` (e.g. `credential_create_schema`) and `arguments` (a JSON string, e.g. `{"schemaName":"Trading Volume","schemaType":"TradingVolumeCredential","dataPoints":[...]}`).
  - We **execute that tool on our server**: `executeTool(name, args)`. We parse `arguments`, then run it inside **asyncLocalStorage.run({ auth: authInfo }, () => executeTool(name, args))**. That keeps `authInfo` in async context so any code that needs “current request auth” can read it (session is already set; asyncLocalStorage is for consistency with the MCP path).
  - **executeTool** (`server/executeTool.ts`) is a **switch** on tool name. Each case: **normalizeToolArgs** (same as MCP), **Zod parse** with the same schema the MCP handler uses, then call the **same async handler** (e.g. `createSchema(validated)` from `tools/create-schema.ts`). So the exact same code path runs as when Cursor sends a CallTool request.
  - The handler uses **session** (e.g. `session.requireAuth()`, `session.get('issuerId')`, `session.get('apiUrl')`, `session.get('dashboardToken')`) and **apiRequest** / **createApiClient()**, which read from `session` to call **credential-api** (REST). So we’re not “simulating” anything — we’re really creating the schema (or listing, or setting pricing, etc.) on the backend.
  - We append a **tool** message per call: `{ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) }`. So the model sees the real API result (e.g. `{ schemaId: "..." }`).
  - We **loop**: call `chat.completions.create` again with the updated `messages` (now including assistant + tool messages). The model can either call more tools or return a final text reply.
- **If the model returns no `tool_calls`:** the message has **content** (text). We return that string as the **reply**. That’s what the user sees in the Dashboard chat UI.
- We cap rounds (e.g. **maxRounds = 10**) so we don’t loop forever.

**4. Back to the HTTP response**

- `runChatLoop` resolves to that final **reply** string. The `POST /chat` handler sends `res.status(200).json({ reply })`. The Dashboard Assistant page displays `reply` as the assistant’s message.

**In short:** The Dashboard doesn’t talk to the credential API directly for “AI actions.” It sends one user message to our server. Our server runs an **OpenAI chat loop** with **the same tools we expose via MCP**. For each tool the model chooses, we **execute that tool on our server** (same handlers, same session, same credential-api calls). We feed the results back to the model until it responds with plain text; that text is the “assistant reply” we return to the Dashboard. So “same tool handlers; we run an OpenAI loop that does function-calling and we execute those functions server-side, then return the final reply” is exactly this flow.

### Summary one-liners for “how we did this”

- **“We expose credential-api as MCP tools so any MCP client (Cursor, Claude, etc.) can call them with natural language.”**  
- **“Session is set once (OAuth or auth tool) for IDE; for Dashboard we set it per request from the Dashboard’s own auth headers.”**  
- **“Dashboard chat uses the same tool handlers; we run an OpenAI loop that does function-calling and we execute those functions server-side, then return the final reply.”**  
- **“One registry of tools (name, schema, handler); MCP serves it to the IDE; Dashboard chat converts the same list to OpenAI tools and runs the handlers in a loop.”**
