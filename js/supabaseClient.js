import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://agogadpcdblpsffpmapv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnb2dhZHBjZGJscHNmZnBtYXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5ODAyMzgsImV4cCI6MjA2OTU1NjIzOH0.MIik-u47v15A5FLKHBktfUjPCfAapBVANCHd1o0D1V8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);