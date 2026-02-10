use starknet::ContractAddress;
use crate::types::BatchType;

#[starknet::interface]
pub trait IKirocredContract<TContractState> {
    // Batch and merkle root storage
    fn store_merkle_root(ref self: TContractState, batch_id: u64, merkle_root: felt252// issuer_public_key: felt252,
    // description: felt252,
    // purpose: felt252,
    // issued_by: felt252,
    );
    fn create_org(ref self: TContractState, // name: felt252,
    org_address: ContractAddress, org_pubkey: felt252// contact_email: felt252,
    );
    // This is mainly for continuous batches. Batches issued at once will do everything in one
    // function
    fn create_batch(ref self: TContractState, batch_type: BatchType, org_id: u64);

    fn get_merkle_root(self: @TContractState, batch_id: u64) -> felt252;
    fn get_issuer_public_key(self: @TContractState, batch_id: u64) -> felt252;
    // fn get_batch_metadata(
    //     self: @TContractState,
    //     batch_id: felt252
    // ) -> (felt252, felt252, felt252, u64);

    // Revocation management
    fn revoke(ref self: TContractState, commitment: felt252, batch_id: u64);
    fn is_revoked(self: @TContractState, commitment: felt252, batch_id: u64) -> bool;
}
