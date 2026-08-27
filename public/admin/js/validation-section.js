window.__load_validation = async function() {
  const el = document.getElementById('section-validation-content');
  el.innerHTML = `
    <div class="section-filters" style="margin-bottom:20px">
      <button class="section-filter active" onclick="window.__loadValTab('pending', this)">En attente</button>
      <button class="section-filter" onclick="window.__loadValTab('history', this)">Historique</button>
    </div>
    <div id="validation-tab-content"><div class="section-empty"><p>Chargement...</p></div></div>
  `;
  window.__loadValTab('pending');
};

window.__loadValTab = async function(tab, btn) {
  if (btn) {
    document.querySelectorAll('.section-filters .section-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const container = document.getElementById('validation-tab-content');

  if (tab === 'pending') {
    const pending = await loadSectionData('/api/admin/pending');
    if (!pending || pending.length === 0) {
      container.innerHTML = `
        <div class="validation-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>Aucune demande en attente</p>
          <div class="validation-empty-sub">Toutes les collectes ont été traitées</div>
        </div>
      `;
      return;
    }

    // KPI calculations
    const totalCA = pending.reduce((s, c) => s + (c.ca || 0), 0);
    const avgCA = pending.length > 0 ? totalCA / pending.length : 0;
    const oldestDate = pending.reduce((min, c) => {
      const d = new Date(c.created_at);
      return d < min ? d : min;
    }, new Date());
    const daysOld = Math.floor((new Date() - oldestDate) / 86400000);

    function getInitials(name) {
      return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }

    function timeAgo(dateStr) {
      const now = new Date();
      const d = new Date(dateStr);
      const diffMin = Math.floor((now - d) / 60000);
      if (diffMin < 1) return "À l'instant";
      if (diffMin < 60) return `Il y a ${diffMin}min`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `Il y a ${diffH}h`;
      const diffD = Math.floor(diffH / 24);
      return `Il y a ${diffD}j`;
    }

    function getRdvDotClass(statut) {
      const map = { 'Prévu': 'Prevu', 'Confirmé': 'Confirmé', 'Terminé': 'Terminé', 'Offre': 'Offre', 'BC Signé': 'BC Signé' };
      return map[statut] || 'Prevu';
    }

    container.innerHTML = `
      <!-- KPI Bar -->
      <div class="validation-kpi-bar">
        <div class="validation-kpi kpi-pending">
          <div class="validation-kpi-label">En attente</div>
          <div class="validation-kpi-value">${pending.length}</div>
          <div class="validation-kpi-sub">${pending.length === 1 ? 'demande à traiter' : 'demandes à traiter'}</div>
        </div>
        <div class="validation-kpi kpi-ca">
          <div class="validation-kpi-label">CA Total</div>
          <div class="validation-kpi-value">${formatCA(totalCA)}<span style="font-size:12px;font-weight:500;color:var(--muted);margin-left:2px">FCFA</span></div>
          <div class="validation-kpi-sub">à valider</div>
        </div>
        <div class="validation-kpi kpi-avg">
          <div class="validation-kpi-label">CA Moyen</div>
          <div class="validation-kpi-value">${formatCA(avgCA)}<span style="font-size:12px;font-weight:500;color:var(--muted);margin-left:2px">FCFA</span></div>
          <div class="validation-kpi-sub">par collecte</div>
        </div>
        <div class="validation-kpi kpi-old">
          <div class="validation-kpi-label">Plus ancienne</div>
          <div class="validation-kpi-value">${daysOld}j</div>
          <div class="validation-kpi-sub">${daysOld <= 1 ? 'jour d\'attente' : 'jours d\'attente'}</div>
        </div>
      </div>

      <!-- Cards -->
      <div class="validation-grid">
        ${pending.map(c => {
          const totalRDV = c.rdvs ? c.rdvs.length : 0;
          return `
            <div class="inbox-card" id="inbox-${c.id}">
              <div class="inbox-card-top">
                <div class="inbox-card-header">
                  <div class="inbox-avatar">${escapeHtml(getInitials(c.commercial))}</div>
                  <div>
                    <div class="inbox-commercial">${escapeHtml(c.commercial)}</div>
                    <div class="inbox-date">
                      Soumis <span class="inbox-date-time">${timeAgo(c.created_at)}</span> — ${formatDate(c.created_at)}
                    </div>
                  </div>
                </div>
                <span class="inbox-badge pending">En attente</span>
              </div>
              <div class="inbox-card-body">
                <!-- Metrics -->
                <div class="inbox-metrics">
                  <div class="inbox-metric">
                    <div class="inbox-metric-value ca">${formatCA(c.ca)}</div>
                    <div class="inbox-metric-label">CA (FCFA)</div>
                  </div>
                  <div class="inbox-metric">
                    <div class="inbox-metric-value">${c.offres}</div>
                    <div class="inbox-metric-label">Offres</div>
                  </div>
                  <div class="inbox-metric">
                    <div class="inbox-metric-value">${c.bc}</div>
                    <div class="inbox-metric-label">BC</div>
                  </div>
                  <div class="inbox-metric">
                    <div class="inbox-metric-value">${totalRDV}</div>
                    <div class="inbox-metric-label">RDV</div>
                  </div>
                  <div class="inbox-metric">
                    <div class="inbox-metric-value">${c.visites || 0}</div>
                    <div class="inbox-metric-label">Visites</div>
                  </div>
                  <div class="inbox-metric">
                    <div class="inbox-metric-value">${c.contacts || 0}</div>
                    <div class="inbox-metric-label">Contacts</div>
                  </div>
                </div>
                ${c.zone ? `<div style="font-size:11px;margin-bottom:8px"><span style="background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:4px;font-weight:600">${escapeHtml(c.zone)}</span></div>` : ''}
                ${c.notes ? `<div style="font-size:11px;color:var(--muted);margin-bottom:12px;background:var(--bg);padding:8px 10px;border-radius:6px;white-space:pre-wrap">${escapeHtml(c.notes)}</div>` : ''}

                <!-- RDV List -->
                ${totalRDV > 0 ? `
                  <div class="inbox-rdvs-title">Rendez-vous <span class="inbox-rdv-count">${totalRDV}</span></div>
                  <div class="inbox-rdvs">
                    ${c.rdvs.map(r => `
                      <div class="inbox-rdv-item">
                        <div class="inbox-rdv-dot ${getRdvDotClass(r.statut)}"></div>
                        <div class="inbox-rdv-prospect">${escapeHtml(r.prospect)}</div>
                        <div class="inbox-rdv-meta">
                          <span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                            ${formatDate(r.date)}
                          </span>
                          <span>${formatCA(r.montant)}M</span>
                        </div>
                        <span class="inbox-rdv-statut ${getRdvDotClass(r.statut)}">${escapeHtml(r.statut)}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">Aucun RDV dans cette collecte</div>'}

                <!-- Actions -->
                <div class="inbox-actions">
                  <button class="btn-approve" onclick="window.__approveCollecte(${c.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Approuver
                  </button>
                  <button class="btn-reject" onclick="window.__rejectCollecte(${c.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Rejeter
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    // History tab
    const history = await loadSectionData('/api/admin/history');
    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="validation-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>Aucun historique</p>
          <div class="validation-empty-sub">Les actions de validation apparaîtront ici</div>
        </div>
      `;
      return;
    }
    container.innerHTML = `
      <div class="validation-history">
        <div class="validation-history-header">
          <span>Date</span>
          <span>Commercial</span>
          <span>CA</span>
          <span>Action</span>
          <span>Par</span>
        </div>
        ${history.map(h => `
          <div class="validation-history-row">
            <span class="validation-history-date">${formatDate(h.created_at)}</span>
            <span class="validation-history-commercial">${escapeHtml(h.commercial)}</span>
            <span class="validation-history-ca">${h.ca ? formatCA(h.ca) + ' FCFA' : '—'}</span>
            <span><span class="log-action-badge ${escapeHtml(h.action)}">${h.action === 'approve' ? 'Approuvé' : 'Rejeté'}</span></span>
            <span>${escapeHtml(h.user_nom)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
};

window.__approveCollecte = async function(id) {
  if (!confirm('Approuver cette collecte ?')) return;
  const card = document.getElementById('inbox-' + id);
  if (card) {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
  }
  try {
    const res = await fetch('/api/admin/' + id + '/approve', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); window.__loadValTab('pending'); return; }
    window.__loadValTab('pending');
  } catch { alert('Erreur serveur'); window.__loadValTab('pending'); }
};

window.__rejectCollecte = async function(id) {
  if (!confirm('Rejeter cette collecte ?')) return;
  const card = document.getElementById('inbox-' + id);
  if (card) {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
  }
  try {
    const res = await fetch('/api/admin/' + id + '/reject', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); window.__loadValTab('pending'); return; }
    window.__loadValTab('pending');
  } catch { alert('Erreur serveur'); window.__loadValTab('pending'); }
};
