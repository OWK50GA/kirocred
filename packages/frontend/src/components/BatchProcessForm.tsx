'use client';

import { useState } from 'react';
import { useAccount, useSignTypedData } from '@starknet-react/core';

interface Credential {
  holderPublicKey: string;
  credentialId: string;
  attributes: Record<string, any>;
  issuerSignedMessage: string;
  issuerMessageHash: string;
}

interface BatchProcessFormProps {
  credentials: Credential[] | Omit<Credential, 'issuerSignedMessage' | 'issuerMessageHash'>[];
  onBatchProcessed: (result: any) => void;
}

export default function BatchProcessForm({ credentials, onBatchProcessed }: BatchProcessFormProps) {
  const { address } = useAccount();
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signTypedDataAsync } = useSignTypedData({})
  const { account } = useAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (credentials.length === 0) {
        throw new Error('No credentials to process. Add at least one credential first.');
      }

      if (!address) {
        throw new Error('Please connect your wallet first.');
      }

      const batchId = crypto.randomUUID();

      // Create typed data for issuer signature
      const batchTypedData = {
        domain: {
          name: 'Kirocred',
          version: '1',
          chainId: 'SN_SEPOLIA',
        },
        types: {
          StarkNetDomain: [
            { name: 'name', type: 'felt' },
            { name: 'version', type: 'felt' },
            { name: 'chainId', type: 'felt' },
          ],
          BatchMetadata: [
            // { name: 'batchId', type: 'felt' },
            { name: 'description', type: 'felt' },
            { name: 'purpose', type: 'felt' },
            { name: 'issuedBy', type: 'felt' },
            { name: 'timestamp', type: 'felt' },
          ],
        },
        primaryType: 'BatchMetadata',
        message: {
          // batchId,
          description,
          purpose,
          issuedBy,
          timestamp: Date.now().toString(),
        },
      };

      const messageHash = account?.hashMessage(batchTypedData);

      const issuerSignedMessage = await signTypedDataAsync(batchTypedData);


      const requestBody = {
        batchId,
        credentials: credentials.map(cred =>  {
          return ({
            holderPublicKey: cred.holderPublicKey,
            credentialId: cred.credentialId,
            attributes: cred.attributes,
            issuerSignedMessage,
            issuerMessageHash: messageHash
          })
        }),
        issuerAddress: address,
        batchMetadata: {
          description,
          purpose,
          issuedBy,
        },
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/batches/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process batch');
      }

      onBatchProcessed(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process batch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📦</span>
          <div>
            <p className="font-medium text-white">Credentials in batch: {credentials.length}</p>
            {credentials.length === 0 ? (
              <p className="text-gray-400 text-sm mt-1">Add credentials first before processing a batch.</p>
            ) : (
              <p className="text-gray-400 text-sm mt-1">Ready to process {credentials.length} credential{credentials.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Issuer Address (Connected Wallet)
          </label>
          <input
            type="text"
            value={address || 'Not connected'}
            disabled
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 font-mono text-sm cursor-not-allowed"
          />
          {!address && (
            <p className="text-red-400 text-sm mt-1">Please connect your wallet to continue</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Batch Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="University Degrees 2024"
            required
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Purpose
          </label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Academic credentials"
            required
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-sm"
          />
        </div>

        {/* <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Issued By
          </label>
          <input
            type="text"
            value={issuedBy}
            onChange={(e) => setIssuedBy(e.target.value)}
            placeholder="Example University"
            required
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent text-sm"
          />
        </div> */}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <span className="text-red-400">✗</span>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || credentials.length === 0 || !address}
          className="w-full py-2.5 rounded-lg font-medium transition-all bg-[#00D9FF] text-black hover:bg-[#00BBFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && (
            <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          )}
          {isLoading ? 'Processing...' : 'Process Batch'}
        </button>
      </form>
    </div>
  );
}
