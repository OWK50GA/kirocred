// Starknet provider configuration for blockchain queries

import { Provider, Contract, num } from 'starknet';
import { KIROCREDABI } from './abi';

export class StarknetClient {
  private provider: Provider;
  private contract: Contract;

  constructor(contractAddress: string, providerUrl?: string) {
    if (!providerUrl) {
      throw new Error("No provider");
    }

    this.provider = new Provider({
      nodeUrl: providerUrl || 'https://rpc.starknet-testnet.lava.build/rpc/v0_9'
    });
    
    // this.contract = new Contract(KIROCREDABI, contractAddress, this.provider);
    this.contract = new Contract({
      abi: KIROCREDABI,
      providerOrAccount: this.provider,
      address: contractAddress
    })
  }

  /**
   * Convert hex string to felt252
   */
  private hexToFelt(hex: string): string {
    return num.toBigInt(hex).toString();
  }

  /**
   * Get merkle root for a batch
   */
  async getMerkleRoot(batchId: number): Promise<string> {
    try {
      const typedContract = this.contract.typedv2(KIROCREDABI);
      const result = await typedContract.get_merkle_root(batchId);
      // Result is a ByteArray, which starknet.js returns as a string
      return result.toString();
    } catch (error) {
      throw new Error(`Failed to get merkle root for batch ${batchId}: ${error}`);
    }
  }
  /**
   * Get issuer public key for a batch
   */
  async getIssuerPublicKey(batchId: number): Promise<string> {
    try {
      const result = await this.contract.get_issuer_public_key(batchId);
      return num.toHex(result);
    } catch (error) {
      throw new Error(`Failed to get issuer public key for batch ${batchId}: ${error}`);
    }
  }

  /**
   * Check if a credential is revoked
   */
  async isRevoked(commitment: string, batchId: number): Promise<boolean> {
    try {
      const result = await this.contract.is_revoked(this.hexToFelt(commitment), batchId);
      return Boolean(result);
    } catch (error) {
      throw new Error(`Failed to check revocation status: ${error}`);
    }
  }
}

// Default client instance - can be configured via environment variables
export const createStarknetClient = () => {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const providerUrl = process.env.NEXT_PUBLIC_STARKNET_PROVIDER_URL;
  
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS environment variable is required');
  }
  
  return new StarknetClient(contractAddress, providerUrl);
};