import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ncynycpsbcctkaxiaktq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeW55Y3BzYmNjdGtheGlha3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMzQ4NzYsImV4cCI6MjA3NzcxMDg3Nn0.T5IW4D9LCQ8devXt5p70LLLibem4bNpnxolh0neGndU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);