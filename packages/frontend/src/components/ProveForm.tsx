'use client';

import { useEffect, useState } from 'react';
import { useAccount, useSignTypedData } from '@starknet-react/core';
import { deriveEncryptionKeypair, createKeyDerivationTypedData } from '@/lib/encryptionKeys';
import { ec, hash, num, stark, typedData } from 'starknet';
import { compressPublicKey, hexToUint8Array, normalizeAddress, starkKeyToFullPublicKey } from '@/lib/utils';
import { feltToHex } from '@/lib/verification';
import QRGenerator from './QRGenerator';
import { CopyButton } from './CopyButton';

interface CredentialInfo {
  credentialId: string;
  ipfsCid: string;
  batchId: number;
  orgId: number;
  orgName: string | null;
}

export default function ProveForm() {
  const [packageJson, setPackageJson] = useState('');
  // const [qrPackageJson, setQrPackageJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [encryptionPrivateKey, setEncryptionPrivateKey] = useState<string | null>(null);
  const [encryptionPublicKey, setEncryptionPublicKey] = useState<string | null>(null);
  const [holderSignature, setHolderSignature] = useState<string>('');
  const [messageHash, setMessageHash] = useState("");
  const [nonce, setNonce] = useState<string>('');
  const [isDeriving, setIsDeriving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [proofPackage, setProofPackage] = useState<string | null>(null);
  const [qrProofPackage, setQrProofPackage] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialInfo[]>([]);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<CredentialInfo | null>(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');

  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData({});

  // Fetch credentials when encryption public key is derived
  useEffect(() => {
    if (encryptionPublicKey && address) {
      fetchCredentials(encryptionPublicKey);
    }
  }, [encryptionPublicKey, address]);

  const fetchCredentials = async (pubKey: string) => {

    setIsLoadingCredentials(true);
    setError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/credentials/holder/${compressPublicKey(pubKey)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch credentials');
      }

      const data = await response.json();
      
      if (data.success) {
        setCredentials(data.credentials);
      } else {
        throw new Error(data.message || 'Failed to fetch credentials');
      }
    } catch (err) {
      console.error('Error fetching credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch credentials');
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const fetchCredentialPackage = async (credential: CredentialInfo) => {
    setIsLoadingPackage(true);
    setError(null);

    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud';
      const response = await fetch(`${gatewayUrl}/ipfs/${credential.ipfsCid}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch credential package from IPFS');
      }

      const packageData = await response.json();
      setPackageJson(JSON.stringify(packageData, null, 2));
      setSelectedCredential(credential);
    } catch (err) {
      console.error('Error fetching credential package:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch credential package');
    } finally {
      setIsLoadingPackage(false);
    }
  };

  // Step 1: Derive encryption private key from wallet signature
  const handleDeriveEncryptionKey = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsDeriving(true);
    setError(null);

    try {
      const keyDerivationTypedData = createKeyDerivationTypedData();
      const walletSignature = await signTypedDataAsync(keyDerivationTypedData as any);
      // console.log(walletSignature);

      if (!walletSignature || walletSignature.length < 2) {
        throw new Error('Failed to sign key derivation message');
      }

      const { privateKey, publicKey } = deriveEncryptionKeypair(walletSignature);
      setEncryptionPrivateKey(privateKey);
      setEncryptionPublicKey(publicKey);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to derive encryption key');
    } finally {
      setIsDeriving(false);
    }
  };

  // Step 2: Sign nonce with encryption private key
  const handleSignNonce = async () => {
    if (!encryptionPrivateKey) {
      setError('Please derive encryption key first');
      return;
    }

    setIsSigning(true);
    setError(null);

    try {
      const randomNum = Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER).toString();
      const now = Date.now().toString();
      const freshNonce = `${randomNum}${now}`;
      setNonce(freshNonce);

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

      // const msgHash = typedData.getMessageHash(nonceTypedData, address!);
      const msgHash = hash.computeHashOnElements([freshNonce, now]);
      setMessageHash(msgHash);
      
      const signature = ec.starkCurve.sign(msgHash, encryptionPrivateKey);
      // console.log(ec.starkCurve.getStarkKey(privateKeyHex) === encryptionPublicKey);
      const compactHexSignature = signature.toCompactHex();
      
      setHolderSignature(compactHexSignature);
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

  const handleGenerateProof = () => {
    setError(null);

    if (!holderSignature || !nonce || !encryptionPublicKey) {
      setError('Please complete all steps first');
      return;
    }

    try {
      const parsedPackage = JSON.parse(packageJson);

      if (parsedPackage.holderPublicKey !== compressPublicKey(encryptionPublicKey)) {
        throw new Error("Public keys do not match")
      }

      const qrProofData = {
        cid: selectedCredential?.ipfsCid,
        holderSignature,
        holderEncryptionPublicKey: encryptionPublicKey,
        holderPublicKey: encryptionPublicKey,
        messageHash,
        nonce
      }
      
      const proofData = {
        ...parsedPackage,
        holderSignature,
        holderEncryptionPublicKey: encryptionPublicKey,
        holderPublicKey: encryptionPublicKey,
        messageHash,
        nonce,
      };

      setProofPackage(JSON.stringify(proofData, (_key: any, value: unknown) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      }, 2));

      setQrProofPackage(JSON.stringify(qrProofData, (_key: any, value: unknown) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      }, 2))
      console.log(qrProofData);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate proof');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 rounded-lg shadow-xl border border-gray-800">
      <h2 className="text-2xl font-bold mb-6 text-white">Prepare Credential Proof</h2>
      
      {/* Derive Encryption Key Section */}
      {isConnected && !encryptionPrivateKey && (
        <div className="mb-6 p-4 bg-purple-900/30 border border-purple-700/50 rounded-lg">
          <h3 className="text-sm font-semibold mb-3 text-white">Step 1: Derive Encryption Key</h3>
          <p className="text-xs text-gray-400 mb-3">
            Sign a message with your wallet to derive your encryption private key.
          </p>
          <button
            onClick={handleDeriveEncryptionKey}
            disabled={isDeriving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          >
            {isDeriving ? 'Deriving...' : 'Derive Encryption Key'}
          </button>
        </div>
      )}

      {/* Credentials List Section */}
      {encryptionPublicKey && !holderSignature && (
        <div className="mb-6 space-y-4">
          <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-white">Step 2: Select Your Credential</h3>
            <p className="text-xs text-gray-400 mb-3">
              Choose the credential you want to prove from your list.
            </p>
            
            {isLoadingCredentials ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-sm text-gray-400 mt-2">Loading your credentials...</p>
              </div>
            ) : credentials.length === 0 ? (
              <div className="text-center py-8 bg-gray-800/50 rounded-lg">
                <p className="text-gray-400">No credentials found for this encryption key.</p>
                <p className="text-xs text-gray-500 mt-2">Make sure you have received credentials from an issuer.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {credentials.map((cred) => (
                  <button
                    key={cred.credentialId}
                    onClick={() => fetchCredentialPackage(cred)}
                    disabled={isLoadingPackage}
                    className="w-full p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-lg text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-white text-sm">
                        {cred.orgName || `Org #${cred.orgId}`}
                      </div>
                      <div className="text-xs text-gray-500">Batch #{cred.batchId}</div>
                    </div>
                    <div className="font-mono text-xs text-gray-400 truncate">
                      ID: {cred.credentialId}
                    </div>
                    <div className="font-mono text-xs text-gray-500 truncate mt-1">
                      IPFS: {cred.ipfsCid}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCredential && packageJson && (
            <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
              <h3 className="text-sm font-semibold mb-3 text-white">Step 3: Sign Verification Nonce</h3>
              <p className="text-xs text-gray-400 mb-3">
                Sign a nonce with your encryption private key to prove ownership.
              </p>
              <button
                onClick={handleSignNonce}
                disabled={isSigning}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
              >
                {isSigning ? 'Signing...' : 'Sign Nonce'}
              </button>
            </div>
          )}
        </div>
      )}

      {holderSignature && !proofPackage && (
        <div className="mb-6 space-y-4">
          <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
            <p className="text-xs text-green-400">✓ Nonce signed successfully</p>
          </div>

          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-white">Step 4: Review Credential Package</h3>
            <textarea
              value={packageJson}
              onChange={(e) => setPackageJson(e.target.value)}
              placeholder='{"batchId": "1", "commitment": "0x...", ...}'
              rows={10}
              className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-gray-900 text-gray-300"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerateProof}
            disabled={!packageJson.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Generate Proof Package
          </button>
        </div>
      )}

      {/* Proof Package Output */}
      {proofPackage && qrProofPackage && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-white">Proof Package Ready</h3>
            <p className="text-xs text-gray-400 mb-3">
              Share this proof package with the verifier via QR code or manual entry
            </p>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-700">
              <button
                onClick={() => setActiveTab('qr')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'qr'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                QR Code
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'manual'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Manual Entry
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'qr' ? (
              <div className="flex flex-col items-center py-4">
                <QRGenerator payload={qrProofPackage} size={300} />
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Scan this QR code with the verifier's device
                </p>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  value={proofPackage}
                  readOnly
                  rows={15}
                  className="w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 font-mono text-sm text-gray-300"
                />
                <CopyButton copyText={proofPackage} className="absolute top-2 right-2 shrink-0"/>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {/* <button
              onClick={handleCopyProof}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              Copy to Clipboard
            </button> */}
            <button
              onClick={() => {
                setProofPackage(null);
                setHolderSignature('');
                setSelectedCredential(null);
                setPackageJson('');
              }}
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 font-medium transition-colors"
            >
              Generate New Proof
            </button>
          </div>
        </div>
      )}

      {error && !holderSignature && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
