function analyzeInsights(users, totals, settings) {
  const sorted = [...users].sort((a, b) => b.ca - a.ca);
  const leader = sorted[0];
  const last = sorted[sorted.length - 1];
  const avgCA = users.length > 0 ? totals.ca / users.length : 0;

  function gk(key, fb) { return parseFloat(settings[key]) || fb; }
  const caObj = gk('ca_objectif', 1e8);
  const offresObj = gk('offres_objectif', 6);
  const bcObj = gk('bc_objectif', 6);
  const rdvObj = gk('rdv_objectif', 6);

  const pctCA = caObj > 0 ? (totals.ca / caObj) * 100 : 0;
  const pctOffres = offresObj > 0 ? (totals.offres / offresObj) * 100 : 0;
  const pctBC = bcObj > 0 ? (totals.bc / bcObj) * 100 : 0;
  const pctRDV = rdvObj > 0 ? (totals.rdvCount / rdvObj) * 100 : 0;

  const convRdvOffre = totals.rdvCount > 0 ? ((totals.offres / totals.rdvCount) * 100) : 0;
  const convOffreBc = totals.offres > 0 ? ((totals.bc / totals.offres) * 100) : 0;

  // Health Score (0-100)
  const healthScore = Math.min(100, Math.round(
    (pctCA * 0.35) + (pctOffres * 0.2) + (pctBC * 0.25) + (pctRDV * 0.2)
  ));

  // --- Opportunities ---
  const opportunities = [];
  if (leader) {
    const leaderConv = leader.rdvCount > 0 ? ((leader.offres / leader.rdvCount) * 100) : 0;
    if (leaderConv > 50) {
      opportunities.push({ text: `<strong>${leader.nom}</strong> affiche un taux de conversion RDV→Offre de <span class="highlight">${leaderConv.toFixed(0)}%</span> — un modèle à reproduire.`, priority: 'low' });
    }
  }
  if (convOffreBc >= 50) {
    opportunities.push({ text: `Le taux de fermeture <strong>Offre→BC</strong> est de <span class="highlight">${convOffreBc.toFixed(0)}%</span> — au-dessus du seuil de 50%.`, priority: 'low' });
  }
  if (pctCA >= 70) {
    opportunities.push({ text: `L'objectif CA est atteint à <span class="highlight">${pctCA.toFixed(0)}%</span> — trajectoire favorable pour la fin de mois.`, priority: 'low' });
  }
  if (users.length >= 2) {
    const top2 = sorted.slice(0, 2);
    const gap = top2[0].ca - top2[1].ca;
    if (gap < avgCA * 0.3 && top2[0].ca > 0) {
      opportunities.push({ text: `<strong>${top2[0].nom}</strong> et <strong>${top2[1].nom}</strong> sont au coude à coude (<span class="highlight">${formatCA(gap)} decart</span>) — compétition saine.`, priority: 'low' });
    }
  }
  if (opportunities.length === 0) opportunities.push({ text: 'Collectez plus de données pour identifier des opportunités.', priority: 'low' });

  // --- Attention ---
  const attentions = [];
  if (last && last.ca < caObj * 0.5) {
    attentions.push({ text: `<strong>${last.nom}</strong> est à <span class="highlight">${formatCA(last.ca)}</span> soit ${((last.ca / caObj) * 100).toFixed(0)}% de l'objectif CA — un accompagnement renforcé est nécessaire.`, priority: 'high' });
  }
  if (pctOffres < 50) {
    attentions.push({ text: `Le volume d'offres (<span class="highlight">${totals.offres}/${offresObj}</span>) est insuffisant — risque de ne pas atteindre l'objectif BC.`, priority: 'high' });
  }
  if (pctBC < 50) {
    attentions.push({ text: `Les BC signés (<span class="highlight">${totals.bc}/${bcObj}</span>) sont faibles — analyser les raisons des échecs de fermeture.`, priority: 'high' });
  }
  if (leader && last && leader.ca - last.ca > avgCA) {
    attentions.push({ text: `L'écart de performance entre <strong>${leader.nom}</strong> et <strong>${last.nom}</strong> est de <span class="highlight">${formatCA(leader.ca - last.ca)}</span> — risque de déséquilibre d'équipe.`, priority: 'medium' });
  }
  if (convRdvOffre < 30 && totals.rdvCount > 0) {
    attentions.push({ text: `Le taux RDV→Offre est de <span class="highlight">${convRdvOffre.toFixed(0)}%</span> — les RDV ne se convertissent pas assez en offres.`, priority: 'medium' });
  }
  if (attentions.length === 0) attentions.push({ text: 'Aucune alerte critique détectée. Continuez sur cette lancée.', priority: 'low' });

  // --- Forecasts ---
  const forecasts = [];
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedCA = dayOfMonth > 0 ? (totals.ca / dayOfMonth) * daysInMonth : 0;
  const projPct = caObj > 0 ? (projectedCA / caObj) * 100 : 0;

  if (projPct >= 100) {
    forecasts.push({ text: `Projection fin de mois : <span class="highlight">${formatCA(projectedCA)}</span> FCFA — objectif atteint (${projPct.toFixed(0)}%).`, priority: 'low' });
  } else if (projPct >= 70) {
    forecasts.push({ text: `Projection fin de mois : <span class="highlight">${formatCA(projectedCA)}</span> FCFA — à ${100 - projPct.toFixed(0)}% de l'objectif.`, priority: 'medium' });
  } else {
    forecasts.push({ text: `Projection fin de mois : <span class="highlight">${formatCA(projectedCA)}</span> FCFA — objectif en danger (${projPct.toFixed(0)}%).`, priority: 'high' });
  }
  if (convOffreBc > 0) {
    const projectedBC = Math.round((totals.offres / dayOfMonth) * daysInMonth * (convOffreBc / 100));
    forecasts.push({ text: `BC projetés fin de mois : <span class="highlight">${projectedBC}</span> (objectif : ${bcObj}).`, priority: projectedBC >= bcObj ? 'low' : 'medium' });
  }
  if (totals.rdvCount > 0) {
    const projectedOffres = Math.round((totals.rdvCount / dayOfMonth) * daysInMonth * (convRdvOffre / 100));
    forecasts.push({ text: `Offres projetées fin de mois : <span class="highlight">${projectedOffres}</span> (objectif : ${offresObj}).`, priority: projectedOffres >= offresObj ? 'low' : 'medium' });
  }
  if (forecasts.length === 0) forecasts.push({ text: 'Données insuffisantes pour les prévisions.', priority: 'low' });

  // --- Action Items ---
  const actions = [];
  if (pctCA < 50 && dayOfMonth > daysInMonth * 0.4) {
    actions.push({ text: `<strong>Urgence CA :</strong> à ${pctCA.toFixed(0)}% de l'objectif à ${dayOfMonth}/${daysInMonth}. Planifier des actions commerciales intensives.`, priority: 'high' });
  }
  if (convRdvOffre < 40 && totals.rdvCount > 3) {
    actions.push({ text: `<strong>Améliorer la conversion RDV→Offre :</strong> ${convRdvOffre.toFixed(0)}%. Revoir la qualité des RDV et le processus de proposition.`, priority: 'high' });
  }
  if (convOffreBc < 40 && totals.offres > 2) {
    actions.push({ text: `<strong>Renforcer la fermeture :</strong> ${convOffreBc.toFixed(0)}%. Accompagner les commerciaux sur les négociations finales.`, priority: 'medium' });
  }
  if (leader && last && leader.ca > last.ca * 2 && last.ca > 0) {
    actions.push({ text: `<strong>Mentorat :</strong> ${last.nom} génère 2x moins que ${leader.nom}. Mettre en place un plan de formation.`, priority: 'medium' });
  }
  if (pctOffres < 60) {
    actions.push({ text: `<strong>Stimuler les offres :</strong> ${totals.offres}/${offresObj}. Organiser une session de prospection collective.`, priority: 'low' });
  }
  if (actions.length === 0) actions.push({ text: 'Aucune action priornaire pour le moment. Maintenir la dynamique.', priority: 'low' });

  return { opportunities, attentions, forecasts, actions, healthScore, pctCA, pctOffres, pctBC, pctRDV };
}

