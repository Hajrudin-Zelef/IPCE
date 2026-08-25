function analyzeInsights(users, totals) {
  const sorted = [...users].sort((a, b) => b.ca - a.ca);
  const leader = sorted[0];
  const last = sorted[sorted.length - 1];
  const opportunities = [];
  const attentions = [];
  const forecasts = [];

  const convRdvOffre = totals.rdvCount > 0
    ? ((totals.offres / totals.rdvCount) * 100).toFixed(0)
    : 0;
  const convOffreBc = totals.offres > 0
    ? ((totals.bc / totals.offres) * 100).toFixed(0)
    : 0;
  const caPct = ((totals.ca / 1e8) * 100).toFixed(0);

  if (leader) {
    const leaderConv = leader.rdvCount > 0
      ? ((leader.offres / leader.rdvCount) * 100).toFixed(0)
      : 0;
    if (leaderConv > 50) {
      opportunities.push(`Le taux de conversion de ${leader.nom} est superieur a 50% — a capitaliser.`);
    }
  }

  if (convOffreBc >= 50) {
    opportunities.push(`Bon taux de fermeture Offre → BC : ${convOffreBc}%.`);
  }

  if (totals.ca >= 7e7) {
    forecasts.push(`Objectif mensuel atteignable a ${caPct}%.`);
  } else {
    forecasts.push(`Objectif mensuel a ${caPct}%. Effort requis pour atteindre 100M.`);
  }

  if (convRdvOffre > 0) {
    forecasts.push(`Conversion RDV → Offre stable a ${convRdvOffre}%.`);
  }

  if (last && last.ca < 7e7) {
    attentions.push(`${last.nom} en dessous de l'objectif CA (${(last.ca / 1e6).toFixed(1)}M).`);
  }

  if (totals.offres < 4) {
    attentions.push(`Offres insuffisantes (${totals.offres}/6 objectif).`);
  }

  if (totals.bc < 4) {
    attentions.push(`BC signes faibles (${totals.bc}/6 objectif).`);
  }

  if (leader && last && leader.ca - last.ca > 4e6) {
    attentions.push(`Ecart important entre ${leader.nom} et ${last.nom}.`);
  }

  if (opportunities.length === 0) opportunities.push('Analyse en cours...');
  if (attentions.length === 0) attentions.push('Aucune alerte pour le moment.');
  if (forecasts.length === 0) forecasts.push('Donnees insuffisantes pour les previsions.');

  return { opportunities, attentions, forecasts };
}

function renderInsightCard(type, items) {
  const config = {
    opportunity: { icon: '🟢', label: 'Opportunites', cls: 'opportunity' },
    attention: { icon: '🟠', label: 'Attention', cls: 'attention' },
    forecast: { icon: '🔵', label: 'Previsions', cls: 'forecast' },
  };
  const cfg = config[type];

  return `
    <div class="insight-card ${cfg.cls} animate-fade-in-up delay-${type === 'opportunity' ? 1 : type === 'attention' ? 2 : 3}">
      <div class="insight-icon">${cfg.icon}</div>
      <div class="insight-label">${cfg.label}</div>
      <div class="insight-text">${items.join('<br>')}</div>
    </div>
  `;
}

export function renderInsights(users, totals) {
  const container = document.getElementById('section-insights-content');
  if (!container) return;

  const { opportunities, attentions, forecasts } = analyzeInsights(users, totals);

  container.innerHTML = `
    <div class="insights-grid">
      ${renderInsightCard('opportunity', opportunities)}
      ${renderInsightCard('attention', attentions)}
      ${renderInsightCard('forecast', forecasts)}
    </div>
  `;
}

window.__load_insights = function () {
  if (window.__chartsData) {
    renderInsights(window.__chartsData.users, window.__chartsData.totals);
  }
};
