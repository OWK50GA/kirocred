#[starknet::contract]
pub mod Kirocred {
    use openzeppelin::access::ownable::OwnableComponent;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_tx_info, get_caller_address};
    use crate::ikirocred::IKirocredContract;
    use crate::types::{Batch, BatchStatus, BatchType, Organization, OrganizationStatus};

    #[storage]
    pub struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        pub address_to_org: Map<ContractAddress, Organization>,
        pub id_to_org: Map<u64, Organization>,
        pub next_org_id: u64,
        pub next_batch_id: u64,
        pub id_to_batch: Map<u64, Batch>,
        pub revoked: Map<(felt252, u64), bool>,
    }

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    impl OwnableImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
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
            ref self: ContractState,
            // name: felt252,
            org_address: ContractAddress,
            org_pubkey: felt252,
            // contact_email: felt252,
        ) {
            let existing_org = self.address_to_org.entry(org_address).read();
            assert(existing_org.org_id == 0, 'Org already exists');

            let org_id = self.next_org_id.read();
            self.next_org_id.write(org_id + 1);
            let organization = Organization {
                org_id,
                // name,
                issuer_address: org_address,
                issuer_pubkey: org_pubkey,
                // contact_email,
                created_at: get_block_timestamp(),
                last_active_at: 0,
                status: OrganizationStatus::CREATED,
                batches_count: 0,
            };

            self.address_to_org.entry(org_address).write(organization);
            self.id_to_org.entry(org_id).write(organization);
            self.emit(OrganizationCreated { creator: org_address, org_id })
        }

        // Later, things like edit org (permissioned), etc
        // Use verifiable random numbers for this later
        // Orgs should actually have things like description in their backend. Will remove
        fn create_batch(ref self: ContractState, batch_type: BatchType, org_id: u64) {
            self.ownable.assert_only_owner();
            let mut org = self.id_to_org.entry(org_id).read();
            let batch_id = self.next_batch_id.read();
            org.batches_count += 1;

            let new_batch = Batch {
                id: batch_id,
                org_id,
                holders: 0,
                merkle_root: 0,
                batchType: batch_type,
                created_at: get_block_timestamp(),
                issued_at: 0,
                expires_at: 0,
                total_issued: 0,
                status: BatchStatus::ACTIVE,
                onchain_tx: 0,
            };

            self.id_to_batch.entry(batch_id).write(new_batch.clone());
            self.id_to_org.entry(org_id).write(org);
            self.address_to_org.entry(org.issuer_address).write(org);
            self.next_batch_id.write(batch_id + 1);
            self.emit(BatchCreated { batch_id })
        }

        fn get_merkle_root(self: @ContractState, batch_id: u64) -> felt252 {
            let batch = self.id_to_batch.entry(batch_id).read();
            batch.merkle_root
        }

        fn get_issuer_public_key(self: @ContractState, batch_id: u64) -> felt252 {
            let batch = self.id_to_batch.entry(batch_id).read();
            let org_id = batch.org_id;
            let org = self.id_to_org.entry(org_id).read();
            org.issuer_pubkey
        }

        // Revocation management
        fn revoke(ref self: ContractState, commitment: felt252, batch_id: u64) {
            let caller = get_caller_address();
            let batch = self.id_to_batch.entry(batch_id).read();
            let org = self.id_to_org.entry(batch.org_id).read();
            assert(caller == org.issuer_address, 'Only issuer can revoke');
            self.revoked.entry((commitment, batch_id)).write(true);
            self.emit(
                CredentialRevoked {
                    commitment,
                    batch_id
                }
            );
        }

        fn is_revoked(self: @ContractState, commitment: felt252, batch_id: u64) -> bool {
            self.revoked.entry((commitment, batch_id)).read()
        }
    }
}