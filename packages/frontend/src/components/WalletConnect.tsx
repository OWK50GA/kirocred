'use client'

import { useState, useEffect, useRef } from 'react'
import { useConnect, useAccount, useDisconnect } from '@starknet-react/core'

export default function WalletConnect() {
  const { connect, connectors } = useConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsWalletSelectorOpen(false)
      }
    }

    if (isWalletSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isWalletSelectorOpen])

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsWalletSelectorOpen(false)
      }
    }

    if (isWalletSelectorOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isWalletSelectorOpen])

  const handleConnect = (connectorId?: string) => {
    if (connectorId) {
      const selectedConnector = connectors.find(connector => connector.id === connectorId)
      if (selectedConnector) {
        connect({ connector: selectedConnector })
        setIsWalletSelectorOpen(false)
        return
      }
    }
    
    // If no specific connector or connector not found, show wallet selector
    setIsWalletSelectorOpen(true)
  }

  const getWalletIcon = (connectorId: string) => {
    switch (connectorId) {
      case 'argentX':
        return (
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
        )
      case 'braavos':
        return (
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
        )
    }
  }

  const getWalletName = (connectorId: string) => {
    switch (connectorId) {
      case 'argentX':
        return 'Argent X'
      case 'braavos':
        return 'Braavos'
      default:
        return connectorId
    }
  }

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[#00D9FF]/20 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-sm font-medium">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </button>
        
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-gray-700">
              <p className="text-xs text-gray-400">Connected Address</p>
              <p className="text-sm text-white font-mono break-all">{address}</p>
            </div>
            <button
              onClick={() => {
                disconnect()
                setIsDropdownOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => handleConnect()}
        className="px-4 py-2 rounded-lg bg-[#00D9FF] text-black font-medium hover:bg-[#00BBFF] transition-colors"
      >
        Connect Wallet
      </button>

      {/* Wallet Selector Modal */}
      {isWalletSelectorOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-80 max-w-sm mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
              <button
                onClick={() => setIsWalletSelectorOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {connectors.map((connector) => (
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
                  {getWalletIcon(connector.id)}
                  <div className="flex-1">
                    <div className="text-white font-medium">{getWalletName(connector.id)}</div>
                    <div className="text-sm text-gray-400">
                      {connector.available() ? 'Ready to connect' : 'Not installed'}
                    </div>
                  </div>
                  {connector.available() && (
                    <div className="text-[#00D9FF] text-sm">→</div>
                  )}
                </button>
              ))}
            </div>
            
            {connectors.length === 0 && (
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}