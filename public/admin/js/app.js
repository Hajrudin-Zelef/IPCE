import { checkAuth, getUser, logout } from './auth.js';
import { fetchJSON } from './api.js';
import { renderKPI, selectKPI, closeDetailPanel } from './kpi.js';
import { renderLeaderboard } from './leaderboard.js';
import { renderCharts } from './charts.js';
import { loadPending, approveCollecte, rejectCollecte } from './validation.js';
import { renderInsights } from './insights.js';
import { initExport } from './export.js';
import { animateCounters, initFadeIn } from './animations.js';

let currentUsers = [];
let currentTotals = {};

async function loadStats() {
  try {
    const { users, totals } = await fetchJSON('/api/admin/stats');
    currentUsers = users;
    currentTotals = totals;

    renderKPI(totals);
    renderLeaderboard(users);
    renderCharts(users, totals);
    renderInsights(users, totals);

    setupKPIClicks();
    animateCounters();
  } catch {
    console.error('Erreur chargement stats');
  }
}

function setupKPIClicks() {
  document.querySelectorAll('.kpi-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.kpi;
      selectKPI(key, currentUsers, currentTotals);
    });
  });
}

function setupHeader() {
  const user = getUser();
  if (!user) return;

  const nameEl = document.getElementById('user-name');
  const dateEl = document.getElementById('date');
  const avatarEl = document.getElementById('user-avatar');

  if (nameEl) nameEl.textContent = user.nom;
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (avatarEl) {
    const initials = user.nom.split('').filter(c => c.match(/[A-ZÀ-Ü]/i)).slice(0, 2).join('').toUpperCase();
    avatarEl.textContent = initials;
  }
}

function showApp() {
  const loading = document.getElementById('loading');
  const app = document.getElementById('app');
  if (loading) loading.style.display = 'none';
  if (app) app.style.display = 'block';
}

async function init() {
  const user = await checkAuth();
  if (!user) return;

  showApp();
  setupHeader();
  initExport();
  initFadeIn();

  await loadStats();
  await loadPending();

  setInterval(loadPending, 30000);
}

window.__selectKPI = (key) => selectKPI(key, currentUsers, currentTotals);
window.__closeDetailPanel = closeDetailPanel;
window.__approveCollecte = approveCollecte;
window.__rejectCollecte = rejectCollecte;
window.__reloadStats = loadStats;
window.__logout = logout;

init();
