/* ========================================
   DASHBOARD — Calendar
   ======================================== */

let calDate = new Date();
let calView = 'month';
let calRdvs = [];
let calCollectes = [];
let calSelectedRdv = null;

window.__load_calendar = function() {
  calLoadRdvs();
};

function calGetMonthRange() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`;
  return { from, to, year: y, month: m };
}

async function calLoadRdvs() {
  const { from, to } = calGetMonthRange();
  try {
    const rdvsRes = await api('GET', `/api/collectes/rdvs?from=${from}&to=${to}`);
    if (rdvsRes.status === 401) { window.location.href = '/'; return; }
    calRdvs = await rdvsRes.json();
  } catch { calRdvs = []; }
  try {
    const collectesRes = await api('GET', `/api/collectes/by-date?from=${from}&to=${to}`);
    if (collectesRes.ok) calCollectes = await collectesRes.json();
    else calCollectes = [];
  } catch { calCollectes = []; }
  calRender();
}

function calRender() {
  document.getElementById('cal-month-label').textContent =
    calDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  if (calView === 'month') calRenderMonth();
  else calRenderTimeline();
}

function calRenderMonth() {
  const { year, month } = calGetMonthRange();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const rdvByDate = {};
  calRdvs.forEach(r => { rdvByDate[r.date] = (rdvByDate[r.date] || []).concat(r); });

  const collecteByDate = {};
  calCollectes.forEach(c => {
    if (!collecteByDate[c.date]) collecteByDate[c.date] = [];
    collecteByDate[c.date].push(c);
  });

  const headers = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  let html = '<div class="cal-grid">';
  headers.forEach(h => { html += `<div class="cal-header-cell">${h}</div>`; });

  let day = 1, nextDay = 1;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    let dateStr, dayNum, isOther = false;
    if (i < startOffset) {
      dayNum = prevMonthDays - startOffset + i + 1;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      dateStr = `${py}-${String(pm + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      isOther = true;
    } else if (day <= daysInMonth) {
      dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dayNum = day;
      day++;
    } else {
      dayNum = nextDay;
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      dateStr = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      nextDay++;
      isOther = true;
    }
    const isToday = dateStr === todayStr;
    const dayRdvs = rdvByDate[dateStr] || [];
    const dayCollectes = collecteByDate[dateStr] || [];
    const totalItems = dayRdvs.length + dayCollectes.length;
    let cls = 'cal-day';
    if (isOther) cls += ' other-month';
    if (isToday) cls += ' today';

    html += `<div class="${cls}" onclick="calDayClick('${dateStr}')">`;
    html += `<span class="cal-day-num">${dayNum}</span>`;
    if (totalItems > 3) {
      html += `<span class="cal-day-count">${totalItems}</span>`;
    }
    html += '<div class="cal-dots">';
    dayCollectes.slice(0, 2).forEach(c => {
      const sClass = c.statut === 'approuvee' ? 'cal-dot-approuvee' : c.statut === 'validee' ? 'cal-dot-validee' : c.statut === 'rejetee' ? 'cal-dot-rejetee' : 'cal-dot-brouillon';
      html += `<span class="cal-dot ${sClass}" title="Collecte ${c.statut} — ${(c.ca/1e6).toFixed(1)}M"></span>`;
    });
    dayRdvs.slice(0, 4).forEach(r => {
      html += `<span class="cal-dot ${r.statut.replace(/ /g, ' ')}" title="${r.prospect} — ${r.statut}"></span>`;
    });
    html += '</div></div>';
  }
  html += '</div>';
  document.getElementById('cal-month-view').innerHTML = html;
  document.getElementById('cal-month-view').style.display = '';
  document.getElementById('cal-timeline-view').style.display = 'none';
}

function calRenderTimeline() {
  const sorted = [...calRdvs].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    document.getElementById('cal-timeline-view').innerHTML = '<div class="cal-empty">Aucun RDV ce mois-ci</div>';
  } else {
    const monthName = calDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    let html = `<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">${sorted.length} RDV en ${monthName}</div>`;
    sorted.forEach(r => {
      const d = new Date(r.date + 'T00:00:00');
      const dateLabel = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      html += `<div class="cal-timeline-item ${r.statut.replace(/ /g, ' ')}" onclick="calOpenModal(${JSON.stringify(r).replace(/"/g, '&quot;')})">`;
      html += `<div class="cal-timeline-date">${dateLabel}</div>`;
      html += '<div class="cal-timeline-info">';
      html += `<div class="cal-timeline-prospect">${r.prospect}</div>`;
      html += `<div class="cal-timeline-montant">${r.montant} M FCFA</div>`;
      html += `<span class="cal-timeline-statut ${r.statut.replace(/ /g, ' ')}">${r.statut}</span>`;
      html += '</div></div>';
    });
    document.getElementById('cal-timeline-view').innerHTML = html;
  }
  document.getElementById('cal-month-view').style.display = 'none';
  document.getElementById('cal-timeline-view').style.display = '';
}

