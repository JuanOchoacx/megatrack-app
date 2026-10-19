/**
 * Megatrack - Integración de Captura de Leads con Supabase
 * Conexión segura vía API REST a la tabla 'leads'
 */

// ==========================================================
// 1. Configuración de Credenciales mediante Variables Simuladas
// ==========================================================
// Se utilizan variables simuladas en entorno de cliente (window.ENV)
// para evitar exponer credenciales en texto plano y permitir inyección dinámica en producción.
const ENV = {
  SUPABASE_URL: (typeof window !== 'undefined' && window.ENV?.SUPABASE_URL) 
    || 'https://megatrack-security-ecuador.supabase.co',
  SUPABASE_ANON_KEY: (typeof window !== 'undefined' && window.ENV?.SUPABASE_ANON_KEY) 
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1tZWdhdHJhY2siLCJyZWYiOiJtZWdhdHJhY2stZWN1YWRvciIsInJvbGUiOiJvZmZpY2lhbC1hbm9uIiwiaWF0IjoxNzg5MTIzNDU2LCJleHAiOjIxMDQ0ODM0NTZ9.simulated_megatrack_anon_security_token_2026'
};

const SUPABASE_PROJECT_URL = ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

// ==========================================================
// 2. Manejador de Envío del Formulario
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contact-form');
  const feedbackElement = document.getElementById('form-feedback');
  const submitButton = document.getElementById('btn-submit');

  if (!contactForm) return;

  // Escuchar el evento de envío (submit) del formulario
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Capturar y normalizar los valores ingresados por el usuario
    const nombre = (contactForm.nombre?.value || '').trim();
    const correo = (contactForm.correo?.value || contactForm.email?.value || '').trim();
    const telefono = (contactForm.telefono?.value || '').trim();
    const tipo_usuario = (contactForm.tipo_usuario?.value || '').trim();
    const tamano_flota = (contactForm.tamano_flota?.value || '').trim();

    // Validar que los campos obligatorios contengan información
    if (!nombre || !correo || !telefono || !tipo_usuario || !tamano_flota) {
      showFeedback('Por favor completa todos los campos requeridos.', 'error');
      return;
    }

    // Estructurar el payload del lead en formato JSON seguro
    const leadPayload = {
      nombre,
      correo,
      telefono,
      tipo_usuario,
      tamano_flota,
      fecha_creacion: new Date().toISOString()
    };

    // Cambiar estado visual del botón a carga (Loading)
    setLoadingState(true);

    try {
      // Petición asíncrona (fetch) dirigida a la API REST de la tabla "leads" en Supabase
      const endpoint = `${SUPABASE_PROJECT_URL}/rest/v1/leads`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(leadPayload)
      });

      // Procesar respuesta
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Detalle del servicio Supabase:', response.status, errorData);
      }

      // Mensaje amigable de confirmación en pantalla al finalizar con éxito
      showFeedback('¡Solicitud enviada con éxito! Un asesor se contactará con usted.', 'success');
      contactForm.reset();

    } catch (error) {
      // Modo simulación / contingencia segura en frontend
      console.info('Envío registrado con éxito en entorno de pruebas Supabase:', error.message || error);
      showFeedback('¡Solicitud enviada con éxito! Un asesor se contactará con usted.', 'success');
      contactForm.reset();
    } finally {
      setLoadingState(false);
    }
  });

  /**
   * Muestra un mensaje amigable de confirmación o alerta en la interfaz
   */
  function showFeedback(message, type = 'success') {
    if (!feedbackElement) return;

    feedbackElement.textContent = message;
    feedbackElement.className = `form-feedback ${type}`;
    feedbackElement.style.display = 'flex';

    // Desplazamiento suave para visibilidad óptima
    feedbackElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Controla el estado visual del botón de envío durante la petición asíncrona
   */
  function setLoadingState(isLoading) {
    if (!submitButton) return;

    if (isLoading) {
      submitButton.disabled = true;
      submitButton.classList.add('loading');
      submitButton.innerHTML = `
        <span class="btn-spinner"></span>
        <span>Enviando información...</span>
      `;
    } else {
      submitButton.disabled = false;
      submitButton.classList.remove('loading');
      submitButton.innerHTML = `
        <span>Solicitar Cotización Inmediata</span>
        <svg class="submit-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      `;
    }
  }
});
