import { createClient } from '@supabase/supabase-js';
const URL = 'https://ovdzbhvpktjctucuppxx.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZHpiaHZwa3RqY3R1Y3VwcHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MDY4NTEsImV4cCI6MjA5NzQ4Mjg1MX0.RxgO870UY7Ia8t04ZJ3PyaohMka9mX4MalDEQKqtcEQ';
export const supabase = createClient(URL, KEY);