function calDayClick(dateStr) {
  const dayRdvs = calRdvs.filter(r => r.date === dateStr);
  const dayCollectes = calCollectes.filter(c => c.date === dateStr);
  const totalItems = dayRdvs.length + dayCollectes.length;

  if (totalItems === 0) return;

  // Single RDV only → open edit modal directly
  if (dayRdvs.length === 1 && dayCollectes.length === 0) { calOpenModal(dayRdvs[0]); return; }

  // Everything else → show day detail modal
  showDayModal(dateStr, dayRdvs, dayCollectes);
}

function showDayModal(dateStr, dayRdvs, dayCollectes) {
  const d = new Date(dateStr + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('cal-day-title').textContent = dateLabel;

  const statusColors = {
    'Prevu': 'var(--status-brouillon-bg);color:var(--status-brouillon-text)',
    'Realise': 'var(--status-approuvee-bg);color:var(--status-approuvee-text)',
    'Offre': 'var(--status-validee-bg);color:var(--status-validee-text)',
    'BC Signe': 'background:rgba(156,39,176,0.15);color:#9c27b0',
  };

  const collecteStatusColors = {
    'brouillon': 'var(--status-brouillon-bg);color:var(--status-brouillon-text)',
    'validee': 'var(--status-validee-bg);color:var(--status-validee-text)',
    'approuvee': 'var(--status-approuvee-bg);color:var(--status-approuvee-text)',
    'rejetee': 'var(--status-rejetee-bg);color:var(--status-rejetee-text)',
  };

  let html = '';

  // Collectes
  if (dayCollectes.length > 0) {
    html += '<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">Collectes (' + dayCollectes.length + ')</div>';
    dayCollectes.forEach(c => {
      const locked = c.statut !== 'brouillon';
      const style = collecteStatusColors[c.statut] || '';
      const rdvCount = c.rdvs ? c.rdvs.length : 0;
      const collecteJson = JSON.stringify(c).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
      html += '<div class="cal-day-rdv-item' + (locked ? '' : ' clickable') + '" style="' + (locked ? 'opacity:0.8;' : 'cursor:pointer;') + '" onclick="calCloseDayModal();showCollecteDetail(JSON.parse(\'' + collecteJson + '\'))">';
      html += '<div class="cal-day-rdv-left">';
      html += '<div class="cal-day-rdv-prospect">' + (c.ca / 1e6).toFixed(1) + 'M FCFA &mdash; ' + c.offres + ' offres &mdash; ' + c.bc + ' BC &mdash; ' + rdvCount + ' RDV</div>';
      html += '<div class="cal-day-rdv-montant">' + (locked ? 'Valid&eacute;e &mdash; lecture seule' : 'Brouillon &mdash; cliquer pour voir') + '</div>';
      html += '</div>';
      html += '<span class="cal-day-rdv-statut" style="' + style + '">' + c.statut + '</span>';
      html += '</div>';
    });
  }

  // RDVs
  if (dayRdvs.length > 0) {
    if (dayCollectes.length > 0) html += '<div style="height:12px;"></div>';
    html += '<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">RDVs (' + dayRdvs.length + ')</div>';
    dayRdvs.forEach(r => {
      const style = statusColors[r.statut] || '';
      const rdvJson = JSON.stringify(r).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
      html += '<div class="cal-day-rdv-item" onclick="calCloseDayModal();calOpenModal(JSON.parse(\'' + rdvJson + '\'))">';
      html += '<div class="cal-day-rdv-left">';
      html += '<div class="cal-day-rdv-prospect">' + r.prospect + '</div>';
      html += '<div class="cal-day-rdv-montant">' + r.montant + ' M FCFA</div>';
      html += '</div>';
      html += '<span class="cal-day-rdv-statut" style="' + style + '">' + r.statut + '</span>';
      html += '</div>';
    });
  }

  if (!html) html = '<div class="cal-empty">Aucune donn&eacute;e pour ce jour</div>';

  document.getElementById('cal-day-body').innerHTML = html;
  document.getElementById('cal-day-modal').style.display = 'flex';
}

function calCloseDayModal() {
  document.getElementById('cal-day-modal').style.display = 'none';
}

function showCollecteDetail(c) {
  const locked = c.statut !== 'brouillon';
  const statusColors = {
    'brouillon': 'var(--status-brouillon-bg);color:var(--status-brouillon-text)',
    'validee': 'var(--status-validee-bg);color:var(--status-validee-text)',
    'approuvee': 'var(--status-approuvee-bg);color:var(--status-approuvee-text)',
    'rejetee': 'var(--status-rejetee-bg);color:var(--status-rejetee-text)',
  };
  const style = statusColors[c.statut] || '';

  document.getElementById('cal-collecte-title').textContent = 'Collecte du ' + new Date(c.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  let html = '';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">';
  html += '<div class="cal-modal-field"><label>CA</label><span>' + (c.ca / 1e6).toFixed(1) + ' M FCFA</span></div>';
  html += '<div class="cal-modal-field"><label>Offres</label><span>' + c.offres + '</span></div>';
  html += '<div class="cal-modal-field"><label>BC</label><span>' + c.bc + '</span></div>';
  html += '<div class="cal-modal-field"><label>Statut</label><span class="cal-day-rdv-statut" style="' + style + '">' + c.statut + '</span></div>';
  html += '</div>';

  if (locked) {
    html += '<div style="font-size:12px;color:var(--warning);margin-bottom:12px;">Collecte valid&eacute;e &mdash; lecture seule</div>';
  } else {
    html += '<div style="font-size:12px;color:var(--success);margin-bottom:12px;">Brouillon &mdash; modifiable depuis l\'historique</div>';
  }

  if (c.rdvs && c.rdvs.length > 0) {
    html += '<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">RDVs associés (' + c.rdvs.length + ')</div>';
    c.rdvs.forEach(r => {
      html += '<div class="cal-day-rdv-item" style="cursor:pointer;" onclick="document.getElementById(\'cal-collecte-modal\').style.display=\'none\';calOpenModal(' + JSON.stringify(r).replace(/"/g, '&quot;') + ')">';
      html += '<div class="cal-day-rdv-left">';
      html += '<div class="cal-day-rdv-prospect">' + r.prospect + '</div>';
      html += '<div class="cal-day-rdv-montant">' + r.montant + ' M FCFA</div>';
      html += '</div>';
      html += '<span class="cal-day-rdv-statut">' + r.statut + '</span>';
      html += '</div>';
    });
  } else {
    html += '<div class="cal-empty">Aucun RDV associé</div>';
  }

  document.getElementById('cal-collecte-body').innerHTML = html;
  document.getElementById('cal-collecte-modal').style.display = 'flex';
}

function calPrevMonth() { calDate.setMonth(calDate.getMonth() - 1); calLoadRdvs(); }
function calNextMonth() { calDate.setMonth(calDate.getMonth() + 1); calLoadRdvs(); }

function calToggleView(view, btn) {
  calView = view;
  document.querySelectorAll('.cal-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  calRender();
}

function calOpenModal(rdv) {
  calSelectedRdv = rdv;
  document.getElementById('cal-modal-prospect').textContent = rdv.prospect;
  document.getElementById('cal-modal-date').textContent = rdv.date;
  document.getElementById('cal-modal-montant').textContent = rdv.montant + ' M FCFA';
  document.getElementById('cal-modal-statut').value = rdv.statut;
  const locked = rdv.collecte_statut !== 'brouillon';
  document.getElementById('cal-modal-readonly').style.display = locked ? 'block' : 'none';
  document.getElementById('cal-modal-statut').disabled = locked;
  document.getElementById('cal-btn-save').style.display = locked ? 'none' : '';
  document.getElementById('cal-btn-delete').style.display = locked ? 'none' : '';
  document.getElementById('cal-modal').style.display = 'flex';
}

function calCloseModal() {
  document.getElementById('cal-modal').style.display = 'none';
  calSelectedRdv = null;
}

async function calSaveStatut() {
  if (!calSelectedRdv) return;
  const newStatut = document.getElementById('cal-modal-statut').value;
  try {
    const res = await api('PATCH', `/api/collectes/rdvs/${calSelectedRdv.id}`, { statut: newStatut });
    if (res.status === 401) { window.location.href = '/'; return; }
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast('Statut mis à jour', 'success');
    calCloseModal();
    calLoadRdvs();
  } catch { showToast('Erreur serveur', 'error'); }
}

async function calDeleteRdv() {
  if (!calSelectedRdv) return;
  if (!confirm(`Supprimer le RDV « ${calSelectedRdv.prospect} » ?`)) return;
  try {
    const res = await api('DELETE', `/api/collectes/rdvs/${calSelectedRdv.id}`);
    if (res.status === 401) { window.location.href = '/'; return; }
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast('RDV supprimé', 'success');
    calCloseModal();
    calLoadRdvs();
  } catch { showToast('Erreur serveur', 'error'); }
}
