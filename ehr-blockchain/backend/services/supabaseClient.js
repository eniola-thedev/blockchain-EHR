// services/supabaseClient.js
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  console.error("❌ Missing Supabase environment variables!");
  process.exit(1);
}

// Service role client for server-side operations (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Anon client for client-side operations (respects RLS)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

module.exports = {
  supabase,
  supabaseAnon,
};
