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

console.log("🔑 Supabase URL:", supabaseUrl ? "✅ found" : "❌ MISSING");
console.log(
  "🔑 Service Role Key:",
  supabaseServiceRoleKey ? "✅ found" : "❌ MISSING",
);
console.log("🔑 Anon Key:", supabaseAnonKey ? "✅ found" : "❌ MISSING");
console.log(
  "🔑 Using service role key:",
  supabaseServiceRoleKey?.substring(0, 20) + "...",
);

module.exports = { supabase, supabaseAnon };
