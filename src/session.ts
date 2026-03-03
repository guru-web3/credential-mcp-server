import { SessionState } from './types.js';
import { tryKeyBasedLogin } from './auth/keyAuth.js';
import { getEnvironment, getCredentialApiUrl, toSessionEnvironment, type ConfigEnvironment } from './config.js';

/**
 * Session management for MCP server.
 * All API URLs come from config (env); no hardcoded hosts.
 */
class Session {
  private state: SessionState;

  constructor() {
    const env = getEnvironment();
    this.state = {
      environment: toSessionEnvironment(env),
      apiUrl: getCredentialApiUrl(env),
    };
  }

  set<K extends keyof SessionState>(key: K, value: SessionState[K]): void {
    this.state[key] = value;
  }

  get<K extends keyof SessionState>(key: K): SessionState[K] {
    return this.state[key];
  }

  clear(): void {
    const env = getEnvironment();
    this.state = {
      environment: toSessionEnvironment(env),
      apiUrl: getCredentialApiUrl(env),
    };
  }

  isAuthenticated(): boolean {
    return (
      !!this.state.dashboardToken &&
      (!this.state.tokenExpiry || this.state.tokenExpiry > new Date())
    );
  }

  setEnvironment(env: 'development' | 'staging' | 'production'): void {
    this.state.environment = env;
    const configEnv: ConfigEnvironment = env === 'production' ? 'production' : env === 'development' ? 'sandbox' : 'staging';
    this.state.apiUrl = getCredentialApiUrl(configEnv);
  }

  /** Set environment and apiUrl from config env (sandbox | staging | production). Use after login. */
  setConfigEnvironment(configEnv: ConfigEnvironment): void {
    this.state.environment = toSessionEnvironment(configEnv);
    this.state.apiUrl = getCredentialApiUrl(configEnv);
  }

  /** Ensures session is authenticated. If not, tries key-based login when CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE is set. */
  async requireAuth(): Promise<void> {
    if (this.isAuthenticated()) return;
    try {
      const configEnv = getEnvironment();
      const loggedIn = await tryKeyBasedLogin(configEnv);
      if (loggedIn && this.isAuthenticated()) return;
    } catch (e) {
      console.error('[DEBUG] Auto key-based login failed:', (e as Error).message);
    }
    throw new Error('Not authenticated. Connect to the MCP server (or set CREDENTIAL_MCP_PRIVATE_KEY and retry).');
  }
}

export const session = new Session();
