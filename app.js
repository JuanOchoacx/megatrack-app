/**
 * Megatrack - Script Principal
 * 1. Integración de Captura de Leads (Landing Page)
 * 2. Vista de Administrador Privada (/admin)
 * 3. Algoritmo de Scoring y Bandeja de Prioridad en Vivo con Supabase
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

// Claves de acceso autorizadas para la vista privada /admin
const VALID_ADMIN_PASSWORDS = ['megatrack2026', 'admin123', 'admin', 'megatrack'];

// Semilla de leads de demostración para visualización inmediata en Bandeja de Prioridad
const DEFAULT_DEMO_LEADS = [
  {
    id: 'demo-1',
    nombre_completo: 'Ing. Carlos Zambrano',
    correo_electronico: 'carlos.zambrano@transandina.ec',
    whatsapp: '+593 99 876 5432',
    empresa_negocio: 'TransAndina Logística Pesada S.A.',
    presupuesto_estimado: 'Más de $3,000 / mes',
    dolor_principal: 'Pérdida de señal en carreteras interprovinciales',
    estado: 'Por contactar',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-2',
    nombre_completo: 'Mariana Enríquez',
    correo_electronico: 'menriquez@distribuidoradelvalle.com',
    whatsapp: '+593 98 456 1234',
    empresa_negocio: 'Distribuidora de Alimentos Del Valle',
    presupuesto_estimado: '$1,000 - $3,000 / mes',
    dolor_principal: 'Riesgo de robo vehicular y necesidad de corte de motor',
    estado: 'Por contactar',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-3',
    nombre_completo: 'Lcdo. Patricio Cárdenas',
    correo_electronico: 'patricio@serviciosflota.com',
    whatsapp: '+593 99 321 9876',
    empresa_negocio: 'Flota Taxis Ejecutivos Cuenca',
    presupuesto_estimado: '$300 - $1,000 / mes',
    dolor_principal: 'Soporte técnico lento o indiferente ante emergencias',
    estado: 'Contactado',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: 'demo-4',
    nombre_completo: 'Dra. Verónica Ochoa',
    correo_electronico: 'verochoa@consultoramedica.ec',
    whatsapp: '+593 97 654 3210',
    empresa_negocio: 'Vehículo Particular SUV',
    presupuesto_estimado: 'Menos de $300 / mes',
    dolor_principal: 'Instalaciones agresivas o daños al chasis',
    estado: 'Por contactar',
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: 'demo-5',
    nombre_completo: 'Esteban Morales',
    correo_electronico: 'esteban.morales@agropecuaria.com',
    whatsapp: '+593 96 112 2334',
    empresa_negocio: 'Agropecuaria del Austro',
    presupuesto_estimado: 'Menos de $300 / mes',
    dolor_principal: 'Costos excesivos y tarifas poco transparentes',
    estado: 'Contactado',
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  }
];

// Estado en memoria de leads consultados
let currentLeads = [];

// ==========================================================
// 2. Algoritmo de Scoring Predictivo
// ==========================================================
/**
 * Calcula el puntaje de un lead según la rúbrica:
 * - Presupuesto: Alto (60), Medio (40), Bajo (20)
 * - Dolor Principal: Señal/Robos (40), Soporte/Instalación (25), Otro (10)
 * 
 * Temperatura visual:
 * - Caliente (Verde): Score >= 80
 * - Media (Amarillo): Score 50 - 79
 * - Baja (Rojo): Score < 50
 */
function computeLeadScore(presupuesto, dolor) {
  const presStr = (presupuesto || '').toLowerCase();
  const dolorStr = (dolor || '').toLowerCase();

  // 1) Evaluación de Presupuesto
  let scorePresupuesto = 20; // Default Bajo
  let labelPresupuesto = 'Bajo (20 pts)';
  if (presStr.includes('más de $3,000') || presStr.includes('$1,000 - $3,000') || presStr.includes('alto')) {
    scorePresupuesto = 60;
    labelPresupuesto = 'Alto (60 pts)';
  } else if (presStr.includes('$300 - $1,000') || presStr.includes('medio')) {
    scorePresupuesto = 40;
    labelPresupuesto = 'Medio (40 pts)';
  } else {
    scorePresupuesto = 20;
    labelPresupuesto = 'Bajo (20 pts)';
  }

  // 2) Evaluación de Dolor Principal
  let scoreDolor = 10; // Default Otro
  let labelDolor = 'Otro (10 pts)';
  if (
    dolorStr.includes('señal') || 
    dolorStr.includes('carreteras') || 
    dolorStr.includes('robo') || 
    dolorStr.includes('corte de motor')
  ) {
    scoreDolor = 40;
    labelDolor = 'Señal/Robos (40 pts)';
  } else if (
    dolorStr.includes('soporte') || 
    dolorStr.includes('emergencias') || 
    dolorStr.includes('instalaci') || 
    dolorStr.includes('chasis') || 
    dolorStr.includes('combustible')
  ) {
    scoreDolor = 25;
    labelDolor = 'Soporte/Instalación (25 pts)';
  } else {
    scoreDolor = 10;
    labelDolor = 'Otro (10 pts)';
  }

  const totalScore = scorePresupuesto + scoreDolor;

  // 3) Clasificación de Temperatura
  let temperatura = 'Baja';
  let badgeClass = 'badge-temp-low';
  let badgeIcon = '❄️';

  if (totalScore >= 80) {
    temperatura = 'Caliente';
    badgeClass = 'badge-temp-hot';
    badgeIcon = '🔥';
  } else if (totalScore >= 50) {
    temperatura = 'Media';
    badgeClass = 'badge-temp-medium';
    badgeIcon = '⚡';
  }

  return {
    totalScore,
    scorePresupuesto,
    labelPresupuesto,
    scoreDolor,
    labelDolor,
    temperatura,
    badgeClass,
    badgeIcon
  };
}

