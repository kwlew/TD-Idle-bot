const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase is not configured — set SUPABASE_URL and SUPABASE_KEY in your .env file.');
}

// The bot is a trusted server-side process talking to a table with RLS
// enabled and no policies, so SUPABASE_KEY must be the service_role key
// (Project Settings → API → service_role) — the anon/public key would get
// zero rows back from every query.
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
});

module.exports = supabase;
