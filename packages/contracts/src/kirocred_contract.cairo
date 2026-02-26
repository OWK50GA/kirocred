#[starknet::contract]
pub mod Kirocred {
    use core::num::traits::Zero;
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::upgrades::interface::IUpgradeable;
    // use cartridge_vrf::Source;
    // use cartridge_vrf::vrf_consumer::vrf_consumer_component::VrfConsumerComponent;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address, get_tx_info, ClassHash};
    use crate::ikirocred::IKirocredContract;
    use crate::types::{Batch, BatchStatus, BatchType, Organization, OrganizationStatus};

    #[storage]
    pub struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        pub upgradeable: UpgradeableComponent::Storage,
        // TODO -> Change this to map contract address to org_id for more memory efficiency
        pub address_to_org_id: Map<ContractAddress, u64>, // contractAddress to org_id
        pub id_to_org: Map<u64, Organization>,
        pub next_org_id: u64,
        pub next_batch_id: u64,
        pub id_to_batch: Map<u64, Batch>,
        pub revoked: Map<(felt252, u64), bool>,
    }

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
    // component!(path: VrfConsumerComponent, storage: vrf_consumer, event: VrfConsumerEvent);

    impl OwnableImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        MerkleRootStored: MerkleRootStored,
        OrganizationCreated: OrganizationCreated,
        BatchCreated: BatchCreated,
        CredentialRevoked: CredentialRevoked,
    }

    #[derive(Drop, starknet::Event)]
    pub struct OrganizationCreated {
        pub creator: ContractAddress,
        pub org_id: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BatchCreated {
        pub batch_id: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MerkleRootStored {
        pub root: felt252,
        pub batch_id: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CredentialRevoked {
        pub commitment: felt252,
        pub batch_id: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.next_org_id.write(1);
        self.next_batch_id.write(1);
        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    pub impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[abi(embed_v0)]
    pub impl KirocredImpl of IKirocredContract<ContractState> {
        fn store_merkle_root(ref self: ContractState, batch_id: u64, merkle_root: felt252) {
            self.ownable.assert_only_owner();
            let mut batch = self.id_to_batch.entry(batch_id).read();
            batch.merkle_root = merkle_root;
            let tx_info = get_tx_info().unbox();
            batch.onchain_tx = tx_info.transaction_hash;
            batch.issued_at = get_block_timestamp();

            // Write the updated batch back to storage
            self.id_to_batch.entry(batch_id).write(batch);

            self.emit(MerkleRootStored { root: merkle_root, batch_id });
        }

        fn create_org(
            ref self: ContractState, org_address: ContractAddress, 
            // signature: (felt252, felt252),
        ) {
            // let caller = get_caller_address();

            // Security: Only the organization address itself can register
            // assert(caller == org_address, 'Only org can register itself');

            let existing_org_id = self.address_to_org_id.entry(org_address).read();
            assert(existing_org_id == 0, 'Org already exists');

            // TODO: Add signature verification here to prevent spam
            // For now, we rely on the caller == org_address check

            let org_id = self.next_org_id.read();
            self.next_org_id.write(org_id + 1);
            let organization = Organization {
                org_id,
                issuer_address: org_address,
                // issuer_pubkey: 0, // No longer needed - we get pubkey from signature verification
                created_at: get_block_timestamp(),
                last_active_at: 0,
                status: OrganizationStatus::CREATED,
                batches_count: 0,
            };

            self.address_to_org_id.entry(org_address).write(org_id);
            self.id_to_org.entry(org_id).write(organization);
            self.emit(OrganizationCreated { creator: org_address, org_id })
        }

        // Later, things like edit org (permissioned), etc
        // Use verifiable random numbers for this later
        // Orgs should actually have things like description in their backend. Will remove
        fn create_batch(ref self: ContractState, batch_type: u8, org_id: u64) {
            // TODO: Make id generation use a vrf to generate numbers instead
            self.ownable.assert_only_owner();
            let mut org = self.id_to_org.entry(org_id).read();
            assert(org.issuer_address.is_non_zero(), 'Organization does not exist');
            let batch_id = self.next_batch_id.read();
            org.batches_count += 1;

            let actual_batch_type = match batch_type {
                0 => BatchType::BATCH,
                _ => BatchType::SINGLETON,
            };

            let new_batch = Batch {
                id: batch_id,
                org_id,
                holders: 0,
                merkle_root: 0,
                batchType: actual_batch_type,
                created_at: get_block_timestamp(),
                issued_at: 0,
                expires_at: 0,
                total_issued: 0,
                status: BatchStatus::ACTIVE,
                onchain_tx: 0,
            };

            self.id_to_batch.entry(batch_id).write(new_batch.clone());
            self.id_to_org.entry(org_id).write(org);
            self.next_batch_id.write(batch_id + 1);
            self.emit(BatchCreated { batch_id })
        }

        fn get_merkle_root(self: @ContractState, batch_id: u64) -> felt252 {
            let batch = self.id_to_batch.entry(batch_id).read();
            batch.merkle_root
        }

        fn get_issuer_address(self: @ContractState, batch_id: u64) -> ContractAddress {
            let batch = self.id_to_batch.entry(batch_id).read();
            let org_id = batch.org_id;
            let org = self.id_to_org.entry(org_id).read();
            // Return the organization address as felt252 since we now use address-based
            // verification
            org.issuer_address
        }

        fn get_org_by_address(self: @ContractState, org_address: ContractAddress) -> u64 {
            self.address_to_org_id.entry(org_address).read()
        }

        // Revocation management
        fn revoke(ref self: ContractState, commitment: felt252, batch_id: u64) {
            let caller = get_caller_address();
            let batch = self.id_to_batch.entry(batch_id).read();
            let org = self.id_to_org.entry(batch.org_id).read();
            assert(caller == org.issuer_address, 'Only issuer can revoke');
            self.revoked.entry((commitment, batch_id)).write(true);
            self.emit(CredentialRevoked { commitment, batch_id });
        }

        fn is_revoked(self: @ContractState, commitment: felt252, batch_id: u64) -> bool {
            self.revoked.entry((commitment, batch_id)).read()
        }
    }
}