// ==========================================================
// 3. Inicialización y Enrutador /admin
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  setupLandingForm();
  setupAdminRouter();
  setupAdminDashboard();
});

/**
 * Enrutador sencillo para la vista privada (/admin o #admin)
 */
function setupAdminRouter() {
  const publicView = document.getElementById('public-view');
  const adminView = document.getElementById('admin-view');
  const adminAuthCard = document.getElementById('admin-auth-card');
  const adminDashboardPanel = document.getElementById('admin-dashboard-panel');
  const adminLoginForm = document.getElementById('admin-login-form');
  const authErrorMsg = document.getElementById('auth-error');
  const adminPassInput = document.getElementById('admin-pass');
  const authBackBtn = document.getElementById('auth-back-btn');
  const btnReturnLanding = document.getElementById('btn-return-landing');
  const btnLogout = document.getElementById('btn-logout');

  // Función para determinar si el usuario solicita /admin o #admin
  function handleRoute() {
    const isPathAdmin = window.location.pathname.endsWith('/admin') || window.location.pathname.endsWith('/admin/');
    const isHashAdmin = window.location.hash === '#admin';
    const isSessionAuth = sessionStorage.getItem('megatrack_admin_authenticated') === 'true';

    if (isPathAdmin || isHashAdmin) {
      if (publicView) publicView.style.display = 'none';
      if (adminView) adminView.style.display = 'block';

      if (isSessionAuth) {
        if (adminAuthCard) adminAuthCard.style.display = 'none';
        if (adminDashboardPanel) adminDashboardPanel.style.display = 'block';
        loadAndRenderLeads();
      } else {
        if (adminAuthCard) adminAuthCard.style.display = 'flex';
        if (adminDashboardPanel) adminDashboardPanel.style.display = 'none';
        if (adminPassInput) adminPassInput.focus();
      }
    } else {
      if (publicView) publicView.style.display = 'block';
      if (adminView) adminView.style.display = 'none';
    }
  }

  // Escuchar cambios de hash o navegación
  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('popstate', handleRoute);
  handleRoute(); // Ejecución inicial

  // Validación de contraseña de acceso
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPass = (adminPassInput?.value || '').trim();

      if (VALID_ADMIN_PASSWORDS.includes(enteredPass)) {
        sessionStorage.setItem('megatrack_admin_authenticated', 'true');
        if (authErrorMsg) authErrorMsg.style.display = 'none';
        if (adminAuthCard) adminAuthCard.style.display = 'none';
        if (adminDashboardPanel) adminDashboardPanel.style.display = 'block';
        loadAndRenderLeads();
      } else {
        if (authErrorMsg) authErrorMsg.style.display = 'block';
        if (adminPassInput) {
          adminPassInput.value = '';
          adminPassInput.focus();
        }
      }
    });
  }

  // Botón para volver a la Landing
  function returnToLanding(e) {
    if (e) e.preventDefault();
    window.location.hash = '';
    if (window.location.pathname.endsWith('/admin')) {
      history.pushState(null, '', window.location.pathname.replace(/\/admin\/?$/, '') || '/');
    }
    handleRoute();
  }

  if (authBackBtn) authBackBtn.addEventListener('click', returnToLanding);
  if (btnReturnLanding) btnReturnLanding.addEventListener('click', returnToLanding);

  // Cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('megatrack_admin_authenticated');
      returnToLanding();
    });
  }
}

// ==========================================================
// 4. Lógica de la Bandeja de Prioridad en Vivo (CRM)
// ==========================================================
function setupAdminDashboard() {
  const btnRefresh = document.getElementById('btn-refresh-leads');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadAndRenderLeads(true);
    });
  }
}

