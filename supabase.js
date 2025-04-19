import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcbbukufgqyaylaohvua.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYmJ1a3VmZ3F5YXlsYW9odnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3Njk2NDcsImV4cCI6MjA2MDM0NTY0N30.K--0J0gRVTixZIzJ3Zh6La9VkJMdaSSJCo4IHnDy6hQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);