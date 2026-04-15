import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load admin environment variables
if (fs.existsSync('.env.admin')) {
  dotenv.config({ path: '.env.admin' });
} else {
  console.log('⚠️ Skipping auto-setup: .env.admin not found. You must run SQL manually or provide Service Role key.');
  process.exit(0);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log('⚠️ Skipping auto-setup: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.admin');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigrations() {
  const migrationsDir = './supabase/migrations';
  const files = fs.readdirSync(migrationsDir).sort();

  console.log('🚀 Checking and applying migrations...');

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`  📄 Applying ${file}...`);
      
      // We use the REST API to execute SQL (Requires 'postgres' extension or similar)
      // Note: Supabase doesn't expose a raw 'sql' endpoint by default for security.
      // The most reliable way "automatically" is via the CLI.
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // If the RPC doesn't exist, we explain how to enable it once
        console.error(`  ❌ Error applying ${file}:`, error.message);
        if (error.message.includes('function "exec_sql" does not exist')) {
            console.warn('\n💡 To use this auto-script, you must first create a helper function in Supabase SQL editor once:');
            console.log('CREATE OR REPLACE FUNCTION exec_sql(sql_query text) RETURNS void AS $$ BEGIN EXECUTE sql_query; END; $$ LANGUAGE plpgsql SECURITY DEFINER;');
        }
        process.exit(1);
      }
    }
  }
  console.log('✅ All migrations applied successfully!');
}

applyMigrations();
