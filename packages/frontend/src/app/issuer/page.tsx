'use client';

import { useState } from 'react';
import AddCredentialForm, { Credential } from '@/components/AddCredentialForm';
import BatchProcessForm from '@/components/BatchProcessForm';
import BatchResult from '@/components/BatchResult';
import Link from 'next/link';

export default function IssuerPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'add' | 'batch'>('add');

  const handleCredentialAdded = (credential: Credential) => {
    setCredentials(prev => [...prev, credential]);
  };

  const handleBatchProcessed = (result: any) => {
    setBatchResult(result);
  };

  const handleDownloadPackages = async () => {
    if (!batchResult) return;

    try {
      // Fetch credential packages from IPFS
      const packages = await Promise.all(
        batchResult.credentials.map(async (cred: any) => {
          const gatewayUrl = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud';
          const response = await fetch(`${gatewayUrl}/ipfs/${cred.ipfsCid}`);
          const packageData = await response.json();
          return {
            credentialId: cred.credentialId,
            package: packageData,
          };
        })
      );

      // Download as JSON file
      const blob = new Blob([JSON.stringify(packages, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credential-packages-${batchResult.batchId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download packages:', error);
      alert('Failed to download credential packages. Check console for details.');
    }
  };

  const handleReset = () => {
    setCredentials([]);
    setBatchResult(null);
    setActiveTab('add');
  };

  if (batchResult) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Kirocred Issuer</h1>
            <p className="text-gray-600">Issue and batch process credentials</p>
          </div>

          <BatchResult result={batchResult} onDownloadPackages={handleDownloadPackages} />

          <div className="text-center mt-6 space-x-4">
            <button
              onClick={handleReset}
              className="bg-gray-600 text-white py-2 px-6 rounded hover:bg-gray-700"
            >
              Start New Batch
            </button>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700"
            >
              Go to Verifier
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Kirocred Issuer</h1>
          <p className="text-gray-600">Issue and batch process credentials</p>
          <div className="mt-4">
            <Link href="/" className="text-blue-600 hover:underline">
              Go to Verifier →
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow">
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-2 px-4 rounded ${
                activeTab === 'add'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Add Credentials ({credentials.length})
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`flex-1 py-2 px-4 rounded ${
                activeTab === 'batch'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Process Batch
            </button>
          </div>
        </div>

        {activeTab === 'add' ? (
          <AddCredentialForm onCredentialAdded={handleCredentialAdded} />
        ) : (
          <BatchProcessForm
            credentials={credentials}
            onBatchProcessed={handleBatchProcessed}
          />
        )}

        {credentials.length > 0 && activeTab === 'add' && (
          <div className="max-w-2xl mx-auto mt-6 p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">Added Credentials ({credentials.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {credentials.map((cred, index) => (
                <div key={cred.credentialId} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">Credential {index + 1}</div>
                  <div className="font-mono text-xs truncate">ID: {cred.credentialId}</div>
                  <div className="font-mono text-xs truncate">Holder: {cred.holderPublicKey.slice(0, 20)}...</div>
                  <div className="text-xs">Attributes: {JSON.stringify(cred.attributes)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
