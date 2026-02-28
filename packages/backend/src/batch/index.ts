import {
  hashAttributes,
  generateSalt,
  computeCommitment,
  generateAESKey,
  encryptAttributes,
  encryptKeyToHolder,
  verifyIssuerSignature,
} from "../crypto/index";
import { envConfig } from "../config";

/**
 * Credential data structure for issuance
 */
export interface CredentialData {
  credentialId: string;
  holderPublicKey: string;
  attributes: Record<string, any>;
  issuerSignedMessage: string;
  // Note: issuerAddress is now obtained from the connected wallet, not from credential data
}

/**
 * Issued credential result structure
 */
export interface IssuedCredential {
  credentialId: string;
  commitment: string;
  encryptedAttributes: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  encryptedKey: string;
  attributeSalts: Record<string, string>;
  salt: string;
  attributesHash: string;
  holderPublicKey: string;
}

/**
 * Issue a single credential with encryption and commitment computation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 *
 * @param credentialData - Credential data including holder public key, attributes, and issuer signature
 * @param issuerAddress - Issuer address from the connected wallet
 * @returns IssuedCredential with commitment, encrypted data, and metadata
 */
export function issueCredential(
  credentialData: CredentialData,
  issuerAddress: string | `0x${string}`,
): IssuedCredential {
  const {
    credentialId,
    holderPublicKey,
    attributes,
    issuerSignedMessage,
  } = credentialData;
  // console.log(credentialData);

  if (
    !credentialId ||
    !holderPublicKey ||
    !attributes ||
    !issuerSignedMessage ||
    !issuerAddress
  ) {
    throw new Error("Missing required credential data fields");
  }

  // Verify issuer signature (Requirement 1.4)
  // So what exactly did the issuer sign if the message and the signed message are the same? Flaw
  // Fixed in another branch. This will be removed when it is fixed
  if (
    !verifyIssuerSignature(
      issuerSignedMessage,
      issuerSignedMessage,
      // issuerPublicKey,
      issuerAddress as `0x${string}`,
    )
  ) {
    throw new Error("Invalid issuer signature");
  }

  // Compute attributes hash (Requirement 1.3)
  const attributesHash = hashAttributes(attributes);

  // Generate random salt (Requirement 1.2)
  const salt = generateSalt();

  // Compute commitment using formula H(cred_id || holder_pubkey || attributes_hash || salt) (Requirement 1.1)
  const commitment = computeCommitment(
    credentialId,
    holderPublicKey,
    attributesHash,
    salt,
  );

  // Generate AES key for attribute encryption (Requirement 1.5)
  const aesKey = generateAESKey();

  // Encrypt attributes with AES-GCM (Requirement 1.5)
  const encryptedAttributes = encryptAttributes(attributes, aesKey);

  // Encrypt AES key to holder's public key using ECIES_Stark (Requirement 1.6)
  const encryptedKey = encryptKeyToHolder(aesKey, holderPublicKey);

  // Generate salts for selective disclosure
  const attributeSalts: Record<string, string> = {};
  Object.keys(attributes).forEach((key) => {
    attributeSalts[key] = generateSalt();
  });

  return {
    credentialId,
    commitment,
    encryptedAttributes,
    encryptedKey,
    attributeSalts,
    salt,
    attributesHash,
    holderPublicKey
  };
}
import {
  buildTree,
  getRoot,
  getProof,
  MerkleTree,
  MerkleProof,
} from "../merkle/index";

/**
 * Batch metadata structure
 */
export interface BatchMetadata {
  description: string;
  purpose: string;
  issuedBy: string;
  timestamp: number;
}

/**
 * Batch processing request structure
 */
export interface BatchProcessingRequest {
  credentials: CredentialData[];
  issuerAddress: string;
  batchMetadata: BatchMetadata;
}

/**
 * Per-holder credential package structure
 */
export interface CredentialPackage {
  // Core data
  commitment: string; // Commitment hash (leaf)
  pathElements: string[]; // Merkle proof
  pathIndices: number[]; // Merkle proof indices

