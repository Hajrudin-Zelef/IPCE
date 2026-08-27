/* ========================================
   DASHBOARD — Historique
   ======================================== */

let historyCollectes = [];
let editRdvs = [];

window.__load_history = function() {
  loadHistory();
};

async function loadHistory() {
  try {
    const res = await api('GET', '/api/collectes');
    if (res.status === 401) { window.location.href = '/'; return; }
    historyCollectes = await res.json();
    const body = document.getElementById('history-body');
    const empty = document.getElementById('empty-history');
    if (historyCollectes.length === 0) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = historyCollectes.map(c => {
      const isBrouillon = c.statut === 'brouillon';
      const actions = isBrouillon
        ? '<div class="action-btns">'
          + '<button class="action-btn action-btn-view" title="Voir" onclick="viewCollecte(' + c.id + ')">&#128065;</button>'
          + '<button class="action-btn action-btn-edit" title="Modifier" onclick="editCollecte(' + c.id + ')">&#9998;</button>'
          + '<button class="action-btn action-btn-delete" title="Supprimer" onclick="deleteCollecte(' + c.id + ')">&#10005;</button>'
          + '</div>'
        : '';
      return '<tr>'
        + '<td>' + new Date(c.created_at).toLocaleDateString('fr-FR') + '</td>'
        + '<td>' + (c.ca / 1e6).toFixed(1) + 'M</td>'
        + '<td>' + c.offres + '</td>'
        + '<td>' + c.bc + '</td>'
        + '<td>' + (c.rdvs ? c.rdvs.length : 0) + '</td>'
        + '<td>' + (c.visites || 0) + '</td>'
        + '<td>' + (c.contacts || 0) + '</td>'
        + '<td>' + (c.zone || '—') + '</td>'
        + '<td><span class="status status-' + c.statut + '">' + c.statut + '</span></td>'
        + '<td>' + actions + '</td>'
        + '</tr>';
    }).join('');
  } catch {}
}

