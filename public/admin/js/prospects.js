window.__load_prospects = async function() {
  const rdvs = await loadSectionData('/api/admin/rdvs');
  if (!rdvs) return renderEmpty('section-prospects-content', 'Erreur de chargement');

  const el = document.getElementById('section-prospects-content');
  const stages = ['Prévu', 'Confirmé', 'Terminé', 'Offre', 'BC'];
  const stageMap = { 'Prévu': 0, 'Confirmé': 1, 'Terminé': 2, 'Offre': 3, 'BC': 4 };

  el.innerHTML = `
    <div class="section-filters">
      <button class="section-filter active" onclick="window.__filterProspects('all', this)">Tous (${rdvs.length})</button>
      ${stages.map(s => {
        const count = rdvs.filter(r => r.statut === s).length;
        return `<button class="section-filter" onclick="window.__filterProspects('${s}', this)">${s} (${count})</button>`;
      }).join('')}
    </div>
    <div class="section-grid section-grid-3" id="prospects-grid">
      ${rdvs.map(r => {
        const idx = stageMap[r.statut] || 0;
        const statusClass = r.statut === 'BC' ? 'bc' : r.statut === 'Offre' ? 'offre' : 'rdv';
        return `
          <div class="prospect-card" data-statut="${r.statut}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <strong>${r.prospect}</strong>
              <span class="prospect-status ${statusClass}">${r.statut}</span>
            </div>
            <div style="font-size:13px;color:var(--muted);margin-bottom:4px">${r.commercial}</div>
            <div style="font-size:14px;font-weight:600;color:var(--text)">${formatCA(r.montant)} FCFA</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px">${formatDate(r.date)}</div>
            <div class="prospect-pipeline">
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
  document.querySelectorAll('.prospect-card').forEach(card => {
    if (statut === 'all' || card.dataset.statut === statut) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
};
