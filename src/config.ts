/**
 * Central config: all URLs from env. No hardcoded API hosts.
 * Set CREDENTIAL_MCP_ENVIRONMENT or config_env to sandbox | sandbox-testnet | staging | production (or prod).
 * Override any URL with the corresponding _URL env var.
 */

export type ConfigEnvironment = 'sandbox' | 'sandbox-testnet' | 'staging' | 'production';

const CREDENTIAL_API_URLS: Record<ConfigEnvironment, string> = {
  sandbox: 'https://credential-devnet.api.sandbox.air3.com',
  'sandbox-testnet': 'https://credential-testnet.api.sandbox.air3.com',
  staging: 'https://credential.api.staging.air3.com',
  production: 'https://credential.api.air3.com',
};

const CREDENTIAL_DASHBOARD_URLS: Record<ConfigEnvironment, string> = {
  sandbox: 'https://developers.sandbox.air3.com',
  'sandbox-testnet': 'https://developers.sandbox-testnet.air3.com',
  staging: 'https://developers.sandbox.air3.com',
  production: 'https://developers.air3.com',
};

const MOCA_CHAIN_API_URLS: Record<ConfigEnvironment, string> = {
  sandbox: 'https://api.staging.mocachain.org',
  'sandbox-testnet': 'https://api.sandbox.mocachain.org',
  staging: 'https://api.staging.mocachain.org',
  production: 'https://api.mocachain.org',
};

/** Devnet: staging/sandbox (credential-dashboard .env.uat / .env.development). */
const MOCA_DEVNET = {
  rpcUrl: 'https://devnet-rpc.mocachain.org',
  chainId: 5151,
  paymentsContract: '0x56ad210e36c8424d1d1cc5166b3f9fa4c03a8942',
  issuerStakingController: '0x238e4AA1a6CF2A774079E73019402Beb03F3a7b5',
} as const;

/** Testnet: production (credential-dashboard .env.sandbox-testnet, wagmi mocaTestnet id 222888). */
const MOCA_TESTNET = {
  rpcUrl: 'https://testnet-rpc.mocachain.org',
  chainId: 222888,
  paymentsContract: '0x8dE288d0fdfe3F165fCB305C7E0D812B05294C27',
  issuerStakingController: '0xc625FcE7bfd12f024584e0f9f215F5E76c850d32',
} as const;

function getEnv(name: string): string {
  return (process.env[name] ?? '').trim();
}

function getConfigEnvironment(): ConfigEnvironment {
  const raw = (getEnv('config_env') || getEnv('CREDENTIAL_MCP_ENVIRONMENT')).toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'staging') return 'staging';
  if (raw === 'sandbox-testnet' || raw === 'sandboxtestnet') return 'sandbox-testnet';
  if (raw === 'sandbox') return 'sandbox';
  return 'sandbox-testnet';
}

/** Environment (sandbox | sandbox-testnet | staging | production). Default: sandbox-testnet. */
export function getEnvironment(): ConfigEnvironment {
  return getConfigEnvironment();
}

/** Credential API base URL. Override with CREDENTIAL_API_URL. */
export function getCredentialApiUrl(env?: ConfigEnvironment): string {
  const override = getEnv('CREDENTIAL_API_URL');
  if (override) return override;
  return CREDENTIAL_API_URLS[env ?? getConfigEnvironment()];
}

/** Default API signature key (same as Credential Dashboard JAVA_API_AES_KEY in sig-header.tsx). Override with CREDENTIAL_API_SIGNATURE_KEY. */
const DEFAULT_API_SIGNATURE_KEY = 'WpVog9P8NveQLEJYE2cnjg==';

/**
 * API signature key for credential API requests (same as Credential Dashboard uses for x-signature).
 * Defaults to dashboard value; set CREDENTIAL_API_SIGNATURE_KEY in .env to override.
 */
export function getCredentialApiSignatureKey(): string {
  const key = getEnv('CREDENTIAL_API_SIGNATURE_KEY');
  return key || DEFAULT_API_SIGNATURE_KEY;
}

