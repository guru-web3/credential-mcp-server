import { SessionState } from './types.js';

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

  requireAuth(): void {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please use the authenticate tool first.');
    }
  }
}

export const session = new Session();
