#!/usr/bin/env node

/**
 * Test script to create a sample issuer using the MCP server tools
 * This demonstrates the complete workflow
 */

import { authenticate } from './tools/authenticate.js';
import { createSchema } from './tools/create-schema.js';
import { createCredentialTemplate } from './tools/create-credential-template.js';
import { setupPricing } from './tools/setup-pricing.js';
import { queryPaymentSchema } from './tools/query-payment-schema.js';
import { createVerificationPrograms } from './tools/create-programs.js';

async function createSampleIssuer() {
  console.log('🚀 Creating Sample Issuer - NFT Holder Credential System\n');

  try {
    // Step 1: Authenticate
    console.log('📝 Step 1: Authentication');
    console.log('For testing, you need an Ethereum wallet private key (64 hex chars).');
    console.log('Set TEST_PRIVATE_KEY environment variable or generate one with:');
    console.log('node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
    
    const privateKey = process.env.TEST_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ Error: TEST_PRIVATE_KEY environment variable not set');
      console.log('\nSet it with: export TEST_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"');
      process.exit(1);
    }

    // Authenticate
    console.log('Authenticating with staging environment...');
    const authResult = await authenticate({
      privateKey,
      environment: 'staging',
    });
    console.log('✅ Authentication successful!');
    console.log(`   Issuer DID: ${authResult.issuerDid}`);
    console.log(`   Partner ID: ${authResult.partnerId}\n`);

    // Step 2: Create Schema
    console.log('📝 Step 2: Creating NFT Holder Schema');
    const schemaResult = await createSchema({
      schemaName: 'nft-holder-credential',
      schemaType: 'nftHolderCredential',
      dataPoints: [
        { name: 'collectionAddress', type: 'string', description: 'NFT collection contract address' },
        { name: 'numberOfNfts', type: 'integer', description: 'Number of NFTs held' },
        { name: 'holderSince', type: 'string', description: 'Date when user became a holder' },
        { name: 'holderTier', type: 'string', description: 'Holder tier: standard, premium, whale' },
      ],
      description: 'Credential for NFT collection holders',
      version: '1.0',
    });
    console.log('✅ Schema created successfully!');
    console.log(`   Schema ID: ${schemaResult.schemaId}`);
    console.log(`   Storage ID: ${schemaResult.storageId}\n`);

    const schemaName = 'nft-holder-credential';
    const schemeType = 'nftHolderCredential';

    // Step 3: Create Credential Template
    console.log('📝 Step 3: Creating Credential Template');
    const templateResult = await createCredentialTemplate({
      credentialName: schemaName,
      schemeType,
      schemeTitle: schemaName,
      expirationDuration: 365,
      issueMax: null,
      accessibleStartAt: '',
      accessibleEndAt: '',
      revokeFlag: 0,
      complianceAccessKeyEnabled: 0,
    });
    console.log('✅ Issuance program created successfully!');
    console.log(`   Program ID: ${templateResult.programId}\n`);

    // Step 4: Setup Pricing
    console.log('📝 Step 4: Setting Up Pricing');
    const pricingResult = await setupPricing({
      pricingModel: 'pay_on_success',
      complianceAccessKeyEnabled: false,
      priceUsd: 0,
    });
    console.log('✅ Pricing configured successfully!');
    console.log(`   Model: ${pricingResult.pricingModel}`);
    console.log(`   CAK Enabled: ${pricingResult.complianceAccessKeyEnabled}\n`);

    // Step 4.5: Verify Payment Schema
    console.log('📝 Step 4.5: Verifying Payment Schema');
    try {
      const paymentSchemas = await queryPaymentSchema();
      console.log(`✅ Payment schema verified - found ${paymentSchemas?.data?.length || 0} schema(s)\n`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.log(`⚠️  Payment schema query failed: ${e?.message ?? err}\n`);
    }

    // Wait a moment for backend to process
    console.log('⏳ Waiting for backend processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Create Verification Programs
    console.log('📝 Step 5: Creating Verification Programs');
    const programsResult = await createVerificationPrograms({
      deploy: true,
      programs: [
        {
          programName: 'nft_holder_standard',
          conditions: [
            { attribute: 'numberOfNfts', operator: '>=', value: 1 },
          ],
        },
        {
          programName: 'nft_holder_premium',
          conditions: [
            { attribute: 'numberOfNfts', operator: '>=', value: 10 },
          ],
        },
        {
          programName: 'nft_holder_whale',
          conditions: [
            { attribute: 'numberOfNfts', operator: '>=', value: 100 },
          ],
        },
      ],
    });
    console.log('✅ Verification programs created successfully!');
    programsResult.createdPrograms.forEach((prog, idx) => {
      console.log(`   ${idx + 1}. ${prog.programName}: ${prog.programId}`);
    });

    // Summary
    console.log('\n🎉 Sample Issuer Created Successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Schema ID:        ${schemaResult.schemaId}`);
    console.log(`Schema Name:      ${schemaName}`);
    console.log(`Programs Created: ${programsResult.createdPrograms.length}`);
    console.log('\nProgram IDs:');
    programsResult.createdPrograms.forEach((prog) => {
      console.log(`  - ${prog.programName}: ${prog.programId}`);
    });
    console.log('\n═══════════════════════════════════════\n');
    console.log('Next Steps:');
    console.log('1. Use these IDs in your issuer template .env.local');
    console.log('2. Implement user data fetching API');
    console.log('3. Test credential issuance flow');
    console.log('4. Deploy to production\n');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error:', err.message);
    if (err.stack) {
      console.error('\nStack trace:', err.stack);
    }
    process.exit(1);
  }
}

// Run the test
createSampleIssuer();