function renderInsightCard(type, items) {
  const icons = {
    opportunity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    attention: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    forecast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  };
  const labels = { opportunity: 'Opportunités', attention: 'Points d\'attention', forecast: 'Prévisions' };

  return `
    <div class="insight-card ${type}">
      <div class="insight-card-header">
        <div class="insight-icon">${icons[type]}</div>
        <div class="insight-label">${labels[type]}</div>
        <span class="insight-card-count">${items.length}</span>
      </div>
      <div class="insight-card-body">
        ${items.map(item => `
          <div class="insight-item">
            <div class="insight-item-dot"></div>
            <div class="insight-item-text">${item.text}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderGauge(pct, cls) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  return `
    <div class="insights-gauge">
      <svg viewBox="0 0 100 100">
        <circle class="insights-gauge-bg" cx="50" cy="50" r="${radius}"/>
        <circle class="insights-gauge-fill ${cls}" cx="50" cy="50" r="${radius}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
      </svg>
      <div class="insights-gauge-label">
        <div class="insights-gauge-value">${Math.round(pct)}</div>
        <div class="insights-gauge-text">santé</div>
      </div>
    </div>
  `;
}

function renderProgressBar(pct, label, value, cls) {
  return `
    <div class="insight-metric-bar">
      <div class="insight-metric-bar-header">
        <span class="insight-metric-bar-label">${label}</span>
        <span class="insight-metric-bar-value">${value}</span>
      </div>
      <div class="insight-metric-bar-track">
        <div class="insight-metric-bar-fill ${cls}" style="width:${Math.min(pct, 100)}%"></div>
      </div>
    </div>
  `;
}

