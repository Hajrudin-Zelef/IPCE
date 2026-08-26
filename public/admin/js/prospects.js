window.__load_prospects = async function() {
  const rdvs = await loadSectionData('/api/admin/rdvs');
  if (!rdvs) return renderEmpty('section-prospects-content', 'Erreur de chargement');

  const el = document.getElementById('section-prospects-content');
  const stages = ['Prévu', 'Confirmé', 'Terminé', 'Offre', 'BC'];
  const stageMap = { 'Prévu': 0, 'Confirmé': 1, 'Terminé': 2, 'Offre': 3, 'BC': 4 };
  const stageLabels = ['Prévu', 'Confirmé', 'Terminé', 'Offre', 'BC Signé'];

  // --- KPI Calculations ---
  const totalMontant = rdvs.reduce((s, r) => s + (r.montant || 0), 0);
  const avgMontant = rdvs.length > 0 ? totalMontant / rdvs.length : 0;
  const bcCount = rdvs.filter(r => r.statut === 'BC').length;
  const convRate = rdvs.length > 0 ? ((bcCount / rdvs.length) * 100).toFixed(0) : 0;

  function getStageCount(s) { return rdvs.filter(r => r.statut === s).length; }

  function dateUrgency(dateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr + 'T00:00:00');
    const diff = Math.floor((d - today) / 86400000);
    if (diff < 0) return { cls: 'overdue', text: `Il y a ${Math.abs(diff)}j` };
    if (diff === 0) return { cls: 'today', text: "Aujourd'hui" };
    if (diff <= 3) return { cls: 'upcoming', text: `Dans ${diff}j` };
    return { cls: '', text: formatDate(dateStr) };
  }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  function renderPipeline(statut, withLabels) {
    const idx = stageMap[statut] || 0;
    let html = '<div class="prospect-pipeline">';
    stages.forEach((s, i) => {
      html += `<div class="prospect-pipeline-step ${i < idx ? 'done' : i === idx ? 'current' : ''}"></div>`;
    });
    html += '</div>';
    if (withLabels) {
      html += '<div class="prospect-pipeline-labels">';
      stageLabels.forEach((s, i) => {
        html += `<span class="prospect-pipeline-label ${i <= idx ? 'active' : ''}">${s}</span>`;
      });
      html += '</div>';
    }
    return html;
  }

  // --- Build HTML ---
  el.innerHTML = `
    <!-- KPI Bar -->
    <div class="prospects-kpi-bar">
      <div class="prospects-kpi kpi-total">
        <div class="prospects-kpi-label">Total Prospects</div>
        <div class="prospects-kpi-value">${rdvs.length}</div>
        <div class="prospects-kpi-sub">${rdvs.length === 1 ? 'prospect actif' : 'prospects actifs'}</div>
      </div>
      <div class="prospects-kpi kpi-val">
        <div class="prospects-kpi-label">Valeur Totale</div>
        <div class="prospects-kpi-value">${formatCA(totalMontant)}<span style="font-size:12px;font-weight:500;color:var(--muted);margin-left:2px">FCFA</span></div>
        <div class="prospects-kpi-sub">montant cumulé</div>
      </div>
      <div class="prospects-kpi kpi-avg">
        <div class="prospects-kpi-label">Ticket Moyen</div>
        <div class="prospects-kpi-value">${formatCA(avgMontant)}<span style="font-size:12px;font-weight:500;color:var(--muted);margin-left:2px">FCFA</span></div>
        <div class="prospects-kpi-sub">par prospect</div>
      </div>
      <div class="prospects-kpi kpi-conv">
        <div class="prospects-kpi-label">Taux Conversion</div>
        <div class="prospects-kpi-value">${convRate}%</div>
        <div class="prospects-kpi-sub">${bcCount} BC sur ${rdvs.length} RDV</div>
      </div>
    </div>

    <!-- Toolbar: Filters + View Toggle -->
    <div class="prospects-toolbar">
      <div class="section-filters" style="margin-bottom:0">
        <button class="section-filter active" onclick="window.__filterProspects('all', this)">Tous (${rdvs.length})</button>
        ${stages.map(s => {
          const count = getStageCount(s);
          return `<button class="section-filter" onclick="window.__filterProspects('${s}', this)">${s} (${count})</button>`;
        }).join('')}
      </div>
      <div class="prospects-view-toggle">
        <button class="prospects-view-btn active" onclick="window.__toggleProspectsView('grid', this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Grille
        </button>
        <button class="prospects-view-btn" onclick="window.__toggleProspectsView('list', this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Liste
        </button>
      </div>
    </div>

    <!-- Grid View -->
    <div class="prospects-grid" id="prospects-grid">
      ${rdvs.map(r => {
        const idx = stageMap[r.statut] || 0;
        const urg = dateUrgency(r.date);
        return `
          <div class="prospect-card" data-statut="${r.statut}">
            <div class="prospect-card-top">
              <div class="prospect-avatar s${idx}">${getInitials(r.prospect)}</div>
              <div class="prospect-card-info">
                <div class="prospect-card-name" title="${r.prospect}">${r.prospect}</div>
                <div class="prospect-card-commercial">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  ${r.commercial}
                </div>
              </div>
              <span class="prospect-status s${idx}"><span class="prospect-status-dot"></span>${r.statut}</span>
            </div>
            <div class="prospect-card-body">
              <div class="prospect-card-montant">${formatCA(r.montant)}<span>FCFA</span></div>
              <div class="prospect-card-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${urg.cls ? `<span class="prospect-date-urgency ${urg.cls}">${urg.text}</span>` : formatDate(r.date)}
              </div>
              ${renderPipeline(r.statut, false)}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- List View (hidden by default) -->
    <div class="prospects-list" id="prospects-list" style="display:none">
      <div class="prospects-list-header">
        <span>Prospect</span>
        <span>Commercial</span>
        <span>Montant</span>
        <span>Date</span>
        <span>Statut</span>
        <span>Pipeline</span>
      </div>
      ${rdvs.map(r => {
        const idx = stageMap[r.statut] || 0;
        const urg = dateUrgency(r.date);
        return `
          <div class="prospects-list-row" data-statut="${r.statut}">
            <span class="prospects-list-name">${r.prospect}</span>
            <span class="prospects-list-commercial">${r.commercial}</span>
            <span class="prospects-list-montant">${formatCA(r.montant)} FCFA</span>
            <span class="prospects-list-date">
              ${urg.cls ? `<span class="prospect-date-urgency ${urg.cls}">${urg.text}</span>` : formatDate(r.date)}
            </span>
            <span class="prospect-status s${idx}"><span class="prospect-status-dot"></span>${r.statut}</span>
            <div class="prospects-list-pipeline">
              ${stages.map((s, i) => `<div class="prospect-pipeline-step ${i < idx ? 'done' : i === idx ? 'current' : ''}"></div>`).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

window.__filterProspects = function(statut, btn) {
  document.querySelectorAll('.section-filters .section-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const selector = statut === 'all' ? '[data-statut]' : `[data-statut="${statut}"]`;
  const notSelector = statut === 'all' ? '.prospect-card,.prospect-list-row' : `.prospect-card:not([data-statut="${statut}"]),.prospect-list-row:not([data-statut="${statut}"])`;
  document.querySelectorAll('.prospect-card, .prospects-list-row').forEach(card => {
    if (statut === 'all' || card.dataset.statut === statut) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
};

window.__toggleProspectsView = function(view, btn) {
  document.querySelectorAll('.prospects-view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('prospects-grid').style.display = view === 'grid' ? '' : 'none';
  document.getElementById('prospects-list').style.display = view === 'list' ? '' : 'none';
};
