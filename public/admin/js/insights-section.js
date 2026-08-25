window.__load_insights = async function() {
  const data = await loadSectionData('/api/admin/stats');
  if (!data) return renderEmpty('section-insights-content', 'Erreur de chargement');

  const el = document.getElementById('section-insights-content');
  const t = data.totals;
  const insights = [];

  if (t.rdvCount > 0 && t.offres / t.rdvCount > 0.5) {
    insights.push({ type: 'success', icon: '📈', title: 'Taux de conversion élevé', text: `Conversion RDV→Offre à ${((t.offres/t.rdvCount)*100).toFixed(0)}% — excellent performance.` });
  }
  if (t.offres > 0 && t.bc / t.offres < 0.5) {
    insights.push({ type: 'warning', icon: '⚠️', title: 'Conversion Offre→BC faible', text: `Seulement ${((t.bc/t.offres)*100).toFixed(0)}% des offres deviennent des BC. À améliorer.` });
  }
  if (t.ca < 70000000) {
    insights.push({ type: 'danger', icon: '🔴', title: 'CA sous objectif', text: `CA à ${(t.ca/1e6).toFixed(1)}M sur un objectif de 100M. Action requise.` });
  }

  const best = data.users.reduce((a, b) => a.ca > b.ca ? a : b, data.users[0]);
  if (best) {
    insights.push({ type: 'info', icon: '🏆', title: 'Top Performer', text: `${best.nom} mène avec ${formatCA(best.ca)} FCFA de CA.` });
  }

  el.innerHTML = `
    <div class="section-grid section-grid-3" style="margin-bottom:24px">
      ${insights.map(i => `
        <div class="section-card" style="border-left:4px solid var(--${i.type === 'success' ? 'success' : i.type === 'warning' ? 'warning' : i.type === 'danger' ? 'danger' : 'primary'})">
          <div style="font-size:24px;margin-bottom:8px">${i.icon}</div>
          <div style="font-weight:700;margin-bottom:4px">${i.title}</div>
          <div style="font-size:13px;color:var(--text-secondary)">${i.text}</div>
        </div>
      `).join('')}
    </div>
    <div class="section-card">
      <h3 style="margin:0 0 16px;font-size:16px;font-weight:700">Prévisions</h3>
      <div style="font-size:14px;color:var(--text-secondary)">
        <p>CA actuel : <strong>${formatCA(t.ca)} FCFA</strong></p>
        <p>Objectif : <strong>100M FCFA</strong></p>
        <p>Atteinte : <strong>${((t.ca / 100000000) * 100).toFixed(0)}%</strong></p>
        <div class="performance-bar" style="margin-top:12px;height:12px">
          <div class="performance-bar-fill ${t.ca >= 100000000 ? 'excellent' : t.ca >= 70000000 ? 'good' : 'warning'}" style="width:${Math.min((t.ca / 100000000) * 100, 100)}%"></div>
        </div>
      </div>
    </div>
  `;
};
