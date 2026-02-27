'use client'

import { useState, useEffect, useRef } from 'react'
import { useConnect, useAccount, useDisconnect } from '@starknet-react/core'
import { Loader2, PowerOff, Wallet } from 'lucide-react'

export default function WalletConnect() {
  const { connect, connectors } = useConnect()
  const { address, isConnected, status } = useAccount()
  const { disconnect } = useDisconnect()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  // const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false)

  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null)

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isDropdownOpen])

  // const handleConnect = (connectorId?: string) => {
  //   if (connectorId) {
  //     const selectedConnector = connectors.find(connector => connector.id === connectorId)
  //     if (selectedConnector) {
  //       connect({ connector: selectedConnector })
  //       setIsWalletSelectorOpen(false)
  //       return
  //     }
  //   }
    
  //   // If no specific connector or connector not found, show wallet selector
  //   setIsWalletSelectorOpen(true)
  // }

  // const getWalletIcon = (connectorId: string) => {
  //   switch (connectorId) {
  //     case 'argentX':
  //       return (
  //         <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
  //           A
  //         </div>
  //       )
  //     case 'braavos':
  //       return (
  //         <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
  //           B
  //         </div>
  //       )
  //     default:
  //       return (
  //         <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
  //           W
  //         </div>
  //       )
  //   }
  // }

  // const getWalletName = (connectorId: string) => {
  //   switch (connectorId) {
  //     case 'argentX':
  //       return 'Argent X'
  //     case 'braavos':
  //       return 'Braavos'
  //     default:
  //       return connectorId
  //   }
  // }

  // if (isConnected && address) {
  //   return (
  //     <div className="relative">
  //       <button
  //         onClick={() => setIsDropdownOpen(!isDropdownOpen)}
  //         className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[#00D9FF]/20 transition-colors"
  //       >
  //         <span className="w-2 h-2 rounded-full bg-green-500"></span>
  //         <span className="text-sm font-medium">
  //           {address.slice(0, 6)}...{address.slice(-4)}
  //         </span>
  //       </button>
        
  //       {isDropdownOpen && (
  //         <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50">
  //           <div className="p-3 border-b border-gray-700">
  //             <p className="text-xs text-gray-400">Connected Address</p>
  //             <p className="text-sm text-white font-mono break-all">{address}</p>
  //           </div>
  //           <button
  //             onClick={() => {
  //               disconnect()
  //               setIsDropdownOpen(false)
  //             }}
  //             className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors"
  //           >
  //             Disconnect
  //           </button>
  //         </div>
  //       )}
  //     </div>
  //   )
  // }

  return (
    <div className="relative" ref={modalRef}>
      <button
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="ml-auto px-6 py-2 font-bold rounded-lg bg-[#00D9FF] text-black hover:bg-[#00BBFF] transition-colors flex items-center"
      >
        {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
            <Wallet className="md:mr-2 h-4 w-4" />
        )}
        <span className="hidden md:inline">
            {isConnected ? shortAddress : isLoading ? "Connecting..." : "Connect Wallet"}
        </span>
      </button>

      {/* Wallet Selector Modal */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-900 border w-44 ml-6 border-gray-700 rounded-lg px-3 py-2 max-w-sm mx-4">

            {status === 'connected' ? (
              <button
                className="flex items-center py-1 gap-2 w-full text-sm hover:bg-[#ffffff]/10 rounded-lg text-white"
                onClick={() => {
                  disconnect()
                  setIsDropdownOpen(false)
                }}
              >
                <PowerOff className='text-red-400 text-xs'/>
                <p>
                  Disconnect
                </p>
              </button>
            ): (
              connectors.map((c) => (
                <button 
                  key={c.id}
                  className="w-full text-left py-2 text-sm hover:bg-[#ffffff]/10 rounded-lg flex items-center gap-2"
                  onClick={() => {
                    connect({ connector: c })
                    setIsDropdownOpen(false)
                  }}
                >
                  <img src={c.icon.toString()} alt={`${c.name} logo`} className="w-5 h-5 inline-block mr-2"/>
                  <p className='text-white'>
                    {c.id === 'braavos' ? "Braavos Wallet" : "Ready Wallet"}
                  </p>
                </button>
              ))
            )}
            
            <div className="space-y-3">
              {/* {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector.id)}
                  disabled={!connector.available()}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    connector.available()
                      ? 'border-gray-700 hover:border-[#00D9FF]/50 hover:bg-gray-800 cursor-pointer'
                      : 'border-gray-800 bg-gray-900/50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <img src={connector.icon.toString()}/>
                  {connector.icon.toString()}
                  <div className="flex-1">
                    <div className="text-white font-medium">{connector.name}</div>
                    <div className="text-sm text-gray-400">
                      {connector.available() ? 'Ready to connect' : 'Not installed'}
                    </div>
                  </div>
                  {connector.available() && (
                    <div className="text-[#00D9FF] text-sm">→</div>
                  )}
                </button>
              ))} */}
            </div>
            
            {/* {connectors.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No wallets detected</p>
                <p className="text-sm text-gray-500">
                  Please install{' '}
                  <a 
                    href="https://www.argent.xyz/argent-x/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#00D9FF] hover:underline"
                  >
                    Argent X
                  </a>
                  {' '}or{' '}
                  <a 
                    href="https://braavos.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#00D9FF] hover:underline"
                  >
                    Braavos
                  </a>
                </p>
              </div>
            )} */}
          </div>
        </div>
      )}
    </div>
  )
}