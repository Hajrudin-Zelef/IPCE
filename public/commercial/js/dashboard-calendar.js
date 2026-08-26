/* ========================================
   DASHBOARD — Calendar
   ======================================== */

let calDate = new Date();
let calView = 'month';
let calRdvs = [];
let calSelectedRdv = null;

function calGetMonthRange() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`;
  return { from, to, year: y, month: m };
}

async function calLoadRdvs() {
  const { from, to } = calGetMonthRange();
  try {
    const res = await api('GET', `/api/collectes/rdvs?from=${from}&to=${to}`);
    if (res.status === 401) { window.location.href = '/'; return; }
    calRdvs = await res.json();
  } catch { calRdvs = []; }
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
    let cls = 'cal-day';
    if (isOther) cls += ' other-month';
    if (isToday) cls += ' today';

    html += `<div class="${cls}" onclick="calDayClick('${dateStr}')">`;
    html += `<span class="cal-day-num">${dayNum}</span>`;
    if (dayRdvs.length > 3) {
      html += `<span class="cal-day-count">${dayRdvs.length}</span>`;
    }
    html += '<div class="cal-dots">';
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
  if (dayRdvs.length === 1) calOpenModal(dayRdvs[0]);
  else if (dayRdvs.length > 1) {
    let msg = `RDV le ${dateStr} :\n`;
    dayRdvs.forEach((r, i) => { msg += `${i + 1}. ${r.prospect} — ${r.statut}\n`; });
    msg += '\nEntrez le numéro du RDV à ouvrir :';
    const idx = prompt(msg);
    if (idx && dayRdvs[parseInt(idx) - 1]) calOpenModal(dayRdvs[parseInt(idx) - 1]);
  }
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
    if (!res.ok) { alert(data.error); return; }
    calCloseModal();
    calLoadRdvs();
  } catch { alert('Erreur serveur'); }
}

async function calDeleteRdv() {
  if (!calSelectedRdv) return;
  if (!confirm(`Supprimer le RDV « ${calSelectedRdv.prospect} » ?`)) return;
  try {
    const res = await api('DELETE', `/api/collectes/rdvs/${calSelectedRdv.id}`);
    if (res.status === 401) { window.location.href = '/'; return; }
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    calCloseModal();
    calLoadRdvs();
  } catch { alert('Erreur serveur'); }
}
