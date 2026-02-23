'use client';

import { VerificationResult } from '@/types/verification';

interface VerificationResultProps {
  result: VerificationResult;
}

export default function VerificationResultComponent({ result }: VerificationResultProps) {
  const CheckItem = ({ label, valid }: { label: string; valid: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
      <span className="text-sm">{label}</span>
      <span className={`text-sm font-medium ${valid ? 'text-green-600' : 'text-red-600'}`}>
        {valid ? '✓ Valid' : '✗ Invalid'}
      </span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Verification Result</h2>
        <div className={`text-xl font-semibold ${result.valid ? 'text-green-600' : 'text-red-600'}`}>
          {result.valid ? '✓ Valid Credential' : '✗ Invalid Credential'}
        </div>
      </div>

      <div className="space-y-6">
        {/* Verification Checks */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Verification Checks</h3>
          <div className="space-y-2">
            <CheckItem label="Merkle Proof" valid={result.checks.merkleProofValid} />
            <CheckItem label="Issuer Signature" valid={result.checks.issuerSignatureValid} />
            <CheckItem label="Holder Signature" valid={result.checks.holderSignatureValid} />
            <CheckItem label="Nonce Validity" valid={result.checks.nonceValid} />
            <CheckItem label="Not Revoked" valid={result.checks.notRevoked} />
            <CheckItem label="Attributes Match" valid={result.checks.attributesMatch} />
          </div>
        </div>

        {/* Batch Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Batch Information</h3>
          <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
            <div>
              <span className="font-medium">Description:</span> {result.batchMetadata.description}
            </div>
            <div>
              <span className="font-medium">Purpose:</span> {result.batchMetadata.purpose}
            </div>
            <div>
              <span className="font-medium">Issued By:</span> {result.batchMetadata.issuedBy}
            </div>
            <div>
              <span className="font-medium">Timestamp:</span> {new Date(result.batchMetadata.timestamp * 1000).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Disclosed Attributes */}
        {result.disclosedAttributes && Object.keys(result.disclosedAttributes).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Disclosed Attributes</h3>
            <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
              {Object.entries(result.disclosedAttributes).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {result.errors && result.errors.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-red-600">Errors</h3>
            <div className="bg-red-50 p-4 rounded border border-red-200">
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}