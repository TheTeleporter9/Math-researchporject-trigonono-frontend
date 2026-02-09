import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from localStorage (set via admin config)
const getSupabaseConfig = () => {
  const url = localStorage.getItem('supabase_url') || ''
  const anonKey = localStorage.getItem('supabase_anon_key') || ''
  return { url, anonKey }
}

const { url, anonKey } = getSupabaseConfig()

// Create Supabase client (will work even if keys are empty for local dev)
export const supabase = url && anonKey 
  ? createClient(url, anonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key')

export const isSupabaseConfigured = () => {
  const { url, anonKey } = getSupabaseConfig()
  return !!(url && anonKey && url !== 'https://placeholder.supabase.co')
}
