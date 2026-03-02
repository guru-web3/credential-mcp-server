# MCP tools reference

Authentication is done by **connecting** to the MCP server in Cursor (Connect/Start or HTTP OAuth). There are no auth tools. After connecting, use the tools below in this order when setting up from scratch: create_schema → create_program → setup_pricing → create_verification_programs.

**Production standards (AIR Kit Quickstart 2 & 3):** This MCP is aligned with [Quickstart: Issue Credentials](https://docs.moca.network/airkit/quickstart/issue-credentials) and [Quickstart: Verify Credentials](https://docs.moca.network/airkit/quickstart/verify-credentials). For production: generate JWTs on the backend, keep secrets in env, configure JWKS URL in the Developer Dashboard. See [QUICKSTART-ISSUE-VERIFY.md](./QUICKSTART-ISSUE-VERIFY.md) for MCP ↔ quickstart mapping.

## MCP capabilities (tools, resources, prompts)

- **Tools** – Listed below. Use `tools/list` and `tools/call` as usual.
- **Resources** – Use `resources/list` to discover, then `resources/read` with a URI. URIs: `credential://docs/issuance`, `credential://docs/verification`, `credential://docs/both`, `credential://template-info/issuance`, `credential://template-info/verifier`. No auth required for read.
- **Prompts** – Use `prompts/list` then `prompts/get` with name and optional arguments. Prompts: `setup_issuance` (full flow with optional `credentialTemplateId`), `setup_verifier`, `create_schema_from_description`, `issue_and_verify_quickstart`. **Default step-wise issuance (working query + default behaviors):** see [mcp-issuance.md](./mcp-issuance.md) and [Full flow](#full-flow-template-id--clone-env-mock-dev-tunnel-jwks-test) below.

---

## credential_create_schema

**Purpose:** Create and publish a credential schema with data points. Returns schemaId (stored in session for later steps).

**Parameters:**

| Parameter    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| schemaName  | string | yes      | Schema name (e.g. "trading-volume-credential") |
| schemaType  | string | yes      | Schema type identifier, alphanumeric (e.g. "tradingVolumeCredential"). Must be unique. |
| dataPoints  | array  | yes      | List of attributes. Each item: `name` (string), `type` ("string" \| "integer" \| "number" \| "boolean"), optional `description` (string). |
| description | string | no       | Schema-level description. |
| version     | string | no       | Version (default "1.0", e.g. "1.0.1"). |

**Example trigger:** "Create a schema named Trading Volume with schema type TradingVolumeCredential and one integer attribute totalVolume."

---

## credential_create_program

**Purpose:** Create an issuance program (credential template) for a schema. Schema is verified automatically before creation. Use returned programId as credentialId in SDK.

**Parameters:**

| Parameter                   | Type   | Required | Description |
|----------------------------|--------|----------|-------------|
| schemaId                   | string | no*      | Schema ID (uses last created if omitted). *Required if no schema in session. |
| credentialName             | string | no       | Filled from schema when schemaId provided. |
| schemeType / schemeTitle    | string | no       | Filled from schema when schemaId provided. |
| expirationDuration         | number | no       | Days (default 365). |
| issueMax                   | number \| null | no | Max credentials to issue (null = unlimited). |
| accessibleStartAt           | string | no       | Start date ISO or "". |
| accessibleEndAt             | string | no       | End date ISO or "". |
| revokeFlag                  | number | no       | 0 or 1 (default 0). |
| complianceAccessKeyEnabled  | number | no       | 0 or 1 (default 0). CAK on/off. |

**Example trigger:** "Create an issuance program for my last schema with max issuance 1000 and accessible from 2025-01-01 to 2025-12-31."

---

## credential_setup_pricing

**Purpose:** Configure pricing for a schema. Schema is verified automatically. pricingModel and CAK are stored via API; numeric price (priceUsd) is set on-chain. When **chain wallet env** is set (CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE + MOCA_*), the server sets the price on-chain automatically and returns `txHash`; otherwise the response includes `setPriceUrl` for the user to complete in the signer or dashboard.

**Parameters:**

| Parameter                   | Type    | Required | Description |
|----------------------------|---------|----------|-------------|
| schemaId                   | string  | no       | Uses last created schema if omitted. |
| pricingModel               | string  | no       | "each_attempt" (charge every attempt) or "pay_on_success" (default). |
| priceUsd                   | number  | no       | USD per verification (default 0). When > 0, response includes setPriceUrl. |
| complianceAccessKeyEnabled | boolean | no       | CAK on/off (default false). |
| paymentFeeSchemaId         | string  | no       | Omit to use default USD8. |

**Example trigger:** "Set pricing for this schema to pay on success with 0.1 USD per verification."

---

## On-chain tools (require chain wallet env)

These tools require **CREDENTIAL_MCP_PRIVATE_KEY** or **CREDENTIAL_MCP_SEED_PHRASE** and **MOCA_RPC_URL**, **MOCA_CHAIN_ID**, **MOCA_PAYMENTS_CONTRACT** (and for staking, **MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS**) in the MCP server env. Otherwise they return a clear error.

| Tool | Purpose |
|------|--------|
| **credential_set_price** | Set verification price on-chain (createSchema or updateSchemaFee). Params: `priceUsd`, optional `paymentFeeSchemaId`. |
| **credential_payment_deposit** | Verifier top-up: deposit USD8. Params: `verifierAddress`, `amountUsd`. |
| **credential_payment_withdraw** | Verifier withdraw USD8. Params: `verifierAddress`, `amountUsd`. |
| **credential_payment_claim_fees** | Issuer claim fees. Params: `issuerAddress`. |
| **credential_stake_moca** | Stake native MOCA for issuer tiers. Params: `amountMoca` (e.g. `"10"`). Respects MAX_SINGLE_STAKE_AMOUNT. |
| **credential_unstake_moca** | Initiate unstake. Params: `amountMoca`. After UNSTAKE_DELAY, use credential_claim_unstake_moca. |
| **credential_claim_unstake_moca** | Claim MOCA after unstake delay. Params: `timestamps` (array of claimable timestamps from UnstakeInitiated events). |

---

## credential_create_verification_programs

**Purpose:** Create (and optionally deploy) verification programs. Each program has conditions; all conditions must hold. One zkQuery is sent per condition (dashboard-aligned). Value type must match attribute type (string, integer, number, boolean). Boolean values are sent as JSON `true`/`false` to match the dashboard.

**Parameters:**

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| schemaId  | string | no       | Uses last created schema if omitted. |
| deploy    | boolean| no       | Deploy after create (default true). |
| programs  | array  | yes      | Each item: `programName` (string), `conditions` (array). Each condition: `attribute` (string), `operator` (">", ">=", "<", "<=", "=", "!="), `value` (string, number, or boolean). |

**Example trigger:** "Create a verification program age_over_18 where attribute age is >= 18."

---

## credential_list_schemas

**Purpose:** List schemas for the authenticated issuer. filterType: "own_schemas" or "other_schemas". Optional: page, size, searchStr, sortField, order.

**Example trigger:** "List my credential schemas."

---

## credential_list_templates

**Purpose:** List issuance programs (templates) for use as credentialId. Optional: page, size, searchStr, sortField, order.

**Example trigger:** "List my credential templates."

---

## credential_list_programs

**Purpose:** List verification programs for use as programId in verifyCredential. Optional: page, size, searchStr, sortField, order.

**Example trigger:** "List my verification programs."

---

## credential_docs

**Purpose:** Get step-by-step markdown for issuance and/or verification flow, aligned with AIR Kit Quickstart 2 (Issue) and Quickstart 3 (Verify). flow: "issuance" | "verification" | "both" (default "both"). Includes production notes (e.g. JWT on backend, Dashboard links).

**Example trigger:** "How do I issue and verify credentials in my app?"

---

## credential_template_info

**Purpose:** Get repo URL, branch, and clone command for issuance or verifier template. No auth. appType: "issuance" | "verifier". Default issuance branch: mcp-template. Optional branch (e.g. mcp-template, sample/passport-age).

**Example trigger:** "Give me the repo and branch for the issuance template."

---

## credential_issuance_app_config

**Purpose:** Generate .env snippet for the issuance app from session. Includes key-generation instructions and schema dataPoints for each credential. Optional credentialTemplateId. The response includes `localTesting` (tunnel, JWKS) and **noApiMock**: if no real APIs for user data, the template mocks from dataPoints in env; mock by type (string/integer/number/boolean) per schema—see "User data and mocking (no API integration)" below.

**Example trigger:** "Generate .env for my issuance app."

---

## credential_verifier_app_config

**Purpose:** Generate .env snippet for the verifier app from session. Optional programId.

**Example trigger:** "Generate .env for my verifier app."

---

## credential_app_steps

**Purpose:** Get ordered steps: clone → install → generate keys + env → dev → tunnel (instatunnel) → JWKS → build → deploy. appType: "issuance" | "verifier". Optional branch. Step 3 notes: if no real APIs for user data, the template mocks from schema dataPoints in env; mock by type—see "User data and mocking (no API integration)" below.

**Example trigger:** "Give me the steps to clone, install, and deploy the issuance template."

---

## credential_configure_issuer_jwks

**Purpose:** Set JWKS URL and whitelist domain in the credential dashboard from a single origin. Requires auth. origin must be the tunnel URL from the console (run `npx instatunnel 3000` and copy the HTTPS URL)—do not use localhost for JWKS. Optional: probeBeforeUpdate, replaceDomains.

**Example trigger:** "Configure JWKS for my issuance app at https://myapp.example.com."

---

## Tunnel (expose local port for e2e local testing)

For e2e local testing (e.g. JWKS probe and credential issuance), run your app (`pnpm dev`), then in another terminal start the tunnel:

```bash
npx instatunnel 3000
```

For a different port (e.g. if your app runs on 3479):

```bash
npx instatunnel 3479
```

Copy the HTTPS URL from the tunnel output and use it as `origin` when calling `credential_configure_issuer_jwks` (no trailing slash). Do not use localhost for JWKS—always use the URL from the console. The MCP probe sends `bypass-tunnel-reminder` and a custom User-Agent when needed.

---

## Issuance template: README and tunnel flow

The issuance template repo has a **README** (getting started, env vars, JWKS) and a **tunnel guide** (e.g. `tunnel.md` or `docs/TUNNEL-AND-JWKS.md`). When guiding users or when using the `setup_issuance` prompt, align with that flow:

1. **Clone and install** – Clone the template (branch e.g. `mcp-template`), then `pnpm install`.
2. **Env** – Get `.env.local` from `credential_issuance_app_config`, run `pnpm run generate-keys`, strictly replace `PARTNER_PRIVATE_KEY`, `NEXT_PUBLIC_PARTNER_PUBLIC_KEY`, `NEXT_PUBLIC_REOWN_PROJECT_ID`.
3. **Run app** – Terminal 1: `pnpm dev` or `pnpm run dev:local` (app at http://localhost:3000 or http://127.0.0.1:3000).
4. **Tunnel** – Terminal 2: `pnpm run tunnel` (if the template has that script) or `npx instatunnel 3000`. Copy the **HTTPS URL** from the console.
5. **JWKS** – Call `credential_configure_issuer_jwks` with `origin` = that tunnel URL (no trailing slash), `probeBeforeUpdate: true`. Do not use localhost for JWKS.
6. **Test** – Open the tunnel URL in the browser; optionally run `curl` on `/` and `/jwks.json` locally.

**Example prompts for issuance (for agents or copy-paste):**

- "Set up the credential issuance app: clone, install, env, run dev and tunnel, then configure JWKS with the tunnel URL."
- "I want to run the issuance template locally and expose it over HTTPS for JWKS testing—give me the steps and use the MCP to set JWKS with the tunnel URL."
- "Get the issuance template README flow and tunnel + JWKS steps; then call credential_configure_issuer_jwks with the URL from npx instatunnel 3000."

---

## Full flow: template ID → clone, env, mock, dev, tunnel, JWKS, test

**Default step-wise issuance setup:** See [mcp-issuance.md](./mcp-issuance.md) for the working copy-paste query and **default behaviors** (generate keys when not given, mock when no API, tunnel for local e2e when no endpoint given).

Use this when you have a **credential template ID** (issuance program ID) and want to run the full local flow: clone the template, generate `.env.local` (with schema dataPoints for mocking), run dev, tunnel, configure JWKS, and test at http://localhost:3000.

**Copy-paste query (replace `YOUR_TEMPLATE_ID` with your credential template/program ID):**

```
I have credential template ID YOUR_TEMPLATE_ID. Set up the issuance app end-to-end: clone the template repo from the default branch, generate .env.local using credential_issuance_app_config so dataPoints from the schema are included for mocking, run pnpm run generate-keys and paste the env. Then run the app locally (pnpm dev), start the tunnel (npx instatunnel 3000), copy the tunnel HTTPS URL and call credential_configure_issuer_jwks with that origin (no localhost). Finally open http://localhost:3000 to test the issuance flow. Do not edit the user-data route—use the built-in mock from schema dataPoints.
```

**Short form:**

```
Using credential template ID YOUR_TEMPLATE_ID: clone the issuance template, generate .env.local from credential_issuance_app_config (mock from schema dataPoints), generate-keys, run dev, run npx instatunnel 3000, configure JWKS with the tunnel URL, then open localhost:3000 to test.
```

**If you only have a schema ID (or "schema created today"):** The MCP generates app config by **template/program ID**, not schema ID. Use the query below to find/create a program for the schema, then run the full flow. Use the **animoca-credentials** MCP if available.

**Default copy-paste query (schema created today, working step-wise setup):**

```
Use animoca-credentials MCP if found. Query for the schema created today—only one will be there. I want to set up the issuance app: find an issuance program for this schema, then clone the template repo, generate .env.local with credential_issuance_app_config (so dataPoints from the schema are in the config for mocking), run generate-keys and set env. Don't edit the user-data route when only mocking. Rely on the built-in mock (NEXT_PUBLIC_CREDENTIALS_CONFIG + dataPoints). Mock by type: string → "test", integer/number → 0, boolean → false. Add a TODO in app/(home)/api/user/user-data/route.ts for a real API later. Run the app (pnpm dev) on port 3000—kill anything using that port. Start pnpm tunnel or npx instatunnel 3000. Pick the tunnel URL only after both app and tunnel are running. Call credential_configure_issuer_jwks with the tunnel URL (not localhost), then open http://localhost:3000 to test. Use the template’s built-in mock (no user-data route edits).
```

**Implementing the mock:** For the built-in mock to work, `.env.local` must contain the **full** `NEXT_PUBLIC_CREDENTIALS_CONFIG` from `credential_issuance_app_config`—including the `dataPoints` array for each credential. Paste the entire env snippet; do not remove or simplify `dataPoints`. Don't edit the user-data route when only mocking. Add a TODO in `app/(home)/api/user/user-data/route.ts` for plugging in a real API later. Mock by type: **string** → `"test"`, **integer/number** → `0`, **boolean** → `false`.

**Default behaviors (when config not given):**

1. **Keys not given** – If `NEXT_PUBLIC_PARTNER_PUBLIC_KEY` or `PARTNER_PRIVATE_KEY` is not set, run `pnpm run generate-keys` and populate `.env.local`.
2. **No API reference** – If no proper API is given for user data, use the mock approach: do not edit the user-data route; rely on the built-in mock (NEXT_PUBLIC_CREDENTIALS_CONFIG + dataPoints), mock by type (string → "test", integer/number → 0, boolean → false), and add a TODO in `app/(home)/api/user/user-data/route.ts` for plugging in a real API later.
3. **No endpoint/tunnel** – For local e2e testing, run the app on port 3000 (kill existing process if needed), start the tunnel (pnpm tunnel or npx instatunnel 3000), pick the tunnel URL only after both are running, then call `credential_configure_issuer_jwks` with that URL and open http://localhost:3000 to test.

You can also use the **setup_issuance** prompt with argument `credentialTemplateId` set to your template ID; the prompt includes the same flow (clone, env, tunnel, JWKS, test).

---

## User data and mocking (no API integration)

After creating or configuring the issuance app, **if the user has not provided real APIs** for fetching user data (e.g. no backend integration for `app/(home)/api/user/user-data/route.ts`):

1. **Do not require editing the user-data route.** The template already supports **automatic mocking** when `NEXT_PUBLIC_CREDENTIALS_CONFIG` includes **dataPoints** for each credential. `credential_issuance_app_config` fills dataPoints from the schema when generating the env snippet.
2. **Implementing the mock:** When writing `.env.local`, **paste the full env snippet** from `credential_issuance_app_config`, including the complete `NEXT_PUBLIC_CREDENTIALS_CONFIG` with its **dataPoints** arrays. Do not omit, truncate, or replace `dataPoints` with an empty array—the template uses these to generate mock user-data. If `dataPoints` is missing or empty, the built-in mock will not run for that credential.
3. **Ensure dataPoints come from the schema** – Use the env from `credential_issuance_app_config` (which fetches schema and fills dataPoints) so the template has the correct attribute names.
4. **Mock by type** – For type-accurate mock values, use the schema’s dataPoint **types** (string, integer, number, boolean). Default convention: **string** → `"test"`, **integer** / **number** → `0`, **boolean** → `false`. The template’s `buildMockByDataPoints` uses key-name heuristics by default; when extending or implementing mocks, fetch schema details (e.g. from `credential_list_schemas` or the schema used in the program) and mock each attribute according to its type.
5. **Production** – Add a TODO in `app/(home)/api/user/user-data/route.ts` for when you plug in a real API later.

Agents should: after setup, if no real integration APIs are given, **rely on the env dataPoints from the MCP** and the template’s built-in mock; optionally document or implement type-aware mocking using the schema’s name + type so issuance works end-to-end without editing the route.
