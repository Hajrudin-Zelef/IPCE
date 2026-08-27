import { escapeHtml } from './api.js';

function getInitials(name) {
  return name.split('').filter(c => c.match(/[A-ZÀ-Ü]/i)).slice(0, 2).join('').toUpperCase();
}

function getConversion(user) {
  if (user.rdvCount === 0) return 0;
  return ((user.offres / user.rdvCount) * 100).toFixed(0);
}

function renderLeaderCard(user, index, totalCA) {
  const conv = getConversion(user);
  const caPct = totalCA > 0 ? ((user.ca / totalCA) * 100).toFixed(0) : 0;
  const isTop = index === 0 && user.ca > 0;

  return `
    <div class="leader-card ${isTop ? 'top' : ''} hover-lift animate-fade-in-up delay-${index + 1}">
      <div class="leader-header">
        <div class="leader-avatar color-${index % 4}">${escapeHtml(getInitials(user.nom))}</div>
        <div class="leader-info">
          <div class="leader-name">${escapeHtml(user.nom)}</div>
          ${isTop ? '<span class="leader-badge top-performer">🏆 Top Performer</span>' : ''}
        </div>
      </div>
      <div class="leader-metrics">
        <div class="leader-metric">
          <div class="leader-metric-value">${(user.ca / 1e6).toFixed(1)}M</div>
          <div class="leader-metric-label">CA</div>
        </div>
        <div class="leader-metric">
          <div class="leader-metric-value">${user.offres}</div>
          <div class="leader-metric-label">Offres</div>
        </div>
        <div class="leader-metric">
          <div class="leader-metric-value">${user.rdvCount}</div>
          <div class="leader-metric-label">RDV</div>
        </div>
      </div>
      <div class="leader-progress-section">
        <div class="leader-progress-header">
          <span class="leader-progress-label">Conversion RDV → Offre</span>
          <span class="leader-progress-value">${conv}%</span>
        </div>
        <div class="leader-progress">
          <div class="leader-progress-bar" style="width: ${Math.min(conv, 100)}%;"></div>
        </div>
      </div>
    </div>
  `;
}

export function renderLeaderboard(users) {
  const container = document.getElementById('leaderboard');
  if (!container) return;

  const totalCA = users.reduce((s, u) => s + u.ca, 0);
  const sorted = [...users].sort((a, b) => b.ca - a.ca);

  container.innerHTML = `
    <div class="section-title animate-fade-in">Performance par Commercial</div>
    <div class="leaderboard-grid">
      ${sorted.map((u, i) => renderLeaderCard(u, i, totalCA)).join('')}
    </div>
  `;
}
