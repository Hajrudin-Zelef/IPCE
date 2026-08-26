/* ========================================
   DASHBOARD — Historique
   ======================================== */

async function loadHistory() {
  try {
    const res = await api('GET', '/api/collectes');
    if (res.status === 401) { window.location.href = '/'; return; }
    const collectes = await res.json();
    const body = document.getElementById('history-body');
    const empty = document.getElementById('empty-history');
    if (collectes.length === 0) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = collectes.map(c => `
      <tr>
        <td>${new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
        <td>${(c.ca / 1e6).toFixed(1)}M</td>
        <td>${c.offres}</td>
        <td>${c.bc}</td>
        <td>${c.rdvs ? c.rdvs.length : 0}</td>
        <td><span class="status status-${c.statut}">${c.statut}</span></td>
      </tr>
    `).join('');
    renderCharts(collectes);
  } catch {}
}
