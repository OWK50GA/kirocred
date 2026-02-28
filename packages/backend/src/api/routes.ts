import { Router, Request, Response } from "express";
import { asyncHandler } from "./server";
import {
  validateIssueCredentialRequest,
  validateProcessBatchRequest,
  validateRevokeCredentialRequest,
  validateRegisterOrganizationRequest,
  IssueCredentialRequest,
  IssueCredentialResponse,
  ProcessBatchRequest,
  ProcessBatchResponse,
  RevokeCredentialRequest,
  RevokeCredentialResponse,
  RegisterOrganizationRequest,
  RegisterOrganizationResponse,
} from "./validation";
import {
  issueCredential,
  CredentialData,
  processAndStoreBatch,
  BatchProcessingRequest,
} from "../batch";
import BlockchainClient from "../blockchain";
import { IPFSClient } from "../ipfs";
import { envConfig } from "../config";
import { KIROCREDABI } from "../blockchain/abi";
import { getDatabase } from "../db";

const router = Router();

const {
  contractAddress,
  starknetRpcUrl,
  accountAddress,
  privateKey,
} = envConfig;

const createIPFSClient = (): IPFSClient => {
  const client = new IPFSClient();

  return client;
};

const createBlockChainClient = (): BlockchainClient => {
  const client = new BlockchainClient({
    accountAddress: accountAddress as `0x${string}`,
    privateKey: privateKey as `0x${string}`,
    rpcUrl: starknetRpcUrl,
    contractAddress: contractAddress as `0x${string}`,
    contractAbi: KIROCREDABI,
  });

  return client;
};

// POST /api/credentials/issue endpoint
router.post(
  "/credentials/issue",
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = validateIssueCredentialRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Invalid request data",
        details: validation.errors,
      });
    }

    const requestData: IssueCredentialRequest = req.body;

    try {
      console.log("...trying");
      // Prepare credential data for the batch module
      const credentialData: CredentialData = {
        holderPublicKey: requestData.holderPublicKey,
        credentialId: requestData.credentialId,
        attributes: requestData.attributes,
        issuerSignedMessage: requestData.issuerSignedMessage,
      };

      // Call credential issuance function
      const issuedCredential = issueCredential(credentialData, requestData.issuerAddress);

      // Return success response
      const response: IssueCredentialResponse = {
        success: true,
        credentialId: issuedCredential.credentialId,
        commitment: issuedCredential.commitment,
        message: "Credential issued successfully",
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error issuing credential:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("signature")) {
          return res.status(400).json({
            success: false,
            error: "Signature Error",
            message: "Invalid issuer signature",
          });
        }

        if (error.message.includes("encryption")) {
          return res.status(500).json({
            success: false,
            error: "Encryption Error",
            message: "Failed to encrypt credential attributes",
          });
        }
      }

      // Generic error response
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to issue credential",
      });
    }
  }),
);

// POST /api/batches/process endpoint
router.post(
  "/batches/process",
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = validateProcessBatchRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Invalid request data",
        details: validation.errors,
      });
    }

    const requestData: ProcessBatchRequest = req.body;

    try {
      // Create client instances (in production, these should be injected)
      const ipfsClient = createIPFSClient();
      const blockchainClient = createBlockChainClient();
      
      // Validate that the issuer is a registered organization
      const orgId = await blockchainClient.getOrgByAddress(requestData.issuerAddress);
      if (orgId === 0) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized",
          message: "Only registered organizations can create batches. Please register your organization first.",
        });
      }

      // Prepare batch processing request
      const batchRequest: BatchProcessingRequest = {
        credentials: requestData.credentials.map((cred) => ({
          holderPublicKey: cred.holderPublicKey,
          credentialId: cred.credentialId,
          attributes: cred.attributes,
          issuerSignedMessage: cred.issuerSignedMessage,
        })),
        issuerAddress: requestData.issuerAddress,
        batchMetadata: {
          ...requestData.batchMetadata,
          timestamp: Date.now(),
        },
      };

      // Call batch processing orchestrator
      const batchResult = await processAndStoreBatch(
        batchRequest,
        ipfsClient,
        blockchainClient,
        orgId,
      );

      // Return success response
      const response: ProcessBatchResponse = {
        success: true,
        batchId: batchResult.batchId,
        merkleRoot: batchResult.merkleRoot,
        credentials: batchResult.credentialCIDs.map((cred) => ({
          credentialId: cred.credentialId,
          ipfsCid: cred.ipfsCid,
        })),
        transactionHash: batchResult.transactionHash,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error processing batch:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("IPFS")) {
          return res.status(503).json({
            success: false,
            error: "IPFS Error",
            message: "Failed to store credential packages on IPFS",
          });
        }

        if (
          error.message.includes("blockchain") ||
          error.message.includes("transaction")
        ) {
          return res.status(503).json({
            success: false,
            error: "Blockchain Error",
            message: "Failed to publish merkle root to blockchain",
          });
        }

        if (error.message.includes("duplicate")) {
          return res.status(400).json({
            success: false,
            error: "Duplicate Error",
            message: "Duplicate credential IDs found in batch",
          });
        }
      }

      // Generic error response
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to process batch",
      });
    }
  }),
);