export function renderInsights(users, totals, settings) {
  const container = document.getElementById('section-insights-content');
  if (!container) return;

  const { opportunities, attentions, forecasts, actions, healthScore, pctCA, pctOffres, pctBC, pctRDV } = analyzeInsights(users, totals, settings);

  const gaugeClass = healthScore >= 70 ? 'success' : healthScore >= 40 ? 'warning' : 'danger';
  const healthMsg = healthScore >= 70
    ? 'La performance commerciale est globalement satisfaisante.'
    : healthScore >= 40
    ? 'Des axes d\'amélioration identifiés nécessitent une attention.'
    : 'La performance est critique — des actions correctives urgentes sont requises.';

  function gk(key, fb) { return parseFloat(settings[key]) || fb; }

  container.innerHTML = `
    <!-- Health Score Banner -->
    <div class="insights-health">
      ${renderGauge(healthScore, gaugeClass)}
      <div class="insights-health-info">
        <div class="insights-health-title">Score de Santé Commerciale</div>
        <div class="insights-health-subtitle">${healthMsg}</div>
        <div class="insights-health-stats">
          <div class="insights-health-stat">
            <span class="insights-health-stat-value">${formatCA(totals.ca)}</span>
            <span class="insights-health-stat-label">CA Total</span>
          </div>
          <div class="insights-health-stat">
            <span class="insights-health-stat-value">${totals.offres}/${gk('offres_objectif', 6)}</span>
            <span class="insights-health-stat-label">Offres</span>
          </div>
          <div class="insights-health-stat">
            <span class="insights-health-stat-value">${totals.bc}/${gk('bc_objectif', 6)}</span>
            <span class="insights-health-stat-label">BC</span>
          </div>
          <div class="insights-health-stat">
            <span class="insights-health-stat-value">${totals.rdvCount}/${gk('rdv_objectif', 6)}</span>
            <span class="insights-health-stat-label">RDV</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Bars -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      <div style="background:var(--card);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:14px 16px">
        ${renderProgressBar(pctCA, 'CA', pctCA.toFixed(0) + '%', pctCA >= 70 ? 'success' : pctCA >= 40 ? 'warning' : 'danger')}
      </div>
      <div style="background:var(--card);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:14px 16px">
        ${renderProgressBar(pctOffres, 'Offres', pctOffres.toFixed(0) + '%', pctOffres >= 70 ? 'success' : pctOffres >= 40 ? 'warning' : 'danger')}
      </div>
      <div style="background:var(--card);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:14px 16px">
        ${renderProgressBar(pctBC, 'BC', pctBC.toFixed(0) + '%', pctBC >= 70 ? 'success' : pctBC >= 40 ? 'warning' : 'danger')}
      </div>
      <div style="background:var(--card);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:14px 16px">
        ${renderProgressBar(pctRDV, 'RDV', pctRDV.toFixed(0) + '%', pctRDV >= 70 ? 'success' : pctRDV >= 40 ? 'warning' : 'danger')}
      </div>
    </div>

    <!-- Insight Cards -->
    <div class="insights-grid">
      ${renderInsightCard('opportunity', opportunities)}
      ${renderInsightCard('attention', attentions)}
      ${renderInsightCard('forecast', forecasts)}
    </div>

    <!-- Action Items -->
    <div class="insights-actions">
      <div class="insights-actions-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
        <div class="insights-actions-title">Actions Recommandées</div>
      </div>
      <div class="insights-actions-list">
        ${actions.map(a => `
          <div class="insights-action-item">
            <div class="insights-action-priority ${a.priority}"></div>
            <div class="insights-action-text">${a.text}</div>
            <span class="insights-action-badge ${a.priority}">${a.priority === 'high' ? 'Urgent' : a.priority === 'medium' ? 'Moyen' : 'Normal'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

window.__load_insights = function () {
  if (window.__chartsData) {
    const settings = window.__chartsData.settings || {};
    renderInsights(window.__chartsData.users, window.__chartsData.totals, settings);
  }
};