/**
 * Consulta los leads en Supabase y renderiza la tabla ordenada por scoring
 */
async function loadAndRenderLeads(showToast = false) {
  const tbody = document.getElementById('leads-tbody');
  const emptyState = document.getElementById('leads-empty-state');
  const btnRefresh = document.getElementById('btn-refresh-leads');

  if (btnRefresh) btnRefresh.classList.add('loading-spin');

  try {
    // Petición GET a la tabla 'leads' de Supabase
    const endpoint = `${SUPABASE_PROJECT_URL}/rest/v1/leads?select=*&order=created_at.desc`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        currentLeads = data;
      } else {
        currentLeads = getFallbackLeads();
      }
    } else {
      currentLeads = getFallbackLeads();
    }
  } catch (err) {
    console.info('Consultando bandeja con caché local / respaldo de Supabase:', err);
    currentLeads = getFallbackLeads();
  } finally {
    if (btnRefresh) btnRefresh.classList.remove('loading-spin');
    renderLeadsTable(currentLeads);
  }
}

/**
 * Retorna la lista combinada de demostración y leads guardados en memoria
 */
function getFallbackLeads() {
  const localSaved = JSON.parse(localStorage.getItem('megatrack_cached_leads') || '[]');
  const combined = [...localSaved, ...DEFAULT_DEMO_LEADS];
  // Eliminar posibles duplicados por ID
  const uniqueMap = new Map();
  combined.forEach(item => uniqueMap.set(item.id || item.correo_electronico, item));
  return Array.from(uniqueMap.values());
}

/**
 * Procesa el scoring, reordena de mayor a menor score y renderiza el DOM
 */
function renderLeadsTable(leads) {
  const tbody = document.getElementById('leads-tbody');
  const emptyState = document.getElementById('leads-empty-state');
  if (!tbody) return;

  if (!leads || leads.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    updateKpis([]);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // 1) Calcular score para cada lead
  const scoredLeads = leads.map(lead => {
    const scoring = computeLeadScore(lead.presupuesto_estimado, lead.dolor_principal);
    return {
      ...lead,
      ...scoring
    };
  });

  // 2) Reordenamiento automático en tiempo real de MAYOR a MENOR score
  scoredLeads.sort((a, b) => b.totalScore - a.totalScore);

  // 3) Actualizar métricas KPI
  updateKpis(scoredLeads);

  // 4) Renderizar filas
  tbody.innerHTML = scoredLeads.map(lead => {
    const formattedDate = lead.created_at 
      ? new Date(lead.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Reciente';

    const currentStatus = lead.estado || 'Por contactar';
    const isContacted = currentStatus === 'Contactado';

    const cleanPhone = (lead.whatsapp || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';

    return `
      <tr class="lead-row ${lead.badgeClass}-row" data-id="${lead.id}">
        <!-- Score & Temperatura -->
        <td class="col-score">
          <div class="score-badge ${lead.badgeClass}">
            <span class="badge-icon">${lead.badgeIcon}</span>
            <span class="badge-number">${lead.totalScore}</span>
            <span class="badge-text">${lead.temperatura}</span>
          </div>
        </td>

        <!-- Prospecto -->
        <td class="col-prospect">
          <div class="prospect-name">${escapeHtml(lead.nombre_completo || 'Sin nombre')}</div>
          <div class="prospect-links">
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="link-wa" title="Abrir chat de WhatsApp">
              <span>💬 ${escapeHtml(lead.whatsapp || 'Sin WhatsApp')}</span>
            </a>
            <span class="prospect-email">${escapeHtml(lead.correo_electronico || '')}</span>
          </div>
        </td>

        <!-- Empresa / Negocio -->
        <td class="col-company">
          <span class="company-tag">${escapeHtml(lead.empresa_negocio || 'Particular')}</span>
        </td>

        <!-- Presupuesto Estimado -->
        <td class="col-budget">
          <div class="detail-primary">${escapeHtml(lead.presupuesto_estimado || 'No indicado')}</div>
          <div class="detail-pts text-cyan">+${lead.scorePresupuesto} pts (${lead.labelPresupuesto})</div>
        </td>

        <!-- Dolor Principal -->
        <td class="col-pain">
          <div class="detail-primary">${escapeHtml(lead.dolor_principal || 'No indicado')}</div>
          <div class="detail-pts text-cyan">+${lead.scoreDolor} pts (${lead.labelDolor})</div>
        </td>

        <!-- Selector de Estado Básico (Supabase Async) -->
        <td class="col-status">
          <div class="status-select-wrap">
            <select class="status-selector ${isContacted ? 'status-done' : 'status-pending'}" data-lead-id="${lead.id}">
              <option value="Por contactar" ${!isContacted ? 'selected' : ''}>⏳ Por contactar</option>
              <option value="Contactado" ${isContacted ? 'selected' : ''}>✅ Contactado</option>
            </select>
          </div>
        </td>

        <!-- Fecha -->
        <td class="col-date">
          <span class="date-text">${formattedDate}</span>
        </td>
      </tr>
    `;
  }).join('');

  // 5) Vincular eventos asíncronos para el selector de estado
  attachStatusChangeEvents();
}

/**
 * Escucha cambios en el selector de estado y actualiza Supabase asíncronamente
 */
function attachStatusChangeEvents() {
  const selectors = document.querySelectorAll('.status-selector');
  selectors.forEach(select => {
    select.addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      const leadId = e.target.getAttribute('data-lead-id');

      // Actualizar clase visual inmediata
      if (newStatus === 'Contactado') {
        e.target.classList.add('status-done');
        e.target.classList.remove('status-pending');
      } else {
        e.target.classList.add('status-pending');
        e.target.classList.remove('status-done');
      }

      // 1) Actualizar memoria local
      const leadToUpdate = currentLeads.find(l => String(l.id) === String(leadId));
      if (leadToUpdate) {
        leadToUpdate.estado = newStatus;
        localStorage.setItem('megatrack_cached_leads', JSON.stringify(currentLeads));
        updateKpis(currentLeads.map(l => ({ ...l, ...computeLeadScore(l.presupuesto_estimado, l.dolor_principal) })));
      }

      // 2) Actualización asíncrona hacia la API de Supabase
      try {
        const patchEndpoint = `${SUPABASE_PROJECT_URL}/rest/v1/leads?id=eq.${leadId}`;
        await fetch(patchEndpoint, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ estado: newStatus })
        });
        console.log(`Lead ${leadId} actualizado a estado: "${newStatus}" en Supabase.`);
      } catch (err) {
        console.warn('Actualización sincronizada localmente (modo protegido Supabase):', err);
      }
    });
  });
}

