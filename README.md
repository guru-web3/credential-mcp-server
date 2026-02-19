# Animoca Credential MCP Server

AI-powered automation for credential schema creation, pricing setup, verification programs, and deployment.

## Installation

### Quick Start (npx)
```bash
npx @animoca/credential-mcp-server
```

### Install Globally
```bash
npm install -g @animoca/credential-mcp-server
```

### Install Locally
```bash
npm install @animoca/credential-mcp-server
```

## Usage with Cursor

Add to your Cursor MCP settings (`~/Library/Application Support/Cursor/mcp.json` on macOS):

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

Or use locally installed version:

```json
{
  "mcpServers": {
    "animoca-credentials": {
      "command": "node",
      "args": [
        "/path/to/credential-mcp-server/dist/index.js"
      ]
    }
  }
}
```

## Usage with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "animoca-credentials": {
      "command": "npx",
      "args": ["-y", "@animoca/credential-mcp-server"]
    }
  }
}
```

## Available Tools

### 1. `credential_authenticate`
Authenticate with your private key to access credential management APIs.

**Parameters:**
- `privateKey` (required): ES256 private key in PEM format
- `partnerId` (optional): Partner ID
- `environment` (optional): 'development' | 'staging' | 'production' (default: 'staging')

**Example:**
```
AI: "I'll help you set up credentials. First, I need your ES256 private key to authenticate."
User: [provides private key]
AI uses: credential_authenticate
```

### 2. `credential_create_schema`
Create and publish a new credential schema with specified data points.

**Parameters:**
- `schemaName` (required): Schema name (e.g., 'trading-volume-credential')
- `schemaType` (required): Schema type identifier (e.g., 'tradingVolumeCredential')
- `dataPoints` (required): Array of {name, type, description}
- `description` (optional): Schema description
- `version` (optional): Schema version (default: '1.0')

**Example:**
```
User: "Create a schema for tracking trading volume"
AI uses: credential_create_schema with:
  - schemaName: "trading-volume-credential"
  - schemaType: "tradingVolumeCredential"
  - dataPoints: [{name: "totalVolume", type: "number"}, ...]
```

### 3. `credential_setup_pricing`
Configure pricing model for a credential schema.

**Parameters:**
- `schemaId` (optional): Schema ID (uses last created if not provided)
- `pricingModel` (required): 'per-issuance' | 'subscription'
- `priceUsd` (required): Price in USD (e.g., 0.50 for $0.50)
- `cakEnabled` (optional): Enable CAK requirement (default: false)
- `subscriptionDays` (optional): Required for subscription model

**Example:**
```
User: "Set pricing to $0.50 per credential"
AI uses: credential_setup_pricing with:
  - pricingModel: "per-issuance"
  - priceUsd: 0.50
```

### 4. `credential_create_verification_programs`
Create verification programs that define conditions for credential verification.

**Parameters:**
- `schemaId` (optional): Schema ID (uses last created if not provided)
- `programs` (required): Array of {programName, conditions[]}

**Example:**
```
User: "Create tier programs: Bronze (>= 1000), Silver (>= 10000), Gold (>= 100000)"
AI uses: credential_create_verification_programs with:
  - programs: [
      {programName: "bronze_tier", conditions: [{attribute: "volume", operator: ">=", value: 1000}]},
      {programName: "silver_tier", conditions: [{attribute: "volume", operator: ">=", value: 10000}]},
      {programName: "gold_tier", conditions: [{attribute: "volume", operator: ">=", value: 100000}]}
    ]
```

## Workflow Example

Here's a typical conversation flow with AI using this MCP server:

```
User: "I need to create a credential system for NFT holders"

AI: "I'll help you set up a complete credential system for NFT holders. First, I need your ES256 private key to authenticate."

User: [provides private key]

AI: [calls credential_authenticate]
"✓ Authentication successful! Now let's design your schema. What attributes should the NFT holder credential have?"

User: "Track the collection address, number of NFTs held, and holder tier"

AI: [calls credential_create_schema]
"✓ Schema created! ID: c28sr061lhd9i0004615Yi

Now for pricing - would you like per-issuance or subscription pricing?"

User: "Per-issuance, $1.00 per credential"

AI: [calls credential_setup_pricing]
"✓ Pricing configured: $1.00 per issuance

Let's create verification programs. I suggest:
- Standard Holder: >= 1 NFT
- Premium Holder: >= 10 NFTs  
- Whale: >= 100 NFTs

Should I create these?"

User: "Yes"

AI: [calls credential_create_verification_programs]
"✓ Created 3 verification programs!
- nft_holder_standard: [programId1]
- nft_holder_premium: [programId2]  
- nft_holder_whale: [programId3]

Your credential system is ready! Next steps:
1. Generate issuer template configuration
2. Set up verifiers
3. Deploy to production

Would you like help with any of these?"
```

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Test with MCP Inspector
```bash
npm run inspector
```

## Environment Variables

None required - all configuration is done through tool parameters during authentication.

## License

MIT
