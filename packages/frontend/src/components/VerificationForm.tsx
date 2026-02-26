'use client';

import { useState } from 'react';
import { useAccount, useSignTypedData } from '@starknet-react/core';
import { CompactVerificationPackage } from '@/types/verification';
import WalletConnect from './WalletConnect';
import { deriveEncryptionKeypair, createKeyDerivationTypedData } from '@/lib/encryptionKeys';
import { ec, typedData } from 'starknet';
// import { getFullPublicKeyFromSignature } from '@/lib/utils';

interface VerificationFormProps {
  onSubmit: (packageData: CompactVerificationPackage) => void;
  isLoading: boolean;
}

export default function VerificationForm({ onSubmit, isLoading }: VerificationFormProps) {
  const [packageJson, setPackageJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [encryptionPrivateKey, setEncryptionPrivateKey] = useState<string | null>(null);
  const [holderSignature, setHolderSignature] = useState<any | null>(null);
  const [messageHash, setMessageHash] = useState("");
  const [nonce, setNonce] = useState<string>('');
  const [isDeriving, setIsDeriving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData({});

  // Step 1: Derive encryption private key from wallet signature
  const handleDeriveEncryptionKey = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsDeriving(true);
    setError(null);

    try {
      // Create typed data for key derivation
      const keyDerivationTypedData = createKeyDerivationTypedData();

      // Sign with wallet to derive encryption keypair
      const walletSignature = await signTypedDataAsync(keyDerivationTypedData as any);

      if (!walletSignature || walletSignature.length < 2) {
        throw new Error('Failed to sign key derivation message');
      }

      // Derive encryption keypair
      const { privateKey } = deriveEncryptionKeypair(walletSignature);
      setEncryptionPrivateKey(privateKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to derive encryption key');
    } finally {
      setIsDeriving(false);
    }
  };

  // Step 2: Sign nonce with encryption private key (not wallet)
  const handleSignNonce = async () => {
    if (!encryptionPrivateKey) {
      setError('Please derive encryption key first');
      return;
    }

    setIsSigning(true);
    setError(null);

    try {
      // Generate fresh nonce
      const randomNum = Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER).toString();
      const now = Date.now().toString();
      const freshNonce = `${randomNum}${now}`;
      setNonce(freshNonce);


      // Create message to sign with encryption private key
      const nonceTypedData = {
        domain: {
          name: 'Kirocred Verifier',
          version: '1',
          chainId: 'SN_SEPOLIA',
        },
        types: {
          StarkNetDomain: [
            { name: 'name', type: 'felt' },
            { name: 'version', type: 'felt' },
            { name: 'chainId', type: 'felt' },
          ],
          VerificationNonce: [
            { name: 'nonce', type: 'felt' },
            { name: 'timestamp', type: 'felt' },
          ],
        },
        primaryType: 'VerificationNonce',
        message: {
          nonce: freshNonce,
          timestamp: Date.now().toString(),
        },
      };

      // Get message hash from typed data
      const msgHash = typedData.getMessageHash(nonceTypedData, address!);
      setMessageHash(msgHash);

      // Sign with encryption private key using raw starknet.js
      // Remove 0x prefix if present
      const privateKeyHex = encryptionPrivateKey.startsWith('0x') 
        ? encryptionPrivateKey.slice(2) 
        : encryptionPrivateKey;
      
      // Use ec.starkCurve.sign with the message hash and private key
      const signature = ec.starkCurve.sign(msgHash, privateKeyHex);

      console.log("From nonce signing: ", signature);

      // Convert signature to string array format
      // setHolderSignature([
      //   '0x' + signature.r.toString(16),
      //   '0x' + signature.s.toString(16)
      // ]);
      setHolderSignature(signature)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign nonce');
    } finally {
      setIsSigning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPackageJson(content);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!holderSignature || !nonce) {
      setError('Please sign the nonce first');
      return;
    }

    try {
      const parsedPackage = JSON.parse(packageJson) as CompactVerificationPackage;
      
      // Basic validation
      const requiredFields = ['batchId', 'commitment', 'pathElements', 'pathIndices', 'issuerSignedMessage'];
      const missingFields = requiredFields.filter(field => !parsedPackage[field as keyof CompactVerificationPackage]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      if (!Array.isArray(parsedPackage.pathElements) || !Array.isArray(parsedPackage.pathIndices)) {
        throw new Error('pathElements and pathIndices must be arrays');
      }

      // if (parsedPackage.holderPublicKey.length <= 65) {
      //   parsedPackage.holderPublicKey = getFullPublicKeyFromSignature(holderSignature, messageHash);
      // }

      // Add holder signature and nonce to package
      const packageWithSignature = {
        ...parsedPackage,
        holderSignature: holderSignature, //.join(','),
        messageHash,
        nonce,
      };

      onSubmit(packageWithSignature);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format');
      } else {
        setError(err instanceof Error ? err.message : 'Invalid credential package');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Verify Credential</h2>
      
      {/* Wallet Connect Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="text-sm font-semibold mb-3">Step 1: Connect Wallet</h3>
        <WalletConnect />
      </div>

      {/* Derive Encryption Key Section */}
      {isConnected && !encryptionPrivateKey && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded">
          <h3 className="text-sm font-semibold mb-3">Step 2: Derive Encryption Key</h3>
          <p className="text-xs text-gray-600 mb-3">
            Sign a message with your wallet to derive your encryption private key. 
            This key will be used to sign the nonce (not your wallet key).
          </p>
          <button
            onClick={handleDeriveEncryptionKey}
            disabled={isDeriving}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isDeriving ? 'Deriving...' : 'Derive Encryption Key'}
          </button>
        </div>
      )}

      {/* Nonce Signing Section */}
      {encryptionPrivateKey && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="text-sm font-semibold mb-3">Step 3: Sign Verification Nonce</h3>
          <p className="text-xs text-gray-600 mb-3">
            Sign a nonce with your encryption private key to prove you own the credential.
          </p>
          <button
            onClick={handleSignNonce}
            disabled={isSigning || !!holderSignature}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSigning ? 'Signing...' : holderSignature ? '✓ Signed' : 'Sign Nonce'}
          </button>
          {holderSignature && (
            <p className="text-xs text-green-700 mt-2">✓ Nonce signed successfully with encryption key</p>
          )}
        </div>
      )}
      
      {/* Credential Upload Section */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3">Step 4: Upload Credential Package</h3>
          <label className="block text-sm font-medium mb-2">
            Upload Credential Package (JSON)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Or Paste Credential Package JSON
          </label>
          <textarea
            value={packageJson}
            onChange={(e) => setPackageJson(e.target.value)}
            placeholder='{"batchId": "1", "commitment": "0x...", ...}'
            rows={10}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !packageJson.trim() || !holderSignature}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify Credential'}
        </button>
      </form>
    </div>
  );
}
