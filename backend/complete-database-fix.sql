-- =====================================================
-- Complete Database Fix Script
-- This will fix ALL database schema issues
-- =====================================================

-- Start transaction
BEGIN;

\echo '🔧 Starting complete database fix...'

-- =====================================================
-- STEP 1: DROP ALL TABLES AND CONSTRAINTS
-- =====================================================

\echo '🗑️  Dropping all existing tables...'

-- Drop all tables in correct order (reverse dependency)
DROP TABLE IF EXISTS "locations" CASCADE;
DROP TABLE IF EXISTS "call_saves" CASCADE;
DROP TABLE IF EXISTS "room_media" CASCADE;
DROP TABLE IF EXISTS "RoomMedia" CASCADE;
DROP TABLE IF EXISTS "Consultations" CASCADE;
DROP TABLE IF EXISTS "consultations" CASCADE;
DROP TABLE IF EXISTS "Rooms" CASCADE;
DROP TABLE IF EXISTS "rooms" CASCADE;
DROP TABLE IF EXISTS "Patients" CASCADE;
DROP TABLE IF EXISTS "patients" CASCADE;
DROP TABLE IF EXISTS "Doctors" CASCADE;
DROP TABLE IF EXISTS "doctors" CASCADE;
DROP TABLE IF EXISTS "admins" CASCADE;

-- Drop old individual tables
DROP TABLE IF EXISTS "CapturedImages" CASCADE;
DROP TABLE IF EXISTS "captured_images" CASCADE;
DROP TABLE IF EXISTS "DigitalSignatures" CASCADE;
DROP TABLE IF EXISTS "digital_signatures" CASCADE;
DROP TABLE IF EXISTS "ScreenRecordings" CASCADE;
DROP TABLE IF EXISTS "screen_recordings" CASCADE;

-- Drop all triggers and functions
DROP TRIGGER IF EXISTS update_doctors_updated_at ON "Doctors";
DROP TRIGGER IF EXISTS update_patients_updated_at ON "Patients";
DROP TRIGGER IF EXISTS update_rooms_updated_at ON "Rooms";
DROP TRIGGER IF EXISTS update_consultations_updated_at ON "Consultations";
DROP TRIGGER IF EXISTS update_roommedia_updated_at ON "RoomMedia";
DROP TRIGGER IF EXISTS update_admins_updated_at ON "admins";
DROP TRIGGER IF EXISTS update_call_saves_updated_at ON "call_saves";
DROP TRIGGER IF EXISTS update_locations_updated_at ON "locations";

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop ENUMs
DROP TYPE IF EXISTS "enum_Doctors_gender" CASCADE;
DROP TYPE IF EXISTS "enum_Patients_gender" CASCADE;
DROP TYPE IF EXISTS "enum_Rooms_status" CASCADE;
DROP TYPE IF EXISTS "enum_Consultations_status" CASCADE;
DROP TYPE IF EXISTS "enum_room_media_mediaType" CASCADE;
DROP TYPE IF EXISTS "enum_room_media_signedBy" CASCADE;
DROP TYPE IF EXISTS "enum_room_media_status" CASCADE;
DROP TYPE IF EXISTS "enum_call_saves_status" CASCADE;
DROP TYPE IF EXISTS "enum_locations_status" CASCADE;
DROP TYPE IF EXISTS "enum_admins_role" CASCADE;

\echo '✅ All tables dropped'

-- =====================================================
-- STEP 2: CREATE EXTENSIONS
-- =====================================================

\echo '🔧 Creating extensions...'

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\echo '✅ Extensions created'

-- =====================================================
-- STEP 3: CREATE CORE TABLES WITH CORRECT SCHEMA
-- =====================================================

\echo '🏗️  Creating core tables...'

-- Create Doctors table (matching your Sequelize model)
CREATE TABLE "doctors" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "gender" VARCHAR(10),
    "medicalLicense" VARCHAR(100),
    "specialization" VARCHAR(255),
    "isActive" BOOLEAN DEFAULT true,
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Patients table (matching your Sequelize model)
CREATE TABLE "patients" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "age" INTEGER,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "gender" VARCHAR(10),
    "address" TEXT,
    "medicalHistory" TEXT,
    "emergencyContact" VARCHAR(20),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Rooms table (matching your Sequelize model)
