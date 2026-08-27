/* ========================================
   DASHBOARD — Collectes & RDV
   ======================================== */

let currentRdvs = [];

window.__load_collecte = function() {
  setDefaultDate();
  renderRdvs();
};

// --- Toast ---
function showToast(msg, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  if (!container) return;
  var t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.remove(); }, 3200);
}

// --- RDV ---
function updateRdvCounter() {
  var el = document.getElementById('rdv-counter');
  if (el) el.textContent = currentRdvs.length;
}

function addRdv() {
  var prospect = document.getElementById('rdv-prospect').value.trim();
  var date = document.getElementById('rdv-date').value;
  var montant = parseFloat(document.getElementById('rdv-montant').value) || 0;
  var statut = document.getElementById('rdv-statut').value;
  if (!prospect || !date) return showToast('Prospect et date requis', 'warning');
  currentRdvs.push({ prospect: prospect, date: date, montant: montant, statut: statut });
  renderRdvs();
  document.getElementById('rdv-prospect').value = '';
  document.getElementById('rdv-montant').value = '';
  document.getElementById('rdv-prospect').focus();
  showToast('RDV ajouté : ' + prospect, 'success');
}

function removeRdv(i) {
  var name = currentRdvs[i] ? currentRdvs[i].prospect : '';
  currentRdvs.splice(i, 1);
  renderRdvs();
  showToast('RDV supprimé : ' + name, 'info');
}

function renderRdvs() {
  var el = document.getElementById('rdv-list');
  updateRdvCounter();
  if (currentRdvs.length === 0) {
    el.innerHTML = '<div class="rdv-empty">Aucun RDV ajouté</div>';
    return;
  }
  var statusColors = {
    'Été': '#3b82f6',
    'Réalisé': '#10b981',
    'Offre': '#f59e0b',
    'BC Signé': '#8b5cf6',
  };
  el.innerHTML = currentRdvs.map(function(r, i) {
    var dotColor = statusColors[r.statut] || '#94a3b8';
    return '<div class="rdv-item">'
      + '<div class="info">'
      + '<b>' + escapeHtml(r.prospect) + '</b>'
      + ' <span style="color:var(--muted)">&middot;</span> ' + escapeHtml(r.date)
      + ' <span style="color:var(--muted)">&middot;</span> ' + escapeHtml(r.montant) + 'M'
      + ' <span style="color:' + dotColor + ';font-weight:600;margin-left:4px;">' + escapeHtml(r.statut) + '</span>'
      + '</div>'
      + '<button class="btn btn-danger btn-sm" onclick="removeRdv(' + i + ')">✕</button>'
      + '</div>';
  }).join('');
}

// --- Collectes ---
async function saveCollecte() {
  var ca = parseFloat(document.getElementById('inp-ca').value) || 0;
  var offres = parseInt(document.getElementById('inp-offres').value) || 0;
  var bc = parseInt(document.getElementById('inp-bc').value) || 0;
  var visites = parseInt(document.getElementById('inp-visites').value) || 0;
  var contacts = parseInt(document.getElementById('inp-contacts').value) || 0;
  var zone = document.getElementById('inp-zone').value || null;
  var notes = document.getElementById('inp-notes').value.trim() || null;
  if (ca === 0 && offres === 0 && bc === 0 && visites === 0 && contacts === 0 && currentRdvs.length === 0) {
    return showToast('Saisissez au moins une donnée', 'warning');
  }
  try {
    var res = await api('POST', '/api/collectes', { ca: ca, offres: offres, bc: bc, visites: visites, contacts: contacts, zone: zone, notes: notes, rdvs: currentRdvs });
    if (res.status === 401) { window.location.href = '/'; return; }
    var data = await res.json();
    if (!res.ok) return showToast(data.error, 'error');
    showToast('Collecte sauvegardée !', 'success');
    resetForm();
    loadHistory();
    calLoadRdvs();
  } catch { showToast('Erreur serveur', 'error'); }
}

async function validateCollecte() {
  var ca = parseFloat(document.getElementById('inp-ca').value) || 0;
  var offres = parseInt(document.getElementById('inp-offres').value) || 0;
  var bc = parseInt(document.getElementById('inp-bc').value) || 0;
  var visites = parseInt(document.getElementById('inp-visites').value) || 0;
  var contacts = parseInt(document.getElementById('inp-contacts').value) || 0;
  var zone = document.getElementById('inp-zone').value || null;
  var notes = document.getElementById('inp-notes').value.trim() || null;
  if (currentRdvs.length === 0 && ca === 0 && offres === 0 && bc === 0 && visites === 0 && contacts === 0) {
    return showToast('Saisissez au moins des données', 'warning');
  }
  try {
    var saveRes = await api('POST', '/api/collectes', { ca: ca, offres: offres, bc: bc, visites: visites, contacts: contacts, zone: zone, notes: notes, rdvs: currentRdvs });
    if (saveRes.status === 401) { window.location.href = '/'; return; }
    var saveData = await saveRes.json();
    if (!saveRes.ok) return showToast(saveData.error, 'error');
    var valRes = await api('PATCH', '/api/collectes/' + saveData.id + '/validate');
    var valData = await valRes.json();
    if (!valRes.ok) return showToast(valData.error, 'error');
    showToast('Collecte validée ! L\'admin a été notifié.', 'success');
    resetForm();
    loadHistory();
    calLoadRdvs();
  } catch { showToast('Erreur serveur', 'error'); }
}

function resetForm() {
  currentRdvs = [];
  renderRdvs();
  document.getElementById('inp-ca').value = '';
  document.getElementById('inp-offres').value = '';
  document.getElementById('inp-bc').value = '';
  document.getElementById('inp-visites').value = '';
  document.getElementById('inp-contacts').value = '';
  document.getElementById('inp-zone').value = '';
  document.getElementById('inp-notes').value = '';
  setDefaultDate();
}

function setDefaultDate() {
  var d = new Date();
  var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  var dateInput = document.getElementById('rdv-date');
  if (dateInput) dateInput.value = dateStr;
}

// Init date par défaut
setDefaultDate();
