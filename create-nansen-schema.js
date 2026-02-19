#!/usr/bin/env node

/**
 * Create Nansen Moca Proof Schema
 * 
 * Usage:
 * node create-nansen-schema.js <dashboard-token>
 */

import axios from 'axios';
import CryptoJS from 'crypto-js';

const JAVA_API_AES_KEY = 'WpVog9P8NveQLEJYE2cnjg==';
const API_URL = 'https://credential.api.staging.air3.com';

// Get CLI arguments
const [,, dashboardToken] = process.argv;

if (!dashboardToken) {
  console.error('❌ Usage: node create-nansen-schema.js <dashboard-token>');
  process.exit(1);
}

console.log('📋 Dashboard Token:', dashboardToken.substring(0, 20) + '...');

/**
 * Calculate signature for API request
 */
function calcSignature(content, timestamp) {
  // Step 1: SHA256 hash of content
  const hasher = CryptoJS.algo.SHA256.create();
  hasher.update(CryptoJS.enc.Utf8.parse(content));
  const firstStepDigest = hasher.finalize().toString();

  // Step 2: Append timestamp
  const secondStepStr = firstStepDigest + '_' + timestamp;

  // Step 3: AES-ECB encryption
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(secondStepStr),
    CryptoJS.enc.Utf8.parse(JAVA_API_AES_KEY),
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }
  );

  // Step 4: SHA256 hash of encrypted data
  const hasher2 = CryptoJS.algo.SHA256.create();
  hasher2.update(encrypted.ciphertext);
  
  return hasher2.finalize().toString();
}

/**
 * Generate signature headers
 */
function signHeaders(body) {
  const timestamp = Date.now().toString();
  const material = typeof body === 'string' ? body : JSON.stringify(body);
  const signature = calcSignature(material, timestamp);

  return {
    'x-signature': signature,
    'x-timestamp': timestamp,
    'x-appversion': 'zkserapi_1.0.0'
  };
}

// Nansen schema credential subject structure (simplified to key fields)
const credentialSubject = {
  "type": "object",
  "title": "Credential subject",
  "properties": {
    "balanceMOCA30d": {
      "description": "Current $MOCA token balance across Ethereum and Base that has been continuously held for over 30 days.",
      "type": "number",
      "title": "Moca Token Holding"
    },
    "tier": {
      "description": "Nansen's Points Tier is a performance-based metric that ranks wallets according to their accumulated Nansen Points, reflecting the level of on-chain activity, analytics engagement, and ecosystem participation across supported networks.",
      "type": "string",
      "title": "Nansen Points Tier"
    },
    "portfolioEvm": {
      "description": "Total wallet holding on EVM chains in USD",
      "type": "number",
      "title": "Total Wallet Holding (EVM Chains)"
    },
    "id": {
      "format": "uri",
      "title": "Credential subject ID",
      "description": "Define the DID of the subject that owns the credential",
      "type": "string"
    }
  },
  "required": ["id"]
};

async function createSchema() {
  try {
    console.log('\n🚀 Creating Nansen Moca Proof Schema...\n');

    const requestBody = {
      credentialSubject: credentialSubject,
      title: 'nanson-moca-proof-v3',
      description: 'Nansen Moca Proof MVP schema',
      schemeType: 'nansenmvp',
      version: '1.0.4',
    };

    const signatureHeaders = signHeaders(requestBody);

    console.log('📡 Calling API:', `${API_URL}/management/scheme/publishOnOss`);
    console.log('📦 Request body preview:', JSON.stringify(requestBody, null, 2).substring(0, 500));

    const response = await axios.post(
      `${API_URL}/management/scheme/publishOnOss`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-auth': dashboardToken,
          ...signatureHeaders,
        },
      }
    );

    if (response.data.code === 80000000) {
      console.log('\n✅ Schema created and published successfully!\n');
      console.log('📊 Response Data:');
      console.log(JSON.stringify(response.data.data, null, 2));
      console.log('\n🔗 Storage URL:', `https://dstorage.zkme.me/api/v1/p/${response.data.data.schemeDstorageId}`);
      console.log('\n📝 Summary:');
      console.log('   Schema ID:', response.data.data.schemeId);
      console.log('   Schema Type:', response.data.data.schemeType);
      console.log('   Storage ID:', response.data.data.schemeDstorageId);
      console.log('   Version:', response.data.data.schemeVersion);
      console.log('   Status:', response.data.data.schemeStatus);
    } else {
      console.error('\n❌ Error creating schema:');
      console.error(JSON.stringify(response.data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createSchema();

// node create-nansen-schema.js eyJraWQiOiI0MWUxNDc2Ny1hZGExLTQxMjQtYjJmNy1iN2MwOTM1ZDIyNWIiLCJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbkFkZHJlc3MiOiIweDYyYTUxNmRhMDZlYWZjMjdhNDgwY2IyMWY3NTQ0Yzk1Y2JkMTY5YTAiLCJwYXJ0bmVySWQiOiJhZWU5ZjZmNi1kY2FlLTQ4MjktYWVmNC1kYTJlMWRhYTY2NjIiLCJpYXQiOjE3NzAxODE2OTcsImV4cCI6MTc3MDE4ODg5N30.UxpHmw7oydICDB0Rn03_ViwYNMiADzQSce0kJks5YGDHJY9lE0bdWmOoGwojw3bQdFrcxTAz5DvwU9guaRl4ow