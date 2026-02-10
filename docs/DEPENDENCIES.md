# Dependencies Documentation

This document provides an overview of all dependencies used in the Kirocred project.

## Backend Dependencies (@kirocred/backend)

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | Web framework for REST API endpoints |
| `cors` | ^2.8.5 | Enable CORS for API access |
| `starknet` | ^6.0.0 | Starknet blockchain interaction library |
| `uuid` | ^9.0.1 | Generate UUIDs for credential and batch IDs |
| `pinata` | ^2.5.3 | IPFS client for decentralized storage |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.9.3 | TypeScript compiler |
| `tsx` | ^4.7.0 | TypeScript execution for development |
| `jest` | ^29.7.0 | Testing framework |
| `ts-jest` | ^29.1.1 | Jest TypeScript preprocessor |
| `fast-check` | ^3.15.0 | Property-based testing library |
| `@types/*` | Various | TypeScript type definitions |

## Frontend Dependencies (@kirocred/frontend)

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^16.1.6 | React framework for web application |
| `react` | ^19.2.4 | UI library |
| `react-dom` | ^19.2.4 | React DOM rendering |
| `starknet` | ^9.2.1 | Starknet blockchain queries |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.9.3 | TypeScript compiler |
| `jest` | ^29.7.0 | Testing framework |
| `jest-environment-jsdom` | ^29.7.0 | DOM environment for Jest |
| `@testing-library/react` | ^14.1.2 | React testing utilities |
| `@testing-library/jest-dom` | ^6.1.5 | Custom Jest matchers for DOM |
| `fast-check` | ^3.15.0 | Property-based testing library |
| `@types/*` | Various | TypeScript type definitions |

## Contract Dependencies (@kirocred/contracts)

### Cairo Dependencies (Scarb.toml)

| Package | Version | Purpose |
|---------|---------|---------|
| `starknet` | 2.13.1 | Starknet core library |
| `openzeppelin` | 2.0.0 | OpenZeppelin contracts for Cairo (ERC-721) |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `snforge_std` | 0.52.0 | Starknet Foundry testing library |
| `assert_macros` | 2.13.1 | Assertion macros for testing |

## System Requirements

### Required Tools

- **Node.js**: >= 18.0.0
  - JavaScript runtime for backend and frontend
  - Download: https://nodejs.org/

- **npm**: >= 9.0.0
  - Package manager (comes with Node.js)

- **Scarb**: >= 2.13.1
  - Cairo package manager and build tool
  - Installation: https://docs.swmansion.com/scarb/download.html

- **Starknet Foundry**: >= 0.52.0
  - Testing framework for Cairo contracts
  - Installation: https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html

## Cryptographic Libraries

The project uses built-in and library-provided cryptographic primitives:

- **Node.js crypto module**: Built-in module for AES-GCM encryption, random number generation
- **starknet.js**: Provides Starknet-compatible cryptographic functions (signatures, hashing)
- **Cairo stdlib**: Provides Poseidon hash and other Starknet-native cryptographic primitives

## Testing Frameworks

### TypeScript (Backend & Frontend)

- **Jest**: Unit testing framework
  - Configuration: `jest.config.js` in each package
  - Coverage threshold: 80% for all metrics

- **fast-check**: Property-based testing
  - Minimum 100 iterations per property test
  - Used for cryptographic and algorithmic correctness

### Cairo (Contracts)

- **Starknet Foundry (snforge)**: Contract testing framework
  - Configuration: `Scarb.toml`
  - Supports unit tests and integration tests

## Development Tools

- **tsx**: Fast TypeScript execution for development
- **TypeScript**: Static type checking and compilation
- **Next.js**: Development server with hot reload for frontend

## Optional Dependencies

These dependencies may be added as development progresses:

- Additional cryptographic libraries if needed
- Monitoring and logging libraries
- Additional testing utilities

## Dependency Management

### Installing Dependencies

```bash
# Install all dependencies
npm install

# Install backend dependencies only
npm install -w @kirocred/backend

# Install frontend dependencies only
npm install -w @kirocred/frontend
```

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Update specific package
npm update <package-name> -w <workspace>
```

### Security Audits

```bash
# Run security audit
npm audit

# Fix vulnerabilities automatically
npm audit fix
```

## Version Pinning Strategy

- **Production dependencies**: Use caret (^) for minor version updates
- **Development dependencies**: Use caret (^) for flexibility
- **Cairo dependencies**: Use exact versions for stability
- **Critical security packages**: Pin exact versions when necessary
