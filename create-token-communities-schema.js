#!/usr/bin/env node

/**
 * Create Token Communities Batch 1 Schema
 * 
 * Usage:
 * node create-token-communities-schema.js <dashboard-token> <issuer-id>
 */

import axios from 'axios';
import CryptoJS from 'crypto-js';

const JAVA_API_AES_KEY = 'WpVog9P8NveQLEJYE2cnjg==';
const API_URL = 'https://credential.api.staging.air3.com';

// Get CLI arguments
const [,, dashboardToken, issuerId] = process.argv;

if (!dashboardToken || !issuerId) {
  console.error('❌ Usage: node create-token-communities-schema.js <dashboard-token> <issuer-id>');
  process.exit(1);
}

console.log('📋 Dashboard Token:', dashboardToken.substring(0, 20) + '...');
console.log('🔑 Issuer ID:', issuerId);

/**
 * Calculate signature for API request
 */
function calcSignature(content, timestamp) {
  const hasher = CryptoJS.algo.SHA256.create();
  hasher.update(CryptoJS.enc.Utf8.parse(content));
  const firstStepDigest = hasher.finalize().toString();
  const secondStepStr = firstStepDigest + '_' + timestamp;
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(secondStepStr),
    CryptoJS.enc.Utf8.parse(JAVA_API_AES_KEY),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
  );
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

