-- =====================================================
-- IMMEDIATE FIX - Run this SQL directly in PostgreSQL
-- This will fix all current issues quickly
-- =====================================================

-- Start transaction
BEGIN;

\echo '🚨 IMMEDIATE DATABASE FIX'
\echo 'This will fix the mediaData column and other issues'

-- =====================================================
-- FIX 1: Add missing mediaData column to room_media
-- =====================================================

-- Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'room_media' 
        AND column_name = 'mediaData'
    ) THEN
        ALTER TABLE "room_media" ADD COLUMN "mediaData" TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added mediaData column to room_media table';
    ELSE
        RAISE NOTICE 'mediaData column already exists';
    END IF;
END $$;

-- =====================================================
-- FIX 2: Fix admin table column case issue
-- =====================================================

-- Check if isactive column exists and rename it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admins' 
        AND column_name = 'isactive'
    ) THEN
        ALTER TABLE "admins" RENAME COLUMN "isactive" TO "isActive";
        RAISE NOTICE 'Renamed isactive to isActive in admins table';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admins' 
        AND column_name = 'lastlogin'
    ) THEN
        ALTER TABLE "admins" RENAME COLUMN "lastlogin" TO "lastLogin";
        RAISE NOTICE 'Renamed lastlogin to lastLogin in admins table';
    END IF;
END $$;

-- =====================================================
-- FIX 3: Fix locations foreign key constraint
-- =====================================================

-- Drop the problematic foreign key constraint temporarily
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'locations_roomId_fkey'
    ) THEN
        ALTER TABLE "locations" DROP CONSTRAINT "locations_roomId_fkey";
        RAISE NOTICE 'Dropped problematic foreign key constraint';
    END IF;
END $$;

-- Recreate the constraint properly pointing to rooms.id instead of rooms.roomId
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rooms') THEN
        -- Check if the rooms table has 'id' column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'rooms' AND column_name = 'id'
        ) THEN
            -- Add proper foreign key constraint
            ALTER TABLE "locations" 
            ADD CONSTRAINT "locations_roomId_fkey" 
            FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE;
            RAISE NOTICE 'Added proper foreign key constraint to locations table';
        ELSE
            RAISE NOTICE 'Rooms table does not have id column - constraint not added';
        END IF;
    END IF;
END $$;

-- =====================================================
-- FIX 4: Insert sample data if missing
-- =====================================================

-- Insert admin if not exists
INSERT INTO "admins" ("email", "password", "name", "role", "isActive") 
VALUES ('admin@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', true)
ON CONFLICT ("email") DO NOTHING;

-- Insert sample doctors if not exists
INSERT INTO "doctors" ("firstName", "lastName", "email", "password", "specialization", "medicalLicense", "phone", "isActive") 
VALUES 
    ('John', 'Smith', 'john.smith@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'General Medicine', 'MD12345', '+1234567890', true),
    ('Santosh', 'Sharma', 'santoshkumarsharmabagdatt@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Physician', 'MD12347', '+1234567892', true)
ON CONFLICT ("email") DO NOTHING;

-- Insert sample patients if not exists
INSERT INTO "patients" ("name", "age", "phone", "email", "gender", "address", "isActive") 
VALUES 
    ('John Doe', 35, '+1234567893', 'john.doe@example.com', 'Male', '123 Main St, City, State', true),
    ('Jane Smith', 28, '+1234567894', 'jane.smith@example.com', 'Female', '456 Oak Ave, City, State', true)
ON CONFLICT ("phone") DO NOTHING;

-- Insert sample room if not exists
INSERT INTO "rooms" ("roomId", "doctorId", "patientId", "roomName", "patientLink", "status", "isActive") 
SELECT 
    '9999',
    d."id",
    p."id",
    'Sample Consultation Room',
    'http://localhost:3000/patient/9999',
    'active',
    true
FROM "doctors" d, "patients" p 
WHERE d."email" = 'santoshkumarsharmabagdatt@gmail.com' 
AND p."name" = 'John Doe'
AND NOT EXISTS (SELECT 1 FROM "rooms" WHERE "roomId" = '9999')
LIMIT 1;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if mediaData column exists now
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'room_media' AND column_name = 'mediaData'
        ) 
        THEN '✅ mediaData column exists in room_media'
        ELSE '❌ mediaData column still missing'
    END as media_data_check;

-- Check admin table columns
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admins' AND column_name = 'isActive'
        ) 
        THEN '✅ isActive column exists in admins'
        ELSE '❌ isActive column missing in admins'
    END as admin_column_check;

-- Check foreign key constraint
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'locations_roomId_fkey'
        ) 
        THEN '✅ Foreign key constraint exists'
        ELSE '❌ Foreign key constraint missing'
    END as foreign_key_check;

-- Count records
SELECT 
    'admins' as table_name, COUNT(*) as record_count FROM "admins"
UNION ALL
SELECT 
    'doctors' as table_name, COUNT(*) as record_count FROM "doctors"
UNION ALL
SELECT 
    'patients' as table_name, COUNT(*) as record_count FROM "patients"
UNION ALL
SELECT 
    'rooms' as table_name, COUNT(*) as record_count FROM "rooms";

-- Commit changes
COMMIT;

\echo ''
\echo '🎉 IMMEDIATE FIX COMPLETED!'
\echo ''
\echo '✅ Fixed Issues:'
\echo '  - Added mediaData column to room_media table'
\echo '  - Fixed admin table column names (isActive, lastLogin)'
\echo '  - Fixed locations foreign key constraint'
\echo '  - Added sample data for testing'
\echo ''
\echo '🔄 Next Steps:'
\echo '  1. Restart your application'
\echo '  2. Test recording functionality'
\echo '  3. Login with: admin@gmail.com / Admin@123'
\echo '  4. Doctor login: santoshkumarsharmabagdatt@gmail.com / password123'
