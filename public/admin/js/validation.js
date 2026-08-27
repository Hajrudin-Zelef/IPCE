import { apiPatch, fetchJSON, escapeHtml } from './api.js';

function getPriorityClass(collecte) {
  const ca = collecte.ca || 0;
  if (ca >= 5e6) return 'priority-high';
  if (ca >= 2e6) return 'priority-medium';
  return 'priority-low';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function renderInboxCard(collecte) {
  const priority = getPriorityClass(collecte);
  const rdvs = collecte.rdvs || [];

  return `
    <div class="inbox-card ${priority} animate-fade-in-up">
      <div class="inbox-header">
        <div>
          <div class="inbox-commercial">${escapeHtml(collecte.commercial)}</div>
          <div class="inbox-date">${formatDate(collecte.created_at)}</div>
        </div>
        <span class="inbox-status ${escapeHtml(collecte.statut)}">${escapeHtml(collecte.statut)}</span>
      </div>
      <div class="inbox-metrics">
        <div class="inbox-metric">
          <div class="inbox-metric-value">${(collecte.ca / 1e6).toFixed(1)}M</div>
          <div class="inbox-metric-label">CA</div>
        </div>
        <div class="inbox-metric">
          <div class="inbox-metric-value">${collecte.offres}</div>
          <div class="inbox-metric-label">Offres</div>
        </div>
        <div class="inbox-metric">
          <div class="inbox-metric-value">${collecte.bc}</div>
          <div class="inbox-metric-label">BC</div>
        </div>
        <div class="inbox-metric">
          <div class="inbox-metric-value">${rdvs.length}</div>
          <div class="inbox-metric-label">RDV</div>
        </div>
      </div>
      ${rdvs.length > 0 ? `
        <div class="inbox-rdvs">
          ${rdvs.map(r => `
            <div class="inbox-rdv-item">
              <div class="inbox-rdv-dot"></div>
              <span class="inbox-rdv-prospect">${escapeHtml(r.prospect)}</span>
              <span class="inbox-rdv-details">${r.date ? formatDate(r.date) : '—'} — ${r.montant != null ? escapeHtml(String(r.montant)) + 'M' : '—'} — ${escapeHtml(r.statut || '—')}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="inbox-actions">
        <button class="btn-approve" onclick="window.__approveCollecte(${collecte.id})">Approuver</button>
        <button class="btn-reject" onclick="window.__rejectCollecte(${collecte.id})">Rejeter</button>
      </div>
    </div>
  `;
}

export async function loadPending() {
  try {
    const collectes = await fetchJSON('/api/admin/pending');
    const countEl = document.getElementById('pending-count');
    const listEl = document.getElementById('pending-list');
    if (!countEl || !listEl) return;

    countEl.textContent = collectes.length + ' en attente';

    // Update sidebar badge
    const sidebarBadge = document.querySelector('.sidebar-nav-badge[data-badge="pending"]');
    if (sidebarBadge) {
      sidebarBadge.textContent = collectes.length;
      sidebarBadge.style.display = collectes.length > 0 ? 'flex' : 'none';
    }

    if (collectes.length === 0) {
      listEl.innerHTML = '<div class="empty">Aucune collecte en attente</div>';
      return;
    }

    listEl.innerHTML = collectes.map(c => renderInboxCard(c)).join('');
  } catch {
    const listEl = document.getElementById('pending-list');
    if (listEl) listEl.innerHTML = '<div class="empty">Erreur de chargement</div>';
  }
}

export async function approveCollecte(id) {
  if (!confirm('Approuver cette collecte ?')) return;
  const res = await apiPatch(`/api/admin/${id}/approve`);
  if (res.ok) {
    loadPending();
    if (window.__reloadStats) window.__reloadStats();
  }
}

export async function rejectCollecte(id) {
  if (!confirm('Rejeter cette collecte ?')) return;
  const res = await apiPatch(`/api/admin/${id}/reject`);
  if (res.ok) {
    loadPending();
    if (window.__reloadStats) window.__reloadStats();
  }
}
