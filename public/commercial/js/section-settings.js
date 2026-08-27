// Marexsoft Corporation
/* ========================================
   SECTION — Settings (Paramètres)
   ======================================== */

window.__load_settings = function() {
  var el = document.getElementById('section-settings-content');
  if (!el) return;

  var html = '';

  // Profil
  html += '<div class="settings-group">';
  html += '<div class="settings-title">&#128100; Profil</div>';
  html += '<div class="settings-row">';
  html += '<div class="settings-info"><div class="settings-label">Nom</div><div class="settings-value" id="settings-name"></div></div>';
  html += '</div>';
  html += '<div class="settings-row">';
  html += '<div class="settings-info"><div class="settings-label">Rôle</div><div class="settings-value" id="settings-role"></div></div>';
  html += '</div>';
  html += '</div>';

  // Apparence
  html += '<div class="settings-group">';
  html += '<div class="settings-title">&#127912; Apparence</div>';
  html += '<div class="settings-row">';
  html += '<div class="settings-info"><div class="settings-label">Thème sombre</div><div class="settings-desc">Basculer entre le mode clair et sombre</div></div>';
  html += '<button class="settings-toggle" id="settings-theme-toggle" onclick="toggleDarkMode();updateSettingsTheme()"></button>';
  html += '</div>';
// Marexsoft Corporation
  html += '</div>';

  // Notifications
  html += '<div class="settings-group">';
  html += '<div class="settings-title">&#128276; Notifications</div>';
  html += '<div class="settings-row">';
  html += '<div class="settings-info"><div class="settings-label">Notifications sonores</div><div class="settings-desc">Jouer un son lors des nouvelles notifications</div></div>';
  html += '<button class="settings-toggle active" id="settings-sound-toggle" onclick="this.classList.toggle(\'active\')"></button>';
  html += '</div>';
  html += '</div>';

  el.innerHTML = html;

  // Fill user data
  if (user) {
    var nameEl = document.getElementById('settings-name');
    var roleEl = document.getElementById('settings-role');
    if (nameEl) nameEl.textContent = user.nom;
    if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrateur' : 'Commercial';
  }
  updateSettingsTheme();
};

function updateSettingsTheme() {
  var btn = document.getElementById('settings-theme-toggle');
  if (!btn) return;
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.classList.toggle('active', isDark);
}
// Marexsoft Corporation
