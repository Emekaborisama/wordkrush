/**
 * Supabase client for the APP (not the pipeline).
 *
 * Uses the PUBLISHABLE key only. The secret key must never reach a client
 * bundle, which is why only EXPO_PUBLIC_* variables are read here — Expo
 * inlines those and nothing else (STACK D-016).
 *
 * Security rests on Row Level Security, not on hiding this key. The
 * publishable key is meant to be public; the policies in
 * supabase/migrations/0002_leaderboard.sql are what stop a player writing
 * someone else's score.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const canPersistSession = typeof window !== 'undefined';

/**
 * Null when the app is built without Supabase configured. Every caller must
 * handle that: online features are strictly additive and the game has to stay
 * fully playable offline (D-004, D-016).
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          ...(canPersistSession ? { storage: AsyncStorage } : {}),
          autoRefreshToken: canPersistSession,
          persistSession: canPersistSession,
          // Web must parse the magic-link redirect. Native uses a deep-link
          // handler instead — URL detection here would fight that exchange.
          // `document` is the web check so this module stays out of React Native
          // (Vitest loads it from scores/global tests).
          detectSessionInUrl: typeof document !== 'undefined',
          flowType: 'pkce',
        },
      })
    : null;

export const isBackendConfigured = supabase !== null;
