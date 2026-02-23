# Kirocred System - Production TODOs

This document lists all items that need to be addressed before production deployment, including incomplete implementations, development placeholders, and configuration requirements.

## 🔧 Production Configuration Required

### 1. Environment Variables & Configuration

**Backend Configuration** (`packages/backend/.env`):
- [ ] Set production Starknet RPC URL (currently using testnet)
- [ ] Configure production Starknet account address and private key
- [ ] Set production Pinata JWT token for IPFS
- [ ] Configure production contract address after deployment
- [ ] Set appropriate CORS origins (currently allows all with `*`)
- [ ] Configure production PORT and NODE_ENV

**Frontend Configuration** (`packages/frontend/.env`):
- [ ] Set production Starknet RPC URL
- [ ] Configure production contract address
- [ ] Set production IPFS gateway URL

### 2. Client Dependency Injection

**API Routes** (`packages/backend/src/api/routes.ts`):
- [ ] **Line 20-29**: Replace mock client factories with proper dependency injection
  - Currently throws errors: "IPFS client not configured" and "Blockchain client not configured"
  - Need to inject real IPFSClient and BlockchainClient instances
- [ ] **Line 118**: Replace hardcoded `orgId = 1` with proper authentication/organization context
- [ ] **Line 115, 209**: Remove "in production, these should be injected" comments after fixing

### 3. IPFS Client Security

**IPFS Client** (`packages/backend/src/ipfs/index.ts`):
- [ ] **Line 32**: Replace default random encryption key generation with secure configuration
  - Comment: "in production, this should come from secure config"
  - Need to provide encryption key from secure environment variable or key management system

### 4. Blockchain Client ABI Configuration

**Blockchain Client** (`packages/backend/src/blockchain/index.ts`):
- [ ] **Line 2-4**: Implement proper ABI handling with abi-wan-kanabi v2
  - Current TODO: "Get the abi of the contract, and use the v2 of this so you get ABI typing"
  - Need to replace manual ABI with typed contract interface

### 5. Batch Processing Improvements

**Batch Module** (`packages/backend/src/batch/index.ts`):
- [ ] **Line 306-308**: Replace batch ID extraction logic with proper blockchain integration
  - Comment: "For now, we'll use a simple approach - in production, this should be retrieved from the transaction receipt"
  - Need to get actual batch ID from blockchain transaction receipt

## 🚧 Incomplete Implementations

### 1. Missing Property-Based Tests (Optional but Recommended)

The following property-based tests are marked as optional (`*`) but provide important correctness guarantees:

**Cryptographic Module**:
- [ ] 2.2 Write property test for commitment computation (Property 1)
- [ ] 2.5 Write property test for encryption round-trip (Property 2)
- [ ] 2.7 Write property test for signature verification (Property 3)

**Merkle Tree Module**:
- [ ] 3.4 Write property test for merkle proof correctness (Property 5)
- [ ] 3.5 Write property test for merkle root uniqueness (Property 6)

**IPFS Module**:
- [ ] 4.2 Write property test for IPFS storage round-trip (Property 8)
- [ ] 4.3 Write unit tests for IPFS error handling

**Smart Contract**:
- [ ] 5.5 Write property test for organization registration integrity (Property 10)
- [ ] 5.6 Write property test for batch creation consistency (Property 11)
- [ ] 5.7 Write property test for revocation state consistency (Property 12)

**Blockchain Client**:
- [ ] 7.6 Write property test for onchain data persistence (Property 13)
- [ ] 7.7 Write unit tests for blockchain client error handling

**Batch Processing**:
- [ ] 8.3 Write property test for per-holder package completeness (Property 7)
- [ ] 8.5 Write property test for batch processing atomicity (Property 9)
- [ ] 8.6 Write unit tests for batch processing error scenarios

**API Endpoints**:
- [ ] 9.5 Write property test for API error handling (Property 20)
- [ ] 9.6 Write unit tests for API endpoints

### 2. Unimplemented Components

**Verifier Web App** (Next.js):
- [ ] 11.1 Set up Next.js project structure
- [ ] 11.2 Create verification logic module
- [ ] 11.3 Implement main verifyCredential function
- [ ] 11.4-11.6 Write property tests for verification flow

