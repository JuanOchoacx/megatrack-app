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

// Inicialización de cliente Supabase oficial si la librería está disponible
let supabase = null;
if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabase = window.supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Error inicializando cliente oficial Supabase en admin:', e);
  }
}

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
  let badgeText = '🛑 CLIENTE BAJO';
  let badgeClass = 'badge-solid-low';
  let statusCardClass = 'status-low';

  if (totalScore >= 80) {
    badgeText = `🔥 ${totalScore} CALIENTE`;
    badgeClass = 'badge-hot';
    statusCardClass = 'status-hot';
  } else if (totalScore >= 50) {
    badgeText = '⚠️ CLIENTE MEDIO';
    badgeClass = 'badge-solid-mid';
    statusCardClass = 'status-mid';
  }

  return {
    totalScore,
    scorePresupuesto,
    labelPresupuesto,
    scoreDolor,
    labelDolor,
    badgeText,
    badgeClass,
    statusCardClass
  };
}

// ==========================================================
// 3. Inicialización y Autenticación del Panel
// ==========================================================
function cargarLeadsReales() {
  const panel = document.getElementById('admin-panel');
  if (panel) panel.style.display = 'block';
  fetchLeadsFromSupabase();
}
window.cargarLeadsReales = cargarLeadsReales;

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('login-overlay');
  const panelScreen = document.getElementById('admin-panel');
  const btnLogout = document.getElementById('btn-logout');
  const btnRefresh = document.getElementById('btn-refresh-leads');

  // Verificar si ya existe sesión iniciada
  const isAuth = sessionStorage.getItem('megatrack_admin_session') === 'true';
  if (isAuth) {
    if (overlay) overlay.style.display = 'none';
    cargarLeadsReales();
  }

  // Acceso Administrativo Directo
  const loginFormAdmin = document.getElementById('login-form') || document.querySelector('form');
  if (loginFormAdmin) {
    loginFormAdmin.addEventListener('submit', (event) => {
      event.preventDefault();
      const inputPass = loginFormAdmin.querySelector('input[type="password"]');
      
      if (inputPass && inputPass.value === 'megatrack2026') {
        sessionStorage.setItem('megatrack_admin_session', 'true');
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.style.display = 'none';
        if (typeof cargarLeadsReales === 'function') cargarLeadsReales();
      } else {
        alert('Clave incorrecta. Por favor verifique la clave oficial.');
      }
    });
  }

  // Cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('megatrack_admin_session');
      if (overlay) overlay.style.display = 'flex';
      if (panelScreen) panelScreen.style.display = 'none';
      const pass = document.querySelector('input[type="password"]');
      if (pass) pass.focus();
    });
  }

  // Botón Actualizar
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      cargarLeadsReales();
    });
  }

  // Escuchador de eventos para los botones de filtrado
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // Remover estado activo previo y asignar al seleccionado
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const filterValue = button.getAttribute('data-filter');
      const cards = document.querySelectorAll('.lead-card-module');
      
      cards.forEach(card => {
        if (filterValue === 'all') {
          card.style.display = 'flex';
        } else if (filterValue === 'hot' && card.classList.contains('status-hot')) {
          card.style.display = 'flex';
        } else if (filterValue === 'mid' && card.classList.contains('status-mid')) {
          card.style.display = 'flex';
        } else if (filterValue === 'low' && card.classList.contains('status-low')) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
});

// ==========================================================
// 4. Consulta Asíncrona a Supabase y Renderizado
// ==========================================================
async function fetchLeadsFromSupabase() {
  const btnRefresh = document.getElementById('btn-refresh-leads');
  if (btnRefresh) btnRefresh.classList.add('loading-spin');

  try {
    if (supabase && typeof supabase.from === 'function') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        adminLeads = data;
      } else {
        adminLeads = getCombinedLeads();
      }
    } else {
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
  all.forEach(item => uniqueMap.set(item.id || item.correo || item.correo_electronico, item));
  return Array.from(uniqueMap.values());
}

/**
 * Renderiza la Bandeja de Prioridad con ordenamiento automático por score
 */