function viewCollecte(id) {
  const c = historyCollectes.find(x => x.id === id);
  if (!c) return;

  document.getElementById('cal-collecte-title').textContent = 'Collecte du ' + new Date(c.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const statusColors = {
    'brouillon': 'var(--status-brouillon-bg);color:var(--status-brouillon-text)',
    'validee': 'var(--status-validee-bg);color:var(--status-validee-text)',
    'approuvee': 'var(--status-approuvee-bg);color:var(--status-approuvee-text)',
    'rejetee': 'var(--status-rejetee-bg);color:var(--status-rejetee-text)',
  };
  const style = statusColors[c.statut] || '';

  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">';
  html += '<div class="cal-modal-field"><label>CA</label><span>' + (c.ca / 1e6).toFixed(1) + ' M FCFA</span></div>';
  html += '<div class="cal-modal-field"><label>Offres</label><span>' + c.offres + '</span></div>';
  html += '<div class="cal-modal-field"><label>BC</label><span>' + c.bc + '</span></div>';
  html += '<div class="cal-modal-field"><label>Visites</label><span>' + (c.visites || 0) + '</span></div>';
  html += '<div class="cal-modal-field"><label>Contacts</label><span>' + (c.contacts || 0) + '</span></div>';
  html += '<div class="cal-modal-field"><label>Zone</label><span>' + (c.zone || '—') + '</span></div>';
  html += '<div class="cal-modal-field"><label>Statut</label><span class="cal-day-rdv-statut" style="' + style + '">' + c.statut + '</span></div>';
  html += '</div>';
  if (c.notes) {
    html += '<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:4px;">Notes</div><div style="font-size:13px;background:var(--bg);padding:10px;border-radius:6px;white-space:pre-wrap;">' + c.notes + '</div></div>';
  }

  if (c.rdvs && c.rdvs.length > 0) {
    html += '<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">RDVs (' + c.rdvs.length + ')</div>';
    c.rdvs.forEach(r => {
      html += '<div class="cal-day-rdv-item">';
      html += '<div class="cal-day-rdv-left">';
      html += '<div class="cal-day-rdv-prospect">' + r.prospect + '</div>';
      html += '<div class="cal-day-rdv-montant">' + r.montant + ' M FCFA &mdash; ' + r.statut + '</div>';
      html += '</div></div>';
    });
  } else {
    html += '<div class="cal-empty">Aucun RDV associé</div>';
  }

  document.getElementById('cal-collecte-body').innerHTML = html;
  document.getElementById('cal-collecte-modal').style.display = 'flex';
}

function editCollecte(id) {
  const c = historyCollectes.find(x => x.id === id);
  if (!c || c.statut !== 'brouillon') return;

  editRdvs = c.rdvs ? c.rdvs.map(r => ({ prospect: r.prospect, date: r.date, montant: r.montant, statut: r.statut })) : [];

  document.getElementById('cal-collecte-title').textContent = 'Modifier la collecte';

  let html = '<form id="edit-collecte-form" onsubmit="return saveCollecteEdit(' + id + ', event)">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">';
  html += '<div class="form-group"><label>CA (FCFA)</label><input type="number" id="edit-ca" min="0" value="' + c.ca + '"></div>';
  html += '<div class="form-group"><label>Offres</label><input type="number" id="edit-offres" min="0" value="' + c.offres + '"></div>';
  html += '<div class="form-group"><label>BC</label><input type="number" id="edit-bc" min="0" value="' + c.bc + '"></div>';
  html += '<div class="form-group"><label>Visites</label><input type="number" id="edit-visites" min="0" value="' + (c.visites || 0) + '"></div>';
  html += '<div class="form-group"><label>Contacts</label><input type="number" id="edit-contacts" min="0" value="' + (c.contacts || 0) + '"></div>';
  html += '<div class="form-group"><label>Zone</label>';
  html += '<select id="edit-zone"><option value="">— Sélectionner —</option>';
  ['Centre','Nord','Sud','Est','Ouest'].forEach(function(z) {
    html += '<option value="' + z + '"' + (c.zone === z ? ' selected' : '') + '>' + z + '</option>';
  });
  html += '</select></div>';
  html += '</div>';
  html += '<div class="form-group"><label>Notes</label><textarea id="edit-notes" rows="2" style="width:100%;resize:vertical;">' + (c.notes || '') + '</textarea></div>';

  html += '<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">RDVs</div>';
  html += '<div id="edit-rdv-list"></div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">';
  html += '<div class="form-group"><label>Prospect</label><input type="text" id="edit-rdv-prospect" placeholder="Nom"></div>';
  html += '<div class="form-group"><label>Date</label><input type="date" id="edit-rdv-date"></div>';
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">';
  html += '<div class="form-group"><label>Montant (M)</label><input type="number" id="edit-rdv-montant" min="0" placeholder="0"></div>';
  html += '<div class="form-group"><label>Statut</label>';
  html += '<select id="edit-rdv-statut"><option>Prévu</option><option>Réalisé</option><option>Offre</option><option>BC Signé</option></select>';
  html += '</div></div>';
  html += '<button type="button" class="btn btn-primary btn-sm" onclick="addRdvToEdit()" style="margin-bottom:12px;">+ Ajouter RDV</button>';

  html += '<div class="cal-modal-actions" style="padding:0;border:none;margin-top:8px;">';
  html += '<button type="submit" class="btn btn-success btn-sm">Enregistrer</button>';
  html += '<button type="button" class="btn btn-sm" style="background:var(--border);" onclick="document.getElementById(\'cal-collecte-modal\').style.display=\'none\'">Annuler</button>';
  html += '</div>';
  html += '</form>';

  document.getElementById('cal-collecte-body').innerHTML = html;
  renderEditRdvs();
  document.getElementById('cal-collecte-modal').style.display = 'flex';
}

function renderEditRdvs() {
  const el = document.getElementById('edit-rdv-list');
  if (!el) return;
  if (editRdvs.length === 0) { el.innerHTML = '<div class="cal-empty" style="padding:8px;">Aucun RDV</div>'; return; }
  el.innerHTML = editRdvs.map((r, i) => '<div class="cal-day-rdv-item">'
    + '<div class="cal-day-rdv-left">'
    + '<div class="cal-day-rdv-prospect">' + r.prospect + '</div>'
    + '<div class="cal-day-rdv-montant">' + r.date + ' | ' + r.montant + 'M | ' + r.statut + '</div>'
    + '</div>'
    + '<button type="button" class="action-btn action-btn-delete" onclick="removeRdvFromEdit(' + i + ')">&#10005;</button>'
    + '</div>').join('');
}

function addRdvToEdit() {
  const prospect = document.getElementById('edit-rdv-prospect').value.trim();
  const date = document.getElementById('edit-rdv-date').value;
  const montant = parseFloat(document.getElementById('edit-rdv-montant').value) || 0;
  const statut = document.getElementById('edit-rdv-statut').value;
  if (!prospect || !date) return showToast('Prospect et date requis', 'warning');
  editRdvs.push({ prospect, date, montant, statut });
  renderEditRdvs();
  document.getElementById('edit-rdv-prospect').value = '';
  document.getElementById('edit-rdv-date').value = '';
  document.getElementById('edit-rdv-montant').value = '';
}

function removeRdvFromEdit(i) {
  editRdvs.splice(i, 1);
  renderEditRdvs();
}

async function saveCollecteEdit(id, e) {
  e.preventDefault();
  const ca = parseFloat(document.getElementById('edit-ca').value) || 0;
  const offres = parseInt(document.getElementById('edit-offres').value) || 0;
  const bc = parseInt(document.getElementById('edit-bc').value) || 0;
  const visites = parseInt(document.getElementById('edit-visites').value) || 0;
  const contacts = parseInt(document.getElementById('edit-contacts').value) || 0;
  const zone = document.getElementById('edit-zone').value || null;
  const notes = document.getElementById('edit-notes').value.trim() || null;
  try {
    const res = await api('PUT', '/api/collectes/' + id, { ca, offres, bc, visites, contacts, zone, notes, rdvs: editRdvs });
    if (res.status === 401) { window.location.href = '/'; return; }
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    document.getElementById('cal-collecte-modal').style.display = 'none';
    showToast('Collecte mise à jour !', 'success');
    loadHistory();
    calLoadRdvs();
  } catch { showToast('Erreur serveur', 'error'); }
}

async function deleteCollecte(id) {
  if (!confirm('Supprimer cette collecte ?')) return;
  try {
    const res = await api('DELETE', '/api/collectes/' + id);
    if (res.status === 401) { window.location.href = '/'; return; }
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast('Collecte supprimée !', 'success');
    loadHistory();
    calLoadRdvs();
  } catch { showToast('Erreur serveur', 'error'); }
}
