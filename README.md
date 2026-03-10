# Animoca Credential MCP Server

Use **natural language** in Cursor (or other MCP clients) to manage AIR credentials: create schemas, set pricing, create issuance and verification programs, and deploy. No need to remember tool names—just describe what you want.

---

## Clone and run the server

**Repo (with MCP install & setup instructions):**  
https://github.com/mocaverse/credential-mcp-server/tree/feat/private-key-auth
You can point an AI agent at this repo; the README contains full install and MCP configuration steps.

1. **Clone the repo**
   ```bash
   git clone -b feat/private-key-auth https://github.com/mocaverse/credential-mcp-server.git
   cd credential-mcp-server
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**  
   Copy `.env.example` to `.env` and set:

   - **`CREDENTIAL_MCP_ENVIRONMENT`** — Use **`staging`** or **`production`** only for testing.  
     - `staging` → Devnet; dashboard: https://developers.staging.air3.com/dashboard
     - `production` → Testnet; dashboard: https://developers.air3.com/dashboard
   - **`CREDENTIAL_MCP_PRIVATE_KEY`** — Your wallet private key (64 hex chars). Stored only in `.env`; do not commit. Use a dedicated, low-value wallet. Required for on-chain tools (stake, set price, payments). See [Private key and on-chain wallet](#private-key-and-on-chain-wallet).

   **Note:** For **sandbox** (aligned with [credential-dashboard sandbox](https://github.com/mocaverse/credential-dashboard/tree/sandbox)), set `CREDENTIAL_MCP_ENVIRONMENT=sandbox`. The server then exposes a reduced tool list (no pricing, stake, unstake, withdraw, or payment tools). See [docs/SANDBOX.md](docs/SANDBOX.md).

4. **Build**
   ```bash
   pnpm run build
   ```

5. **Run the server**
   - **HTTP server:** In the repo directory run:
     ```bash
     pnpm run run:server
     ```
     Then point your MCP client at `http://localhost:3749/mcp` (default port; override with `MCP_HTTP_PORT` in `.env`). For the canonical tool list and input JSON (for dashboard or credential-api), use **`GET http://localhost:3749/api/toollist`** — see [docs/SANDBOX.md](docs/SANDBOX.md).
  - **Cursor (STDIO):** Add this server in Cursor MCP settings. Example config (replace paths with your absolute paths):
      ```json
      "moca-credential": {
        "url": "http://localhost:3749/mcp",
        "headers": {
          "Accept": "application/json, text/event-stream"
        }
      }
      ```

6. **Connect in Cursor**  
   Click **Connect** or **Start** next to the server. For HTTP, complete the browser sign-in. There are no auth tools to call—session is set by connecting.

---

## Private key and on-chain wallet

This repo can use a **private key** (or seed phrase) so the MCP server can perform on-chain actions without opening the signer app or dashboard.

| What | Where | Security |
|------|--------|----------|
| **Private key** | Set `CREDENTIAL_MCP_PRIVATE_KEY` in the server env (e.g. `.env` in this repo, or Cursor MCP → your server → **env**). | **Never commit** `.env` or any file containing the key. `.env` is in `.gitignore`. Use a **dedicated, low-value** wallet for MCP only. |
| **Seed phrase** | Alternatively set `CREDENTIAL_MCP_SEED_PHRASE` (and optionally `CREDENTIAL_MCP_ACCOUNT_INDEX`, default `0`). | Same as above: env only, never commit, dedicated wallet. |
| **Chain config** | `MOCA_RPC_URL`, `MOCA_CHAIN_ID`, `MOCA_PAYMENTS_CONTRACT`, `MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS`. Auto-set from `CREDENTIAL_MCP_ENVIRONMENT` (aligned with credential-dashboard: devnet for staging/sandbox, testnet for production); override in `.env` if needed. | No secrets; safe to document. |

**Tools that require the private key (or seed):**  
`credential_set_price`, `credential_setup_pricing` (when `priceUsd` > 0), `credential_payment_deposit`, `credential_payment_withdraw`, `credential_payment_claim_fees`, `credential_stake_moca`, `credential_unstake_moca`, `credential_claim_unstake_moca`.

