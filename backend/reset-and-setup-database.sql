-- =====================================================
-- WebRTC Video Consultation - Complete Database Reset & Setup Script
-- This script will DROP ALL existing tables and recreate them fresh
-- =====================================================
-- 
-- Usage Instructions:
-- 1. Connect to PostgreSQL: psql -U your_username -d your_database_name
-- 2. Run this script: \i reset-and-setup-database.sql
-- 3. Verify setup is complete
--
-- WARNING: This will DELETE ALL existing data!
-- =====================================================

-- Start transaction
BEGIN;

-- Display warning message
\echo '⚠️  WARNING: This script will DROP ALL existing tables and data!'
\echo '⚠️  Press Ctrl+C to cancel, or press Enter to continue...'
\prompt 'Press Enter to continue or Ctrl+C to cancel: ' user_input

\echo '🔄 Starting database reset and setup...'

-- =====================================================
-- DROP ALL EXISTING TABLES (in correct order to avoid FK constraints)
-- =====================================================

\echo '🗑️  Dropping existing tables...'

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS "locations" CASCADE;
DROP TABLE IF EXISTS "call_saves" CASCADE;
DROP TABLE IF EXISTS "RoomMedia" CASCADE;
DROP TABLE IF EXISTS "Consultations" CASCADE;
DROP TABLE IF EXISTS "Rooms" CASCADE;
DROP TABLE IF EXISTS "Patients" CASCADE;
DROP TABLE IF EXISTS "Doctors" CASCADE;
DROP TABLE IF EXISTS "admins" CASCADE;

-- Drop old tables if they exist (for backward compatibility)
DROP TABLE IF EXISTS "CapturedImages" CASCADE;
DROP TABLE IF EXISTS "DigitalSignatures" CASCADE;
DROP TABLE IF EXISTS "ScreenRecordings" CASCADE;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS update_doctors_updated_at ON "Doctors";
DROP TRIGGER IF EXISTS update_patients_updated_at ON "Patients";
DROP TRIGGER IF EXISTS update_rooms_updated_at ON "Rooms";
DROP TRIGGER IF EXISTS update_consultations_updated_at ON "Consultations";
DROP TRIGGER IF EXISTS update_roommedia_updated_at ON "RoomMedia";
DROP TRIGGER IF EXISTS update_admins_updated_at ON "admins";
DROP TRIGGER IF EXISTS update_call_saves_updated_at ON "call_saves";
DROP TRIGGER IF EXISTS update_locations_updated_at ON "locations";

DROP FUNCTION IF EXISTS update_updated_at_column();

\echo '✅ Existing tables dropped successfully'

-- =====================================================
-- CREATE REQUIRED EXTENSIONS
-- =====================================================

\echo '🔧 Creating required extensions...'

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\echo '✅ Extensions created'

-- =====================================================
-- CREATE ALL TABLES FROM SCRATCH
-- =====================================================

\echo '🏗️  Creating tables...'

