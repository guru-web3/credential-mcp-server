# AIR Kit Quickstart 2 & 3 — MCP alignment

This MCP server is aligned with [AIR Kit](https://docs.moca.network/airkit/) **Quickstart 2: Issue Credentials** and **Quickstart 3: Verify Credentials**. Use `credential_docs` in the MCP for step-by-step issuance and verification flows; this document maps MCP tools to the official quickstarts and production standards.

## Official docs

| Flow        | AIR Kit doc |
|------------|-------------|
| Issue      | [Quickstart: Credential Issuance](https://docs.moca.network/airkit/quickstart/issue-credentials) |
| Verify     | [Quickstart: Credential Verification](https://docs.moca.network/airkit/quickstart/verify-credentials) |
| Overview   | [AIR Kit Overview](https://docs.moca.network/airkit/) |

## Production standards (from quickstarts)

- **JWT:** Generate JWTs on the **backend** so private keys never live in the frontend. Use [Partner Authentication](https://docs.moca.network/airkit/usage/partner-authentication) for JWKS URL and token generation.
- **Secrets:** Keep Partner ID, Issuer/Verifier DID, and private keys in environment variables; use `credential_issuance_app_config` / `credential_verifier_app_config` to generate `.env` snippets.
- **Dashboard:** Configure JWKS URL in Developer Dashboard (Accounts → General). Use `credential_configure_issuer_jwks` to set JWKS URL and whitelist domain from a single origin after deploy.
- **Verifier:** Fund the Verifier fee wallet and use the correct chain/faucet for the environment.

## MCP → Quickstart 2 (Issue Credentials)

| Quickstart step              | MCP / action |
|-----------------------------|-------------|
| Get Partner ID & Issuer DID  | Connect to MCP; get from session or Dashboard. Use `credential_issuance_app_config` for env snippet. |
| Setup JWT                   | Backend JWT; configure JWKS in Dashboard. `credential_configure_issuer_jwks` to set JWKS URL from app origin. |
| Create schema               | `credential_create_schema` (schemaName, schemaType, dataPoints). |
| Create program (credential)  | `credential_create_program` (schemaId). Use returned programId as `credentialId` in SDK. |
| Set pricing                 | `credential_setup_pricing` (schemaId, pricingModel, optional priceUsd). Use setPriceUrl for on-chain price when priceUsd > 0. |
| In app: issueCredential     | `airService.issueCredential({ authToken, credentialId, credentialSubject, issuerDid, curve? })`. credentialId = programId from create_program. |

## MCP → Quickstart 3 (Verify Credentials)

| Quickstart step                | MCP / action |
|--------------------------------|-------------|
| Get Partner ID & Verifier DID   | Connect to MCP; get from session or Dashboard. Use `credential_verifier_app_config` for env snippet. |
| Setup JWT                      | Backend JWT; configure JWKS in Dashboard. |
| Fee wallet / faucet            | Dashboard → Verifier → Fee wallet; [Faucet](https://devnet-scan.mocachain.org/faucet) for test tokens. |
| Create verification program   | `credential_create_verification_programs` (schemaId, programs with conditions). Use returned program IDs as `programId` in SDK. |
| In app: verifyCredential       | `airService.verifyCredential({ authToken, programId, redirectUrl })`. Handle status: Compliant (zkProofs, transactionHash, optional cakPrivateKey) vs Non-Compliant. |

## SDK parameters (reference)

- **issueCredential:** `authToken`, `credentialId` (program ID), `credentialSubject` (object matching schema), `issuerDid`, optional `curve` ("secp256r1" | "secp256k1").
- **verifyCredential:** `authToken`, `programId`, `redirectUrl` (redirectUrlForIssuer when user needs to obtain a credential).

## Testing

See [TESTING-QUERIES.md](./TESTING-QUERIES.md) for natural-language prompts and example payloads that exercise schema, pricing, issuance program, and verification program creation. Use these with the MCP to regression-test tool choice and parameters.
