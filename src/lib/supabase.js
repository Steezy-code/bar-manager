import { createClient } from '@supabase/supabase-js'
import { demoClient } from './supabaseMock'

// Demo mode (default ON) runs the app against an in-memory mock so it works with no
// backend — the original Supabase project was repurposed. Set VITE_DEMO_MODE=false to
// use a real Supabase project via the env vars below.
const DEMO = import.meta.env.VITE_DEMO_MODE !== 'false'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = DEMO ? demoClient : createClient(supabaseUrl, supabaseAnonKey)

export const TABLES = {
  PROFILES: 'profiles',
  INVENTORY: 'inventory_items',
  SHIFTS: 'shifts',
  CHECKLISTS: 'checklists',
  TIME_OFF: 'time_off_requests',
  ANNOUNCEMENTS: 'announcements',
  ROLES: 'roles',
  USER_ROLES: 'user_roles'
}
