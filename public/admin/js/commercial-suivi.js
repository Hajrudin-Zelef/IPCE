let csView = localStorage.getItem('cs_view') || 'grid';

window.__load_commercial_suivi = async function() {
  const data = await loadSectionData('/api/admin/stats');
  if (!data) return renderEmpty('section-commercial-suivi-content', 'Erreur de chargement');

  const el = document.getElementById('section-commercial-suivi-content');
  const sorted = [...data.users].sort((a, b) => b.ca - a.ca);
  const colors = ['#E31C23', '#7C3AED', '#059669', '#F59E0B', '#EF4444', '#EC4899'];

  // Barre d'outils
  let toolbar = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
  toolbar += '<div style="font-size:13px;color:var(--muted);font-weight:600;">' + sorted.length + ' commercial' + (sorted.length > 1 ? 's' : '') + '</div>';
  toolbar += '<div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;">';
  toolbar += '<button onclick="CSView.setView(\'grid\')" style="padding:4px 10px;border:none;background:' + (csView === 'grid' ? 'var(--primary)' : 'var(--card)') + ';color:' + (csView === 'grid' ? '#fff' : 'var(--text)') + ';cursor:pointer;font-size:12px;font-family:inherit;border-right:1px solid var(--border);" title="Grille">⊞</button>';
  toolbar += '<button onclick="CSView.setView(\'list\')" style="padding:4px 10px;border:none;background:' + (csView === 'list' ? 'var(--primary)' : 'var(--card)') + ';color:' + (csView === 'list' ? '#fff' : 'var(--text)') + ';cursor:pointer;font-size:12px;font-family:inherit;" title="Liste">☰</button>';
  toolbar += '</div></div>';

  // Graphique
  let content = '<div class="section-card" style="margin-bottom:16px;">'
    + '<div class="section-card-title">Pipeline empile par Commercial</div>'
    + '<div style="height:280px;"><canvas id="suivi-stacked"></canvas></div>'
    + '</div>';

  if (csView === 'grid') {
    content += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">';
    sorted.forEach((u, i) => {
      const convRdv = u.rdvCount > 0 ? ((u.offres / u.rdvCount) * 100).toFixed(0) : 0;
      const convOffre = u.offres > 0 ? ((u.bc / u.offres) * 100).toFixed(0) : 0;
      const pct = data.totals.ca > 0 ? ((u.ca / data.totals.ca) * 100).toFixed(1) : 0;
      content += '<div class="section-card" style="border-top:3px solid ' + colors[i % colors.length] + ';padding:14px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
        + '<div style="font-weight:700;font-size:14px;color:var(--text);">' + escapeHtml(u.nom) + '</div>'
        + '<div style="font-size:10px;padding:2px 8px;border-radius:10px;background:' + colors[i % colors.length] + '15;color:' + colors[i % colors.length] + ';font-weight:600;">' + pct + '% du CA</div>'
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">'
        + '<div style="padding:6px;background:var(--bg);border-radius:6px;"><div style="color:var(--muted);font-size:9px;text-transform:uppercase;">CA</div><div style="font-weight:700;color:var(--text);">' + formatCA(u.ca) + '</div></div>'
        + '<div style="padding:6px;background:var(--bg);border-radius:6px;"><div style="color:var(--muted);font-size:9px;text-transform:uppercase;">RDV</div><div style="font-weight:700;color:var(--text);">' + u.rdvCount + '</div></div>'
        + '<div style="padding:6px;background:var(--bg);border-radius:6px;"><div style="color:var(--muted);font-size:9px;text-transform:uppercase;">Offres</div><div style="font-weight:700;color:var(--text);">' + u.offres + '</div></div>'
        + '<div style="padding:6px;background:var(--bg);border-radius:6px;"><div style="color:var(--muted);font-size:9px;text-transform:uppercase;">BC</div><div style="font-weight:700;color:var(--text);">' + u.bc + '</div></div>'
        + '</div>'
        + '<div style="margin-top:8px;display:flex;gap:6px;font-size:10px;">'
        + '<div style="flex:1;text-align:center;padding:4px;border-radius:6px;background:var(--primary-light);color:var(--primary);font-weight:600;">Conv RDV→Offre: ' + convRdv + '%</div>'
        + '<div style="flex:1;text-align:center;padding:4px;border-radius:6px;background:var(--success-light);color:var(--success);font-weight:600;">Conv Offre→BC: ' + convOffre + '%</div>'
        + '</div></div>';
    });
    content += '</div>';
  } else {
    content += '<div style="overflow-x:auto;border:1px solid var(--border-light);border-radius:var(--radius-lg);background:var(--card);">';
    content += '<table style="width:100%;border-collapse:collapse;">';
    content += '<thead><tr>';
    ['#', 'Commercial', 'CA', 'RDV', 'Offres', 'BC', 'Conv RDV→Offre', 'Conv Offre→BC', '% CA'].forEach(h => {
      const align = ['CA', 'RDV', 'Offres', 'BC'].includes(h) ? 'text-align:right;' : (h === '#' ? 'text-align:center;width:40px;' : '');
      content += '<th style="padding:10px 14px;font-size:12px;font-weight:600;color:var(--text);background:var(--bg);border-bottom:1px solid var(--border-light);' + align + '">' + h + '</th>';
    });
    content += '</tr></thead><tbody>';
    sorted.forEach((u, i) => {
      const convRdv = u.rdvCount > 0 ? ((u.offres / u.rdvCount) * 100).toFixed(0) : 0;
      const convOffre = u.offres > 0 ? ((u.bc / u.offres) * 100).toFixed(0) : 0;
      const pct = data.totals.ca > 0 ? ((u.ca / data.totals.ca) * 100).toFixed(1) : 0;
      content += '<tr style="border-bottom:1px solid var(--border-light);" onmouseenter="this.style.background=\'rgba(37,99,235,0.04)\'" onmouseleave="this.style.background=\'\'">';
      content += '<td style="padding:10px 14px;font-size:12px;color:var(--muted);text-align:center;">' + (i + 1) + '</td>';
      content += '<td style="padding:10px 14px;font-size:13px;font-weight:600;color:var(--text);">' + escapeHtml(u.nom) + '</td>';
      content += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);font-variant-numeric:tabular-nums;">' + formatCA(u.ca) + '</td>';
      content += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);">' + u.rdvCount + '</td>';
      content += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);">' + u.offres + '</td>';
      content += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);">' + u.bc + '</td>';
      content += '<td style="padding:10px 14px;font-size:12px;text-align:center;"><span style="background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:5px;font-weight:600;">' + convRdv + '%</span></td>';
      content += '<td style="padding:10px 14px;font-size:12px;text-align:center;"><span style="background:var(--success-light);color:var(--success);padding:2px 8px;border-radius:5px;font-weight:600;">' + convOffre + '%</span></td>';
      content += '<td style="padding:10px 14px;font-size:12px;text-align:center;"><span style="font-weight:700;color:var(--text);">' + pct + '%</span></td>';
      content += '</tr>';
    });
    content += '</tbody></table></div>';
  }

  el.innerHTML = toolbar + content;

  // Stacked bar pipeline
  const stackedCtx = document.getElementById('suivi-stacked');
  if (stackedCtx) {
    new Chart(stackedCtx, {
      type: 'bar',
      data: {
        labels: sorted.map(u => u.nom),
        datasets: [
          { label: 'RDV', data: sorted.map(u => u.rdvCount), backgroundColor: '#7C3AED', borderRadius: 4 },
          { label: 'Offres', data: sorted.map(u => u.offres), backgroundColor: '#E31C23', borderRadius: 4 },
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

window.CSView = {
  setView(view) {
    csView = view;
    localStorage.setItem('cs_view', view);
    window.__load_commercial_suivi();
  }
};
