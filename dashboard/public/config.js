const CONFIG = {
    // Note: Storing API keys in frontend files is not fully secure.
    // In production, you should move this to a backend server.
    RAPIDAPI_KEY: 'eb773f1d0emshc9ad3a7af2d7b00p1d269fjsn96abd3dcc54b',
    
    // Supabase
    SUPABASE_URL: 'https://uygxkddglyrwrdsnbeid.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Z3hrZGRnbHlyd3Jkc25iZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMjM3NTAsImV4cCI6MjEwMTc5OTc1MH0.rm_hgUO9Cz-xrxqPxbUGYa_DSbjDDvQrH2qUd57-Gpo',

};

// Initialize Supabase Client
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

