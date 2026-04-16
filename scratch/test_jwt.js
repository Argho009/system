import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testJwt() {
  await supabase.auth.signInWithPassword({
    email: 'admin123@college.edu',
    password: 'A123'
  });

  const { data, error } = await supabase.rpc('exec_sql_query', { 
    sql_query: "SELECT auth.jwt() as jwt" 
  });
  
  if (error) console.error('Error:', error);
  else console.log('JWT in DB:', JSON.stringify(data?.[0]?.jwt, null, 2));
}

testJwt();
