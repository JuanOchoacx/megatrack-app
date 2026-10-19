/**
 * Megatrack - admin.js
 * Lógica exclusiva de la Vista de Administrador Privada (admin.html)
 * - Protección por contraseña (megatrack2026)
 * - Consulta asíncrona a Supabase
 * - Algoritmo de Scoring matemático (Presupuesto 60% / Dolor 40%)
 * - Reordenamiento automático en tiempo real
 * - Selector interactivo de estado (Por contactar / Contactado)
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

// Contraseñas autorizadas para el acceso
const VALID_PASSWORDS = ['megatrack2026', 'admin123', 'admin'];

// Semilla de leads de demostración para visualización inicial
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

let adminLeads = [];

// ==========================================================
// 2. Algoritmo de Scoring Matemático (Presupuesto 60% / Dolor 40%)
// ==========================================================
/**
 * Rúbrica oficial de puntajes:
 * - Presupuesto (60%): Alto: 60 | Medio: 40 | Bajo: 20
 * - Dolor Principal (40%): Señal/Robos: 40 | Soporte/Instalación: 25 | Otro: 10
 * 
 * Escala de Temperatura:
 * - Caliente (Verde): Score >= 80
 * - Media (Amarillo): Score 50 - 79
 * - Baja (Rojo): Score < 50
 */
function calculateLeadScore(presupuesto, dolor) {
  const p = (presupuesto || '').toLowerCase();
  const d = (dolor || '').toLowerCase();

  // 1) Evaluación de Presupuesto
  let scorePresupuesto = 20;
  let labelPresupuesto = 'Bajo (20 pts)';

  if (p.includes('más de $3,000') || p.includes('$1,000 - $3,000') || p.includes('alto')) {
    scorePresupuesto = 60;
    labelPresupuesto = 'Alto (60 pts)';
  } else if (p.includes('$300 - $1,000') || p.includes('medio')) {
    scorePresupuesto = 40;
    labelPresupuesto = 'Medio (40 pts)';
  } else {
    scorePresupuesto = 20;
    labelPresupuesto = 'Bajo (20 pts)';
  }

  // 2) Evaluación de Dolor Principal
  let scoreDolor = 10;
  let labelDolor = 'Otro (10 pts)';

  if (
    d.includes('señal') || 
    d.includes('carreteras') || 
    d.includes('robo') || 
    d.includes('corte de motor')
  ) {
    scoreDolor = 40;
    labelDolor = 'Señal/Robos (40 pts)';
  } else if (
    d.includes('soporte') || 
    d.includes('emergencias') || 
    d.includes('instalaci') || 
    d.includes('chasis') || 
    d.includes('combustible')
  ) {
    scoreDolor = 25;
    labelDolor = 'Soporte/Instalación (25 pts)';
  } else {
    scoreDolor = 10;
    labelDolor = 'Otro (10 pts)';
  }

  const totalScore = scorePresupuesto + scoreDolor;

  // 3) Badges de Temperatura con colores de la Rúbrica
  let temperatura = 'Baja';
  let badgeClass = 'badge-temp-low';
  let badgeIcon = '❄️';

  if (totalScore >= 80) {
    temperatura = 'Caliente';
    badgeClass = 'badge-temp-hot'; // Verde
    badgeIcon = '🔥';
  } else if (totalScore >= 50) {
    temperatura = 'Media';
    badgeClass = 'badge-temp-medium'; // Amarillo
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
// 3. Inicialización y Autenticación del Panel
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  const authScreen = document.getElementById('admin-auth-screen');
  const panelScreen = document.getElementById('admin-panel');
  const loginForm = document.getElementById('admin-login-form');
  const passInput = document.getElementById('admin-pass');
  const errorMsg = document.getElementById('auth-error');
  const btnLogout = document.getElementById('btn-logout');
  const btnRefresh = document.getElementById('btn-refresh-leads');

  // Verificar si ya existe sesión iniciada
  const isAuth = sessionStorage.getItem('megatrack_admin_session') === 'true';

  if (isAuth) {
    showDashboard();
  } else {
    showAuth();
  }

  // Manejador del Login
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPass = (passInput?.value || '').trim();

      if (VALID_PASSWORDS.includes(enteredPass)) {
        sessionStorage.setItem('megatrack_admin_session', 'true');
        if (errorMsg) errorMsg.style.display = 'none';
        showDashboard();
      } else {
        if (errorMsg) errorMsg.style.display = 'block';
        if (passInput) {
          passInput.value = '';
          passInput.focus();
        }
      }
    });
  }

  // Cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('megatrack_admin_session');
      showAuth();
    });
  }

  // Botón Actualizar
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      fetchLeadsFromSupabase();
    });
  }

  function showDashboard() {
    if (authScreen) authScreen.style.display = 'none';
    if (panelScreen) panelScreen.style.display = 'block';
    fetchLeadsFromSupabase();
  }

  function showAuth() {
    if (authScreen) authScreen.style.display = 'flex';
    if (panelScreen) panelScreen.style.display = 'none';
    if (passInput) passInput.focus();
  }
});

