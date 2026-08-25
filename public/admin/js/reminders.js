window.__load_reminders = async function() {
  const reminders = await loadSectionData('/api/admin/reminders');
  if (reminders === null) return renderEmpty('section-reminders-content', 'Erreur de chargement');

  const el = document.getElementById('section-reminders-content');
  el.innerHTML = `
    <div class="reminder-create-form">
      <div class="reminder-form-row">
        <input type="text" id="reminder-title" placeholder="Titre du rappel...">
        <input type="datetime-local" id="reminder-date">
        <select id="reminder-priority">
          <option value="low">Faible</option>
          <option value="medium" selected>Moyen</option>
          <option value="high">Urgent</option>
        </select>
        <button class="section-filter active" onclick="window.__createReminder()">Créer</button>
      </div>
      <div class="reminder-form-row">
        <textarea id="reminder-desc" placeholder="Description (optionnel)..."></textarea>
      </div>
    </div>
    <div id="reminders-list">
      ${reminders.length === 0 ? '<div class="section-empty"><p>Aucun rappel</p></div>' :
        reminders.map(r => `
          <div class="reminder-card ${r.completed ? 'completed' : ''}" data-id="${r.id}">
            <div class="reminder-priority ${r.priority}"></div>
            <div class="reminder-content">
              <div class="reminder-title">${r.title}</div>
              ${r.description ? `<div style="font-size:12px;color:var(--muted);margin-bottom:4px">${r.description}</div>` : ''}
              <div class="reminder-date">${r.due_date ? formatDate(r.due_date) : 'Pas de date'}</div>
            </div>
            <div class="reminder-actions">
              <button class="reminder-btn" onclick="window.__toggleReminder(${r.id}, ${r.completed})" title="${r.completed ? 'Annuler' : 'Terminé'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button class="reminder-btn danger" onclick="window.__deleteReminder(${r.id})" title="Supprimer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </div>
        `).join('')}
    </div>
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
