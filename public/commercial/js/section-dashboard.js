/* ========================================
   SECTION — Dashboard (Vue d'ensemble)
   ======================================== */

window.__load_dashboard = function() {
  var el = document.getElementById('section-dashboard-content');
  if (!el) return;
  el.innerHTML = '<div class="loading">Chargement...</div>';

  api('GET', '/api/collectes').then(function(res) {
    if (res.status === 401) { window.location.href = '/'; return; }
    return res.json();
  }).then(function(collectes) {
    if (!collectes) return;
    var totalCA = collectes.reduce(function(s, c) { return s + (c.ca || 0); }, 0);
    var totalOffres = collectes.reduce(function(s, c) { return s + (c.offres || 0); }, 0);
    var totalBC = collectes.reduce(function(s, c) { return s + (c.bc || 0); }, 0);
    var totalRDV = collectes.reduce(function(s, c) { return s + (c.rdvs ? c.rdvs.length : 0); }, 0);
    var brouillons = collectes.filter(function(c) { return c.statut === 'brouillon'; }).length;
    var last3 = collectes.slice(0, 3);

    var html = '';

    // KPIs
    html += '<div class="dash-kpis">';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + (totalCA / 1e6).toFixed(1) + 'M</div><div class="dash-kpi-label">CA Total</div></div>';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + totalOffres + '</div><div class="dash-kpi-label">Offres</div></div>';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + totalBC + '</div><div class="dash-kpi-label">BC Signés</div></div>';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + totalRDV + '</div><div class="dash-kpi-label">RDV</div></div>';
    html += '</div>';

    // Quick actions
    html += '<div class="dash-actions">';
    html += '<button class="btn btn-primary" onclick="switchSection(\'collecte\')">&#9998; Saisir une collecte</button>';
    html += '<button class="btn btn-sm" style="background:var(--border);" onclick="switchSection(\'history\')">Voir l\'historique</button>';
    html += '<button class="btn btn-sm" style="background:var(--border);" onclick="switchSection(\'calendar\')">Calendrier</button>';
    html += '</div>';

    // Dernières collectes
    if (last3.length > 0) {
      html += '<div class="dash-section-title">Dernières collectes</div>';
      html += '<div class="dash-collectes">';
      last3.forEach(function(c) {
        var statusColors = {
          'brouillon': 'var(--status-brouillon-bg);color:var(--status-brouillon-text)',
          'validee': 'var(--status-validee-bg);color:var(--status-validee-text)',
          'approuvee': 'var(--status-approuvee-bg);color:var(--status-approuvee-text)',
          'rejetee': 'var(--status-rejetee-bg);color:var(--status-rejetee-text)',
        };
        var style = statusColors[c.statut] || '';
        html += '<div class="dash-collecte-item">';
        html += '<div><strong>' + (c.ca / 1e6).toFixed(1) + 'M FCFA</strong> — ' + c.offres + ' offres — ' + c.bc + ' BC</div>';
        html += '<span class="cal-day-rdv-statut" style="' + style + '">' + c.statut + '</span>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="dash-empty">Aucune collecte pour le moment. Commencez par en saisir une !</div>';
    }

    el.innerHTML = html;
  }).catch(function() {
    el.innerHTML = '<div class="dash-empty">Erreur de chargement</div>';
  });
};
