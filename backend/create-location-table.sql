-- Create Location table manually if automatic sync fails
-- Run this script directly in PostgreSQL if needed

CREATE TABLE IF NOT EXISTS "locations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomId" UUID NOT NULL,
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

-- Add foreign key constraint if rooms table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rooms') THEN
    ALTER TABLE "locations" 
    ADD CONSTRAINT "locations_roomId_fkey" 
    FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "locations_roomId_idx" ON "locations"("roomId");
CREATE INDEX IF NOT EXISTS "locations_patient_coords_idx" ON "locations"("patientLatitude", "patientLongitude");
CREATE INDEX IF NOT EXISTS "locations_doctor_coords_idx" ON "locations"("doctorLatitude", "doctorLongitude");
CREATE INDEX IF NOT EXISTS "locations_createdAt_idx" ON "locations"("createdAt");

-- Add update trigger for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_locations_updated_at 
  BEFORE UPDATE ON "locations" 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Verify table creation
SELECT 'Location table created successfully' as status, 
       COUNT(*) as existing_records 
FROM "locations";
