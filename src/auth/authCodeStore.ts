const CODE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export interface StoredAuthCode {
  codeChallenge: string;
  redirectUri: string;
  state?: string;
  clientId: string;
  dashboardToken: string;
  partnerId: string;
  issuerId: string;
  issuerDid: string;
  verifierId: string;
  verifierDid: string;
  walletAddress: string;
  environment: string;
  createdAt: number;
}

const store = new Map<string, StoredAuthCode>();

function prune(): void {
  const now = Date.now();
  for (const [code, data] of store.entries()) {
    if (now - data.createdAt > CODE_TTL_MS) store.delete(code);
  }
}

export function saveAuthCode(
  code: string,
  data: Omit<StoredAuthCode, 'createdAt'>
): void {
  prune();
  store.set(code, { ...data, createdAt: Date.now() });
}

export function consumeAuthCode(code: string): StoredAuthCode | undefined {
  const data = store.get(code);
  store.delete(code);
  return data;
}

export function getAuthCodeChallenge(code: string): string | undefined {
  return store.get(code)?.codeChallenge;
}
