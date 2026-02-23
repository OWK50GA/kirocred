'use client';

import { useState } from 'react';

interface Credential {
  holderPublicKey: string;
  credentialId: string;
  attributes: Record<string, any>;
  issuerSignedMessage: {
    r: string;
    s: string;
    recovery: string;
  };
}

interface BatchProcessFormProps {
  credentials: Credential[];
  onBatchProcessed: (result: any) => void;
}

export default function BatchProcessForm({ credentials, onBatchProcessed }: BatchProcessFormProps) {
  const [issuerAddress, setIssuerAddress] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (credentials.length === 0) {
        throw new Error('No credentials to process. Add at least one credential first.');
      }

      const batchId = crypto.randomUUID();

      const requestBody = {
        batchId,
        credentials: credentials.map(cred => ({
          holderPublicKey: cred.holderPublicKey,
          credentialId: cred.credentialId,
          attributes: cred.attributes,
          issuerSignedMessage: cred.issuerSignedMessage,
        })),
        issuerAddress,
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Process Batch</h2>
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <p className="font-medium">Credentials in batch: {credentials.length}</p>
        {credentials.length === 0 && (
          <p className="text-blue-700 mt-1">Issue credentials first before processing a batch.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Issuer Address
          </label>
          <input
            type="text"
            value={issuerAddress}
            onChange={(e) => setIssuerAddress(e.target.value)}
            placeholder="0x..."
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Batch Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="University Degrees 2024"
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Purpose
          </label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Academic credentials"
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Issued By
          </label>
          <input
            type="text"
            value={issuedBy}
            onChange={(e) => setIssuedBy(e.target.value)}
            placeholder="Example University"
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || credentials.length === 0}
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Process Batch'}
        </button>
      </form>
    </div>
  );
}
