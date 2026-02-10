use starknet::SyscallResultTrait;
use kirocred_contracts::ikirocred::{IKirocredContractDispatcher, IKirocredContractDispatcherTrait};
use kirocred_contracts::types::BatchType;
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare,
    start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::ContractAddress;

fn owner() -> ContractAddress {
    'owner'.try_into().unwrap()
}

fn get_address(name: felt252) -> ContractAddress {
    name.try_into().unwrap()
}

fn deploy_contract() -> (IKirocredContractDispatcher, ContractAddress) {
    let contract = declare("Kirocred").unwrap_syscall().contract_class();
    let owner: ContractAddress = owner();

    let mut constructor_calldata = array![owner.into()];
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap_syscall();

    (IKirocredContractDispatcher { contract_address }, owner)
}

// ============================================================================
// Organization Management Tests
// ============================================================================

#[test]
fn test_create_organization() {
    let (contract, _owner) = deploy_contract();
    let org_address: ContractAddress = get_address('org1');
    let org_pubkey: felt252 = 'pubkey123';

    start_cheat_caller_address(contract.contract_address, org_address);
    contract.create_org(org_address, org_pubkey);
    stop_cheat_caller_address(contract.contract_address);

    // Verify org was created by checking issuer public key retrieval works
    // (We'd need a get_org function to fully verify, but this tests basic creation)
}

#[test]
#[should_panic(expected: ('Org already exists',))]
fn test_create_organization_duplicate() {
    let (contract, _owner) = deploy_contract();
    let org_address: ContractAddress = get_address('org1');
    let org_pubkey: felt252 = 'pubkey123';

    start_cheat_caller_address(contract.contract_address, org_address);
    contract.create_org(org_address, org_pubkey);
    contract.create_org(org_address, org_pubkey); // Should fail
}

// ============================================================================
// Batch Management Tests
// ============================================================================

