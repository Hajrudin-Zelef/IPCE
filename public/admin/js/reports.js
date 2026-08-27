// Marexsoft Corporation
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

function formatDateLabel(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

let __lastReport = null;

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

  const rdvCount = rdvs ? rdvs.length : 0;
  const fromLabel = formatDateLabel(from) || 'Début';
  const toLabel = formatDateLabel(to) || 'Fin';

  __lastReport = { from: fromLabel, to: toLabel, commercial: commercial || 'Tous les commerciaux', users, rdvCount };

  const totals = users.reduce((acc, u) => ({
    ca: acc.ca + (u.ca || 0),
// Marexsoft Corporation
    offres: acc.offres + (u.offres || 0),
    bc: acc.bc + (u.bc || 0),
    rdvCount: acc.rdvCount + (u.rdvCount || 0)
  }), { ca: 0, offres: 0, bc: 0, rdvCount: 0 });

  const maxCA = Math.max(...users.map(u => u.ca || 0), 1);

  const preview = document.getElementById('report-preview');
  preview.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;font-size:16px">Rapport personnalisé</h3>
      <button class="section-filter" onclick="window.__exportCustomReport()">Exporter</button>
    </div>
    <p style="color:var(--muted);font-size:13px;margin-bottom:20px">
      ${fromLabel} — ${toLabel} | ${commercial || 'Tous les commerciaux'} | ${rdvCount} RDV
    </p>

    <div style="margin-bottom:24px">
      ${users.map(u => `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <span style="width:90px;font-size:13px;flex-shrink:0">${u.nom}</span>
          <div style="flex:1;background:var(--panel,#F0F2F5);border-radius:4px;height:20px;position:relative;overflow:hidden">
            <div style="height:100%;width:${((u.ca || 0) / maxCA * 100).toFixed(1)}%;background:#1E5F8C;border-radius:4px"></div>
          </div>
          <span style="width:100px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;flex-shrink:0">${formatCA(u.ca)} FCFA</span>
        </div>
      `).join('')}
    </div>

    <table class="section-table">
      <thead><tr><th>Commercial</th><th>CA</th><th>Offres</th><th>BC</th><th>RDV</th></tr></thead>
      <tbody>
        ${users.map(u => `<tr><td>${u.nom}</td><td>${formatCA(u.ca)} FCFA</td><td>${u.offres}</td><td>${u.bc}</td><td>${u.rdvCount}</td></tr>`).join('')}
        <tr style="font-weight:700;border-top:2px solid var(--line,#E1E6EE)">
          <td>TOTAL</td><td>${formatCA(totals.ca)} FCFA</td><td>${totals.offres}</td><td>${totals.bc}</td><td>${totals.rdvCount}</td>
        </tr>
      </tbody>
    </table>
  `;
};

window.__exportCustomReport = function() {
  if (!__lastReport) return;
  const { from, to, commercial, users } = __lastReport;

  const rows = [
    ['Rapport personnalisé'],
    [`${from} — ${to}`, commercial],
    [],
    ['Commercial', 'CA (FCFA)', 'Offres', 'BC', 'RDV']
  ];
  users.forEach(u => {
    rows.push([u.nom, u.ca.toLocaleString('fr-FR'), u.offres, u.bc, u.rdvCount]);
  });

  const csvContent = '\uFEFF' + rows.map(row => row.map(cell => `"${cell || ''}"`).join(';')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport_personnalise_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
// Marexsoft Corporation
