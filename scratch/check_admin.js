import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.admin' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql_query', { 
    sql_query: "SELECT id, email, raw_app_meta_data FROM auth.users WHERE id = 'f122b460-a2e6-4b65-a385-43e26132befb'" 
  });
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}

check();