#[test]
fn test_create_batch() {
    let (contract, owner) = deploy_contract();
    let org_address: ContractAddress = get_address('org1');
    let org_pubkey: felt252 = 'pubkey123';

    // Create organization first
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.create_org(org_address, org_pubkey);
    stop_cheat_caller_address(contract.contract_address);

    // Create batch
    start_cheat_caller_address(contract.contract_address, owner);
    contract.create_batch(BatchType::BATCH, 1); // org_id = 1
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_create_batch_unauthorized() {
    let (contract, _owner) = deploy_contract();
    let unauthorized: ContractAddress = get_address('org1');

    start_cheat_caller_address(contract.contract_address, unauthorized);
    contract.create_batch(BatchType::BATCH, 1);
}

#[test]
fn test_store_merkle_root() {
    let (contract, owner) = deploy_contract();
    let org_address: ContractAddress = get_address('org1');
    let org_pubkey: felt252 = 'pubkey123';
    let merkle_root: felt252 = 'root123';

    // Create organization
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.create_org(org_address, org_pubkey);
    stop_cheat_caller_address(contract.contract_address);

    // Create batch
    start_cheat_caller_address(contract.contract_address, owner);
    contract.create_batch(BatchType::BATCH, 1);
    
    // Store merkle root
    contract.store_merkle_root(1, merkle_root); // batch_id = 1
    stop_cheat_caller_address(contract.contract_address);

    // Verify
    assert(contract.get_merkle_root(1) == merkle_root, 'Merkle root mismatch');
    assert(contract.get_issuer_public_key(1) == org_pubkey, 'Issuer pubkey mismatch');
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_store_merkle_root_unauthorized() {
    let (contract, _owner) = deploy_contract();
    let unauthorized: ContractAddress = get_address('org1');

    start_cheat_caller_address(contract.contract_address, unauthorized);
    contract.store_merkle_root(1, 'root123');
}

#[test]
fn test_get_merkle_root_nonexistent() {
    let (contract, _owner) = deploy_contract();
    let result = contract.get_merkle_root(999);
    assert(result == 0, 'Should return 0 for nonexistent');
}

// ============================================================================
// Revocation Tests (Privacy-Preserving)
// ============================================================================

#[test]
fn test_revoke_credential_by_commitment() {
    let (contract, owner) = deploy_contract();
    let org_address: ContractAddress = get_address('org1');
    let org_pubkey: felt252 = 'pubkey123';
    let commitment: felt252 = 'commitment_hash_123';

    // Create organization
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.create_org(org_address, org_pubkey);
    stop_cheat_caller_address(contract.contract_address);

    // Create batch
    start_cheat_caller_address(contract.contract_address, owner);
    contract.create_batch(BatchType::BATCH, 1);
    stop_cheat_caller_address(contract.contract_address);

    // Verify not revoked initially
    assert(!contract.is_revoked(commitment, 1), 'Should not be revoked');

    // Revoke credential (only issuer can revoke)
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.revoke(commitment, 1);
    stop_cheat_caller_address(contract.contract_address);

    // Verify revoked
    assert(contract.is_revoked(commitment, 1), 'Should be revoked');
}

#[test]
#[should_panic(expected: ('Only issuer can revoke',))]
fn test_revoke_unauthorized() {
    let (contract, owner) = deploy_contract();
    let org_address: ContractAddress = get_address('org1');
    let org_pubkey: felt252 = 'pubkey123';
    let unauthorized: ContractAddress = get_address('unauthorized');
    let commitment: felt252 = 'commitment_hash_123';

    // Create organization
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.create_org(org_address, org_pubkey);
    stop_cheat_caller_address(contract.contract_address);

    // Create batch
    start_cheat_caller_address(contract.contract_address, owner);
    contract.create_batch(BatchType::BATCH, 1);
    stop_cheat_caller_address(contract.contract_address);

    // Try to revoke from unauthorized address
    start_cheat_caller_address(contract.contract_address, unauthorized);
    contract.revoke(commitment, 1); // Should fail
}

#[test]
fn test_is_revoked_false_for_nonexistent() {
    let (contract, _owner) = deploy_contract();
    let commitment: felt252 = 'nonexistent_commitment';
    assert(!contract.is_revoked(commitment, 999), 'Nonexistent should return false');
}

#[test]
fn test_multiple_commitments_same_batch() {
    let (contract, owner) = deploy_contract();
    let org_address: ContractAddress = get_address('org1');
    let org_pubkey: felt252 = 'pubkey123';
    let commitment1: felt252 = 'commitment1';
    let commitment2: felt252 = 'commitment2';

    // Setup
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.create_org(org_address, org_pubkey);
    stop_cheat_caller_address(contract.contract_address);

    start_cheat_caller_address(contract.contract_address, owner);
    contract.create_batch(BatchType::BATCH, 1);
    stop_cheat_caller_address(contract.contract_address);

    // Revoke only commitment1
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.revoke(commitment1, 1);
    stop_cheat_caller_address(contract.contract_address);

    // Verify
    assert(contract.is_revoked(commitment1, 1), 'Commitment1 correctly revoked');
    assert(!contract.is_revoked(commitment2, 1), 'Commitment2 wrongly revoked');
}

// ============================================================================
// Integration Tests
// ============================================================================

#[test]
fn test_full_credential_lifecycle() {
    let (contract, owner) = deploy_contract();
    let org_address: ContractAddress = get_address('university');
    let org_pubkey: felt252 = 'university_pubkey';
    let merkle_root: felt252 = 'batch_root_2024';
    let commitment: felt252 = 'student_credential_hash';

    // 1. Create organization
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.create_org(org_address, org_pubkey);
    stop_cheat_caller_address(contract.contract_address);

    // 2. Create batch
    start_cheat_caller_address(contract.contract_address, owner);
    contract.create_batch(BatchType::BATCH, 1);
    
    // 3. Store merkle root
    contract.store_merkle_root(1, merkle_root);
    stop_cheat_caller_address(contract.contract_address);

    // 4. Verify credential is valid (not revoked)
    assert(!contract.is_revoked(commitment, 1), 'Should not be revoked initially');
    assert(contract.get_merkle_root(1) == merkle_root, 'Root should match');
    assert(contract.get_issuer_public_key(1) == org_pubkey, 'Pubkey should match');

    // 5. Revoke credential
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.revoke(commitment, 1);
    stop_cheat_caller_address(contract.contract_address);

    // 6. Verify revocation
    assert(contract.is_revoked(commitment, 1), 'Should be revoked');
}

#[test]
fn test_multiple_batches_same_org() {
    let (contract, owner) = deploy_contract();
    let org_address: ContractAddress = get_address('org1');
    let org_pubkey: felt252 = 'pubkey123';

    // Create organization
    start_cheat_caller_address(contract.contract_address, org_address);
    contract.create_org(org_address, org_pubkey);
    stop_cheat_caller_address(contract.contract_address);

    // Create multiple batches
    start_cheat_caller_address(contract.contract_address, owner);
    contract.create_batch(BatchType::BATCH, 1); // batch_id = 1
    contract.create_batch(BatchType::BATCH, 1); // batch_id = 2
    contract.create_batch(BatchType::SINGLETON, 1); // batch_id = 3
    
    // Store different roots
    contract.store_merkle_root(1, 'root1');
    contract.store_merkle_root(2, 'root2');
    contract.store_merkle_root(3, 'root3');
    stop_cheat_caller_address(contract.contract_address);

    // Verify all batches have correct roots
    assert(contract.get_merkle_root(1) == 'root1', 'Batch 1 root mismatch');
    assert(contract.get_merkle_root(2) == 'root2', 'Batch 2 root mismatch');
    assert(contract.get_merkle_root(3) == 'root3', 'Batch 3 root mismatch');
    
    // All should have same issuer pubkey
    assert(contract.get_issuer_public_key(1) == org_pubkey, 'Batch 1 pubkey mismatch');
    assert(contract.get_issuer_public_key(2) == org_pubkey, 'Batch 2 pubkey mismatch');
    assert(contract.get_issuer_public_key(3) == org_pubkey, 'Batch 3 pubkey mismatch');
}
