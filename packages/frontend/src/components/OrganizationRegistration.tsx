'use client'

import { useState } from 'react'
import { useAccount, useSignTypedData } from '@starknet-react/core'
import { FormCard } from './FormCard'
import { StatusIndicator } from './StatusIndicator'

interface OrganizationRegistrationProps {
  onRegister: (data: { orgId: string; transactionHash: string }) => void
}

export function OrganizationRegistration({ onRegister }: OrganizationRegistrationProps) {
  const { address, isConnected } = useAccount()
  const { signTypedDataAsync } = useSignTypedData({})
  const [isRegistering, setIsRegistering] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')

  const handleRegister = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    if (!orgName.trim()) {
      setError('Organization name is required')
      return
    }

    setIsRegistering(true)
    setError('')

    try {
      // Create a message to sign for organization registration
      const messageToSign = {
        domain: {
          name: 'Kirocred',
          version: '1',
          chainId: 'SN_SEPOLIA',
        },
        types: {
          StarkNetDomain: [
            { name: 'name', type: 'felt' },
            { name: 'version', type: 'felt' },
            { name: 'chainId', type: 'felt' },
          ],
          OrganizationRegistration: [
            { name: 'orgAddress', type: 'felt' },
            { name: 'orgName', type: 'felt' },
            { name: 'timestamp', type: 'felt' },
          ],
        },
        primaryType: 'OrganizationRegistration',
        message: {
          orgAddress: address,
          orgName: orgName.trim(),
          timestamp: Math.floor(Date.now() / 1000).toString(),
        },
      }

      // Sign the message with wallet
      const signature = await signTypedDataAsync(messageToSign as any)

      if (!signature || signature.length < 2) {
        throw new Error('Failed to sign registration message')
      }

      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      if (!baseUrl) {
        throw new Error("api base url not found");
      }
      // Send registration request to backend
      const response = await fetch(`${baseUrl}/api/organizations/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgAddress: address,
          orgName: orgName.trim(),
          signature: {
            r: signature[0],
            s: signature[1],
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed')
      }

      onRegister({
        orgId: result.orgId,
        transactionHash: result.transactionHash,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <FormCard
      title="Organization Registration"
      description="Register your organization to issue credentials"
      icon="🏛️"
    >
      <div className="space-y-4">
        {!isConnected && (
          <StatusIndicator
            status="warning"
            label="Wallet Required"
            message="Please connect your wallet to register an organization"
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Organization Name
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Enter organization name"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D9FF] focus:border-transparent"
            disabled={isRegistering}
          />
          <p className="text-xs text-gray-400 mt-1">
            This will be used for identification purposes
          </p>
        </div>

        {isConnected && address && (
          <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Organization Address:</p>
            <p className="font-mono text-sm text-[#00D9FF] break-all">{address}</p>
          </div>
        )}

        {error && (
          <StatusIndicator
            status="error"
            label="Registration Error"
            message={error}
          />
        )}

        <button
          onClick={handleRegister}
          disabled={isRegistering || !isConnected}
          className="w-full py-2.5 rounded-lg font-medium transition-all bg-[#00D9FF] text-black hover:bg-[#00BBFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRegistering && (
            <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          )}
          {isRegistering ? 'Registering...' : 'Sign & Register Organization'}
        </button>

        <div className="p-4 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-lg space-y-2">
          <h4 className="font-medium text-white text-sm">
            Security Features
          </h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Only you can register your own address</li>
            <li>• Signature verification prevents spam</li>
            <li>• No public key storage required</li>
            <li>• One organization per address</li>
          </ul>
        </div>
      </div>
    </FormCard>
  )
}