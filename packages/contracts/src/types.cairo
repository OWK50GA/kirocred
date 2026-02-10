use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, PartialEq, starknet::Store)]
pub enum OrganizationStatus {
    #[default]
    NOT_EXISTING,
    CREATED,
    VERIFIED,
    // ACTIVE,
    SUSPENDED,
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct Organization {
    pub org_id: u64,
    // pub name: felt252,
    pub issuer_address: ContractAddress,
    pub issuer_pubkey: felt252,
    // pub contact_email: felt252,
    pub created_at: u64,
    pub last_active_at: u64,
    pub status: OrganizationStatus,
    pub batches_count: u64,
}

#[generate_trait]
impl OrganizationImpl of OrganizationTrait {
    fn default() -> Organization {
        Organization {
            org_id: 0,
            // name: 0,
            issuer_address: 0.try_into().unwrap(),
            issuer_pubkey: 0,
            // contact_email: 0,
            created_at: 0,
            last_active_at: 0,
            status: OrganizationStatus::NOT_EXISTING,
            batches_count: 0,
        }
    }
}

#[derive(Clone, Drop, Serde, starknet::Store, PartialEq)]
pub enum BatchType {
    #[default]
    BATCH,
    SINGLETON,
    // CONTINUOUS_BATCH,
    // For this type, (Continuous batch) the merkle root, as well as the path elements and indices,
    // and data being updated is continuously recomputed. I expect it to be the most often used.
    // Verify if this method is secure, we designed for batch first, sorry
}

#[derive(Clone, Drop, Serde, starknet::Store, PartialEq)]
pub enum BatchStatus {
    #[default]
    ACTIVE,
    REVOKED,
}

#[derive(Clone, Drop, Serde, starknet::Store, PartialEq)]
pub struct Batch {
    pub id: u64,
    pub org_id: u64,
    pub holders: u64,
    // pub description: ByteArray,
    pub merkle_root: felt252,
    pub batchType: BatchType,
    pub created_at: u64,
    pub issued_at: u64, // started issuing at is more accurate
    pub expires_at: u64, // This credential expires at x time
    pub total_issued: u64,
    pub status: BatchStatus,
    pub onchain_tx: felt252 // Tx hash for the last publishRoot tx (for verifiers)
}
