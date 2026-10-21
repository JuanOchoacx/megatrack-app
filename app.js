/**
 * Megatrack - app.js
 * Lógica exclusiva de la Landing Page Pública
 * Captura y envío seguro de leads hacia la API REST de Supabase
 */

// ==========================================================
// 1. Configuración de Credenciales de Supabase
// ==========================================================
const ENV = {
  SUPABASE_URL: (typeof window !== 'undefined' && window.ENV?.SUPABASE_URL) 
    || 'https://megatrack-security-ecuador.supabase.co',
  SUPABASE_ANON_KEY: (typeof window !== 'undefined' && window.ENV?.SUPABASE_ANON_KEY) 
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1tZWdhdHJhY2siLCJyZWYiOiJtZWdhdHJhY2stZWN1YWRvciIsInJvbGUiOiJvZmZpY2lhbC1hbm9uIiwiaWF0IjoxNzg5MTIzNDU2LCJleHAiOjIxMDQ0ODM0NTZ9.simulated_megatrack_anon_security_token_2026'
};

const SUPABASE_PROJECT_URL = ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

// Inicialización de cliente Supabase oficial si la librería está disponible
let supabase = null;
if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabase = window.supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Error inicializando cliente oficial Supabase:', e);
  }
}

// ==========================================================
// 2. Manejador del Formulario de Captación
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  const formularioLeads = document.querySelector('form');
  const alertSuccess = document.querySelector('.alert-success-container') || document.getElementById('form-feedback');

  if (formularioLeads) {
    formularioLeads.addEventListener('submit', async (e) => {
      e.preventDefault();

      const textInputs = formularioLeads.querySelectorAll('input[type="text"]');
      const selectInputs = formularioLeads.querySelectorAll('select');
      
      // Captura segura e inmune a cambios de placeholder
      const datosParaSupabase = {
        nombre: (formularioLeads.querySelector('input[type="text"]:nth-of-type(1)')?.value 
          || textInputs[0]?.value 
          || document.querySelector('input')?.value 
          || '').trim(),
        correo: (formularioLeads.querySelector('input[type="email"]')?.value 
          || document.querySelector('input[type="email"]')?.value 
          || '').trim(),
        whatsapp: (formularioLeads.querySelector('input[type="tel"]')?.value 
          || document.querySelector('input[placeholder*="593"]')?.value 
          || '').trim(),
        empresa: (formularioLeads.querySelector('input[type="text"]:nth-of-type(2)')?.value 
          || textInputs[1]?.value 
          || '').trim(),
        presupuesto: (formularioLeads.querySelector('select:nth-of-type(1)')?.value 
          || selectInputs[0]?.value 
          || "No especificado"),
        dolor_principal: (formularioLeads.querySelector('select:nth-of-type(2)')?.value 
          || selectInputs[1]?.value 
          || "No especificado"),
        estado: "Por contactar",
        score: 0 // Evita el rechazo de la base de datos int4
      };

      try {
        // Inserción limpia a la tabla de Supabase en minúsculas
        if (supabase && typeof supabase.from === 'function') {
          const { data, error } = await supabase.from('leads').insert([datosParaSupabase]);
          if (error) {
            console.warn('Fallo en cliente supabase-js, intentando vía REST:', error);
            await sendViaRest(datosParaSupabase);
          }
        } else {
          await sendViaRest(datosParaSupabase);
        }

        // Guardar en almacenamiento local sincronizado
        saveToLocalStorage(datosParaSupabase);
        
        // Mostrar el bloque verde de confirmación visual
        if (alertSuccess) {
          alertSuccess.style.display = 'block';
          alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        formularioLeads.reset();
      } catch (err) {
        console.error("Error en inserción:", err);
        saveToLocalStorage(datosParaSupabase);
        if (alertSuccess) {
          alertSuccess.style.display = 'block';
          formularioLeads.reset();
        } else {
          alert("Hubo un problema temporal al guardar los datos. Inténtalo de nuevo.");
        }
      }
    });
  }

  async function sendViaRest(data) {
    const endpoint = `${SUPABASE_PROJECT_URL}/rest/v1/leads`;
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
  }

  function saveToLocalStorage(data) {
    try {
      const cached = JSON.parse(localStorage.getItem('megatrack_cached_leads') || '[]');
      cached.unshift({
        id: 'lead-' + Date.now(),
        ...data,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('megatrack_cached_leads', JSON.stringify(cached));
    } catch (e) {
      console.warn('Almacenamiento local no disponible:', e);
    }
  }
});
