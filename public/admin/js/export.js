let dropdownOpen = false;

function toggleDropdown() {
  const dropdown = document.getElementById('export-dropdown');
  if (!dropdown) return;
  dropdownOpen = !dropdownOpen;
  dropdown.classList.toggle('open', dropdownOpen);
}

function closeDropdown() {
  const dropdown = document.getElementById('export-dropdown');
  if (!dropdown) return;
  dropdownOpen = false;
  dropdown.classList.remove('open');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateSuffix() {
  return new Date().toISOString().split('T')[0];
}

export async function exportExcel() {
  closeDropdown();
  const res = await fetch('/api/admin/export', { credentials: 'include' });
  if (res.status === 401) { window.location.href = '/'; return; }
  const blob = await res.blob();
  downloadBlob(blob, `rapport_ipce_${dateSuffix()}.xlsx`);
}

export async function exportCSV() {
  closeDropdown();
  const res = await fetch('/api/admin/export/csv', { credentials: 'include' });
  if (res.status === 401) { window.location.href = '/'; return; }
  const blob = await res.blob();
  downloadBlob(blob, `rapport_ipce_${dateSuffix()}.csv`);
}

export async function exportPNG() {
  closeDropdown();
  const container = document.querySelector('.content-area');
  if (!container || typeof html2canvas === 'undefined') return;
  const canvas = await html2canvas(container, { scale: 2, useCORS: true });
  canvas.toBlob(blob => {
    if (blob) downloadBlob(blob, `pilotage_${dateSuffix()}.png`);
  }, 'image/png');
}

export async function exportPDF() {
  closeDropdown();
  const container = document.querySelector('.content-area');
  if (!container || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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

  pdf.save(`rapport_ipce_${dateSuffix()}.pdf`);
}

// --- Editorial Report Exports ---

function formatM(val) {
  if (val >= 1e6) return (val / 1e6).toFixed(1).replace('.', ',') + ' M';
  if (val >= 1e3) return (val / 1e3).toFixed(0) + ' K';
  return val.toString();
}

function formatNum(val) {
  return val.toLocaleString('fr-FR');
}

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getSetting(settings, key, fallback) {
  return parseFloat(settings[key]) || fallback;
}

function computeGlobalCriticalPoints(stats, settings) {
  const t = stats.totals;
  const users = stats.users;
  const caObj = getSetting(settings, 'ca_objectif', 1e8);
  const offresObj = getSetting(settings, 'offres_objectif', 6);
  const bcObj = getSetting(settings, 'bc_objectif', 6);
  const rdvObj = getSetting(settings, 'rdv_objectif', 6);

  const points = [];
  const sorted = [...users].sort((a, b) => b.ca - a.ca);
  const leader = sorted[0];
  const last = sorted[sorted.length - 1];
  const avgCA = users.length > 0 ? t.ca / users.length : 0;

  if (last && last.ca < avgCA * 0.7) {
    points.push({
      subject: last.nom,
      tag: 'CA faible',
      tagClass: 'danger',
      detail: `Chiffre d'affaires de ${formatM(last.ca)} FCFA, en retrait marqué par rapport à la moyenne de l'équipe.`
    });
  }

  if (t.offres < offresObj) {
    points.push({
      subject: `Volume d'offres`,
      tag: 'Insuffisant',
      tagClass: 'danger',
      detail: `Le flux d'offres émises (${t.offres}/${offresObj}) ne couvre pas l'objectif fixé.`
    });
  }

  const convOffreBc = t.offres > 0 ? ((t.bc / t.offres) * 100) : 0;
  if (convOffreBc < 50) {
    points.push({
      subject: 'Taux de fermeture',
      tag: 'Faible',
      tagClass: 'danger',
      detail: `La conversion Offre → BC reste à ${convOffreBc.toFixed(0)}%, en dessous du seuil attendu.`
    });
  }

  if (leader && last && leader.ca - last.ca > avgCA) {
    points.push({
      subject: 'Écart équipe',
      tag: 'Significatif',
      tagClass: 'warn',
      detail: `Écart de ${formatM(leader.ca - last.ca)} FCFA entre ${leader.nom} et ${last.nom}.`
    });
  }

  return points;
}

function docRef() {
  return 'RPT-' + new Date().toISOString().split('T')[0] + '-IPCE';
}

function buildEditorialHTML(stats, settings) {
  const t = stats.totals;
  const users = stats.users;
  const caObj = getSetting(settings, 'ca_objectif', 1e8);
  const offresObj = getSetting(settings, 'offres_objectif', 6);
  const bcObj = getSetting(settings, 'bc_objectif', 6);
  const rdvObj = getSetting(settings, 'rdv_objectif', 6);

  const pctCA = caObj > 0 ? (t.ca / caObj) * 100 : 0;
  const pctOffres = offresObj > 0 ? (t.offres / offresObj) * 100 : 0;
  const pctBC = bcObj > 0 ? (t.bc / bcObj) * 100 : 0;
  const pctRDV = rdvObj > 0 ? (t.rdvCount / rdvObj) * 100 : 0;

  const anyAlert = pctCA < 70 || pctOffres < 70 || pctBC < 70 || pctRDV < 70;

  const sorted = [...users].sort((a, b) => b.ca - a.ca);
  const leader = sorted[0];

  function kpiClass(pct) {
    if (pct < 40) return 'alert';
    if (pct < 70) return 'warn';
    return '';
  }

  const kpis = [
    { label: 'Chiffre d\'affaires', value: t.ca, of: caObj, pct: pctCA },
    { label: 'Offres émises', value: t.offres, of: offresObj, pct: pctOffres },
    { label: 'BC signés', value: t.bc, of: bcObj, pct: pctBC },
    { label: 'Rendez-vous', value: t.rdvCount, of: rdvObj, pct: pctRDV }
  ];

  const criticalPoints = computeGlobalCriticalPoints(stats, settings);

  return `
    <div class="band">
      <span class="band-ref">RÉF. ${docRef()}</span>
      <div class="band-status">
        <span class="band-dot ${anyAlert ? '' : 'ok'}"></span>
        <span>${anyAlert ? 'PÉRIMÈTRE EN ALERTE' : 'PÉRIMÈTRE SOUS CONTRÔLE'}</span>
      </div>
    </div>
    <div class="sheet">
      <header class="masthead">
        <div class="seal">
          <div class="seal-mark">IP</div>
          <div>
            <div class="seal-text-eyebrow">Rapport de Pilotage — Direction Commerciale</div>
            <div class="seal-text-title">Performance Commerciale</div>
          </div>
        </div>
        <div class="masthead-meta">
          Édité le
          <strong>${todayLabel()}</strong>
        </div>
      </header>

      <p class="dek">${anyAlert
        ? 'Des écarts significatifs sont observés sur les indicateurs clés face aux objectifs fixés pour la période.'
        : 'Les indicateurs clés sont globalement conformes aux objectifs fixés pour la période.'}</p>

      <section>
        <div class="section-head">
          <span class="section-num">1</span>
          <span class="section-title">Résumé Exécutif</span>
        </div>
        <div class="kpi-grid">
          ${kpis.map(k => `
            <div class="kpi ${kpiClass(k.pct)}">
              <div class="kpi-label">${k.label}</div>
              <div class="kpi-figure">
                <span class="kpi-value">${formatM(k.value)}</span>
                <span class="kpi-of">/ ${formatM(k.of)}</span>
              </div>
              <div class="kpi-pct"><span>Réalisation</span><b>${k.pct.toFixed(0)}%</b></div>
              <div class="track"><div class="fill" style="width:${Math.min(k.pct, 100)}%"></div></div>
            </div>
          `).join('')}
        </div>
      </section>

      <section>
        <div class="section-head">
          <span class="section-num">2</span>
          <span class="section-title">Leader du Classement</span>
        </div>
        ${leader ? `
          <div class="leader">
            <div class="leader-rank">1</div>
            <div class="leader-info">
              <div class="leader-eyebrow">Meilleure performance individuelle</div>
              <div class="leader-name">${leader.nom}</div>
            </div>
            <div class="leader-value">${formatM(leader.ca)}<span>Chiffre d'affaires</span></div>
          </div>
        ` : '<div class="rapport-empty">Aucun commercial actif</div>'}
      </section>

      <section>
        <div class="section-head">
          <span class="section-num">3</span>
          <span class="section-title">Points Critiques</span>
        </div>
        <div class="crit-list">
          ${criticalPoints.length > 0 ? criticalPoints.map(p => `
            <div class="crit-item">
              <div class="crit-subject">${p.subject} <span class="tag ${p.tagClass}">${p.tag}</span></div>
              <div class="crit-detail">${p.detail}</div>
            </div>
          `).join('') : '<div class="rapport-empty">Aucun point critique détecté</div>'}
        </div>
      </section>

      <div class="signatures">
        <div class="sig">
          <div class="sig-label">Responsable Commercial</div>
          <div class="sig-line">Nom, date et signature</div>
        </div>
        <div class="sig">
          <div class="sig-label">Directeur</div>
          <div class="sig-line">Nom, date et signature</div>
        </div>
      </div>

      <div class="colophon">
        <span>IPCE — Rapport de Pilotage Commercial</span>
        <span>Document interne — ${docRef()}</span>
      </div>
    </div>
  `;
}

async function fetchEditorialData() {
  const [statsRes, settingsRes] = await Promise.all([
    fetch('/api/admin/stats', { credentials: 'include' }),
    fetch('/api/admin/settings', { credentials: 'include' })
  ]);
  if (statsRes.status === 401 || settingsRes.status === 401) {
    window.location.href = '/';
    return null;
  }
  const stats = await statsRes.json();
  const settings = await settingsRes.json();
  return { stats, settings };
}

function createEditorialContainer() {
  const container = document.createElement('div');
  container.id = 'editorial-export-container';
  container.style.cssText = 'position:fixed; top:0; left:-9999px; width:980px; background:#FAFAFA; pointer-events:none;';
  document.body.appendChild(container);
  return container;
}

async function loadEditorialCSS() {
  const res = await fetch('/admin/templates/assets/rapport.css');
  if (!res.ok) return '';
  return await res.text();
}

// Loading indicator
function showLoading(message) {
  let overlay = document.getElementById('export-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'export-loading-overlay';
    overlay.innerHTML = `
      <div class="export-loading-box">
        <div class="export-loading-spinner"></div>
        <div class="export-loading-text">${message}</div>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('.export-loading-text').textContent = message;
    overlay.style.display = 'flex';
  }
}

function hideLoading() {
  const overlay = document.getElementById('export-loading-overlay');
  if (overlay) overlay.style.display = 'none';
}

function showError(message) {
  alert('Erreur : ' + message);
}

export async function exportEditorialPDF() {
  closeDropdown();
  if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
    showError('Les bibliothèques d\'export ne sont pas chargées. Rechargez la page.');
    return;
  }

  showLoading('Génération du rapport PDF en cours...');

  try {
    const data = await fetchEditorialData();
    if (!data) { hideLoading(); return; }

    const container = createEditorialContainer();
    const css = await loadEditorialCSS();
    container.innerHTML = `<style>${css}</style>${buildEditorialHTML(data.stats, data.settings)}`;

    await new Promise(resolve => setTimeout(resolve, 200));

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const canvas = await html2canvas(container, { scale: 1.5, useCORS: true, backgroundColor: '#FAFAFA' });
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

    pdf.save(`rapport_pilotage_${dateSuffix()}.pdf`);
    hideLoading();
  } catch (err) {
    hideLoading();
    showError('Impossible de générer le PDF : ' + err.message);
  }

  const container = document.getElementById('editorial-export-container');
  if (container) document.body.removeChild(container);
}

export async function exportEditorialJPEG() {
  closeDropdown();
  if (typeof html2canvas === 'undefined') {
    showError('La bibliothèque d\'export n\'est pas chargée. Rechargez la page.');
    return;
  }

  showLoading('Génération de l\'image en cours...');

  try {
    const data = await fetchEditorialData();
    if (!data) { hideLoading(); return; }

    const container = createEditorialContainer();
    const css = await loadEditorialCSS();
    container.innerHTML = `<style>${css}</style>${buildEditorialHTML(data.stats, data.settings)}`;

    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#FAFAFA' });
    canvas.toBlob(blob => {
      if (blob) downloadBlob(blob, `rapport_pilotage_${dateSuffix()}.jpg`);
      hideLoading();
    }, 'image/jpeg', 0.92);
  } catch (err) {
    hideLoading();
    showError('Impossible de générer l\'image : ' + err.message);
  }

  const container = document.getElementById('editorial-export-container');
  if (container) document.body.removeChild(container);
}

export async function exportEditorialCSV() {
  closeDropdown();
  showLoading('Génération du CSV en cours...');

  try {
    const data = await fetchEditorialData();
    if (!data) { hideLoading(); return; }

    const { stats, settings } = data;
    const t = stats.totals;
    const users = stats.users;

    const caObj = getSetting(settings, 'ca_objectif', 1e8);
    const offresObj = getSetting(settings, 'offres_objectif', 6);
    const bcObj = getSetting(settings, 'bc_objectif', 6);
    const rdvObj = getSetting(settings, 'rdv_objectif', 6);

    const pctCA = caObj > 0 ? (t.ca / caObj) * 100 : 0;
    const pctOffres = offresObj > 0 ? (t.offres / offresObj) * 100 : 0;
    const pctBC = bcObj > 0 ? (t.bc / bcObj) * 100 : 0;
    const pctRDV = rdvObj > 0 ? (t.rdvCount / rdvObj) * 100 : 0;
    const anyAlert = pctCA < 70 || pctOffres < 70 || pctBC < 70 || pctRDV < 70;

    const sorted = [...users].sort((a, b) => b.ca - a.ca);
    const leader = sorted[0];
    const criticalPoints = computeGlobalCriticalPoints(stats, settings);

    const rows = [];
    const blank = () => rows.push([]);
    const heading = (label) => rows.push([label]);

    // --- En-tête document ---
    heading('IPCE — RAPPORT DE PILOTAGE COMMERCIAL');
    rows.push(['Référence', docRef()]);
    rows.push(['Édité le', todayLabel()]);
    rows.push(['Statut', anyAlert ? 'PÉRIMÈTRE EN ALERTE' : 'PÉRIMÈTRE SOUS CONTRÔLE']);
    blank();

    // --- I. Résumé exécutif ---
    heading('I. RÉSUMÉ EXÉCUTIF');
    rows.push(['Indicateur', 'Valeur', 'Objectif', 'Réalisation']);
    rows.push(['Chiffre d\'affaires (FCFA)', t.ca.toLocaleString('fr-FR'), caObj.toLocaleString('fr-FR'), pctCA.toFixed(0) + '%']);
    rows.push(['Offres émises', t.offres, offresObj, pctOffres.toFixed(0) + '%']);
    rows.push(['BC signés', t.bc, bcObj, pctBC.toFixed(0) + '%']);
    rows.push(['Rendez-vous', t.rdvCount, rdvObj, pctRDV.toFixed(0) + '%']);
    blank();

    // --- II. Leader du classement ---
    heading('II. LEADER DU CLASSEMENT');
    if (leader) {
      rows.push(['Commercial', 'Chiffre d\'affaires (FCFA)']);
      rows.push([leader.nom, leader.ca.toLocaleString('fr-FR')]);
    } else {
      rows.push(['Aucun commercial actif']);
    }
    blank();

    // --- III. Points critiques ---
    heading('III. POINTS CRITIQUES');
    if (criticalPoints.length > 0) {
      rows.push(['Sujet', 'Statut', 'Détail']);
      criticalPoints.forEach(p => {
        rows.push([p.subject, p.tag, p.detail]);
      });
    } else {
      rows.push(['Aucun point critique détecté']);
    }
    blank();

    // --- IV. Détail par commercial ---
    heading('IV. DÉTAIL PAR COMMERCIAL');
    rows.push(['Commercial', 'CA (FCFA)', 'Offres', 'BC', 'RDV', '% CA total']);
    users.forEach(u => {
      const pct = t.ca > 0 ? ((u.ca / t.ca) * 100).toFixed(1) : '0.0';
      rows.push([u.nom, u.ca.toLocaleString('fr-FR'), u.offres, u.bc, u.rdvCount, pct]);
    });
    rows.push(['TOTAL', t.ca.toLocaleString('fr-FR'), t.offres, t.bc, t.rdvCount, '100.0']);
    blank();

    // --- Signatures ---
    heading('SIGNATURES');
    rows.push(['Responsable Commercial', '']);
    rows.push(['Directeur', '']);

    const csvContent = '\uFEFF' + rows.map(row =>
      row.map(cell => `"${String(cell != null ? cell : '').replace(/"/g, '""')}"`).join(';')
    ).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `rapport_pilotage_${dateSuffix()}.csv`);
    hideLoading();
  } catch (err) {
    hideLoading();
    showError('Impossible de générer le CSV : ' + err.message);
  }
}

