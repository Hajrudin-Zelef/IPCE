window.__load_executive = async function() {
  const data = await loadSectionData('/api/admin/stats');
  if (!data) return renderEmpty('section-executive-content', 'Erreur de chargement');

  const el = document.getElementById('section-executive-content');
  const t = data.totals;
  const convRDV = t.rdvCount > 0 ? ((t.offres / t.rdvCount) * 100).toFixed(0) : 0;
  const convBC = t.offres > 0 ? ((t.bc / t.offres) * 100).toFixed(0) : 0;
  const avgCA = data.users.length > 0 ? (t.ca / data.users.length) : 0;

  el.innerHTML = `
    <div class="executive-grid">
      <div class="executive-stat">
        <div class="executive-stat-value">${formatCA(t.ca)} FCFA</div>
        <div class="executive-stat-label">CA Total</div>
      </div>
      <div class="executive-stat">
        <div class="executive-stat-value">${t.offres}</div>
        <div class="executive-stat-label">Offres Émises</div>
      </div>
      <div class="executive-stat">
        <div class="executive-stat-value">${t.bc}</div>
        <div class="executive-stat-label">BC Signés</div>
      </div>
      <div class="executive-stat">
        <div class="executive-stat-value">${t.rdvCount}</div>
        <div class="executive-stat-label">RDV Totaux</div>
      </div>
      <div class="executive-stat">
        <div class="executive-stat-value">${convRDV}%</div>
        <div class="executive-stat-label">Conv RDV→Offre</div>
      </div>
      <div class="executive-stat">
        <div class="executive-stat-value">${convBC}%</div>
        <div class="executive-stat-label">Conv Offre→BC</div>
      </div>
      <div class="executive-stat">
        <div class="executive-stat-value">${formatCA(avgCA)} FCFA</div>
        <div class="executive-stat-label">CA Moyen / Commercial</div>
      </div>
      <div class="executive-stat">
        <div class="executive-stat-value">${data.users.length}</div>
        <div class="executive-stat-label">Commerciaux Actifs</div>
      </div>
    </div>
    <div class="section-card">
      <h3 style="margin:0 0 16px;font-size:16px;font-weight:700">Classement des Commerciaux</h3>
      <table class="section-table">
        <thead><tr><th>#</th><th>Commercial</th><th>CA</th><th>Offres</th><th>BC</th><th>RDV</th></tr></thead>
        <tbody>
          ${[...data.users].sort((a,b) => b.ca - a.ca).map((u, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${u.nom}</strong></td>
              <td>${formatCA(u.ca)} FCFA</td>
              <td>${u.offres}</td>
              <td>${u.bc}</td>
              <td>${u.rdvCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};
