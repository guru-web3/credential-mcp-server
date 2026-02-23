# Animoca Credential MCP Server

Use **natural language** in Cursor (or other MCP clients) to manage AIR credentials: create schemas, set pricing, create issuance and verification programs, and deploy. No need to remember tool names—just describe what you want.

---

## How to deploy (so others can use from Cursor MCP)

Choose one way to make the server available; then others add it in **Cursor → Settings → MCP** (or **Cursor → Preferences → MCP** on some versions).

### Deploy option 1: Publish to npm (easiest for others)

1. **Publish the package** (from this repo):
   ```bash
   npm login
   npm publish --access public
   ```
   (Use a scoped package or private registry if you prefer.)

2. **Tell others** to add this in Cursor MCP settings:
   ```json
   {
     "mcpServers": {
       "animoca-credentials": {
         "command": "npx",
         "args": ["-y", "@animoca/credential-mcp-server"],
         "env": {}
       }
     }
   }
   ```
   They need **Node.js** installed. No clone or build.

### Deploy option 2: Use from source (no npm publish)

1. **Share the repo** (Git clone URL or copy of the repo).

2. **Tell others** to run:
   ```bash
   git clone <repo-url>
   cd credential-mcp-server
   npm install
   npm run build
   ```

3. **They add in Cursor MCP** (replace with their actual paths). If you get **`spawn node ENOENT`**, use the **full path to `node`** (see [Troubleshooting](#troubleshooting-spawn-node-enoent) below):
   ```json
   {
     "mcpServers": {
       "animoca-credentials": {
         "command": "/FULL/PATH/TO/node",
         "args": ["/FULL/PATH/TO/credential-mcp-server/dist/index.js"]
       }
     }
   }
   ```
   Example (macOS with Homebrew Node): `"command": "/opt/homebrew/bin/node"`. On Windows use e.g. `"C:\\Program Files\\nodejs\\node.exe"` and `"C:/Users/Me/credential-mcp-server/dist/index.js"`.

After adding the server, they **restart Cursor** (or reload the window), then in chat they authenticate once and use natural language (see below).

### Deploy option 3: Remote HTTP server with OAuth ("Needs authentication" in Cursor)

To get **standard MCP login** like Figma or Slack—Cursor shows **"Needs authentication"** and triggers a one-click OAuth flow—run the **HTTP** server and connect to it by URL.

1. **Run the HTTP server** (locally or on a host with HTTPS in production):
   ```bash
   npm run build
   npm run start:http
   ```
   Default: `http://localhost:3749`. Set `MCP_HTTP_PORT` to change the port. Set `MCP_OAUTH_BASE_URL` to your public URL (e.g. `https://your-mcp-host.com`) when deploying.

2. **Optional env** (see [Environment variables](#environment-variables) below):
   - `MCP_OAUTH_BASE_URL` – Base URL of this server (for OAuth redirects and login page). Default: `http://localhost:3749`.
   - `MCP_OAUTH_JWT_SECRET` – Secret used to sign access tokens. Set a strong value in production.
   - `MCP_OAUTH_REDIRECT_URIS` – Comma-separated list of allowed OAuth redirect URIs (Cursor’s callback). Defaults include `http://localhost:4939/callback` and `https://cursor.com/oauth/callback`.

3. **In Cursor**: add the server as an **HTTP** MCP server so Cursor runs the OAuth flow:
   ```json
   {
     "mcpServers": {
       "animoca-credentials": {
         "url": "http://localhost:3749/mcp",
         "type": "http"
       }
     }
   }
   ```
   For a deployed server, use your HTTPS URL, e.g. `"url": "https://your-mcp-host.com/mcp"`.

4. **Connect**: In Cursor, click **Connect** (or **Start**) next to the server. Cursor will open a browser; sign in with your wallet on the signer page, paste the JSON, and you’re authenticated. No need to call `credential_authenticate` manually—the Bearer token is sent on every request.

---

## For someone else: use this in 3 steps

### 1. Add the MCP

**Option A – From source (this repo)**

```bash
git clone <this-repo-url>
cd credential-mcp-server
npm install
npm run build
```

Then in **Cursor**: open **Settings → MCP**, add a server and use the config below. If you see **`spawn node ENOENT`**, use the full path to `node` for `command` (see [Troubleshooting](#troubleshooting-spawn-node-enoent)).

```json
{
  "mcpServers": {
    "animoca-credentials": {
      "command": "/FULL/PATH/TO/node",
      "args": ["/ABSOLUTE/PATH/TO/credential-mcp-server/dist/index.js"]
    }
  }
}
```

Find your `node` path: in a terminal run `which node` (e.g. `/opt/homebrew/bin/node` or `~/.nvm/versions/node/v20.x.x/bin/node`).

**Option B – With npx (if published to npm)**

In Cursor **Settings → MCP**, add:

```json
{
  "mcpServers": {
    "animoca-credentials": {
      "command": "npx",
      "args": ["-y", "@animoca/credential-mcp-server"],
      "env": {}
    }
  }
}
```

- **macOS Cursor config file:** `~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json` (or use Settings → MCP UI).  
- **Windows:** `%APPDATA%\Cursor\...` (or add via Settings → MCP).

Restart Cursor (or reload the window) after changing MCP settings.

### 2. Authenticate once

**Recommended: wallet address (no private key)**  
Say you want to authenticate with your **wallet address**. The AI will call `credential_get_login_challenge` and give you a signer URL. Open it in a browser, sign the message with your wallet, copy the JSON result, and paste it back (or say “use this” and paste). The AI then calls `credential_authenticate` with that JSON. You never share a private key.

- *“Authenticate me for staging with my wallet 0x…”*  
- *“I want to use my wallet address to log in, no private key.”*

**Alternative: private key**  
You can instead provide your **Ethereum wallet private key** (64 hex chars, with or without `0x`) when the AI asks. The AI will call the auth tool directly. Use this only if you prefer not to use the signer page.

- *“Authenticate for staging. I’ll paste my wallet private key.”*

You only need to authenticate once per session (or after restarting Cursor).

**Signer page:** The signer is a Next.js app in `signer-app/`, deployable to Netlify for use across devices and browsers. Locally, run `npm run signer` to serve the static HTML signer at https://credential-challenge-signer.netlify.app, or run the Next.js signer with `npm run signer:next` (see [Deploy signer to Netlify](#deploy-signer-to-netlify)). When using wallet-address auth, the AI will use `credential_get_login_challenge` to get a URL; open that URL in a browser (or the signer) and paste the message/timestamp if needed.

### 3. Ask in natural language

After auth, you can say things like:

- *“Create a schema for age verification with an integer field called age.”*
- *“Set pricing for this schema to pay on success, no extra fee.”*
- *“Create an issuance program for the last schema I created.”*
- *“Create a verification program that checks age is at least 18.”*
- *“List my verification programs so I can get the program ID for my app.”*
- *“List my credential templates.”*
- *“Show me the steps to issue and verify credentials in my app.”*

The AI will pick the right tools and parameters. You don’t need to know tool names or JSON shapes.

---

## What you can ask (natural language examples)

| You say | What the MCP does |
|--------|--------------------|
| *“Authenticate with staging using my wallet address 0x…”* | `credential_get_login_challenge` first (signer URL), then `credential_authenticate` with signed JSON |
| *“Authenticate with my private key.”* | `credential_authenticate` (private key) |
| *“Create a schema for NFT holders with a field numberOfNfts (integer).”* | `credential_create_schema` |
| *“Create a schema for age with one field: age, number.”* | `credential_create_schema` |
| *“Check that my schema is published.”* | `credential_verify_schema_published` |
| *“Set pricing for this schema: pay on success, no USD fee.”* | `credential_setup_pricing` |
| *“Create an issuance program (credential template) for my last schema.”* | `credential_create_program` |
| *“Create verification programs: age_over_18 where age >= 18.”* | `credential_create_verification_programs` |
| *“Create three verification programs: bronze (volume >= 1000), silver (>= 10000), gold (>= 100000).”* | `credential_create_verification_programs` with multiple programs |
| *“List my verification programs.”* | `credential_list_programs` |
| *“List my credential templates.”* | `credential_list_templates` |
| *“List my schemas.”* | `credential_list_schemas` |
| *“How do I issue and verify credentials in my app?”* | `credential_docs` (issuance + verification steps and links) |
| *“I want to deploy the issuance app; which repo and branch?”* | `credential_template_info` (issuance; branch mcp/template or sample/passport-age) |
| *“Generate .env for my issuance app and tell me how to generate the keys.”* | `credential_issuance_app_config` (after auth; returns snippet + key-generation instructions) |
| *“Give me the steps to clone, install, and deploy the issuance template.”* | `credential_app_steps` (issuance) |

---

## Available tools (for the AI)

| Tool | Purpose |
|------|--------|
| `credential_get_login_challenge` | **Recommended.** When user has only a wallet address: get one-time message and signer URL; user signs in browser, then use result in `credential_authenticate`. |
| `credential_authenticate` | Log in with (1) private key, or (2) signed JSON from signer page (after `credential_get_login_challenge`). Required before other tools. |
| `credential_create_schema` | Create and publish a schema (name, type, data points). |
| `credential_verify_schema_published` | Verify a schema is published and ready for programs. |
| `credential_setup_pricing` | Set pricing model for a schema (e.g. pay_on_success, optional price). API stores schema, pricing model, and CAK only; the numeric price is set **on-chain**. When `priceUsd` is a positive number (> 0), the result includes **`setPriceUrl`** — open that URL in a browser to set the price on-chain (signer app /set-price; connect wallet on MOCA and confirm). If `setPriceUrl` is absent, use Credential Dashboard → Pricing → Define schema price. |
| `credential_create_program` | Create an issuance program (credential template) for a schema. |
| `credential_create_verification_programs` | Create (and deploy) verification programs with conditions. |
| `credential_list_schemas` | List your (or others’) schemas. |
| `credential_list_templates` | List issuance programs (templates) for use as credentialId. |
| `credential_list_programs` | List verification programs for use as programId in verifyCredential. |
| `credential_docs` | Get issuance and/or verification flow docs and links. |
| `credential_template_info` | Get repo URL, branch, and clone command for issuance or verifier template (no auth). Default issuance branch: `mcp/template`; also `sample/passport-age`. |
| `credential_issuance_app_config` | Generate .env snippet for issuance app from session. Includes instructions to auto-generate PARTNER_PRIVATE_KEY and public key (no manual steps). JWKS kid defaults to partner ID. |
| `credential_verifier_app_config` | Generate .env snippet for verifier app from session. |
| `credential_app_steps` | Get ordered steps: clone → install → generate keys + env → dev → build → deploy → set JWKS URL in dashboard. |

---

## Develop to deploy (issuance / verifier app)

After creating schemas and programs, you can get the template repo, env config, and a checklist so the AI (or you) can clone, install, generate keys, and deploy with no manual key generation:

1. **“I want to deploy the issuance app”** or **“Set me up with the sample branch.”**  
2. AI can call `credential_template_info` (appType: `issuance`, optional branch: `mcp/template` or `sample/passport-age`) → repo URL and clone command with branch.  
3. AI calls `credential_issuance_app_config` (after auth) → env snippet and **instructions to auto-generate** PARTNER_PRIVATE_KEY and NEXT_PUBLIC_PARTNER_PUBLIC_KEY (openssl commands); agent runs them and writes .env.local.  
4. AI calls `credential_app_steps` (appType: `issuance`) → ordered checklist.  
5. AI runs: clone with branch → install → paste env (with generated keys) → `pnpm dev` → optionally build and deploy.  
6. **Post-deploy:** Set JWKS URL in the credential Partner Dashboard to `https://<your-deployed-origin>/jwks.json` (kid defaults to partner ID). Whitelist your domain.

Same flow for verifier: `credential_template_info` (verifier), `credential_verifier_app_config`, `credential_app_steps` (verifier).

---

## Typical flow (natural language)

1. **“Authenticate for staging with my wallet 0x…”** → AI gives you signer URL; you sign in browser, paste JSON back; AI completes auth. (Or: **“Authenticate with my private key”** → you paste key when asked.)  
2. **“Create a schema for [X] with fields [Y].”**  
3. **“Set pricing: pay on success.”** (or “per-issuance $0.50”)  
4. **“Create an issuance program for that schema.”**  
5. **“Create a verification program that [condition].”** (e.g. age >= 18)  
6. **“List my verification programs.”** → Copy programId for your app.  
7. **“How do I verify in my app?”** → Use `credential_docs` and programId in AIR Kit.

---

## On-chain actions (signer app and dashboard)

These require a wallet; the MCP server cannot sign transactions.

| Action | Where | What |
|--------|--------|------|
| **Login** | Signer app (main page) | Sign a login message (no contract call). Used for MCP auth. |
| **Set schema price** | Signer app **/set-price** or Credential Dashboard | **Signer:** Open `/set-price?price=0.1&schemaId=...` (or use the link returned by `credential_setup_pricing` when you pass `priceUsd`). Connect wallet on MOCA, confirm `createSchema(fee)` or `updateSchemaFee(schemaId, fee)`. **Dashboard:** Pricing → Define schema price → set USD8 and confirm. |
| **Withdraw / claim fees** | Credential Dashboard only | Payout page: withdraw (verifier) or claim fees (issuer) via payments controller contract. Not exposed in the signer app. |

The signer app supports **Set schema price** so you can complete the on-chain step after `credential_setup_pricing` (which only registers schema + pricing model + CAK with the API). Configure the signer with `NEXT_PUBLIC_PAYMENT_CHAIN_ID` and `NEXT_PUBLIC_PAYMENT_CONTROLLER_ADDRESS` (see `signer-app/.env.example`).

---

## Development

### Build

```bash
npm run build
```

### Watch

```bash
npm run watch
```

### Test with MCP Inspector

```bash
npm run inspector
```

### Testing (unit + scenario)

Unit tests cover auth argument validation, login message format (aligned with credential-api), and create-schema validation (aligned with credential-dashboard). Run:

```bash
npm run build
npm run test
```

Or in one step: `npm run test:ci`.

To run the scenario test runner (unit tests + optional E2E when `PRIVATE_KEY` or `E2E_PRIVATE_KEY` is set):

```bash
node scripts/run-scenario-tests.js
```

See [docs/test-scenarios.md](docs/test-scenarios.md) for Zephyr scenario mapping and prompts for manual or AI-assisted testing.

### Environment

- **MCP server:** No env vars are required for basic use (STDIO). Environment (staging/production) and API URLs are set when you authenticate. For the **HTTP server** (OAuth): `MCP_OAUTH_BASE_URL`, `MCP_OAUTH_JWT_SECRET`, `MCP_OAUTH_REDIRECT_URIS`, `MCP_HTTP_PORT`, and `CREDENTIAL_SIGNER_URL` (see [Deploy option 3](#deploy-option-3-remote-http-server-with-oauth-needs-authentication-in-cursor)).
- **Signer URL:** To use the **deployed** Next.js signer (e.g. on Netlify) so `credential_get_login_challenge` returns a public URL, set **`CREDENTIAL_SIGNER_URL`** to your signer app URL (e.g. `https://your-signer.netlify.app`). If unset, the default is `https://credential-challenge-signer.netlify.app` (for local `npm run signer`).

---

## Deploy signer to Netlify

The signer is a Next.js app in **`signer-app/`**, built as a static export so it can be deployed to Netlify and used from any device or browser.

1. **Build locally (optional):**
   ```bash
   cd signer-app
   npm install
   ```
   For WalletConnect (e.g. mobile wallet scan), set **`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`** (get a free project ID at [WalletConnect Cloud](https://cloud.walletconnect.com/)). Copy `signer-app/.env.example` to `signer-app/.env.local` and set the value. Injected wallets (MetaMask, etc.) work without it.
   ```bash
   npm run build
   ```
   This produces the `out/` directory (static HTML/JS/CSS).

2. **Deploy to Netlify:**
   - Connect your Git repo to Netlify.
   - Set **Base directory** to `signer-app`.
   - Build command: `npm run build` (default).
   - Publish directory: `out` (Netlify will use `signer-app/netlify.toml` if present).
   - (Optional) In Netlify **Environment variables**, add **`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`** with your [WalletConnect Cloud](https://cloud.walletconnect.com/) project ID so mobile users can connect via WalletConnect.
   - Deploy. Note your site URL (e.g. `https://credential-signer.netlify.app`).

3. **Point the MCP server at the deployed signer:**  
   When running the MCP server (e.g. in Cursor), set **`CREDENTIAL_SIGNER_URL`** to your Netlify URL so `credential_get_login_challenge` returns links that open the deployed signer. Example (in your MCP config or env):
   ```json
   "env": { "CREDENTIAL_SIGNER_URL": "https://credential-signer.netlify.app" }
   ```

Local fallback: **`npm run signer`** still serves the static `static/index.html` at https://credential-challenge-signer.netlify.app for local dev without building the Next.js app.

---

## Troubleshooting: `spawn node ENOENT`

**Symptom:** Cursor MCP shows `A system error occurred (spawn node ENOENT)`.

**Cause:** The `command` must be the **full path to the `node` binary**, not the word `"node"`. Cursor doesn’t use your terminal PATH when it spawns the MCP.

**Fix – use the generated config (easiest):**

From the project root, run:

```bash
cd /Users/guru/Documents/animoca/credential-mcp-server
./scripts/mcp-config-for-cursor.sh
```

Copy the printed JSON and paste it into **Cursor → Settings → MCP**. It will have your real `node` path and project path filled in.

**Fix – manual:** In a terminal run `which node` and use that path as `command`. Example (your path will differ):

```json
{
  "mcpServers": {
    "animoca-credentials": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/Users/guru/Documents/animoca/credential-mcp-server/dist/index.js"]
    }
  }
}
```

With **nvm**/ **fnm**, `command` might be `/Users/guru/.nvm/versions/node/v20.10.0/bin/node` — use whatever `which node` prints.

---

## Troubleshooting (HTTP / Streamable MCP)

- **SSE error: Non-200 status code (500)**  
  The client’s SSE connection to the MCP endpoint got a 500. Common causes: (1) Server threw while handling a request (check server logs for `[MCP] handleRequest error:` and the stack trace). (2) GET request with no body was passed as `undefined` — the server now normalizes to `{}`. Fix: ensure the HTTP server is running (`pnpm start:http` or `node dist/httpServer.js`), that auth (Bearer token) is valid, and that the client sends `Mcp-Session-Id` for requests after the first `initialize` POST.

- **No server info found / Server not yet created, returning empty offerings**  
  The IDE MCP client has no stored server/session yet. For HTTP transport: the client must complete the OAuth flow (or provide a valid Bearer token), then send a POST to `/mcp` with an `initialize` JSON-RPC message; the server creates a session and returns a session ID. Subsequent requests (including GET for SSE) must include the `Mcp-Session-Id` header. If the client never completes initialize, or the session is lost, you’ll see “No server info found”. Fix: (re)connect the MCP server in the IDE (e.g. add server in Cursor settings, complete OAuth or token setup, then use the server).

- **Session not found (404)**  
  The `Mcp-Session-Id` header referred to a session that no longer exists (e.g. server restarted, or session was deleted). The client should send a new `initialize` POST without a session ID to create a new session.

---

## License

MIT


sample prompt 
Prompts for manual and AI testing

Schema – success:
“Create a schema named Trading Volume with schema type TradingVolumeCredential, attributes: totalVolume (integer), platform (string), version 1.0.”
→ Expect: credential_create_schema with valid data; schemaId returned.



Schema – validation error:
“Create a schema with title only, no schema type or version.”
→ Expect: Refusal or validation error (missing schemaType/version/dataPoints), no successful create.



List flows:
“List my credential schemas.” / “List my verification programs.”
→ Expect: Calls after auth return list or empty list; before auth, clear “authenticate first” message.

These prompts can be copy-pasted into Cursor (or any MCP client) to regression-test the AI’s tool choice and inputs.