// Token Communities schema credential subject
const credentialSubject = {
  "type": "object",
  "title": "Credential subject",
  "properties": {
    "animeBalance180d": {
      "description": "ANIME token balance continuously held for over 180 days",
      "type": "integer",
      "title": "ANIME Token Holding(Last 180 days)"
    },
    "plumeBalance30d": {
      "description": "PLUME token balance continuously held for over 30 days",
      "type": "integer",
      "title": "PLUME Token Holding(Last 30 days)"
    },
    "plumeBalance14d": {
      "description": "PLUME token balance continuously held for over 14 days",
      "type": "integer",
      "title": "PLUME Token Holding(Last 14 days)"
    },
    "sandBalance14d": {
      "description": "SAND token balance continuously held for over 14 days",
      "type": "integer",
      "title": "SAND Token Holding(Last 14 days)"
    },
    "memeBalance90d": {
      "description": "MEME token balance continuously held for over 90 days",
      "type": "integer",
      "title": "MEME Token Holding(Last 90 days)"
    },
    "memeBalance7d": {
      "description": "MEME token balance continuously held for over 7 days",
      "type": "integer",
      "title": "MEME Token Holding(Last 7 days)"
    },
    "sandBalance30d": {
      "description": "SAND token balance continuously held for over 30 days",
      "type": "integer",
      "title": "SAND Token Holding(Last 30 days)"
    },
    "checkBalance365d": {
      "description": "CHECK token balance continuously held for over 365 days",
      "type": "integer",
      "title": "CHECK Token Holding(Last 365 days)"
    },
    "checkBalance7d": {
      "description": "CHECK token balance continuously held for over 7 days",
      "type": "integer",
      "title": "CHECK Token Holding(Last 7 days)"
    },
    "sandBalance90d": {
      "description": "SAND token balance continuously held for over 90 days",
      "type": "integer",
      "title": "SAND Token Holding(Last 90 days)"
    },
    "sandBalance": {
      "description": "Current SAND token balance",
      "type": "integer",
      "title": "$SAND Balance"
    },
    "memeBalance": {
      "description": "Current MEME token balance",
      "type": "integer",
      "title": "$MEME Balance"
    },
    "animeBalance365d": {
      "description": "ANIME token balance continuously held for over 365 days",
      "type": "integer",
      "title": "ANIME Token Holding(Last 365 days)"
    },
    "sandBalance180d": {
      "description": "SAND token balance continuously held for over 180 days",
      "type": "integer",
      "title": "SAND Token Holding(Last 180 days)"
    },
    "animeBalance90d": {
      "description": "ANIME token balance continuously held for over 90 days",
      "type": "integer",
      "title": "ANIME Token Holding(Last 90 days)"
    },
    "checkBalance": {
      "description": "Current CHECK token balance",
      "type": "integer",
      "title": "$CHECK Balance"
    },
    "sandBalance365d": {
      "description": "SAND token balance continuously held for over 365 days",
      "type": "integer",
      "title": "SAND Token Holding(Last 365 days)"
    },
    "plumeBalance365d": {
      "description": "PLUME token balance continuously held for over 365 days",
      "type": "integer",
      "title": "PLUME Token Holding(Last 365 days)"
    },
    "animeBalance14d": {
      "description": "ANIME token balance continuously held for over 14 days",
      "type": "integer",
      "title": "ANIME Token Holding(Last 14 days)"
    },
    "animeBalance30d": {
      "description": "ANIME token balance continuously held for over 30 days",
      "type": "integer",
      "title": "ANIME Token Holding(Last 30 days)"
    },
    "animeBalance": {
      "description": "Current ANIME token balance",
      "type": "integer",
      "title": "$ANIME balance"
    },
    "checkBalance90d": {
      "description": "CHECK token balance continuously held for over 90 days",
      "type": "integer",
      "title": "CHECK Token Holding(Last 90 days)"
    },
    "plumeBalance7d": {
      "description": "PLUME token balance continuously held for over 7 days",
      "type": "integer",
      "title": "PLUME Token Holding(Last 7 days)"
    },
    "memeBalance180d": {
      "description": "MEME token balance continuously held for over 180 days",
      "type": "integer",
      "title": "MEME Token Holding(Last 180 days)"
    },
    "checkBalance30d": {
      "description": "CHECK token balance continuously held for over 30 days",
      "type": "integer",
      "title": "CHECK Token Holding(Last 30 days)"
    },
    "animeBalance7d": {
      "description": "ANIME token balance continuously held for over 7 days",
      "type": "integer",
      "title": "ANIME Token Holding(Last 7 days)"
    },
    "memeBalance365d": {
      "description": "MEME token balance continuously held for over 365 days",
      "type": "integer",
      "title": "MEME Token Holding(Last 365 days)"
    },
    "checkBalance14d": {
      "description": "CHECK token balance continuously held for over 14 days",
      "type": "integer",
      "title": "CHECK Token Holding(Last 14 days)"
    },
    "plumeBalance": {
      "description": "Current PLUME token balance",
      "type": "integer",
      "title": "$PLUME Balance"
    },
    "memeBalance30d": {
      "description": "MEME token balance continuously held for over 30 days",
      "type": "integer",
      "title": "MEME Token Holding(Last 30 days)"
    },
    "memeBalance14d": {
      "description": "MEME token balance continuously held for over 14 days",
      "type": "integer",
      "title": "MEME Token Holding(Last 14 days)"
    },
    "checkBalance180d": {
      "description": "CHECK token balance continuously held for over 180 days",
      "type": "integer",
      "title": "CHECK Token Holding(Last 180 days)"
    },
    "plumeBalance180d": {
      "description": "PLUME token balance continuously held for over 180 days",
      "type": "integer",
      "title": "PLUME Token Holding(Last 180 days)"
    },
    "plumeBalance90d": {
      "description": "PLUME token balance continuously held for over 90 days",
      "type": "integer",
      "title": "PLUME Token Holding(Last 90 days)"
    },
    "sandBalance7d": {
      "description": "SAND token balance continuously held for over 7 days",
      "type": "integer",
      "title": "SAND Token Holding(Last 7 days)"
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
    console.log('\n🚀 Creating Token Communities Batch 1 Schema...\n');

    const requestBody = {
      credentialSubject: credentialSubject,
      title: 'nansen-token-communities-batch-1',
      description: 'Token Communities Batch 1',
      schemeType: 'tokenCommunityBatch1',
      version: '1.0',
    };

    const signatureHeaders = signHeaders(requestBody);

    console.log('📡 Calling API:', `${API_URL}/management/scheme/publishOnOss`);

    const response = await axios.post(
      `${API_URL}/management/scheme/publishOnOss`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-auth': dashboardToken,
          'x-issuer-id': issuerId,
          ...signatureHeaders,
        },
      }
    );

    if (response.data.code === 80000000) {
      console.log('\n✅ Schema created and published successfully!\n');
      console.log('📊 Response Data:');
      console.log(JSON.stringify(response.data.data, null, 2));
      console.log('\n🔗 Storage URL:', `https://dstorage.zkme.me/api/v1/p/${response.data.data.k}`);
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
