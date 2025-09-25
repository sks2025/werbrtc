#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function fixRoomMediaTable() {
  console.log('🔧 Fixing room_media table column mappings...');
  
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Add missing camelCase columns that Sequelize expects
    const columnsToAdd = [
      { name: 'startedAt', type: 'TIMESTAMP WITH TIME ZONE', existing: 'startedat' },
      { name: 'endedAt', type: 'TIMESTAMP WITH TIME ZONE', existing: 'endedat' },
      { name: 'fileSize', type: 'INTEGER', existing: 'filesize' },
      { name: 'signedBy', type: 'VARCHAR(10)', existing: 'signedby' },
      { name: 'capturedAt', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP', existing: 'capturedat' },
      { name: 'isLiveStreaming', type: 'BOOLEAN DEFAULT false', existing: 'islivestreaming' },
      { name: 'liveChunks', type: 'JSONB DEFAULT \'[]\'', existing: 'livechunks' },
      { name: 'createdAt', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP', existing: 'createdat' },
      { name: 'updatedAt', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP', existing: 'updatedat' }
    ];

    for (const col of columnsToAdd) {
      try {
        // Check if camelCase column exists
        const checkResult = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'room_media' AND column_name = $1
        `, [col.name]);

        if (checkResult.rows.length === 0) {
          // Add the camelCase column
          await client.query(`ALTER TABLE "room_media" ADD COLUMN "${col.name}" ${col.type}`);
          
          // Copy data from existing lowercase column if it exists
          const lowercaseExists = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'room_media' AND column_name = $1
          `, [col.existing]);

          if (lowercaseExists.rows.length > 0 && col.existing !== col.name) {
            await client.query(`UPDATE "room_media" SET "${col.name}" = "${col.existing}"`);
            console.log(`✅ Added ${col.name} column and copied data from ${col.existing}`);
          } else {
            console.log(`✅ Added ${col.name} column`);
          }
        } else {
          console.log(`ℹ️  ${col.name} column already exists`);
        }
      } catch (error) {
        console.log(`⚠️  Could not add ${col.name}:`, error.message);
      }
    }

    // Create updated_at trigger function if not exists
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION update_room_media_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW."updatedAt" = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS update_room_media_updated_at_trigger ON "room_media";
        CREATE TRIGGER update_room_media_updated_at_trigger 
            BEFORE UPDATE ON "room_media" 
            FOR EACH ROW EXECUTE FUNCTION update_room_media_updated_at();
      `);
      
      console.log('✅ Created updated_at trigger for room_media');
    } catch (error) {
      console.log('⚠️  Could not create trigger:', error.message);
    }

    // Verify columns
    console.log('\n🔍 Verifying room_media columns...');
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'room_media' AND column_name IN (
        'startedAt', 'endedAt', 'fileSize', 'signedBy', 'capturedAt', 
        'isLiveStreaming', 'liveChunks', 'createdAt', 'updatedAt', 'mediaData'
      )
      ORDER BY column_name
    `);

    const requiredColumns = ['startedAt', 'endedAt', 'fileSize', 'signedBy', 'capturedAt', 
                            'isLiveStreaming', 'liveChunks', 'createdAt', 'updatedAt', 'mediaData'];
    
    console.log('Required columns status:');
    requiredColumns.forEach(col => {
      const exists = result.rows.some(row => row.column_name === col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });

    console.log('\n🎉 room_media table fix completed!');
    console.log('🚀 Try recording again - it should work now.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixRoomMediaTable().catch(console.error);
