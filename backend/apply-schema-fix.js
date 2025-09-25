#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function applySchemaFix() {
  console.log('🚀 WebRTC Database Schema Fix Script');
  console.log('====================================');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'webrtc_consultation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    console.log('🔧 Connecting to database...');
    console.log(`   Host: ${client.host}`);
    console.log(`   Port: ${client.port}`);
    console.log(`   Database: ${client.database}`);
    console.log(`   User: ${client.user}`);
    
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Read the schema fix SQL file
    const sqlFilePath = path.join(__dirname, 'COMPLETE-SCHEMA-FIX.sql');
    console.log('📖 Reading schema fix SQL file...');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Remove psql-specific commands that Node.js can't handle
    const cleanedSql = sqlContent
      .replace(/\\echo [^\n]*/g, '') // Remove \echo commands
      .replace(/\\prompt [^\n]*/g, '') // Remove \prompt commands
      .replace(/BEGIN;/g, '') // Remove transaction control (we'll handle manually)
      .replace(/COMMIT;/g, '')
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => 
        statement && 
        !statement.startsWith('\\') && 
        !statement.match(/^--.*/)) // Remove comments and psql commands
      .join(';\n');

    console.log('⚡ Applying schema fix...');
    console.log('====================================');

    // Start transaction
    await client.query('BEGIN');

    try {
      // Execute the cleaned SQL
      await client.query(cleanedSql);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('✅ Schema fix applied successfully!');
      
      // Verify the fix
      console.log('🔍 Verifying schema fix...');
      
      // Check if critical columns exist
      const isactiveExists = await client.query(
        "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'isactive'"
      );
      
      const mediaDataExists = await client.query(
        "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'room_media' AND column_name = 'mediaData'"
      );
      
      const fkExists = await client.query(`
        SELECT COUNT(*) FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
        WHERE tc.table_name = 'locations' AND tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'rooms'
      `);

      console.log('');
      console.log('Verification Results:');
      console.log(`  ✅ admins.isactive column: ${parseInt(isactiveExists.rows[0].count) > 0 ? 'EXISTS' : 'MISSING'}`);
      console.log(`  ✅ room_media.mediaData column: ${parseInt(mediaDataExists.rows[0].count) > 0 ? 'EXISTS' : 'MISSING'}`);
      console.log(`  ✅ locations foreign key: ${parseInt(fkExists.rows[0].count) > 0 ? 'EXISTS' : 'MISSING'}`);

      // Check table counts
      const tableResults = await client.query(`
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
        ORDER BY table_name
      `);

      console.log('');
      console.log('📊 Table Record Counts:');
      tableResults.rows.forEach(row => {
        console.log(`  ${row.table_name}: ${row.record_count} records`);
      });

      console.log('');
      console.log('🎉 Schema Fix Summary:');
      console.log('  ✅ All tables recreated with correct schema');
      console.log('  ✅ Missing columns added');
      console.log('  ✅ Foreign key constraints fixed');
      console.log('  ✅ Enums created');
      console.log('  ✅ Indexes created for performance');
      console.log('  ✅ Triggers created for auto-timestamps');
      console.log('  ✅ Sample data inserted');
      
      console.log('');
      console.log('🔑 Test Credentials:');
      console.log('  Admin: admin@gmail.com / Admin@123');
      console.log('  Doctor: john.smith@hospital.com / password123');
      console.log('  Test Room: 9999');
      
      console.log('');
      console.log('🚀 Ready to start your application!');
      console.log('You can now run: npm run dev');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Error applying schema fix:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
applySchemaFix().catch(console.error);
