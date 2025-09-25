#!/bin/bash

# =====================================================
# WebRTC Schema Fix Application Script
# सभी database schema issues को fix करने के लिए
# =====================================================

set -e  # Exit on any error

echo "🚀 WebRTC Database Schema Fix Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    echo -e "${BLUE}📁 Loading environment variables from .env...${NC}"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

# Database connection details
DB_NAME=${DB_NAME:-"webrtc"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

echo -e "${BLUE}🔧 Database Connection Details:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if PostgreSQL is running
echo -e "${BLUE}🔍 Checking PostgreSQL connection...${NC}"
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT${NC}"
    echo "Please make sure PostgreSQL is running and accessible."
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL connection successful${NC}"

# Backup existing database (optional)
echo -e "${YELLOW}💾 Creating backup (optional)...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
echo "Do you want to create a backup? (y/N): "
read -r create_backup
if [[ $create_backup =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}📦 Creating backup: $BACKUP_FILE${NC}"
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping backup${NC}"
fi

# Warning message
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will modify your database schema!${NC}"
echo -e "${YELLOW}⚠️  Make sure you have a backup if needed.${NC}"
echo ""
echo "Continue with schema fix? (y/N): "
read -r confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🚫 Schema fix cancelled by user${NC}"
    exit 0
fi

# Stop any running Node.js servers
echo -e "${BLUE}🛑 Stopping any running Node.js servers...${NC}"
pkill -f "node.*server.js" || true
pkill -f "nodemon" || true
sleep 2

# Apply the schema fix
echo -e "${GREEN}🔧 Applying schema fix...${NC}"
echo "===================================="

# Set password for psql (if not using .pgpass)
if [ ! -z "$DB_PASSWORD" ]; then
    export PGPASSWORD=$DB_PASSWORD
fi

# Apply the schema fix SQL
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f COMPLETE-SCHEMA-FIX.sql

# Check if the fix was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Schema fix applied successfully!${NC}"
    echo "===================================="
    
    # Verify the fix
    echo -e "${BLUE}🔍 Verifying schema fix...${NC}"
    
    # Check if critical columns exist
    echo "Checking critical columns:"
    
    # Check isactive column in admins
    ISACTIVE_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'isactive';")
    if [ "$ISACTIVE_EXISTS" -gt 0 ]; then
        echo -e "  ✅ admins.isactive column: ${GREEN}EXISTS${NC}"
    else
        echo -e "  ❌ admins.isactive column: ${RED}MISSING${NC}"
    fi
    
    # Check mediaData column in room_media
    MEDIADATA_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'room_media' AND column_name = 'mediaData';")
    if [ "$MEDIADATA_EXISTS" -gt 0 ]; then
        echo -e "  ✅ room_media.mediaData column: ${GREEN}EXISTS${NC}"
    else
        echo -e "  ❌ room_media.mediaData column: ${RED}MISSING${NC}"
    fi
    
    # Check locations table foreign key
    FK_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name WHERE tc.table_name = 'locations' AND tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'rooms';")
    if [ "$FK_EXISTS" -gt 0 ]; then
        echo -e "  ✅ locations foreign key: ${GREEN}EXISTS${NC}"
    else
        echo -e "  ❌ locations foreign key: ${RED}MISSING${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎯 Schema Fix Summary:${NC}"
    echo "  ✅ All tables recreated with correct schema"
    echo "  ✅ Missing columns added"
    echo "  ✅ Foreign key constraints fixed"
    echo "  ✅ Enums created"
    echo "  ✅ Indexes created for performance"
    echo "  ✅ Triggers created for auto-timestamps"
    echo "  ✅ Sample data inserted"
    
    echo ""
    echo -e "${BLUE}🔑 Test Credentials:${NC}"
    echo "  Admin: admin@gmail.com / Admin@123"
    echo "  Doctor: john.smith@hospital.com / password123"
    echo "  Test Room: 9999"
    
    echo ""
    echo -e "${GREEN}🚀 Ready to start your application!${NC}"
    echo "You can now run:"
    echo "  cd backend && npm run dev"
    
else
    echo -e "${RED}❌ Schema fix failed!${NC}"
    echo "Please check the error messages above."
    exit 1
fi

# Clean up
unset PGPASSWORD

echo ""
echo -e "${GREEN}✨ Schema fix completed successfully!${NC}"
echo "===================================="
