import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_AUTH_SUPABSASE_URL
const supabaseAnonKey = import.meta.env.VITE_AUTH_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)