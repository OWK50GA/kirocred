'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { FormCard } from '@/components/FormCard'
import { StatusIndicator } from '@/components/StatusIndicator'
import VerifyForm from '@/components/VerifyForm'
import VerificationResultComponent from '@/components/VerificationResult'
import { CompactVerificationPackage, VerificationResult } from '@/types/verification'

export default function VerifyPage() {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleVerification = async (packageData: CompactVerificationPackage) => {
    setIsLoading(true)
    setVerificationResult(null)

    try {
      const { verifyCredentialPackage } = await import('@/lib/credentialVerifier')
      
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
      const providerUrl = process.env.NEXT_PUBLIC_STARKNET_PROVIDER_URL
      
      if (!contractAddress) {
        throw new Error('Contract address not configured')
      }
      
      const result = await verifyCredentialPackage(
        packageData,
        contractAddress,
        providerUrl
      )
      
      setVerificationResult(result)
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
      }
      setVerificationResult(errorResult)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setVerificationResult(null)
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-black via-black to-black/80">
      <Header currentPage="verify" />

      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">
              Verify Credential
            </h1>
            <p className="text-lg text-gray-400">
              Check credential validity and verify authenticity instantly
            </p>
          </div>

          {!verificationResult ? (
            <>
              <FormCard
                title="Credential Verification"
                description="Upload or paste a credential package to verify its authenticity"
                icon="✓"
              >
                <VerifyForm onSubmit={handleVerification} isLoading={isLoading} />
              </FormCard>

              {/* Info Cards */}
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="p-6 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
                  <div className="text-3xl mb-3">🔍</div>
                  <h3 className="font-bold text-white mb-2">Comprehensive Checks</h3>
                  <p className="text-sm text-gray-400">
                    Verifies merkle proofs, signatures, timestamps, and revocation status
                  </p>
                </div>

                <div className="p-6 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
                  <div className="text-3xl mb-3">⛓️</div>
                  <h3 className="font-bold text-white mb-2">Blockchain Verified</h3>
                  <p className="text-sm text-gray-400">
                    All verifications are backed by immutable blockchain records
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <FormCard
                title="Verification Results"
                description="Detailed verification results for the submitted credential"
                icon={verificationResult.valid ? "✅" : "❌"}
              >
                <VerificationResultComponent result={verificationResult} />
              </FormCard>
              
              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 rounded-lg border border-[#00D9FF]/50 text-[#00D9FF] font-medium hover:bg-[#00D9FF]/10 transition-colors"
                >
                  Verify Another Credential
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