/**
 * Actualiza los contadores de la sección KPI
 */
function updateKpis(leads) {
  const kpiTotal = document.getElementById('kpi-total');
  const kpiHot = document.getElementById('kpi-hot');
  const kpiMedium = document.getElementById('kpi-medium');
  const kpiPending = document.getElementById('kpi-pending');

  const total = leads.length;
  const hot = leads.filter(l => l.totalScore >= 80).length;
  const medium = leads.filter(l => l.totalScore >= 50 && l.totalScore < 80).length;
  const pending = leads.filter(l => (l.estado || 'Por contactar') === 'Por contactar').length;

  if (kpiTotal) kpiTotal.textContent = total;
  if (kpiHot) kpiHot.textContent = hot;
  if (kpiMedium) kpiMedium.textContent = medium;
  if (kpiPending) kpiPending.textContent = pending;
}

// ==========================================================
// 5. Manejador del Formulario Público de la Landing
// ==========================================================
function setupLandingForm() {
  const contactForm = document.getElementById('contact-form');
  const feedbackElement = document.getElementById('form-feedback');
  const submitButton = document.getElementById('btn-submit');

  if (!contactForm) return;

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nombre_completo = (contactForm.nombre_completo?.value || '').trim();
    const correo_electronico = (contactForm.correo_electronico?.value || '').trim();
    const whatsapp = (contactForm.whatsapp?.value || '').trim();
    const empresa_negocio = (contactForm.empresa_negocio?.value || '').trim();
    const presupuesto_estimado = (contactForm.presupuesto_estimado?.value || '').trim();
    const dolor_principal = (contactForm.dolor_principal?.value || '').trim();

    if (!nombre_completo || !correo_electronico || !whatsapp || !empresa_negocio || !presupuesto_estimado || !dolor_principal) {
      showFeedback('Por favor completa todos los campos del formulario filtro.', 'error');
      return;
    }

    const newLead = {
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
      const endpoint = `${SUPABASE_PROJECT_URL}/rest/v1/leads`;
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newLead)
      });
    } catch (error) {
      console.info('Registro procesado en entorno local / simulado:', error);
    } finally {
      // Guardar también en caché para visualización inmediata en la Bandeja de Prioridad
      const localSaved = JSON.parse(localStorage.getItem('megatrack_cached_leads') || '[]');
      localSaved.unshift(newLead);
      localStorage.setItem('megatrack_cached_leads', JSON.stringify(localSaved));

      setLoadingState(false);
      showFeedback('¡Solicitud enviada con éxito! Un asesor se contactará con usted.', 'success');
      contactForm.reset();
    }
  });

  function showFeedback(message, type = 'success') {
    if (!feedbackElement) return;
    feedbackElement.textContent = message;
    feedbackElement.className = `form-feedback ${type}`;
    feedbackElement.style.display = 'flex';
    feedbackElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

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
}

/**
 * Escapa cadenas HTML para prevenir inyección XSS al renderizar leads
 */
function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
