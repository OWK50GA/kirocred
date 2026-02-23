import { Router, Request, Response } from "express";
import { asyncHandler } from "./server";
import {
  validateIssueCredentialRequest,
  validateProcessBatchRequest,
  validateRevokeCredentialRequest,
  IssueCredentialRequest,
  IssueCredentialResponse,
  ProcessBatchRequest,
  ProcessBatchResponse,
  RevokeCredentialRequest,
  RevokeCredentialResponse,
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

const router = Router();

const {
  contractAddress,
  starknetRpcUrl,
  accountAddress,
  pinataGatewayUrl,
  pinataJwt,
  privateKey,
} = envConfig;

// TODO: In production, these should be injected as dependencies or configured via environment
// For now, we'll create mock instances that throw errors to indicate they need proper configuration

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
    // console.log(req.body)

    try {
      console.log("...trying");
      // Prepare credential data for the batch module
      const credentialData: CredentialData = {
        holderPublicKey: requestData.holderPublicKey,
        credentialId: requestData.credentialId,
        attributes: requestData.attributes,
        issuerSignedMessage: requestData.issuerSignedMessage,
        // issuerPublicKey: requestData.issuerPublicKey,
        issuerAddress: requestData.issuerAddress,
      };

      // Call credential issuance function
      // console.log("Signed message: ", requestData.issuerSignedMessage)
      const issuedCredential = issueCredential(credentialData);

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
      const orgId = 1; // TODO: Get from authentication/organization context

      // Prepare batch processing request
      const batchRequest: BatchProcessingRequest = {
        // batchId: requestData.batchId,
        credentials: requestData.credentials.map((cred) => ({
          holderPublicKey: cred.holderPublicKey,
          credentialId: cred.credentialId,
          attributes: cred.attributes,
          issuerSignedMessage: cred.issuerSignedMessage,
          // issuerPublicKey: requestData.issuerPublicKey,
          issuerAddress: requestData.issuerAddress,
        })),
        // issuerPublicKey: requestData.issuerPublicKey,
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
      // Create blockchain client instance (in production, this should be injected)
      const blockchainClient = createBlockChainClient();

      // Call blockchain client revokeCredential
      const transactionHash = await blockchainClient.revokeCredential(
        requestData.commitment,
        parseInt(requestData.batchId), // Convert string batchId to number for blockchain call
      );

      // Return success response
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