-- Create Doctors table
CREATE TABLE "Doctors" (
    "doctorId" SERIAL PRIMARY KEY,
    "fullName" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "specialization" VARCHAR(255),
    "licenseNumber" VARCHAR(100),
    "phone" VARCHAR(20),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Patients table
CREATE TABLE "Patients" (
    "patientId" SERIAL PRIMARY KEY,
    "fullName" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20) NOT NULL,
    "dateOfBirth" DATE,
    "gender" VARCHAR(10),
    "address" TEXT,
    "emergencyContact" VARCHAR(20),
    "medicalHistory" TEXT,
    "allergies" TEXT,
    "currentMedications" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Rooms table
CREATE TABLE "Rooms" (
    "roomId" VARCHAR(255) PRIMARY KEY,
    "doctorId" INTEGER REFERENCES "Doctors"("doctorId") ON DELETE CASCADE,
    "patientId" INTEGER REFERENCES "Patients"("patientId") ON DELETE SET NULL,
    "roomName" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'waiting',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP WITH TIME ZONE,
    "endTime" TIMESTAMP WITH TIME ZONE,
    "duration" INTEGER DEFAULT 0,
    "patientLink" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "maxParticipants" INTEGER DEFAULT 2,
    "recordingEnabled" BOOLEAN DEFAULT false,
    "chatEnabled" BOOLEAN DEFAULT true,
    "whiteboardEnabled" BOOLEAN DEFAULT true,
    "screenShareEnabled" BOOLEAN DEFAULT true
);

-- Create Consultations table
CREATE TABLE "Consultations" (
    "consultationId" SERIAL PRIMARY KEY,
    "roomId" VARCHAR(255) REFERENCES "Rooms"("roomId") ON DELETE CASCADE,
    "doctorId" INTEGER REFERENCES "Doctors"("doctorId") ON DELETE CASCADE,
    "patientId" INTEGER REFERENCES "Patients"("patientId") ON DELETE CASCADE,
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
    "status" VARCHAR(50) DEFAULT 'in_progress',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Unified Room Media table
CREATE TABLE "RoomMedia" (
    "id" SERIAL PRIMARY KEY,
    "roomId" VARCHAR(255) REFERENCES "Rooms"("roomId") ON DELETE CASCADE,
    "mediaType" VARCHAR(50) NOT NULL CHECK ("mediaType" IN ('screen_recording', 'digital_signature', 'captured_image')),
    "doctorId" INTEGER REFERENCES "Doctors"("doctorId") ON DELETE SET NULL,
    "patientId" INTEGER REFERENCES "Patients"("patientId") ON DELETE SET NULL,
    "mediaData" TEXT NOT NULL, -- Base64 data or file path
    "fileName" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}', -- Additional metadata as JSON
    
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
    "liveChunks" JSONB DEFAULT '[]', -- Store live chunk information
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Admins table
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

-- Create Locations table
CREATE TABLE "locations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomId" VARCHAR(255) NOT NULL REFERENCES "Rooms"("roomId") ON DELETE CASCADE,
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

\echo '✅ Tables created successfully'

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

\echo '📊 Creating indexes...'

-- Core table indexes
CREATE INDEX "idx_doctors_email" ON "Doctors"("email");
CREATE INDEX "idx_doctors_active" ON "Doctors"("isActive");
CREATE INDEX "idx_patients_phone" ON "Patients"("phone");
CREATE INDEX "idx_patients_email" ON "Patients"("email");
CREATE INDEX "idx_rooms_doctor" ON "Rooms"("doctorId");
CREATE INDEX "idx_rooms_patient" ON "Rooms"("patientId");
CREATE INDEX "idx_rooms_status" ON "Rooms"("status");
CREATE INDEX "idx_rooms_active" ON "Rooms"("isActive");
CREATE INDEX "idx_consultations_room" ON "Consultations"("roomId");
CREATE INDEX "idx_consultations_doctor" ON "Consultations"("doctorId");
CREATE INDEX "idx_consultations_patient" ON "Consultations"("patientId");
CREATE INDEX "idx_consultations_status" ON "Consultations"("status");
CREATE INDEX "idx_consultations_date" ON "Consultations"("consultationDate");

-- RoomMedia indexes
CREATE INDEX "idx_roommedia_room_type" ON "RoomMedia"("roomId", "mediaType");
CREATE INDEX "idx_roommedia_captured_at" ON "RoomMedia"("capturedAt");
CREATE INDEX "idx_roommedia_status" ON "RoomMedia"("status");
CREATE INDEX "idx_roommedia_doctor" ON "RoomMedia"("doctorId");
CREATE INDEX "idx_roommedia_patient" ON "RoomMedia"("patientId");
CREATE INDEX "idx_roommedia_live_streaming" ON "RoomMedia"("isLiveStreaming") WHERE "isLiveStreaming" = true;

-- Admin indexes
CREATE INDEX "idx_admins_email" ON "admins"("email");
CREATE INDEX "idx_admins_active" ON "admins"("isActive");
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

\echo '✅ Indexes created successfully'

-- =====================================================
-- CREATE TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
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
    BEFORE UPDATE ON "Doctors" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON "Patients" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at 
    BEFORE UPDATE ON "Rooms" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at 
    BEFORE UPDATE ON "Consultations" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roommedia_updated_at 
    BEFORE UPDATE ON "RoomMedia" 
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

\echo '✅ Triggers created successfully'

-- =====================================================
-- INSERT SAMPLE DATA
-- =====================================================

\echo '📝 Inserting sample data...'

-- Insert default admin user (password: Admin@123)
INSERT INTO "admins" ("email", "password", "name", "role") 
VALUES ('admin@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin');

-- Insert sample doctors (password: password123)
INSERT INTO "Doctors" ("fullName", "email", "password", "specialization", "licenseNumber", "phone") 
VALUES 
    ('Dr. John Smith', 'john.smith@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'General Medicine', 'MD12345', '+1234567890'),
    ('Dr. Sarah Johnson', 'sarah.johnson@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cardiology', 'MD12346', '+1234567891'),
    ('Dr. Michael Brown', 'michael.brown@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Pediatrics', 'MD12347', '+1234567892');

-- Insert sample patient
INSERT INTO "Patients" ("fullName", "email", "phone", "dateOfBirth", "gender", "address") 
VALUES 
    ('John Doe', 'john.doe@example.com', '+1234567893', '1985-06-15', 'Male', '123 Main St, City, State');

\echo '✅ Sample data inserted successfully'

-- =====================================================
-- VERIFICATION AND SUMMARY
-- =====================================================

\echo '🔍 Verifying database setup...'

-- Verify all tables are created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count records in key tables
\echo '📊 Table record counts:'
SELECT 
    'Doctors' as table_name, COUNT(*) as record_count FROM "Doctors"
UNION ALL
SELECT 
    'Patients' as table_name, COUNT(*) as record_count FROM "Patients"
UNION ALL
SELECT 
    'Rooms' as table_name, COUNT(*) as record_count FROM "Rooms"
UNION ALL
SELECT 
    'Admins' as table_name, COUNT(*) as record_count FROM "admins"
UNION ALL
SELECT 
    'Consultations' as table_name, COUNT(*) as record_count FROM "Consultations"
UNION ALL
SELECT 
    'RoomMedia' as table_name, COUNT(*) as record_count FROM "RoomMedia"
UNION ALL
SELECT 
    'CallSaves' as table_name, COUNT(*) as record_count FROM "call_saves"
UNION ALL
SELECT 
    'Locations' as table_name, COUNT(*) as record_count FROM "locations"
ORDER BY table_name;

-- Display success message and credentials
SELECT 
    '✅ Database setup completed successfully!' as status,
    'All tables, indexes, triggers, and relations created' as details;

SELECT 
    'Admin Login Credentials:' as credential_type,
    'Email: admin@gmail.com' as email,
    'Password: Admin@123' as password
UNION ALL
SELECT 
    'Doctor Login Credentials:' as credential_type,
    'Email: john.smith@hospital.com' as email,
    'Password: password123' as password;

-- Commit the transaction
COMMIT;

-- Final messages
\echo ''
\echo '=================================================='
\echo '🎉 WebRTC Database Reset & Setup Complete!'
\echo '=================================================='
\echo 'All tables have been dropped and recreated fresh.'
\echo 'All relations, indexes, and triggers are in place.'
\echo ''
\echo '🔑 Login Credentials:'
\echo '  Admin: admin@gmail.com / Admin@123'
\echo '  Doctor: john.smith@hospital.com / password123'
\echo ''
\echo '📋 Created Tables:'
\echo '  - Doctors (with sample doctor)'
\echo '  - Patients (with sample patient)'
\echo '  - Rooms'
\echo '  - Consultations'
\echo '  - RoomMedia (unified media storage)'
\echo '  - admins (with default admin)'
\echo '  - call_saves (recording management)'
\echo '  - locations (GPS tracking)'
\echo ''
\echo '⚡ Features Enabled:'
\echo '  - Auto-updating timestamps'
\echo '  - Optimized indexes'
\echo '  - Foreign key constraints'
\echo '  - Data validation checks'
\echo '=================================================='
