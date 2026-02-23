'use client';

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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Batch Processed Successfully</h2>
        <div className="text-xl font-semibold text-green-600">
          ✓ Batch ID: {result.batchId}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Batch Information</h3>
          <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
            <div>
              <span className="font-medium">Merkle Root:</span>
              <div className="font-mono text-xs break-all mt-1">{result.merkleRoot}</div>
            </div>
            <div>
              <span className="font-medium">Transaction Hash:</span>
              <div className="font-mono text-xs break-all mt-1">{result.transactionHash}</div>
            </div>
            <div>
              <span className="font-medium">Credentials Processed:</span> {result.credentials.length}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Credential Packages</h3>
          <div className="space-y-2">
            {result.credentials.map((cred, index) => (
              <div key={cred.credentialId} className="bg-blue-50 p-3 rounded text-sm">
                <div className="font-medium">Credential {index + 1}</div>
                <div className="font-mono text-xs break-all mt-1">
                  ID: {cred.credentialId}
                </div>
                <div className="font-mono text-xs break-all mt-1">
                  IPFS: {cred.ipfsCid}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onDownloadPackages}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Download Credential Packages
          </button>
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p className="font-medium text-yellow-800">Next Steps:</p>
          <p className="text-yellow-700 mt-1">
            Download the credential packages and use them in the verification flow to test the complete system.
          </p>
        </div>
      </div>
    </div>
  );
}