// --- Fixed Export Button (always visible) ---

function buildFixedExportButton() {
  if (document.getElementById('fixed-export-btn')) return;

  const style = document.createElement('style');
  style.textContent = `
    .fixed-export-wrapper {
      position: fixed;
      top: 16px;
      right: 70px;
      z-index: 9998;
    }
    .fixed-export-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #1C1B18;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .fixed-export-btn:hover {
      background: #4A4740;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .fixed-export-btn svg {
      width: 16px;
      height: 16px;
    }
    .fixed-export-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border: 1px solid #D9D3C4;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      min-width: 220px;
      padding: 6px;
      display: none;
      z-index: 9999;
    }
    .fixed-export-dropdown.open {
      display: block;
    }
    .fixed-export-dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 14px;
      background: none;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      color: #1C1B18;
      cursor: pointer;
      text-align: left;
      transition: background 0.1s;
    }
    .fixed-export-dropdown-item:hover {
      background: #F7F4EC;
    }
    .fixed-export-dropdown-icon {
      font-size: 16px;
      width: 20px;
      text-align: center;
    }
    .fixed-export-dropdown-label {
      flex: 1;
      font-weight: 500;
    }
    .fixed-export-dropdown-divider {
      height: 1px;
      background: #EFEADE;
      margin: 4px 8px;
    }
    #export-loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    }
    .export-loading-box {
      background: white;
      border-radius: 12px;
      padding: 32px 48px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .export-loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #EFEADE;
      border-top-color: #1C1B18;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .export-loading-text {
      font-size: 14px;
      color: #4A4740;
      font-weight: 500;
    }
    @media (max-width: 720px) {
      .fixed-export-wrapper { top: 10px; right: 60px; }
      .fixed-export-btn { padding: 8px 14px; font-size: 12px; }
    }
  `;
  document.head.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'fixed-export-wrapper';
  wrapper.id = 'fixed-export-wrapper';
  wrapper.innerHTML = `
    <button class="fixed-export-btn" id="fixed-export-btn" title="Exporter">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
      Exporter
    </button>
    <div class="fixed-export-dropdown" id="fixed-export-dropdown">
      <button class="fixed-export-dropdown-item" onclick="window.__exportExcel()">
        <span class="fixed-export-dropdown-icon">📊</span>
        <span class="fixed-export-dropdown-label">Excel</span>
      </button>
      <button class="fixed-export-dropdown-item" onclick="window.__exportCSV()">
        <span class="fixed-export-dropdown-icon">📄</span>
        <span class="fixed-export-dropdown-label">CSV brut</span>
      </button>
      <div class="fixed-export-dropdown-divider"></div>
      <button class="fixed-export-dropdown-item" onclick="window.__exportPNG()">
        <span class="fixed-export-dropdown-icon">🖼️</span>
        <span class="fixed-export-dropdown-label">Capture écran (PNG)</span>
      </button>
      <button class="fixed-export-dropdown-item" onclick="window.__exportPDF()">
        <span class="fixed-export-dropdown-icon">📋</span>
        <span class="fixed-export-dropdown-label">Capture écran (PDF)</span>
      </button>
      <div class="fixed-export-dropdown-divider"></div>
      <button class="fixed-export-dropdown-item" onclick="window.__exportEditorialPDF()">
        <span class="fixed-export-dropdown-icon">📰</span>
        <span class="fixed-export-dropdown-label">Rapport officiel (PDF)</span>
      </button>
      <button class="fixed-export-dropdown-item" onclick="window.__exportEditorialJPEG()">
        <span class="fixed-export-dropdown-icon">🖼️</span>
        <span class="fixed-export-dropdown-label">Rapport officiel (image)</span>
      </button>
      <button class="fixed-export-dropdown-item" onclick="window.__exportEditorialXLSX()">
        <span class="fixed-export-dropdown-icon">📊</span>
        <span class="fixed-export-dropdown-label">Rapport officiel (Excel)</span>
      </button>
    </div>
  `;
  document.body.appendChild(wrapper);

  const btn = document.getElementById('fixed-export-btn');
  const dropdown = document.getElementById('fixed-export-dropdown');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
}