---

### For AI / models (instructions)

- **Authentication:** There are no auth tools. The user must **connect** to the MCP server (Cursor: click **Connect** or **Start** next to the server). For HTTP transport, they complete the browser sign-in. Session (issuerId, verifierId, tokens) is set from that; do not suggest calling any "credential_authenticate" or "credential_get_login_challenge" tool.
- **Recommended order:** (1) User connects. (2) `credential_create_schema` (schemaName, schemaType, dataPoints). (3) `credential_create_program` (schemaId, optional dates, issueMax, complianceAccessKeyEnabled). (4) `credential_setup_pricing` (schemaId, pricingModel: "each_attempt" | "pay_on_success", optional priceUsd, complianceAccessKeyEnabled). (5) `credential_create_verification_programs` (schemaId, programs with conditions). Schema is verified automatically before pricing and program creation.
- **Tool purposes:** Use `credential_docs` when the user asks how to set up or verify credentials; it returns step-by-step markdown aligned with [AIR Kit Quickstart 2 (Issue Credentials)](https://docs.moca.network/airkit/quickstart/issue-credentials) and [Quickstart 3 (Verify Credentials)](https://docs.moca.network/airkit/quickstart/verify-credentials), including production standards (JWT on backend, env for secrets). Other tools: create_schema, create_program, setup_pricing, create_verification_programs, list_* (schemas, templates, programs), template_info, issuance_app_config, verifier_app_config, app_steps, configure_issuer_jwks.

---

**Key-based auth (no "Needs authentication")**  
If you set `CREDENTIAL_MCP_PRIVATE_KEY` or `CREDENTIAL_MCP_SEED_PHRASE` in the **server's** environment (e.g. in a `.env` file in this repo, or in the process that runs the HTTP server), the server does **not** expose OAuth discovery. Cursor will not show "Needs authentication" or "Connect"; each request to `/mcp` is authenticated using the key. For HTTP, the key must be in the **server's** env (Cursor's MCP "env" is for the client and is not sent to a remote HTTP server). For STDIO, Cursor passes env to the spawned process, so you can put the key in Cursor's MCP config `env`.

---

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
| *“Create a schema for NFT holders with a field numberOfNfts (integer).”* | `credential_create_schema` |
| *“Set pricing for this schema: pay on success, no USD fee.”* | `credential_setup_pricing` |
| *“Create an issuance program (credential template) for my last schema.”* | `credential_create_program` |
| *“Create verification programs: age_over_18 where age >= 18.”* | `credential_create_verification_programs` |
| *“Create three verification programs: bronze (volume >= 1000), silver (>= 10000), gold (>= 100000).”* | `credential_create_verification_programs` with multiple programs |
| *“List my verification programs.”* | `credential_list_programs` |
| *“List my credential templates.”* | `credential_list_templates` |
| *“List my schemas.”* | `credential_list_schemas` |
| *“How do I issue and verify credentials in my app?”* | `credential_docs` (issuance + verification steps; aligned with AIR Kit Quickstart 2 & 3, production standards) |
| *“I want to deploy the issuance app; which repo and branch?”* | `credential_template_info` (issuance; default branch mcp-template or sample/passport-age) |
| *“Generate .env for my issuance app and tell me how to generate the keys.”* | `credential_issuance_app_config` (after connect; returns snippet + key-generation instructions) |
| *“Give me the steps to clone, install, and deploy the issuance template.”* | `credential_app_steps` (issuance) |


Authentication is done by **connecting** to the MCP server in Cursor (Connect/Start or HTTP OAuth); there are no auth tools.

**Production standards:** Issuance and verification flows follow [AIR Kit Quickstart 2 (Issue Credentials)](https://docs.moca.network/airkit/quickstart/issue-credentials) and [Quickstart 3 (Verify Credentials)](https://docs.moca.network/airkit/quickstart/verify-credentials). Use JWT on the backend, keep secrets in env, configure JWKS in the Developer Dashboard. See [docs/QUICKSTART-ISSUE-VERIFY.md](docs/QUICKSTART-ISSUE-VERIFY.md) for MCP ↔ quickstart mapping.

---

## Available tools (for the AI)

| Tool | Purpose |
| `credential_create_schema` | Create and publish a schema (name, type, data points). |
| `credential_setup_pricing` | Set pricing model for a schema (e.g. pay_on_success, optional price). API stores schema, pricing model, and CAK only; the numeric price is set **on-chain**. When `priceUsd` is a positive number (> 0), the result includes **`setPriceUrl`** — open that URL in a browser to set the price on-chain (signer app /set-price; connect wallet on MOCA and confirm). If `setPriceUrl` is absent, use Credential Dashboard → Pricing → Define schema price. |
| `credential_create_program` | Create an issuance program (credential template) for a schema. |
| `credential_create_verification_programs` | Create (and deploy) verification programs with conditions. |
| `credential_list_schemas` | List your (or others’) schemas. |
| `credential_list_templates` | List issuance programs (templates) for use as credentialId. |
| `credential_list_programs` | List verification programs for use as programId in verifyCredential. |
| `credential_docs` | Get issuance and/or verification flow docs; aligned with [Quickstart 2](https://docs.moca.network/airkit/quickstart/issue-credentials) & [Quickstart 3](https://docs.moca.network/airkit/quickstart/verify-credentials), production standards. |
| `credential_template_info` | Get repo URL, branch, and clone command for issuance or verifier template (no auth). Default issuance branch: `mcp-template`; also `sample/passport-age`. |
| `credential_issuance_app_config` | Generate .env snippet for issuance app from session. Includes instructions to auto-generate PARTNER_PRIVATE_KEY and public key (no manual steps). JWKS kid defaults to partner ID. |
| `credential_verifier_app_config` | Generate .env snippet for verifier app from session. |
| `credential_app_steps` | Get ordered steps: clone → install → generate keys + env → dev → build → deploy → set JWKS URL in dashboard. |
| `credential_configure_issuer_jwks` | Set JWKS URL and whitelist domain in dashboard from a single origin (requires auth). |

---

## Develop to deploy (issuance / verifier app)

After creating schemas and programs, you can get the template repo, env config, and a checklist so the AI (or you) can clone, install, generate keys, and deploy with no manual key generation:

1. **“I want to deploy the issuance app”** or **“Set me up with the sample branch.”**  
2. AI can call `credential_template_info` (appType: `issuance`, default branch: `mcp-template` or optional e.g. `sample/passport-age`) → repo URL and clone command with branch.  
3. AI calls `credential_issuance_app_config` (after connect) → env snippet and **instructions to auto-generate** PARTNER_PRIVATE_KEY and NEXT_PUBLIC_PARTNER_PUBLIC_KEY (openssl commands); agent runs them and writes .env.local.  
4. AI calls `credential_app_steps` (appType: `issuance`) → ordered checklist.  
5. AI runs: clone with branch → install → paste env (with generated keys) → `pnpm dev` → optionally build and deploy.  
6. **Post-deploy:** Set JWKS URL in the credential Partner Dashboard to `https://<your-deployed-origin>/jwks.json` (kid defaults to partner ID). Whitelist your domain.

Same flow for verifier: `credential_template_info` (verifier), `credential_verifier_app_config`, `credential_app_steps` (verifier).

---

## Typical flow (natural language)

1. **Connect** to the MCP server in Cursor (click Connect/Start). For HTTP server, complete the browser sign-in. No auth tool to call.  
2. **“Create a schema for [X] with fields [Y].”**  
3. **“Set pricing: pay on success.”** (or “per verification $0.50”)  
4. **“Create an issuance program for that schema.”**  
5. **“Create a verification program that [condition].”** (e.g. age >= 18)  
6. **“List my verification programs.”** → Copy programId for your app.  
7. **“How do I verify in my app?”** → Use `credential_docs` and programId in AIR Kit.

---

## On-chain actions (signer app and dashboard)

When the MCP server does **not** have a chain wallet in env (see below), these actions require a wallet in the browser:

| Action | Where | What |
|--------|--------|------|
| **Login** | Signer app (main page) | Sign a login message (no contract call). Used for MCP auth. |
| **Set schema price** | Signer app **/set-price** or Credential Dashboard | **Signer:** Open `/set-price?price=0.1&schemaId=...` (or use the link returned by `credential_setup_pricing` when you pass `priceUsd`). Connect wallet on MOCA, confirm `createSchema(fee)` or `updateSchemaFee(schemaId, fee)`. **Dashboard:** Pricing → Define schema price → set USD8 and confirm. |
| **Withdraw / claim fees** | Credential Dashboard only | Payout page: withdraw (verifier) or claim fees (issuer) via payments controller contract. Not exposed in the signer app. |

The signer app supports **Set schema price** so you can complete the on-chain step after `credential_setup_pricing` (which only registers schema + pricing model + CAK with the API). Configure the signer with `NEXT_PUBLIC_PAYMENT_CHAIN_ID` and `NEXT_PUBLIC_PAYMENT_CONTROLLER_ADDRESS` (see `signer-app/.env.example`).

### On-chain tools (private key in env)

If you set **CREDENTIAL_MCP_PRIVATE_KEY** or **CREDENTIAL_MCP_SEED_PHRASE** (and chain env: **MOCA_RPC_URL**, **MOCA_CHAIN_ID**, **MOCA_PAYMENTS_CONTRACT**, optionally **MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS**) in the MCP server env (e.g. in Cursor MCP settings `env`), the server can perform on-chain operations without the user opening the signer or dashboard. When either key env is set, the server **auto-authenticates** on first use (e.g. when you run `credential_setup_pricing` or `credential_list_schemas`), so you do not need to call the authenticate tool or complete OAuth first.

- **credential_setup_pricing** with `priceUsd` > 0 will set the price on-chain automatically and return `txHash` (no `setPriceUrl` needed).
- **credential_set_price** – Set or update verification price on-chain (createSchema / updateSchemaFee).
- **credential_payment_deposit** – Verifier top-up (deposit USD8).
- **credential_payment_withdraw** – Verifier withdraw USD8.
- **credential_payment_claim_fees** – Issuer claim fees.
- **credential_stake_moca** – Stake native MOCA for issuer usage quota (tiers).
- **credential_unstake_moca** – Initiate unstake; after delay use **credential_claim_unstake_moca** with the claimable timestamp(s).

**Security:** Use a dedicated, low-value wallet for MCP. Never commit private keys or seed phrases. Set them only in the MCP client `env` (e.g. Cursor → Settings → MCP → your server → env).

## Sample prompts

Copy-paste these into Cursor (or any MCP client) to test tool choice and behavior. Full test scenarios by flow are in [docs/TESTING-QUERIES.md](docs/TESTING-QUERIES.md).

### Manual and AI testing

| Prompt | Expected behavior |
|--------|-------------------|
| *"Create a schema named Trading Volume with schema type TradingVolumeCredential, attributes: totalVolume (integer), platform (string), version 1.0."* | `credential_create_schema` with valid data; schemaId returned. |
| *"Create a schema with title only, no schema type or version."* | Refusal or validation error (missing schemaType/version/dataPoints). |
| *"List my credential schemas."* / *"List my verification programs."* | After auth: list or empty list. Before auth: clear "authenticate first" message. |

### By flow (quick reference)

- **Schema:** *"Create a schema with one string attribute …"* / *"... one integer …"* / *"... one number …"* / *"... one boolean …"*; or multiple data points with descriptions.
- **Pricing:** *"Set pricing to charge for all verification attempts"* → `each_attempt`; *"charge only for successful verifications"* → `pay_on_success`; *"Set price to 0.1 USD"* → priceUsd; *"Enable CAK"* → complianceAccessKeyEnabled.
- **Program (issuance):** *"Create program with start date 2025-01-01 and end date 2025-12-31"*; *"max issuance 1000"*; *"unlimited issuance"*; *"CAK enabled"*.
- **Verification programs:** Conditions by type (string, integer, number, boolean); operators map to =, !=, >, <, >=, <=. See [docs/TESTING-QUERIES.md](docs/TESTING-QUERIES.md) for payload examples and Dashboard UI ↔ MCP mapping.

Full test scenarios (schema, pricing, programs, verification, Dashboard UI ↔ MCP mapping) are in [docs/TESTING-QUERIES.md](docs/TESTING-QUERIES.md).

### On-chain (requires private key in env)

- *"Set verification price to 0.1 USD on-chain."*
- *"Set up pricing for my last schema: pay on success with 0.2 USD."*
- *"Deposit 10 USD8 for verifier 0xVERIFIER_ADDRESS."*
- *"Withdraw 5 USD8 for verifier 0xVERIFIER_ADDRESS."*
- *"Claim fees for issuer 0xISSUER_ADDRESS."*
- *"Stake 10 MOCA for issuer usage quota."*
- *"Initiate unstake of 5 MOCA."*
- *"Claim unstaked MOCA for timestamps [1234567890]."* (after delay)

---

## Queries to run (issuance setup)

Copy-paste one of these into Cursor (with the **animoca-credentials** MCP connected) to run the step-wise issuance setup. See [docs/mcp-issuance.md](docs/mcp-issuance.md) and [docs/TOOLS.md](docs/TOOLS.md) for full flow and default behaviors.

**Example 1 – Default (schema created today, full flow with mock)**  
Use when you have a schema created today and want clone → env → mock → dev → tunnel → JWKS → test:

```
Use animoca-credentials MCP if found. Query for the schema created today—only one will be there. I want to set up the issuance app: find an issuance program for this schema, then clone the template repo, generate .env.local with credential_issuance_app_config (so dataPoints from the schema are in the config for mocking), run generate-keys and set env. Don't edit the user-data route when you're only mocking. Rely on the template's built-in mock driven by NEXT_PUBLIC_CREDENTIALS_CONFIG and its dataPoints. Mock by type: string → "test", integer/number → 0, boolean → false. Add a TODO for when you plug in a real API later in app/(home)/api/user/user-data/route.ts. Run the app (pnpm dev) on port 3000—kill anything already using that port. Start pnpm tunnel or npx instatunnel 3000. Pick the tunnel URL only after both the app and the tunnel are running. Call credential_configure_issuer_jwks with the tunnel URL (not localhost), then open http://localhost:3000 to test.
```

**Example 2 – When you have a credential template ID**  
Replace `YOUR_TEMPLATE_ID` with your issuance program ID:

```
Use animoca-credentials MCP if found. I have credential template ID YOUR_TEMPLATE_ID. Set up the issuance app: clone the template repo, generate .env.local with credential_issuance_app_config (dataPoints for mocking), run generate-keys and set env. Don't edit the user-data route; use the built-in mock. Run pnpm dev on port 3000 (kill if needed), start npx instatunnel 3000, pick the tunnel URL after both are running, call credential_configure_issuer_jwks with that URL, then open http://localhost:3000 to test.
```

**Example 3 – Short form (template ID)**  
```
Using credential template ID YOUR_TEMPLATE_ID: clone the issuance template, generate .env.local from credential_issuance_app_config, generate-keys, run dev on 3000, npx instatunnel 3000, configure JWKS with the tunnel URL (after both are running), open localhost:3000 to test.
```

**Example 4 – Just the steps (no schema/template specified)**  
```
Set up the credential issuance app end-to-end: clone the template, get .env from credential_issuance_app_config and generate-keys, run dev on port 3000, start the tunnel (npx instatunnel 3000), configure JWKS with the tunnel URL once both are running, then open http://localhost:3000 to test. Use the built-in mock (don't edit user-data route).
```

**Example 5 – Schema ID only (find program first)**  
Replace `YOUR_SCHEMA_ID` if you know it:

```
Use animoca-credentials MCP if found. I have schema ID YOUR_SCHEMA_ID. Find an issuance program for this schema, then set up the issuance app: clone the template, generate .env.local with credential_issuance_app_config, generate-keys, run dev, tunnel (npx instatunnel 3000), configure JWKS with the tunnel URL (after both app and tunnel are running), open http://localhost:3000 to test. Use the built-in mock; add a TODO in app/(home)/api/user/user-data/route.ts for a real API later.
```
