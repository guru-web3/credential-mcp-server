#!/usr/bin/env node

/**
 * Test script for complete issuer setup workflow with schema publishing
 * 
 * Workflow:
 * 1. Authenticate
 * 2. Create Schema  
 * 3. Publish Schema to OSS (NEW!)
 * 4. Verify Schema Published (NEW!)
 * 5. Create Credential Template
 * 6. Setup Pricing
 * 7. Create Programs (now works!)
 */

import { authenticate } from './dist/tools/authenticate.js';
import { createSchema } from './dist/tools/create-schema.js';
import { publishSchema } from './dist/tools/publish-schema.js';
import { verifySchemaPublished } from './dist/tools/verify-schema-published.js';
import { createCredentialTemplate } from './dist/tools/create-credential-template.js';
import { setupPricing } from './dist/tools/setup-pricing.js';
import { createVerificationPrograms } from './dist/tools/create-programs.js';
import { session } from './dist/session.js';

async function testCompleteIssuerSetup() {
  try {
    console.log('=== Testing Complete Issuer Setup Workflow with Schema Publishing ===\n');

    // Step 1: Authenticate
    console.log('--- Step 1: Authenticating ---');
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable not set');
    }
    
    const authResult = await authenticate({
      privateKey,
      environment: 'staging',
    });
    console.log('Auth result:', JSON.stringify(authResult, null, 2));

    // Step 2: Create Schema
    console.log('\n--- Step 2: Creating Schema ---');
    const schemaResult = await createSchema({
      schemaName: 'Test Trading Volume ' + Date.now(),
      schemaType: 'TestTradingVolume' + Date.now(),
      dataPoints: [
        { name: 'totalVolume', type: 'integer', description: 'Total trading volume in USD' },
        { name: 'platform', type: 'string', description: 'Trading platform name' },
      ],
      description: 'Test credential for trading volume verification',
      version: '1.0',
    });
    console.log('Schema result:', JSON.stringify(schemaResult, null, 2));

    // Step 3: PUBLISH SCHEMA TO OSS (NEW STEP!)
    console.log('\n--- Step 3: Publishing Schema to OSS ---');
    const publishResult = await publishSchema({
      schemaId: session.get('schemaId'),
    });
    console.log('Publish result:', JSON.stringify(publishResult, null, 2));

    // Step 4: VERIFY SCHEMA PUBLISHED (NEW STEP!)
    console.log('\n--- Step 4: Verifying Schema Published ---');
    const verifyResult = await verifySchemaPublished({
      schemaId: session.get('schemaId'),
    });
    console.log('Verify result:', JSON.stringify(verifyResult, null, 2));

    if (!verifyResult.accessible) {
      console.log('\n⏳ Schema not accessible yet, waiting 5 seconds for OSS propagation...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify again
      const verifyResult2 = await verifySchemaPublished({
        schemaId: session.get('schemaId'),
      });
      console.log('Verify result (2nd attempt):', JSON.stringify(verifyResult2, null, 2));
    }

    // Step 5: Create Credential Template
    console.log('\n--- Step 5: Creating Credential Template ---');
    const templateResult = await createCredentialTemplate({
      credentialName: 'Test Trading Volume Credential',
      schemeType: session.get('schemaType'),
      schemeTitle: session.get('schemaName'),
      expirationDuration: 365,
      issueMax: null,
      accessibleStartAt: '',
      accessibleEndAt: '',
      revokeFlag: 0,
      complianceAccessKeyEnabled: 0,
    });
    console.log('Template result:', JSON.stringify(templateResult, null, 2));

    // Step 6: Setup Pricing
    console.log('\n--- Step 6: Setting Up Pricing ---');
    const pricingResult = await setupPricing({
      schemaId: session.get('schemaId'),
      pricingModel: 'per-issuance',
      priceUsd: 0.50,
      cakEnabled: false,
    });
    console.log('Pricing result:', JSON.stringify(pricingResult, null, 2));

    // Step 7: Create Programs (NOW SHOULD WORK!)
    console.log('\n--- Step 7: Creating Verification Programs ---');
    const programsResult = await createVerificationPrograms({
      schemaId: session.get('schemaId'),
      programs: [
        {
          programName: 'high_volume_trader',
          conditions: [
            {
              attribute: 'totalVolume',
              operator: '>=',
              value: 10000,
            },
          ],
        },
      ],
    });
    console.log('Programs result:', JSON.stringify(programsResult, null, 2));

    console.log('\n✅ === Workflow Complete! All steps passed === ✅');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testCompleteIssuerSetup();
