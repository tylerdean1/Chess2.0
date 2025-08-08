import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const { supabaseUrl, supabaseAnonKey } = (Constants as any).expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing env. Did you copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL?');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'chess20-auth' }
});
