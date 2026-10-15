const { createClient } = require('@supabase/supabase-js');
const CONFIG = {
    SUPABASE_URL: 'https://uygxkddglyrwrdsnbeid.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Z3hrZGRnbHlyd3Jkc25iZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMjM3NTAsImV4cCI6MjEwMTc5OTc1MH0.rm_hgUO9Cz-xrxqPxbUGYa_DSbjDDvQrH2qUd57-Gpo'
};

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function test() {
    console.log("Fetching...");
    const { data, error } = await supabase.from('translations').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Data length:", data.length);
        console.log("First item:", data[0]);
    }
}
test();
