use starknet::ContractAddress;
// use crate::types::BatchType;

#[starknet::interface]
pub trait IKirocredContract<TContractState> {
    // Batch and merkle root storage
    fn store_merkle_root(
        ref self: TContractState, batch_id: u64, merkle_root: felt252 // issuer_public_key: felt252,
        // description: felt252,
    // purpose: felt252,
    // issued_by: felt252,
    );
    fn create_org(
        ref self: TContractState, org_address: ContractAddress, 
        // signature: (felt252, felt252),
    );
    // This is mainly for continuous batches. Batches issued at once will do everything in one
    // function
    fn create_batch(
        ref self: TContractState, batch_type: u8, org_id: u64,
    ); // 0 means BATCH, 1 means singleton

    fn get_merkle_root(self: @TContractState, batch_id: u64) -> felt252;
    fn get_issuer_address(self: @TContractState, batch_id: u64) -> ContractAddress;
    fn get_org_by_address(
        self: @TContractState, org_address: ContractAddress,
    ) -> u64; // Returns org_id
    // fn get_batch_metadata(
    //     self: @TContractState,
    //     batch_id: felt252
    // ) -> (felt252, felt252, felt252, u64);

    // Revocation management
    fn revoke(ref self: TContractState, commitment: felt252, batch_id: u64);
    fn is_revoked(self: @TContractState, commitment: felt252, batch_id: u64) -> bool;
}

#[starknet::interface]
pub trait IVRFGame<TContractState> {
    fn get_last_random_number(self: @TContractState) -> felt252;
    fn settle_random(ref self: TContractState);
    fn set_vrf_provider(ref self: TContractState, new_vrf_provider: ContractAddress);
}