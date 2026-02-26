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
  GetTransactionReceiptResponse,
  ParsedEvent,
  ParsedStruct,
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
  value: TransactionReceiptValue;
}

/**
 * Starknet blockchain client wrapper for Kirocred contract interactions
 */
export class BlockchainClient {
  private provider: Provider;
  private account: Account;
  private contract: Contract;
  private abi: Abi;
  // private namePrefix: string;

  constructor(config: BlockchainClientConfig) {
    // Initialize Starknet provider
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });

    // Initialize account for transaction signing
    this.account = new Account({
      provider: this.provider,
      address: config.accountAddress,
      signer: config.privateKey,
    });

    this.abi = KIROCREDABI;

    // Initialize contract instance
    this.contract = new Contract({
      abi: this.abi,
      address: config.contractAddress,
      providerOrAccount: this.provider,
    });
    // Connect contract to account for transactions
    // this.contract.connect(this.account);
  }

  /**
   * Wait for transaction confirmation and return result
   */
  private async waitForTransaction(
    txHash: string,
  ): Promise<GetTransactionReceiptResponse> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash);
      return receipt;
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
  /**
     * Create organization in the smart contract
     * Security: Only the organization address itself can register
     */
    async createOrganization(
      orgAddress: string,
      signature: { r: string; s: string }
    ): Promise<string> {
      try {
        const callData = new CallData(this.abi).compile("create_org", {
          org_address: orgAddress,
          // signature: [signature.r, signature.s],
        });

        const { transaction_hash } = await this.account.execute([
          {
            contractAddress: this.contract.address,
            calldata: callData,
            entrypoint: "create_org",
          },
        ]);

        return transaction_hash;
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
      const batchTypeValue = batchType === "BATCH" ? 0 : 1;

      const calldata = new CallData(this.abi).compile("create_batch", {
        batch_type: batchTypeValue,
        org_id: orgId,
      });

      const { transaction_hash } = await this.account.execute([
        {
          contractAddress: this.contract.address,
          entrypoint: "create_batch",
          calldata,
        },
      ]);
      return transaction_hash;
    } catch (error) {
      this.handleContractError(error, "Batch creation");
    }
  }

  hexToBytes(hex: string): Uint8Array {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;

    if (clean.length % 2 !== 0) {
      throw new Error("Invalid hex string length");
    }

    return Uint8Array.from(
      clean.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)),
    );
  }
  /**
   * Store merkle root in the smart contract
   * Requirements: 2.6, 7.1, 7.2, 7.3
   */
  async storeMerkleRoot(batchId: number, merkleRoot: string): Promise<string> {
    try {
      const calldata = new CallData(this.abi).compile("store_merkle_root", {
        batch_id: batchId,
        merkle_root: merkleRoot,
      });

      console.log("Trying to store merkle root...");

      const { transaction_hash } = await this.account.execute([
        {
          contractAddress: this.contract.address,
          calldata,
          entrypoint: "store_merkle_root",
        },
      ]);

      return transaction_hash;
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
      const calldata = new CallData(this.abi).compile("revoke", {
        commitment: this.hexToFelt(commitment),
        batch_id: batchId,
      });

      const { transaction_hash } = await this.account.execute([
        {
          contractAddress: this.contract.address,
          calldata,
          entrypoint: "revoke",
        },
      ]);

      return transaction_hash;
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
      // Result is a ByteArray, which is returned as a string by starknet.js
      return result.toString();
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
   * Get organization ID by address
   */
  async getOrgByAddress(orgAddress: string): Promise<number> {
    try {
      const typedContract = this.contract.typedv2(KIROCREDABI);
      const result = await typedContract.get_org_by_address(orgAddress);
      return Number(result);
    } catch (error) {
      this.handleContractError(error, "Get organization by address");
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

  async readEvent(eventName: string, txHash: string): Promise<ParsedStruct> {
    try {
      const receipt = await this.waitForTransaction(txHash);

      // console.log("Receipt: ", receipt);

      const parsed = this.contract.parseEvents(receipt);
      // console.log("Parsed: ", parsed);

      const parsedKeys = Object.keys(parsed[0]);
      // console.log("Parsed keys: ", parsedKeys);

      const eventKey = parsedKeys.find(
        (key) => key.split("::").slice(-1)[0] === eventName,
      );

      if (!eventKey) throw new Error("No such event found");

      const event = parsed.length ? parsed[0][eventKey] : {};
      // console.log("Event: ", event);
      return event;
    } catch (err) {
      this.handleContractError(err, "Read event");
    }
  }
}

export default BlockchainClient;
