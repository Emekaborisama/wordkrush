import { createClient } from '@supabase/supabase-js';

export function pipelineDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY; // server-side only — never ships in the app
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SECRET_KEY must be set. Run via: npm run pipeline:<cmd> (loads .env)',
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
