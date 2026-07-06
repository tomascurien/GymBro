require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Faltan las credenciales de SUPABASE_URL o SUPABASE_KEY en el .env');
}

// Inicializamos el cliente
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Cliente de Supabase Storage inicializado.');

module.exports = supabase;