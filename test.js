import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ukllrkglcddxzhildnub.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrbGxya2dsY2RkeHpoaWxkbnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMjMxNTAsImV4cCI6MjA2Mzc5OTE1MH0.27nEmX6EA3Rer73iPuq6Nr7km-mk5q4ILlts_7BOP7w"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'lametalera.reciclaje@gmail.com',
  password: 'lametalera'
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Access Token:', data.session.access_token);
}
