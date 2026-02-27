'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { RoleCard } from '@/components/RoleCard'
import { useAccount, useSignTypedData } from '@starknet-react/core'
import { deriveEncryptionKeypair, createKeyDerivationTypedData } from '@/lib/encryptionKeys'
import { compressPublicKey } from '@/lib/utils'

function GetKirocredKeyButton() {
  const [showModal, setShowModal] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { address, isConnected } = useAccount()
  const { signTypedDataAsync } = useSignTypedData({})

  const handleGetKey = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const typedData = createKeyDerivationTypedData()
      const signature = await signTypedDataAsync(typedData as any)

      if (!signature || signature.length < 2) {
        throw new Error('Failed to sign message')
      }

      const { publicKey: fullPubKey } = deriveEncryptionKeypair(signature)
      const compressed = compressPublicKey(fullPubKey)
      setPublicKey(compressed)
      setShowModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to derive key')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey)
    }
  }

  return (
    <>
      <button
        onClick={handleGetKey}
        disabled={isLoading}
        className="px-4 py-2 bg-[#00D9FF] text-black rounded-lg hover:bg-[#00BBFF] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-sm"
      >
        {isLoading ? 'Generating...' : 'Get My Key'}
      </button>

      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}

      {showModal && publicKey && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Your Kirocred Public Key</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Share this key with issuers to receive credentials. This key is derived from your wallet signature.
            </p>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 mb-4">
              <p className="text-xs font-mono text-gray-300 break-all">
                {publicKey}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex-1 px-4 py-2 bg-[#00D9FF] text-black rounded-lg hover:bg-[#00BBFF] font-medium transition-colors"
              >
                Copy Key
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              💡 You can regenerate this key anytime by signing the same message with your wallet.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-black via-black to-black/80">
      <Header currentPage="home" />

      {/* Hero Section */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 text-balance">
              Privacy-Preserving
              <br />
              <span className="bg-linear-to-r from-[#00D9FF] via-[#A855F7] to-[#00D9FF] bg-clip-text text-transparent">
                Credential System
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto text-balance mb-4 leading-relaxed">
              Kirocred enables organizations to issue, individuals to prove, and
              verifiers to validate credentials while maintaining complete
              privacy and security.
            </p>

            <div className="flex items-center justify-center gap-6 text-sm font-medium text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00D9FF]" />
                Decentralized
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#A855F7]" />
                Privacy-First
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00D9FF]" />
                Blockchain-Verified
              </div>
            </div>
          </div>

          {/* Get Kirocred Key Section */}
          <div className="flex justify-center mb-12">
            <div className="max-w-md w-full p-6 rounded-lg border border-[#00D9FF]/30 bg-linear-to-r from-[#00D9FF]/10 to-[#A855F7]/10">
              <div className="text-center">
                <div className="text-3xl mb-3">🔑</div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Get Your Kirocred Key
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Need to receive credentials? Generate your unique Kirocred public key and share it with issuers.
                </p>
                <GetKirocredKeyButton />
              </div>
            </div>
          </div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <RoleCard
              href="/issuer"
              icon="🏛️"
              title="Issue"
              description="Issue credentials individually and create batches for your organization"
              color="blue"
            />

            <RoleCard
              href="/prove"
              icon="👤"
              title="Prove"
              description="Prepare credential proof for verification without revealing sensitive data"
              color="purple"
            />

            <RoleCard
              href="/verify"
              icon="✓"
              title="Verify"
              description="Check credential validity and verify authenticity instantly"
              color="blue"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: '01',
                title: 'Issuance',
                description:
                  'Organizations register and issue credentials through Kirocred. Credentials are cryptographically signed and stored securely.',
              },
              {
                number: '02',
                title: 'Proof Generation',
                description:
                  'Credential holders generate zero-knowledge proofs that verify attributes without exposing personal information.',
              },
              {
                number: '03',
                title: 'Verification',
                description:
                  'Verifiers validate proofs instantly using blockchain-based verification, ensuring credential authenticity.',
              },
            ].map((step) => (
              <div key={step.number} className="relative">
                <div className="p-6 rounded-lg border border-gray-800/50 bg-gray-900/30 hover:bg-gray-900/50 transition-colors h-68">
                  <div className="text-4xl font-bold text-[#00D9FF]/30 mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-800 mt-16">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Kirocred © 2024. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">
              Documentation
            </a>
            <a href="#" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
