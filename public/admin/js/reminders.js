window.__load_reminders = async function() {
  const reminders = await loadSectionData('/api/admin/reminders');
  if (reminders === null) return renderEmpty('section-reminders-content', 'Erreur de chargement');

  const el = document.getElementById('section-reminders-content');
  const now = new Date(); now.setHours(0,0,0,0);

  // --- KPI Calculations ---
  const pending = reminders.filter(r => !r.completed);
  const completed = reminders.filter(r => r.completed);
  const overdue = pending.filter(r => {
    if (!r.due_date) return false;
    return new Date(r.due_date + 'T00:00:00') < now;
  });
  const dueToday = pending.filter(r => {
    if (!r.due_date) return false;
    const d = new Date(r.due_date + 'T00:00:00');
    return d.getTime() === now.getTime();
  });

  function urgencyInfo(dateStr) {
    if (!dateStr) return { cls: '', text: 'Pas de date', icon: '' };
    const d = new Date(dateStr + 'T00:00:00');
    const diff = Math.floor((d - now) / 86400000);
    if (diff < -1) return { cls: 'overdue', text: `En retard (${Math.abs(diff)}j)`, icon: 'clock' };
    if (diff === -1) return { cls: 'overdue', text: 'Hier', icon: 'clock' };
    if (diff === 0) return { cls: 'today', text: "Aujourd'hui", icon: 'alert' };
    if (diff === 1) return { cls: 'upcoming', text: 'Demain', icon: 'check' };
    if (diff <= 7) return { cls: 'upcoming', text: `Dans ${diff}j`, icon: 'check' };
    return { cls: '', text: formatDate(dateStr), icon: 'calendar' };
  }

  function priorityIcon(priority) {
    if (priority === 'high') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 17h8m-8-5h8m-8-5h8M3 17l2 2 4-4M3 12l2 2 4-4M3 7l2 2 4-4"/></svg>';
    if (priority === 'medium') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  }

  function renderCard(r) {
    const urg = urgencyInfo(r.due_date);
    const cardClass = r.completed ? 'completed' : urg.cls === 'overdue' ? 'overdue' : urg.cls === 'today' ? 'due-today' : urg.cls === 'upcoming' ? 'due-soon' : '';
    const iconClass = r.completed ? 'completed' : r.priority;

    return `
      <div class="reminder-card ${cardClass}" data-id="${r.id}" data-priority="${r.priority}" data-completed="${r.completed}">
        <div class="reminder-priority-bar ${r.priority}"></div>
        <div class="reminder-icon ${iconClass}">
          ${r.completed ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : priorityIcon(r.priority)}
        </div>
        <div class="reminder-body">
          <div class="reminder-title">${r.title}</div>
          ${r.description ? `<div class="reminder-desc">${r.description}</div>` : ''}
          <div class="reminder-meta">
            <span class="reminder-priority-badge ${r.priority}"><span class="reminder-priority-dot"></span>${r.priority === 'high' ? 'Urgent' : r.priority === 'medium' ? 'Moyen' : 'Faible'}</span>
            <span class="reminder-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${r.due_date ? `<span class="reminder-date-urgency ${urg.cls}">${urg.text}</span>` : 'Pas de date'}
            </span>
          </div>
        </div>
        <div class="reminder-actions">
          <button class="reminder-btn ${r.completed ? '' : 'success'}" onclick="window.__toggleReminder(${r.id}, ${r.completed})" title="${r.completed ? 'Annuler' : 'Marquer terminé'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="reminder-btn danger" onclick="window.__deleteReminder(${r.id})" title="Supprimer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // --- Build HTML ---
  el.innerHTML = `
    <!-- KPI Bar -->
    <div class="reminders-kpi-bar">
      <div class="reminders-kpi kpi-total">
        <div class="reminders-kpi-label">Total</div>
        <div class="reminders-kpi-value">${reminders.length}</div>
        <div class="reminders-kpi-sub">${pending.length} en cours</div>
      </div>
      <div class="reminders-kpi kpi-overdue">
        <div class="reminders-kpi-label">En retard</div>
        <div class="reminders-kpi-value">${overdue.length}</div>
        <div class="reminders-kpi-sub">${overdue.length === 1 ? 'rappel dépassé' : 'rappels dépassés'}</div>
      </div>
      <div class="reminders-kpi kpi-today">
        <div class="reminders-kpi-label">Aujourd'hui</div>
        <div class="reminders-kpi-value">${dueToday.length}</div>
        <div class="reminders-kpi-sub">${dueToday.length === 1 ? 'à traiter' : 'à traiter'}</div>
      </div>
      <div class="reminders-kpi kpi-done">
        <div class="reminders-kpi-label">Terminés</div>
        <div class="reminders-kpi-value">${completed.length}</div>
        <div class="reminders-kpi-sub">${reminders.length > 0 ? Math.round((completed.length / reminders.length) * 100) : 0}% complété</div>
      </div>
    </div>

    <!-- Create Form -->
    <div class="reminder-create-form">
      <div class="reminder-form-row">
        <div class="reminder-form-group">
          <label>Titre</label>
          <input type="text" id="reminder-title" placeholder="Titre du rappel...">
        </div>
        <div class="reminder-form-group">
          <label>Date</label>
          <input type="datetime-local" id="reminder-date">
        </div>
        <div class="reminder-form-group">
          <label>Priorité</label>
          <select id="reminder-priority">
            <option value="low">Faible</option>
            <option value="medium" selected>Moyen</option>
            <option value="high">Urgent</option>
          </select>
        </div>
      </div>
      <div class="reminder-form-row">
        <div class="reminder-form-group">
          <label>Description</label>
          <textarea id="reminder-desc" placeholder="Description (optionnel)..."></textarea>
        </div>
      </div>
      <div class="reminder-form-actions">
        <button class="btn btn-primary" onclick="window.__createReminder()">Créer le rappel</button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="reminders-toolbar">
      <div class="section-filters" style="margin-bottom:0">
        <button class="section-filter active" onclick="window.__filterReminders('all', this)">Tous (${reminders.length})</button>
        <button class="section-filter" onclick="window.__filterReminders('pending', this)">En cours (${pending.length})</button>
        <button class="section-filter" onclick="window.__filterReminders('overdue', this)">En retard (${overdue.length})</button>
        <button class="section-filter" onclick="window.__filterReminders('completed', this)">Terminés (${completed.length})</button>
      </div>
    </div>

    <!-- Pending Reminders -->
    ${pending.length > 0 ? `
      <div class="reminders-group-title">En cours <span class="reminders-group-count">${pending.length}</span></div>
      ${pending.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aDate = a.due_date ? new Date(a.due_date) : new Date(9999, 0, 1);
        const bDate = b.due_date ? new Date(b.due_date) : new Date(9999, 0, 1);
        return (priorityOrder[a.priority] - priorityOrder[b.priority]) || (aDate - bDate);
      }).map(r => renderCard(r)).join('')}
    ` : ''}

    <!-- Completed Reminders -->
    ${completed.length > 0 ? `
      <div class="reminders-group-title">Terminés <span class="reminders-group-count">${completed.length}</span></div>
      ${completed.map(r => renderCard(r)).join('')}
    ` : ''}

    ${reminders.length === 0 ? '<div class="reminders-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><p>Aucun rappel pour le moment</p></div>' : ''}
  `;
};

window.__createReminder = async function() {
  const title = document.getElementById('reminder-title').value.trim();
  if (!title) return;
  const due_date = document.getElementById('reminder-date').value || null;
  const priority = document.getElementById('reminder-priority').value;
  const description = document.getElementById('reminder-desc').value.trim() || null;

  await fetch('/api/admin/reminders', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, due_date, priority, description })
  });
  document.getElementById('reminder-title').value = '';
  document.getElementById('reminder-date').value = '';
  document.getElementById('reminder-desc').value = '';
  document.getElementById('reminder-priority').value = 'medium';
  window.__load_reminders();
};

window.__toggleReminder = async function(id, completed) {
  await fetch('/api/admin/reminders/' + id, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: !completed })
  });
  window.__load_reminders();
};

window.__deleteReminder = async function(id) {
  if (!confirm('Supprimer ce rappel ?')) return;
  await fetch('/api/admin/reminders/' + id, { method: 'DELETE', credentials: 'include' });
  window.__load_reminders();
};

window.__filterReminders = function(filter, btn) {
  document.querySelectorAll('.section-filters .section-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.reminder-card').forEach(card => {
    const isCompleted = card.dataset.completed === 'true';
    const isOverdue = card.classList.contains('overdue');
    if (filter === 'all') { card.style.display = ''; return; }
    if (filter === 'pending') { card.style.display = isCompleted ? 'none' : ''; return; }
    if (filter === 'overdue') { card.style.display = (!isCompleted && isOverdue) ? '' : 'none'; return; }
    if (filter === 'completed') { card.style.display = isCompleted ? '' : 'none'; return; }
  });
  // Show/hide group titles
  document.querySelectorAll('.reminders-group-title').forEach(title => {
    title.style.display = filter === 'all' ? '' : 'none';
  });
};
