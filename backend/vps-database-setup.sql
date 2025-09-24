-- WebRTC Video Consultation Database Setup Script for VPS
-- Run this script in PostgreSQL to create the complete database schema
-- 
-- Instructions for VPS deployment:
-- 1. Connect to PostgreSQL: psql -U your_username -d your_database_name
-- 2. Run this script: \i vps-database-setup.sql
-- 3. Verify tables are created successfully

-- Create database (run this as postgres superuser if database doesn't exist)
-- CREATE DATABASE webrtc_consultation;
-- \c webrtc_consultation;

-- Start transaction
BEGIN;

-- Create extension for UUID generation (needed for some tables)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Create Doctors table
CREATE TABLE IF NOT EXISTS "Doctors" (
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
CREATE TABLE IF NOT EXISTS "Patients" (
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
CREATE TABLE IF NOT EXISTS "Rooms" (
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
CREATE TABLE IF NOT EXISTS "Consultations" (
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

-- Create Unified Room Media table (stores all media types)
CREATE TABLE IF NOT EXISTS "RoomMedia" (
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

-- =====================================================
-- ADDITIONAL TABLES
-- =====================================================

-- Create Admins table
CREATE TABLE IF NOT EXISTS "admins" (
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

-- Create Call Saves table (for recording management)
CREATE TABLE IF NOT EXISTS "call_saves" (
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

-- Create Locations table (for GPS tracking)
CREATE TABLE IF NOT EXISTS "locations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomId" VARCHAR(255) NOT NULL,
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

-- Add foreign key constraint for locations (if rooms table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Rooms') THEN
        ALTER TABLE "locations" 
        ADD CONSTRAINT "locations_roomId_fkey" 
        FOREIGN KEY ("roomId") REFERENCES "Rooms"("roomId") ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS "idx_doctors_email" ON "Doctors"("email");
CREATE INDEX IF NOT EXISTS "idx_patients_phone" ON "Patients"("phone");
CREATE INDEX IF NOT EXISTS "idx_rooms_doctor" ON "Rooms"("doctorId");
CREATE INDEX IF NOT EXISTS "idx_rooms_status" ON "Rooms"("status");
CREATE INDEX IF NOT EXISTS "idx_consultations_room" ON "Consultations"("roomId");
CREATE INDEX IF NOT EXISTS "idx_consultations_doctor" ON "Consultations"("doctorId");
CREATE INDEX IF NOT EXISTS "idx_consultations_patient" ON "Consultations"("patientId");

-- RoomMedia indexes
CREATE INDEX IF NOT EXISTS "idx_roommedia_room_type" ON "RoomMedia"("roomId", "mediaType");
CREATE INDEX IF NOT EXISTS "idx_roommedia_captured_at" ON "RoomMedia"("capturedAt");
CREATE INDEX IF NOT EXISTS "idx_roommedia_status" ON "RoomMedia"("status");
CREATE INDEX IF NOT EXISTS "idx_roommedia_doctor" ON "RoomMedia"("doctorId");
CREATE INDEX IF NOT EXISTS "idx_roommedia_patient" ON "RoomMedia"("patientId");
CREATE INDEX IF NOT EXISTS "idx_roommedia_live_streaming" ON "RoomMedia"("isLiveStreaming") WHERE "isLiveStreaming" = true;

-- Admin indexes
CREATE INDEX IF NOT EXISTS "idx_admins_email" ON "admins"("email");
CREATE INDEX IF NOT EXISTS "idx_admins_active" ON "admins"("isActive");

-- Call saves indexes
CREATE INDEX IF NOT EXISTS "idx_call_saves_room" ON "call_saves"("roomId");
CREATE INDEX IF NOT EXISTS "idx_call_saves_status" ON "call_saves"("status");
CREATE INDEX IF NOT EXISTS "idx_call_saves_created" ON "call_saves"("createdAt");

-- Location indexes
CREATE INDEX IF NOT EXISTS "idx_locations_roomId" ON "locations"("roomId");
CREATE INDEX IF NOT EXISTS "idx_locations_patient_coords" ON "locations"("patientLatitude", "patientLongitude");
CREATE INDEX IF NOT EXISTS "idx_locations_doctor_coords" ON "locations"("doctorLatitude", "doctorLongitude");
CREATE INDEX IF NOT EXISTS "idx_locations_createdAt" ON "locations"("createdAt");

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

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

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert default admin user
INSERT INTO "admins" ("email", "password", "name", "role") 
VALUES ('admin@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin')
ON CONFLICT ("email") DO NOTHING;

-- Insert sample doctors (password is 'password123' hashed)
INSERT INTO "Doctors" ("fullName", "email", "password", "specialization", "licenseNumber", "phone") 
VALUES 
    ('Dr. John Smith', 'john.smith@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'General Medicine', 'MD12345', '+1234567890'),
    ('Dr. Sarah Johnson', 'sarah.johnson@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cardiology', 'MD12346', '+1234567891'),
    ('Dr. Michael Brown', 'michael.brown@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Pediatrics', 'MD12347', '+1234567892')
ON CONFLICT ("email") DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all tables are created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count records in key tables
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
ORDER BY table_name;

-- Display success message
SELECT 
    '✅ Database setup completed successfully!' as status,
    'Admin login: admin@gmail.com / Admin@123' as admin_credentials,
    'Doctor login: john.smith@hospital.com / password123' as doctor_credentials;

-- Commit the transaction
COMMIT;

-- Final message
\echo '==================================================='
\echo 'WebRTC Video Consultation Database Setup Complete'
\echo '==================================================='
\echo 'All tables, indexes, and triggers have been created.'
\echo 'Default admin user: admin@gmail.com / Admin@123'
\echo 'Sample doctor user: john.smith@hospital.com / password123'
\echo '==================================================='
