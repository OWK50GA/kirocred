# Kirocred Backend API

This module provides REST API endpoints for the Kirocred credential system.

## Available Endpoints

### POST /api/credentials/issue

Issues a single credential to a holder.

**Request Body:**

```json
{
  "holderPublicKey": "0x1234...",
  "credentialId": "550e8400-e29b-41d4-a716-446655440000",
  "attributes": {
    "name": "John Doe",
    "degree": "Bachelor of Science",
    "university": "Example University"
  },
  "issuerSignedMessage": "0x5678...",
  "issuerPublicKey": "0x9abc..."
}
```

**Response:**

```json
{
  "success": true,
  "credentialId": "550e8400-e29b-41d4-a716-446655440000",
  "commitment": "0xdef0...",
  "message": "Credential issued successfully"
}
```

### POST /api/batches/process

Processes a batch of credentials, creates merkle tree, stores packages on IPFS, and publishes to blockchain.

**Request Body:**

```json
{
  "batchId": "550e8400-e29b-41d4-a716-446655440001",
  "credentials": [
    {
      "holderPublicKey": "0x1234...",
      "credentialId": "550e8400-e29b-41d4-a716-446655440002",
      "attributes": {
        "name": "Alice Smith",
        "degree": "Master of Arts"
      },
      "issuerSignedMessage": "0x5678..."
    }
  ],
  "issuerPublicKey": "0x9abc...",
  "batchMetadata": {
    "description": "University Degrees 2024",
    "purpose": "Academic credentials",
    "issuedBy": "Example University"
  }
}
```

**Response:**

```json
{
  "success": true,
  "batchId": "550e8400-e29b-41d4-a716-446655440001",
  "merkleRoot": "0xfed0...",
  "credentials": [
    {
      "credentialId": "550e8400-e29b-41d4-a716-446655440002",
      "ipfsCid": "QmXyZ..."
    }
  ],
  "transactionHash": "0x1234567890abcdef..."
}
```

### POST /api/credentials/revoke

Revokes a credential by marking its commitment hash as revoked on the blockchain.

**Request Body:**

```json
{
  "commitment": "0xdef0...",
  "batchId": "550e8400-e29b-41d4-a716-446655440001",
  "reason": "Credential expired"
}
```

**Response:**

```json
{
  "success": true,
  "commitment": "0xdef0...",
  "transactionHash": "0x1234567890abcdef..."
}
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- **400 Bad Request**: Invalid request data or validation errors
- **403 Forbidden**: Unauthorized operations
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side errors
- **503 Service Unavailable**: External service failures (IPFS, blockchain)

**Error Response Format:**

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Descriptive error message",
  "details": ["Specific validation errors..."] // Only for validation errors
}
```

## Usage Example

```typescript
import { createServer, setupErrorHandling } from "./server";
import { router } from "./routes";

const app = createServer();
app.use(router);
setupErrorHandling(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kirocred Backend API running on port ${PORT}`);
});
```

## Configuration Requirements

Before using the API endpoints, ensure the following are configured:

1. **IPFS Client**: Set `PINATA_JWT` environment variable for IPFS storage
2. **Blockchain Client**: Configure Starknet connection parameters
3. **Organization ID**: Set up organization registration for batch processing

## Privacy Features

- **No NFTs**: The system does not mint NFTs to preserve holder privacy
- **Commitment-based**: Credentials are identified by cryptographic commitments
- **Selective Disclosure**: Holders can reveal only necessary attributes during verification
- **Encrypted Storage**: All credential packages are encrypted before IPFS storage
