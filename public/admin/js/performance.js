window.__load_performance = async function() {
  const data = await loadSectionData('/api/admin/stats');
  if (!data) return renderEmpty('section-performance-content', 'Erreur de chargement');

  const el = document.getElementById('section-performance-content');
  const sorted = [...data.users].sort((a, b) => b.ca - a.ca);
  const maxCA = Math.max(...sorted.map(u => u.ca), 1);
  const colors = ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#EF4444', '#EC4899'];

  el.innerHTML = `
    <div class="section-card" style="margin-bottom:24px;">
      <div class="section-card-title">Classement detaille</div>
      <div style="display:grid; grid-template-columns:240px 1fr; gap:24px; align-items:start;">
        <div style="position:relative; height:240px; display:flex; align-items:center; justify-content:center;">
          <canvas id="perf-conv-donut"></canvas>
        </div>
        <div style="overflow-x:auto;">
          <table class="section-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Commercial</th>
                <th>CA</th>
                <th>Offres</th>
                <th>BC</th>
                <th>RDV</th>
                <th>Conv RDV→Offre</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map((u, i) => {
                const conv = u.rdvCount > 0 ? ((u.offres / u.rdvCount) * 100).toFixed(0) : 0;
                const pct = ((u.ca / maxCA) * 100).toFixed(0);
                const cls = pct >= 80 ? 'excellent' : pct >= 50 ? 'good' : pct >= 25 ? 'warning' : 'danger';
                return `<tr>
                  <td>${i + 1}</td>
                  <td><strong>${u.nom}</strong></td>
                  <td>${formatCA(u.ca)} FCFA</td>
                  <td>${u.offres}</td>
                  <td>${u.bc}</td>
                  <td>${u.rdvCount}</td>
                  <td>${conv}%</td>
                  <td style="min-width:120px">
                    <div class="performance-bar">
                      <div class="performance-bar-fill ${cls}" style="width:${pct}%"></div>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="section-card">
      <div class="section-card-title">Taux de conversion par commercial</div>
      <div style="height:300px;"><canvas id="perf-conv-bar"></canvas></div>
    </div>
  `;

  // Donut conversion RDV→Offre
  const convCtx = document.getElementById('perf-conv-donut');
  if (convCtx) {
    const convData = sorted.map(u => u.rdvCount > 0 ? ((u.offres / u.rdvCount) * 100) : 0);
    new Chart(convCtx, {
      type: 'doughnut',
      data: {
        labels: sorted.map(u => u.nom),
        datasets: [{ data: convData.map(c => parseFloat(c)), backgroundColor: colors.slice(0, sorted.length), borderWidth: 0, hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 10, weight: '500' }, color: '#64748B' } },
          tooltip: { backgroundColor: '#0F172A', cornerRadius: 8, callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(0)}%` } },
        },
      },
    });
  }

  // Bar conversion
  const convBarCtx = document.getElementById('perf-conv-bar');
  if (convBarCtx) {
    new Chart(convBarCtx, {
      type: 'bar',
      data: {
        labels: sorted.map(u => u.nom),
        datasets: [
          { label: 'Conv RDV→Offre %', data: sorted.map(u => u.rdvCount > 0 ? ((u.offres / u.rdvCount) * 100) : 0), backgroundColor: '#2563EB', borderRadius: 4 },
          { label: 'Conv Offre→BC %', data: sorted.map(u => u.offres > 0 ? ((u.bc / u.offres) * 100) : 0), backgroundColor: '#059669', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11, weight: '500' }, color: '#64748B' } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
          y: { beginAtZero: true, max: 100, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 }, color: '#94A3B8', callback: v => v + '%' } },
        },
      },
    });
  }
};
