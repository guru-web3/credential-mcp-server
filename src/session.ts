import { SessionState } from './types.js';
import { tryKeyBasedLogin } from './auth/keyAuth.js';

/**
 * Session management for MCP server
 * Maintains state across tool calls
 */
class Session {
  private state: SessionState;

  constructor() {
    this.state = {
      environment: 'staging',
      apiUrl: 'https://credential.api.staging.air3.com',
    };
  }

  set<K extends keyof SessionState>(key: K, value: SessionState[K]): void {
    this.state[key] = value;
  }

  get<K extends keyof SessionState>(key: K): SessionState[K] {
    return this.state[key];
  }

  clear(): void {
    this.state = {
      environment: 'staging',
      apiUrl: 'https://credential.api.staging.air3.com',
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
    this.state.apiUrl = this.getApiUrl(env);
  }

  private getApiUrl(env: string): string {
    const urls = {
      production: 'https://credential.api.air3.com',
      staging: 'https://credential.api.staging.air3.com',
      development: 'https://credential.api.staging.air3.com',
    };
    return urls[env as keyof typeof urls] || urls.staging;
  }

  /** Ensures session is authenticated. If not, tries key-based login when CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE is set. */
  async requireAuth(): Promise<void> {
    if (this.isAuthenticated()) return;
    try {
      const env = (process.env.CREDENTIAL_MCP_ENVIRONMENT as 'staging' | 'production') || 'staging';
      const loggedIn = await tryKeyBasedLogin(env);
      if (loggedIn && this.isAuthenticated()) return;
    } catch (e) {
      console.error('[DEBUG] Auto key-based login failed:', (e as Error).message);
    }
    throw new Error('Not authenticated. Please use the authenticate tool first.');
  }
}

export const session = new Session();
