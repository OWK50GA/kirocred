import crypto from "crypto";

/**
 * Merkle tree data structure
 */
export interface MerkleTree {
  leaves: string[]; // Original leaf commitments
  layers: string[][]; // All layers of the tree (leaves at index 0, root at last index)
}

/**
 * Hash two nodes together for merkle tree construction
 * @param left - Left node hash
 * @param right - Right node hash
 * @returns Combined hash
 */
function hashPair(left: string, right: string): string {
  // Remove 0x prefix if present
  const leftHex = left.startsWith("0x") ? left.slice(2) : left;
  const rightHex = right.startsWith("0x") ? right.slice(2) : right;

  // Concatenate and hash
  const combined = leftHex + rightHex;
  const hashBuffer = crypto
    .createHash("sha256")
    .update(Buffer.from(combined, "hex"))
    .digest();
  return "0x" + hashBuffer.toString("hex");
}

/**
 * Build merkle tree from array of commitments
 * @param commitments - Array of commitment hashes (leaves)
 * @returns MerkleTree with all layers stored
 */
export function buildTree(commitments: string[]): MerkleTree {
  if (commitments.length === 0) {
    throw new Error("Cannot build merkle tree from empty commitments array");
  }

  // Initialize with leaves as first layer
  const layers: string[][] = [commitments];

  // Build tree layer by layer
  let currentLayer = commitments;

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];

    // Process pairs
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        // Hash pair
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
      } else {
        // Odd number of nodes - duplicate the last one
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i]));
      }
    }

    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return {
    leaves: commitments,
    layers,
  };
}

/**
 * Get merkle root from tree
 * @param tree - MerkleTree structure
 * @returns Root hash
 */
export function getRoot(tree: MerkleTree): string {
  if (tree.layers.length === 0) {
    throw new Error("Invalid merkle tree: no layers");
  }

  const rootLayer = tree.layers[tree.layers.length - 1];
  if (rootLayer.length !== 1) {
    throw new Error(
      "Invalid merkle tree: root layer should have exactly one element",
    );
  }

  console.log("Merkle root: ", rootLayer[0]);
  const rawRoot = rootLayer[0];
  console.log("Raw root: ", rawRoot);
  const cleanRoot = rawRoot.startsWith('0x') ? rawRoot.slice(2) : rawRoot
  console.log("Clean root: ", cleanRoot);

  const merkleRoot = cleanRoot.slice(0, 60);
  console.log("Merkle root: ", merkleRoot);
  return `0x${merkleRoot}`
}

/**
 * Merkle proof structure
 */
export interface MerkleProof {
  pathElements: string[]; // Sibling hashes along the path to root
  pathIndices: number[]; // 0 = left sibling, 1 = right sibling
}

/**
 * Generate merkle proof for a leaf at given index
 * @param tree - MerkleTree structure
 * @param leafIndex - Index of the leaf to generate proof for
 * @returns MerkleProof containing pathElements and pathIndices
 */
export function getProof(tree: MerkleTree, leafIndex: number): MerkleProof {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error(
      `Invalid leaf index: ${leafIndex}. Tree has ${tree.leaves.length} leaves.`,
    );
  }

  const pathElements: string[] = [];
  const pathIndices: number[] = [];

  let currentIndex = leafIndex;

  // Traverse from leaf to root (excluding root layer)
  for (let layerIndex = 0; layerIndex < tree.layers.length - 1; layerIndex++) {
    const currentLayer = tree.layers[layerIndex];

    // Determine sibling index
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

    // Get sibling hash
    if (siblingIndex < currentLayer.length) {
      pathElements.push(currentLayer[siblingIndex]);
      pathIndices.push(isRightNode ? 0 : 1); // 0 if sibling is on left, 1 if on right
    } else {
      // Odd number of nodes - sibling is the node itself (duplicated)
      pathElements.push(currentLayer[currentIndex]);
      pathIndices.push(1); // Treat as right sibling
    }

    // Move to parent index in next layer
    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    pathElements,
    pathIndices,
  };
}

/**
 * Verify merkle proof against a root
 * @param leaf - Leaf hash to verify
 * @param pathElements - Sibling hashes along the path
 * @param pathIndices - Position indicators (0 = left, 1 = right)
 * @param expectedRoot - Expected merkle root
 * @returns True if proof is valid, false otherwise
 */
export function verifyProof(
  leaf: string,
  pathElements: string[],
  pathIndices: number[],
  expectedRoot: string,
): boolean {
  if (pathElements.length !== pathIndices.length) {
    return false;
  }

  // Handle edge case: single leaf tree
  if (pathElements.length === 0) {
    return leaf === expectedRoot;
  }

  let currentHash = leaf;

  // Traverse path to root
  for (let i = 0; i < pathElements.length; i++) {
    const sibling = pathElements[i];
    const isRightSibling = pathIndices[i] === 1;

    if (isRightSibling) {
      // Current node is on left, sibling on right
      currentHash = hashPair(currentHash, sibling);
    } else {
      // Current node is on right, sibling on left
      currentHash = hashPair(sibling, currentHash);
    }
  }

  return currentHash === expectedRoot;
}
