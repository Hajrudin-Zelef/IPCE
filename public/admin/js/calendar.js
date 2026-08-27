// Marexsoft Corporation
/* ========================================
   CALENDRIER — Vue admin avec détail jour
   ======================================== */

let calendarDate = new Date();
let calendarCollectes = [];
let calendarRdvs = [];
let selectedDate = null;

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

window.__load_calendar = async function() {
  await loadCalendarData();
  renderCalendar();
};

async function loadCalendarData() {
  try {
    const collectes = await loadSectionData('/api/collectes/all');
    calendarCollectes = Array.isArray(collectes) ? collectes : [];
  } catch { calendarCollectes = []; }
  try {
    const rdvs = await loadSectionData('/api/admin/rdvs');
    calendarRdvs = Array.isArray(rdvs) ? rdvs : [];
  } catch { calendarRdvs = []; }
}

function renderCalendar() {
  const el = document.getElementById('section-calendar-content');
  if (!el) return;
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const dayNames = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

  let html = `
    <div class="calendar-nav">
      <button class="calendar-nav-btn" onclick="window.__calPrev()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="calendar-nav-month">${monthNames[month]} ${year}</div>
      <button class="calendar-nav-btn" onclick="window.__calNext()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="calendar-nav-btn today-btn" onclick="window.__calToday()" style="margin-left:12px;font-size:12px;width:auto;padding:0 12px;font-weight:600;">Aujourd'hui</button>
    </div>
    <div style="display:flex;gap:20px;align-items:flex-start;">
      <div style="flex:1;min-width:0;">
        <div class="calendar-grid">
          ${dayNames.map(d => `<div class="calendar-header-cell">${d}</div>`).join('')}
  `;

  const prevMonth = new Date(year, month, 0);
  for (let i = startDay - 1; i >= 0; i--) {
    html += `<div class="calendar-day other-month"><div class="calendar-day-number">${prevMonth.getDate() - i}</div></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const dayCollectes = calendarCollectes.filter(c => (c.created_at || '').slice(0, 10) === dateStr);
    const dayRdvs = calendarRdvs.filter(r => r.date === dateStr);
    const ca = dayCollectes.reduce((s, c) => s + (c.ca || 0), 0);
    const hasData = dayCollectes.length > 0 || dayRdvs.length > 0;

    let classes = 'calendar-day';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';
    if (hasData) classes += ' has-data';

    html += `<div class="${classes}" data-date="${dateStr}" onclick="window.__calSelectDay('${dateStr}')">`;
    html += `<div class="calendar-day-number">${d}</div>`;
    html += `<div class="calendar-day-events" id="cal-events-${d}">`;

    dayRdvs.slice(0, 2).forEach(r => {
      const color = r.montant > 5000000 ? 'high' : r.montant > 1000000 ? 'medium' : 'low';
      html += `<div class="calendar-event ${color}" title="${esc(r.prospect)} - ${formatCA(r.montant)} FCFA">🤝 ${esc(r.prospect).slice(0, 10)}</div>`;
    });
    if (dayCollectes.length > 0) {
      html += `<div class="calendar-event collect" title="${dayCollectes.length} collecte(s) — ${formatCA(ca)} FCFA">📊 ${dayCollectes.length} col.</div>`;
    }
    if (dayRdvs.length > 2) {
      html += `<div class="calendar-event more">+${dayRdvs.length - 2} RDV</div>`;
    }

    html += '</div></div>';
  }

  const remaining = 42 - (startDay + daysInMonth);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-day other-month"><div class="calendar-day-number">${i}</div></div>`;
  }

  html += '</div></div>';

  html += `<div class="calendar-detail" id="calendar-detail">`;
  if (selectedDate) {
    html += renderDayDetail(selectedDate);
  } else {
    html += `<div class="calendar-detail-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5" opacity="0.4"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <p>Cliquez sur une date pour voir les détails</p>
    </div>`;
  }
  html += '</div></div>';

  el.innerHTML = html;
}

