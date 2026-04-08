#!/bin/bash

# Helper script to test the credential MCP server
# This generates a test private key and runs the sample issuer creation

set -e

echo "🔐 Generating Random Ethereum Private Key..."
PRIVATE_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo ""
echo "Generated Private Key:"
echo "$PRIVATE_KEY"
echo ""

echo "📋 Setting environment variable..."
export TEST_PRIVATE_KEY="$PRIVATE_KEY"

echo ""
echo "🚀 Running Sample Issuer Creation..."
echo "======================================"
echo ""

node dist/test-create-issuer.js

echo ""
echo "✅ Test completed!"
