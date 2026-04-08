/**
 * Central config: all URLs from env. No hardcoded API hosts.
 * Set CREDENTIAL_MCP_ENVIRONMENT or config_env to sandbox | staging | production (or prod).
 * Override any URL with the corresponding _URL env var.
 */

export type ConfigEnvironment = 'sandbox' | 'staging' | 'production';

const CREDENTIAL_API_URLS: Record<ConfigEnvironment, string> = {
  sandbox: 'https://credential-devnet.api.sandbox.air3.com',
  staging: 'https://credential.api.staging.air3.com',
  production: 'https://credential.api.air3.com',
};

const CREDENTIAL_DASHBOARD_URLS: Record<ConfigEnvironment, string> = {
  sandbox: 'https://developers.sandbox.air3.com',
  staging: 'https://developers.sandbox.air3.com',
  production: 'https://developers.air3.com',
};

const MOCA_CHAIN_API_URLS: Record<ConfigEnvironment, string> = {
  sandbox: 'https://api.staging.mocachain.org',
  staging: 'https://api.staging.mocachain.org',
  production: 'https://api.mocachain.org',
};

/**
 * MOCA testnet (chainId 222888): defaults align with credential-dashboard staging
 * (.env.staging: VITE_APP_MOCA_RPC_URL, VITE_APP_MOCA_PAYMENTS_CONTRACT,
 * VITE_APP_ISSUER_STAKING_CONTROLLER_ADDRESS). Override with MOCA_* env vars.
 */
const MOCA_TESTNET = {
  rpcUrl: 'https://rpc.testnet.mocachain.dev',
  chainId: 222888,
  paymentsContract: '0xFd44F0336f50d64fEdB0EeEa7BB89BFAbbeFA91c',
  issuerStakingController: '0x473439A1E11d1B2241318Bdd56b3600a51f4156E',
} as const;

function getEnv(name: string): string {
  return (process.env[name] ?? '').trim();
}

function getConfigEnvironment(): ConfigEnvironment {
  const raw = (getEnv('config_env') || getEnv('CREDENTIAL_MCP_ENVIRONMENT')).toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'staging') return 'staging';
  if (raw === 'sandbox') return 'sandbox';
  return 'staging';
}

/** Environment (sandbox | staging | production). Default: staging. */
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
  return env === 'sandbox' ? 'development' : 'staging';
}

/** Map session environment back to config env (for tools that only have session.state.environment). */
export function fromSessionEnvironment(env: 'development' | 'staging' | 'production'): ConfigEnvironment {
  if (env === 'production') return 'production';
  return env === 'development' ? 'sandbox' : 'staging';
}

/** MOCA RPC URL. Override with MOCA_RPC_URL. */
export function getMocaRpcUrl(_env?: ConfigEnvironment): string {
  const override = getEnv('MOCA_RPC_URL');
  if (override) return override;
  return MOCA_TESTNET.rpcUrl;
}

/** MOCA chain ID (222888 testnet). Override with MOCA_CHAIN_ID. */
export function getMocaChainId(_env?: ConfigEnvironment): number {
  const override = getEnv('MOCA_CHAIN_ID');
  if (override) {
    const n = parseInt(override, 10);
    if (!Number.isNaN(n)) return n;
  }
  return MOCA_TESTNET.chainId;
}

/** Payments controller contract address. Override with MOCA_PAYMENTS_CONTRACT. */
export function getMocaPaymentsContract(_env?: ConfigEnvironment): string {
  const override = getEnv('MOCA_PAYMENTS_CONTRACT');
  if (override) return override;
  return MOCA_TESTNET.paymentsContract;
}

/** Issuer staking controller address. Override with MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS. */
export function getMocaIssuerStakingControllerAddress(_env?: ConfigEnvironment): string {
  const override = getEnv('MOCA_ISSUER_STAKING_CONTROLLER_ADDRESS');
  if (override) return override;
  return MOCA_TESTNET.issuerStakingController;
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
