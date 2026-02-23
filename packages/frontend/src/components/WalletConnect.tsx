'use client';

import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';

export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <span className="text-gray-600">Connected: </span>
          <span className="font-mono text-xs">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-600 mb-2">Connect your wallet to sign credentials:</p>
      <div className="flex flex-wrap gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Connect {connector.name}
          </button>
        ))}
      </div>
    </div>
  );
}
