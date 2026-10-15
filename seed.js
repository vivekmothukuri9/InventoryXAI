const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://uygxkddglyrwrdsnbeid.supabase.co', 
    process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Z3hrZGRnbHlyd3Jkc25iZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMjM3NTAsImV4cCI6MjEwMTc5OTc1MH0.rm_hgUO9Cz-xrxqPxbUGYa_DSbjDDvQrH2qUd57-Gpo'
);

async function seed() {
    console.log("Seeding data...");
    
    // 1. Insert dummy products
    const { data: products, error: pErr } = await supabase.from('products').insert([
        { name: "Samsung 65W Charger", sku: "SAM65W01", category: "Accessories", base_price: 999 },
        { name: "USB-C to C Cable (2m)", sku: "USBC001", category: "Accessories", base_price: 399 },
        { name: "Mi Power Bank 20000mAh", sku: "PB20K", category: "Power", base_price: 1999 },
        { name: "Old Bluetooth Speaker", sku: "OBS01", category: "Audio", base_price: 1499 },
        { name: "SanDisk 32GB MicroSD", sku: "SD32G", category: "Storage", base_price: 450 }
    ]).select();
    
    if (pErr) console.error("Product Error:", pErr);
    else console.log("Products inserted.");

    // We can't insert into dealers easily if auth.users doesn't exist.
    // Let's just create a dummy dealer row directly bypassing RLS if possible?
    // Wait, since we are using ANON KEY, RLS might block it unless we use SERVICE_ROLE_KEY.
    // The RLS policy for inventory allows Anyone to view inventory. 
    // And "Dealers can insert own inventory" - we need a user ID.
}
seed();
