export const KIROCREDABI = [
  {
    "type": "impl",
    "name": "UpgradeableImpl",
    "interface_name": "openzeppelin_upgrades::interface::IUpgradeable"
  },
  {
    "type": "interface",
    "name": "openzeppelin_upgrades::interface::IUpgradeable",
    "items": [
      {
        "type": "function",
        "name": "upgrade",
        "inputs": [
          {
            "name": "new_class_hash",
            "type": "core::starknet::class_hash::ClassHash"
          }
        ],
        "outputs": [],
        "state_mutability": "external"
      }
    ]
  },
  {
    "type": "impl",
    "name": "KirocredImpl",
    "interface_name": "kirocred_contracts::ikirocred::IKirocredContract"
  },
  {
    "type": "enum",
    "name": "core::bool",
    "variants": [
      {
        "name": "False",
        "type": "()"
      },
      {
        "name": "True",
        "type": "()"
      }
    ]
  },
  {
    "type": "interface",
    "name": "kirocred_contracts::ikirocred::IKirocredContract",
    "items": [
      {
        "type": "function",
        "name": "store_merkle_root",
        "inputs": [
          {
            "name": "batch_id",
            "type": "core::integer::u64"
          },
          {
            "name": "merkle_root",
            "type": "core::felt252"
          }
        ],
        "outputs": [],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "create_org",
        "inputs": [
          {
            "name": "org_address",
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "outputs": [],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "create_batch",
        "inputs": [
          {
            "name": "batch_type",
            "type": "core::integer::u8"
          },
          {
            "name": "org_id",
            "type": "core::integer::u64"
          }
        ],
        "outputs": [],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "get_merkle_root",
        "inputs": [
          {
            "name": "batch_id",
            "type": "core::integer::u64"
          }
        ],
        "outputs": [
          {
            "type": "core::felt252"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_issuer_address",
        "inputs": [
          {
            "name": "batch_id",
            "type": "core::integer::u64"
          }
        ],
        "outputs": [
          {
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "get_org_by_address",
        "inputs": [
          {
            "name": "org_address",
            "type": "core::starknet::contract_address::ContractAddress"
          }
        ],
        "outputs": [
          {
            "type": "core::integer::u64"
          }
        ],
        "state_mutability": "view"
      },
      {
        "type": "function",
        "name": "revoke",
        "inputs": [
          {
            "name": "commitment",
            "type": "core::felt252"
          },
          {
            "name": "batch_id",
            "type": "core::integer::u64"
          }
        ],
        "outputs": [],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "is_revoked",
        "inputs": [
          {
            "name": "commitment",
            "type": "core::felt252"
          },
          {
            "name": "batch_id",
            "type": "core::integer::u64"
          }
        ],
        "outputs": [
          {
            "type": "core::bool"
          }
        ],
        "state_mutability": "view"
      }
    ]
  },
  {
    "type": "constructor",
    "name": "constructor",
    "inputs": [
      {
        "name": "owner",
        "type": "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    "type": "event",
    "name": "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferred",
    "kind": "struct",
    "members": [
      {
        "name": "previous_owner",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "key"
      },
      {
        "name": "new_owner",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "key"
      }
    ]
  },
  {
    "type": "event",
    "name": "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferStarted",
    "kind": "struct",
    "members": [
      {
        "name": "previous_owner",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "key"
      },
      {
        "name": "new_owner",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "key"
      }
    ]
  },
  {
    "type": "event",
    "name": "openzeppelin_access::ownable::ownable::OwnableComponent::Event",
    "kind": "enum",
    "variants": [
      {
        "name": "OwnershipTransferred",
        "type": "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferred",
        "kind": "nested"
      },
      {
        "name": "OwnershipTransferStarted",
        "type": "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferStarted",
        "kind": "nested"
      }
    ]
  },
  {
    "type": "event",
    "name": "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded",
    "kind": "struct",
    "members": [
      {
        "name": "class_hash",
        "type": "core::starknet::class_hash::ClassHash",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event",
    "kind": "enum",
    "variants": [
      {
        "name": "Upgraded",
        "type": "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded",
        "kind": "nested"
      }
    ]
  },
  {
    "type": "event",
    "name": "kirocred_contracts::kirocred_contract::Kirocred::MerkleRootStored",
    "kind": "struct",
    "members": [
      {
        "name": "root",
        "type": "core::felt252",
        "kind": "data"
      },
      {
        "name": "batch_id",
        "type": "core::integer::u64",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "kirocred_contracts::kirocred_contract::Kirocred::OrganizationCreated",
    "kind": "struct",
    "members": [
      {
        "name": "creator",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "data"
      },
      {
        "name": "org_id",
        "type": "core::integer::u64",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "kirocred_contracts::kirocred_contract::Kirocred::BatchCreated",
    "kind": "struct",
    "members": [
      {
        "name": "batch_id",
        "type": "core::integer::u64",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "kirocred_contracts::kirocred_contract::Kirocred::CredentialRevoked",
    "kind": "struct",
    "members": [
      {
        "name": "commitment",
        "type": "core::felt252",
        "kind": "data"
      },
      {
        "name": "batch_id",
        "type": "core::integer::u64",
        "kind": "data"
      }
    ]
  },
  {
    "type": "event",
    "name": "kirocred_contracts::kirocred_contract::Kirocred::Event",
    "kind": "enum",
    "variants": [
      {
        "name": "OwnableEvent",
        "type": "openzeppelin_access::ownable::ownable::OwnableComponent::Event",
        "kind": "flat"
      },
      {
        "name": "UpgradeableEvent",
        "type": "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event",
        "kind": "flat"
      },
      {
        "name": "MerkleRootStored",
        "type": "kirocred_contracts::kirocred_contract::Kirocred::MerkleRootStored",
        "kind": "nested"
      },
      {
        "name": "OrganizationCreated",
        "type": "kirocred_contracts::kirocred_contract::Kirocred::OrganizationCreated",
        "kind": "nested"
      },
      {
        "name": "BatchCreated",
        "type": "kirocred_contracts::kirocred_contract::Kirocred::BatchCreated",
        "kind": "nested"
      },
      {
        "name": "CredentialRevoked",
        "type": "kirocred_contracts::kirocred_contract::Kirocred::CredentialRevoked",
        "kind": "nested"
      }
    ]
  }
] as const;
