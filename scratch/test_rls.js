import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testRls() {
  // Login as ADMIN123
  console.log('Logging in as ADMIN123...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin123@college.edu',
    password: 'A123'
  });

  if (authError) return console.error('Login failed:', authError.message);
  console.log('Logged in. User role in metadata:', authData.user.app_metadata.role);

  // Try to insert a user
  console.log('Trying to insert a new user...');
  const { data, error } = await supabase.from('users').insert({
    college_id: 'test_user_' + Date.now(),
    name: 'Test Name',
    role: 'hod',
    is_active: true
  }).select();

  if (error) {
    console.error('Insert Failed Error:', error);
  } else {
    console.log('Insert Success. Data:', data);
  }
}

testRls();
