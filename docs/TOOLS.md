# MCP tools reference

Authentication is done by **connecting** to the MCP server in Cursor (Connect/Start or HTTP OAuth). There are no auth tools. After connecting, use the tools below in this order when setting up from scratch: create_schema → create_program → setup_pricing → create_verification_programs.

**Production standards (AIR Kit Quickstart 2 & 3):** This MCP is aligned with [Quickstart: Issue Credentials](https://docs.moca.network/airkit/quickstart/issue-credentials) and [Quickstart: Verify Credentials](https://docs.moca.network/airkit/quickstart/verify-credentials). For production: generate JWTs on the backend, keep secrets in env, configure JWKS URL in the Developer Dashboard. See [QUICKSTART-ISSUE-VERIFY.md](./QUICKSTART-ISSUE-VERIFY.md) for MCP ↔ quickstart mapping.

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

**Purpose:** Configure pricing for a schema. Schema is verified automatically. pricingModel and CAK are stored via API; numeric price (priceUsd) is set on-chain (response includes setPriceUrl when priceUsd > 0).

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

**Purpose:** Get repo URL, branch, and clone command for issuance or verifier template. No auth. appType: "issuance" | "verifier". Optional branch (e.g. mcp-template, sample/passport-age).

**Example trigger:** "Give me the repo and branch for the issuance template."

---

## credential_issuance_app_config

**Purpose:** Generate .env snippet for the issuance app from session. Includes key-generation instructions. Optional credentialTemplateId.

**Example trigger:** "Generate .env for my issuance app."

---

## credential_verifier_app_config

**Purpose:** Generate .env snippet for the verifier app from session. Optional programId.

**Example trigger:** "Generate .env for my verifier app."

---

## credential_app_steps

**Purpose:** Get ordered steps: clone → install → generate keys + env → dev → build → deploy → set JWKS URL. appType: "issuance" | "verifier". Optional branch.

**Example trigger:** "Give me the steps to clone, install, and deploy the issuance template."

---

## credential_configure_issuer_jwks

**Purpose:** Set JWKS URL and whitelist domain in the credential dashboard from a single origin. Requires auth. origin (e.g. https://localhost:3000). Optional: probeBeforeUpdate, replaceDomains.

**Example trigger:** "Configure JWKS for my issuance app at https://myapp.example.com."
