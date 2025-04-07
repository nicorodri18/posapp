import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gqgervkyaxulgxwqgyax.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZ2Vydmt5YXh1bGd4d3FneWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTcyODMsImV4cCI6MjA1OTE5MzI4M30.oa22ryxh6KsePznzEjuy7aml0roCSzR-nNUoKQC94ow';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
