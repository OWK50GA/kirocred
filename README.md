# Kirocred - Zero-Knowledge Credential System

A privacy-preserving credential issuance and verification system built on Starknet.

## Project Structure

```
kirocred/
├── packages/
│   ├── backend/          # Issuer Backend (TypeScript/Express)
│   ├── frontend/         # Verifier Web App (Next.js)
│   └── contracts/        # Smart Contracts (Cairo/Starknet)
└── package.json          # Monorepo root
```

## Prerequisites

- Node.js >= 18
- npm >= 9
- Scarb (Cairo package manager) - [Installation Guide](https://docs.swmansion.com/scarb/download.html)
- Starknet Foundry (for contract testing) - [Installation Guide](https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html)

## Installation

```bash
# Install dependencies for all packages
npm install

# Verify setup (checks all tools and configurations)
npm run verify-setup

# Set up environment variables
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Build all packages
npm run build
```

## Configuration

### Backend Configuration

Edit `packages/backend/.env`:
- `STARKNET_RPC_URL`: Starknet RPC endpoint
- `STARKNET_ACCOUNT_ADDRESS`: Issuer's Starknet account address
- `STARKNET_PRIVATE_KEY`: Issuer's private key
- `IPFS_API_URL`: IPFS API endpoint (default: local node)
- `CONTRACT_ADDRESS`: Deployed smart contract address

### Frontend Configuration

Edit `packages/frontend/.env`:
- `NEXT_PUBLIC_STARKNET_RPC_URL`: Starknet RPC endpoint
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: Deployed smart contract address
- `NEXT_PUBLIC_IPFS_GATEWAY_URL`: IPFS gateway for retrieving credentials

## Development

```bash
# Run backend in development mode
npm run dev:backend

# Run frontend in development mode
npm run dev:frontend

# Build contracts
cd packages/contracts && scarb build
```

## Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend

# Run contract tests
cd packages/contracts && snforge test
```

### Testing Frameworks

- **Backend & Frontend**: Jest with fast-check for property-based testing
- **Contracts**: Starknet Foundry (snforge) with property testing support
- **Coverage**: 80% minimum threshold for all packages

## Architecture

- **Issuer Backend**: Issues verifiable credentials, manages batch processing, and interacts with blockchain
- **Verifier Web App**: Provides UI for credential verification
- **Smart Contract**: Manages soulbound NFTs and stores verification data onchain

For detailed information, see:
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [Dependencies](docs/DEPENDENCIES.md)
- [Requirements](.kiro/specs/kirocred-credential-system/requirements.md)
- [Design Document](.kiro/specs/kirocred-credential-system/design.md)

## License

MIT
