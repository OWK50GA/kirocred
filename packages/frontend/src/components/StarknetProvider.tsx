'use client'

import { Chain, mainnet, sepolia } from "@starknet-react/chains";
import { argent, braavos, jsonRpcProvider, StarknetConfig, useInjectedConnectors, voyager } from "@starknet-react/core";
import { ReactNode } from "react";

export default function StarknetProvider({ children }: {
    children: ReactNode
}){

    const { connectors } = useInjectedConnectors({
        recommended: [argent(), braavos()],
        includeRecommended: 'always'
    })

    function rpc(chain: Chain) {
        return {
        nodeUrl: "https://rpc.starknet-testnet.lava.build/rpc/v0_9",
        };
    }

    const provider = jsonRpcProvider({ rpc })

    return (
        <StarknetConfig 
            chains={[sepolia, mainnet]}
            provider={provider}
            connectors={connectors}
            explorer={voyager}
            autoConnect
        >
            {children}
        </StarknetConfig>
    )
}