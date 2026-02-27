#!/bin/bash

# Kirocred PostgreSQL Database Setup Script

echo "🗄️  Setting up Kirocred PostgreSQL Database..."
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo ""
    echo "Install PostgreSQL:"
    echo "  Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "  macOS: brew install postgresql@15"
    echo "  Fedora: sudo dnf install postgresql postgresql-server"
    exit 1
fi

echo "✓ PostgreSQL is installed"

# Check if PostgreSQL service is running
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL service is not running."
    echo ""
    echo "Start PostgreSQL:"
    echo "  Ubuntu/Debian: sudo systemctl start postgresql"
    echo "  macOS: brew services start postgresql@15"
    echo "  Fedora: sudo systemctl start postgresql"
    exit 1
fi

echo "✓ PostgreSQL service is running"
echo ""

# Create database and user
echo "Creating database and user..."
sudo -u postgres psql << EOF
-- Drop existing database and user if they exist (for clean setup)
DROP DATABASE IF EXISTS kirocred;
DROP USER IF EXISTS kirocred_user;

-- Create user
CREATE USER kirocred_user WITH PASSWORD 'kirocred_password';

-- Create database
CREATE DATABASE kirocred OWNER kirocred_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kirocred TO kirocred_user;

-- Connect to kirocred database and grant schema privileges
\c kirocred
GRANT ALL ON SCHEMA public TO kirocred_user;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "Database: kirocred"
    echo "User: kirocred_user"
    echo "Password: kirocred_password"
    echo ""
    echo "Connection string:"
    echo "postgresql://kirocred_user:kirocred_password@localhost:5432/kirocred"
    echo ""
    echo "Next steps:"
    echo "1. Update packages/backend/.env with DATABASE_URL"
    echo "2. Run: npm run dev"
else
    echo ""
    echo "❌ Database setup failed"
    echo ""
    echo "Try running manually:"
    echo "  sudo -u postgres psql"
    echo "  Then run the SQL commands from this script"
    exit 1
fi
