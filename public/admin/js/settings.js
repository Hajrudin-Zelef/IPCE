window.__load_settings = async function() {
  const settings = await loadSectionData('/api/admin/settings');
  if (!settings) return renderEmpty('section-settings-content', 'Erreur de chargement');

  const el = document.getElementById('section-settings-content');
  el.innerHTML = `
    <div class="settings-grid">
      <div class="settings-card">
        <h3>📊 Objectifs</h3>
        <div class="settings-field">
          <label>Objectif CA mensuel (FCFA)</label>
          <input type="number" id="set-ca-objectif" value="${settings.ca_objectif || 100000000}">
        </div>
        <div class="settings-field">
          <label>Objectif Offres mensuelles</label>
          <input type="number" id="set-offres-objectif" value="${settings.offres_objectif || 6}" min="1">
        </div>
        <div class="settings-field">
          <label>Objectif BC mensuels</label>
          <input type="number" id="set-bc-objectif" value="${settings.bc_objectif || 6}" min="1">
        </div>
        <div class="settings-field">
          <label>Objectif RDV mensuels</label>
          <input type="number" id="set-rdv-objectif" value="${settings.rdv_objectif || 6}" min="1">
        </div>
      </div>
      <div class="settings-card">
        <h3>🎨 Apparence</h3>
        <div class="settings-toggle">
          <span class="settings-toggle-label">Mode sombre</span>
          <div class="toggle-switch ${settings.theme === 'dark' ? 'active' : ''}" id="set-theme-toggle" onclick="window.__toggleTheme()"></div>
        </div>
      </div>
      <div class="settings-card">
        <h3>🔔 Notifications</h3>
        <div class="settings-toggle">
          <span class="settings-toggle-label">Notifications activées</span>
          <div class="toggle-switch ${settings.notifications_enabled === 'true' ? 'active' : ''}" id="set-notif-toggle" onclick="window.__toggleNotif()"></div>
        </div>
      </div>
    </div>
    <div style="margin-top:20px">
      <button class="settings-save-btn" onclick="window.__saveSettings()">Sauvegarder</button>
    </div>
  `;
};

window.__toggleTheme = function() {
  const toggle = document.getElementById('set-theme-toggle');
  toggle.classList.toggle('active');
};

window.__toggleNotif = function() {
  const toggle = document.getElementById('set-notif-toggle');
  toggle.classList.toggle('active');
};

window.__saveSettings = async function() {
  const ca_objectif = document.getElementById('set-ca-objectif').value;
  const offres_objectif = document.getElementById('set-offres-objectif').value;
  const bc_objectif = document.getElementById('set-bc-objectif').value;
  const rdv_objectif = document.getElementById('set-rdv-objectif').value;
  const theme = document.getElementById('set-theme-toggle').classList.contains('active') ? 'dark' : 'light';
  const notifications_enabled = document.getElementById('set-notif-toggle').classList.contains('active') ? 'true' : 'false';

  await fetch('/api/admin/settings', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ca_objectif, offres_objectif, bc_objectif, rdv_objectif, theme, notifications_enabled })
  });

  document.documentElement.setAttribute('data-theme', theme);
  alert('Paramètres sauvegardés');
};