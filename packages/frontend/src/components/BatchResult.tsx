'use client';

import { FormCard } from './FormCard';
import { StatusIndicator } from './StatusIndicator';

interface BatchResultProps {
  result: {
    success: boolean;
    batchId: string;
    merkleRoot: string;
    credentials: Array<{
      credentialId: string;
      ipfsCid: string;
    }>;
    transactionHash: string;
  };
  onDownloadPackages: () => void;
}

export default function BatchResult({ result, onDownloadPackages }: BatchResultProps) {
  return (
    <div className="space-y-6">
      <StatusIndicator
        status="verified"
        label="Batch Processed Successfully"
        message={`Batch ID: ${result.batchId} • ${result.credentials.length} credentials processed`}
      />

      <FormCard
        title="Batch Information"
        description="Details about the processed batch"
        icon="📊"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-300">Merkle Root:</span>
              <div className="font-mono text-xs text-[#00D9FF] break-all mt-1 p-2 bg-gray-900/50 rounded">
                {result.merkleRoot}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-300">Transaction Hash:</span>
              <div className="font-mono text-xs text-[#00D9FF] break-all mt-1 p-2 bg-gray-900/50 rounded">
                {result.transactionHash}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-300">Credentials Processed:</span>
              <span className="ml-2 text-white font-semibold">{result.credentials.length}</span>
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard
        title="Credential Packages"
        description="IPFS storage details for each credential"
        icon="📦"
      >
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {result.credentials.map((cred, index) => (
            <div key={cred.credentialId} className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="font-medium text-white text-sm">Credential {index + 1}</div>
              <div className="font-mono text-xs text-gray-400 break-all mt-1">
                ID: {cred.credentialId}
              </div>
              <div className="font-mono text-xs text-[#00D9FF] break-all mt-1">
                IPFS: {cred.ipfsCid}
              </div>
            </div>
          ))}
        </div>
      </FormCard>

      <div className="flex gap-4">
        <button
          onClick={onDownloadPackages}
          className="flex-1 py-2.5 rounded-lg font-medium transition-all bg-[#00D9FF] text-black hover:bg-[#00BBFF] flex items-center justify-center gap-2"
        >
          <span>📥</span>
          Download Credential Packages
        </button>
      </div>

      <div className="p-4 bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="font-medium text-white text-sm">Next Steps:</p>
            <p className="text-gray-400 text-sm mt-1">
              Download the credential packages and use them in the verification flow to test the complete system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
