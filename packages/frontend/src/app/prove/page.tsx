'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { FormCard } from '@/components/FormCard'
import ProveForm from '@/components/ProveForm'

export default function ProvePage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-black via-black to-black/80">
      <Header currentPage="prove" />

      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">
              Prove Credential
            </h1>
            <p className="text-lg text-gray-400">
              Prepare your credential proof for verification without revealing sensitive data
            </p>
          </div>

          <FormCard
            title="Credential Proof Generation"
            description="Connect your wallet and generate a proof for your credentials"
            icon="🔐"
          >
            <ProveForm />
          </FormCard>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="p-6 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="font-bold text-white mb-2">Privacy First</h3>
              <p className="text-sm text-gray-400">
                Generate zero-knowledge proofs that verify your credentials without exposing personal information
              </p>
            </div>

            <div className="p-6 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-bold text-white mb-2">Instant Verification</h3>
              <p className="text-sm text-gray-400">
                Generated proofs can be verified instantly by any verifier using blockchain technology
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
