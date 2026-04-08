#!/usr/bin/env node

/**
 * Generic Schema Creator - Create schemas from JSON schema files
 * 
 * Usage:
 * node create-schema-from-json.js <schema-file.json> <dashboard-token> <issuer-id>
 */

import axios from 'axios';
import CryptoJS from 'crypto-js';
import fs from 'fs';

const JAVA_API_AES_KEY = 'WpVog9P8NveQLEJYE2cnjg==';
const API_URL = 'https://credential.api.staging.air3.com';

// Get CLI arguments
const [,, schemaFile, dashboardToken, issuerId] = process.argv;

if (!schemaFile || !dashboardToken || !issuerId) {
  console.error('❌ Usage: node create-schema-from-json.js <schema-file.json> <dashboard-token> <issuer-id>');
  console.error('\nExample:');
  console.error('  node create-schema-from-json.js nansen-trading.json "eyJra..." "c21sm..."');
  process.exit(1);
}

console.log('📋 Schema File:', schemaFile);
console.log('📋 Dashboard Token:', dashboardToken.substring(0, 20) + '...');
console.log('🔑 Issuer ID:', issuerId);
console.log('');

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

/**
 * Extract schema information from JSON schema file
 */
function extractSchemaInfo(schemaJson) {
  const title = schemaJson.title;
  const description = schemaJson.description;
  const credentialSubject = schemaJson.properties?.credentialSubject;
  
  // Extract schemeType and version from $metadata if available
  let schemeType = schemaJson.$metadata?.type || schemaJson.title;
  let version = schemaJson.$metadata?.version || '1.0';
  
  // Clean schemeType to be alphanumeric only
  schemeType = schemeType.replace(/[^a-zA-Z0-9]/g, '');

  if (!title || !credentialSubject) {
    throw new Error('Schema JSON must contain title and properties.credentialSubject');
  }

  return {
    title,
    description: description || title,
    schemeType,
    version,
    credentialSubject
  };
}

async function createSchema() {
  try {
    // Read and parse schema file
    console.log(`📖 Reading schema file: ${schemaFile}`);
    const schemaContent = fs.readFileSync(schemaFile, 'utf8');
    const schemaJson = JSON.parse(schemaContent);

    console.log('✅ Schema file loaded successfully\n');

    // Extract schema information
    const schemaInfo = extractSchemaInfo(schemaJson);
    console.log('📋 Schema Information:');
    console.log('   Title:', schemaInfo.title);
    console.log('   Type:', schemaInfo.schemeType);
    console.log('   Version:', schemaInfo.version);
    console.log('   Description:', schemaInfo.description);
    
    // Count fields
    const fieldCount = Object.keys(schemaInfo.credentialSubject.properties || {}).length - 1; // -1 for 'id'
    console.log('   Fields:', fieldCount, 'attributes\n');

    const requestBody = {
      credentialSubject: schemaInfo.credentialSubject,
      title: schemaInfo.title,
      description: schemaInfo.description,
      schemeType: schemaInfo.schemeType,
      version: schemaInfo.version,
    };

    const signatureHeaders = signHeaders(requestBody);

    console.log('📡 Calling API:', `${API_URL}/management/scheme/publishOnOss\n`);

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
      console.log('✅ Schema created and published successfully!\n');
      console.log('📊 Response Data:');
      console.log(JSON.stringify(response.data.data, null, 2));
      console.log('\n🔗 Storage URL:', `https://dstorage.zkme.me/api/v1/p/${response.data.data.schemeDstorageId}`);
      console.log('\n📝 Summary:');
      console.log('   Schema ID:', response.data.data.schemeId);
      console.log('   Issuer ID:', response.data.data.issuerId);
      console.log('   Storage ID:', response.data.data.schemeDstorageId);
      console.log('   Version:', response.data.data.schemeVersion);
      console.log('   Status:', response.data.data.schemeStatus);
      
      // Save result to file
      const outputFile = schemaFile.replace('.json', '-result.json');
      fs.writeFileSync(outputFile, JSON.stringify(response.data, null, 2));
      console.log('\n💾 Result saved to:', outputFile);
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
    if (error.code === 'ENOENT') {
      console.error(`\nSchema file not found: ${schemaFile}`);
    }
    process.exit(1);
  }
}

createSchema();
