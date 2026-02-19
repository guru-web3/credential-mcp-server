#!/usr/bin/env node

import axios from 'axios';
import CryptoJS from 'crypto-js';

const JAVA_API_AES_KEY = 'WpVog9P8NveQLEJYE2cnjg==';
const API_URL = 'https://credential.api.staging.air3.com';

const [,, dashboardToken] = process.argv;

if (!dashboardToken) {
  console.error('❌ Usage: node test-simple-schema.js <dashboard-token>');
  process.exit(1);
}

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

async function testSchema() {
  const requestBody = {
    credentialSubject: {
      type: 'object',
      title: 'Credential subject',
      properties: {
        testField: {
          type: 'string',
          description: 'A test field',
          title: 'Test Field'
        },
        id: {
          format: 'uri',
          title: 'Credential subject ID',
          description: 'Define the DID of the subject that owns the credential',
          type: 'string'
        }
      },
      required: ['id']
    },
    title: 'test-simple-schema',
    description: 'Simple test schema',
    schemeType: 'testsimple',
    version: '1.0',
  };

  console.log('📦 Request:', JSON.stringify(requestBody, null, 2));

  const signatureHeaders = signHeaders(requestBody);

  try {
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

    console.log('\n✅ Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSchema();
