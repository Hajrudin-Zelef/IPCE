/* ========================================
   HISTORIQUE DES COLLECTES — Admin
   Filtres date + commercial + pagination
   ======================================== */

(function() {
  'use strict';

  let adminHistory = [];
  let filteredHistory = [];
  let currentPage = 1;
  const PAGE_SIZE = 10;
  let currentView = localStorage.getItem('hist_admin_view') || 'list';

  window.__load_history_admin = async function() {
    const el = document.getElementById('section-history-admin-content');
    if (!el) return;

    try {
      const data = await loadSectionData('/api/collectes/all');
      if (!Array.isArray(data)) throw new Error('no-data');
      adminHistory = data;
    } catch (e) {
      el.innerHTML = '<div class="section-empty"><p>Erreur de chargement</p></div>';
      return;
    }

    // Extraire la liste des commerciaux uniques
    const comms = [...new Set(adminHistory.map(c => c.commercial).filter(Boolean))].sort();

    // Définir les dates par défaut (30 derniers jours)
    const today = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const defaultFrom = fmtInput(from);
    const defaultTo = fmtInput(today);

    currentPage = 1;
    applyFilters(comms, defaultFrom, defaultTo);
  };

  function fmtInput(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function fmtDisplay(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return d + '/' + m + '/' + y;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function applyFilters(comms, fromDate, toDate, commFilter, page) {
    currentPage = page || 1;

    // Filtrer
    filteredHistory = adminHistory.filter(c => {
      const created = (c.created_at || '').slice(0, 10);
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;
      if (commFilter && commFilter !== 'all' && c.commercial !== commFilter) return false;
      return true;
    });

    // Trier du plus récent au plus ancien
    filteredHistory.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    renderAll(comms, fromDate, toDate, commFilter || 'all', totalPages);
  }

  function renderAll(comms, fromDate, toDate, commFilter, totalPages) {
    const el = document.getElementById('section-history-admin-content');
    if (!el) return;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = filteredHistory.slice(start, start + PAGE_SIZE);

    let html = '';

    // --- Filtres ---
    html += '<div style="background:var(--card);border:1px solid var(--border-light);border-radius:var(--radius-lg);padding:18px 20px;margin-bottom:18px;box-shadow:var(--shadow-sm);">';
    html += '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;">';

    // Du
    html += '<div style="display:flex;flex-direction:column;gap:4px;">';
    html += '<label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px;">Du</label>';
    html += '<input type="date" id="hist-admin-from" value="' + esc(fromDate) + '" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--bg);font-family:inherit;width:160px;">';
    html += '</div>';

    // Au
    html += '<div style="display:flex;flex-direction:column;gap:4px;">';
    html += '<label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px;">Au</label>';
    html += '<input type="date" id="hist-admin-to" value="' + esc(toDate) + '" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--bg);font-family:inherit;width:160px;">';
    html += '</div>';

    // Commercial
    html += '<div style="display:flex;flex-direction:column;gap:4px;">';
    html += '<label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px;">Commercial</label>';
    html += '<select id="hist-admin-comm" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--bg);font-family:inherit;min-width:160px;">';
    html += '<option value="all"' + (commFilter === 'all' ? ' selected' : '') + '>Tous</option>';
    comms.forEach(n => {
      html += '<option value="' + esc(n) + '"' + (commFilter === n ? ' selected' : '') + '>' + esc(n) + '</option>';
    });
    html += '</select></div>';

    // Bouton Générer
    html += '<button onclick="HistoryAdmin.search()" style="padding:8px 20px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:inherit;white-space:nowrap;">Générer</button>';

    // Compteur + toggle vue
    html += '<div style="margin-left:auto;display:flex;align-items:center;gap:10px;">';
    html += '<div style="font-size:12px;color:var(--muted);font-weight:600;">' + filteredHistory.length + ' résultat' + (filteredHistory.length !== 1 ? 's' : '') + '</div>';
    html += '<div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;">';
    html += '<button onclick="HistoryAdmin.setView(\'list\')" style="padding:4px 10px;border:none;background:' + (currentView === 'list' ? 'var(--primary)' : 'var(--card)') + ';color:' + (currentView === 'list' ? '#fff' : 'var(--text)') + ';cursor:pointer;font-size:12px;font-family:inherit;border-right:1px solid var(--border);" title="Liste">☰</button>';
    html += '<button onclick="HistoryAdmin.setView(\'grid\')" style="padding:4px 10px;border:none;background:' + (currentView === 'grid' ? 'var(--primary)' : 'var(--card)') + ';color:' + (currentView === 'grid' ? '#fff' : 'var(--text)') + ';cursor:pointer;font-size:12px;font-family:inherit;" title="Grille">⊞</button>';
    html += '</div></div>';

    html += '</div></div>';

    // --- Contenu selon vue ---
    if (currentView === 'grid') {
      // Vue grille
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">';
      if (pageData.length === 0) {
        html += '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);font-size:13px;">Aucune collecte trouvée</div>';
      } else {
        pageData.forEach((c, i) => {
          const num = start + i + 1;
          const badgeStyle = { 'brouillon': 'background:rgba(148,163,184,0.15);color:#64748b;', 'validee': 'background:rgba(245,158,11,0.15);color:#d97706;', 'approuvee': 'background:rgba(16,185,129,0.15);color:#059669;', 'rejetee': 'background:rgba(239,68,68,0.15);color:#dc2626;' }[c.statut] || '';
          html += '<div style="background:var(--card);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:14px;transition:box-shadow 0.15s;" onmouseenter="this.style.boxShadow=\'var(--shadow-md)\'" onmouseleave="this.style.boxShadow=\'none\'">';
          html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
          html += '<div style="display:flex;align-items:center;gap:8px;"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">' + esc((c.commercial || '?').charAt(0)) + '</div><span style="font-size:12px;font-weight:700;color:var(--text);">' + esc(c.commercial || '—') + '</span></div>';
          html += '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;text-transform:lowercase;' + badgeStyle + '">' + esc(c.statut) + '</span>';
          html += '</div>';
          html += '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;">' + new Date(c.created_at).toLocaleDateString('fr-FR') + (c.zone ? ' · <span style="background:var(--primary-light);color:var(--primary);padding:1px 6px;border-radius:4px;font-weight:700;">' + esc(c.zone) + '</span>' : '') + '</div>';
          html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;">';
          html += '<div style="text-align:center;padding:6px;background:var(--bg);border-radius:6px;"><div style="font-size:14px;font-weight:800;color:var(--text);">' + formatCA(c.ca || 0) + '</div><div style="font-size:9px;color:var(--muted);font-weight:600;">CA</div></div>';
          html += '<div style="text-align:center;padding:6px;background:var(--bg);border-radius:6px;"><div style="font-size:14px;font-weight:800;color:var(--text);">' + (c.offres || 0) + '</div><div style="font-size:9px;color:var(--muted);font-weight:600;">Offres</div></div>';
          html += '<div style="text-align:center;padding:6px;background:var(--bg);border-radius:6px;"><div style="font-size:14px;font-weight:800;color:var(--text);">' + (c.bc || 0) + '</div><div style="font-size:9px;color:var(--muted);font-weight:600;">BC</div></div>';
          html += '</div>';
          html += '<div style="display:flex;gap:4px;justify-content:center;">';
          html += '<button onclick="HistoryAdmin.view(' + c.id + ')" style="border:none;background:var(--bg);cursor:pointer;font-size:13px;padding:4px 8px;border-radius:5px;" title="Voir">&#128065;</button>';
          html += '<button onclick="HistoryAdmin.exportPDF(' + c.id + ')" style="border:none;background:var(--bg);cursor:pointer;font-size:13px;padding:4px 8px;border-radius:5px;" title="PDF">📥</button>';
          html += '<button onclick="HistoryAdmin.exportCSV(' + c.id + ')" style="border:none;background:var(--bg);cursor:pointer;font-size:13px;padding:4px 8px;border-radius:5px;" title="CSV">📄</button>';
          html += '<button onclick="HistoryAdmin.print(' + c.id + ')" style="border:none;background:var(--bg);cursor:pointer;font-size:13px;padding:4px 8px;border-radius:5px;" title="Imprimer">🖨️</button>';
          html += '<button onclick="HistoryAdmin.confirmDelete(' + c.id + ')" style="border:none;background:var(--bg);cursor:pointer;font-size:13px;padding:4px 8px;border-radius:5px;" title="Supprimer">🗑️</button>';
          html += '</div></div>';
        });
      }
      html += '</div>';
    } else {
      // Vue liste (tableau)
      html += '<div style="overflow-x:auto;border:1px solid var(--border-light);border-radius:var(--radius-lg);background:var(--card);">';
      html += '<table class="section-table" style="width:100%;border-collapse:collapse;">';
      html += '<thead><tr>';
      ['#', 'Date', 'Commercial', 'CA', 'Offres', 'BC', 'RDV', 'Visites', 'Contacts', 'Zone', 'Statut', ''].forEach(h => {
        const align = ['CA', 'Offres', 'BC', 'RDV', 'Visites', 'Contacts'].includes(h) ? 'text-align:right;' : (h === '#' ? 'text-align:center;width:40px;' : (h === '' ? 'text-align:center;width:50px;' : ''));
        html += '<th style="padding:10px 14px;font-size:12px;font-weight:600;color:var(--text);background:var(--bg);border-bottom:1px solid var(--border-light);' + align + '">' + h + '</th>';
      });
      html += '</tr></thead><tbody>';

      if (pageData.length === 0) {
        html += '<tr><td colspan="12" style="padding:40px;text-align:center;color:var(--muted);font-size:13px;">Aucune collecte trouvée pour ces critères</td></tr>';
      } else {
        pageData.forEach((c, i) => {
          const num = start + i + 1;
          const statusColors = {
            'brouillon': 'background:rgba(148,163,184,0.15);color:#64748b;',
            'validee': 'background:rgba(245,158,11,0.15);color:#d97706;',
            'approuvee': 'background:rgba(16,185,129,0.15);color:#059669;',
            'rejetee': 'background:rgba(239,68,68,0.15);color:#dc2626;',
          };
          const badgeStyle = statusColors[c.statut] || '';

          html += '<tr style="border-bottom:1px solid var(--border-light);transition:background 0.15s;" onmouseenter="this.style.background=\'rgba(37,99,235,0.04)\'" onmouseleave="this.style.background=\'\'">';
          html += '<td style="padding:10px 14px;font-size:12px;color:var(--muted);text-align:center;">' + num + '</td>';
          html += '<td style="padding:10px 14px;font-size:13px;color:var(--text);">' + new Date(c.created_at).toLocaleDateString('fr-FR') + '</td>';
          html += '<td style="padding:10px 14px;font-size:13px;font-weight:600;color:var(--text);">' + esc(c.commercial || '—') + '</td>';
          html += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);font-variant-numeric:tabular-nums;">' + formatCA(c.ca || 0) + '</td>';
          html += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);font-variant-numeric:tabular-nums;">' + (c.offres || 0) + '</td>';
          html += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);font-variant-numeric:tabular-nums;">' + (c.bc || 0) + '</td>';
          html += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);font-variant-numeric:tabular-nums;">' + (c.rdvs ? c.rdvs.length : 0) + '</td>';
          html += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);font-variant-numeric:tabular-nums;">' + (c.visites || 0) + '</td>';
          html += '<td style="padding:10px 14px;font-size:13px;text-align:right;color:var(--text);font-variant-numeric:tabular-nums;">' + (c.contacts || 0) + '</td>';
          html += '<td style="padding:10px 14px;font-size:13px;">' + (c.zone ? '<span style="background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;">' + esc(c.zone) + '</span>' : '—') + '</td>';
          html += '<td style="padding:10px 14px;text-align:center;"><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:5px;text-transform:lowercase;' + badgeStyle + '">' + esc(c.statut) + '</span></td>';
          html += '<td style="padding:10px 14px;text-align:center;display:flex;gap:2px;justify-content:center;flex-wrap:wrap;">';
          html += '<button onclick="HistoryAdmin.view(' + c.id + ')" style="border:none;background:none;cursor:pointer;font-size:14px;color:var(--primary);padding:3px 6px;border-radius:5px;transition:background 0.15s;" onmouseenter="this.style.background=\'var(--primary-light)\'" onmouseleave="this.style.background=\'\'" title="Voir">&#128065;</button>';
          html += '<button onclick="HistoryAdmin.exportPDF(' + c.id + ')" style="border:none;background:none;cursor:pointer;font-size:14px;color:#dc2626;padding:3px 6px;border-radius:5px;transition:background 0.15s;" onmouseenter="this.style.background=\'#fee2e2\'" onmouseleave="this.style.background=\'\'" title="PDF">📥</button>';
          html += '<button onclick="HistoryAdmin.exportCSV(' + c.id + ')" style="border:none;background:none;cursor:pointer;font-size:14px;color:#059669;padding:3px 6px;border-radius:5px;transition:background 0.15s;" onmouseenter="this.style.background=\'#d1fae5\'" onmouseleave="this.style.background=\'\'" title="CSV">📄</button>';
          html += '<button onclick="HistoryAdmin.print(' + c.id + ')" style="border:none;background:none;cursor:pointer;font-size:14px;color:#7c3aed;padding:3px 6px;border-radius:5px;transition:background 0.15s;" onmouseenter="this.style.background=\'#ede9fe\'" onmouseleave="this.style.background=\'\'" title="Imprimer">🖨️</button>';
          html += '<button onclick="HistoryAdmin.confirmDelete(' + c.id + ')" style="border:none;background:none;cursor:pointer;font-size:14px;color:#dc2626;padding:3px 6px;border-radius:5px;transition:background 0.15s;" onmouseenter="this.style.background=\'#fee2e2\'" onmouseleave="this.style.background=\'\'" title="Supprimer">🗑️</button>';
          html += '</td>';
          html += '</tr>';
        });
      }
      html += '</tbody></table></div>';
    }

    // --- Pagination ---
    if (totalPages > 1) {
      html += '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px;flex-wrap:wrap;">';

      // Première page
      html += '<button onclick="HistoryAdmin.page(1)" ' + (currentPage === 1 ? 'disabled' : '') + ' style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:' + (currentPage === 1 ? 'var(--muted)' : 'var(--text)') + ';cursor:' + (currentPage === 1 ? 'default' : 'pointer') + ';font-size:13px;font-family:inherit;transition:all 0.15s;opacity:' + (currentPage === 1 ? '0.5' : '1') + ';" title="Première page">⟪</button>';

      // Précédent
      html += '<button onclick="HistoryAdmin.page(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled' : '') + ' style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:' + (currentPage === 1 ? 'var(--muted)' : 'var(--text)') + ';cursor:' + (currentPage === 1 ? 'default' : 'pointer') + ';font-size:13px;font-family:inherit;transition:all 0.15s;opacity:' + (currentPage === 1 ? '0.5' : '1') + ';" title="Page précédente">‹</button>';

      // Numéros de page (max 5 visibles)
      const pageStart = Math.max(1, currentPage - 2);
      const pageEnd = Math.min(totalPages, pageStart + 4);
      for (let p = pageStart; p <= pageEnd; p++) {
        const isActive = p === currentPage;
        html += '<button onclick="HistoryAdmin.page(' + p + ')" style="padding:6px 12px;border:1px solid ' + (isActive ? 'var(--primary)' : 'var(--border)') + ';border-radius:6px;background:' + (isActive ? 'var(--primary)' : 'var(--card)') + ';color:' + (isActive ? '#fff' : 'var(--text)') + ';cursor:pointer;font-size:13px;font-weight:' + (isActive ? '700' : '500') + ';font-family:inherit;transition:all 0.15s;min-width:36px;">' + p + '</button>';
      }

      // Suivant
      html += '<button onclick="HistoryAdmin.page(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled' : '') + ' style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:' + (currentPage === totalPages ? 'var(--muted)' : 'var(--text)') + ';cursor:' + (currentPage === totalPages ? 'default' : 'pointer') + ';font-size:13px;font-family:inherit;transition:all 0.15s;opacity:' + (currentPage === totalPages ? '0.5' : '1') + ';" title="Page suivante">›</button>';

      // Dernière page
      html += '<button onclick="HistoryAdmin.page(' + totalPages + ')" ' + (currentPage === totalPages ? 'disabled' : '') + ' style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:' + (currentPage === totalPages ? 'var(--muted)' : 'var(--text)') + ';cursor:' + (currentPage === totalPages ? 'default' : 'pointer') + ';font-size:13px;font-family:inherit;transition:all 0.15s;opacity:' + (currentPage === totalPages ? '0.5' : '1') + ';" title="Dernière page">⟫</button>';

      html += '</div>';
    }

    // --- Modale détails ---
    html += '<div id="history-admin-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:500;align-items:center;justify-content:center;" onclick="if(event.target===this)HistoryAdmin.close()">';
    html += '<div style="background:var(--card);border-radius:var(--radius-xl);box-shadow:0 20px 60px rgba(0,0,0,0.2);width:90%;max-width:560px;max-height:85vh;overflow-y:auto;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border-light);">';
    html += '<h3 id="history-admin-modal-title" style="font-size:16px;font-weight:700;color:var(--text);margin:0;">Détails</h3>';
    html += '<button onclick="HistoryAdmin.close()" style="border:none;background:none;cursor:pointer;font-size:20px;color:var(--muted);padding:4px 8px;border-radius:6px;" onmouseenter="this.style.background=\'var(--bg)\'" onmouseleave="this.style.background=\'\'">&#10005;</button>';
    html += '</div>';
    html += '<div id="history-admin-modal-body" style="padding:22px;"></div>';
    html += '</div></div>';

    el.innerHTML = html;
  }

  window.HistoryAdmin = {
    setView: function(view) {
      currentView = view;
      localStorage.setItem('hist_admin_view', view);
      const fromDate = document.getElementById('hist-admin-from').value;
      const toDate = document.getElementById('hist-admin-to').value;
      const commFilter = document.getElementById('hist-admin-comm').value;
      const comms = [...new Set(adminHistory.map(c => c.commercial).filter(Boolean))].sort();
      applyFilters(comms, fromDate, toDate, commFilter, currentPage);
    },

    search: function() {
      const fromDate = document.getElementById('hist-admin-from').value;
      const toDate = document.getElementById('hist-admin-to').value;
      const commFilter = document.getElementById('hist-admin-comm').value;
      const comms = [...new Set(adminHistory.map(c => c.commercial).filter(Boolean))].sort();
      applyFilters(comms, fromDate, toDate, commFilter, 1);
    },

    page: function(p) {
      const fromDate = document.getElementById('hist-admin-from').value;
      const toDate = document.getElementById('hist-admin-to').value;
      const commFilter = document.getElementById('hist-admin-comm').value;
      const comms = [...new Set(adminHistory.map(c => c.commercial).filter(Boolean))].sort();
      applyFilters(comms, fromDate, toDate, commFilter, p);
    },

    view: function(id) {
      const c = filteredHistory.find(x => x.id === id);
      if (!c) return;

      const modalTitle = document.getElementById('history-admin-modal-title');
      const modalBody = document.getElementById('history-admin-modal-body');
      const modal = document.getElementById('history-admin-modal');
      if (!modal || !modalBody) return;

      modalTitle.textContent = c.commercial + ' — ' + new Date(c.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      const statusColors = {
        'brouillon': 'background:rgba(148,163,184,0.15);color:#64748b;',
        'validee': 'background:rgba(245,158,11,0.15);color:#d97706;',
        'approuvee': 'background:rgba(16,185,129,0.15);color:#059669;',
        'rejetee': 'background:rgba(239,68,68,0.15);color:#dc2626;',
      };

      let html = '';

      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;">';
      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:10px;"><div style="font-size:22px;font-weight:800;color:var(--text);">' + formatCA(c.ca || 0) + '</div><div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;">CA (FCFA)</div></div>';
      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:10px;"><div style="font-size:22px;font-weight:800;color:var(--text);">' + (c.offres || 0) + '</div><div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;">Offres</div></div>';
      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:10px;"><div style="font-size:22px;font-weight:800;color:var(--text);">' + (c.bc || 0) + '</div><div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;">BC Signés</div></div>';
      html += '</div>';

      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;">';
      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:10px;"><div style="font-size:22px;font-weight:800;color:var(--text);">' + (c.visites || 0) + '</div><div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;">Visites</div></div>';
      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:10px;"><div style="font-size:22px;font-weight:800;color:var(--text);">' + (c.contacts || 0) + '</div><div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;">Contacts</div></div>';
      html += '<div style="text-align:center;padding:14px;background:var(--bg);border-radius:10px;"><div style="font-size:22px;font-weight:800;color:var(--text);">' + (c.rdvs ? c.rdvs.length : 0) + '</div><div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;">RDV</div></div>';
      html += '</div>';

      html += '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">';
      if (c.zone) html += '<span style="background:var(--primary-light);color:var(--primary);padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;">' + esc(c.zone) + '</span>';
      html += '<span style="' + (statusColors[c.statut] || '') + 'padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;">' + esc(c.statut) + '</span>';
      html += '</div>';

      if (c.notes) {
        html += '<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">Notes</div><div style="font-size:13px;background:var(--bg);padding:12px;border-radius:8px;white-space:pre-wrap;color:var(--text);">' + esc(c.notes) + '</div></div>';
      }

      if (c.rdvs && c.rdvs.length > 0) {
        html += '<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">Rendez-vous (' + c.rdvs.length + ')</div>';
        c.rdvs.forEach(r => {
          html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px;border:1px solid var(--border-light);">';
          html += '<span style="font-size:16px;">🤝</span>';
          html += '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--text);">' + esc(r.prospect) + '</div><div style="font-size:11px;color:var(--muted);">' + esc(r.date || '') + ' · ' + formatCA(r.montant || 0) + 'M · ' + esc(r.statut) + '</div></div></div>';
        });
      } else {
        html += '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">Aucun RDV associé</div>';
      }

      modalBody.innerHTML = html;
      modal.style.display = 'flex';
    },

    close: function() {
      const modal = document.getElementById('history-admin-modal');
      if (modal) modal.style.display = 'none';
    },

    exportPDF: function(id) {
      const c = filteredHistory.find(x => x.id === id);
      if (!c) return;
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Collecte — ' + (c.commercial || 'N/A'), 20, 20);
        doc.setFontSize(11);
        doc.text('Date: ' + new Date(c.created_at).toLocaleDateString('fr-FR'), 20, 32);
        doc.text('CA: ' + formatCA(c.ca || 0) + ' FCFA', 20, 42);
        doc.text('Offres: ' + (c.offres || 0), 20, 52);
        doc.text('BC Signes: ' + (c.bc || 0), 20, 62);
        doc.text('Visites: ' + (c.visites || 0), 20, 72);
        doc.text('Contacts: ' + (c.contacts || 0), 20, 82);
        doc.text('Zone: ' + (c.zone || 'N/A'), 20, 92);
        doc.text('Statut: ' + (c.statut || 'N/A'), 20, 102);
        if (c.notes) {
          doc.setFontSize(10);
          doc.text('Notes: ' + String(c.notes).slice(0, 200), 20, 115);
        }
        if (c.rdvs && c.rdvs.length > 0) {
          doc.setFontSize(12);
          doc.text('RDVs (' + c.rdvs.length + ')', 20, 130);
          doc.setFontSize(10);
          let y = 140;
          c.rdvs.forEach(function(r) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(r.prospect + ' | ' + r.date + ' | ' + (r.montant || 0) + 'M | ' + r.statut, 20, y);
            y += 8;
          });
        }
        doc.save('collecte_' + c.id + '_' + (c.commercial || 'admin') + '.pdf');
      } catch (e) {
        alert('Erreur export PDF: ' + e.message);
      }
    },

    exportCSV: function(id) {
      const c = filteredHistory.find(x => x.id === id);
      if (!c) return;
      var headers = ['Date','Commercial','CA','Offres','BC','RDV','Visites','Contacts','Zone','Statut','Notes'];
      var values = [
        new Date(c.created_at).toLocaleDateString('fr-FR'),
        c.commercial || '',
        c.ca || 0,
        c.offres || 0,
        c.bc || 0,
        c.rdvs ? c.rdvs.length : 0,
        c.visites || 0,
        c.contacts || 0,
        c.zone || '',
        c.statut || '',
        (c.notes || '').replace(/"/g, '""')
      ];
      var csv = headers.join(';') + '\n' + values.map(function(v) { return '"' + String(v) + '"'; }).join(';') + '\n';
      var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'collecte_' + c.id + '_' + (c.commercial || 'admin') + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    },

    print: function(id) {
      const c = filteredHistory.find(x => x.id === id);
      if (!c) return;
      var w = window.open('', '_blank');
      var rdvsHtml = '';
      if (c.rdvs && c.rdvs.length > 0) {
        rdvsHtml = '<h3>RDVs (' + c.rdvs.length + ')</h3><table border="1" cellpadding="6" style="border-collapse:collapse;font-size:12px;"><tr><th>Prospect</th><th>Date</th><th>Montant</th><th>Statut</th></tr>';
        c.rdvs.forEach(function(r) {
          rdvsHtml += '<tr><td>' + esc(r.prospect) + '</td><td>' + esc(r.date) + '</td><td>' + (r.montant || 0) + 'M</td><td>' + esc(r.statut) + '</td></tr>';
        });
        rdvsHtml += '</table>';
      }
      w.document.write('<!DOCTYPE html><html><head><title>Collecte ' + c.id + '</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;margin:10px 0;}td,th{padding:6px 10px;border:1px solid #ddd;text-align:left;}th{background:#f5f5f5;}</style></head><body>');
      w.document.write('<h1>Collecte — ' + esc(c.commercial || 'N/A') + '</h1>');
      w.document.write('<p><strong>Date:</strong> ' + new Date(c.created_at).toLocaleDateString('fr-FR') + '</p>');
      w.document.write('<table><tr><td><strong>CA</strong></td><td>' + formatCA(c.ca || 0) + ' FCFA</td></tr><tr><td><strong>Offres</strong></td><td>' + (c.offres || 0) + '</td></tr><tr><td><strong>BC Signes</strong></td><td>' + (c.bc || 0) + '</td></tr><tr><td><strong>Visites</strong></td><td>' + (c.visites || 0) + '</td></tr><tr><td><strong>Contacts</strong></td><td>' + (c.contacts || 0) + '</td></tr><tr><td><strong>Zone</strong></td><td>' + esc(c.zone || 'N/A') + '</td></tr><tr><td><strong>Statut</strong></td><td>' + esc(c.statut) + '</td></tr></table>');
      if (c.notes) w.document.write('<p><strong>Notes:</strong> ' + esc(c.notes) + '</p>');
      w.document.write(rdvsHtml);
      w.document.write('</body></html>');
      w.document.close();
      w.print();
    },

    confirmDelete: function(id) {
      const c = filteredHistory.find(x => x.id === id);
      if (!c) return;
      const modal = document.getElementById('history-admin-modal');
      const modalTitle = document.getElementById('history-admin-modal-title');
      const modalBody = document.getElementById('history-admin-modal-body');
      if (!modal || !modalBody) return;

      modalTitle.textContent = 'Confirmer la suppression';
      var html = '';
      html += '<div style="text-align:center;margin-bottom:16px;">';
      html += '<div style="font-size:40px;margin-bottom:8px;">⚠️</div>';
      html += '<p style="font-size:14px;color:var(--text);margin-bottom:4px;">Supprimer la collecte de <strong>' + esc(c.commercial) + '</strong> ?</p>';
      html += '<p style="font-size:12px;color:var(--muted);">Date: ' + new Date(c.created_at).toLocaleDateString('fr-FR') + ' · CA: ' + formatCA(c.ca || 0) + '</p>';
      html += '</div>';
      html += '<div id="delete-error" style="background:#fee2e2;color:#dc2626;padding:10px;border-radius:8px;font-size:13px;margin-bottom:12px;display:none;"></div>';
      html += '<div class="form-group"><label style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px;display:block;">Mot de passe admin</label>';
      html += '<input type="password" id="delete-admin-pass" placeholder="Saisissez le mot de passe admin" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text);box-sizing:border-box;"></div>';
      html += '<div style="display:flex;gap:8px;margin-top:16px;">';
      html += '<button onclick="HistoryAdmin.doDelete(' + c.id + ')" id="delete-btn" style="flex:1;padding:10px;background:#dc2626;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">Supprimer</button>';
      html += '<button onclick="HistoryAdmin.close()" style="flex:1;padding:10px;background:var(--border);color:var(--text);border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Annuler</button>';
      html += '</div>';

      modalBody.innerHTML = html;
      modal.style.display = 'flex';

      // Enter to submit
      document.getElementById('delete-admin-pass').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') HistoryAdmin.doDelete(c.id);
      });
      document.getElementById('delete-admin-pass').focus();
    },

    doDelete: function(id) {
      var password = document.getElementById('delete-admin-pass').value;
      var errEl = document.getElementById('delete-error');
      var btn = document.getElementById('delete-btn');
      if (!password) {
        errEl.textContent = 'Veuillez saisir le mot de passe admin';
        errEl.style.display = 'block';
        return;
      }
      btn.textContent = 'Suppression...';
      btn.disabled = true;

      fetch('/api/admin/collectes/' + id, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: password }),
      }).then(function(res) { return res.json(); }).then(function(data) {
        if (!data.message) {
          errEl.textContent = data.error || 'Erreur';
          errEl.style.display = 'block';
          btn.textContent = 'Supprimer';
          btn.disabled = false;
          return;
        }
        // Succès → fermer modale, recharger
        HistoryAdmin.close();
        __load_history_admin();
      }).catch(function() {
        errEl.textContent = 'Erreur de connexion';
        errEl.style.display = 'block';
        btn.textContent = 'Supprimer';
        btn.disabled = false;
      });
    }
  };

})();