**Verifier UI Components**:
- [ ] 12.1 Create credential submission form
- [ ] 12.2 Create verification results display
- [ ] 12.3-12.4 Write tests for UI components

**Holder Utilities** (Optional helper library):
- [ ] 13.1 Create credential decryption utilities
- [ ] 13.2 Create compact package builder
- [ ] 13.3 Write unit tests for holder utilities

**Integration Testing**:
- [ ] 14.1 Write end-to-end issuance flow test
- [ ] 14.2 Write end-to-end verification flow test
- [ ] 14.3 Write revocation flow test
- [ ] 14.4 Write batch processing integration test

## 🔒 Security & Production Hardening

### 1. Key Management
- [ ] Implement secure key storage for IPFS encryption keys
- [ ] Set up proper Starknet account management for production
- [ ] Implement key rotation mechanisms
- [ ] Add hardware security module (HSM) support for critical keys

### 2. Authentication & Authorization
- [ ] Implement organization authentication system
- [ ] Add API key management for issuer organizations
- [ ] Implement role-based access control (RBAC)
- [ ] Add rate limiting and API quotas

### 3. Monitoring & Logging
- [ ] Implement structured logging with correlation IDs
- [ ] Add performance monitoring and metrics
- [ ] Set up error tracking and alerting
- [ ] Implement audit logging for all credential operations

### 4. Network Security
- [ ] Configure HTTPS/TLS for all endpoints
- [ ] Implement proper CORS policies for production domains
- [ ] Add request validation and sanitization
- [ ] Implement DDoS protection

## 📋 Deployment Requirements

### 1. Infrastructure
- [ ] Set up production Starknet node or reliable RPC provider
- [ ] Configure production IPFS infrastructure (Pinata production account)
- [ ] Set up load balancing and auto-scaling
- [ ] Implement database for organization management (if needed)

### 2. Smart Contract Deployment
- [ ] Deploy contracts to Starknet mainnet
- [ ] Verify contract source code
- [ ] Set up contract upgrade mechanisms
- [ ] Configure contract ownership and governance

### 3. CI/CD Pipeline
- [ ] Set up automated testing pipeline
- [ ] Implement security scanning (SAST/DAST)
- [ ] Configure automated deployment with rollback capabilities
- [ ] Set up environment promotion (dev → staging → prod)

## 🧪 Testing & Quality Assurance

### 1. Test Coverage
- [ ] Achieve 80%+ code coverage across all modules
- [ ] Implement integration tests with real blockchain/IPFS
- [ ] Add performance and load testing
- [ ] Implement security penetration testing

### 2. Property-Based Testing
- [ ] Complete all 21 correctness properties from design document
- [ ] Run property tests with 1000+ iterations for production confidence
- [ ] Add fuzzing tests for input validation
- [ ] Implement chaos engineering tests

## 📚 Documentation

### 1. Production Documentation
- [ ] Create deployment guide
- [ ] Write operational runbooks
- [ ] Document disaster recovery procedures
- [ ] Create API documentation for integrators

### 2. Security Documentation
- [ ] Document threat model and security assumptions
- [ ] Create incident response procedures
- [ ] Write security audit reports
- [ ] Document compliance requirements (if applicable)

## ⚠️ Known Issues & Limitations

### 1. Current Limitations
- Mock client implementations in API routes will fail in production
- Hardcoded organization ID in batch processing
- Default random encryption keys in IPFS client
- Missing ABI typing for smart contract interactions

### 2. Performance Considerations
- Batch processing performance with large batches (1000+ credentials)
- IPFS storage latency and reliability
- Blockchain transaction confirmation times
- Merkle tree construction optimization for large datasets

---

## Priority Levels

**🔴 Critical (Must fix before production)**:
- Client dependency injection in API routes
- Environment variable configuration
- IPFS encryption key management
- Smart contract ABI implementation

**🟡 Important (Should fix before production)**:
- Authentication and authorization system
- Monitoring and logging
- Security hardening
- Integration testing

**🟢 Nice to have (Can be addressed post-launch)**:
- Property-based tests (optional tasks)
- Holder utilities library
- Advanced monitoring features
- Performance optimizations

---

*Last updated: February 2026*
*Review this document regularly and update as items are completed.*