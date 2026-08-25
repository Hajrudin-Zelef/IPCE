let calendarDate = new Date();

window.__load_calendar = async function() {
  renderCalendar();
};

function renderCalendar() {
  const el = document.getElementById('section-calendar-content');
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const dayNames = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  let html = `
    <div class="calendar-nav">
      <button class="calendar-nav-btn" onclick="window.__calPrev()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="calendar-nav-month">${monthNames[month]} ${year}</div>
      <button class="calendar-nav-btn" onclick="window.__calNext()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="calendar-grid">
      ${dayNames.map(d => `<div class="calendar-header-cell">${d}</div>`).join('')}
  `;

  const prevMonth = new Date(year, month, 0);
  for (let i = startDay - 1; i >= 0; i--) {
    html += `<div class="calendar-day other-month"><div class="calendar-day-number">${prevMonth.getDate() - i}</div></div>`;
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    html += `<div class="calendar-day ${isToday ? 'today' : ''}" data-date="${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}"><div class="calendar-day-number">${d}</div><div id="cal-events-${d}"></div></div>`;
  }

  const remaining = 42 - (startDay + daysInMonth);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-day other-month"><div class="calendar-day-number">${i}</div></div>`;
  }

  html += '</div>';
  el.innerHTML = html;

  loadCalendarEvents(year, month);
}

async function loadCalendarEvents(year, month) {
  const rdvs = await loadSectionData('/api/admin/rdvs');
  if (!rdvs) return;

  rdvs.forEach(r => {
    const d = new Date(r.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const container = document.getElementById('cal-events-' + d.getDate());
      if (container) {
        const color = r.montant > 5000000 ? 'high' : r.montant > 1000000 ? 'medium' : 'low';
        container.innerHTML += `<div class="calendar-event ${color}" title="${r.prospect} - ${formatCA(r.montant)} FCFA">${r.prospect}</div>`;
      }
    }
  });
}

window.__calPrev = function() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
};

window.__calNext = function() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
};