export function initExport() {
  const btn = document.getElementById('export-btn');
  const dropdown = document.getElementById('export-dropdown');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target) && !btn?.contains(e.target)) {
      closeDropdown();
    }
  });

  window.__exportExcel = exportExcel;
  window.__exportCSV = exportCSV;
  window.__exportPNG = exportPNG;
  window.__exportPDF = exportPDF;
  window.__exportEditorialPDF = exportEditorialPDF;
  window.__exportEditorialJPEG = exportEditorialJPEG;
  window.__exportEditorialCSV = exportEditorialCSV;
  window.__exportEditorialXLSX = exportEditorialXLSX;
}

export async function exportEditorialXLSX() {
  closeDropdown();
  if (typeof ExcelJS === 'undefined') {
    showError('La bibliothèque Excel n\'est pas chargée. Rechargez la page.');
    return;
  }

  showLoading('Génération du fichier Excel en cours...');

  try {
    const data = await fetchEditorialData();
    if (!data) { hideLoading(); return; }

    const { stats, settings } = data;
    const t = stats.totals;
    const users = stats.users;

    const caObj = getSetting(settings, 'ca_objectif', 1e8);
    const offresObj = getSetting(settings, 'offres_objectif', 6);
    const bcObj = getSetting(settings, 'bc_objectif', 6);
    const rdvObj = getSetting(settings, 'rdv_objectif', 6);

    const pctCA = caObj > 0 ? (t.ca / caObj) * 100 : 0;
    const pctOffres = offresObj > 0 ? (t.offres / offresObj) * 100 : 0;
    const pctBC = bcObj > 0 ? (t.bc / bcObj) * 100 : 0;
    const pctRDV = rdvObj > 0 ? (t.rdvCount / rdvObj) * 100 : 0;
    const anyAlert = pctCA < 70 || pctOffres < 70 || pctBC < 70 || pctRDV < 70;

    const sorted = [...users].sort((a, b) => b.ca - a.ca);
    const leader = sorted[0];
    const criticalPoints = computeGlobalCriticalPoints(stats, settings);

    const INK = 'FF0B1F3A';
    const ACCENT = 'FF1E5F8C';
    const DANGER = 'FFB3412C';
    const WARN = 'FFA6802E';
    const PANEL = 'FFF6F8FB';
    const LINE = 'FFE1E6EE';
    const WHITE = 'FFFFFFFF';

    const wb = new ExcelJS.Workbook();
    wb.creator = 'IPCE';
    wb.created = new Date();
    const ws = wb.addWorksheet('Rapport', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToHeight: 1, fitToWidth: 1 },
      pageSetup: { margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } }
    });

    ws.columns = [
      { width: 20 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 30 }
    ];

    let r = 1;

    function styleHeaderBand(row, text) {
      ws.mergeCells(`A${row}:E${row}`);
      const cell = ws.getCell(`A${row}`);
      cell.value = text;
      cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      ws.getRow(row).height = 22;
    }

    function sectionTitle(row, num, title) {
      ws.mergeCells(`A${row}:E${row}`);
      const cell = ws.getCell(`A${row}`);
      cell.value = `${num}.  ${title.toUpperCase()}`;
      cell.font = { bold: true, size: 10, color: { argb: INK } };
      ws.getRow(row).height = 18;
      ws.getRow(row).border = { bottom: { style: 'thin', color: { argb: LINE } } };
    }

    function tableHeader(row, labels) {
      labels.forEach((label, i) => {
        const cell = ws.getCell(row, i + 1);
        cell.value = label;
        cell.font = { bold: true, size: 9, color: { argb: INK } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PANEL } };
        cell.border = { bottom: { style: 'thin', color: { argb: LINE } } };
      });
    }

    styleHeaderBand(r, 'IPCE — RAPPORT DE PILOTAGE COMMERCIAL'); r++;
    ws.getCell(`A${r}`).value = 'Référence'; ws.getCell(`B${r}`).value = docRef(); r++;
    ws.getCell(`A${r}`).value = 'Édité le'; ws.getCell(`B${r}`).value = todayLabel(); r++;
    ws.getCell(`A${r}`).value = 'Statut';
    const statusCell = ws.getCell(`B${r}`);
    statusCell.value = anyAlert ? 'PÉRIMÈTRE EN ALERTE' : 'PÉRIMÈTRE SOUS CONTRÔLE';
    statusCell.font = { bold: true, color: { argb: anyAlert ? DANGER : ACCENT } };
    r += 2;

    sectionTitle(r, 'I', 'Résumé Exécutif'); r++;
    tableHeader(r, ['Indicateur', 'Valeur', 'Objectif', 'Réalisation', '']); r++;
    const kpiRows = [
      ['Chiffre d\'affaires (FCFA)', t.ca, caObj, pctCA],
      ['Offres émises', t.offres, offresObj, pctOffres],
      ['BC signés', t.bc, bcObj, pctBC],
      ['Rendez-vous', t.rdvCount, rdvObj, pctRDV],
    ];
    kpiRows.forEach(([label, val, obj, pct]) => {
      ws.getCell(`A${r}`).value = label;
      ws.getCell(`A${r}`).font = { size: 9 };
      ws.getCell(`B${r}`).value = val;
      ws.getCell(`B${r}`).numFmt = '#,##0';
      ws.getCell(`B${r}`).font = { size: 9 };
      ws.getCell(`C${r}`).value = obj;
      ws.getCell(`C${r}`).numFmt = '#,##0';
      ws.getCell(`C${r}`).font = { size: 9 };
      const pctCell = ws.getCell(`D${r}`);
      pctCell.value = pct / 100;
      pctCell.numFmt = '0%';
      pctCell.font = { bold: true, size: 9, color: { argb: pct < 40 ? DANGER : pct < 70 ? WARN : ACCENT } };
      ws.getRow(r).height = 15;
      r++;
    });
    r++;

    sectionTitle(r, 'II', 'Leader du Classement'); r++;
    if (leader) {
      tableHeader(r, ['Commercial', 'Chiffre d\'affaires (FCFA)', '', '', '']); r++;
      ws.getCell(`A${r}`).value = leader.nom;
      ws.getCell(`A${r}`).font = { bold: true, size: 9 };
      ws.getCell(`B${r}`).value = leader.ca;
      ws.getCell(`B${r}`).numFmt = '#,##0';
      ws.getCell(`B${r}`).font = { bold: true, size: 9, color: { argb: ACCENT } };
      ws.getRow(r).height = 15;
      r++;
    } else {
      ws.getCell(`A${r}`).value = 'Aucun commercial actif'; ws.getCell(`A${r}`).font = { size: 9 }; r++;
    }
    r++;

    sectionTitle(r, 'III', 'Points Critiques'); r++;
    if (criticalPoints.length > 0) {
      tableHeader(r, ['Sujet', 'Statut', 'Détail', '', '']); r++;
      criticalPoints.forEach(p => {
        ws.getCell(`A${r}`).value = p.subject;
        ws.getCell(`A${r}`).font = { bold: true, size: 9 };
        const tagCell = ws.getCell(`B${r}`);
        tagCell.value = p.tag;
        tagCell.font = { bold: true, size: 9, color: { argb: p.tagClass === 'warn' ? WARN : DANGER } };
        ws.mergeCells(`C${r}:E${r}`);
        ws.getCell(`C${r}`).value = p.detail;
        ws.getCell(`C${r}`).font = { size: 9 };
        ws.getRow(r).height = 15;
        r++;
      });
    } else {
      ws.getCell(`A${r}`).value = 'Aucun point critique détecté'; ws.getCell(`A${r}`).font = { size: 9 }; r++;
    }
    r++;

    sectionTitle(r, 'IV', 'Détail par Commercial'); r++;
    tableHeader(r, ['Commercial', 'CA (FCFA)', 'Offres', 'BC', 'RDV']); r++;
    users.forEach(u => {
      ws.getCell(`A${r}`).value = u.nom; ws.getCell(`A${r}`).font = { size: 9 };
      ws.getCell(`B${r}`).value = u.ca; ws.getCell(`B${r}`).numFmt = '#,##0'; ws.getCell(`B${r}`).font = { size: 9 };
      ws.getCell(`C${r}`).value = u.offres; ws.getCell(`C${r}`).font = { size: 9 };
      ws.getCell(`D${r}`).value = u.bc; ws.getCell(`D${r}`).font = { size: 9 };
      ws.getCell(`E${r}`).value = u.rdvCount; ws.getCell(`E${r}`).font = { size: 9 };
      ws.getRow(r).height = 15;
      r++;
    });
    ws.getCell(`A${r}`).value = 'TOTAL'; ws.getCell(`A${r}`).font = { bold: true, size: 9 };
    ws.getCell(`B${r}`).value = t.ca; ws.getCell(`B${r}`).numFmt = '#,##0'; ws.getCell(`B${r}`).font = { bold: true, size: 9 };
    ws.getCell(`C${r}`).value = t.offres; ws.getCell(`C${r}`).font = { bold: true, size: 9 };
    ws.getCell(`D${r}`).value = t.bc; ws.getCell(`D${r}`).font = { bold: true, size: 9 };
    ws.getCell(`E${r}`).value = t.rdvCount; ws.getCell(`E${r}`).font = { bold: true, size: 9 };
    ws.getRow(r).height = 15;
    ws.getRow(r).border = { top: { style: 'medium', color: { argb: INK } } };
    r += 2;

    sectionTitle(r, '', 'Signatures'); r++;
    ws.getCell(`A${r}`).value = 'Responsable Commercial'; ws.getCell(`A${r}`).font = { size: 9 };
    ws.getCell(`C${r}`).value = 'Directeur'; ws.getCell(`C${r}`).font = { size: 9 };
    r += 2;
    ws.getCell(`A${r}`).value = '_________________________'; ws.getCell(`A${r}`).font = { size: 9 };
    ws.getCell(`C${r}`).value = '_________________________'; ws.getCell(`C${r}`).font = { size: 9 };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, `rapport_pilotage_${dateSuffix()}.xlsx`);
    hideLoading();
  } catch (err) {
    hideLoading();
    showError('Impossible de générer le fichier Excel : ' + err.message);
  }
}