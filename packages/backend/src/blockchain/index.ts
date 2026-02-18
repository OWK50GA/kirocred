/* 
    TODO: Get the abi of the contract, and use the v2 of this so you get ABI
    typing with abi-wan-kanabi
*/

import {
  Account,
  Contract,
  Provider,
  RpcProvider,
  CallData,
  cairo,
  num,
  TransactionReceiptStatus,
  Abi,
  TransactionReceiptValue,
} from "starknet";
import { KIROCREDABI } from "./abi";

export interface BlockchainClientConfig {
  rpcUrl: string;
  accountAddress: `0x${string}`;
  privateKey: `0x${string}`;
  contractAddress: `0x${string}`;
  contractAbi: Abi;
}

export interface TransactionResult {
  transactionHash: string;
  status: TransactionReceiptStatus;
  value: TransactionReceiptValue
}

/**
 * Starknet blockchain client wrapper for Kirocred contract interactions
 */
export class BlockchainClient {
  private provider: Provider;
  private account: Account;
  private contract: Contract;
  private abi: Abi;

  constructor(config: BlockchainClientConfig) {
    // Initialize Starknet provider
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });

    // Initialize account for transaction signing
    this.account = new Account(
      this.provider,
      config.accountAddress,
      config.privateKey,
    );

    this.abi = KIROCREDABI;

    // Initialize contract instance
    this.contract = new Contract(
      this.abi,
      config.contractAddress,
      this.provider,
    );

    // Connect contract to account for transactions
    this.contract.connect(this.account);
  }

  /**
   * Wait for transaction confirmation and return result
   */
  private async waitForTransaction(txHash: string): Promise<TransactionResult> {
    try {
      const { statusReceipt, value, match } = await this.provider.waitForTransaction(txHash);
      return {
        transactionHash: txHash,
        status: statusReceipt,
        value,
      };
    } catch (error) {
      throw new Error(
        `Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle contract call errors with descriptive messages
   */
  private handleContractError(error: any, operation: string): never {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`${operation} failed: ${errorMessage}`);
  }

  /**
   * Convert string to felt252 format for Cairo contract calls
   */
  private stringToFelt(str: string): string {
    return cairo.felt(str);
  }

  /**
   * Convert hex string to felt252
   */
  private hexToFelt(hex: string): string {
    return num.toBigInt(hex).toString();
  }

  /**
   * Create organization in the smart contract
   * Requirements: 6.1, 6.2, 6.3
   */
  async createOrganization(
    orgAddress: string,
    orgPublicKey: string,
  ): Promise<string> {
    try {
      const callData = CallData.compile({
        org_address: orgAddress,
        org_pubkey: this.hexToFelt(orgPublicKey),
      });

      const typedContract = this.contract.typedv2(KIROCREDABI);

      const result = typedContract.create_org(callData);
      // const result = await this.contract.create_org(callData);
      const txResult = await this.waitForTransaction(result.transaction_hash);

      return txResult.transactionHash;
    } catch (error) {
      this.handleContractError(error, "Organization creation");
    }
  }

  /**
   * Create batch in the smart contract
   * Requirements: 2.6, 7.1, 7.2, 7.3
   */
  async createBatch(
    batchType: "BATCH" | "SINGLETON",
    orgId: number,
  ): Promise<string> {
    try {
      // Convert batch type to enum value
      const batchTypeValue = batchType === "BATCH" ? 0 : 1;

      const callData = CallData.compile({
        batch_type: batchTypeValue,
        org_id: orgId,
      });

      const typedContract = this.contract.typedv2(KIROCREDABI);
      const result = typedContract.create_batch(callData);
      const txResult = await this.waitForTransaction(result.transaction_hash);

      return txResult.transactionHash;
    } catch (error) {
      this.handleContractError(error, "Batch creation");
    }
  }

  /**
   * Store merkle root in the smart contract
   * Requirements: 2.6, 7.1, 7.2, 7.3
   */
  async storeMerkleRoot(batchId: number, merkleRoot: string): Promise<string> {
    try {
      const callData = CallData.compile({
        batch_id: batchId,
        merkle_root: this.hexToFelt(merkleRoot),
      });

      const typedContract = this.contract.typedv2(KIROCREDABI);
      const result = typedContract.store_merkle_root(callData);
      const txResult = await this.waitForTransaction(result.transaction_hash);

      return txResult.transactionHash;
    } catch (error) {
      this.handleContractError(error, "Merkle root storage");
    }
  }

  /**
   * Revoke credential by commitment hash
   * Requirements: 3.1
   */
  async revokeCredential(commitment: string, batchId: number): Promise<string> {
    try {
      const callData = CallData.compile({
        commitment: this.hexToFelt(commitment),
        batch_id: batchId,
      });

      const typedContract = this.contract.typedv2(KIROCREDABI);
      const result = typedContract.revoke(callData);
      const txResult = await this.waitForTransaction(result.transaction_hash);

      return txResult.transactionHash;
    } catch (error) {
      this.handleContractError(error, "Credential revocation");
    }
  }

  /**
   * Get merkle root for a batch
   * Requirements: 4.2, 4.6, 7.6
   */
  async getMerkleRoot(batchId: number): Promise<string> {
    try {
      const typedContract = this.contract.typedv2(KIROCREDABI);
      const result = await typedContract.get_merkle_root(batchId);
      return num.toHex(result);
    } catch (error) {
      this.handleContractError(error, "Get merkle root");
    }
  }

  /**
   * Get issuer public key for a batch
   * Requirements: 4.2, 4.6, 7.6
   */
  async getIssuerPublicKey(batchId: number): Promise<string> {
    try {
      const typedContract = this.contract.typedv2(KIROCREDABI);
      const result = await typedContract.get_issuer_public_key(batchId);
      return num.toHex(result);
    } catch (error) {
      this.handleContractError(error, "Get issuer public key");
    }
  }

  /**
   * Check if credential is revoked by commitment hash
   * Requirements: 4.2, 4.6, 7.6
   */
  async isRevoked(commitment: string, batchId: number): Promise<boolean> {
    try {
      const typedContract = this.contract.typedv2(KIROCREDABI);
      const result = await typedContract.is_revoked(
        this.hexToFelt(commitment),
        batchId,
      );
      return Boolean(result);
    } catch (error) {
      this.handleContractError(error, "Check revocation status");
    }
  }
}

export default BlockchainClient;
