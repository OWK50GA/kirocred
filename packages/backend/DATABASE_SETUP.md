# Database Setup Instructions

## Install Dependencies

Run this command in the `packages/backend` directory:

```bash
npm install
```

This will install:
- `better-sqlite3` - Fast SQLite3 library
- `@types/better-sqlite3` - TypeScript types

## Database Location

The database file will be created at:
- Default: `./kirocred.db` (in the backend directory)
- Custom: Set `DATABASE_PATH` environment variable

## Schema

The database has 3 tables:

1. **organizations** - Stores org metadata from blockchain
2. **batches** - Stores batch metadata from blockchain  
3. **credentials** - Maps holder addresses to IPFS CIDs (key table for discovery)

## Auto-Initialization

The database schema is automatically created when the DatabaseClient is first instantiated. No manual migration needed!

## Usage

```typescript
import { getDatabase } from './db';

const db = getDatabase();

// Insert organization
db.insertOrganization({
  org_id: 1,
  org_address: '0x123...',
  org_name: 'University',
  created_at: Date.now(),
});

// Get credentials for a holder
const credentials = db.getCredentialsByHolder('0xholder...');
```

## Next Steps

After running `npm install`, the database will be ready to use!
