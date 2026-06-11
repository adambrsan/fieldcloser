import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nmaddekwjjpgjcgrfylx.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_wOi9TP3MBpv0dPCm7LnJNw_7zCE3oAV'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
