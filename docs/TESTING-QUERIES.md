# Testing queries and scenarios

Use these natural-language queries and example payloads to test every important field for schema, pricing, program, and verification flows. Connect to the MCP server first (no auth tools).

**Full flow with copy-paste payloads:** For the ordered sequence (create schema → program → pricing → all 15 verification programs in two batches), see [TESTING-REFERENCE.md](./TESTING-REFERENCE.md).

---

## Dashboard UI ↔ MCP mapping

| Dashboard UI              | MCP parameter / concept |
|---------------------------|--------------------------|
| Verifying on              | Chain / environment      |
| Select a schema          | schemaId                 |
| Schema type               | schemeType               |
| Pricing model             | pricingModel: each_attempt \| pay_on_success |
| Price during setup        | priceUsd (numeric; on-chain step via setPriceUrl) |
| CAK (Compliance Access Key) | complianceAccessKeyEnabled |
| Accessible start / end date | accessibleStartAt, accessibleEndAt (ISO) |
| Max issuance              | issueMax (number or null) |
| Define query              | conditions: attribute, operator, value |
| Data type (boolean/string/…) | attribute type when building verification conditions |
| Attribute description    | dataPoints[].description (schema); Description field in dashboard |

---

## 1. Schema creation

### By data type

- **String:** "Create a schema with one string attribute called platform."
- **Integer:** "Create a schema with one integer attribute called totalVolume."
- **Number:** "Create a schema with one number attribute called score."
- **Boolean:** "Create a schema with one boolean attribute called isVerified."

### With descriptions

- "Create a schema named My Credential with schema type MyCredential, with two attributes: name (string, description: Full name of the holder) and level (integer, description: Tier level 1–5)."

### Example payload (credential_create_schema)

```json
{
  "schemaName": "test-all-types",
  "schemaType": "testAllTypes",
  "dataPoints": [
    { "name": "label", "type": "string", "description": "A string label" },
    { "name": "count", "type": "integer", "description": "An integer count" },
    { "name": "amount", "type": "number", "description": "A number amount" },
    { "name": "eligible", "type": "boolean", "description": "Eligibility flag" }
  ],
  "description": "Schema for testing all data types",
  "version": "1.0"
}
```

---

## 2. Pricing

### Pricing model

- "Set pricing to charge for all verification attempts." → `pricingModel: "each_attempt"`.
- "Set pricing to charge only for successful verifications." → `pricingModel: "pay_on_success"`.

### Price during setup

- "Set price to 0.1 USD during setup." → `priceUsd: 0.1`.
- "Set price to 1 USD for verification." → `priceUsd: 1`.

### CAK

- "Enable CAK for this schema's pricing." → `complianceAccessKeyEnabled: true`.

### Example payload (credential_setup_pricing)

```json
{
  "schemaId": "<from session or last create_schema>",
  "pricingModel": "pay_on_success",
  "priceUsd": 0.1,
  "complianceAccessKeyEnabled": true
}
```

---

## 3. Program creation (issuance)

### Accessible start/end date

- "Create program with accessible start date 2025-01-01 and end date 2025-12-31." → `accessibleStartAt: "2025-01-01T00:00:00.000Z"`, `accessibleEndAt: "2025-12-31T23:59:59.999Z"` (or equivalent ISO).

### Max issuance

- "Create program with max issuance 1000." → `issueMax: 1000`.
- "Create program with unlimited issuance." → `issueMax: null` or omit.

### CAK

- "Create program with CAK enabled." → `complianceAccessKeyEnabled: 1`.

### Combined

- "Create an issuance program for my last schema with accessible start 2025-01-01, end 2025-12-31, max issuance 5000, and CAK enabled."

### Example payload (credential_create_program)

```json
{
  "schemaId": "<from session>",
  "accessibleStartAt": "2025-01-01T00:00:00.000Z",
  "accessibleEndAt": "2025-12-31T23:59:59.999Z",
  "issueMax": 1000,
  "complianceAccessKeyEnabled": 1,
  "expirationDuration": 365
}
```

---

## 4. Verification programs

### Operators (MCP)

MCP uses: `>`, `>=`, `<`, `<=`, `=`, `!=`. Dashboard UI may show "Is equal to", "Is greater than", etc.; they map to these.

### By attribute type

- **String:** "Create a verification program where attribute status equals 'active'." → condition: `{ "attribute": "status", "operator": "=", "value": "active" }`.
- **Integer:** "Create a verification program where age is >= 18." → `{ "attribute": "age", "operator": ">=", "value": 18 }`.
- **Number:** "Create a verification program where score is > 99.5." → `{ "attribute": "score", "operator": ">", "value": 99.5 }`.
- **Boolean:** "Create a verification program where isVerified is equal to true." → `{ "attribute": "isVerified", "operator": "=", "value": true }`. Sent as JSON boolean to match the dashboard.

### Multiple conditions

- "Create a verification program with two conditions: level >= 2 and status equals 'active'." → two conditions in the same program (all must hold).

### Example payloads (credential_create_verification_programs)

**String condition:**

```json
{
  "schemaId": "<from session>",
  "deploy": true,
  "programs": [
    {
      "programName": "status_active",
      "conditions": [
        { "attribute": "status", "operator": "=", "value": "active" }
      ]
    }
  ]
}
```

**Integer condition:**

```json
{
  "programs": [
    {
      "programName": "age_over_18",
      "conditions": [
        { "attribute": "age", "operator": ">=", "value": 18 }
      ]
    }
  ]
}
```

**Number condition:**

```json
{
  "programs": [
    {
      "programName": "score_above_99",
      "conditions": [
        { "attribute": "score", "operator": ">", "value": 99.5 }
      ]
    }
  ]
}
```

**Boolean condition:**

```json
{
  "programs": [
    {
      "programName": "verified_only",
      "conditions": [
        { "attribute": "isVerified", "operator": "=", "value": true }
      ]
    }
  ]
}
```

**Multiple conditions:**

```json
{
  "programs": [
    {
      "programName": "tier_and_active",
      "conditions": [
        { "attribute": "level", "operator": ">=", "value": 2 },
        { "attribute": "status", "operator": "=", "value": "active" }
      ]
    }
  ]
}
```

---

## 5. Constraints (credential-api / dashboard)

- **Dates:** Use ISO 8601; empty string means no bound. accessibleEndAt must be after accessibleStartAt when both set.
- **Schema type:** Alphanumeric only; cannot be numbers only.
- **Version:** Standard format (e.g. 1.0, 1.0.1).
- **Attribute name:** Alphanumeric, dash, underscore (matches dashboard validation).

Use these queries in Cursor (or any MCP client) to regression-test tool choice and parameters.
