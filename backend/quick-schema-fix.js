#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function quickSchemaFix() {
  console.log('🚀 Quick WebRTC Schema Fix');
  console.log('===========================');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'webrtc_consultation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    console.log('🔧 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log('🔧 Applying critical fixes...');

    // Fix 1: Add isactive column to admins table if missing
    try {
      await client.query(`
        ALTER TABLE "admins" ADD COLUMN "isactive" BOOLEAN DEFAULT true
      `);
      console.log('✅ Added isactive column to admins table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  isactive column already exists in admins table');
      } else {
        console.log('⚠️  Could not add isactive column:', error.message);
      }
    }

    // Fix 2: Add lastlogin column to admins table if missing
    try {
      await client.query(`
        ALTER TABLE "admins" ADD COLUMN "lastlogin" TIMESTAMP WITH TIME ZONE
      `);
      console.log('✅ Added lastlogin column to admins table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  lastlogin column already exists in admins table');
      } else {
        console.log('⚠️  Could not add lastlogin column:', error.message);
      }
    }

    // Fix 3: Check and fix room_media table - add mediaData column if missing
    try {
      const result = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'room_media' AND column_name = 'mediaData'
      `);
      
      if (result.rows.length === 0) {
        await client.query(`
          ALTER TABLE "room_media" ADD COLUMN "mediaData" TEXT NOT NULL DEFAULT ''
        `);
        console.log('✅ Added mediaData column to room_media table');
      } else {
        console.log('ℹ️  mediaData column already exists in room_media table');
      }
    } catch (error) {
      console.log('⚠️  Could not check/add mediaData column:', error.message);
    }

    // Fix 4: Check locations table foreign key
    try {
      const fkResult = await client.query(`
        SELECT COUNT(*) FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
        WHERE tc.table_name = 'locations' AND tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'rooms'
      `);
      
      if (parseInt(fkResult.rows[0].count) > 0) {
        console.log('ℹ️  locations table foreign key exists');
      } else {
        console.log('⚠️  locations table foreign key needs manual fix');
      }
    } catch (error) {
      console.log('⚠️  Could not check locations foreign key:', error.message);
    }

    // Fix 5: Create default admin if not exists
    try {
      const adminExists = await client.query(`
        SELECT COUNT(*) FROM "admins" WHERE email = 'admin@gmail.com'
      `);
      
      if (parseInt(adminExists.rows[0].count) === 0) {
        await client.query(`
          INSERT INTO "admins" ("email", "password", "name", "role", "isactive") 
          VALUES ('admin@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', true)
        `);
        console.log('✅ Created default admin user');
      } else {
        console.log('ℹ️  Default admin user already exists');
      }
    } catch (error) {
      console.log('⚠️  Could not create default admin:', error.message);
    }

    // Verification
    console.log('');
    console.log('🔍 Verifying fixes...');
    
    // Check critical columns
    const checks = [
      {
        name: 'admins.isactive',
        query: "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'isactive'"
      },
      {
        name: 'admins.lastlogin',
        query: "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'lastlogin'"
      },
      {
        name: 'room_media.mediaData',
        query: "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'room_media' AND column_name = 'mediaData'"
      }
    ];

    for (const check of checks) {
      try {
        const result = await client.query(check.query);
        const exists = parseInt(result.rows[0].count) > 0;
        console.log(`  ${exists ? '✅' : '❌'} ${check.name}: ${exists ? 'EXISTS' : 'MISSING'}`);
      } catch (error) {
        console.log(`  ❓ ${check.name}: Could not check`);
      }
    }

    // Check table counts
    try {
      const tableResults = await client.query(`
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
          'rooms' as table_name, COUNT(*) as record_count FROM "rooms"
        ORDER BY table_name
      `);

      console.log('');
      console.log('📊 Table Record Counts:');
      tableResults.rows.forEach(row => {
        console.log(`  ${row.table_name}: ${row.record_count} records`);
      });
    } catch (error) {
      console.log('⚠️  Could not get table counts:', error.message);
    }

    console.log('');
    console.log('🎉 Quick schema fix completed!');
    console.log('');
    console.log('🔑 Test Credentials:');
    console.log('  Admin: admin@gmail.com / Admin@123');
    console.log('');
    console.log('🚀 Try starting your application now: npm run dev');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
quickSchemaFix().catch(console.error);
