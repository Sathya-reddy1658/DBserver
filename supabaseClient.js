// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yymvzwupfugsjctnzksh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bXZ6d3VwZnVnc2pjdG56a3NoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTA0MTE2MCwiZXhwIjoyMDQwNjE3MTYwfQ.q9FfJ-MxXsQEbSd5w_5KessCuTfKgWQCvd6sw_sKc0U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
