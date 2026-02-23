'use client';

import { useState } from 'react';
import { useAccount, useSignTypedData } from '@starknet-react/core';
import { deriveEncryptionKeypair, createKeyDerivationTypedData } from '@/lib/encryptionKeys';
import WalletConnect from './WalletConnect';

/**
 * Component to derive and display encryption keypair
 * Use this to get the public key for issuing credentials
 */
export default function DeriveEncryptionKey() {
  const [keypair, setKeypair] = useState<{ privateKey: string; publicKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData({});

  const handleDeriveKey = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsSigning(true);
    setError(null);
    setKeypair(null);

    try {
      // Create typed data for signing
      const typedData = createKeyDerivationTypedData();

      // Sign the message
      const signature = await signTypedDataAsync(typedData as any);

      if (!signature || signature.length < 2) {
        throw new Error('Failed to sign message');
      }

      // Derive keypair from signature
      const derived = deriveEncryptionKeypair(signature);
      setKeypair(derived);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to derive encryption key');
    } finally {
      setIsSigning(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Derive Encryption Keypair</h2>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="text-sm font-semibold mb-3">Step 1: Connect Wallet</h3>
        <WalletConnect />
      </div>

      {isConnected && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="text-sm font-semibold mb-3">Step 2: Derive Encryption Key</h3>
          <p className="text-xs text-gray-600 mb-3">
            Sign a deterministic message to derive your encryption keypair. 
            The public key will be used by issuers to encrypt credentials to you.
          </p>
          <button
            onClick={handleDeriveKey}
            disabled={isSigning}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSigning ? 'Signing...' : 'Derive Keypair'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {keypair && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">Public Key (Share with Issuer)</h3>
              <button
                onClick={() => copyToClipboard(keypair.publicKey, 'Public Key')}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
            <p className="text-xs font-mono break-all bg-white p-2 rounded border">
              {keypair.publicKey}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              ✓ This is safe to share. Issuers need this to encrypt credentials for you.
            </p>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">Private Key (Keep Secret!)</h3>
              <button
                onClick={() => copyToClipboard(keypair.privateKey, 'Private Key')}
                className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
              >
                Copy
              </button>
            </div>
            <p className="text-xs font-mono break-all bg-white p-2 rounded border">
              {keypair.privateKey}
            </p>
            <p className="text-xs text-red-600 mt-2">
              ⚠️ NEVER share this! It's derived from your signature and used to decrypt credentials.
              You can regenerate it anytime by signing the same message.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="text-sm font-semibold mb-2">How to Use</h3>
            <ol className="text-xs space-y-1 list-decimal list-inside">
              <li>Copy the <strong>Public Key</strong> above</li>
              <li>Provide it to the issuer when applying for credentials</li>
              <li>The issuer will encrypt the credential's AES key to this public key</li>
              <li>When you need to decrypt, sign the same message again to get the private key</li>
              <li>Use the private key to decrypt the encrypted AES key</li>
              <li>Use the AES key to decrypt the credential attributes</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
