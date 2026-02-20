'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

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

  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
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

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const canSign = message.trim() && timestamp.trim() && isConnected && address;

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
      const payload = {
        walletAddress: address.toLowerCase(),
        signature,
        timestamp: tsNum,
      };
      setResultJson(JSON.stringify(payload, null, 2));
    } catch (e) {
      showError((e as Error).message || 'Signing failed.');
    }
  };

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
          Sign login message for AIR Credential MCP
        </h1>
        <ConnectButton />
      </div>
      <p className="text-gray-600 text-sm mb-6">
        No private key is sent to the app. Connect your wallet, sign the
        message, then copy the result into{' '}
        <code className="bg-gray-200 px-1 rounded">credential_authenticate</code>.
      </p>

      {noPrefillNotice && (
        <div
          className="p-4 bg-amber-100 border border-amber-400 rounded-lg text-sm mb-4"
          role="alert"
        >
          Open the <strong>signer URL</strong> from{' '}
          <code className="bg-amber-200 px-1 rounded">credential_get_login_challenge</code>{' '}
          so the required message and timestamp are prefilled. Do not edit them.
        </div>
      )}

      <div className="mb-5">
        <span className="font-bold text-blue-600">1.</span>{' '}
        Required message and timestamp (prefilled from link – do not edit).
      </div>

      <div className="mb-4">
        <label
          htmlFor="message"
          className="block font-semibold text-sm mb-1.5"
        >
          Login message (required – from link)
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => !locked && setMessage(e.target.value)}
          readOnly={locked}
          placeholder="Open the signer URL from credential_get_login_challenge to load the required message."
          className="w-full min-h-[100px] px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono resize-y bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-700"
        />
        {hasPrefill && (
          <p className="text-gray-600 text-xs mt-1">
            Prefilled from link. Do not edit – this exact message must be signed.
          </p>
        )}
      </div>

      <div className="mb-6">
        <label
          htmlFor="timestamp"
          className="block font-semibold text-sm mb-1.5"
        >
          Timestamp (milliseconds, required – from link)
        </label>
        <input
          id="timestamp"
          type="text"
          value={timestamp}
          onChange={(e) => !locked && setTimestamp(e.target.value)}
          readOnly={locked}
          placeholder="Prefilled from link."
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-700"
        />
      </div>

      <div className="mb-4">
        <span className="font-bold text-blue-600">2.</span> Connect your wallet
        above, then sign the message.
      </div>

      <button
        type="button"
        onClick={handleSign}
        disabled={!canSign || isSigning}
        className="bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold text-base hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {isSigning ? 'Signing…' : 'Sign message'}
      </button>

      {error && (
        <p className="text-red-600 text-sm mt-2" role="alert">
          {error}
        </p>
      )}

      {resultJson && (
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
    </div>
  );
}
