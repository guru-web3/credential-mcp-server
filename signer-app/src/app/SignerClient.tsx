'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { buildLoginMessage } from './loginMessage';

function decodeMessageFromHash(m: string): string {
  try {
    const raw = decodeURIComponent(m);
    return new TextDecoder().decode(
      Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
    );
  } catch {
    try {
      return atob(m);
    } catch {
      return '';
    }
  }
}

export interface OAuthParams {
  state: string;
  code_challenge: string;
  redirect_uri: string;
  client_id: string;
  callback_url: string;
  environment: 'staging' | 'production';
}

function getOAuthParamsFromQuery(): OAuthParams | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const state = params.get('state') ?? '';
  const code_challenge = params.get('code_challenge') ?? '';
  const redirect_uri = params.get('redirect_uri') ?? '';
  const client_id = params.get('client_id') ?? '';
  const callback_url = params.get('callback_url') ?? '';
  const env = (params.get('environment') ?? 'staging').toLowerCase();
  const environment = env === 'production' ? 'production' : 'staging';
  if (!state || !code_challenge || !redirect_uri || !client_id || !callback_url) {
    return null;
  }
  return { state, code_challenge, redirect_uri, client_id, callback_url, environment };
}

export default function SignerClient() {
  const [message, setMessage] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [locked, setLocked] = useState(false);
  const [hasPrefill, setHasPrefill] = useState(false);
  const [noPrefillNotice, setNoPrefillNotice] = useState(false);
  const [error, setError] = useState('');
  const [resultJson, setResultJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [oauthParams, setOauthParams] = useState<OAuthParams | null>(null);
  const [oauthSubmitPayload, setOauthSubmitPayload] = useState<{
    walletAddress: string;
    signature: string;
    timestamp: number;
    environment: 'staging' | 'production';
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse OAuth query params (OAuth mode) or hash (standalone mode)
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const oauth = getOAuthParamsFromQuery();
    if (oauth) {
      setOauthParams(oauth);
      return;
    }
    const hash = window.location.hash.slice(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const m = params.get('m');
      const t = params.get('t');
      if (m) {
        const decoded = decodeMessageFromHash(m);
        setMessage(decoded || '');
      }
      if (t) setTimestamp(t);
      if (m && t) {
        setLocked(true);
        setHasPrefill(true);
      }
    } else {
      setLocked(true);
      setNoPrefillNotice(true);
    }
  }, [mounted]);

  // OAuth mode: generate message + timestamp from connected address
  const oauthChallenge = useMemo(() => {
    if (!oauthParams || !address) return null;
    const ts = Date.now();
    const isoTimestamp = new Date(ts).toISOString();
    const loginMessage = buildLoginMessage(address, isoTimestamp);
    return { loginMessage, timestamp: ts, isoTimestamp };
  }, [oauthParams, address]);

  // When in OAuth mode and we have challenge, sync to message/timestamp for the sign step
  useEffect(() => {
    if (oauthParams && oauthChallenge) {
      setMessage(oauthChallenge.loginMessage);
      setTimestamp(String(oauthChallenge.timestamp));
      setLocked(true);
    }
  }, [oauthParams, oauthChallenge]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const isOAuthMode = oauthParams !== null;
  const canSign =
    message.trim() &&
    timestamp.trim() &&
    isConnected &&
    address &&
    (!isOAuthMode || oauthChallenge !== null);

  const handleSign = async () => {
    clearError();
    const ts = timestamp.trim();
    if (!message.trim() || !ts) {
      showError('Please enter both the login message and the timestamp.');
      return;
    }
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) {
      showError('Timestamp must be a number (milliseconds).');
      return;
    }
    if (!address) {
      showError('Connect your wallet first.');
      return;
    }
    try {
      const signature = await signMessageAsync({ message: message.trim() });
      if (isOAuthMode && oauthParams) {
        setOauthSubmitPayload({
          walletAddress: address.toLowerCase(),
          signature,
          timestamp: tsNum,
          environment: oauthParams.environment,
        });
      } else {
        setResultJson(
          JSON.stringify(
            { walletAddress: address.toLowerCase(), signature, timestamp: tsNum },
            null,
            2
          )
        );
      }
    } catch (e) {
      showError((e as Error).message || 'Signing failed.');
    }
  };

  // OAuth mode: auto-submit form when we have payload
  useEffect(() => {
    if (oauthSubmitPayload && oauthParams && formRef.current) {
      formRef.current.submit();
    }
  }, [oauthSubmitPayload, oauthParams]);

  const handleCopy = useCallback(async () => {
    if (!resultJson) return;
    try {
      await navigator.clipboard.writeText(resultJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError('Copy failed. Select and copy the JSON manually.');
    }
  }, [resultJson, showError]);

  if (!mounted) {
    return (
      <div className="max-w-[560px] mx-auto p-6">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto p-6 font-sans">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold">
          {isOAuthMode ? 'Sign in to connect Cursor' : 'Sign login message for AIR Credential MCP'}
        </h1>
        <ConnectButton />
      </div>
      {isOAuthMode ? (
        <p className="text-gray-600 text-sm mb-6">
          Connect your wallet, then sign the message to complete sign-in. No private key is sent.
        </p>
      ) : (
        <p className="text-gray-600 text-sm mb-6">
          No private key is sent to the app. Connect your wallet, sign the
          message, then copy the result into{' '}
          <code className="bg-gray-200 px-1 rounded">credential_authenticate</code>.
        </p>
      )}

      {!isOAuthMode && noPrefillNotice && (
        <div
          className="p-4 bg-amber-100 border border-amber-400 rounded-lg text-sm mb-4"
          role="alert"
        >
          Open the <strong>signer URL</strong> from{' '}
          <code className="bg-amber-200 px-1 rounded">credential_get_login_challenge</code>{' '}
          so the required message and timestamp are prefilled. Do not edit them.
        </div>
      )}

      {isOAuthMode && !address && (
        <p className="text-gray-600 text-sm mb-4">
          <span className="font-bold text-blue-600">1.</span> Connect your wallet above.
        </p>
      )}

      {(isOAuthMode ? oauthChallenge : true) && (
        <>
          <div className="mb-5">
            <span className="font-bold text-blue-600">{isOAuthMode ? '2' : '1'}.</span>{' '}
            {isOAuthMode
              ? 'Login message and timestamp (generated from your wallet address).'
              : 'Required message and timestamp (prefilled from link – do not edit).'}
          </div>

          <div className="mb-4">
            <label
              htmlFor="message"
              className="block font-semibold text-sm mb-1.5"
            >
              Login message {isOAuthMode ? '' : '(required – from link)'}
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => !locked && setMessage(e.target.value)}
              readOnly={locked}
              placeholder={
                isOAuthMode
                  ? 'Connect your wallet to generate the message.'
                  : 'Open the signer URL from credential_get_login_challenge to load the required message.'
              }
              className="w-full min-h-[100px] px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono resize-y bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-700"
            />
            {hasPrefill && !isOAuthMode && (
              <p className="text-gray-600 text-xs mt-1">
                Prefilled from link. Do not edit – this exact message must be signed.
              </p>
            )}
            {isOAuthMode && oauthChallenge && (
              <p className="text-gray-600 text-xs mt-1">
                Generated from your connected wallet. This exact message will be signed.
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="timestamp"
              className="block font-semibold text-sm mb-1.5"
            >
              Timestamp (milliseconds) {isOAuthMode ? '' : '(required – from link)'}
            </label>
            <input
              id="timestamp"
              type="text"
              value={timestamp}
              onChange={(e) => !locked && setTimestamp(e.target.value)}
              readOnly={locked}
              placeholder={isOAuthMode ? 'Generated when wallet is connected.' : 'Prefilled from link.'}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-700"
            />
          </div>

          <div className="mb-4">
            <span className="font-bold text-blue-600">{isOAuthMode ? '3' : '2'}.</span>{' '}
            {isOAuthMode ? 'Sign the message below to complete sign-in.' : 'Connect your wallet above, then sign the message.'}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={handleSign}
        disabled={!canSign || isSigning}
        className="bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold text-base hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {isSigning ? 'Signing…' : isOAuthMode ? 'Sign in' : 'Sign message'}
      </button>

      {error && (
        <p className="text-red-600 text-sm mt-2" role="alert">
          {error}
        </p>
      )}

      {oauthSubmitPayload && oauthParams && (
        <form
          ref={formRef}
          method="post"
          action={oauthParams.callback_url}
          encType="application/x-www-form-urlencoded"
          style={{ display: 'none' }}
        >
          <input type="hidden" name="state" value={oauthParams.state} />
          <input type="hidden" name="code_challenge" value={oauthParams.code_challenge} />
          <input type="hidden" name="redirect_uri" value={oauthParams.redirect_uri} />
          <input type="hidden" name="client_id" value={oauthParams.client_id} />
          <input type="hidden" name="walletAddress" value={oauthSubmitPayload.walletAddress} />
          <input type="hidden" name="signature" value={oauthSubmitPayload.signature} />
          <input type="hidden" name="timestamp" value={String(oauthSubmitPayload.timestamp)} />
          <input type="hidden" name="environment" value={oauthSubmitPayload.environment} />
        </form>
      )}

      {!isOAuthMode && resultJson && (
        <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-lg text-xs">
          <h3 className="font-semibold text-gray-900 mb-2">
            Result – copy this into credential_authenticate
          </h3>
          <pre className="whitespace-pre-wrap break-all font-mono text-gray-800 overflow-x-auto">
            {resultJson}
          </pre>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={handleCopy}
              className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Copy JSON
            </button>
            {copied && (
              <span className="text-green-600 text-sm font-medium">Copied.</span>
            )}
          </div>
        </div>
      )}

      {isOAuthMode && oauthSubmitPayload && (
        <p className="text-gray-600 text-sm mt-4">Completing sign-in…</p>
      )}
    </div>
  );
}