  // Encrypted credential data
  encryptedAttributes: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  encryptedKey: string; // AES key encrypted to holder's pubkey

  // Metadata
  batchId: string;
  credentialId: string;
  issuedAt: number; // Unix timestamp

  // Signatures
  issuerSignedMessage: string; // Issuer's signature
  holderPublicKey: string;

  // Salts for selective disclosure
  attributeSalts: Record<string, string>;
}

/**
 * Batch processing result structure
 */
export interface BatchProcessingResult {
  // batchId: string;
  merkleRoot: string;
  merkleTree: MerkleTree;
  credentialPackages: CredentialPackage[];
  issuedCredentials: IssuedCredential[];
}

/**
 * Process a batch of credentials with merkle tree construction and proof generation
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * @param request - Batch processing request with credentials and metadata
 * @returns BatchProcessingResult with merkle tree, packages, and proofs
 */
export function processBatch(
  request: BatchProcessingRequest,
): BatchProcessingResult {
  const { credentials, issuerAddress, batchMetadata } = request;

  // Validate input
  if (!credentials || credentials.length === 0) {
    throw new Error(
      "Invalid batch processing request: missing batchId or credentials",
    );
  }

  if (!issuerAddress || !batchMetadata) {
    throw new Error(
      "Invalid batch processing request: missing issuerAddress or batchMetadata",
    );
  }

  // Issue all credentials and collect commitments (Requirement 2.1)
  const issuedCredentials: IssuedCredential[] = [];
  const commitments: string[] = [];

  for (const credentialData of credentials) {
    const issuedCredential = issueCredential(credentialData, issuerAddress);
    issuedCredentials.push(issuedCredential);
    commitments.push(issuedCredential.commitment);
  }

  // Build merkle tree from commitments (Requirement 2.1, 2.2)
  const merkleTree = buildTree(commitments);
  const merkleRoot = getRoot(merkleTree);

  // Generate proofs for each credential and create per-holder packages (Requirement 2.3, 2.4)
  const credentialPackages: CredentialPackage[] = [];

  for (let i = 0; i < issuedCredentials.length; i++) {
    const issuedCredential = issuedCredentials[i];
    const originalCredential = credentials[i];

    // Generate merkle proof for this credential
    const proof = getProof(merkleTree, i);

    // Create per-holder package with all required fields (Requirement 2.4)
    const credentialPackage: CredentialPackage = {
      // Core data
      commitment: issuedCredential.commitment,
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,

      // Encrypted credential data
      encryptedAttributes: issuedCredential.encryptedAttributes,
      encryptedKey: issuedCredential.encryptedKey,

      // Metadata
      batchId: "",
      credentialId: issuedCredential.credentialId,
      issuedAt: batchMetadata.timestamp,

      // Signatures
      issuerSignedMessage: originalCredential.issuerSignedMessage,
      holderPublicKey: issuedCredential.holderPublicKey,

      // Salts for selective disclosure
      attributeSalts: issuedCredential.attributeSalts,
    };

    credentialPackages.push(credentialPackage);
  }

  return {
    // batchId,
    merkleRoot,
    merkleTree,
    credentialPackages,
    issuedCredentials,
  };
}
import { IPFSClient } from "../ipfs/index";
import { BlockchainClient } from "../blockchain/index";
import { byteArray, RpcProvider } from "starknet";
import { getDatabase } from "../db";

/**
 * Batch storage and publishing result
 */
export interface BatchStorageResult {
  batchId: string;
  merkleRoot: string;
  transactionHash: string;
  credentialCIDs: Array<{
    credentialId: string;
    ipfsCid: string;
  }>;
}

/**
 * Store credential packages to IPFS and publish merkle root to blockchain
 * Requirements: 2.5, 2.6, 2.7, 9.1, 9.2
 *
 * @param batchResult - Result from batch processing
 * @param ipfsClient - IPFS client for package storage
 * @param blockchainClient - Blockchain client for merkle root publishing
 * @param orgId - Organization ID for batch creation
 * @returns BatchStorageResult with transaction hash and CIDs
 */

