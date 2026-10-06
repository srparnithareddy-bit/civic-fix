const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_url_here') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized with remote endpoint:', supabaseUrl);
  } catch (err) {
    console.warn('⚠️ Could not initialize remote Supabase client, falling back to local store:', err.message);
  }
} else {
  console.log('ℹ️ Remote Supabase credentials not provided. Using local autonomous DB store.');
}

module.exports = { supabase };
