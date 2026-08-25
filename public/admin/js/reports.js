window.__load_custom_reports = async function() {
  const el = document.getElementById('section-custom-reports-content');
  el.innerHTML = `
    <div class="section-card">
      <div class="reports-controls">
        <label>Du:</label>
        <input type="date" id="report-from">
        <label>Au:</label>
        <input type="date" id="report-to">
        <label>Commercial:</label>
        <select id="report-commercial"><option value="">Tous</option></select>
        <button class="section-filter active" onclick="window.__generateReport()">Générer</button>
      </div>
      <div class="reports-preview" id="report-preview">
        <div class="section-empty"><p>Sélectionnez vos filtres et cliquez sur Générer</p></div>
      </div>
    </div>
  `;

  const data = await loadSectionData('/api/admin/stats');
  if (data) {
    const sel = document.getElementById('report-commercial');
    data.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.nom;
      opt.textContent = u.nom;
      sel.appendChild(opt);
    });
  }
};

window.__generateReport = async function() {
  const from = document.getElementById('report-from').value;
  const to = document.getElementById('report-to').value;
  const commercial = document.getElementById('report-commercial').value;

  let url = '/api/admin/rdvs?';
  if (from) url += 'from=' + from + '&';
  if (to) url += 'to=' + to + '&';
  if (commercial) url += 'commercial=' + commercial;

  const rdvs = await loadSectionData(url);
  const stats = await loadSectionData('/api/admin/stats');
  if (!stats) return;

  let users = stats.users;
  if (commercial) users = users.filter(u => u.nom === commercial);

  const preview = document.getElementById('report-preview');
  preview.innerHTML = `
    <h3 style="margin:0 0 16px;font-size:16px">Rapport personnalisé</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:16px">
      ${from || 'Début'} — ${to || 'Fin'} | ${commercial || 'Tous les commerciaux'} | ${rdvs ? rdvs.length : 0} RDV
    </p>
    <table class="section-table">
      <thead><tr><th>Commercial</th><th>CA</th><th>Offres</th><th>BC</th><th>RDV</th></tr></thead>
      <tbody>
        ${users.map(u => `<tr><td>${u.nom}</td><td>${formatCA(u.ca)} FCFA</td><td>${u.offres}</td><td>${u.bc}</td><td>${u.rdvCount}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
};
