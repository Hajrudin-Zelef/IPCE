window.__load_logs = async function() {
  const logs = await loadSectionData('/api/admin/logs');
  if (!logs) return renderEmpty('section-logs-content', 'Erreur de chargement');

  const el = document.getElementById('section-logs-content');
  el.innerHTML = `
    <div class="logs-filters">
      <select id="log-filter-action" onchange="window.__filterLogs()">
        <option value="">Toutes les actions</option>
        <option value="approve_collecte">Approbation</option>
        <option value="reject_collecte">Rejet</option>
      </select>
    </div>
    <div class="logs-table-wrapper">
      <table class="section-table" id="logs-table">
        <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Cible</th><th>Détails</th></tr></thead>
        <tbody>
          ${logs.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:40px">Aucun log</td></tr>' :
            logs.map(l => `
              <tr data-action="${l.action}">
                <td style="white-space:nowrap">${formatDate(l.created_at)}</td>
                <td>${l.user_nom || '—'}</td>
                <td><span class="log-action-badge ${l.action.includes('approve') ? 'approve' : l.action.includes('reject') ? 'reject' : l.action.includes('create') ? 'create' : l.action.includes('delete') ? 'delete' : 'update'}">${l.action}</span></td>
                <td>${l.target || '—'}</td>
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis">${l.details || '—'}</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

window.__filterLogs = function() {
  const action = document.getElementById('log-filter-action').value;
  document.querySelectorAll('#logs-table tbody tr').forEach(row => {
    if (!action || row.dataset.action === action) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
};
