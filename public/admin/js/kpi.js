// Marexsoft Corporation
import { escapeHtml } from './api.js';

let activeKPI = null;

const KPI_CONFIG = {
  ca: {
    label: 'CA Equipe',
    icon: '💰',
    color: '#E31C23',
    bg: 'rgba(37, 99, 235, 0.08)',
    format: (v) => (v / 1e6).toFixed(1) + 'M',
    objectif: 1e8,
    objectifLabel: '100M',
  },
  offres: {
    label: 'Offres',
    icon: '📋',
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.08)',
    format: (v) => v,
    objectif: 6,
    objectifLabel: '6',
  },
  bc: {
    label: 'BC Signes',
    icon: '✅',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.08)',
    format: (v) => v,
    objectif: 6,
    objectifLabel: '6',
  },
  rdv: {
    label: 'RDV Totaux',
    icon: '🤝',
    color: '#DC2626',
    bg: 'rgba(220, 38, 38, 0.08)',
    format: (v) => v,
    objectif: 6,
    objectifLabel: '6',
  },
};

function getTrend(value, objectif) {
  if (objectif === 0) return { text: '—', cls: 'neutral', arrow: '' };
  const pct = (value / objectif) * 100;
  if (pct >= 100) return { text: `+${(pct - 100).toFixed(0)}% vs objectif`, cls: 'up', arrow: 'M7 17l5-5 5 5M7 7l5 5 5-5' };
  if (pct >= 70) return { text: `${pct.toFixed(0)}% objectif`, cls: 'neutral', arrow: '' };
  return { text: `${pct.toFixed(0)}% objectif`, cls: 'down', arrow: 'M7 7l5 5 5-5M7 17l5-5 5 5' };
}

function getStatus(value, thresholds) {
  if (value >= thresholds.ok) return { text: 'OK', cls: 'badge-ok' };
  if (value >= thresholds.warn) return { text: 'Suivi', cls: 'badge-warn' };
  return { text: 'Alerte', cls: 'badge-ko' };
}

function getStatusThresholds(key) {
  const map = {
    ca: { ok: 1e8, warn: 7e7 },
    offres: { ok: 6, warn: 4 },
    bc: { ok: 6, warn: 4 },
    rdv: { ok: 6, warn: 4 },
  };
  return map[key];
}

function renderDonut(pct, color) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return `
    <div class="kpi-donut">
      <svg viewBox="0 0 72 72">
        <circle class="kpi-donut-bg" cx="36" cy="36" r="${radius}"/>
        <circle class="kpi-donut-fill" cx="36" cy="36" r="${radius}"
          stroke="${color}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference}"
          data-target-offset="${offset}"/>
      </svg>
      <div class="kpi-donut-center">${Math.round(pct)}%</div>
    </div>
  `;
}