// TODO: Check if you actually need to return issuedCredentials from the object above;
export async function storeBatchAndPublish(
  batchResult: BatchProcessingResult,
  ipfsClient: IPFSClient,
  blockchainClient: BlockchainClient,
  orgId: number,
): Promise<BatchStorageResult> {
  const { merkleRoot, credentialPackages } = batchResult;
  const { starknetRpcUrl } = envConfig;
  // console.log("Merkle Root unchanged: ", merkleRoot);

  const provider = new RpcProvider({ nodeUrl: starknetRpcUrl });

  try {
    // Store each per-holder package to IPFS (Requirement 2.5, 9.1, 9.2)
    const credentialCIDs: Array<{ credentialId: string; ipfsCid: string }> = [];

    console.log("About to create on Blockchain");
    const createBatchTxHash = await blockchainClient.createBatch(
      "BATCH",
      orgId,
    );
    console.log(`Batch created with transaction hash: ${createBatchTxHash}`);

    const batchCreatedEvent = await blockchainClient.readEvent(
      "BatchCreated",
      createBatchTxHash,
    );
    const batchIdNumber = batchCreatedEvent["batch_id"].toString();
    console.log(batchIdNumber);

    for (const credentialPackage of credentialPackages) {
      try {
        // Store encrypted package to IPFS
        credentialPackage.batchId = batchIdNumber;
        const ipfsCid = await ipfsClient.storePackage(credentialPackage);

        credentialCIDs.push({
          credentialId: credentialPackage.credentialId,
          ipfsCid: ipfsCid.cid,
        });
      } catch (error) {
        throw new Error(
          `Failed to store credential ${credentialPackage.credentialId} to IPFS: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const publishTxHash = await blockchainClient.storeMerkleRoot(
      parseInt(batchIdNumber),
      merkleRoot,
    );

    // Store batch and credentials in database after blockchain success
    try {
      const db = await getDatabase();
      
      // Store batch
      await db.insertBatch({
        batch_id: parseInt(batchIdNumber),
        org_id: orgId
      });
      console.log(`Batch ${batchIdNumber} stored in database`);

      // Store credentials
      const credentialsToStore = credentialPackages.map((pkg, index) => ({
        holder_address: pkg.holderPublicKey,
        batch_id: parseInt(batchIdNumber),
        ipfs_cid: credentialCIDs[index].ipfsCid,
        credential_id: pkg.credentialId
      }));

      await db.insertCredentialsBatch(credentialsToStore);
      console.log(`${credentialsToStore.length} credentials stored in database`);
    } catch (dbError) {
      console.error("Failed to store batch/credentials in database:", dbError);
      // Don't fail the entire operation if database storage fails
      // The blockchain transaction already succeeded
    }

    return {
      batchId: batchIdNumber,
      merkleRoot,
      transactionHash: publishTxHash,
      credentialCIDs,
    };
  } catch (error) {
    // If any step fails, we should ideally clean up partial state
    // For now, we'll just throw the error
    // TODO: MAKE THIS AN ALL-OR-NOTHING OR ATOMIC OPERATION -> DYOR
    throw new Error(
      `Batch storage and publishing failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Complete batch processing workflow: process, store, and publish
 * This is the main entry point for batch processing
 *
 * @param request - Batch processing request
 * @param ipfsClient - IPFS client for storage
 * @param blockchainClient - Blockchain client for publishing
 * @param orgId - Organization ID
 * @returns Complete batch storage result
 */
export async function processAndStoreBatch(
  request: BatchProcessingRequest,
  ipfsClient: IPFSClient,
  blockchainClient: BlockchainClient,
  orgId: number,
): Promise<BatchStorageResult> {
  // Process the batch (generate commitments, build merkle tree, create packages)
  const batchResult = processBatch(request);

  // Store packages to IPFS and publish merkle root to blockchain
  const storageResult = await storeBatchAndPublish(
    batchResult,
    ipfsClient,
    blockchainClient,
    orgId,
  );

  return storageResult;
}
