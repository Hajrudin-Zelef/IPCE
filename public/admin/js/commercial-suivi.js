window.__load_commercial_suivi = async function() {
  const data = await loadSectionData('/api/admin/stats');
  if (!data) return renderEmpty('section-commercial-suivi-content', 'Erreur de chargement');

  const el = document.getElementById('section-commercial-suivi-content');
  const sorted = [...data.users].sort((a, b) => b.ca - a.ca);
  const colors = ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#EF4444', '#EC4899'];

  el.innerHTML = `
    <div class="section-card" style="margin-bottom:24px;">
      <div class="section-card-title">Pipeline empile par Commercial</div>
      <div style="height:320px;"><canvas id="suivi-stacked"></canvas></div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
      ${sorted.map((u, i) => {
        const convRdv = u.rdvCount > 0 ? ((u.offres / u.rdvCount) * 100).toFixed(0) : 0;
        const convOffre = u.offres > 0 ? ((u.bc / u.offres) * 100).toFixed(0) : 0;
        const pct = data.totals.ca > 0 ? ((u.ca / data.totals.ca) * 100).toFixed(1) : 0;
        return `
          <div class="section-card" style="border-top:3px solid ${colors[i % colors.length]};">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div style="font-weight:700; font-size:15px; color:#0F172A;">${u.nom}</div>
              <div style="font-size:12px; padding:3px 8px; border-radius:12px; background:${colors[i % colors.length]}15; color:${colors[i % colors.length]}; font-weight:600;">${pct}% du CA</div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
              <div style="padding:8px; background:#F8FAFC; border-radius:6px;">
                <div style="color:#94A3B8; font-size:10px; text-transform:uppercase;">CA</div>
                <div style="font-weight:700; color:#0F172A;">${formatCA(u.ca)} FCFA</div>
              </div>
              <div style="padding:8px; background:#F8FAFC; border-radius:6px;">
                <div style="color:#94A3B8; font-size:10px; text-transform:uppercase;">RDV</div>
                <div style="font-weight:700; color:#0F172A;">${u.rdvCount}</div>
              </div>
              <div style="padding:8px; background:#F8FAFC; border-radius:6px;">
                <div style="color:#94A3B8; font-size:10px; text-transform:uppercase;">Offres</div>
                <div style="font-weight:700; color:#0F172A;">${u.offres}</div>
              </div>
              <div style="padding:8px; background:#F8FAFC; border-radius:6px;">
                <div style="color:#94A3B8; font-size:10px; text-transform:uppercase;">BC</div>
                <div style="font-weight:700; color:#0F172A;">${u.bc}</div>
              </div>
            </div>
            <div style="margin-top:10px; display:flex; gap:8px; font-size:11px;">
              <div style="flex:1; text-align:center; padding:6px; border-radius:6px; background:#EFF6FF; color:#2563EB; font-weight:600;">Conv RDV→Offre: ${convRdv}%</div>
              <div style="flex:1; text-align:center; padding:6px; border-radius:6px; background:#ECFDF5; color:#059669; font-weight:600;">Conv Offre→BC: ${convOffre}%</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Stacked bar pipeline
  const stackedCtx = document.getElementById('suivi-stacked');
  if (stackedCtx) {
    new Chart(stackedCtx, {
      type: 'bar',
      data: {
        labels: sorted.map(u => u.nom),
        datasets: [
          { label: 'RDV', data: sorted.map(u => u.rdvCount), backgroundColor: '#7C3AED', borderRadius: 4 },
          { label: 'Offres', data: sorted.map(u => u.offres), backgroundColor: '#2563EB', borderRadius: 4 },
          { label: 'BC', data: sorted.map(u => u.bc), backgroundColor: '#059669', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11, weight: '500' }, color: '#64748B' } } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
          y: { stacked: true, beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
        },
      },
    });
  }
};
