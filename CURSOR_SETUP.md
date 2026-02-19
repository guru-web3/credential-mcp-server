# Cursor Integration Guide

## Quick Setup for Cursor IDE

### Step 1: Install the MCP Server

```bash
cd /Users/gururamu/Documents/animoca/credential-mcp-server
npm install
npm run build
```

### Step 2: Configure Cursor

1. Open Cursor settings: `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
2. Search for "MCP" or navigate to Features > Model Context Protocol
3. Click "Edit in settings.json"

Alternatively, directly edit: `~/Library/Application Support/Cursor/mcp.json`

### Step 3: Add Server Configuration

```json
{
  "mcpServers": {
    "animoca-credentials": {
      "command": "node",
      "args": [
        "/Users/gururamu/Documents/animoca/credential-mcp-server/dist/index.js"
      ]
    }
  }
}
```

### Step 4: Restart Cursor

Close and reopen Cursor IDE for changes to take effect.

### Step 5: Verify Installation

1. Open Cursor AI chat
2. Type: "List available credential tools"
3. Cursor should recognize:
   - `credential_authenticate`
   - `credential_create_schema`
   - `credential_setup_pricing`
   - `credential_create_verification_programs`

## Example Usage in Cursor

### Example 1: Complete Issuer Setup

```
You: "I need to create a credential system for tracking user trading activity"

Cursor AI: "I'll help you set up a complete credential system. First, I need your ES256 private key for authentication. You can generate one with:

openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt

Please provide your private key:"

You: [paste private key]

Cursor AI: [Uses credential_authenticate tool]
"✓ Authenticated successfully!
- Partner ID: partner123
- Issuer DID: did:air:id:test:xyz...
- Environment: staging

Now let's design your schema. What data points do you need to track for trading activity?"

You: "Track totalVolumeUsd, last30DaysVolumeUsd, numberOfTrades, and tradingTier"

Cursor AI: [Uses credential_create_schema tool]
"✓ Schema created!
- Schema ID: c28sr061lhd9i0004615Yi
- Name: trading-activity-credential
- Attributes: totalVolumeUsd (number), last30DaysVolumeUsd (number), numberOfTrades (integer), tradingTier (string)

What pricing model would you like? Options:
1. Per-issuance: Charge each time a credential is issued
2. Subscription: Monthly/yearly subscription model"

You: "Per-issuance at $0.25 per credential"

Cursor AI: [Uses credential_setup_pricing tool]
"✓ Pricing configured: $0.25 per issuance

Now let's create verification programs. I suggest tier-based programs:
- Bronze: last30DaysVolumeUsd >= 1000
- Silver: last30DaysVolumeUsd >= 10000
- Gold: last30DaysVolumeUsd >= 100000

Should I create these three programs?"

You: "Yes, create all three"

Cursor AI: [Uses credential_create_verification_programs tool]
"✓ Created 3 verification programs:
1. trading_tier_bronze - Program ID: prog_abc123
2. trading_tier_silver - Program ID: prog_def456
3. trading_tier_gold - Program ID: prog_ghi789

Your credential system is now fully configured! 

Summary:
- Schema ID: c28sr061lhd9i0004615Yi
- Pricing: $0.25 per issuance
- Programs: 3 tier-based verification programs

Next steps available:
1. Generate issuer template configuration
2. Create verifiers for integration
3. Deploy to production

Would you like help with any of these?"
```

### Example 2: Quick Schema Creation

```
You: "Create an NFT holder credential schema"

Cursor AI: [Checks if authenticated, if not prompts for private key]
[Uses credential_create_schema tool]
"Created schema 'nft-holder-credential' with:
- collectionAddress (string)
- numberOfNfts (integer)
- holderSince (string)
- holderTier (string)

Schema ID: c28sr061lhd9i0004615Yi

Would you like to set up pricing and verification programs?"
```

### Example 3: Create Multiple Programs

```
You: "For my trading schema, create programs for:
- Active trader: numberOfTrades > 50
- High volume: totalVolumeUsd > 50000
- VIP: totalVolumeUsd > 500000 AND numberOfTrades > 100"

Cursor AI: [Uses credential_create_verification_programs tool with complex conditions]
"Created 3 programs:
1. active_trader - Verifies numberOfTrades > 50
2. high_volume - Verifies totalVolumeUsd > 50000
3. vip_trader - Verifies totalVolumeUsd > 500000 AND numberOfTrades > 100

All programs are linked to schema c28sr061lhd9i0004615Yi"
```

## Environment Switching

To work with different environments (dev/staging/production):

```
You: "Authenticate for production environment"

Cursor AI: [Uses credential_authenticate with environment: "production"]
```

## Troubleshooting

### Issue: Cursor doesn't recognize the tools

**Solution:**
1. Check `mcp.json` syntax is valid JSON
2. Verify file path is absolute and correct
3. Check console for errors: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I`
4. Restart Cursor completely

### Issue: Authentication fails

**Solution:**
1. Verify private key format (must include BEGIN/END markers)
2. Check network connection to API endpoint
3. Verify partner account is active
4. Try different environment (staging vs production)

### Issue: Tools execute but API calls fail

**Solution:**
1. Check if authentication token expired (re-authenticate)
2. Verify API endpoint is accessible
3. Check for rate limiting
4. Review error messages from API response

## Advanced: Using with Multiple Workspaces

If working with multiple credential projects, you can configure different MCP servers:

```json
{
  "mcpServers": {
    "animoca-credentials-dev": {
      "command": "node",
      "args": [
        "/Users/gururamu/Documents/animoca/credential-mcp-server/dist/index.js"
      ]
    },
    "animoca-credentials-prod": {
      "command": "node",
      "args": [
        "/Users/gururamu/Documents/animoca/credential-mcp-server-prod/dist/index.js"
      ]
    }
  }
}
```

## Tips for Best Results

1. **Be specific**: Clearly describe your credential use case
2. **Provide context**: Mention if you've already created a schema in the session
3. **Use natural language**: The AI understands conversational requests
4. **Review generated content**: Always verify schema attributes and program conditions
5. **Save IDs**: Note down schema IDs and program IDs for later reference

## Next Steps

Once your credential system is set up via MCP:
1. Generate issuer template configuration
2. Implement user data fetching API
3. Deploy issuer template to Netlify
4. Create verifiers for your apps
5. Test end-to-end credential issuance flow
