// Marexsoft Corporation
window.__load_executive = async function() {
  const el = document.getElementById('section-executive-content');
  if (!el) return;

  const [data, settings] = await Promise.all([
    loadSectionData('/api/admin/stats'),
    fetch('/api/admin/settings', { credentials: 'include' }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
  ]);
  if (!data) return renderEmpty('section-executive-content', 'Erreur de chargement');

  const evolution = await fetch('/api/admin/evolution', { credentials: 'include' })
    .then(r => r.ok ? r.json() : []).catch(() => []);

  const t = data.totals;
  const objectif = parseFloat(settings.ca_objectif) || 100000000;
  const pctObj = Math.min((t.ca / objectif) * 100, 100);
  const pctRaw = ((t.ca / objectif) * 100).toFixed(1);
  const convRDV = t.rdvCount > 0 ? ((t.offres / t.rdvCount) * 100).toFixed(0) : 0;
  const convBC = t.offres > 0 ? ((t.bc / t.offres) * 100).toFixed(0) : 0;
  const avgCA = data.users.length > 0 ? t.ca / data.users.length : 0;

  // Projection fin de mois
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const curMonth = now.toISOString().slice(0, 7);
  const curRow = evolution.find(e => e.month === curMonth);
  const caMois = curRow ? curRow.ca : 0;
  const ratio = daysElapsed / daysInMonth;
  const projection = ratio > 0 ? caMois / ratio : 0;
  const pctProj = Math.min((projection / objectif) * 100, 999).toFixed(0);
  const projColor = projection >= objectif ? '#059669' : projection >= objectif * 0.7 ? '#F59E0B' : '#EF4444';

  const health = [
    { label: 'Conv RDV→Offre', value: convRDV + '%', ok: convRDV >= 50 },
    { label: 'Conv Offre→BC', value: convBC + '%', ok: convBC >= 50 },
    { label: 'CA Moyen / Commercial', value: formatCA(avgCA), ok: avgCA >= objectif / Math.max(data.users.length, 1) * 0.7 },
    { label: 'Commerciaux Actifs', value: data.users.length, ok: true },
  ];

  el.innerHTML = `
    <div class="executive-chart-row" style="margin-bottom:24px;">
      <div class="section-card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px;">
        <div style="font-size:13px; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:16px;">Atteinte de l'objectif</div>
        <div style="position:relative; width:260px; height:260px;">
          <canvas id="exec-gauge"></canvas>
          <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;">
            <div style="font-size:42px; font-weight:800; color:${pctObj >= 100 ? '#059669' : getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()};">${pctRaw}%</div>
            <div style="font-size:12px; color:#94A3B8;">${formatCA(t.ca)} / ${formatCA(objectif)}</div>
          </div>
        </div>
        <div style="margin-top:14px; font-size:12px; color:#64748B;">
          Reste : <strong>${formatCA(Math.max(objectif - t.ca, 0))} FCFA</strong>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="section-card" style="flex:1; display:flex; flex-direction:column; justify-content:center;">
          <div style="font-size:13px; font-weight:600; color:#64748B; text-transform:uppercase; margin-bottom:10px;">Projection fin de mois</div>
          <div style="display:flex; align-items:baseline; gap:10px;">
            <div style="font-size:30px; font-weight:800; color:${projColor};">${pctProj}%</div>
            <div style="font-size:13px; color:#64748B;">de l'objectif</div>
          </div>
          <div style="font-size:13px; color:#64748B; margin-top:6px;">
            Rythme actuel : ${formatCA(projection)} FCFA projetés<br>
            <span style="font-size:11px; color:#94A3B8;">Basé sur ${daysElapsed}/${daysInMonth} jours écoulés</span>
          </div>
        </div>
        <div class="section-card" style="flex:1;">
          <div style="font-size:13px; font-weight:600; color:#64748B; text-transform:uppercase; margin-bottom:12px;">Santé business</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            ${health.map(h => `
              <div style="padding:10px; background:#F8FAFC; border-radius:8px;">
                <div style="display:flex; align-items:center; gap:6px; font-size:10px; color:#94A3B8; text-transform:uppercase;">
                  <span style="width:8px; height:8px; border-radius:50%; background:${h.ok ? '#059669' : '#EF4444'};"></span>${h.label}
                </div>
                <div style="font-size:18px; font-weight:700; color:#0F172A; margin-top:2px;">${h.value}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="section-card">
      <div class="section-card-title">Evolution mensuelle — CA, Offres & BC</div>
      <div style="height:320px;"><canvas id="exec-evolution"></canvas></div>
    </div>
  `;

  // Jauge radiale
  const gaugeCtx = document.getElementById('exec-gauge');
// Marexsoft Corporation
  if (gaugeCtx) {
    new Chart(gaugeCtx, {
      type: 'doughnut',
      data: {
        labels: ['Atteint', 'Restant'],
        datasets: [{
          data: [pctObj, 100 - pctObj],
          backgroundColor: [pctObj >= 100 ? '#059669' : (getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#E31C23'), '#E2E8F0'],
          borderWidth: 0,
          circumference: 360,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '78%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });
  }

  // Evolution mensuelle (barres CA + lignes Offres/BC)
  const evoCtx = document.getElementById('exec-evolution');
  if (evoCtx) {
    const labels = evolution.map(e => {
      const [y, m] = e.month.split('-');
      return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    });
    new Chart(evoCtx, {
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'CA (M FCFA)',
            data: evolution.map(e => e.ca / 1e6),
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#E31C23',
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'Offres',
            data: evolution.map(e => e.offres),
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#7C3AED',
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#7C3AED',
            tension: 0.35,
            pointRadius: 3,
            yAxisID: 'y1',
          },
          {
            type: 'line',
            label: 'BC',
            data: evolution.map(e => e.bc),
            borderColor: '#059669',
            backgroundColor: '#059669',
            tension: 0.35,
            pointRadius: 3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11, weight: '500' }, color: '#64748B' } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
          y: {
            beginAtZero: true,
            position: 'left',
            grid: { color: '#F1F5F9' },
            ticks: { font: { size: 11 }, color: '#94A3B8', callback: v => v + 'M' },
            title: { display: true, text: 'CA (M FCFA)', font: { size: 10 }, color: '#94A3B8' },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 11 }, color: '#94A3B8', precision: 0 },
            title: { display: true, text: 'Volume', font: { size: 10 }, color: '#94A3B8' },
          },
        },
      },
    });
  }
};
// Marexsoft Corporation
