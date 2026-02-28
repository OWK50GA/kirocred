'use client';

import { useState, useEffect } from 'react';
import { CompactVerificationPackage } from '@/types/verification';
import QRScanner from './QRScanner';

interface VerifyFormProps {
  onSubmit: (packageData: CompactVerificationPackage) => void;
  isLoading: boolean;
}

interface BatchInfo {
  batchId: number;
  orgId: number;
  orgName: string | null;
  credentialCount: number;
}

export default function VerifyForm({ onSubmit, isLoading }: VerifyFormProps) {
  const [packageJson, setPackageJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchInfo | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'scan'>('manual');
  const [parsedPackage, setParsedPackage] = useState<any | null>(null);

  // Fetch all batches on mount
  useEffect(() => {
    fetchAllBatches();
  }, []);

  const fetchAllBatches = async () => {
    setIsLoadingBatches(true);
    setError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/batches/all`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }

      const data = await response.json();
      
      if (data.success) {
        setBatches(data.batches);
      } else {
        throw new Error(data.message || 'Failed to fetch batches');
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch batches');
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const handleBatchSelect = (batch: BatchInfo) => {
    setSelectedBatch(batch);
    setShowManualInput(true);
  };

  const handleQRResult = async (data: object | string) => {
    setError(null);
    try {
      let pkg: any;

      if (typeof data === 'string') {
        const objData = JSON.parse(data);
        if (objData && typeof objData === 'object' && 'cid' in objData) {
          const gatewayUrl = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud';
          const cid = objData.cid;

          const resp = await fetch(`${gatewayUrl}/ipfs/${cid}`);
          if (!resp.ok) {
            throw new Error('Failed to fetch package from IPFS');
          }
          const fullPkg = await resp.json();
          setParsedPackage(fullPkg);
          
          // Reconstruct exactly as proofData: full package + holder fields (excluding cid)
          const { cid: _, ...holderFields } = objData;
          pkg = { ...fullPkg, ...holderFields };
        } else {
          pkg = JSON.parse(data);
        }
      } else {
        pkg = data;
      }

      const jsonString = JSON.stringify(pkg);
      setPackageJson(jsonString);
      // Stay on scan tab to show success, user can switch to manual to see the data
    } catch (err) {
      console.error('handleQRResult error', err);
      setError('Failed to process QR code data');
    }
  };

  const handleQRError = (err: any) => {
    console.error('QR Scanner error:', err);
    setError('Camera access denied or unavailable. Please use manual entry.');
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

    try {
      const parsedPackage = JSON.parse(packageJson) as CompactVerificationPackage;


      
      // Basic validation
      const requiredFields = [
        'batchId',
        'commitment',
        'pathElements',
        'pathIndices',
        'issuerSignedMessage',
        'holderSignature',
        'holderEncryptionPublicKey',
        'nonce'
      ];
      
      const missingFields = requiredFields.filter(
        field => !parsedPackage[field as keyof CompactVerificationPackage]
      );
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      if (!Array.isArray(parsedPackage.pathElements) || !Array.isArray(parsedPackage.pathIndices)) {
        throw new Error('pathElements and pathIndices must be arrays');
      }

      onSubmit(parsedPackage);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format');
      } else {
        setError(err instanceof Error ? err.message : 'Invalid credential package');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 rounded-lg shadow-xl border border-gray-800">
      <h2 className="text-2xl font-bold mb-6 text-white">Verify Credential Proof</h2>
      
      {!showManualInput ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-white">Select Batch to Verify</h3>
            <p className="text-xs text-gray-400 mb-3">
              Choose from all credential batches issued on Kirocred
            </p>
            
            {isLoadingBatches ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-sm text-gray-400 mt-2">Loading batches...</p>
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8 bg-gray-800/50 rounded-lg">
                <p className="text-gray-400">No batches have been issued yet.</p>
                <p className="text-xs text-gray-500 mt-2">Batches will appear here once issuers create them.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {batches.map((batch) => (
                  <button
                    key={batch.batchId}
                    onClick={() => handleBatchSelect(batch)}
                    className="w-full p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-lg text-left transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-white text-sm">
                        {batch.orgName || `Organization #${batch.orgId}`}
                      </div>
                      <div className="text-xs text-blue-400 font-medium">
                        Batch #{batch.batchId}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Org ID: {batch.orgId}
                      </div>
                      <div className="text-xs text-gray-400">
                        {batch.credentialCount} credential{batch.credentialCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowManualInput(true)}
            className="w-full py-3 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
          >
            Or Enter Proof Manually
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedBatch && (
            <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-green-400 mb-1">Selected Batch:</p>
                  <p className="text-sm text-white font-medium">
                    {selectedBatch.orgName || `Organization #${selectedBatch.orgId}`}
                  </p>
                  <div className="flex gap-4 mt-2">
                    <p className="text-xs text-gray-400">
                      Batch ID: <span className="text-blue-400 font-mono">{selectedBatch.batchId}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Org ID: <span className="font-mono">{selectedBatch.orgId}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBatch(null);
                    setShowManualInput(false);
                    setPackageJson('');
                  }}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-400 mb-4">
              Enter the proof package from the credential holder
            </p>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'manual'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scan')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'scan'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Scan QR Code
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'manual' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Upload Proof Package (JSON)
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Or Paste Proof Package JSON
                  </label>
                  <textarea
                    value={packageJson}
                    onChange={(e) => setPackageJson(e.target.value)}
                    placeholder='{"batchId": "1", "commitment": "0x...", "holderSignature": {...}, ...}'
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-gray-800 text-gray-300 placeholder-gray-500"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRScanner
                    onResult={handleQRResult}
                    onError={handleQRError}
                    qrbox={250}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Position the QR code within the frame to scan
                </p>
                {packageJson && (
                  <div className="mt-4 p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
                    <p className="text-xs text-green-400 text-center">
                      ✓ QR code scanned successfully
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowManualInput(false);
                setSelectedBatch(null);
                setPackageJson('');
              }}
              className="flex-1 bg-gray-700 text-white py-3 px-4 rounded-lg hover:bg-gray-600 font-medium transition-colors"
            >
              Back to List
            </button>
            <button
              type="submit"
              disabled={isLoading || !packageJson.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify Credential'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
