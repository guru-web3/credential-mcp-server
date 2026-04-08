# Testing Guide - Create Sample Issuer

## Quick Test with Test Script

### Prerequisites

1. **Get a Private Key**

You need an Ethereum private key (secp256k1 curve) for authentication. Generate one:

```bash
openssl ecparam -name secp256k1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt
```

This will output something like:
```
-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
-----END PRIVATE KEY-----
```

2. **Set Environment Variable**

```bash
export TEST_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
-----END PRIVATE KEY-----"
```

### Run the Test Script

```bash
cd /Users/gururamu/Documents/animoca/credential-mcp-server

# Build first
npm run build

# Compile test script
npx tsc src/test-create-issuer.ts --outDir dist --module ES2022 --target ES2022 --moduleResolution node16

# Run the test
node dist/test-create-issuer.js
```

### Expected Output

```
🚀 Creating Sample Issuer - NFT Holder Credential System

📝 Step 1: Authentication
Authenticating with staging environment...
✅ Authentication successful!
   Issuer DID: did:air:id:test:...
   Partner ID: partner123

📝 Step 2: Creating NFT Holder Schema
✅ Schema created successfully!
   Schema ID: c28sr061lhd9i0004615Yi
   Storage ID: ...

📝 Step 3: Setting Up Pricing
✅ Pricing configured successfully!
   Model: per-issuance
   Price: $0.25 per credential

📝 Step 4: Creating Verification Programs
✅ Verification programs created successfully!
   1. nft_holder_standard: prog_abc123
   2. nft_holder_premium: prog_def456
   3. nft_holder_whale: prog_ghi789

🎉 Sample Issuer Created Successfully!

═══════════════════════════════════════
SUMMARY
═══════════════════════════════════════
Schema ID:        c28sr061lhd9i0004615Yi
Schema Name:      nft-holder-credential
Pricing:          $0.25 per issuance
Programs Created: 3

Program IDs:
  - nft_holder_standard: prog_abc123
  - nft_holder_premium: prog_def456
  - nft_holder_whale: prog_ghi789

═══════════════════════════════════════

Next Steps:
1. Use these IDs in your issuer template .env.local
2. Implement user data fetching API
3. Test credential issuance flow
4. Deploy to production
```

## Manual Testing with Inspector

If you prefer to test interactively:

### 1. Start Inspector (from correct directory)

```bash
cd /Users/gururamu/Documents/animoca/credential-mcp-server
npx @modelcontextprotocol/inspector node dist/index.js
```

### 2. Connect in Browser

Open http://localhost:6274 and click "Connect"

### 3. Test Tools in Order

#### Tool 1: credential_authenticate
```json
{
  "privateKey": "-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----",
  "environment": "staging"
}
```

#### Tool 2: credential_create_schema
```json
{
  "schemaName": "nft-holder-credential",
  "schemaType": "nftHolderCredential",
  "dataPoints": [
    {"name": "collectionAddress", "type": "string"},
    {"name": "numberOfNfts", "type": "integer"},
    {"name": "holderTier", "type": "string"}
  ],
  "description": "NFT holder credentials"
}
```

#### Tool 3: credential_setup_pricing
```json
{
  "pricingModel": "per-issuance",
  "priceUsd": 0.25
}
```

#### Tool 4: credential_create_verification_programs
```json
{
  "programs": [
    {
      "programName": "nft_holder_standard",
      "conditions": [
        {"attribute": "numberOfNfts", "operator": ">=", "value": 1}
      ]
    },
    {
      "programName": "nft_holder_premium",
      "conditions": [
        {"attribute": "numberOfNfts", "operator": ">=", "value": 10}
      ]
    }
  ]
}
```

## Troubleshooting

### Issue: "Command not found" in Inspector

The inspector is running from wrong directory. Make sure:
1. You're in `/Users/gururamu/Documents/animoca/credential-mcp-server`
2. Run `npm run build` first
3. Start inspector with `npx @modelcontextprotocol/inspector node dist/index.js`

### Issue: Authentication fails

Check:
- Private key format (must include BEGIN/END markers)
- Network connectivity to staging API
- Partner account is active

### Issue: Schema creation fails

Check:
- You're authenticated first (run credential_authenticate)
- Schema type is unique (not already exists)
- All required fields provided

## What Gets Created

After running the test successfully, you'll have:

1. ✅ **Authenticated Session** - Valid dashboard token
2. ✅ **Schema** - NFT holder credential schema with 4 attributes
3. ✅ **Pricing** - $0.25 per credential issuance
4. ✅ **3 Programs** - Standard (1+ NFTs), Premium (10+ NFTs), Whale (100+ NFTs)

Use the returned IDs to configure your issuer template!