/** Developer dashboard base URL. Override with CREDENTIAL_DASHBOARD_URL. */
export function getCredentialDashboardUrl(env?: ConfigEnvironment): string {
  const override = getEnv('CREDENTIAL_DASHBOARD_URL');
  if (override) return override;
  return CREDENTIAL_DASHBOARD_URLS[env ?? getConfigEnvironment()];
}

/** MOCA chain/payment API URL. Override with MOCA_CHAIN_API_URL. */
export function getMocaChainApiUrl(env?: ConfigEnvironment): string {
  const override = getEnv('MOCA_CHAIN_API_URL');
  if (override) return override;
  return MOCA_CHAIN_API_URLS[env ?? getConfigEnvironment()];
}

/** Map config env to session environment (development | staging | production). */
export function toSessionEnvironment(env: ConfigEnvironment): 'development' | 'staging' | 'production' {
  if (env === 'production') return 'production';
  if (env === 'sandbox') return 'development';
  return 'staging'; // sandbox-testnet and staging
}

/** Map session environment back to config env (for tools that only have session.state.environment). */
export function fromSessionEnvironment(env: 'development' | 'staging' | 'production'): ConfigEnvironment {
  if (env === 'production') return 'production';
  return env === 'development' ? 'sandbox' : 'staging';
}

/** MOCA RPC URL: devnet for sandbox/staging, testnet for production/sandbox-testnet. Override with MOCA_RPC_URL. */
export function getMocaRpcUrl(env?: ConfigEnvironment): string {
  const override = getEnv('MOCA_RPC_URL');
  if (override) return override;
  const e = env ?? getConfigEnvironment();
  return e === 'production' || e === 'sandbox-testnet' ? MOCA_TESTNET.rpcUrl : MOCA_DEVNET.rpcUrl;
}

/** MOCA chain ID: 5151 devnet (sandbox/staging), 222888 testnet (production/sandbox-testnet). Override with MOCA_CHAIN_ID. */
export function getMocaChainId(env?: ConfigEnvironment): number {
  const override = getEnv('MOCA_CHAIN_ID');
  if (override) {
    const n = parseInt(override, 10);
    if (!Number.isNaN(n)) return n;
  }
  const e = env ?? getConfigEnvironment();
  return e === 'production' || e === 'sandbox-testnet' ? MOCA_TESTNET.chainId : MOCA_DEVNET.chainId;
}

/** Payments controller contract address. Override with MOCA_PAYMENTS_CONTRACT. */
export function getMocaPaymentsContract(env?: ConfigEnvironment): string {
  const override = getEnv('MOCA_PAYMENTS_CONTRACT');
  if (override) return override;
  const e = env ?? getConfigEnvironment();
  return e === 'production' || e === 'sandbox-testnet' ? MOCA_TESTNET.paymentsContract : MOCA_DEVNET.paymentsContract;
}

/** Issuer staking controller address. Override with MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS. */
export function getMocaIssuerStakingControllerAddress(env?: ConfigEnvironment): string {
  const override = getEnv('MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS');
  if (override) return override;
  const e = env ?? getConfigEnvironment();
  return e === 'production' || e === 'sandbox-testnet' ? MOCA_TESTNET.issuerStakingController : MOCA_DEVNET.issuerStakingController;
}

/** Apply chain env defaults from config so MOCA_* are set when not in .env. Call after dotenv. */
export function applyChainEnvDefaults(): void {
  const env = getConfigEnvironment();
  if (!process.env.MOCA_RPC_URL) process.env.MOCA_RPC_URL = getMocaRpcUrl(env);
  if (!process.env.MOCA_CHAIN_ID) process.env.MOCA_CHAIN_ID = String(getMocaChainId(env));
  if (!process.env.MOCA_PAYMENTS_CONTRACT && getMocaPaymentsContract(env)) {
    process.env.MOCA_PAYMENTS_CONTRACT = getMocaPaymentsContract(env);
  }
  if (!process.env.MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS && getMocaIssuerStakingControllerAddress(env)) {
    process.env.MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS = getMocaIssuerStakingControllerAddress(env);
  }
}