// POST /api/credentials/revoke endpoint
router.post(
  "/credentials/revoke",
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = validateRevokeCredentialRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Invalid request data",
        details: validation.errors,
      });
    }

    const requestData: RevokeCredentialRequest = req.body;

    try {
      const blockchainClient = createBlockChainClient();

      const transactionHash = await blockchainClient.revokeCredential(
        requestData.commitment,
        parseInt(requestData.batchId),
      );

      const response: RevokeCredentialResponse = {
        success: true,
        commitment: requestData.commitment,
        transactionHash: transactionHash,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error revoking credential:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (
          error.message.includes("blockchain") ||
          error.message.includes("transaction")
        ) {
          return res.status(503).json({
            success: false,
            error: "Blockchain Error",
            message: "Failed to revoke credential on blockchain",
          });
        }

        if (
          error.message.includes("not found") ||
          error.message.includes("does not exist")
        ) {
          return res.status(404).json({
            success: false,
            error: "Not Found",
            message: "Credential not found or already revoked",
          });
        }

        if (
          error.message.includes("unauthorized") ||
          error.message.includes("permission")
        ) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
            message: "Not authorized to revoke this credential",
          });
        }
      }

      // Generic error response
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to revoke credential",
      });
    }
  }),
);

export default router;
// POST /api/organizations/register endpoint
router.post(
  "/organizations/register",
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = validateRegisterOrganizationRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Invalid request data",
        details: validation.errors,
      });
    }

    const requestData: RegisterOrganizationRequest = req.body;

    try {
      const blockchainClient = createBlockChainClient();

      // Call the contract's create_org function with signature
      const transactionHash = await blockchainClient.createOrganization(
        requestData.orgAddress,
        requestData.signature,
      );

      // Read the OrganizationCreated event to get the org_id
      let orgId: string | undefined;
      try {
        const event = await blockchainClient.readEvent("OrganizationCreated", transactionHash);
        orgId = event.org_id?.toString();
        
        // Store organization in database after blockchain success
        if (orgId) {
          const db = await getDatabase();
          await db.insertOrganization({
            org_id: parseInt(orgId),
            org_name: requestData.orgName || null
          });
          console.log(`Organization ${orgId} stored in database`);
        }
      } catch (eventError) {
        console.warn("Could not read OrganizationCreated event:", eventError);
        // Continue without org_id - the transaction was still successful
      }

      const response: RegisterOrganizationResponse = {
        success: true,
        orgId,
        transactionHash,
        message: "Organization registered successfully",
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error registering organization:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          return res.status(409).json({
            success: false,
            error: "Conflict",
            message: "Organization with this address already exists",
          });
        }

        if (
          error.message.includes("blockchain") ||
          error.message.includes("transaction")
        ) {
          return res.status(503).json({
            success: false,
            error: "Blockchain Error",
            message: "Failed to register organization on blockchain",
          });
        }

        if (error.message.includes("unauthorized") || error.message.includes("permission")) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
            message: "Not authorized to register organizations",
          });
        }
      }

      // Generic error response
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to register organization",
      });
    }
  }),
);

// GET /api/credentials/holder/:address endpoint
router.get(
  "/credentials/holder/:address",
  asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.params;

    // Validate address format (basic validation)
    if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Invalid holder address format",
      });
    }

    try {
      const db = await getDatabase();
      
      // Get all credentials for this holder with org info
      const credentials = await db.getCredentialsByHolder(address);

      res.status(200).json({
        success: true,
        holderAddress: address,
        credentials: credentials.map(cred => ({
          credentialId: cred.credential_id,
          ipfsCid: cred.ipfs_cid,
          batchId: cred.batch_id,
          orgId: cred.org_id,
          orgName: cred.org_name,
        })),
        count: credentials.length,
      });
    } catch (error) {
      console.error("Error fetching credentials for holder:", error);

      // Generic error response
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to fetch credentials",
      });
    }
  }),
);

// GET /api/credentials/all endpoint - for verifiers to see all issued credentials
router.get(
  "/credentials/all",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const db = await getDatabase();
      
      // Get all credentials with org and batch info
      const credentials = await db.getAllCredentials();

      res.status(200).json({
        success: true,
        credentials: credentials.map(cred => ({
          credentialId: cred.credential_id,
          batchId: cred.batch_id,
          orgId: cred.org_id,
          orgName: cred.org_name,
        })),
        count: credentials.length,
      });
    } catch (error) {
      console.error("Error fetching all credentials:", error);

      // Generic error response
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to fetch credentials",
      });
    }
  }),
);

// GET /api/batches/all endpoint - for verifiers to see all issued batches
router.get(
  "/batches/all",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const db = await getDatabase();
      
      // Get all batches with org info and credential count
      const batches = await db.getAllBatches();

      res.status(200).json({
        success: true,
        batches: batches.map(batch => ({
          batchId: batch.batch_id,
          orgId: batch.org_id,
          orgName: batch.org_name,
          credentialCount: batch.credential_count,
        })),
        count: batches.length,
      });
    } catch (error) {
      console.error("Error fetching all batches:", error);

      // Generic error response
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to fetch batches",
      });
    }
  }),
);