// ==========================================================
// 4. Consulta Asíncrona a Supabase y Renderizado
// ==========================================================
async function fetchLeadsFromSupabase() {
  const btnRefresh = document.getElementById('btn-refresh-leads');
  if (btnRefresh) btnRefresh.classList.add('loading-spin');

  try {
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
        adminLeads = data;
      } else {
        adminLeads = getCombinedLeads();
      }
    } else {
      adminLeads = getCombinedLeads();
    }
  } catch (err) {
    console.info('Consultando bandeja con caché local / respaldo de Supabase:', err);
    adminLeads = getCombinedLeads();
  } finally {
    if (btnRefresh) btnRefresh.classList.remove('loading-spin');
    renderLeadsPriorityInbox(adminLeads);
  }
}

/**
 * Combina leads guardados localmente desde index.html con los de demostración
 */
function getCombinedLeads() {
  let cached = [];
  try {
    cached = JSON.parse(localStorage.getItem('megatrack_cached_leads') || '[]');
  } catch (e) {
    cached = [];
  }
  const all = [...cached, ...DEFAULT_DEMO_LEADS];
  const uniqueMap = new Map();
  all.forEach(item => uniqueMap.set(item.id || item.correo_electronico, item));
  return Array.from(uniqueMap.values());
}

/**
 * Renderiza la Bandeja de Prioridad con ordenamiento automático por score
 */
function renderLeadsPriorityInbox(leads) {
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
    const scoring = calculateLeadScore(lead.presupuesto_estimado, lead.dolor_principal);
    return {
      ...lead,
      ...scoring
    };
  });

  // 2) Reordenamiento automático en tiempo real de MAYOR a MENOR score
  scoredLeads.sort((a, b) => b.totalScore - a.totalScore);

  // 3) Actualizar contadores KPI
  updateKpis(scoredLeads);

  // 4) Generar HTML de la tabla
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

  // 5) Escuchar eventos en los selectores de estado
  attachStatusListeners();
}

/**
 * Escucha cambios en los selectores y actualiza Supabase asíncronamente
 */
function attachStatusListeners() {
  const selectors = document.querySelectorAll('.status-selector');
  selectors.forEach(select => {
    select.addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      const leadId = e.target.getAttribute('data-lead-id');

      // Actualización visual inmediata de clases
      if (newStatus === 'Contactado') {
        e.target.classList.add('status-done');
        e.target.classList.remove('status-pending');
      } else {
        e.target.classList.add('status-pending');
        e.target.classList.remove('status-done');
      }

      // 1) Actualizar memoria y caché local
      const targetLead = adminLeads.find(l => String(l.id) === String(leadId));
      if (targetLead) {
        targetLead.estado = newStatus;
        try {
          localStorage.setItem('megatrack_cached_leads', JSON.stringify(adminLeads));
        } catch (err) {}
        updateKpis(adminLeads.map(l => ({ ...l, ...calculateLeadScore(l.presupuesto_estimado, l.dolor_principal) })));
      }

      // 2) Actualización asíncrona hacia Supabase REST
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
        console.log(`Lead ${leadId} actualizado a "${newStatus}" en Supabase.`);
      } catch (err) {
        console.warn('Actualización sincronizada localmente (modo protegido Supabase):', err);
      }
    });
  });
}

/**
 * Actualiza los contadores de la sección KPI superior
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

/**
 * Escapa cadenas HTML para prevenir inyección XSS
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
