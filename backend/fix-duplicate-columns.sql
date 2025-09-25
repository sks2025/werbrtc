-- Fix duplicate columns in room_media table
-- This script removes duplicate lowercase columns and keeps camelCase ones

-- First, backup any existing data from lowercase columns to camelCase columns
-- Only update where camelCase column is null but lowercase has value

UPDATE room_media 
SET "roomId" = roomid 
WHERE "roomId" IS NULL AND roomid IS NOT NULL;

UPDATE room_media 
SET "mediaType" = mediatype 
WHERE "mediaType" IS NULL AND mediatype IS NOT NULL;

UPDATE room_media 
SET "doctorId" = doctorid 
WHERE "doctorId" IS NULL AND doctorid IS NOT NULL;

UPDATE room_media 
SET "patientId" = patientid 
WHERE "patientId" IS NULL AND patientid IS NOT NULL;

UPDATE room_media 
SET "mediaData" = mediadata 
WHERE "mediaData" IS NULL AND mediadata IS NOT NULL;

UPDATE room_media 
SET "fileName" = filename 
WHERE "fileName" IS NULL AND filename IS NOT NULL;

UPDATE room_media 
SET "fileSize" = filesize 
WHERE "fileSize" IS NULL AND filesize IS NOT NULL;

UPDATE room_media 
SET "startedAt" = startedat 
WHERE "startedAt" IS NULL AND startedat IS NOT NULL;

UPDATE room_media 
SET "endedAt" = endedat 
WHERE "endedAt" IS NULL AND endedat IS NOT NULL;

UPDATE room_media 
SET "signedBy" = signedby 
WHERE "signedBy" IS NULL AND signedby IS NOT NULL;

UPDATE room_media 
SET "capturedAt" = capturedat 
WHERE "capturedAt" IS NULL AND capturedat IS NOT NULL;

UPDATE room_media 
SET "isLiveStreaming" = islivestreaming 
WHERE "isLiveStreaming" IS NULL AND islivestreaming IS NOT NULL;

UPDATE room_media 
SET "liveChunks" = livechunks 
WHERE "liveChunks" IS NULL AND livechunks IS NOT NULL;

-- Now drop the duplicate lowercase columns
ALTER TABLE room_media DROP COLUMN IF EXISTS roomid;
ALTER TABLE room_media DROP COLUMN IF EXISTS mediatype;
ALTER TABLE room_media DROP COLUMN IF EXISTS doctorid;
ALTER TABLE room_media DROP COLUMN IF EXISTS patientid;
ALTER TABLE room_media DROP COLUMN IF EXISTS mediadata;
ALTER TABLE room_media DROP COLUMN IF EXISTS filename;
ALTER TABLE room_media DROP COLUMN IF EXISTS filesize;
ALTER TABLE room_media DROP COLUMN IF EXISTS startedat;
ALTER TABLE room_media DROP COLUMN IF EXISTS endedat;
ALTER TABLE room_media DROP COLUMN IF EXISTS signedby;
ALTER TABLE room_media DROP COLUMN IF EXISTS capturedat;
ALTER TABLE room_media DROP COLUMN IF EXISTS islivestreaming;
ALTER TABLE room_media DROP COLUMN IF EXISTS livechunks;

-- Add NOT NULL constraints to required camelCase columns
ALTER TABLE room_media ALTER COLUMN "roomId" SET NOT NULL;
ALTER TABLE room_media ALTER COLUMN "mediaType" SET NOT NULL;
ALTER TABLE room_media ALTER COLUMN "mediaData" SET NOT NULL;

-- Add default values for required fields
ALTER TABLE room_media ALTER COLUMN "capturedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE room_media ALTER COLUMN "isLiveStreaming" SET DEFAULT false;
ALTER TABLE room_media ALTER COLUMN "liveChunks" SET DEFAULT '[]'::jsonb;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'room_media' 
ORDER BY ordinal_position;
