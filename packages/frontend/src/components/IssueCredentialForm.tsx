'use client';

import { useState } from 'react';

interface IssuedCredential {
  credentialId: string;
  commitment: string;
  holderPublicKey: string;
  attributes: Record<string, any>;
  issuerSignedMessage: string;
}

interface IssueCredentialFormProps {
  onCredentialIssued: (credential: IssuedCredential) => void;
}

export default function IssueCredentialForm({ onCredentialIssued }: IssueCredentialFormProps) {
  const [holderPublicKey, setHolderPublicKey] = useState('');
  const [attributes, setAttributes] = useState('');
  const [issuerSignedMessage, setIssuerSignedMessage] = useState('');
  const [issuerAddress, setIssuerAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Parse attributes JSON
      const parsedAttributes = JSON.parse(attributes);
      
      // Generate credential ID
      const credentialId = crypto.randomUUID();

      const requestBody = {
        holderPublicKey,
        credentialId,
        attributes: parsedAttributes,
        issuerSignedMessage,
        issuerAddress,
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/credentials/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to issue credential');
      }

      setSuccess(`Credential issued successfully! ID: ${data.credentialId}`);
      
      // Pass the issued credential to parent
      onCredentialIssued({
        credentialId: data.credentialId,
        commitment: data.commitment,
        holderPublicKey,
        attributes: parsedAttributes,
        issuerSignedMessage,
      });

      // Reset form
      setHolderPublicKey('');
      setAttributes('');
      setIssuerSignedMessage('');
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format in attributes');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to issue credential');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Issue Credential</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Holder Public Key
          </label>
          <input
            type="text"
            value={holderPublicKey}
            onChange={(e) => setHolderPublicKey(e.target.value)}
            placeholder="0x..."
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

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
            Attributes (JSON)
          </label>
          <textarea
            value={attributes}
            onChange={(e) => setAttributes(e.target.value)}
            placeholder='{"name": "John Doe", "degree": "Bachelor of Science"}'
            rows={4}
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Issuer Signed Message
          </label>
          <input
            type="text"
            value={issuerSignedMessage}
            onChange={(e) => setIssuerSignedMessage(e.target.value)}
            placeholder="0x..."
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Issuing...' : 'Issue Credential'}
        </button>
      </form>
    </div>
  );
}
