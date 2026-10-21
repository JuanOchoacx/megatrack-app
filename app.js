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
// Si no existe un script inline en el documento, se inicializa el listener directamente:
if (!document.querySelector('script:not([src])')) {
  const formMonitoreo = document.querySelector('form');
  if (formMonitoreo) {
    formMonitoreo.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Captura quirúrgica por atributos visuales únicos
      const inputNombre = formMonitoreo.querySelector('input[placeholder*="Carlos Mendoza"]') || formMonitoreo.querySelector('input[type="text"]');
      const inputCorreo = formMonitoreo.querySelector('input[placeholder*="carlos@empresa.com"]') || formMonitoreo.querySelector('input[type="email"]');
      const inputWhatsapp = formMonitoreo.querySelector('input[placeholder*="593"]') || formMonitoreo.querySelector('input[type="tel"]');
      const inputEmpresa = formMonitoreo.querySelector('input[placeholder*="Logística Andina"]') || formMonitoreo.querySelectorAll('input[type="text"]')[1];
      
      const selectPresupuesto = formMonitoreo.querySelectorAll('select')[0];
      const selectDolor = formMonitoreo.querySelectorAll('select')[1];

      const datosFinalesLeads = {
        nombre: inputNombre ? inputNombre.value.trim() : "Anonimo",
        correo: inputCorreo ? inputCorreo.value.trim() : "sin@correo.com",
        whatsapp: inputWhatsapp ? inputWhatsapp.value.trim() : "00000",
        empresa: inputEmpresa ? inputEmpresa.value.trim() : "Particular",
        presupuesto: selectPresupuesto ? selectPresupuesto.value : "No especificado",
        dolor_principal: selectDolor ? selectDolor.value : "No especificado",
        estado: "Por contactar",
        score: 0 // Requerido int4 por la base de datos
      };

      try {
        const { data, error } = await supabase.from('leads').insert([datosFinalesLeads]);
        if (error) throw error;
        
        const mensajeExito = document.querySelector('.alert-success-container') || document.getElementById('mensaje-exito');
        if (mensajeExito) mensajeExito.style.display = 'block';
        formMonitoreo.reset();
      } catch (err) {
        console.error("Error de inserción real:", err);
        alert("Error de conexión con la base de datos.");
      }
    });
  }
}
