'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { OrganizationRegistration } from '@/components/OrganizationRegistration'
import { FormCard } from '@/components/FormCard'
import { StatusIndicator } from '@/components/StatusIndicator'
import AddCredentialForm, { Credential } from '@/components/AddCredentialForm'
import BatchProcessForm from '@/components/BatchProcessForm'
import BatchResult from '@/components/BatchResult'
import { cn } from '@/lib/utils'
import { useAccount } from '@starknet-react/core'
import { StarknetClient } from '@/lib/starknet'

export default function IssuerPage() {
  const [credentials, setCredentials] = useState<Credential[] | Omit<Credential, 'issuerSignedMessage' | 'issuerMessageHash'>[]>([])
  const [batchResult, setBatchResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'add' | 'batch'>('add')
  const [isRegistered, setIsRegistered] = useState(false)
  const [registrationData, setRegistrationData] = useState<any>(null);

  const { address } = useAccount();

  useEffect(() => {
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const providerUrl = process.env.NEXT_PUBLIC_STARKNET_PROVIDER_URL;
    
    if (!contractAddress || !address) return;
    
    const client = new StarknetClient(contractAddress, providerUrl);

    const checkOrgRegistration = async () => {
      try {
        const orgId = await client.getOrgByAddress(address);
        // orgId will be 0 if not registered, > 0 if registered
        if (orgId && Number(orgId) > 0) {
          setIsRegistered(true);
          setRegistrationData({ orgId: orgId.toString() });
        } else {
          setIsRegistered(false);
        }
      } catch (error) {
        console.error('Failed to check org registration:', error);
        setIsRegistered(false);
      }
    }

    checkOrgRegistration();
  }, [address])

  const handleCredentialAdded = (credential: Credential | Omit<Credential, 'issuerSignedMessage' | 'issuerMessageHash'>) => {
    setCredentials(prev => [...prev, credential])
  }

  const handleBatchProcessed = (result: any) => {
    setBatchResult(result)
  }

  const handleOrganizationRegistered = (data: { orgId: string; transactionHash: string }) => {
    setIsRegistered(true)
    setRegistrationData(data)
  }

  const handleDownloadPackages = async () => {
    if (!batchResult) return

    try {
      // Fetch credential packages from IPFS
      const packages = await Promise.all(
        batchResult.credentials.map(async (cred: any) => {
          const gatewayUrl = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud'
          const response = await fetch(`${gatewayUrl}/ipfs/${cred.ipfsCid}`)
          const packageData = await response.json()
          return {
            credentialId: cred.credentialId,
            package: packageData,
          }
        })
      )

      // Download as JSON file
      const blob = new Blob([JSON.stringify(packages, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `credential-packages-${batchResult.batchId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download packages:', error)
      alert('Failed to download credential packages. Check console for details.')
    }
  }

  const handleReset = () => {
    setCredentials([])
    setBatchResult(null)
    setActiveTab('add')
  }

  if (batchResult) {
    return (
      <div className="min-h-screen bg-linear-to-b from-black via-black to-black/80">
        <Header currentPage="issuer" />
        
        <section className="px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-white mb-3">
                Batch Processing Complete
              </h1>
              <p className="text-lg text-gray-400">
                Your credentials have been successfully processed and stored
              </p>
            </div>

            <BatchResult result={batchResult} onDownloadPackages={handleDownloadPackages} />

            <div className="text-center mt-6 space-x-4">
              <button
                onClick={handleReset}
                className="bg-gray-700 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Start New Batch
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-black via-black to-black/80">
      <Header currentPage="issuer" />

      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">
              Issue Credentials
            </h1>
            <p className="text-lg text-gray-400">
              Register your organization and issue credentials individually or in batches
            </p>
          </div>

          {/* Organization Registration */}
          {!isRegistered ? (
            <div className="mb-12">
              <OrganizationRegistration onRegister={handleOrganizationRegistered} />
            </div>
          ) : (
            <div className="mb-8">
              <StatusIndicator
                status="verified"
                label="Organization Registered"
                message={`Ready to issue credentials • Org ID: ${registrationData?.orgId}`}
              />
            </div>
          )}

          {/* Credential Management */}
          {isRegistered && (
            <div className="space-y-6">
              <FormCard
                title="Credential Management"
                description="Add individual credentials or process batches"
                icon="📋"
              >
                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4">
                  {(['add', 'batch'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'px-4 py-2 font-medium rounded-t-lg transition-all border-b-2 -mb-4',
                        activeTab === tab
                          ? 'border-[#00D9FF] text-[#00D9FF]'
                          : 'border-transparent text-gray-400 hover:text-white'
                      )}
                    >
                      {tab === 'add' ? `Add Credentials (${credentials.length})` : 'Process Batch'}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="bg-gray-900/50 rounded-lg p-6">
                  {activeTab === 'add' ? (
                    <AddCredentialForm onCredentialAdded={handleCredentialAdded} />
                  ) : (
                    <BatchProcessForm
                      credentials={credentials}
                      onBatchProcessed={handleBatchProcessed}
                    />
                  )}
                </div>
              </FormCard>

              {/* Added Credentials Display */}
              {credentials.length > 0 && activeTab === 'add' && (
                <FormCard
                  title={`Added Credentials (${credentials.length})`}
                  description="Review credentials before batch processing"
                  icon="📄"
                >
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {credentials.map((cred, index) => (
                      <div key={cred.credentialId} className="p-3 bg-gray-800/50 rounded-lg text-sm">
                        <div className="font-medium text-white">Credential {index + 1}</div>
                        <div className="font-mono text-xs text-gray-400 truncate">ID: {cred.credentialId}</div>
                        <div className="font-mono text-xs text-gray-400 truncate">Holder: {cred.holderPublicKey.slice(0, 20)}...</div>
                        <div className="text-xs text-gray-400">Attributes: {JSON.stringify(cred.attributes)}</div>
                      </div>
                    ))}
                  </div>
                </FormCard>
              )}

              {/* Info Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
                  <div className="text-3xl mb-3">🔐</div>
                  <h3 className="font-bold text-white mb-2">Secure Signing</h3>
                  <p className="text-sm text-gray-400">
                    All credentials are cryptographically signed with your organization's key
                  </p>
                </div>

                <div className="p-6 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
                  <div className="text-3xl mb-3">⚡</div>
                  <h3 className="font-bold text-white mb-2">Batch Processing</h3>
                  <p className="text-sm text-gray-400">
                    Process multiple credentials at once for efficient bulk issuance
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