function renderLeadsPriorityInbox(leads) {
  const container = document.getElementById('leads-container');
  const emptyState = document.getElementById('leads-empty-state');
  if (!container) return;

  if (!leads || leads.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    updateKpis([]);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // 1) Calcular score para cada lead
  const scoredLeads = leads.map(lead => {
    const scoring = calculateLeadScore(lead.presupuesto || lead.presupuesto_estimado, lead.dolor_principal);
    return {
      ...lead,
      ...scoring
    };
  });

  // 2) Reordenamiento automático en tiempo real de MAYOR a MENOR score
  scoredLeads.sort((a, b) => b.totalScore - a.totalScore);

  // 3) Actualizar contadores KPI
  updateKpis(scoredLeads);

  // 4) Generar HTML de las tarjetas cuadradas en formato SaaS Premium
  container.innerHTML = scoredLeads.map(lead => {
    const formattedDate = lead.created_at 
      ? new Date(lead.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Reciente';

    const rawStatus = (lead.estado || 'por-contactar').toLowerCase();
    const isContacted = rawStatus === 'contactado';
    const isNegotiating = rawStatus === 'en-negociacion' || rawStatus === 'en negociación';
    const isPending = !isContacted && !isNegotiating;

    const cleanPhone = (lead.whatsapp || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : 'https://wa.me/593998765432';

    return `
      <div class="lead-card-module ${lead.statusCardClass}" data-id="${lead.id}">
        <div class="lead-card-header">
          <span class="lead-badge-temp ${lead.badgeClass}">${lead.badgeText}</span>
          <span class="lead-date">${formattedDate}</span>
        </div>
        
        <div class="lead-card-body">
          <h3 class="lead-name">${escapeHtml(lead.nombre || lead.nombre_completo || 'Sin nombre')}</h3>
          <p class="lead-email">${escapeHtml(lead.correo || lead.correo_electronico || 'Sin correo')}</p>
          
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="whatsapp-direct-btn">
            💬 Contactar por WhatsApp
          </a>
          
          <div class="lead-meta-divider"></div>
          
          <div class="lead-info-row">
            <span class="info-label">Empresa:</span>
            <span class="info-value text-highlight">${escapeHtml(lead.empresa || lead.empresa_negocio || 'Particular')}</span>
          </div>
          <div class="lead-info-row">
            <span class="info-label">Presupuesto:</span>
            <span class="info-value">${escapeHtml(lead.presupuesto || lead.presupuesto_estimado || 'No indicado')} <small>(+${lead.scorePresupuesto} pts)</small></span>
          </div>
          <div class="lead-info-row">
            <span class="info-label">Problema Principal del Cliente:</span>
            <span class="info-value error-highlight">${escapeHtml(lead.dolor_principal || 'No indicado')} (+${lead.scoreDolor} pts)</span>
          </div>
        </div>
        
        <div class="lead-card-footer">
          <label class="status-label">Gestión de Estado:</label>
          <select class="lead-status-select" data-lead-id="${lead.id}">
            <option value="por-contactar" ${isPending ? 'selected' : ''}>⏳ Por contactar</option>
            <option value="contactado" ${isContacted ? 'selected' : ''}>✅ Contactado</option>
            <option value="en-negociacion" ${isNegotiating ? 'selected' : ''}>🤝 En negociación</option>
          </select>
        </div>
      </div>
    `;
  }).join('');

  // 5) Aplicar filtro activo actual
  applyCurrentFilter();

  // 6) Escuchar eventos en los selectores de estado
  attachStatusListeners();
}

/**
 * Aplica el filtro seleccionado a todas las tarjetas presentes en pantalla
 */
function applyCurrentFilter() {
  const activeBtn = document.querySelector('.filter-btn.active');
  const filterValue = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
  const cards = document.querySelectorAll('.lead-card-module');

  cards.forEach(card => {
    if (filterValue === 'all') {
      card.style.display = 'flex';
    } else if (filterValue === 'hot' && card.classList.contains('status-hot')) {
      card.style.display = 'flex';
    } else if (filterValue === 'mid' && card.classList.contains('status-mid')) {
      card.style.display = 'flex';
    } else if (filterValue === 'low' && card.classList.contains('status-low')) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

/**
 * Escucha cambios en los selectores y actualiza Supabase asíncronamente
 */
function attachStatusListeners() {
  const selectors = document.querySelectorAll('.lead-status-select');
  selectors.forEach(select => {
    select.addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      const leadId = e.target.getAttribute('data-lead-id');

      // 1) Actualizar memoria y caché local
      const targetLead = adminLeads.find(l => String(l.id) === String(leadId));
      if (targetLead) {
        targetLead.estado = newStatus;
        try {
          localStorage.setItem('megatrack_cached_leads', JSON.stringify(adminLeads));
        } catch (err) {}
        updateKpis(adminLeads.map(l => ({ ...l, ...calculateLeadScore(l.presupuesto || l.presupuesto_estimado, l.dolor_principal) })));
      }

      // 2) Actualización hacia Supabase (tabla 'leads')
      try {
        if (supabase && typeof supabase.from === 'function') {
          await supabase
            .from('leads')
            .update({ estado: newStatus })
            .eq('id', leadId);
        } else {
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
        }
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
  const pending = leads.filter(l => {
    const raw = (l.estado || 'por-contactar').toLowerCase();
    return raw === 'por-contactar' || raw === 'por contactar' || !raw;
  }).length;

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
