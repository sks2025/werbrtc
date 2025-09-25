-- =====================================================
-- WebRTC Complete Schema Fix
-- यह script सभी table schema issues को fix करेगा
-- =====================================================

BEGIN;

\echo '🔧 Starting comprehensive schema fix...'

-- =====================================================
-- 1. Fix admins table - Add missing isactive column
-- =====================================================

\echo '👤 Fixing admins table...'

-- Add isactive column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admins' AND column_name = 'isactive') THEN
        ALTER TABLE "admins" ADD COLUMN "isactive" BOOLEAN DEFAULT true;
        \echo '✅ Added isactive column to admins table';
    ELSE
        \echo 'ℹ️  isactive column already exists in admins table';
    END IF;
END $$;

-- Add lastlogin column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admins' AND column_name = 'lastlogin') THEN
        ALTER TABLE "admins" ADD COLUMN "lastlogin" TIMESTAMP WITH TIME ZONE;
        \echo '✅ Added lastlogin column to admins table';
    ELSE
        \echo 'ℹ️  lastlogin column already exists in admins table';
    END IF;
END $$;

-- =====================================================
-- 2. Drop and recreate proper tables with correct schema
-- =====================================================

\echo '🏗️  Recreating tables with correct schema...'

-- Drop existing tables in correct order to avoid FK constraints
DROP TABLE IF EXISTS "locations" CASCADE;
DROP TABLE IF EXISTS "room_media" CASCADE;
DROP TABLE IF EXISTS "RoomMedia" CASCADE;
DROP TABLE IF EXISTS "call_saves" CASCADE;
DROP TABLE IF EXISTS "consultations" CASCADE;
DROP TABLE IF EXISTS "Consultations" CASCADE;
DROP TABLE IF EXISTS "rooms" CASCADE;
DROP TABLE IF EXISTS "Rooms" CASCADE;
DROP TABLE IF EXISTS "patients" CASCADE;
DROP TABLE IF EXISTS "Patients" CASCADE;
DROP TABLE IF EXISTS "doctors" CASCADE;
DROP TABLE IF EXISTS "Doctors" CASCADE;

-- Drop old tables if they exist
DROP TABLE IF EXISTS "CapturedImages" CASCADE;
DROP TABLE IF EXISTS "DigitalSignatures" CASCADE;
DROP TABLE IF EXISTS "ScreenRecordings" CASCADE;

\echo '🗑️  Dropped existing tables'

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- Create doctors table (Sequelize format)
-- =====================================================

CREATE TABLE "doctors" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "gender" VARCHAR(10) CHECK ("gender" IN ('male', 'female', 'other')) NOT NULL,
    "medicalLicense" VARCHAR(255) UNIQUE,
    "specialization" VARCHAR(255) DEFAULT 'General Medicine',
    "isActive" BOOLEAN DEFAULT true,
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enum for doctors gender
CREATE TYPE enum_doctors_gender AS ENUM ('male', 'female', 'other');

\echo '✅ Created doctors table'

-- =====================================================
-- Create patients table (Sequelize format)
-- =====================================================

CREATE TABLE "patients" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "age" INTEGER NOT NULL CHECK ("age" > 0 AND "age" <= 150),
    "phone" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "gender" VARCHAR(10) CHECK ("gender" IN ('male', 'female', 'other')),
    "address" TEXT,
    "medicalHistory" TEXT,
    "emergencyContact" VARCHAR(255),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enum for patients gender
CREATE TYPE enum_patients_gender AS ENUM ('male', 'female', 'other');

\echo '✅ Created patients table'

-- =====================================================
-- Create rooms table (Sequelize format)
-- =====================================================

