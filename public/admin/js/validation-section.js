window.__load_validation = async function() {
  const el = document.getElementById('section-validation-content');
  el.innerHTML = `
    <div class="section-filters">
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
      container.innerHTML = '<div class="section-empty"><p>Aucune demande en attente</p></div>';
      return;
    }
    container.innerHTML = pending.map(c => `
      <div class="section-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <strong>${c.commercial}</strong>
          <span class="section-badge warning">En attente</span>
        </div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:8px">${formatDate(c.created_at)}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px">
          <div><div style="font-size:11px;color:var(--muted)">CA</div><div style="font-weight:600">${formatCA(c.ca)} FCFA</div></div>
          <div><div style="font-size:11px;color:var(--muted)">Offres</div><div style="font-weight:600">${c.offres}</div></div>
          <div><div style="font-size:11px;color:var(--muted)">BC</div><div style="font-weight:600">${c.bc}</div></div>
          <div><div style="font-size:11px;color:var(--muted)">RDV</div><div style="font-weight:600">${c.rdvs ? c.rdvs.length : 0}</div></div>
        </div>
        ${c.rdvs && c.rdvs.length > 0 ? '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">RDV: ' + c.rdvs.map(r => r.prospect).join(', ') + '</div>' : ''}
        <div style="display:flex;gap:8px">
          <button class="section-filter active" onclick="window.__approveCollecte(${c.id})" style="background:var(--success);border-color:var(--success);color:white">Approuver</button>
          <button class="section-filter" onclick="window.__rejectCollecte(${c.id})" style="background:var(--danger);border-color:var(--danger);color:white">Rejeter</button>
        </div>
      </div>
    `).join('');
  } else {
    const history = await loadSectionData('/api/admin/history');
    if (!history || history.length === 0) {
      container.innerHTML = '<div class="section-empty"><p>Aucun historique</p></div>';
      return;
    }
    container.innerHTML = `
      <table class="section-table">
        <thead><tr><th>Date</th><th>Commercial</th><th>Action</th><th>Par</th></tr></thead>
        <tbody>
          ${history.map(h => `
            <tr>
              <td>${formatDate(h.created_at)}</td>
              <td>${h.commercial}</td>
              <td><span class="log-action-badge ${h.action}">${h.action === 'approve' ? 'Approuvé' : 'Rejeté'}</span></td>
              <td>${h.user_nom}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
};
