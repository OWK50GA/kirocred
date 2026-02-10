# Project Structure

This document describes the organization of the Kirocred monorepo.

## Directory Layout

```
kirocred/
├── .kiro/                          # Kiro IDE configuration
│   └── specs/                      # Feature specifications
│       └── kirocred-credential-system/
│           ├── requirements.md     # System requirements
│           ├── design.md          # Design document
│           └── tasks.md           # Implementation tasks
│
├── docs/                          # Documentation
│   ├── DEPENDENCIES.md           # Dependency documentation
│   └── PROJECT_STRUCTURE.md      # This file
│
├── packages/                      # Monorepo packages
│   ├── backend/                  # Issuer Backend (TypeScript/Express)
│   │   ├── src/                 # Source code
│   │   │   ├── __tests__/      # Test files
│   │   │   ├── api/            # API endpoints
│   │   │   ├── blockchain/     # Blockchain client
│   │   │   ├── crypto/         # Cryptographic primitives
│   │   │   ├── ipfs/           # IPFS client
│   │   │   ├── merkle/         # Merkle tree builder
│   │   │   └── index.ts        # Entry point
│   │   ├── dist/               # Compiled output
│   │   ├── .env.example        # Environment template
│   │   ├── jest.config.js      # Jest configuration
│   │   ├── package.json        # Package manifest
│   │   └── tsconfig.json       # TypeScript configuration
│   │
│   ├── contracts/               # Smart Contracts (Cairo/Starknet)
│   │   ├── src/                # Contract source code
│   │   │   ├── kirocred_contract.cairo  # Main contract
│   │   │   └── lib.cairo       # Library exports
│   │   ├── tests/              # Contract tests
│   │   │   └── test_kirocred.cairo
│   │   ├── target/             # Build output
│   │   ├── Scarb.toml          # Scarb configuration
│   │   └── package.json        # Package manifest
│   │
│   └── frontend/                # Verifier Web App (Next.js)
│       ├── src/                # Source code
│       │   ├── __tests__/     # Test files
│       │   ├── app/           # Next.js app directory
│       │   │   ├── layout.tsx # Root layout
│       │   │   └── page.tsx   # Home page
│       │   └── lib/           # Utility libraries
│       │       └── verification.ts
│       ├── .next/             # Next.js build output
│       ├── .env.example       # Environment template
│       ├── jest.config.js     # Jest configuration
│       ├── jest.setup.js      # Jest setup
│       ├── next.config.js     # Next.js configuration
│       ├── package.json       # Package manifest
│       └── tsconfig.json      # TypeScript configuration
│
├── scripts/                    # Utility scripts
│   └── verify-setup.sh        # Setup verification script
│
├── .gitignore                 # Git ignore rules
├── package.json               # Root package manifest
├── package-lock.json          # Dependency lock file
└── README.md                  # Project README

```

## Package Descriptions

### Backend (@kirocred/backend)

The Issuer Backend is a TypeScript/Express server responsible for:
- Issuing verifiable credentials to holders
- Computing cryptographic commitments
- Building merkle trees for batch processing
- Encrypting credential data
- Storing encrypted packages on IPFS
- Publishing merkle roots to the blockchain
- Minting soulbound NFTs to holders
- Revoking credentials when necessary

**Key Technologies:**
- Express.js for REST API
- starknet.js for blockchain interaction
- Node.js crypto for encryption
- Pinata for IPFS storage
- Jest + fast-check for testing

### Contracts (@kirocred/contracts)

The Smart Contract is a Cairo/Starknet soulbound ERC-721 contract that:
- Manages non-transferrable credential NFTs
- Stores merkle roots for batch verification
- Stores issuer public keys for signature verification
- Tracks credential revocation status
- Provides query functions for verifiers

**Key Technologies:**
- Cairo 2.13.1
- OpenZeppelin contracts for ERC-721 base
- Starknet Foundry for testing

### Frontend (@kirocred/frontend)

The Verifier Web App is a Next.js application that:
- Provides UI for credential verification
- Fetches verification data from blockchain
- Verifies merkle proofs
- Verifies issuer and holder signatures
- Checks revocation status and ownership
- Displays verification results

**Key Technologies:**
- Next.js 16 with React 19
- starknet.js for blockchain queries
- Jest + React Testing Library for testing

## Configuration Files

### TypeScript Configuration

Each TypeScript package has its own `tsconfig.json`:
- **Backend**: Targets Node.js (CommonJS modules)
- **Frontend**: Targets browsers (ESNext modules with Next.js)

### Testing Configuration

Each package has its own `jest.config.js`:
- **Backend**: Uses `ts-jest` with Node environment
- **Frontend**: Uses Next.js Jest config with jsdom environment
- **Contracts**: Uses Scarb test configuration

### Environment Configuration

Environment variables are managed through `.env` files:
- `.env.example` files provide templates
- `.env` files (gitignored) contain actual values
- Frontend uses `NEXT_PUBLIC_` prefix for client-side variables

## Build Outputs

### Backend
- **Output**: `packages/backend/dist/`
- **Format**: CommonJS modules
- **Includes**: Type declarations (.d.ts files)

### Contracts
- **Output**: `packages/contracts/target/`
- **Format**: Sierra and CASM files
- **Includes**: Contract artifacts for deployment

### Frontend
- **Output**: `packages/frontend/.next/`
- **Format**: Optimized production build
- **Includes**: Static pages and server components

## Testing Structure

### Test Organization

Tests are co-located with source code:
- `__tests__/` directories for test files
- `*.test.ts` or `*.test.tsx` for unit tests
- `*.spec.ts` for integration tests

### Test Types

1. **Unit Tests**: Test individual functions and modules
2. **Property Tests**: Test universal properties with fast-check
3. **Integration Tests**: Test component interactions
4. **Contract Tests**: Test smart contract functionality

## Development Workflow

### Local Development

1. **Backend**: `npm run dev:backend` - Starts Express server with hot reload
2. **Frontend**: `npm run dev:frontend` - Starts Next.js dev server
3. **Contracts**: Edit and test with `snforge test`

### Building

1. **All packages**: `npm run build`
2. **Backend only**: `npm run build -w @kirocred/backend`
3. **Frontend only**: `npm run build -w @kirocred/frontend`
4. **Contracts only**: `npm run build:contracts`

### Testing

1. **All packages**: `npm test`
2. **Backend only**: `npm run test:backend`
3. **Frontend only**: `npm run test:frontend`
4. **Contracts only**: `npm run test:contracts`

## Monorepo Management

The project uses npm workspaces for monorepo management:
- Shared dependencies are hoisted to root `node_modules`
- Package-specific dependencies remain in package directories
- Scripts can target specific workspaces with `-w` flag

### Workspace Commands

```bash
# Install dependency in specific workspace
npm install <package> -w @kirocred/backend

# Run script in specific workspace
npm run <script> -w @kirocred/frontend

# Run script in all workspaces
npm run <script> --workspaces
```

## Adding New Modules

When adding new functionality:

1. **Backend modules**: Add to `packages/backend/src/`
2. **Frontend components**: Add to `packages/frontend/src/`
3. **Contract modules**: Add to `packages/contracts/src/`
4. **Tests**: Co-locate with source code in `__tests__/` or `*.test.ts`
5. **Documentation**: Update relevant docs in `docs/`

## Code Organization Principles

1. **Separation of Concerns**: Each package has a single responsibility
2. **Modularity**: Code is organized into focused modules
3. **Testability**: All code is designed to be easily testable
4. **Type Safety**: TypeScript is used throughout for type safety
5. **Documentation**: Code is documented with comments and external docs