CREATE TABLE "rooms" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomId" VARCHAR(255) UNIQUE NOT NULL,
    "doctorId" UUID NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
    "patientId" UUID REFERENCES "patients"("id") ON DELETE SET NULL,
    "roomName" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active' CHECK ("status" IN ('active', 'completed', 'cancelled')),
    "startTime" TIMESTAMP WITH TIME ZONE,
    "endTime" TIMESTAMP WITH TIME ZONE,
    "duration" INTEGER DEFAULT 0,
    "patientLink" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "maxParticipants" INTEGER DEFAULT 2,
    "roomSettings" JSONB DEFAULT '{"recordingEnabled": false, "chatEnabled": true, "whiteboardEnabled": true, "screenShareEnabled": true}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enum for rooms status
CREATE TYPE enum_rooms_status AS ENUM ('active', 'completed', 'cancelled');

\echo '✅ Created rooms table'

-- =====================================================
-- Create consultations table
-- =====================================================

CREATE TABLE "consultations" (
    "id" SERIAL PRIMARY KEY,
    "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
    "doctorId" UUID NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
    "patientId" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "symptoms" TEXT,
    "diagnosis" TEXT,
    "prescription" TEXT,
    "notes" TEXT,
    "vitalSigns" JSONB,
    "capturedImages" JSONB,
    "patientSignature" TEXT,
    "doctorSignature" TEXT,
    "followUpDate" DATE,
    "followUpInstructions" TEXT,
    "consultationDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(50) DEFAULT 'in_progress' CHECK ("status" IN ('in_progress', 'completed', 'cancelled')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enum for consultations status
CREATE TYPE enum_consultations_status AS ENUM ('in_progress', 'completed', 'cancelled');

\echo '✅ Created consultations table'

-- =====================================================
-- Create captured_images table (compatible with Sequelize model)
-- =====================================================

CREATE TABLE "captured_images" (
    "id" SERIAL PRIMARY KEY,
    "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
    "capturedBy" VARCHAR(10) CHECK ("capturedBy" IN ('doctor', 'patient')),
    "imageData" TEXT NOT NULL,
    "fileName" VARCHAR(255),
    "description" TEXT,
    "capturedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enum for captured_images capturedBy
CREATE TYPE enum_captured_images_capturedBy AS ENUM ('doctor', 'patient');

\echo '✅ Created captured_images table'

-- =====================================================
-- Create digital_signatures table (compatible with Sequelize model)
-- =====================================================

CREATE TABLE "digital_signatures" (
    "id" SERIAL PRIMARY KEY,
    "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
    "signedBy" VARCHAR(10) CHECK ("signedBy" IN ('doctor', 'patient')),
    "signatureData" TEXT NOT NULL,
    "purpose" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    "signedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enum for digital_signatures signedBy
CREATE TYPE enum_digital_signatures_signedBy AS ENUM ('doctor', 'patient');

\echo '✅ Created digital_signatures table'

-- =====================================================
-- Create screen_recordings table (compatible with Sequelize model)
-- =====================================================

CREATE TABLE "screen_recordings" (
    "id" SERIAL PRIMARY KEY,
    "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
    "fileName" VARCHAR(255) NOT NULL,
    "filePath" VARCHAR(500) NOT NULL,
    "duration" INTEGER, -- in seconds
    "fileSize" INTEGER, -- in bytes
    "startedAt" TIMESTAMP WITH TIME ZONE,
    "endedAt" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(20) DEFAULT 'recording' CHECK ("status" IN ('recording', 'completed', 'failed')),
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enum for screen_recordings status
CREATE TYPE enum_screen_recordings_status AS ENUM ('recording', 'completed', 'failed');

\echo '✅ Created screen_recordings table'

-- =====================================================
-- Create room_media table (unified media storage - compatible with RoomMedia model)
-- =====================================================

CREATE TABLE "room_media" (
    "id" SERIAL PRIMARY KEY,
    "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
    "mediaType" VARCHAR(50) NOT NULL CHECK ("mediaType" IN ('screen_recording', 'digital_signature', 'captured_image')),
    "doctorId" UUID REFERENCES "doctors"("id") ON DELETE SET NULL,
    "patientId" UUID REFERENCES "patients"("id") ON DELETE SET NULL,
    "mediaData" TEXT NOT NULL, -- Base64 data or file path (THIS WAS MISSING!)
    "fileName" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    
    -- Screen recording specific fields
    "duration" INTEGER, -- Duration in seconds
    "fileSize" INTEGER, -- File size in bytes
    "startedAt" TIMESTAMP WITH TIME ZONE,
    "endedAt" TIMESTAMP WITH TIME ZONE,
    
    -- Signature specific fields
    "signedBy" VARCHAR(10) CHECK ("signedBy" IN ('doctor', 'patient')),
    "purpose" VARCHAR(255),
    
    -- Image specific fields
    "description" TEXT,
    
    -- Common fields
    "status" VARCHAR(20) DEFAULT 'completed' CHECK ("status" IN ('recording', 'completed', 'failed', 'processing')),
    "capturedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Live streaming support
    "isLiveStreaming" BOOLEAN DEFAULT false,
    "liveChunks" JSONB DEFAULT '[]',
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enums for room_media
CREATE TYPE enum_room_media_mediaType AS ENUM ('screen_recording', 'digital_signature', 'captured_image');
CREATE TYPE enum_room_media_signedBy AS ENUM ('doctor', 'patient');
CREATE TYPE enum_room_media_status AS ENUM ('recording', 'completed', 'failed', 'processing');

\echo '✅ Created room_media table with mediaData column'

-- =====================================================
-- Create call_saves table (recording management)
-- =====================================================

CREATE TABLE "call_saves" (
    "id" SERIAL PRIMARY KEY,
    "roomId" VARCHAR(255) NOT NULL,
    "recordingData" VARCHAR(255), -- file path
    "fileName" VARCHAR(255),
    "duration" INTEGER, -- duration in seconds
    "fileSize" INTEGER, -- file size in bytes
    "startedAt" TIMESTAMP WITH TIME ZONE,
    "endedAt" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(20) DEFAULT 'recording' CHECK ("status" IN ('recording', 'completed', 'failed')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enum for call_saves status
CREATE TYPE enum_call_saves_status AS ENUM ('recording', 'completed', 'failed');

\echo '✅ Created call_saves table'

-- =====================================================
-- Create locations table (GPS tracking - compatible with Location model)
-- =====================================================

CREATE TABLE "locations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE, -- Reference rooms.id not rooms.roomId
    "patientLatitude" DECIMAL(10,8),
    "patientLongitude" DECIMAL(11,8),
    "patientAddress" TEXT,
    "patientLocationTimestamp" TIMESTAMP WITH TIME ZONE,
    "patientLocationAccuracy" FLOAT,
    "doctorLatitude" DECIMAL(10,8),
    "doctorLongitude" DECIMAL(11,8),
    "doctorAddress" TEXT,
    "doctorLocationTimestamp" TIMESTAMP WITH TIME ZONE,
    "doctorLocationAccuracy" FLOAT,
    "metadata" JSONB DEFAULT '{}',
    "status" VARCHAR(50) DEFAULT 'active' CHECK ("status" IN ('active', 'completed', 'failed')),
    "distanceKm" FLOAT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create enum for locations status
CREATE TYPE enum_locations_status AS ENUM ('active', 'completed', 'failed');

\echo '✅ Created locations table with correct foreign key'

-- =====================================================
-- Create indexes for performance
-- =====================================================

\echo '📊 Creating indexes...'

-- Core table indexes
CREATE INDEX "idx_doctors_email" ON "doctors"("email");
CREATE INDEX "idx_doctors_active" ON "doctors"("isActive");
CREATE INDEX "idx_patients_phone" ON "patients"("phone");
CREATE INDEX "idx_patients_email" ON "patients"("email");
CREATE INDEX "idx_rooms_doctor" ON "rooms"("doctorId");
CREATE INDEX "idx_rooms_patient" ON "rooms"("patientId");
CREATE INDEX "idx_rooms_status" ON "rooms"("status");
CREATE INDEX "idx_rooms_active" ON "rooms"("isActive");
CREATE INDEX "idx_rooms_roomid" ON "rooms"("roomId");

-- Consultations indexes
CREATE INDEX "idx_consultations_room" ON "consultations"("roomId");
CREATE INDEX "idx_consultations_doctor" ON "consultations"("doctorId");
CREATE INDEX "idx_consultations_patient" ON "consultations"("patientId");
CREATE INDEX "idx_consultations_status" ON "consultations"("status");
CREATE INDEX "idx_consultations_date" ON "consultations"("consultationDate");

-- Room Media indexes
CREATE INDEX "idx_roommedia_room_type" ON "room_media"("roomId", "mediaType");
CREATE INDEX "idx_roommedia_captured_at" ON "room_media"("capturedAt");
CREATE INDEX "idx_roommedia_status" ON "room_media"("status");
CREATE INDEX "idx_roommedia_doctor" ON "room_media"("doctorId");
CREATE INDEX "idx_roommedia_patient" ON "room_media"("patientId");
CREATE INDEX "idx_roommedia_live_streaming" ON "room_media"("isLiveStreaming") WHERE "isLiveStreaming" = true;

-- Admin indexes
CREATE INDEX "idx_admins_email" ON "admins"("email");
CREATE INDEX "idx_admins_active" ON "admins"("isactive");
CREATE INDEX "idx_admins_role" ON "admins"("role");

-- Call saves indexes
CREATE INDEX "idx_call_saves_room" ON "call_saves"("roomId");
CREATE INDEX "idx_call_saves_status" ON "call_saves"("status");
CREATE INDEX "idx_call_saves_created" ON "call_saves"("createdAt");

-- Location indexes
CREATE INDEX "idx_locations_roomId" ON "locations"("roomId");
CREATE INDEX "idx_locations_patient_coords" ON "locations"("patientLatitude", "patientLongitude");
CREATE INDEX "idx_locations_doctor_coords" ON "locations"("doctorLatitude", "doctorLongitude");
CREATE INDEX "idx_locations_createdAt" ON "locations"("createdAt");
CREATE INDEX "idx_locations_status" ON "locations"("status");

-- Media tables indexes
CREATE INDEX "idx_captured_images_room" ON "captured_images"("roomId");
CREATE INDEX "idx_captured_images_captured_at" ON "captured_images"("capturedAt");
CREATE INDEX "idx_digital_signatures_room" ON "digital_signatures"("roomId");
CREATE INDEX "idx_digital_signatures_signed_at" ON "digital_signatures"("signedAt");
CREATE INDEX "idx_screen_recordings_room" ON "screen_recordings"("roomId");
CREATE INDEX "idx_screen_recordings_status" ON "screen_recordings"("status");

\echo '✅ Indexes created successfully'

-- =====================================================
-- Create triggers for automatic timestamp updates
-- =====================================================

\echo '⚡ Creating triggers...'

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_doctors_updated_at 
    BEFORE UPDATE ON "doctors" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON "patients" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at 
    BEFORE UPDATE ON "rooms" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at 
    BEFORE UPDATE ON "consultations" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roommedia_updated_at 
    BEFORE UPDATE ON "room_media" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at 
    BEFORE UPDATE ON "admins" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_saves_updated_at 
    BEFORE UPDATE ON "call_saves" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON "locations" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_captured_images_updated_at 
    BEFORE UPDATE ON "captured_images" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digital_signatures_updated_at 
    BEFORE UPDATE ON "digital_signatures" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screen_recordings_updated_at 
    BEFORE UPDATE ON "screen_recordings" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

\echo '✅ Triggers created successfully'

-- =====================================================
-- Insert sample data
-- =====================================================

\echo '📝 Inserting sample data...'

-- Insert sample doctors
INSERT INTO "doctors" ("firstName", "lastName", "email", "password", "phone", "gender", "specialization") 
VALUES 
    ('John', 'Smith', 'john.smith@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567890', 'male', 'General Medicine'),
    ('Sarah', 'Johnson', 'sarah.johnson@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567891', 'female', 'Cardiology'),
    ('Michael', 'Brown', 'michael.brown@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+1234567892', 'male', 'Pediatrics');

-- Insert sample patient
INSERT INTO "patients" ("name", "age", "phone", "email", "gender", "address") 
VALUES 
    ('John Doe', 35, '+1234567893', 'john.doe@example.com', 'male', '123 Main St, City, State');

-- Insert a test room
INSERT INTO "rooms" ("roomId", "doctorId", "patientId", "roomName", "patientLink") 
VALUES 
    ('9999', 
     (SELECT "id" FROM "doctors" WHERE "email" = 'john.smith@hospital.com' LIMIT 1),
     (SELECT "id" FROM "patients" WHERE "name" = 'John Doe' LIMIT 1),
     'Test Room 9999',
     'http://localhost:5174/patient/9999');

\echo '✅ Sample data inserted successfully'

-- =====================================================
-- Verification
-- =====================================================

\echo '🔍 Verifying database setup...'

-- Count records in key tables
SELECT 
    'doctors' as table_name, COUNT(*) as record_count FROM "doctors"
UNION ALL
SELECT 
    'patients' as table_name, COUNT(*) as record_count FROM "patients"
UNION ALL
SELECT 
    'rooms' as table_name, COUNT(*) as record_count FROM "rooms"
UNION ALL
SELECT 
    'admins' as table_name, COUNT(*) as record_count FROM "admins"
UNION ALL
SELECT 
    'consultations' as table_name, COUNT(*) as record_count FROM "consultations"
UNION ALL
SELECT 
    'room_media' as table_name, COUNT(*) as record_count FROM "room_media"
UNION ALL
SELECT 
    'call_saves' as table_name, COUNT(*) as record_count FROM "call_saves"
UNION ALL
SELECT 
    'locations' as table_name, COUNT(*) as record_count FROM "locations"
ORDER BY table_name;

-- Check if all required columns exist
SELECT 
    'isactive column in admins' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'admins' AND column_name = 'isactive') 
         THEN '✅ EXISTS' 
         ELSE '❌ MISSING' 
    END as status
UNION ALL
SELECT 
    'mediaData column in room_media' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'room_media' AND column_name = 'mediaData') 
         THEN '✅ EXISTS' 
         ELSE '❌ MISSING' 
    END as status
UNION ALL
SELECT 
    'rooms.id reference in locations' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints tc
                      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                      WHERE tc.table_name = 'locations' AND tc.constraint_type = 'FOREIGN KEY' 
                      AND ccu.table_name = 'rooms' AND ccu.column_name = 'id') 
         THEN '✅ EXISTS' 
         ELSE '❌ MISSING' 
    END as status;

COMMIT;

-- Final success message
\echo ''
\echo '=================================================='
\echo '🎉 Complete Schema Fix Applied Successfully!'
\echo '=================================================='
\echo 'सभी tables सही तरीके से create हो गई हैं:'
\echo '✅ admins table - isactive column added'
\echo '✅ room_media table - mediaData column added'
\echo '✅ locations table - proper foreign key reference'
\echo '✅ All enums created'
\echo '✅ All indexes created'
\echo '✅ All triggers created'
\echo '✅ Sample data inserted'
\echo ''
\echo '🔑 Test Login Credentials:'
\echo '  Admin: admin@gmail.com / Admin@123'
\echo '  Doctor: john.smith@hospital.com / password123'
\echo '  Test Room: 9999'
\echo '=================================================='
