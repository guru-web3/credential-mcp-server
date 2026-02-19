# Testing the full issuance flow (MCP)

This guide walks through testing **all issuance steps** using the credential MCP server: authenticate → create (and publish) schema → verify schema → create template → set pricing. Use it in **Cursor** (with the MCP server configured) or with the **MCP Inspector**.

---

## How to run the MCP server

**From repo (after build):**
```bash
cd credential-mcp-server
npm install
npx tsc
node dist/index.js
```

**Cursor:** Add the server in Cursor settings (MCP) with command e.g. `node dist/index.js` and cwd set to `credential-mcp-server`.

**Inspector (standalone testing):**
```bash
cd credential-mcp-server && pnpm run inspector
```
Then in the Inspector browser UI, connect via STDIO. The server must be run with **node** (not the script path alone). If you see `EACCES` or spawn errors, set:
- **Command:** `node`
- **Arguments:** `dist/index.js`
- **CWD:** path to `credential-mcp-server`
Or use the script as-is (it passes `node dist/index.js`).

---

## Prerequisites

- **Wallet:** An EOA wallet that is registered as a partner in the [Developer Dashboard](https://developers.sandbox.air3.com) (staging) or production.
- **Private key:** The wallet’s private key (64 hex chars, with or without `0x`) for `credential_authenticate`. Use a **test wallet** only; never paste a mainnet key.
- **MCP server:** Add the credential MCP server in Cursor (e.g. path to `credential-mcp-server` and command `node dist/index.js`) or run the inspector: `npm run inspector` from `credential-mcp-server`.

---

## Flow overview

| Step | Tool | Purpose |
|------|------|--------|
| 1 | `credential_authenticate` | Log in with wallet; get partnerId, issuerId, issuerDid. **Required first.** |
| 2 | `credential_create_schema` | Create and publish a schema to OSS (one call does both). |
| 3 | `credential_verify_schema_published` | (Optional) Confirm schema is reachable. |
| 4 | `credential_create_template` | Create an issuance program (template) linked to the schema. |
| 5 | `credential_setup_pricing` | Set pricing model for the schema (MOCA payment API). |
| — | `credential_list_schemas` / `credential_list_templates` | List what you have (optional checks). |

**Note:** `credential_create_schema` already publishes to OSS. Use `credential_publish_schema` only if you have an existing schema (e.g. from the dashboard) that needs (re-)publishing.

---

## Step 1: Authenticate

**Tool:** `credential_authenticate`

**Arguments (example):**

```json
{
  "privateKey": "YOUR_64_HEX_PRIVATE_KEY_WITH_OR_WITHOUT_0x",
  "environment": "staging"
}
```

- **`environment`:** `"staging"` or `"production"`. Use `staging` for testing (e.g. sandbox dashboard).
- **`privateKey`:** Test wallet only. Cursor/AI will not store it; it’s only sent to the MCP server for the login signature.

**What to do in Cursor:**  
Ask the AI: *“Authenticate to the credential API for staging using my test wallet.”* You’ll need to provide the private key when prompted (or put it in the tool args once for testing).

**Expected result (conceptually):**

```json
{
  "success": true,
  "message": "Authentication successful",
  "partnerId": "...",
  "issuerId": "...",
  "issuerDid": "did:air:id:...",
  "verifierId": "...",
  "verifierDid": "...",
  "walletAddress": "0x...",
  "environment": "staging",
  "nextSteps": ["Use credential_create_schema ...", ...]
}
```

**If it fails:**  
- “Login failed” / 401: Wallet not registered as partner, or wrong env. Register the wallet in [Developer Dashboard](https://developers.sandbox.air3.com) (staging) and try again.  
- “Invalid signature”: Ensure the private key is correct and 64 hex characters.

---

## Step 2: Create and publish a schema

**Tool:** `credential_create_schema`

This creates the schema **and** publishes it to OSS in one call. No separate “create” then “publish” step.

**Arguments (example):**

```json
{
  "schemaName": "Trading Volume Credential",
  "schemaType": "tradingVolumeCredential",
  "dataPoints": [
    { "name": "totalVolume", "type": "number", "description": "Total trading volume in USD" },
    { "name": "tier", "type": "string", "description": "User tier" },
    { "name": "isVerified", "type": "boolean" }
  ],
  "description": "Credential for trading volume and tier",
  "version": "1.0"
}
```

- **`schemaName`:** Human-readable title.
- **`schemaType`:** Unique identifier (camelCase). Used later in `credential_create_template` as `schemeType`.
- **`dataPoints`:** Array of `{ name, type, description? }`. `type` must be one of: `string`, `integer`, `number`, `boolean`.
- **`description`**, **`version`:** Optional; defaults are applied if omitted.

**What to do in Cursor:**  
e.g. *“Create a credential schema for trading volume with attributes totalVolume (number), tier (string), and isVerified (boolean). Schema type: tradingVolumeCredential.”*

**Expected result (conceptually):**

```json
{
  "success": true,
  "message": "Schema created and published successfully",
  "schemaId": "c21...",
  "storageId": "...",
  "version": "1.0",
  "status": "...",
  "dataPoints": [...],
  "nextSteps": ["Configure pricing with setup_pricing tool", ...]
}
```

**Session:** The server stores `schemaId`, `schemaName`, `schemaType` for the next steps. You don’t need to pass `schemaId` again unless you switch context.

**If it fails:**  
- “No issuer ID”: Run **Step 1** first.  
- “Schema creation failed” / 4xx: Check that `schemaType` is unique and `dataPoints` have valid `name` and `type`.

---

## Step 3 (optional): Verify schema is published

**Tool:** `credential_verify_schema_published`

**Arguments:**  
None required if you just created the schema in Step 2 (session has `schemaId`). Or:

```json
{ "schemaId": "c21..." }
```

**What to do in Cursor:**  
*“Verify that the current schema is published and accessible.”*

**Expected result:**  
A message that the schema is published and reachable (or an error with the reason).

---

## Step 4: Create credential template (issuance program)

**Tool:** `credential_create_template`

Creates the **issuance program** (template) that your app will use as `credentialId` in `airService.issueCredential`.

**Arguments (example):**

```json
{
  "credentialName": "Trading Volume Credential",
  "schemeType": "tradingVolumeCredential",
  "schemeTitle": "Trading Volume Credential",
  "expirationDuration": 365,
  "issueMax": null,
  "accessibleStartAt": "",
  "accessibleEndAt": "",
  "revokeFlag": 0,
  "complianceAccessKeyEnabled": 0
}
```

- **`schemeType`:** Must match the `schemaType` you used in Step 2 (e.g. `tradingVolumeCredential`).
- **`credentialName`**, **`schemeTitle`:** Human-readable names.
- **`expirationDuration`:** Credential validity in days (e.g. 365).
- **`issueMax`:** Max credentials to issue; `null` = unlimited.
- **`revokeFlag`**, **`complianceAccessKeyEnabled`:** 0 or 1 (integer). 0 = off.

**What to do in Cursor:**  
*“Create a credential template for the trading volume schema, name ‘Trading Volume Credential’, expire in 365 days, unlimited issuance.”*

**Expected result (conceptually):**

```json
{
  "success": true,
  "message": "Credential template created successfully",
  "templateId": "c21...",
  "credentialName": "Trading Volume Credential",
  "status": "..."
}
```

**Important:** Save `templateId` (this is the **credentialId** / issuance program ID for the SDK).

**If it fails:**  
- “No schema ID in session”: Complete Step 2 in the same session.  
- “No issuer ID” / auth errors: Run Step 1 again.

---

## Step 5: Set pricing for the schema

**Tool:** `credential_setup_pricing`

Configures the **pricing model** for the schema on the MOCA payment API. The tool’s implementation uses:

- **`pricingModel`:** `"pay_on_success"` (charge only for successful verifications) or `"pay_on_issuance"`.
- **`complianceAccessKeyEnabled`:** `true` / `false` (CAK).
- **`schemaId`:** Optional; defaults to the schema created in the current session.
- **`paymentFeeSchemaId`:** Optional; omit to use default.

**Arguments (example):**

```json
{
  "schemaId": "c21...",
  "pricingModel": "pay_on_success",
  "complianceAccessKeyEnabled": false
}
```

Omit `schemaId` to use the last-created schema in session.

**What to do in Cursor:**  
*“Set up pricing for the current schema: pay_on_success, CAK disabled.”*

**Expected result (conceptually):**

```json
{
  "success": true,
  "message": "Pricing configured successfully",
  "schemaId": "c21...",
  "pricingModel": "pay_on_success",
  "complianceAccessKeyEnabled": false,
  "nextSteps": ["Create verification programs with credential_create_verification_programs"]
}
```

**If it fails:**  
- “Pricing setup failed” / non-200 from payment API: Check dashboard/fee wallet; ensure partner is allowed to set fees. Staging uses `https://api.staging.mocachain.org`.

---

## Optional: List schemas and templates

- **`credential_list_schemas`**  
  No args required (uses session issuer). Returns your schemas (and total count).  
  Example prompt: *“List my credential schemas.”*

- **`credential_list_templates`**  
  No args required. Returns your credential templates (issuance program IDs and names).  
  Example prompt: *“List my credential templates.”*

Use these to confirm Step 2 and Step 4 created the right resources.

---

## End-to-end test script (conceptual)

Run these in order in one session (e.g. one Cursor chat or one Inspector session):

1. **credential_authenticate**  
   `{ "privateKey": "<test_wallet_hex>", "environment": "staging" }`

2. **credential_create_schema**  
   `{ "schemaName": "Test Schema", "schemaType": "testSchemaCredential", "dataPoints": [{"name":"score","type":"number"}] }`

3. **credential_verify_schema_published**  
   `{}`

4. **credential_create_template**  
   `{ "credentialName": "Test Credential", "schemeType": "testSchemaCredential", "schemeTitle": "Test Credential" }`

5. **credential_setup_pricing**  
   `{ "pricingModel": "pay_on_success", "complianceAccessKeyEnabled": false }`

6. **credential_list_templates**  
   `{}`  
   → You should see the new template and its ID (use as `credentialId` in the SDK).

---

## Publish-only flow (existing schema)

If the schema was created in the **dashboard** and you only need to (re-)publish it to OSS:

1. **credential_authenticate** (same as above).
2. **credential_publish_schema**  
   `{ "schemaId": "c21..." }`  
   Omit `schemaId` if the server already has the right schema in session (e.g. after listing and selecting one).

Then continue with **credential_create_template** (and optionally pricing) as above. For create_template you still need the schema to be in session or you must have created it in the same session; the template creation uses `session.get('schemaId')`. If you only published an existing schema, ensure the server stores that schema’s ID in session if the implementation expects it (or pass schemaId in a future tool enhancement).

---

## Reference: credential-dashboard scripts (working API shape)

The **credential-dashboard** repo has scripts that call the same APIs and are known to work. Use them to compare payloads or run flows outside MCP:

| Flow | Script | Location |
|------|--------|----------|
| Create + publish schema | `create-schema.js` | `credential-dashboard/scripts/create-schema.js` |
| Create verification programs | `create-verification-programs.js` | `credential-dashboard/scripts/create-verification-programs.js` |
| Deploy programs | `deploy-programs.js` | `credential-dashboard/scripts/deploy-programs.js` |

**Schema (publishOnOss):** The API expects `title`, `description`, `schemeType`, `version`, `credentialSubject`, and **`attribute: { data: [...] }`** where each attribute has `name`, `title`, `id` (21-char), `depth`, `description`, `isRequired`, `type`, and optional `data_value_*` fields. The MCP `credential_create_schema` tool builds this shape from `dataPoints`. The MCP `credential_publish_schema` tool uses **POST /management/scheme/queryById** with `{ schemeId }` to load the schema, then builds the same request body (credentialSubject + attribute.data) and calls publishOnOss—matching the script’s “Publishing schema” payload.

**Quick run (scripts):**
```bash
cd credential-dashboard/scripts
npm install
# Create schema (needs DASHBOARD_TOKEN, schema JSON file)
node create-schema.js --schemaFile ./examples/hyperliquid-trading-schema.json
# Create programs (needs DASHBOARD_TOKEN, programs JSON)
node create-verification-programs.js --programsFile ./examples/brett-token-programs.json
```
See `scripts/README.md` and `scripts/QUICK_START.md` for full usage.

---

## References

- [Credentials Overview](https://docs.moca.network/airkit/usage/credential/credentials-flow)
- [Quickstart: Issue Credentials](https://docs.moca.network/airkit/quickstart/issue-credentials)
- [Schema Creation](https://docs.moca.network/airkit/usage/credential/schema-creation)
- Developer Dashboard (staging): https://developers.sandbox.air3.com
