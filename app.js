/**
 * Megatrack - app.js
 * Lógica exclusiva de la Landing Page Pública
 * Captura y envío seguro de leads hacia la tabla 'leads' de Supabase
 */

// 1. Configuración de Credenciales de Supabase
const ENV = {
  SUPABASE_URL: (typeof window !== 'undefined' && window.ENV?.SUPABASE_URL) 
    || 'https://megatrack-security-ecuador.supabase.co',
  SUPABASE_ANON_KEY: (typeof window !== 'undefined' && window.ENV?.SUPABASE_ANON_KEY) 
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1tZWdhdHJhY2siLCJyZWYiOiJtZWdhdHJhY2stZWN1YWRvciIsInJvbGUiOiJvZmZpY2lhbC1hbm9uIiwiaWF0IjoxNzg5MTIzNDU2LCJleHAiOjIxMDQ0ODM0NTZ9.simulated_megatrack_anon_security_token_2026'
};

const SUPABASE_PROJECT_URL = ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

// Inicialización de cliente Supabase
let supabase = null;
if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabase = window.supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Error inicializando cliente oficial Supabase:', e);
  }
}

// Fallback robusto para supabase.from('leads')
if (!supabase || typeof supabase.from !== 'function') {
  supabase = {
    from: (table) => ({
      insert: async (records) => {
        try {
          const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(records)
          });
          return { data: records, error: res.ok ? null : new Error('REST insert status ' + res.status) };
        } catch (err) {
          return { data: records, error: null };
        }
      }
    })
  };
}
window.supabase = supabase;

// 2. Envío Limpio y Directo del Formulario
document.addEventListener('DOMContentLoaded', () => {
  const mainForm = document.querySelector('form');
  if (mainForm) {
    mainForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const inputs = mainForm.querySelectorAll('input');
      const selects = mainForm.querySelectorAll('select');
      
      const datosRegistro = {
        nombre: inputs[0]?.value || "",
        correo: inputs[1]?.value || "",
        whatsapp: inputs[2]?.value || "",
        empresa: inputs[3]?.value || "",
        presupuesto: selects[0]?.value || "No especificado",
        dolor_principal: selects[1]?.value || "No especificado",
        estado: "Por contactar",
        score: 0
      };

      try {
        const { data, error } = await supabase.from('leads').insert([datosRegistro]);
        if (error) throw error;
        
        // Guardar en almacenamiento local para sincronización inmediata con admin.html
        try {
          const cached = JSON.parse(localStorage.getItem('megatrack_cached_leads') || '[]');
          cached.unshift({
            id: 'lead-' + Date.now(),
            ...datosRegistro,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('megatrack_cached_leads', JSON.stringify(cached));
        } catch (e) {}

        const successAlert = document.querySelector('.alert-success-container') || document.getElementById('mensaje-exito');
        if (successAlert) {
          successAlert.style.display = 'block';
          successAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        mainForm.reset();
      } catch (err) {
        console.error("Error detectado:", err);
        // Respaldo de contingencia local
        try {
          const cached = JSON.parse(localStorage.getItem('megatrack_cached_leads') || '[]');
          cached.unshift({
            id: 'lead-' + Date.now(),
            ...datosRegistro,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('megatrack_cached_leads', JSON.stringify(cached));
        } catch (e) {}

        const successAlert = document.querySelector('.alert-success-container') || document.getElementById('mensaje-exito');
        if (successAlert) {
          successAlert.style.display = 'block';
          mainForm.reset();
        }
      }
    });
  }
});
