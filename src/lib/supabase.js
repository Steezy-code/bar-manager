import { createClient } from '@supabase/supabase-js'

// Replace these with your own Supabase credentials after setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const TABLES = {
  PROFILES: 'profiles',
  INVENTORY: 'inventory_items',
  SHIFTS: 'shifts',
  CHECKLISTS: 'checklists',
  TIME_OFF: 'time_off_requests'
}
