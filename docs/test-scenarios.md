# Test scenarios (Zephyr mapping and prompts)

This document maps Zephyr test scenarios to MCP tool behavior and provides prompts for manual or AI-assisted testing.

## Source of truth

**The Zephyr export xlsx (e.g. `atm-exporter.xlsx`) is the first source of truth for test scenarios.** The machine-readable list used by tests and scripts is `docs/zephyr-scenarios.json`. To regenerate it from the xlsx, run:

```bash
node scripts/extract-zephyr-scenarios.js
```

Or with a custom xlsx path:

```bash
ZEPHYR_XLSX=/path/to/atm-exporter.xlsx node scripts/extract-zephyr-scenarios.js
```

The script writes `docs/zephyr-scenarios.json` with `scenarioCount` and `scenarios[]` (key, name, folder, objective, precondition, etc.). The scenario runner (`scripts/run-scenario-tests.js`) loads this file and runs unit tests grouped by folder.

---

## Zephyr folder → MCP tools → Test files

| Zephyr folder | MCP tool(s) | Test file(s) | Example scenario IDs |
|---------------|--------------|--------------|----------------------|
| **Wallet Login** | `credential_authenticate`, `credential_get_login_challenge` | `auth-validation.test.js`, `login-message.test.js` | T2053, T2340, T2560, T2633, T3087, T3088 |
| **Issuer Schema** | `credential_create_schema`, `credential_verify_schema_published` | `create-schema-validation.test.js`, `verify-schema-published-validation.test.js` | T2081, T2082, T2084–T2087, T2099, T2115–T2118, T2446, T2451, T3089, T3091–T3093 |
| **Issuer Program** | `credential_create_program` (create-credential-template), `credential_list_templates` | `create-credential-template-validation.test.js` | T2088, T2089, T2090, T2091, T2100–T2102, T3090, T3106, T3107, T3244, T3246 |
| **Verifier Program** | `credential_create_verification_programs`, `credential_list_programs` | `create-programs-validation.test.js` | T2092, T2093, T2095, T2104–T2107, T2119–T2121, T2343, T2450, T2642, T3113–T3125, T3247 |
| **General / List / Pricing** | `credential_setup_pricing`, `credential_list_schemas`, `credential_list_templates`, `credential_list_programs` | `setup-pricing-validation.test.js`, `list-schemas-validation.test.js`, `list-templates-validation.test.js`, `list-programs-validation.test.js` | T2094, T2344, T2558, T2559, T2634, T2635, T2641, T3243 (General); Issuer Pricing T3094, T3099–T3104 |
| **Docs / Template** | `credential_docs`, `credential_template_info`, `credential_app_steps`, `credential_issuance_app_config`, `credential_verifier_app_config` | `credential-docs-validation.test.js`, `template-info-validation.test.js` | (No auth; input validation only) |

For the full list of scenario keys (114+) per folder, see **`docs/zephyr-scenarios.json`** (generated from the xlsx).

---

## Unit tests (always run)

All flows have dedicated validation test files:

- **Wallet Login:** `auth-validation.test.js`, `login-message.test.js` — credentialsJson merge, privateKey vs message-signing, `buildLoginMessage` format.
- **Issuer Schema:** `create-schema-validation.test.js`, `verify-schema-published-validation.test.js` — valid payload; reject empty name/type/dataPoints; schemaType alphanumeric; version format; schemaId optional.
- **Issuer Program:** `create-credential-template-validation.test.js` — schemaId, expirationDuration ≥ 1, accessibleEndAt after accessibleStartAt.
- **Verifier Program:** `create-programs-validation.test.js` — programs array, conditions, operator enum; reject empty programs/conditions.
- **Pricing / List:** `setup-pricing-validation.test.js`, `list-schemas-validation.test.js`, `list-templates-validation.test.js`, `list-programs-validation.test.js` — pricingModel, priceUsd ≥ 0; page/size/order/filterType.
- **Docs:** `credential-docs-validation.test.js`, `template-info-validation.test.js` — flow enum; appType and optional branch.

