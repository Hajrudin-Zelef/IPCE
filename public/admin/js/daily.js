/* ========================================
   VUE JOURNALIÈRE — Donuts animés + Calendrier journalier
   Données : /api/collectes/all (admin) — tout est ramené au JOUR
   ======================================== */

(function() {
  'use strict';

  let dailyData = [];
  const dailyCharts = [];

  let calYear = null;
  let calMonth = null; // 0-based
  let selectedDay = null; // 'YYYY-MM-DD'
  let currentView = localStorage.getItem('daily_lastcols_view') || 'list';

  const PALETTE = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316'];
  const comColors = PALETTE;
  const comIndex = {}; // commercial -> index couleur

  // --- Utilitaires ---
  function pad(n) { return String(n).padStart(2, '0'); }

  function localKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function dayOf(c) {
    return (c.created_at || '').slice(0, 10);
  }

  function norm(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function initial(nom) {
    return (nom || '?').charAt(0).toUpperCase();
  }

  function timeAgo(dtStr) {
    if (!dtStr) return '';
    const then = new Date(String(dtStr).replace(' ', 'T'));
    const mins = Math.floor((Date.now() - then.getTime()) / 60000);
    if (isNaN(mins)) return '';
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return 'il y a ' + mins + ' min';
    const h = Math.floor(mins / 60);
    if (h < 24) return 'il y a ' + h + 'h';
    const d = Math.floor(h / 24);
    return d === 1 ? 'hier' : 'il y a ' + d + ' jours';
  }

  function monthLabel(y, m) {
    return new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  function longDateLabel(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Plugin centre de donut
  function centerText(text, sub) {
    return {
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const x = (chartArea.left + chartArea.right) / 2;
        const yTop = (chartArea.top + chartArea.bottom) / 2 - 6;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 18px Inter, sans-serif';
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#111';
        ctx.fillText(text, x, yTop);
        if (sub) {
          ctx.font = '600 10px Inter, sans-serif';
          ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#888';
          ctx.fillText(sub, x, yTop + 16);
        }
        ctx.restore();
      }
    };
  }

  function makeDonut(canvasId, labels, values, colors, centerTxt, centerSub, subLabelFn) {
    const el = document.getElementById(canvasId);
    if (!el || !values.some(v => v > 0)) {
      if (el && el.parentNode) {
        el.parentNode.innerHTML = '<div class="daily-empty">Aucune donnée aujourd\'hui</div>';
      }
      return;
    }
    dailyCharts.push(new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card') || '#fff',
          hoverOffset: 12,
          spacing: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        animation: { animateRotate: true, animateScale: true, duration: 1200, easing: 'easeOutQuart' },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, padding: 10, font: { size: 10, weight: '600' }, usePointStyle: true, pointStyle: 'circle' } },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.92)',
            padding: 10, cornerRadius: 8, displayColors: true,
            callbacks: subLabelFn ? { label: subLabelFn } : {}
          }
        }
      },
      plugins: [centerText(centerTxt, centerSub)]
    }));
  }

  // --- Rendu principal ---
  window.__load_daily = async function() {
    const el = document.getElementById('section-daily-content');
    if (!el) return;

    try {
      const res = await loadSectionData('/api/collectes/all');
      if (!Array.isArray(res)) throw new Error('no-data');
      dailyData = res;
    } catch (e) {
      el.innerHTML = '<div class="daily-empty">Erreur de chargement des données</div>';
      return;
    }

    while (dailyCharts.length) { try { dailyCharts.pop().destroy(); } catch {} }

    // Données du JOUR uniquement
    const today = localKey(new Date());
    const rows = dailyData.filter(c => dayOf(c) === today);

    // Agrégats du jour
    let totalCA = 0, totalRdv = 0, totalVisites = 0, totalContacts = 0;
    const caByCom = {}, statutCount = {}, rdvStatut = {};
    rows.forEach(c => {
      totalCA += c.ca || 0;
      totalVisites += c.visites || 0;
      totalContacts += c.contacts || 0;
      caByCom[c.commercial] = (caByCom[c.commercial] || 0) + (c.ca || 0);
      statutCount[norm(c.statut)] = (statutCount[norm(c.statut)] || 0) + 1;
      (c.rdvs || []).forEach(r => {
        totalRdv++;
        const k = norm(r.statut);
        rdvStatut[k] = (rdvStatut[k] || 0) + 1;
      });
    });

    // Commerciaux : dernière saisie (toutes dates confondues), tri récent -> ancien
    const latestByCom = {};
    dailyData.forEach(c => {
      const com = c.commercial;
      if (!latestByCom[com] || (c.created_at || '') > (latestByCom[com].created_at || '')) {
        latestByCom[com] = c;
      }
    });
    const recentComs = Object.values(latestByCom)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 8);

    // --- HTML ---
    let html = '';

    html += '<div class="daily-chips">'
      + '<div class="daily-chip"><div class="daily-chip-icon ca">💰</div><div><div class="daily-chip-value">' + (totalCA / 1e6).toFixed(1) + 'M</div><div class="daily-chip-label">CA aujourd\'hui</div></div></div>'
      + '<div class="daily-chip"><div class="daily-chip-icon col">📋</div><div><div class="daily-chip-value">' + rows.length + '</div><div class="daily-chip-label">Collectes du jour</div></div></div>'
      + '<div class="daily-chip"><div class="daily-chip-icon rdv">📅</div><div><div class="daily-chip-value">' + totalRdv + '</div><div class="daily-chip-label">RDV du jour</div></div></div>'
      + '<div class="daily-chip"><div class="daily-chip-icon vis">👣</div><div><div class="daily-chip-value">' + (totalVisites + totalContacts) + '</div><div class="daily-chip-label">Visites + Contacts</div></div></div>'
      + '</div>';

    html += '<div class="daily-donuts">';
    html += '<div class="daily-donut-card"><div class="daily-donut-title">CA par Commercial <span style="font-size:11px;color:var(--muted);font-weight:600">Aujourd\'hui</span></div><div class="daily-donut-sub">Part du chiffre d\'affaires du jour</div><div class="daily-donut-wrap"><canvas id="daily-dn-ca"></canvas></div></div>';
    html += '<div class="daily-donut-card"><div class="daily-donut-title">Statut des Collectes <span style="font-size:11px;color:var(--muted);font-weight:600">Aujourd\'hui</span></div><div class="daily-donut-sub">Brouillons, validées, approuvées…</div><div class="daily-donut-wrap"><canvas id="daily-dn-statut"></canvas></div></div>';
    html += '<div class="daily-donut-card"><div class="daily-donut-title">Pipeline RDV <span style="font-size:11px;color:var(--muted);font-weight:600">Aujourd\'hui</span></div><div class="daily-donut-sub">Prévu → Réalisé → Offre → BC Signé</div><div class="daily-donut-wrap"><canvas id="daily-dn-rdv"></canvas></div></div>';
    html += '<div class="daily-donut-card"><div class="daily-donut-title">Activité Terrain <span style="font-size:11px;color:var(--muted);font-weight:600">Aujourd\'hui</span></div><div class="daily-donut-sub">Visites, contacts et rendez-vous</div><div class="daily-donut-wrap"><canvas id="daily-dn-act"></canvas></div></div>';
    html += '</div>';

    // Commerciaux les plus récents
    html += '<div class="daily-cal-card daily-recent">'
      + '<div class="daily-cal-header"><div class="daily-cal-title">🖊️ Dernières saisies par commercial</div>'
      + '<button class="daily-cal-btn today-btn" onclick="Daily.refresh()">↻ Actualiser</button></div>'
      + '<div class="daily-recent-list">';
    if (recentComs.length === 0) {
      html += '<div class="daily-empty">Aucune collecte enregistrée pour le moment.</div>';
    } else {
      recentComs.forEach((c, idx) => {
        const isToday = dayOf(c) === today;
        html += '<div class="daily-collecte-item" style="animation-delay:' + (idx * 60) + 'ms">'
          + '<div class="daily-collecte-top">'
          + '<div class="daily-collecte-avatar">' + esc(initial(c.commercial)) + '</div>'
          + '<div><div class="daily-collecte-name">' + esc(c.commercial) + '</div>'
          + '<div class="daily-collecte-time">' + esc(timeAgo(c.created_at)) + ' · ' + esc(formatDate(c.created_at))
          + (isToday ? ' <span style="color:var(--success);font-weight:700">· saisi aujourd\'hui ✓</span>' : '')
          + '</div></div>'
          + '<div class="daily-collecte-badges">'
          + (c.zone ? '<span class="daily-badge-zone">' + esc(c.zone) + '</span>' : '')
          + '<span class="daily-badge-statut ' + norm(c.statut) + '">' + esc(c.statut) + '</span>'
          + '</div></div>'
          + '<div class="daily-collecte-metrics">'
          + '<span>CA <b>' + formatCA(c.ca || 0) + '</b></span>'
          + '<span>Offres <b>' + (c.offres || 0) + '</b></span>'
          + '<span>BC <b>' + (c.bc || 0) + '</b></span>'
          + '<span>RDV <b>' + ((c.rdvs || []).length) + '</b></span>'
          + '</div></div>';
      });
    }
    html += '</div></div>';

    // Calendrier
    html += '<div class="daily-cal-card">'
      + '<div class="daily-cal-header">'
      + '<div class="daily-cal-title" id="daily-cal-title"></div>'
      + '<div class="daily-cal-nav">'
      + '<button class="daily-cal-btn" onclick="Daily.prevMonth()" title="Mois précédent">‹</button>'
      + '<button class="daily-cal-btn today-btn" onclick="Daily.goToday()">Aujourd\'hui</button>'
      + '<button class="daily-cal-btn" onclick="Daily.nextMonth()" title="Mois suivant">›</button>'
      + '</div></div>'
      + '<div class="daily-cal-grid" id="daily-cal-grid"></div>'
      + '<div class="daily-detail" id="daily-detail"></div>'
      + '</div>';

    // Dernières collectes (toutes dates) — liste chronologique
    const lastCols = dailyData.slice()
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 10);

    html += '<div class="daily-cal-card daily-recent">'
      + '<div class="daily-cal-header"><div class="daily-cal-title">📜 Dernières collectes</div>'
      + '<div style="display:flex;align-items:center;gap:6px;">'
      + '<div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;">'
      + '<button onclick="Daily.setView(\'list\')" style="padding:3px 8px;border:none;background:' + (currentView === 'list' ? 'var(--primary)' : 'var(--bg)') + ';color:' + (currentView === 'list' ? '#fff' : 'var(--text)') + ';cursor:pointer;font-size:11px;font-family:inherit;border-right:1px solid var(--border);" title="Liste">☰</button>'
      + '<button onclick="Daily.setView(\'grid\')" style="padding:3px 8px;border:none;background:' + (currentView === 'grid' ? 'var(--primary)' : 'var(--bg)') + ';color:' + (currentView === 'grid' ? '#fff' : 'var(--text)') + ';cursor:pointer;font-size:11px;font-family:inherit;" title="Grille">⊞</button>'
      + '</div>'
      + '<button class="daily-cal-btn today-btn" onclick="Daily.refresh()">↻ Actualiser</button></div></div>';
    if (currentView === 'grid') {
      html += '<div style="padding:10px 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">';
    } else {
      html += '<div class="daily-recent-list">';
    }
    if (lastCols.length === 0) {
      html += '<div class="daily-empty">Aucune collecte enregistrée.</div>';
    } else {
      lastCols.forEach((c, idx) => {
        const isToday = dayOf(c) === today;
        const statusColors = {
          'brouillon': 'background:rgba(148,163,184,0.15);color:#64748b;',
          'validee': 'background:rgba(245,158,11,0.15);color:#d97706;',
          'approuvee': 'background:rgba(16,185,129,0.15);color:#059669;',
          'rejetee': 'background:rgba(239,68,68,0.15);color:#dc2626;',
        };
        if (currentView === 'grid') {
          html += '<div style="background:var(--card);border:1px solid var(--border-light);border-radius:8px;padding:10px;">';
          html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><div class="daily-collecte-avatar" style="width:24px;height:24px;font-size:10px;">' + esc(initial(c.commercial)) + '</div><span style="font-size:11px;font-weight:700;">' + esc(c.commercial) + '</span>';
          html += '<span class="daily-badge-statut ' + norm(c.statut) + '" style="margin-left:auto;font-size:8px;padding:1px 5px;">' + esc(c.statut) + '</span></div>';
          html += '<div style="font-size:11px;color:var(--text);font-weight:600;">' + (c.ca / 1e6).toFixed(1) + 'M FCFA — ' + (c.offres || 0) + ' off — ' + (c.bc || 0) + ' BC — ' + (c.visites || 0) + ' vis — ' + (c.contacts || 0) + ' cont</div>';
          html += '<div style="font-size:9px;color:var(--muted);margin-top:4px;">' + (isToday ? 'aujourd\'hui' : esc(timeAgo(c.created_at))) + '</div>';
          html += '</div>';
        } else {
          html += '<div class="daily-collecte-item" style="animation-delay:' + (idx * 50) + 'ms">'
            + '<div class="daily-collecte-top" style="justify-content:space-between;">'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
            + '<div class="daily-collecte-avatar">' + esc(initial(c.commercial)) + '</div>'
            + '<span class="daily-collecte-name">' + esc(c.commercial) + '</span>'
            + (isToday ? '<span style="color:var(--success);font-weight:700;font-size:11px;">aujourd\'hui ✓</span>' : '<span style="color:var(--muted);font-size:11px;">' + esc(timeAgo(c.created_at)) + '</span>')
            + '</div>'
            + '<div style="font-size:13px;color:var(--text);font-weight:600;">'
            + (c.ca / 1e6).toFixed(1) + 'M FCFA — ' + (c.offres || 0) + ' offres — ' + (c.bc || 0) + ' BC — ' + (c.visites || 0) + ' vis. — ' + (c.contacts || 0) + ' contacts'
            + '</div></div>'
            + '<span class="daily-badge-statut ' + norm(c.statut) + '" style="align-self:flex-start;">' + esc(c.statut) + '</span>'
            + '</div></div>';
        }
      });
    }
    html += '</div></div>';

    el.innerHTML = html;

    // --- Donuts (données du jour) ---
    const comNames = Object.keys(caByCom).sort((a, b) => caByCom[b] - caByCom[a]);
    Object.keys(comIndex).forEach(k => delete comIndex[k]);
    comNames.forEach((n, i) => { comIndex[n] = i; });

    makeDonut('daily-dn-ca',
      comNames,
      comNames.map(n => Math.round(caByCom[n])),
      comNames.map(n => PALETTE[(comIndex[n]) % PALETTE.length]),
      formatCA(totalCA), 'FCFA',
      (ctx) => ' ' + ctx.label + ' : ' + formatCA(caByCom[ctx.label]) + ' FCFA');

    const STATUTS = [
      ['brouillon', 'Brouillon', '#94a3b8'],
      ['validee', 'Validée (à traiter)', '#f59e0b'],
      ['approuvee', 'Approuvée', '#10b981'],
      ['rejetee', 'Rejetée', '#ef4444'],
    ].filter(([k]) => statutCount[k]);
    makeDonut('daily-dn-statut',
      STATUTS.map(s => s[1]),
      STATUTS.map(s => statutCount[s[0]]),
      STATUTS.map(s => s[2]),
      String(rows.length), 'collectes');

    const RDVS = [
      ['prevu', 'Prévu', '#667eea'],
      ['realise', 'Réalisé', '#06b6d4'],
      ['offre', 'Offre', '#f59e0b'],
      ['bc signe', 'BC Signé', '#10b981'],
    ].filter(([k]) => rdvStatut[k]);
    makeDonut('daily-dn-rdv',
      RDVS.map(s => s[1]),
      RDVS.map(s => rdvStatut[s[0]]),
      RDVS.map(s => s[2]),
      String(totalRdv), 'rdvs');

    makeDonut('daily-dn-act',
      ['Visites', 'Contacts', 'RDV'],
      [totalVisites, totalContacts, totalRdv],
      ['#8b5cf6', '#ec4899', '#667eea'],
      String(totalVisites + totalContacts + totalRdv), 'actions');

    // --- Calendrier : ouvert sur le jour courant ---
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
    selectedDay = today;
    renderCalendar();
    renderDetail();
  };

  // --- Calendrier ---
  function collectesByDay() {
    const map = {};
    dailyData.forEach(c => {
      const k = dayOf(c);
      if (!k) return;
      (map[k] = map[k] || []).push(c);
    });
    return map;
  }

  function renderCalendar() {
    const titleEl = document.getElementById('daily-cal-title');
    const gridEl = document.getElementById('daily-cal-grid');
    if (!gridEl) return;

    titleEl.textContent = monthLabel(calYear, calMonth);

    const byDay = collectesByDay();
    const first = new Date(calYear, calMonth, 1);
    const startOffset = (first.getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    let html = '';
    ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].forEach(w => {
      html += '<div class="daily-cal-weekday">' + w + '</div>';
    });

    for (let i = 0; i < startOffset; i++) {
      html += '<div class="daily-cal-day other"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = calYear + '-' + pad(calMonth + 1) + '-' + pad(d);
      const crows = byDay[key] || [];
      const isToday = key === localKey(new Date());
      const cls = ['daily-cal-day'];
      if (key === selectedDay) cls.push('selected');
      if (isToday) cls.push('is-today');

      let inner = '<span class="daily-cal-day-num">' + d + '</span>';
      if (crows.length > 0) {
        const hasPending = crows.some(c => norm(c.statut) === 'validee');
        inner += '<span class="daily-cal-count' + (hasPending ? ' has-pending' : '') + '">' + crows.length + '</span>';
        inner += '<div class="daily-cal-dots">';
        crows.slice(0, 4).forEach((c, i) => {
          const ci = comIndex[c.commercial];
          const color = typeof ci === 'number' ? PALETTE[ci % PALETTE.length] : comColors[i % comColors.length];
          inner += '<span class="daily-cal-dot" style="background:' + color + '"></span>';
        });
        inner += '</div>';
      }
      html += '<button class="' + cls.join(' ') + '" onclick="Daily.select(\'' + key + '\')">' + inner + '</button>';
    }

    gridEl.innerHTML = html;
  }

  function renderDetail() {
    const el = document.getElementById('daily-detail');
    if (!el) return;
    const key = selectedDay;
    const drows = (collectesByDay()[key] || []).slice()
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

    let html = '<div class="daily-detail-title">' + esc(longDateLabel(key)) + ' <span class="daily-detail-count">' + drows.length + '</span></div>';

    if (drows.length === 0) {
      html += '<div class="daily-empty">Aucune collecte saisie ce jour-là.</div>';
      el.innerHTML = html;
      return;
    }

    html += '<div class="daily-collecte-list">';
    drows.forEach((c, idx) => {
      const t = (c.created_at || '').slice(11, 16);
      html += '<div class="daily-collecte-item" style="animation-delay:' + (idx * 60) + 'ms">'
        + '<div class="daily-collecte-top">'
        + '<div class="daily-collecte-avatar">' + esc(initial(c.commercial)) + '</div>'
        + '<div><div class="daily-collecte-name">' + esc(c.commercial) + '</div>'
        + (t ? '<div class="daily-collecte-time">Saisi à ' + esc(t) + '</div>' : '')
        + '</div>'
        + '<div class="daily-collecte-badges">'
        + (c.zone ? '<span class="daily-badge-zone">' + esc(c.zone) + '</span>' : '')
        + '<span class="daily-badge-statut ' + norm(c.statut) + '">' + esc(c.statut) + '</span>'
        + '</div></div>'
        + '<div class="daily-collecte-metrics">'
        + '<span>CA <b>' + formatCA(c.ca || 0) + '</b></span>'
        + '<span>Offres <b>' + (c.offres || 0) + '</b></span>'
        + '<span>BC <b>' + (c.bc || 0) + '</b></span>'
        + '<span>Visites <b>' + (c.visites || 0) + '</b></span>'
        + '<span>Contacts <b>' + (c.contacts || 0) + '</b></span>'
        + '</div>';

      if ((c.rdvs || []).length > 0) {
        html += '<div class="daily-prospects">';
        c.rdvs.forEach(r => {
          html += '<div class="daily-prospect-row">'
            + '<span>🤝</span>'
            + '<span class="daily-prospect-name">' + esc(r.prospect) + '</span>'
            + '<span class="daily-prospect-meta">' + esc(r.date || '') + ' · ' + formatCA(r.montant || 0) + 'M · ' + esc(r.statut) + '</span>'
            + '</div>';
        });
        html += '</div>';
      }

      if (c.notes) {
        html += '<div style="font-size:11px;color:var(--muted);margin-top:8px;font-style:italic;">📝 ' + esc(String(c.notes).slice(0, 140)) + (String(c.notes).length > 140 ? '…' : '') + '</div>';
      }

      html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  // --- API publique ---
  window.Daily = {
    setView(view) {
      currentView = view;
      localStorage.setItem('daily_lastcols_view', view);
      window.__load_daily();
    },
    prevMonth() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); },
    nextMonth() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); },
    goToday() {
      const n = new Date();
      calYear = n.getFullYear(); calMonth = n.getMonth(); selectedDay = localKey(n);
      renderCalendar(); renderDetail();
    },
    select(key) { selectedDay = key; renderCalendar(); renderDetail(); },
    refresh() { window.__load_daily(); }
  };
})();
