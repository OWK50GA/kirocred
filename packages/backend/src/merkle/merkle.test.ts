import { buildTree, getRoot, getProof, verifyProof, MerkleTree } from './index';
import crypto from 'crypto';

// Helper to generate test commitment hashes
function generateCommitment(data: string): string {
  return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}

describe('Merkle Tree Builder', () => {
  describe('buildTree', () => {
    it('should build tree from single commitment', () => {
      const commitments = [generateCommitment('leaf1')];
      const tree = buildTree(commitments);
      
      expect(tree.leaves).toEqual(commitments);
      expect(tree.layers.length).toBe(1);
      expect(tree.layers[0]).toEqual(commitments);
    });
    
    it('should build tree from two commitments', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2')
      ];
      const tree = buildTree(commitments);
      
      expect(tree.leaves).toEqual(commitments);
      expect(tree.layers.length).toBe(2);
      expect(tree.layers[0]).toEqual(commitments);
      expect(tree.layers[1].length).toBe(1); // Root
    });
    
    it('should build tree from four commitments', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2'),
        generateCommitment('leaf3'),
        generateCommitment('leaf4')
      ];
      const tree = buildTree(commitments);
      
      expect(tree.leaves).toEqual(commitments);
      expect(tree.layers.length).toBe(3); // Leaves, intermediate, root
      expect(tree.layers[0].length).toBe(4);
      expect(tree.layers[1].length).toBe(2);
      expect(tree.layers[2].length).toBe(1);
    });
    
    it('should handle odd number of commitments', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2'),
        generateCommitment('leaf3')
      ];
      const tree = buildTree(commitments);
      
      expect(tree.leaves).toEqual(commitments);
      expect(tree.layers.length).toBe(3);
      expect(tree.layers[0].length).toBe(3);
      expect(tree.layers[1].length).toBe(2); // Last leaf duplicated
      expect(tree.layers[2].length).toBe(1);
    });
    
    it('should throw error for empty commitments array', () => {
      expect(() => buildTree([])).toThrow('Cannot build merkle tree from empty commitments array');
    });
  });
  
  describe('getRoot', () => {
    it('should return root from single leaf tree', () => {
      const commitments = [generateCommitment('leaf1')];
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      
      expect(root).toBe(commitments[0]);
    });
    
    it('should return root from multi-leaf tree', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2'),
        generateCommitment('leaf3'),
        generateCommitment('leaf4')
      ];
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      
      expect(root).toBeDefined();
      expect(root.startsWith('0x')).toBe(true);
      expect(root.length).toBe(66); // 0x + 64 hex chars
    });
  });
  
  describe('getProof', () => {
    it('should generate proof for single leaf tree', () => {
      const commitments = [generateCommitment('leaf1')];
      const tree = buildTree(commitments);
      const proof = getProof(tree, 0);
      
      expect(proof.pathElements).toEqual([]);
      expect(proof.pathIndices).toEqual([]);
    });
    
    it('should generate proof for two leaf tree', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2')
      ];
      const tree = buildTree(commitments);
      
      const proof0 = getProof(tree, 0);
      expect(proof0.pathElements.length).toBe(1);
      expect(proof0.pathIndices.length).toBe(1);
      expect(proof0.pathElements[0]).toBe(commitments[1]);
      expect(proof0.pathIndices[0]).toBe(1); // Sibling on right
      
      const proof1 = getProof(tree, 1);
      expect(proof1.pathElements.length).toBe(1);
      expect(proof1.pathIndices.length).toBe(1);
      expect(proof1.pathElements[0]).toBe(commitments[0]);
      expect(proof1.pathIndices[0]).toBe(0); // Sibling on left
    });
    
    it('should generate proof for four leaf tree', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2'),
        generateCommitment('leaf3'),
        generateCommitment('leaf4')
      ];
      const tree = buildTree(commitments);
      
      const proof0 = getProof(tree, 0);
      expect(proof0.pathElements.length).toBe(2);
      expect(proof0.pathIndices.length).toBe(2);
    });
    
    it('should throw error for invalid leaf index', () => {
      const commitments = [generateCommitment('leaf1'), generateCommitment('leaf2')];
      const tree = buildTree(commitments);
      
      expect(() => getProof(tree, -1)).toThrow('Invalid leaf index');
      expect(() => getProof(tree, 2)).toThrow('Invalid leaf index');
    });
  });
  
  describe('verifyProof', () => {
    it('should verify proof for single leaf tree', () => {
      const commitments = [generateCommitment('leaf1')];
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      const proof = getProof(tree, 0);
      
      const isValid = verifyProof(commitments[0], proof.pathElements, proof.pathIndices, root);
      expect(isValid).toBe(true);
    });
    
    it('should verify proof for two leaf tree', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2')
      ];
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      
      const proof0 = getProof(tree, 0);
      const isValid0 = verifyProof(commitments[0], proof0.pathElements, proof0.pathIndices, root);
      expect(isValid0).toBe(true);
      
      const proof1 = getProof(tree, 1);
      const isValid1 = verifyProof(commitments[1], proof1.pathElements, proof1.pathIndices, root);
      expect(isValid1).toBe(true);
    });
    
    it('should verify proof for four leaf tree', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2'),
        generateCommitment('leaf3'),
        generateCommitment('leaf4')
      ];
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      
      for (let i = 0; i < commitments.length; i++) {
        const proof = getProof(tree, i);
        const isValid = verifyProof(commitments[i], proof.pathElements, proof.pathIndices, root);
        expect(isValid).toBe(true);
      }
    });
    
    it('should verify proof for odd number of leaves', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2'),
        generateCommitment('leaf3')
      ];
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      
      for (let i = 0; i < commitments.length; i++) {
        const proof = getProof(tree, i);
        const isValid = verifyProof(commitments[i], proof.pathElements, proof.pathIndices, root);
        expect(isValid).toBe(true);
      }
    });
    
    it('should reject invalid proof with wrong leaf', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2')
      ];
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      const proof = getProof(tree, 0);
      
      const wrongLeaf = generateCommitment('wrong');
      const isValid = verifyProof(wrongLeaf, proof.pathElements, proof.pathIndices, root);
      expect(isValid).toBe(false);
    });
    
    it('should reject invalid proof with wrong root', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2')
      ];
      const tree = buildTree(commitments);
      const proof = getProof(tree, 0);
      
      const wrongRoot = generateCommitment('wrongroot');
      const isValid = verifyProof(commitments[0], proof.pathElements, proof.pathIndices, wrongRoot);
      expect(isValid).toBe(false);
    });
    
    it('should reject proof with mismatched pathElements and pathIndices', () => {
      const commitments = [generateCommitment('leaf1'), generateCommitment('leaf2')];
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      
      const isValid = verifyProof(commitments[0], ['0xabc'], [0, 1], root);
      expect(isValid).toBe(false);
    });
    
    it('should reject proof with tampered pathElements', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2'),
        generateCommitment('leaf3'),
        generateCommitment('leaf4')
      ];
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      const proof = getProof(tree, 0);
      
      // Tamper with proof
      proof.pathElements[0] = generateCommitment('tampered');
      
      const isValid = verifyProof(commitments[0], proof.pathElements, proof.pathIndices, root);
      expect(isValid).toBe(false);
    });
  });
  
  describe('Integration tests', () => {
    it('should handle large tree with 100 leaves', () => {
      const commitments = Array.from({ length: 100 }, (_, i) => 
        generateCommitment(`leaf${i}`)
      );
      
      const tree = buildTree(commitments);
      const root = getRoot(tree);
      
      // Verify random leaves
      const indicesToTest = [0, 25, 50, 75, 99];
      for (const index of indicesToTest) {
        const proof = getProof(tree, index);
        const isValid = verifyProof(commitments[index], proof.pathElements, proof.pathIndices, root);
        expect(isValid).toBe(true);
      }
    });
    
    it('should produce deterministic roots for same commitments', () => {
      const commitments = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2'),
        generateCommitment('leaf3')
      ];
      
      const tree1 = buildTree(commitments);
      const tree2 = buildTree(commitments);
      
      expect(getRoot(tree1)).toBe(getRoot(tree2));
    });
    
    it('should produce different roots for different commitments', () => {
      const commitments1 = [
        generateCommitment('leaf1'),
        generateCommitment('leaf2')
      ];
      
      const commitments2 = [
        generateCommitment('leaf1'),
        generateCommitment('leaf3')
      ];
      
      const tree1 = buildTree(commitments1);
      const tree2 = buildTree(commitments2);
      
      expect(getRoot(tree1)).not.toBe(getRoot(tree2));
    });
  });
});
