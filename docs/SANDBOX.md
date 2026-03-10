# Sandbox branch and tool list

This doc describes the **sandbox** branch and how it aligns with [credential-dashboard sandbox](https://github.com/mocaverse/credential-dashboard/tree/sandbox) and credential-api sandbox.

## Sandbox branch

The **sandbox** branch of credential-mcp-server is intended for product teams using:

- **credential-dashboard** [sandbox branch](https://github.com/mocaverse/credential-dashboard/tree/sandbox)
- **credential-api** sandbox branch

Set **`CREDENTIAL_MCP_ENVIRONMENT=sandbox`** when running the MCP server for sandbox. When set, the server exposes a **reduced tool list**: pricing, stake, unstake, withdraw, and fee wallet/payment tools are excluded from `tools/list` and from `tools/call`.

Excluded tools (sandbox):

- `credential_setup_pricing`, `credential_set_price`
- `credential_stake_moca`, `credential_unstake_moca`, `credential_claim_unstake_moca`
- `credential_payment_deposit`, `credential_payment_withdraw`, `credential_payment_claim_fees`

All other tools (create schema, create program, list schemas/templates/programs, docs, app config, JWKS, verification programs, etc.) remain available.

## GET /api/toollist

The server exposes **`GET /api/toollist`** (no auth required) that returns the current tool list as JSON. Use this so credential-dashboard and credential-api can refer to the same canonical list and input schemas.

**Response shape:**

```json
{
  "tools": [
    {
      "name": "credential_create_schema",
      "description": "...",
      "inputSchema": {
        "type": "object",
        "properties": { ... },
        "required": [ ... ]
      }
    },
    ...
  ]
}
```

- When **`CREDENTIAL_MCP_ENVIRONMENT=sandbox`**, the `tools` array excludes the 8 sandbox-excluded tools above.
- When **staging** or **production**, the array includes all tools.

**Usage:**

- **credential-dashboard sandbox:** Point the AI assistant or tool discovery at `{MCP_SERVER_URL}/api/toollist` to get the list of available tools and their input JSON schemas.
- **credential-api:** Refer to `GET {MCP_SERVER_URL}/api/toollist` for the canonical tool list and input schemas when building server-side or docs.

Example: `curl http://localhost:3749/api/toollist`
