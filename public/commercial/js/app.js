// Marexsoft Corporation
/* ========================================
   DASHBOARD — App Core
   Auth, Avatar, API Helper, Dark Mode
   ======================================== */

let user = null;

function api(method, url, body) {
  const opts = { method: method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts);
}

// HTML-escape user-controlled values before injecting them via innerHTML.
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) { window.location.href = '/'; return; }
    const data = await res.json();
    if (data.user.must_change_password) { window.location.href = '/'; return; }
    user = data.user;

    // Avatar
    const initial = getInitial(user.nom);
    const avatarEl = document.getElementById('user-avatar');
    const dropdownAvatarEl = document.getElementById('dropdown-avatar');
    const dropdownNameEl = document.getElementById('dropdown-name');
    const dropdownRoleEl = document.getElementById('dropdown-role');
    if (avatarEl) avatarEl.textContent = initial;
    if (dropdownAvatarEl) dropdownAvatarEl.textContent = initial;
    if (dropdownNameEl) dropdownNameEl.textContent = user.nom;
    if (dropdownRoleEl) dropdownRoleEl.textContent = user.role === 'admin' ? 'Administrateur' : 'Commercial';

    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = '';

    // Set date
    var dateEl = document.getElementById('header-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Move notification bell into content header (all viewports)
    setTimeout(function() {
      var notifWrapper = document.querySelector('.notif-fixed-wrapper');
      var headerRight = document.querySelector('.content-header-right');
      if (notifWrapper && headerRight) {
        headerRight.appendChild(notifWrapper);
        notifWrapper.style.position = 'static';
        notifWrapper.style.zIndex = 'auto';
        notifWrapper.style.top = 'auto';
        notifWrapper.style.right = 'auto';
      }
    }, 300);

    // Always force dashboard as default section
    // Clear any hash from URL to prevent docs persistence
    var hash = window.location.hash.replace('#', '');
    var validSections = ['dashboard', 'collecte', 'history', 'calendar', 'docs', 'settings'];

// Marexsoft Corporation
    // Only honor hash if it's a valid section (but NEVER default to docs)
    if (hash && validSections.indexOf(hash) !== -1 && hash !== 'docs') {
      localStorage.setItem('commercial_section', hash);
    } else {
      localStorage.setItem('commercial_section', 'dashboard');
    }

    // Clear the hash from URL to prevent persistence on reload
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }

    // Init sidebar navigation (loads the section)
    if (typeof switchSection === 'function') {
      var targetSection = localStorage.getItem('commercial_section') || 'dashboard';
      // Safety: never show docs as default
      if (targetSection === 'docs') targetSection = 'dashboard';
      switchSection(targetSection);
    }
  } catch {
    window.location.href = '/';
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/';
}

// --- User Menu ---
function toggleUserMenu() {
  var dd = document.getElementById('user-dropdown');
  dd.classList.toggle('open');
}

function closeUserMenu() {
  var dd = document.getElementById('user-dropdown');
  dd.classList.remove('open');
}

document.addEventListener('click', function(e) {
  var menu = document.querySelector('.user-avatar-menu');
  var dd = document.getElementById('user-dropdown');
  if (menu && dd && !menu.contains(e.target)) {
    dd.classList.remove('open');
  }
});

// --- Dark Mode ---
function initDarkMode() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateDarkIcon(saved);
}

function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateDarkIcon(next);
}

function updateDarkIcon(theme) {
  const btn = document.getElementById('dark-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '\u2600️' : '\uD83C\uDF19';
}

// --- Init ---
initDarkMode();
checkAuth();
// Marexsoft Corporation
