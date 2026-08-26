window.__load_logs = async function() {
  const logs = await loadSectionData('/api/admin/logs');
  if (!logs) return renderEmpty('section-logs-content', 'Erreur de chargement');

  window.__logsData = logs;
  renderLogs(logs);
};

function renderLogs(logs) {
  const el = document.getElementById('section-logs-content');
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // --- KPI Calculations ---
  const todayLogs = logs.filter(l => l.created_at && l.created_at.startsWith(today));
  const approveCount = logs.filter(l => l.action.includes('approve')).length;
  const rejectCount = logs.filter(l => l.action.includes('reject')).length;

  function getActionCategory(action) {
    if (action.includes('approve')) return 'approve';
    if (action.includes('reject')) return 'reject';
    if (action.includes('create')) return 'create';
    if (action.includes('delete')) return 'delete';
    if (action.includes('reset')) return 'reset';
    if (action.includes('update') || action.includes('settings') || action.includes('password') || action.includes('role')) return 'update';
    if (action.includes('login')) return 'login';
    return 'default';
  }

  function getActionLabel(action) {
    const map = {
      'approve_collecte': 'Approbation collecte',
      'reject_collecte': 'Rejet collecte',
      'create_user': 'Création utilisateur',
      'delete_user': 'Suppression utilisateur',
      'reset_password': 'Réinitialisation mdp',
      'update_settings': 'Modification paramètres',
      'update_user': 'Modification utilisateur',
      'reset_all': 'Réinitialisation totale',
      'login': 'Connexion',
    };
    return map[action] || action;
  }

  function getActionIcon(action) {
    const cat = getActionCategory(action);
    const icons = {
      approve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      reject: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      create: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
      update: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>',
      login: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
      default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };
    return icons[cat] || icons.default;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `Il y a ${diffD}j`;
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const dStr = dateStr.split('T')[0];
    if (dStr === today) return "Aujourd'hui";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dStr === yesterday.toISOString().split('T')[0]) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // --- Group logs by day ---
  const grouped = {};
  logs.forEach(l => {
    const day = l.created_at ? l.created_at.split('T')[0] : 'unknown';
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(l);
  });

  // --- Filter counts by action ---
  const actionCounts = {};
  logs.forEach(l => {
    const cat = getActionCategory(l.action);
    actionCounts[cat] = (actionCounts[cat] || 0) + 1;
  });

  el.innerHTML = `
    <!-- KPI Bar -->
    <div class="logs-kpi-bar">
      <div class="logs-kpi kpi-total">
        <div class="logs-kpi-label">Total</div>
        <div class="logs-kpi-value">${logs.length}</div>
        <div class="logs-kpi-sub">événenements enregistrés</div>
      </div>
      <div class="logs-kpi kpi-today">
        <div class="logs-kpi-label">Aujourd'hui</div>
        <div class="logs-kpi-value">${todayLogs.length}</div>
        <div class="logs-kpi-sub">${todayLogs.length === 1 ? 'événement' : 'événements'}</div>
      </div>
      <div class="logs-kpi kpi-actions">
        <div class="logs-kpi-label">Approbations</div>
        <div class="logs-kpi-value">${approveCount}</div>
        <div class="logs-kpi-sub">${rejectCount} rejet${rejectCount !== 1 ? 's' : ''}</div>
      </div>
      <div class="logs-kpi kpi-errors">
        <div class="logs-kpi-label">Suppressions</div>
        <div class="logs-kpi-value">${actionCounts.delete || 0}</div>
        <div class="logs-kpi-sub">${actionCounts.reset || 0} réinitialisation${actionCounts.reset || 0 !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="logs-toolbar">
      <div class="logs-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="logs-search-input" placeholder="Rechercher dans les logs..." oninput="window.__filterLogs()">
      </div>
      <div class="logs-filters">
        <button class="logs-filter-btn active" data-filter="all" onclick="window.__setLogFilter('all', this)">
          Tous <span class="logs-filter-count">${logs.length}</span>
        </button>
        <button class="logs-filter-btn" data-filter="approve" onclick="window.__setLogFilter('approve', this)">
          Approbations <span class="logs-filter-count">${actionCounts.approve || 0}</span>
        </button>
        <button class="logs-filter-btn" data-filter="reject" onclick="window.__setLogFilter('reject', this)">
          Rejets <span class="logs-filter-count">${actionCounts.reject || 0}</span>
        </button>
        <button class="logs-filter-btn" data-filter="create" onclick="window.__setLogFilter('create', this)">
          Créations <span class="logs-filter-count">${actionCounts.create || 0}</span>
        </button>
        <button class="logs-filter-btn" data-filter="update" onclick="window.__setLogFilter('update', this)">
          Modifications <span class="logs-filter-count">${actionCounts.update || 0}</span>
        </button>
        <button class="logs-filter-btn" data-filter="delete" onclick="window.__setLogFilter('delete', this)">
          Suppressions <span class="logs-filter-count">${actionCounts.delete || 0}</span>
        </button>
      </div>
      <div class="logs-auto-refresh">
        <input type="checkbox" id="logs-auto-refresh" onchange="window.__toggleAutoRefresh()">
        <label for="logs-auto-refresh">Auto-refresh</label>
        <button class="logs-refresh-btn" onclick="window.__load_logs()" title="Rafraîchir">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
        </button>
      </div>
    </div>

    <!-- Timeline -->
    <div class="logs-timeline" id="logs-timeline">
      ${Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(day => `
        <div class="logs-timeline-day" data-day="${day}">
          <div class="logs-timeline-day-title">${formatDateLabel(day + 'T00:00:00')}</div>
          ${grouped[day].map(l => {
            const cat = getActionCategory(l.action);
            return `
              <div class="logs-timeline-item action-${cat}" data-action="${cat}" data-search="${(l.user_nom || '').toLowerCase()} ${l.action.toLowerCase()} ${(l.details || '').toLowerCase()} ${(l.target || '').toLowerCase()}">
                <div class="logs-timeline-icon ${cat}">${getActionIcon(l.action)}</div>
                <div class="logs-timeline-body">
                  <div class="logs-timeline-header">
                    <span class="logs-timeline-action">${getActionLabel(l.action)}</span>
                    <span class="logs-timeline-badge ${cat}">${l.action.replace(/_/g, ' ')}</span>
                  </div>
                  ${l.details ? `<div class="logs-timeline-detail">${l.details}</div>` : ''}
                  <div class="logs-timeline-meta">
                    <span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      ${l.user_nom || 'Système'}
                    </span>
                    ${l.target ? `<span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      ${l.target}
                    </span>` : ''}
                    <span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      ${formatTime(l.created_at)} — ${timeAgo(l.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `).join('')}
    </div>

    ${logs.length === 0 ? '<div class="logs-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Aucun log disponible</p></div>' : ''}
  `;
}

// --- State ---
let currentLogFilter = 'all';
let autoRefreshInterval = null;

// --- Filters ---
window.__setLogFilter = function(filter, btn) {
  currentLogFilter = filter;
  document.querySelectorAll('.logs-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyLogFilters();
};

window.__filterLogs = function() {
  applyLogFilters();
};

function applyLogFilters() {
  const search = (document.getElementById('logs-search-input')?.value || '').toLowerCase().trim();
  document.querySelectorAll('.logs-timeline-item').forEach(item => {
    const action = item.dataset.action || '';
    const searchText = item.dataset.search || '';
    const matchFilter = currentLogFilter === 'all' || action === currentLogFilter;
    const matchSearch = !search || searchText.includes(search);
    item.style.display = (matchFilter && matchSearch) ? '' : 'none';
  });
  // Show/hide day headers based on visible items
  document.querySelectorAll('.logs-timeline-day').forEach(day => {
    const visibleItems = day.querySelectorAll('.logs-timeline-item:not([style*="display: none"])');
    day.style.display = visibleItems.length > 0 ? '' : 'none';
  });
}

// --- Auto Refresh ---
window.__toggleAutoRefresh = function() {
  const enabled = document.getElementById('logs-auto-refresh').checked;
  if (enabled) {
    autoRefreshInterval = setInterval(() => window.__load_logs(), 30000);
  } else {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
};