function renderKPICard(key, value) {
  const cfg = KPI_CONFIG[key];
  const pct = cfg.objectif > 0 ? Math.min((value / cfg.objectif) * 100, 100) : 0;
  const trend = getTrend(value, cfg.objectif);
  const status = getStatus(value, getStatusThresholds(key));

  return `
    <div class="kpi-card hover-lift animate-fade-in-up delay-${Object.keys(KPI_CONFIG).indexOf(key) + 1}"
         data-kpi="${key}"
         style="--kpi-color: ${cfg.color}; --kpi-bg: ${cfg.bg};"
         onclick="window.__selectKPI('${key}')">
      <div class="kpi-card-top">
        <div class="kpi-card-left">
          <div class="kpi-icon">${cfg.icon}</div>
          <div class="kpi-label">${cfg.label}</div>
          <div class="kpi-value">${cfg.format(value)}</div>
          <div class="kpi-trend ${trend.cls}">
            ${trend.arrow ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${trend.arrow}"/></svg>` : ''}
            ${trend.text}
          </div>
        </div>
        <div class="kpi-card-right">
          ${renderDonut(pct, cfg.color)}
        </div>
      </div>
      <div class="kpi-bottom">
        <div class="kpi-progress">
          <div class="kpi-progress-bar" style="width: 0%; background: ${cfg.color};" data-target-width="${pct}%"></div>
        </div>
        <span class="kpi-status badge ${status.cls}">${status.text}</span>
      </div>
    </div>
  `;
}

export function renderKPI(totals) {
  const grid = document.getElementById('kpi-grid');
  if (!grid) return;
  grid.innerHTML = Object.keys(KPI_CONFIG)
    .map(key => renderKPICard(key, totals[key] || 0))
    .join('');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.kpi-donut-fill').forEach(circle => {
        const target = circle.dataset.targetOffset;
        if (target !== undefined) circle.style.strokeDashoffset = target;
      });
      document.querySelectorAll('.kpi-progress-bar').forEach(bar => {
        const target = bar.dataset.targetWidth;
        if (target) bar.style.width = target;
      });
// Marexsoft Corporation
    });
  });
}

export function selectKPI(key, users, totals) {
  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector(`[data-kpi="${key}"]`);
  if (card) card.classList.add('active');

  activeKPI = key;
  renderDetailPanel(key, users, totals);
  openDetailPanel();
}

function openDetailPanel() {
  const panel = document.getElementById('detail-panel');
  const overlay = document.getElementById('detail-overlay');
  if (panel) panel.classList.add('open');
  if (overlay) {
    overlay.classList.add('visible');
    overlay.onclick = closeDetailPanel;
  }
  document.addEventListener('keydown', handleEscape);
}

export function closeDetailPanel() {
  const panel = document.getElementById('detail-panel');
  const overlay = document.getElementById('detail-overlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
  document.removeEventListener('keydown', handleEscape);
  activeKPI = null;
}

function handleEscape(e) {
  if (e.key === 'Escape') closeDetailPanel();
}

function renderDetailPanel(key, users, totals) {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;

  const cfg = KPI_CONFIG[key];
  const value = totals[key] || 0;
  const pct = cfg.objectif > 0 ? ((value / cfg.objectif) * 100).toFixed(0) : 0;
  const sorted = [...users].sort((a, b) => b[key] - a[key]);
  const leader = sorted[0];
  const leaderPct = leader && leader[key] > 0 ? ((leader[key] / value) * 100).toFixed(0) : 0;

  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const dailyRate = dayOfMonth > 0 ? value / dayOfMonth : 0;
  const projection = value + dailyRate * daysLeft;

  const trend = pct >= 100 ? 'Favorable' : pct >= 70 ? 'En cours' : 'Defavorable';

  const insights = {
    ca: `Le CA progresse fortement grace a l'augmentation du taux de conversion sur les leads entrants.`,
    offres: `Total offres : ${value}. Objectif : ${cfg.objectifLabel}.`,
    bc: `Bon taux de conversion. ${value} BC sur ${totals.offres || 0} offres.`,
    rdv: `${value} rendez-vous identifies. Pipeline en cours de developpement.`,
  };

  panel.classList.remove('empty-state');
  panel.innerHTML = `
    <div class="detail-panel-head">
      <div class="detail-panel-head-left">
        <div class="detail-panel-icon" style="background: ${cfg.bg}; color: ${cfg.color};">${cfg.icon}</div>
        <div>
          <div class="detail-panel-title">${cfg.label}</div>
          <div class="detail-panel-subtitle">${pct}% de l'objectif</div>
        </div>
      </div>
      <button class="detail-panel-close" onclick="window.__closeDetailPanel()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="detail-panel-body">
      <div class="detail-metrics">
        <div class="detail-metric">
          <div class="detail-metric-label">Valeur</div>
          <div class="detail-metric-value">${cfg.format(value)}</div>
        </div>
        <div class="detail-metric">
          <div class="detail-metric-label">Objectif</div>
          <div class="detail-metric-value">${cfg.objectifLabel}</div>
        </div>
        <div class="detail-metric">
          <div class="detail-metric-label">Realisation</div>
          <div class="detail-metric-value">${pct}%</div>
        </div>
        <div class="detail-metric">
          <div class="detail-metric-label">Evolution</div>
          <div class="detail-metric-value" style="color: ${pct >= 70 ? 'var(--success)' : 'var(--danger)'};">${pct >= 70 ? '+' : ''}${(pct - 100).toFixed(0)}%</div>
        </div>
        <div class="detail-metric">
          <div class="detail-metric-label">Projection Fin Mois</div>
          <div class="detail-metric-value">${cfg.format(projection)}</div>
        </div>
        <div class="detail-metric">
          <div class="detail-metric-label">Top Commercial</div>
          <div class="detail-metric-value">${leader ? escapeHtml(leader.nom) : '—'}</div>
        </div>
        <div class="detail-metric">
          <div class="detail-metric-label">Contribution</div>
          <div class="detail-metric-value">${leaderPct}%</div>
        </div>
        <div class="detail-metric">
          <div class="detail-metric-label">Tendance</div>
          <div class="detail-metric-value" style="color: ${trend === 'Favorable' ? 'var(--success)' : trend === 'En cours' ? 'var(--warning)' : 'var(--danger)'};">${trend}</div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Drilldown</div>
        <div class="detail-drilldown">
          ${sorted.map(u => `
            <div class="detail-drilldown-row">
              <span class="detail-drilldown-name">${escapeHtml(u.nom)}</span>
              <span class="detail-drilldown-value">${cfg.format(u[key])}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Analyse IA</div>
        <div class="detail-insight">${insights[key]}</div>
      </div>
      <div class="detail-actions">
        <button class="btn-detail-primary" onclick="window.__exportEditorialPDF()">Exporter PDF</button>
        <button class="btn-detail-secondary" onclick="window.__exportEditorialXLSX()">Exporter CSV</button>
      </div>
    </div>
  `;
}

export function getActiveKPI() {
  return activeKPI;
}
// Marexsoft Corporation