Run: `npm run build && npm run test` or `npm run test:ci`.  
Scenario runner (by folder): `node scripts/run-scenario-tests.js`.

---

## Scenario runner (optional E2E)

- **Script:** `scripts/run-scenario-tests.js`
- **Behavior:** Loads `docs/zephyr-scenarios.json`, runs unit tests grouped by Zephyr folder (Wallet Login → Issuer Schema → Issuer Program → Verifier Program → General → Docs). If `PRIVATE_KEY` or `E2E_PRIVATE_KEY` is set, runs E2E: authenticate + list_schemas against staging.
- **Usage:** `node scripts/run-scenario-tests.js` or `PRIVATE_KEY=0x... node scripts/run-scenario-tests.js`

---

## Prompts for manual / AI testing

Use these in Cursor (or any MCP client) to verify tool choice and behavior for each flow.

### Auth (wallet, no private key)

- **Prompt:** “I want to authenticate with my wallet 0x&lt;address&gt;. Don’t use a private key.”
- **Expected:** AI calls `credential_get_login_challenge` with that address, returns signer URL. After you sign and paste the JSON, AI calls `credential_authenticate` with that JSON and gets success.

### Auth (private key)

- **Prompt:** “Authenticate using my private key (I’ll set CREDENTIAL_MCP_PRIVATE_KEY).”
- **Expected:** AI calls `credential_authenticate` with environment (e.g. staging); success.

### Schema – success (MOCA-T2081)

- **Prompt:** “Create a schema named Trading Volume with schema type TradingVolumeCredential, attributes: totalVolume (integer), platform (string), version 1.0.”
- **Expected:** `credential_create_schema` with valid data; schemaId returned.

### Schema – validation error (MOCA-T2082)

- **Prompt:** “Create a schema with title only, no schema type or version.”
- **Expected:** Refusal or validation error (missing schemaType / version / dataPoints); no successful create.

### List schemas

- **Prompt:** “List my credential schemas.” / “List schemas with page 1 and size 10.”
- **Expected:** After auth, `credential_list_schemas`; returns list or empty. Before auth, “authenticate first”.

### List templates

- **Prompt:** “List my credential templates.” / “List credential templates with search by name.”
- **Expected:** After auth, `credential_list_templates`; returns list or empty. Before auth, “authenticate first”.

### List programs

- **Prompt:** “List my verification programs.” / “List verification programs.”
- **Expected:** After auth, `credential_list_programs`; returns list or empty. Before auth, “authenticate first”.

### Setup pricing

- **Prompt:** “Set up pricing for my schema: pay on success, $0.10.” / “Setup pricing with pay_on_issuance and price 0.”
- **Expected:** After auth (and optionally after creating a schema), `credential_setup_pricing` with pricingModel and priceUsd; success or clear error.

### Create verification program (MOCA-T2092, T2093)

- **Prompt:** “Create a verification program named nft_holder_standard that checks attribute balance >= 1.” / “Create verification programs for my last schema: one program with condition level >= 5.”
- **Expected:** After auth and schema, `credential_create_verification_programs` with programs array (programName, conditions with attribute, operator, value); success or validation error.

### Credential docs / template info (no auth)

- **Prompt:** “Show me credential docs for issuance flow.” / “What is template info for verifier app?”
- **Expected:** `credential_docs` (flow: issuance | verification | both) or `credential_template_info` (appType: issuance | verifier, optional branch); no auth required.

---

## Validation parity with dashboard and API

- **create_schema:** schemaType must be alphanumeric (no spaces), and cannot be numbers only; version must match format (e.g. 1.0, 1.0.1). Aligned with credential-dashboard and API.
- **create_credential_template:** expirationDuration ≥ 1; when both set, accessibleEndAt must be after accessibleStartAt (Zephyr T2089). Aligned with dashboard.
- **create_verification_programs:** At least one program and at least one condition per program; operator enum; aligned with dashboard.
- **authenticate:** Message format and ISO timestamp match credential-api `SignatureCheckHelperImpl` (AIR Credential Dashboard wording).
