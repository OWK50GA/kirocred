'use client';

import { useState } from 'react';
import Link from 'next/link';
import VerificationForm from '@/components/VerificationForm';
import VerificationResultComponent from '@/components/VerificationResult';
import { CompactVerificationPackage, VerificationResult } from '@/types/verification';
import DeriveEncryptionKey from '@/components/DeriveEncryptionKey';

export default function Home() {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerification = async (packageData: CompactVerificationPackage) => {
    setIsLoading(true);
    setVerificationResult(null);

    try {
      const { verifyCredentialPackage } = await import('@/lib/credentialVerifier');
      
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      const providerUrl = process.env.NEXT_PUBLIC_STARKNET_PROVIDER_URL;
      
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }
      
      // console.log("Package Data: ", packageData)
      const result = await verifyCredentialPackage(
        packageData,
        contractAddress,
        providerUrl
      );
      
      setVerificationResult(result);
    } catch (error) {
      const errorResult: VerificationResult = {
        valid: false,
        checks: {
          merkleProofValid: false,
          issuerSignatureValid: false,
          holderSignatureValid: false,
          nonceValid: false,
          notRevoked: false,
          attributesMatch: false,
        },
        batchMetadata: {
          description: 'Error occurred',
          purpose: 'Error',
          issuedBy: 'System',
          timestamp: Date.now() / 1000,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
      setVerificationResult(errorResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setVerificationResult(null);
  };

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Kirocred Verifier</h1>
          <p className="text-gray-600">Privacy-preserving credential verification</p>
          <div className="mt-4">
            {/* <DeriveEncryptionKey /> */}
            <Link href="/issuer" className="text-blue-600 hover:underline">
              Go to Issuer →
            </Link>
          </div>
        </div>

        {!verificationResult ? (
          <VerificationForm onSubmit={handleVerification} isLoading={isLoading} />
        ) : (
          <div className="space-y-6">
            <VerificationResultComponent result={verificationResult} />
            <div className="text-center">
              <button
                onClick={handleReset}
                className="bg-gray-600 text-white py-2 px-6 rounded hover:bg-gray-700"
              >
                Verify Another Credential
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
