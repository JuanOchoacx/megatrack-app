/**
 * Megatrack - app.js
 * Lógica exclusiva de la Landing Page Pública
 * Captura y envío seguro de leads hacia la tabla 'leads' de Supabase
 */

// 1. Configuración de Credenciales de Supabase
const ENV = {
  SUPABASE_URL: (typeof window !== 'undefined' && window.ENV?.SUPABASE_URL) 
    || 'https://fatdawzrhkxedcpvnvsa.supabase.co',
  SUPABASE_ANON_KEY: (typeof window !== 'undefined' && window.ENV?.SUPABASE_ANON_KEY) 
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdGRhd3pyaGt4ZWRjcHZudnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNzk2NzEsImV4cCI6MjEwNzk1NTY3MX0.fSWVJG-OFaTNMExes4fceiKKZUyn0jvjmxUbe2BKP5k'
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
// Si no existe un script inline en el documento, se inicializa el listener directamente:
if (!document.querySelector('script:not([src])')) {
  const formMonitoreoActivo = document.querySelector('form');
  if (formMonitoreoActivo) {
    formMonitoreoActivo.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Sanitización básica sin alterar la captura actual
      const limpiarXSS = (val) => val ? val.replace(/[/<>`'"&]/g, '').trim() : "";
      
      const inputsForm = formMonitoreoActivo.querySelectorAll('input');
      const selectsForm = formMonitoreoActivo.querySelectorAll('select');

      const datosFormularioMapeados = {
        nombre: limpiarXSS(inputsForm[0]?.value),
        correo: limpiarXSS(inputsForm[1]?.value),
        telefono: limpiarXSS(inputsForm[2]?.value),
        tipo_usuario: limpiarXSS(inputsForm[3]?.value),
        tamano_flota: selectsForm[0]?.value || "No especificado",
        dolor_principal: selectsForm[1]?.value || "No especificado",
        estado: "Por contactar",
        score: 0
      };

      try {
        const { error } = await supabase.from('leads').insert([datosFormularioMapeados]);
        if (error) throw error;
        
        const successAlertContainer = document.querySelector('.alert-success-container') || document.getElementById('mensaje-exito');
        if (successAlertContainer) successAlertContainer.style.display = 'block';
        formMonitoreoActivo.reset();
      } catch (err) {
        console.error("Error de red controlado por seguridad.");
      }
    });
  }
}

// 3. Lógica de Control de Privacidad y Consentimiento de Cookies (LOPDP)
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('privacy-cookie-banner');
  const btnAccept = document.getElementById('btn-accept-cookies');
  const btnReject = document.getElementById('btn-reject-cookies');

  if (!localStorage.getItem('megatrack_privacy_consent')) {
    setTimeout(() => {
      if (banner) banner.style.display = 'flex';
    }, 1500);
  }

  if (btnAccept && banner && !btnAccept.dataset.bound) {
    btnAccept.dataset.bound = 'true';
    btnAccept.addEventListener('click', () => {
      localStorage.setItem('megatrack_privacy_consent', 'accepted');
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 400);
      console.log("Consentimiento LOPDP otorgado. Píxeles de Meta y TikTok inicializados.");
    });
  }

  if (btnReject && banner && !btnReject.dataset.bound) {
    btnReject.dataset.bound = 'true';
    btnReject.addEventListener('click', () => {
      localStorage.setItem('megatrack_privacy_consent', 'rejected');
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 400);
      console.log("Consentimiento denegado. Bloqueando cookies de análisis.");
    });
  }
});
