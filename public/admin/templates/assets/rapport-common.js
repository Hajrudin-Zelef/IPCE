(() => {
  'use strict';

  const Rapport = window.Rapport = window.Rapport || {};

  const API_BASE = '/api/admin';
  const LIBS = {
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  };

  let libsLoaded = false;
  async function loadLibs() {
    if (libsLoaded) return;
    await Promise.all([
      loadScript(LIBS.html2canvas, 'html2canvas'),
      loadScript(LIBS.jspdf, 'jspdf')
    ]);
    libsLoaded = true;
  }

  function loadScript(src, globalName) {
    return new Promise((resolve, reject) => {
      if (window[globalName]) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  function formatM(val) {
    if (val == null || isNaN(val)) return '—';
    const m = val / 1e6;
    return m.toFixed(1).replace('.', ',') + ' M';
  }

  function formatMFull(val) {
    if (val == null || isNaN(val)) return '—';
    return val.toLocaleString('fr-FR') + ' FCFA';
  }

  function formatPct(num, den) {
    if (!den || den === 0) return '—';
    return ((num / den) * 100).toFixed(0) + '%';
  }

  function formatNum(val) {
    if (val == null || isNaN(val)) return '—';
    return val.toLocaleString('fr-FR');
  }

  function todayLabel() {
    const d = new Date();
    const opts = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('fr-FR', opts);
  }

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('unauth');
      const data = await res.json();
      if (data.role !== 'admin') throw new Error('not admin');
      return data;
    } catch {
      window.location.href = '/';
      return null;
    }
  }

  async function fetchStats() {
    const [statsRes, settingsRes] = await Promise.all([
      fetch(`${API_BASE}/stats`, { credentials: 'include' }),
      fetch(`${API_BASE}/settings`, { credentials: 'include' })
    ]);
    if (!statsRes.ok || !settingsRes.ok) return null;
    const stats = await statsRes.json();
    const settings = await settingsRes.json();
    return { stats, settings };
  }

  async function fetchEvolution() {
    try {
      const res = await fetch(`${API_BASE}/evolution`, { credentials: 'include' });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  function getSetting(settings, key, defaultVal) {
    const v = settings[key];
    return v !== undefined ? parseFloat(v) : defaultVal;
  }

  function computeGlobalAlerts(stats, settings) {
    const t = stats.totals;
    const users = stats.users;
    const caObj = getSetting(settings, 'ca_objectif', 1e8);
    const offresObj = getSetting(settings, 'offres_objectif', 6);
    const bcObj = getSetting(settings, 'bc_objectif', 6);
    const rdvObj = getSetting(settings, 'rdv_objectif', 6);

    const alerts = [];
    const pctCA = caObj > 0 ? (t.ca / caObj) * 100 : 0;
    const pctOffres = offresObj > 0 ? (t.offres / offresObj) * 100 : 0;
    const pctBC = bcObj > 0 ? (t.bc / bcObj) * 100 : 0;
    const pctRDV = rdvObj > 0 ? (t.rdvCount / rdvObj) * 100 : 0;

    if (pctCA < 70) alerts.push('ca');
    if (pctOffres < 70) alerts.push('offres');
    if (pctBC < 70) alerts.push('bc');
    if (pctRDV < 70) alerts.push('rdv');

    return { pctCA, pctOffres, pctBC, pctRDV, alerts };
  }

  function computeGlobalCriticalPoints(stats, settings) {
    const t = stats.totals;
    const users = stats.users;
    if (!users.length) return [];

    const sorted = [...users].sort((a, b) => b.ca - a.ca);
    const leader = sorted[0];
    const last = sorted[sorted.length - 1];
    const avgCA = t.ca / users.length;

    const offresObj = getSetting(settings, 'offres_objectif', 6);
    const bcObj = getSetting(settings, 'bc_objectif', 6);
    const convRdvOffre = t.rdvCount > 0 ? ((t.offres / t.rdvCount) * 100) : 0;
    const convOffreBc = t.offres > 0 ? ((t.bc / t.offres) * 100) : 0;

    const points = [];

    if (last && last.ca < avgCA * 0.7) {
      points.push({
        subject: last.nom,
        tag: 'CA faible',
        tagClass: 'danger',
        detail: `Chiffre d'affaires individuel de ${formatM(last.ca)}, en retrait marqué par rapport à la moyenne de l'équipe (${formatM(avgCA)}).`
      });
    }

    if (t.offres < offresObj) {
      points.push({
        subject: `Volume d'offres`,
        tag: 'Insuffisant',
        tagClass: 'danger',
        detail: `Le flux d'offres émises (${t.offres}) ne couvre pas l'objectif fixé (${offresObj}), limitant mécaniquement le potentiel de signature.`
      });
    }

    if (convOffreBc < 50) {
      points.push({
        subject: 'Taux de fermeture',
        tag: 'Faible',
        tagClass: 'danger',
        detail: `La conversion Offre → Bon de commande (${convOffreBc.toFixed(0)}%) reste en dessous du seuil attendu (50%).`
      });
    }

    if (convRdvOffre < 50) {
      points.push({
        subject: 'Taux de conversion RDV→Offre',
        tag: 'Faible',
        tagClass: 'warn',
        detail: `Seuls ${convRdvOffre.toFixed(0)}% des rendez-vous aboutissent à une offre.`
      });
    }

    if (leader && last && leader.ca - last.ca > 4e6) {
      points.push({
        subject: 'Écart de performance',
        tag: 'Marqué',
        tagClass: 'warn',
        detail: `Écart de ${formatM(leader.ca - last.ca)} entre ${leader.nom} (${formatM(leader.ca)}) et ${last.nom} (${formatM(last.ca)}).`
      });
    }

    return points.length ? points : [{
      subject: 'Situation nominale',
      tag: 'OK',
      tagClass: '',
      detail: 'Aucun point critique détecté sur les indicateurs suivis.'
    }];
  }

  function computeCommercialCriticalPoints(commercial, stats, settings) {
    const t = stats.totals;
    const users = stats.users;
    const avgCA = t.ca / Math.max(users.length, 1);
    const offresObj = getSetting(settings, 'offres_objectif', 6);
    const bcObj = getSetting(settings, 'bc_objectif', 6);

    const convRdvOffre = commercial.rdvCount > 0 ? ((commercial.offres / commercial.rdvCount) * 100) : 0;
    const convOffreBc = commercial.offres > 0 ? ((commercial.bc / commercial.offres) * 100) : 0;
    const caSharePct = t.ca > 0 ? ((commercial.ca / t.ca) * 100) : 0;

    const points = [];

    if (commercial.ca < avgCA * 0.7) {
      points.push({
        subject: 'CA sous la moyenne',
        tag: 'Attention',
        tagClass: 'danger',
        detail: `${formatM(commercial.ca)} vs moyenne équipe ${formatM(avgCA)} (${caSharePct.toFixed(1)}% du total).`
      });
    }

    if (commercial.offres < offresObj / Math.max(users.length, 1)) {
      points.push({
        subject: 'Offres insuffisantes',
        tag: 'Insuffisant',
        tagClass: 'warn',
        detail: `${commercial.offres} offres sur l'objectif équipe de ${offresObj} (part indicative : ${(offresObj / users.length).toFixed(1)}).`
      });
    }

    if (convOffreBc < 50) {
      points.push({
        subject: 'Taux de fermeture',
        tag: 'Faible',
        tagClass: 'danger',
        detail: `Conversion Offre → BC à ${convOffreBc.toFixed(0)}% (seuil 50%).`
      });
    }

    if (convRdvOffre < 50) {
      points.push({
        subject: 'Conversion RDV→Offre',
        tag: 'Faible',
        tagClass: 'warn',
        detail: `${convRdvOffre.toFixed(0)}% des RDV aboutissent à une offre.`
      });
    }

    return points.length ? points : [{
      subject: 'Performance satisfaisante',
      tag: 'OK',
      tagClass: '',
      detail: 'Aucun point critique détecté pour ce commercial.'
    }];
  }

  function buildToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'rapport-toolbar';
    toolbar.innerHTML = `
      <button type="button" data-export="pdf" title="Exporter en PDF">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        PDF
      </button>
      <button type="button" data-export="jpeg" title="Exporter en JPEG">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        JPEG
      </button>
      <button type="button" data-export="csv" title="Exporter en CSV">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        CSV
      </button>
    `;
    document.body.appendChild(toolbar);

    toolbar.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-export]');
      if (!btn) return;
      const type = btn.dataset.export;
      const cb = Rapport.exportHandlers && Rapport.exportHandlers[type];
      if (cb) {
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await cb();
        } finally {
          btn.disabled = false;
          buildToolbarBtn(btn, type);
        }
      }
    });
  }

  function buildToolbarBtn(btn, type) {
    const icons = {
      pdf: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      jpeg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      csv: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
    };
    btn.innerHTML = icons[type] + ' ' + type.toUpperCase();
  }

  async function exportPDF() {
    await loadLibs();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const container = document.querySelector('.sheet');
    if (!container) return;

    const canvas = await html2canvas(container, { scale: 1.5, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pageWidth = 190;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'JPEG', 10, position, pageWidth, imgHeight);
    heightLeft -= 277;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 10, position, pageWidth, imgHeight);
      heightLeft -= 277;
    }

    const filename = `rapport_${todayLabel().replace(/ /g, '_')}.pdf`;
    pdf.save(filename);
  }

  async function exportJPEG() {
    await loadLibs();
    const container = document.querySelector('.sheet');
    if (!container) return;
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const filename = `rapport_${todayLabel().replace(/ /g, '_')}.jpg`;
    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/jpeg', 0.92);
  }

  function exportCSV(rows, filename) {
    const bom = '\uFEFF';
    const csv = [bom + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  Rapport.formatM = formatM;
  Rapport.formatMFull = formatMFull;
  Rapport.formatPct = formatPct;
  Rapport.formatNum = formatNum;
  Rapport.todayLabel = todayLabel;
  Rapport.checkAuth = checkAuth;
  Rapport.fetchStats = fetchStats;
  Rapport.fetchEvolution = fetchEvolution;
  Rapport.getSetting = getSetting;
  Rapport.computeGlobalAlerts = computeGlobalAlerts;
  Rapport.computeGlobalCriticalPoints = computeGlobalCriticalPoints;
  Rapport.computeCommercialCriticalPoints = computeCommercialCriticalPoints;
  Rapport.buildToolbar = buildToolbar;
  Rapport.exportPDF = exportPDF;
  Rapport.exportJPEG = exportJPEG;
  Rapport.exportCSV = exportCSV;
  Rapport.exportHandlers = {
    pdf: exportPDF,
    jpeg: exportJPEG,
    csv: null
  };
})();