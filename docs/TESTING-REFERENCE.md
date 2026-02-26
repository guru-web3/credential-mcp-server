# Credential MCP — Full flow testing reference

Use this doc to run the full credential flow via the **animoca-credentials** MCP and to recreate all verification programs with minimal effort. Copy-paste the JSON arguments into your MCP client.

**See also:** [TESTING-QUERIES.md](./TESTING-QUERIES.md) for natural-language prompts and per-field examples; [TOOLS.md](./TOOLS.md) for tool reference.

---

## Test flow order

Run in this order (connect to the MCP server first):

| Step | Tool | Purpose |
|------|------|---------|
| 1 | `credential_create_schema` | Create schema (or use existing `schemaId`) |
| 2 | `credential_create_program` | Create issuance program for the schema |
| 3 | `credential_setup_pricing` | Set pricing for the schema |
| 4 | `credential_create_verification_programs` | Create and deploy all VPs (two batches) |

Use the **schemaId** from step 1 (or the reference one below) in steps 2–4.

---

## Reference IDs (test schema)

- **Schema:** multi-datapoint-schema  
- **Schema ID:** `c28w2061lwsf90042549UG` (replace with your schemaId if you create a new schema)  
- **Attributes:** `label` (string), `count` (integer), `score` (number), `verified` (boolean)

Use this schemaId in steps 2–4 if you are not creating a new schema.

---

## Step 1 — Create schema (optional)

If you need a fresh schema:

**Tool:** `credential_create_schema`  
**Arguments:**

```json
{
  "schemaName": "multi-datapoint-schema",
  "schemaType": "multiDatapointSchema",
  "description": "Schema with multiple data types for credential issuance and verification.",
  "dataPoints": [
    { "name": "label", "type": "string", "description": "Human-readable label for the credential" },
    { "name": "count", "type": "integer", "description": "Discrete count or quantity" },
    { "name": "score", "type": "number", "description": "Numeric score or rate (e.g. percentage, ratio)" },
    { "name": "verified", "type": "boolean", "description": "Whether the subject has been verified" }
  ]
}
```

Copy `schemaId` from the response into steps 2–4.

---

## Step 2 — Create issuance program

**Tool:** `credential_create_program`  
**Arguments:**

```json
{
  "schemaId": "c28w2061lwsf90042549UG",
  "issueMax": null,
  "expirationDuration": 180,
  "complianceAccessKeyEnabled": 0
}
```

---

## Step 3 — Setup pricing

**Tool:** `credential_setup_pricing`  
**Arguments:**

```json
{
  "schemaId": "c28w2061lwsf90042549UG",
  "pricingModel": "pay_on_success",
  "priceUsd": 0,
  "complianceAccessKeyEnabled": false
}
```

---

## Step 4 — Create all verification programs (two batches)

Create all 15 VPs in two MCP calls. All must succeed for a full pass.

### Batch A (8 programs)

**Tool:** `credential_create_verification_programs`  
**Arguments:**

```json
{
  "schemaId": "c28w2061lwsf90042549UG",
  "deploy": true,
  "programs": [
    { "programName": "vp_label_equals", "conditions": [ { "attribute": "label", "operator": "=", "value": "verified" } ] },
    { "programName": "vp_label_not_equals", "conditions": [ { "attribute": "label", "operator": "!=", "value": "none" } ] },
    { "programName": "vp_count_at_least_18", "conditions": [ { "attribute": "count", "operator": ">=", "value": 18 } ] },
    { "programName": "vp_count_less_than_100", "conditions": [ { "attribute": "count", "operator": "<", "value": 100 } ] },
    { "programName": "vp_count_less_equal_50", "conditions": [ { "attribute": "count", "operator": "<=", "value": 50 } ] },
    { "programName": "vp_count_equals_0", "conditions": [ { "attribute": "count", "operator": "=", "value": 0 } ] },
    { "programName": "vp_count_not_equals_99", "conditions": [ { "attribute": "count", "operator": "!=", "value": 99 } ] },
    { "programName": "vp_score_above_99_5", "conditions": [ { "attribute": "score", "operator": ">", "value": 99.5 } ] }
  ]
}
```

**Expected:** `Created 8 of 8 programs and deployed.`

### Batch B (7 programs)

**Tool:** `credential_create_verification_programs`  
**Arguments:**

```json
{
  "schemaId": "c28w2061lwsf90042549UG",
  "deploy": true,
  "programs": [
    { "programName": "vp_score_greater_equal_1", "conditions": [ { "attribute": "score", "operator": ">=", "value": 1 } ] },
    { "programName": "vp_score_less_than_1000", "conditions": [ { "attribute": "score", "operator": "<", "value": 1000 } ] },
    { "programName": "vp_score_equals_100", "conditions": [ { "attribute": "score", "operator": "=", "value": 100 } ] },
    { "programName": "vp_score_not_equals_0", "conditions": [ { "attribute": "score", "operator": "!=", "value": 0 } ] },
    { "programName": "vp_score_less_equal_100", "conditions": [ { "attribute": "score", "operator": "<=", "value": 100 } ] },
    { "programName": "vp_verified_true", "conditions": [ { "attribute": "verified", "operator": "=", "value": true } ] },
    { "programName": "vp_multi_label_count_verified", "conditions": [ { "attribute": "label", "operator": "=", "value": "premium" }, { "attribute": "count", "operator": ">=", "value": 10 }, { "attribute": "score", "operator": ">", "value": 50 }, { "attribute": "verified", "operator": "=", "value": true } ] }
  ]
}
```

**Expected:** `Created 7 of 7 programs and deployed.`

---

## All 15 verification programs (reference)

| # | Program name | Condition(s) |
|---|--------------|-------------|
| 1 | vp_label_equals | label = "verified" |
| 2 | vp_label_not_equals | label != "none" |
| 3 | vp_count_at_least_18 | count >= 18 |
| 4 | vp_count_less_than_100 | count < 100 |
| 5 | vp_count_less_equal_50 | count <= 50 |
| 6 | vp_count_equals_0 | count = 0 |
| 7 | vp_count_not_equals_99 | count != 99 |
| 8 | vp_score_above_99_5 | score > 99.5 |
| 9 | vp_score_greater_equal_1 | score >= 1 |
| 10 | vp_score_less_than_1000 | score < 1000 |
| 11 | vp_score_equals_100 | score = 100 |
| 12 | vp_score_not_equals_0 | score != 0 |
| 13 | vp_score_less_equal_100 | score <= 100 |
| 14 | vp_verified_true | verified = true |
| 15 | vp_multi_label_count_verified | label = "premium" AND count >= 10 AND score > 50 AND verified = true |

After a successful run, note the returned `programId` values from the tool response for use in your app.

---

## Quick test checklist

- [ ] **Step 1** — Create schema (or confirm schemaId `c28w2061lwsf90042549UG`)
- [ ] **Step 2** — Create program → success, note `programId` if needed
- [ ] **Step 3** — Setup pricing → success
- [ ] **Step 4a** — Batch A (8 VPs) → `Created 8 of 8 programs and deployed`
- [ ] **Step 4b** — Batch B (7 VPs) → `Created 7 of 7 programs and deployed`

If any step returns an error, fix and re-run from that step (later steps can reuse the same schemaId).

---

## Related

- **Per-tool examples and natural-language prompts:** [TESTING-QUERIES.md](./TESTING-QUERIES.md)
- **Tool reference (parameters, enums):** [TOOLS.md](./TOOLS.md)
- **Zephyr scenario mapping and unit tests:** [test-scenarios.md](./test-scenarios.md)
