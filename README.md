# Kirocred

A privacy-preserving credential issuance and verification system built on Starknet.

Kirocred allows organizations to issue verifiable credentials — certificates, tickets, badges — to holders in a way that keeps the credential contents private, while still allowing holders to prove authenticity to any verifier.

---

## How It Works

### Issuance

When an organization issues a batch of credentials (e.g. graduation certificates for a cohort):

1. Each credential's attributes are hashed with SHA-256 alongside a per-attribute salt, producing a commitment: `H(credId || holderPubkey || attributesHash || salt)`
2. All commitments in the batch are assembled into a **Merkle tree**
3. The **Merkle root** is published on-chain via a Starknet smart contract, alongside the issuer's public key and batch metadata
4. The actual credential attributes are **AES-GCM encrypted** with a randomly generated symmetric key
5. That symmetric key is **encrypted to the holder's public key** using ECDH on the STARK curve, so only the holder can decrypt it
6. The full encrypted package (ciphertext, IV, auth tag, Merkle proof, encrypted key, issuer signature) is stored on **IPFS**
7. The holder's IPFS CID is stored in a registry, indexed by a hash of their public key, so they can retrieve it later without any notification

No NFTs are minted. There is no public on-chain link between a holder's identity and any credential.

### Retrieval

The holder derives a deterministic encryption keypair from their wallet signature. They use their public key hash to query the registry, retrieve their IPFS CID, and fetch their encrypted package directly from IPFS.

### Verification

To prove a credential to a verifier:

1. The holder decrypts the package using their private key
2. The verifier issues a **fresh nonce**
3. The holder signs the nonce with their encryption private key
4. The holder presents the package alongside the nonce signature and any attributes they choose to disclose
5. The verifier fetches the Merkle root and issuer public key from the smart contract, recomputes the Merkle root from the proof, verifies the issuer signature, verifies the holder's nonce signature, checks revocation status, and confirms any disclosed attributes match their committed hashes

The verifier learns only what the holder explicitly discloses, nothing more.

---

## Cryptographic Primitives

| Primitive | Usage |
|---|---|
| SHA-256 | Attribute hashing, commitment construction |
| Merkle tree | Batch inclusion proofs |
| AES-256-GCM | Credential attribute encryption |
| ECDH (STARK curve) | Shared secret for key encapsulation |
| ECDSA (STARK curve) | Issuer signatures, holder nonce signatures |
| Poseidon hash | On-chain commitment hashing (Cairo) |

---

## What This Is and Is Not

Kirocred uses **cryptographic commitments + Merkle proofs + public-key encryption**, not zero-knowledge proofs.

This means:
- Verification is fast and cheap — no ZK proof generation on the client
- No trusted setup required
- Standard, auditable cryptographic primitives throughout
- Verifiers see the actual values of any attributes the holder discloses — there are no predicate proofs (e.g. "age > 18" without revealing the age)

---

## Architecture

```
kirocred/
├── packages/
│   ├── backend/       # Issuer backend (TypeScript/Express)
│   ├── frontend/      # Holder + verifier web app (Next.js)
│   └── contracts/     # Smart contracts (Cairo/Starknet)
```

**Issuer Backend** — REST API for credential issuance, batch processing, Merkle tree construction, IPFS storage, and on-chain publication.

**Frontend** — Holder interface for key derivation, credential retrieval, and proof generation. Verifier interface for credential verification.

**Smart Contract** — Stores Merkle roots, issuer public keys, batch metadata, and revocation status on Starknet.

---

## Setup

### Prerequisites

- Node.js >= 18
- npm >= 9
- Scarb (Cairo package manager) — [Installation Guide](https://docs.swmansion.com/scarb/download.html)
- Starknet Foundry — [Installation Guide](https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html)

### Install

```bash
npm install
```

### Configure

```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

Backend environment variables:

| Variable | Description |
|---|---|
| `STARKNET_RPC_URL` | Starknet RPC endpoint |
| `STARKNET_ACCOUNT_ADDRESS` | Issuer's Starknet account address |
| `STARKNET_PRIVATE_KEY` | Issuer's private key |
| `IPFS_API_URL` | Pinata API URL |
| `CONTRACT_ADDRESS` | Deployed smart contract address |
| `DATABASE_URL` | PostgreSQL connection string |

### Run

```bash
# Backend
npm run dev:backend

# Frontend
npm run dev:frontend

# Build contracts
cd packages/contracts && scarb build
```

---

## Testing

```bash
npm test                          # All tests
npm run test:backend              # Backend only
npm run test:frontend             # Frontend only
cd packages/contracts && snforge test  # Contracts
```

---

## License

MIT