function renderDayDetail(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayCollectes = calendarCollectes.filter(c => (c.created_at || '').slice(0, 10) === dateStr);
  const dayRdvs = calendarRdvs.filter(r => r.date === dateStr);

  const cumCa = calendarCollectes.filter(c => (c.created_at || '').slice(0, 10) <= dateStr && c.statut !== 'rejetee').reduce((s, c) => s + (c.ca || 0), 0);
  const cumOffres = calendarCollectes.filter(c => (c.created_at || '').slice(0, 10) <= dateStr && c.statut !== 'rejetee').reduce((s, c) => s + (c.offres || 0), 0);
// Marexsoft Corporation
  const cumBc = calendarCollectes.filter(c => (c.created_at || '').slice(0, 10) <= dateStr && c.statut !== 'rejetee').reduce((s, c) => s + (c.bc || 0), 0);
  const cumRdvs = calendarRdvs.filter(r => r.date <= dateStr).length;
  const cumCollectes = calendarCollectes.filter(c => (c.created_at || '').slice(0, 10) <= dateStr && c.statut !== 'rejetee').length;

  const dayCa = dayCollectes.reduce((s, c) => s + (c.ca || 0), 0);
  const dayOffres = dayCollectes.reduce((s, c) => s + (c.offres || 0), 0);
  const dayBc = dayCollectes.reduce((s, c) => s + (c.bc || 0), 0);

  const displayDate = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const perComm = {};
  dayCollectes.forEach(c => {
    const name = c.commercial || 'Inconnu';
    if (!perComm[name]) perComm[name] = { ca: 0, offres: 0, bc: 0, rdvs: 0, collectes: 0 };
    perComm[name].ca += c.ca || 0;
    perComm[name].offres += c.offres || 0;
    perComm[name].bc += c.bc || 0;
    perComm[name].collectes += 1;
    perComm[name].rdvs += (c.rdvs || []).length;
  });

  let html = '';

  html += `<div class="detail-header">`;
  html += `<div class="detail-date">${displayDate}</div>`;
  html += `<div class="detail-badges">`;
  html += `<span class="detail-badge collect">${dayCollectes.length} collecte${dayCollectes.length > 1 ? 's' : ''}</span>`;
  html += `<span class="detail-badge rdv">${dayRdvs.length} RDV${dayRdvs.length > 1 ? 's' : ''}</span>`;
  html += `</div></div>`;

  html += `<div class="detail-section">`;
  html += `<div class="detail-section-title">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    Cumulé jusqu'à cette date
  </div>`;
  html += `<div class="detail-stats-grid">`;
  html += renderDetailStat('CA', formatCA(cumCa) + ' FCFA', cumCa > 0 ? 'success' : 'muted');
  html += renderDetailStat('Collectes', cumCollectes, cumCollectes > 0 ? 'success' : 'muted');
  html += renderDetailStat('Offres', cumOffres, cumOffres > 0 ? 'success' : 'muted');
  html += renderDetailStat('BC', cumBc, cumBc > 0 ? 'success' : 'muted');
  html += renderDetailStat('RDV', cumRdvs, cumRdvs > 0 ? 'success' : 'muted');
  html += `</div></div>`;

  if (dayCollectes.length > 0 || dayRdvs.length > 0) {
    html += `<div class="detail-section">`;
    html += `<div class="detail-section-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      Activité du jour
    </div>`;

    if (dayCollectes.length > 0) {
      html += `<div class="detail-stats-grid" style="margin-bottom:12px;">`;
      html += renderDetailStat('CA du jour', formatCA(dayCa) + ' FCFA', dayCa > 0 ? 'primary' : 'muted');
      html += renderDetailStat('Offres', dayOffres, 'default');
      html += renderDetailStat('BC', dayBc, 'default');
      html += renderDetailStat('RDV', dayRdvs.length, 'default');
      html += `</div>`;
    }

    if (Object.keys(perComm).length > 0) {
      html += `<div class="detail-comm-list">`;
      Object.entries(perComm).sort((a, b) => b[1].ca - a[1].ca).forEach(([name, data]) => {
        html += `<div class="detail-comm-row">
          <div class="detail-comm-avatar">${name.charAt(0).toUpperCase()}</div>
          <div class="detail-comm-info">
            <div class="detail-comm-name">${esc(name)}</div>
            <div class="detail-comm-stats">${data.collectes} col. · ${data.rdvs} RDV · ${formatCA(data.ca)} FCFA</div>
          </div>
        </div>`;
      });
      html += `</div>`;
    }

    if (dayRdvs.length > 0) {
      html += `<div class="detail-rdv-list">`;
      dayRdvs.forEach(r => {
        const statusClass = (r.statut || '').toLowerCase().replace(/\s/g, '-');
        html += `<div class="detail-rdv-row">
          <div class="detail-rdv-icon">🤝</div>
          <div class="detail-rdv-info">
            <div class="detail-rdv-name">${esc(r.prospect)}</div>
            <div class="detail-rdv-meta">${formatCA(r.montant || 0)} FCFA · <span class="detail-rdv-status ${statusClass}">${esc(r.statut || 'Prévu')}</span></div>
          </div>
        </div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  } else {
    html += `<div class="detail-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5" opacity="0.3"><circle cx="12" cy="12" r="10"/><path d="M8 15h8M9 9h.01M15 9h.01"/></svg>
      <p>Aucune activité ce jour</p>
    </div>`;
  }

  return html;
}

function renderDetailStat(label, value, cls) {
  return `<div class="detail-stat ${cls || ''}">
    <div class="detail-stat-value">${value}</div>
    <div class="detail-stat-label">${label}</div>
  </div>`;
}

window.__calSelectDay = function(dateStr) {
  selectedDate = dateStr;
  renderCalendar();
};

window.__calToday = function() {
  calendarDate = new Date();
  const today = new Date();
  selectedDate = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  renderCalendar();
};

window.__calPrev = function() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  selectedDate = null;
  renderCalendar();
};

window.__calNext = function() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  selectedDate = null;
  renderCalendar();
};
// Marexsoft Corporation
