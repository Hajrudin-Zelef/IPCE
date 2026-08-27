// Marexsoft Corporation
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
    var totalVisites = collectes.reduce(function(s, c) { return s + (c.visites || 0); }, 0);
    var totalContacts = collectes.reduce(function(s, c) { return s + (c.contacts || 0); }, 0);
    var last3 = collectes.slice(0, 3);

    var html = '';

    // KPIs
    html += '<div class="dash-kpis">';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + (totalCA / 1e6).toFixed(1) + 'M</div><div class="dash-kpi-label">CA Total</div></div>';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + totalOffres + '</div><div class="dash-kpi-label">Offres</div></div>';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + totalBC + '</div><div class="dash-kpi-label">BC Signés</div></div>';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + totalRDV + '</div><div class="dash-kpi-label">RDV</div></div>';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + totalVisites + '</div><div class="dash-kpi-label">Visites</div></div>';
    html += '<div class="dash-kpi"><div class="dash-kpi-value">' + totalContacts + '</div><div class="dash-kpi-label">Contacts</div></div>';
    html += '</div>';

    // Quick actions
    html += '<div class="dash-actions">';
    html += '<button class="btn btn-primary" onclick="switchSection(\'collecte\')">&#9998; Saisir une collecte</button>';
    html += '<button class="btn btn-sm" style="background:var(--border);" onclick="switchSection(\'history\')">Voir l\'historique</button>';
    html += '<button class="btn btn-sm" style="background:var(--border);" onclick="switchSection(\'calendar\')">Calendrier</button>';
    html += '</div>';

    // Mini charts
    html += '<div class="dash-charts-row">';
    html += '<div class="dash-chart-box"><canvas id="dash-ch-ca"></canvas></div>';
    html += '<div class="dash-chart-box"><canvas id="dash-ch-offres"></canvas></div>';
    html += '<div class="dash-chart-box"><canvas id="dash-ch-bc"></canvas></div>';
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
// Marexsoft Corporation
        };
        var style = statusColors[c.statut] || '';
        html += '<div class="dash-collecte-item">';
        html += '<div><strong>' + (c.ca / 1e6).toFixed(1) + 'M FCFA</strong> — ' + c.offres + ' offres — ' + c.bc + ' BC — ' + (c.visites || 0) + ' vis. — ' + (c.contacts || 0) + ' contacts</div>';
        html += '<span class="cal-day-rdv-statut" style="' + style + '">' + escapeHtml(c.statut) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="dash-empty">Aucune collecte pour le moment. Commencez par en saisir une !</div>';
    }

    el.innerHTML = html;

    // Render mini charts after DOM update
    setTimeout(function() { renderDashMiniCharts(collectes); }, 100);
  }).catch(function() {
    el.innerHTML = '<div class="dash-empty">Erreur de chargement</div>';
  });
};

function renderDashMiniCharts(collectes) {
  if (!collectes || collectes.length === 0) return;

  var labels = collectes.map(function(c) { return new Date(c.created_at).toLocaleDateString('fr-FR'); });
  var caData = collectes.map(function(c) { return c.ca / 1e6; });
  var totalOffres = collectes.reduce(function(s, c) { return s + (c.offres || 0); }, 0);
  var totalBC = collectes.reduce(function(s, c) { return s + (c.bc || 0); }, 0);

  // CA mini line
  var elCA = document.getElementById('dash-ch-ca');
  if (elCA) {
    new Chart(elCA, {
      type: 'line',
      data: { labels: labels, datasets: [{ label: 'CA (M)', data: caData, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800 }, plugins: { title: { display: true, text: 'CA (M FCFA)', font: { size: 12 } }, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 9 } } } } }
    });
  }

  // Offres mini donut
  var elOffres = document.getElementById('dash-ch-offres');
  if (elOffres) {
    new Chart(elOffres, {
      type: 'doughnut',
      data: { labels: ['Offres', 'Reste'], datasets: [{ data: [totalOffres, Math.max(0, totalOffres * 0.3)], backgroundColor: ['rgba(118,75,162,0.85)', 'rgba(200,200,200,0.2)'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', animation: { animateRotate: true, duration: 1000 }, plugins: { title: { display: true, text: 'Offres: ' + totalOffres, font: { size: 12 } }, legend: { display: false } } }
    });
  }

  // BC mini donut
  var elBC = document.getElementById('dash-ch-bc');
  if (elBC) {
    new Chart(elBC, {
      type: 'doughnut',
      data: { labels: ['BC', 'Reste'], datasets: [{ data: [totalBC, Math.max(0, totalBC * 0.3)], backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(200,200,200,0.2)'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', animation: { animateRotate: true, duration: 1000 }, plugins: { title: { display: true, text: 'BC: ' + totalBC, font: { size: 12 } }, legend: { display: false } } }
    });
  }
}
// Marexsoft Corporation
