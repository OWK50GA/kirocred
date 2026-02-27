#!/bin/bash

# Kirocred PostgreSQL Database Clear Script

echo "🗑️  Clearing Kirocred Database..."
echo ""

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL service is not running."
    exit 1
fi

echo "⚠️  WARNING: This will delete ALL data from the kirocred database!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Clearing all tables..."

psql "postgresql://kirocred_user:kirocred_password@localhost:5432/kirocred" << EOF
-- Delete all data from tables (in correct order due to foreign keys)
DELETE FROM credentials;
DELETE FROM batches;
DELETE FROM organizations;

-- Reset sequences if needed (optional)
-- ALTER SEQUENCE organizations_org_id_seq RESTART WITH 1;
-- ALTER SEQUENCE batches_batch_id_seq RESTART WITH 1;

-- Verify tables are empty
SELECT 'Organizations: ' || COUNT(*) FROM organizations;
SELECT 'Batches: ' || COUNT(*) FROM batches;
SELECT 'Credentials: ' || COUNT(*) FROM credentials;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database cleared successfully!"
    echo ""
    echo "All data has been removed from:"
    echo "  - organizations"
    echo "  - batches"
    echo "  - credentials"
else
    echo ""
    echo "❌ Failed to clear database"
    exit 1
fi