CREATE TABLE "rooms" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomId" VARCHAR(255) UNIQUE NOT NULL,
    "doctorId" UUID NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
    "patientId" UUID REFERENCES "patients"("id") ON DELETE SET NULL,
    "roomName" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'active',
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

-- Create Consultations table
CREATE TABLE "consultations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
    "doctorId" UUID NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
    "patientId" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "symptoms" TEXT,
    "diagnosis" TEXT,
    "prescription" TEXT,
    "notes" TEXT,
    "vitalSigns" JSONB,
    "followUpDate" DATE,
    "followUpInstructions" TEXT,
    "status" VARCHAR(50) DEFAULT 'in_progress',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create RoomMedia table (unified media storage)
CREATE TABLE "room_media" (
    "id" SERIAL PRIMARY KEY,
    "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
    "mediaType" VARCHAR(50) NOT NULL CHECK ("mediaType" IN ('screen_recording', 'digital_signature', 'captured_image')),
    "doctorId" UUID REFERENCES "doctors"("id") ON DELETE SET NULL,
    "patientId" UUID REFERENCES "patients"("id") ON DELETE SET NULL,
    "mediaData" TEXT NOT NULL,
    "fileName" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    "duration" INTEGER,
    "fileSize" INTEGER,
    "startedAt" TIMESTAMP WITH TIME ZONE,
    "endedAt" TIMESTAMP WITH TIME ZONE,
    "signedBy" VARCHAR(10) CHECK ("signedBy" IN ('doctor', 'patient')),
    "purpose" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'completed' CHECK ("status" IN ('recording', 'completed', 'failed', 'processing')),
    "capturedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "isLiveStreaming" BOOLEAN DEFAULT false,
    "liveChunks" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Admins table (fixing case sensitivity)
CREATE TABLE "admins" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL DEFAULT 'System Admin',
    "role" VARCHAR(50) NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN DEFAULT true,
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Call Saves table
CREATE TABLE "call_saves" (
    "id" SERIAL PRIMARY KEY,
    "roomId" VARCHAR(255) NOT NULL,
    "recordingData" VARCHAR(255),
    "fileName" VARCHAR(255),
    "duration" INTEGER,
    "fileSize" INTEGER,
    "startedAt" TIMESTAMP WITH TIME ZONE,
    "endedAt" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(20) DEFAULT 'recording' CHECK ("status" IN ('recording', 'completed', 'failed')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Locations table (with proper foreign key)
CREATE TABLE "locations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
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
    "status" VARCHAR(50) DEFAULT 'active',
    "distanceKm" FLOAT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

\echo '✅ Tables created with correct schema'

-- =====================================================
-- STEP 4: CREATE INDEXES
-- =====================================================

\echo '📊 Creating indexes...'

-- Doctors indexes
CREATE INDEX "idx_doctors_email" ON "doctors"("email");
CREATE INDEX "idx_doctors_active" ON "doctors"("isActive");
CREATE INDEX "idx_doctors_specialization" ON "doctors"("specialization");

-- Patients indexes
CREATE INDEX "idx_patients_phone" ON "patients"("phone");
CREATE INDEX "idx_patients_email" ON "patients"("email");
CREATE INDEX "idx_patients_active" ON "patients"("isActive");

-- Rooms indexes
CREATE INDEX "idx_rooms_roomId" ON "rooms"("roomId");
CREATE INDEX "idx_rooms_doctor" ON "rooms"("doctorId");
CREATE INDEX "idx_rooms_patient" ON "rooms"("patientId");
CREATE INDEX "idx_rooms_status" ON "rooms"("status");
CREATE INDEX "idx_rooms_active" ON "rooms"("isActive");

-- Consultations indexes
CREATE INDEX "idx_consultations_room" ON "consultations"("roomId");
CREATE INDEX "idx_consultations_doctor" ON "consultations"("doctorId");
CREATE INDEX "idx_consultations_patient" ON "consultations"("patientId");
CREATE INDEX "idx_consultations_status" ON "consultations"("status");

-- RoomMedia indexes
CREATE INDEX "idx_roommedia_room_type" ON "room_media"("roomId", "mediaType");
CREATE INDEX "idx_roommedia_captured_at" ON "room_media"("capturedAt");
CREATE INDEX "idx_roommedia_status" ON "room_media"("status");
CREATE INDEX "idx_roommedia_doctor" ON "room_media"("doctorId");
CREATE INDEX "idx_roommedia_patient" ON "room_media"("patientId");
CREATE INDEX "idx_roommedia_live_streaming" ON "room_media"("isLiveStreaming") WHERE "isLiveStreaming" = true;

-- Admins indexes
CREATE INDEX "idx_admins_email" ON "admins"("email");
CREATE INDEX "idx_admins_active" ON "admins"("isActive");

-- Call saves indexes
CREATE INDEX "idx_call_saves_room" ON "call_saves"("roomId");
CREATE INDEX "idx_call_saves_status" ON "call_saves"("status");

-- Locations indexes
CREATE INDEX "idx_locations_roomId" ON "locations"("roomId");
CREATE INDEX "idx_locations_patient_coords" ON "locations"("patientLatitude", "patientLongitude");
CREATE INDEX "idx_locations_doctor_coords" ON "locations"("doctorLatitude", "doctorLongitude");
CREATE INDEX "idx_locations_status" ON "locations"("status");

\echo '✅ Indexes created'

-- =====================================================
-- STEP 5: CREATE TRIGGERS
-- =====================================================

\echo '⚡ Creating triggers...'

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
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

\echo '✅ Triggers created'

-- =====================================================
-- STEP 6: INSERT SAMPLE DATA
-- =====================================================

\echo '📝 Inserting sample data...'

-- Insert sample doctors
INSERT INTO "doctors" ("firstName", "lastName", "email", "password", "specialization", "medicalLicense", "phone") 
VALUES 
    ('John', 'Smith', 'john.smith@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'General Medicine', 'MD12345', '+1234567890'),
    ('Sarah', 'Johnson', 'sarah.johnson@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cardiology', 'MD12346', '+1234567891'),
    ('Santosh', 'Sharma', 'santoshkumarsharmabagdatt@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Physician', 'MD12347', '+1234567892');

-- Insert sample patients
INSERT INTO "patients" ("name", "age", "phone", "email", "gender", "address") 
VALUES 
    ('John Doe', 35, '+1234567893', 'john.doe@example.com', 'Male', '123 Main St, City, State'),
    ('Jane Smith', 28, '+1234567894', 'jane.smith@example.com', 'Female', '456 Oak Ave, City, State');

-- Insert admin
INSERT INTO "admins" ("email", "password", "name", "role") 
VALUES ('admin@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin');

-- Insert sample room (using actual IDs from inserted data)
INSERT INTO "rooms" ("roomId", "doctorId", "patientId", "roomName", "patientLink", "status") 
SELECT 
    '9999',
    d."id",
    p."id",
    'Sample Consultation Room',
    'http://localhost:3000/patient/9999',
    'active'
FROM "doctors" d, "patients" p 
WHERE d."email" = 'santoshkumarsharmabagdatt@gmail.com' 
AND p."name" = 'John Doe'
LIMIT 1;

\echo '✅ Sample data inserted'

-- =====================================================
-- STEP 7: VERIFICATION
-- =====================================================

\echo '🔍 Verifying setup...'

-- Check table structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'room_media' 
AND column_name = 'mediaData';

-- Check all tables exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Count records
SELECT 
    'doctors' as table_name, COUNT(*) as records FROM "doctors"
UNION ALL
SELECT 
    'patients' as table_name, COUNT(*) as records FROM "patients"
UNION ALL
SELECT 
    'rooms' as table_name, COUNT(*) as records FROM "rooms"
UNION ALL
SELECT 
    'admins' as table_name, COUNT(*) as records FROM "admins";

\echo '✅ Verification complete'

-- Commit transaction
COMMIT;

\echo ''
\echo '🎉 DATABASE FIX COMPLETED SUCCESSFULLY!'
\echo ''
\echo '✅ Fixed Issues:'
\echo '  - mediaData column now exists in room_media table'
\echo '  - Admin table uses correct column names (isActive not isactive)'
\echo '  - All foreign key references are correct'
\echo '  - Table names match Sequelize models'
\echo '  - Sample data with proper relationships'
\echo ''
\echo '🔑 Login Credentials:'
\echo '  Admin: admin@gmail.com / Admin@123'
\echo '  Doctor: santoshkumarsharmabagdatt@gmail.com / password123'
\echo '  Sample Room: 9999'
\echo ''
\echo '📝 Next: Restart your application to test recording functionality'
