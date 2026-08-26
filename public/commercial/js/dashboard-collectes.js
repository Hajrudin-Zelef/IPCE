/* ========================================
   DASHBOARD — Collectes & RDV
   ======================================== */

let currentRdvs = [];

function addRdv() {
  const prospect = document.getElementById('rdv-prospect').value.trim();
  const date = document.getElementById('rdv-date').value;
  const montant = parseFloat(document.getElementById('rdv-montant').value) || 0;
  const statut = document.getElementById('rdv-statut').value;
  if (!prospect || !date) return alert('Prospect et date requis');
  currentRdvs.push({ prospect, date, montant, statut });
  renderRdvs();
  document.getElementById('rdv-prospect').value = '';
  document.getElementById('rdv-date').value = '';
  document.getElementById('rdv-montant').value = '';
}

function removeRdv(i) {
  currentRdvs.splice(i, 1);
  renderRdvs();
}

function renderRdvs() {
  const el = document.getElementById('rdv-list');
  if (currentRdvs.length === 0) {
    el.innerHTML = '<div class="empty" style="padding:10px">Aucun RDV ajout\u00e9</div>';
    return;
  }
  el.innerHTML = currentRdvs.map((r, i) => `
    <div class="rdv-item">
      <div class="info"><b>${r.prospect}</b> | ${r.date} | ${r.montant}M | ${r.statut}</div>
      <button class="btn btn-danger btn-sm" onclick="removeRdv(${i})">X</button>
    </div>
  `).join('');
}

async function saveCollecte() {
  const ca = parseFloat(document.getElementById('inp-ca').value) || 0;
  const offres = parseInt(document.getElementById('inp-offres').value) || 0;
  const bc = parseInt(document.getElementById('inp-bc').value) || 0;
  try {
    const res = await api('POST', '/api/collectes', { ca, offres, bc, rdvs: currentRdvs });
    if (res.status === 401) { window.location.href = '/'; return; }
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    alert('Collecte sauvegard\u00e9e !');
    currentRdvs = [];
    renderRdvs();
    document.getElementById('inp-ca').value = '';
    document.getElementById('inp-offres').value = '';
    document.getElementById('inp-bc').value = '';
    loadHistory();
    calLoadRdvs();
  } catch { alert('Erreur serveur'); }
}

async function validateCollecte() {
  const ca = parseFloat(document.getElementById('inp-ca').value) || 0;
  const offres = parseInt(document.getElementById('inp-offres').value) || 0;
  const bc = parseInt(document.getElementById('inp-bc').value) || 0;
  if (currentRdvs.length === 0 && ca === 0) return alert('Saisissez au moins des donn\u00e9es');
  try {
    const saveRes = await api('POST', '/api/collectes', { ca, offres, bc, rdvs: currentRdvs });
    if (saveRes.status === 401) { window.location.href = '/'; return; }
    const saveData = await saveRes.json();
    if (!saveRes.ok) return alert(saveData.error);
    const valRes = await api('PATCH', `/api/collectes/${saveData.id}/validate`);
    const valData = await valRes.json();
    if (!valRes.ok) return alert(valData.error);
    alert('Collecte valid\u00e9e ! L\'admin a \u00e9t\u00e9 notifi\u00e9.');
    currentRdvs = [];
    renderRdvs();
    document.getElementById('inp-ca').value = '';
    document.getElementById('inp-offres').value = '';
    document.getElementById('inp-bc').value = '';
    loadHistory();
    calLoadRdvs();
  } catch { alert('Erreur serveur'); }
}
