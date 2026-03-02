# On-chain tools – Staging setup and test prompts

## Staging addresses (MOCA devnet)

These must match the credential dashboard’s staging config (e.g. `credential-dashboard/.env.staging`: `VITE_APP_MOCA_CHAIN_ID`, `VITE_APP_MOCA_RPC_URL`, `VITE_APP_MOCA_PAYMENTS_CONTRACT`).

| Env / Use            | Value |
|----------------------|--------|
| **USD8 token (staging)** | `0x7e4278579B10163E35E20942E9157306aa48D93a` |
| MOCA RPC             | `https://devnet-rpc.mocachain.org` |
| MOCA Chain ID        | `5151` |
| Payments Controller  | `0x56ad210e36c8424d1d1cc5166b3f9fa4c03a8942` |
| Issuer Staking Controller | `0x238e4AA1a6CF2A774079E73019402Beb03F3a7b5` |

USD8 is used for verification fees and verifier deposit/withdraw. The MCP on-chain tools call the Payments Controller and Issuer Staking Controller; the USD8 address is for reference (e.g. checking balances, approvals in the dashboard).

---

## Sample MCP env config (Cursor / MCP client)

Use the **issuer admin wallet** (the same wallet you use in the Credential Dashboard for this partner). The Payments Controller only allows the registered issuer to call `createSchema` / `updateSchemaFee`; if the MCP key is a different wallet, the transaction will revert. Ensure the wallet has devnet MOCA for gas ([faucet](https://devnet-scan.mocachain.org/faucet)).

**Cursor → Settings → MCP → Add or edit your server → `env`:**

```json
{
  "mcpServers": {
    "animoca-credentials": {
      "command": "/FULL/PATH/TO/node",
      "args": ["/FULL/PATH/TO/credential-mcp-server/dist/index.js"],
      "env": {
        "CREDENTIAL_MCP_PRIVATE_KEY": "0xYOUR_PRIVATE_KEY_HEX",
        "MOCA_RPC_URL": "https://devnet-rpc.mocachain.org",
        "MOCA_CHAIN_ID": "5151",
        "MOCA_PAYMENTS_CONTRACT": "0x56ad210e36c8424d1d1cc5166b3f9fa4c03a8942",
        "MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS": "0x238e4AA1a6CF2A774079E73019402Beb03F3a7b5"
      }
    }
  }
}
```

Or with **seed phrase** instead of private key:

```json
"env": {
  "CREDENTIAL_MCP_SEED_PHRASE": "word1 word2 word3 ... word12",
  "CREDENTIAL_MCP_ACCOUNT_INDEX": "0",
  "MOCA_RPC_URL": "https://devnet-rpc.mocachain.org",
  "MOCA_CHAIN_ID": "5151",
  "MOCA_PAYMENTS_CONTRACT": "0x56ad210e36c8424d1d1cc5166b3f9fa4c03a8942",
  "MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS": "0x238e4AA1a6CF2A774079E73019402Beb03F3a7b5"
}
```

Replace `CREDENTIAL_MCP_PRIVATE_KEY` or `CREDENTIAL_MCP_SEED_PHRASE` with your real value; use a **low-value** wallet. Never commit these.

Optional: **`MOCA_GAS_LIMIT`** (default `800000`) – explicit gas limit for contract writes. If you see "out of gas" on devnet, increase this (e.g. `1000000`).

---

## Sample prompts to test on-chain tools

After connecting to the MCP and ensuring the server has the env above:

### Pricing / set price

- **“Set verification price to 0.1 USD on-chain.”**  
  (Uses `credential_set_price` with `priceUsd: 0.1`; creates a new fee schema if no `paymentFeeSchemaId`.)

- **“Update the fee schema 0x… to 0.5 USD.”**  
  (Use a real `paymentFeeSchemaId` from a previous create or from the dashboard.)

- **“Set up pricing for my last schema: pay on success, 0.2 USD.”**  
  (Uses `credential_setup_pricing`; with chain wallet set, it will set the price on-chain and return `txHash`.)

### Payment (verifier / issuer)

- **“Deposit 10 USD8 for verifier 0xVERIFIER_ADDRESS.”**  
  (Uses `credential_payment_deposit`. Verifier must be the asset manager address; user must have approved the Payments Controller to spend USD8.)

- **“Withdraw 5 USD8 for verifier 0xVERIFIER_ADDRESS.”**  
  (Uses `credential_payment_withdraw`.)

- **“Claim fees for issuer 0xISSUER_ADDRESS.”**  
  (Uses `credential_payment_claim_fees`.)

### MOCA staking

- **“Stake 10 MOCA for issuer usage quota.”**  
  (Uses `credential_stake_moca`; wallet must hold native MOCA on devnet.)

- **“Initiate unstake of 5 MOCA.”**  
  (Uses `credential_unstake_moca`.)

- **“Claim unstaked MOCA for timestamps [1234567890, 1234567891].”**  
  (Uses `credential_claim_unstake_moca` after the unstake delay; timestamps come from UnstakeInitiated events.)

### Combined flow

- **“Create a schema for trading volume, set pricing to pay on success with 0.1 USD, and set that price on-chain.”**  
  (Create schema → setup_pricing with priceUsd; with chain wallet, the server will set the price on-chain and return the tx hash.)

---

## Quick checklist

1. **Connect** to the MCP server (Cursor Connect/Start or HTTP OAuth).
2. **Env** set with `CREDENTIAL_MCP_PRIVATE_KEY` or `CREDENTIAL_MCP_SEED_PHRASE` and the staging `MOCA_*` vars above.
3. **Wallet** has devnet MOCA (and USD8 if testing deposit); use a dedicated low-value wallet.
4. **Verifier/issuer addresses** for deposit/withdraw/claim are the **asset manager** addresses (from Credential Dashboard payment config or API), not the wallet address.
