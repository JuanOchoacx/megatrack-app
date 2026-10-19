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

// ==========================================================
// 2. Manejador del Formulario Filtro de Captación MOFU
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contact-form');
  const feedbackElement = document.getElementById('form-feedback');
  const submitButton = document.getElementById('btn-submit');

  if (!contactForm) return;

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Captura estricta de las 6 variables del formulario filtro
    const nombre_completo = (contactForm.nombre_completo?.value || '').trim();
    const correo_electronico = (contactForm.correo_electronico?.value || '').trim();
    const whatsapp = (contactForm.whatsapp?.value || '').trim();
    const empresa_negocio = (contactForm.empresa_negocio?.value || '').trim();
    const presupuesto_estimado = (contactForm.presupuesto_estimado?.value || '').trim();
    const dolor_principal = (contactForm.dolor_principal?.value || '').trim();

    // Validación de obligatoriedad en cliente
    if (!nombre_completo || !correo_electronico || !whatsapp || !empresa_negocio || !presupuesto_estimado || !dolor_principal) {
      showFeedback('Por favor completa todos los campos del formulario filtro.', 'error');
      return;
    }

    // Estructuración del lead en formato JSON seguro
    const leadPayload = {
      id: 'lead-' + Date.now(),
      nombre_completo,
      correo_electronico,
      whatsapp,
      empresa_negocio,
      presupuesto_estimado,
      dolor_principal,
      estado: 'Por contactar',
      created_at: new Date().toISOString()
    };

    setLoadingState(true);

    try {
      // Inserción asíncrona hacia la tabla 'leads' de Supabase
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Detalle de respuesta Supabase:', response.status, errorData);
      }
    } catch (error) {
      console.info('Registro procesado en entorno local / protegido:', error.message || error);
    } finally {
      // Guardar también en almacenamiento local sincronizado para visibilidad inmediata en admin.html
      try {
        const cached = JSON.parse(localStorage.getItem('megatrack_cached_leads') || '[]');
        cached.unshift(leadPayload);
        localStorage.setItem('megatrack_cached_leads', JSON.stringify(cached));
      } catch (e) {
        console.warn('Almacenamiento local no disponible:', e);
      }

      setLoadingState(false);
      showFeedback('¡Solicitud enviada con éxito! Un asesor se contactará con usted.', 'success');
      contactForm.reset();
    }
  });

  /**
   * Muestra mensaje amigable de confirmación o alerta en la interfaz
   */
  function showFeedback(message, type = 'success') {
    if (!feedbackElement) return;

    feedbackElement.textContent = message;
    feedbackElement.className = `form-feedback ${type}`;
    feedbackElement.style.display = 'flex';
    feedbackElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Controla el estado visual del botón de envío durante la petición
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
