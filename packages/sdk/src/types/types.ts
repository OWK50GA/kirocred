export type HexString = `0x${string}`;

export type Attributes = Record<string, any>;

export type MerkleProof = {
  leaf: HexString;
  pathElements: HexString[]; // siblings
  pathIndices: number[]; // 0 or 1 each
};

export type BatchProof = {
  root: HexString;
  proofs: Record<string, MerkleProof>; // map credentialId -> proof
};
