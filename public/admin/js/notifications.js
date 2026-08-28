// Marexsoft Corporation
(function () {
  let notifications = [];
  let unreadCount = 0;
  let isOpen = false;
  let audioEnabled = true;
  let ws = null;
  let reconnectTimer = null;
  let reconnectDelay = 1000;

  const TYPE_CONFIG = {
    collecte_pending: { icon: '⏳', color: '#F59E0B', bg: '#FFFBEB' },
    collecte_approved: { icon: '✅', color: '#059669', bg: '#ECFDF5' },
    collecte_rejected: { icon: '❌', color: '#EF4444', bg: '#FEF2F2' },
    reminder: { icon: '🔔', color: '#7C3AED', bg: '#F5F3FF' },
    system: { icon: '⚙️', color: '#64748B', bg: '#F8FAFC' },
    info: { icon: 'ℹ️', color: '#E31C23', bg: '#EFF6FF' },
  };

  function timeAgo(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "a l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return `il y a ${Math.floor(diff / 86400)}j`;
  }

  const PALETTES = {
    rouge:   { primary: '#E31C23', light: '#EF4444', dark: '#B91C1C', label: 'Rouge' },
    bleu:    { primary: '#2563EB', light: '#3B82F6', dark: '#1D4ED8', label: 'Bleu' },
    violet:  { primary: '#7C3AED', light: '#8B5CF6', dark: '#6D28D9', label: 'Violet' },
    vert:    { primary: '#10B981', light: '#34D399', dark: '#059669', label: 'Vert' },
    emeraude:{ primary: '#059669', light: '#10B981', dark: '#047857', label: 'Émeraude' },
    teal:    { primary: '#0891B2', light: '#06B6D4', dark: '#0E7490', label: 'Teal' },
    orange:  { primary: '#F97316', light: '#FB923C', dark: '#EA580C', label: 'Orange' },
    jaune:   { primary: '#EAB308', light: '#FACC15', dark: '#CA8A04', label: 'Jaune' },
    gris:    { primary: '#6B7280', light: '#9CA3AF', dark: '#4B5563', label: 'Gris' },
    bleupur: { primary: '#0066FF', light: '#3385FF', dark: '#0052CC', label: 'Bleu pur' },
    rose:    { primary: '#EC4899', light: '#F472B6', dark: '#DB2777', label: 'Rose' },
  };

  function getCurrentPalette() {
    try { return localStorage.getItem('ipce_palette') || 'rouge'; } catch (e) { return 'rouge'; }
  }

  function applyPalette(name) {
    const p = PALETTES[name];
    if (!p) return;
    const r = document.documentElement;
    r.style.setProperty('--primary', p.primary);
    r.style.setProperty('--primary-light', p.light);
    r.style.setProperty('--primary-dark', p.dark);
    r.style.setProperty('--header-bg', `linear-gradient(135deg, ${p.primary}0a 0%, ${p.primary}06 100%)`);
    r.style.setProperty('--shadow-glow', `0 0 20px ${p.primary}40`);
    try { localStorage.setItem('ipce_palette', name); } catch (e) {}
    const dot = document.getElementById('palette-dot');
    if (dot) dot.style.background = p.primary;
  }

  function initPalette() {
    const name = getCurrentPalette();
    applyPalette(name);
  }

  function buildHTML() {
    return `
      <div class="palette-btn" id="palette-btn" title="Couleur d'accent">
        <span class="palette-dot" id="palette-dot"></span>
      </div>
      <div class="palette-dropdown" id="palette-dropdown" style="display:none;"></div>
      <div class="theme-toggle-btn" id="theme-toggle" title="Changer de thème">
        <svg class="theme-toggle-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg class="theme-toggle-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </div>
      <div class="notif-bell" id="notif-bell" title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span class="notif-badge" id="notif-badge" style="display:none;">0</span>
      </div>
      <div class="notif-panel" id="notif-panel" style="display:none;">
        <div class="notif-header">
          <div class="notif-header-left">
            <span class="notif-title">Notifications</span>
            <span class="notif-count" id="notif-panel-count"></span>
          </div>
          <div class="notif-header-right">
            <button class="notif-action-btn" id="notif-mark-all" title="Tout marquer comme lu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="notif-action-btn" id="notif-sound-toggle" title="Son on/off">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
            </button>
            <button class="notif-action-btn danger" id="notif-clear-all" title="Supprimer tout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
        <div class="notif-filters">
          <button class="notif-filter active" data-filter="all">Toutes</button>
          <button class="notif-filter" data-filter="unread">Non lues</button>
          <button class="notif-filter" data-filter="collecte_pending">En attente</button>
          <button class="notif-filter" data-filter="collecte_approved">Approuvees</button>
          <button class="notif-filter" data-filter="collecte_rejected">Rejetees</button>
        </div>
        <div class="notif-list" id="notif-list">
          <div class="notif-empty">Chargement...</div>
        </div>
      </div>
    `;
  }

  function renderList(filter) {
    const list = document.getElementById('notif-list');
    if (!list) return;
    let filtered = [...notifications];
    if (filter === 'unread') filtered = filtered.filter((n) => !n.is_read);
    else if (filter !== 'all') filtered = filtered.filter((n) => n.type === filter);

    if (filtered.length === 0) {
      list.innerHTML = '<div class="notif-empty">Aucune notification</div>';
      return;
    }

    list.innerHTML = filtered
      .map((n) => {
        const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
        return `
        <div class="notif-item ${n.is_read ? 'read' : 'unread'}" data-id="${n.id}">
          <div class="notif-item-icon" style="background:${cfg.bg}; color:${cfg.color};">${cfg.icon}</div>
          <div class="notif-item-content">
            <div class="notif-item-header">
              <span class="notif-item-title">${escapeHtml(n.title)}</span>
              <span class="notif-item-time">${timeAgo(n.created_at)}</span>
            </div>
            <div class="notif-item-message">${escapeHtml(n.message)}</div>
            ${n.link ? `<a class="notif-item-link" href="${escapeHtml(n.link)}">Voir</a>` : ''}
          </div>
          <div class="notif-item-actions">
            ${
              !n.is_read
                ? `<button class="notif-item-btn" data-action="read" data-id="${n.id}" title="Marquer comme lu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>`
                : ''
            }
            <button class="notif-item-btn danger" data-action="delete" data-id="${n.id}" title="Supprimer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      `;
      })
      .join('');
  }

  function updateBadge() {
    const badge = document.getElementById('notif-badge');
    const countEl = document.getElementById('notif-panel-count');
    if (badge) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    if (countEl) {
      countEl.textContent = unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : '';
    }
    // Update sidebar badge
    const sidebarBadge = document.querySelector('.sidebar-nav-badge[data-badge="notifications"]');
    if (sidebarBadge) {
      sidebarBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      sidebarBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
  }

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/admin/notifications', { credentials: 'include' });
      if (!res.ok) return;
      notifications = await res.json();
      unreadCount = notifications.filter((n) => !n.is_read).length;
      updateBadge();
      const activeFilter = document.querySelector('.notif-filter.active');
      renderList(activeFilter ? activeFilter.dataset.filter : 'all');
    } catch {}
  }

  function playNotifSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  async function markAsRead(id) {
    await fetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
    const n = notifications.find((n) => n.id === id);
    if (n && !n.is_read) {
      n.is_read = 1;
      unreadCount = Math.max(0, unreadCount - 1);
    }
    updateBadge();
    const activeFilter = document.querySelector('.notif-filter.active');
    renderList(activeFilter ? activeFilter.dataset.filter : 'all');
  }

  async function markAllRead() {
    await fetch('/api/admin/notifications/read-all', { method: 'PATCH', credentials: 'include' });
    notifications.forEach((n) => (n.is_read = 1));
    unreadCount = 0;
    updateBadge();
    const activeFilter = document.querySelector('.notif-filter.active');
    renderList(activeFilter ? activeFilter.dataset.filter : 'all');
  }

  async function deleteNotif(id) {
    await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      if (!notifications[idx].is_read) unreadCount = Math.max(0, unreadCount - 1);
      notifications.splice(idx, 1);
    }
    updateBadge();
    const activeFilter = document.querySelector('.notif-filter.active');
    renderList(activeFilter ? activeFilter.dataset.filter : 'all');
  }

  async function clearAll() {
    if (!confirm('Supprimer toutes les notifications ?')) return;
    await fetch('/api/admin/notifications', { method: 'DELETE', credentials: 'include' });
    notifications = [];
    unreadCount = 0;
    updateBadge();
    renderList('all');
  }

  // --- WebSocket ---
  function connectWS() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws`);

    ws.onopen = () => {
      reconnectDelay = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_notification') {
          fetchNotifications();
          if (audioEnabled) playNotifSound();
        } else if (data.type === 'notification_read') {
          const n = notifications.find((n) => n.id === data.id);
          if (n && !n.is_read) {
            n.is_read = 1;
            unreadCount = Math.max(0, unreadCount - 1);
            updateBadge();
            const activeFilter = document.querySelector('.notif-filter.active');
            renderList(activeFilter ? activeFilter.dataset.filter : 'all');
          }
        } else if (data.type === 'notifications_cleared') {
          notifications = [];
          unreadCount = 0;
          updateBadge();
          renderList('all');
        } else if (data.type === 'new_insights') {
          fetchNotifications();
          if (audioEnabled) playNotifSound();
        }
      } catch {}
// Marexsoft Corporation
    };

    ws.onclose = () => {
      reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        connectWS();
      }, reconnectDelay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  // Reconnect on visibility change (mobile tab switch)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        reconnectDelay = 1000;
        connectWS();
      }
      fetchNotifications();
    }
  });

  function togglePanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    isOpen = !isOpen;
    panel.style.display = isOpen ? 'block' : 'none';
    if (isOpen) {
      fetchNotifications();
      document.addEventListener('click', handleOutsideClick, true);
    } else {
      document.removeEventListener('click', handleOutsideClick, true);
    }
  }

  function handleOutsideClick(e) {
    const panel = document.getElementById('notif-panel');
    const bell = document.getElementById('notif-bell');
    if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) {
      isOpen = false;
      panel.style.display = 'none';
      document.removeEventListener('click', handleOutsideClick, true);
    }
  }

  function bindEvents() {
    document.addEventListener('click', (e) => {
      const bell = e.target.closest('#notif-bell');
      if (bell) {
        e.stopPropagation();
        togglePanel();
        return;
      }
      const themeBtn = e.target.closest('#theme-toggle');
      if (themeBtn) {
        e.stopPropagation();
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ipce_theme', next);
        return;
      }
      const palBtn = e.target.closest('#palette-btn');
      if (palBtn) {
        e.stopPropagation();
        const dd = document.getElementById('palette-dropdown');
        if (dd.style.display === 'none') {
          dd.innerHTML = '<div class="palette-label">Palette d\'accent</div><div class="palette-grid">' +
            Object.entries(PALETTES).map(([k, v]) =>
              `<div class="palette-item${getCurrentPalette() === k ? ' active' : ''}" data-palette="${k}" title="${v.label}">
                <div class="palette-item-swatch" style="background:${v.primary}"></div>
              </div>`
            ).join('') + '</div>';
          dd.style.display = 'block';
        } else {
          dd.style.display = 'none';
        }
        return;
      }
      const palItem = e.target.closest('.palette-item');
      if (palItem) {
        e.stopPropagation();
        applyPalette(palItem.dataset.palette);
        document.getElementById('palette-dropdown').style.display = 'none';
        return;
      }
      const palDrop = e.target.closest('#palette-dropdown');
      if (palDrop) { e.stopPropagation(); return; }
      const filterBtn = e.target.closest('.notif-filter');
      if (filterBtn) {
        document.querySelectorAll('.notif-filter').forEach((b) => b.classList.remove('active'));
        filterBtn.classList.add('active');
        renderList(filterBtn.dataset.filter);
        return;
      }
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        const id = parseInt(actionBtn.dataset.id);
        if (action === 'read') markAsRead(id);
        else if (action === 'delete') deleteNotif(id);
        return;
      }
      const markAllBtn = e.target.closest('#notif-mark-all');
      if (markAllBtn) {
        markAllRead();
        return;
      }
      const clearAllBtn = e.target.closest('#notif-clear-all');
      if (clearAllBtn) {
        clearAll();
        return;
      }
      const soundBtn = e.target.closest('#notif-sound-toggle');
      if (soundBtn) {
        audioEnabled = !audioEnabled;
        soundBtn.style.opacity = audioEnabled ? '1' : '0.4';
        return;
      }
      const item = e.target.closest('.notif-item');
      if (item) {
        const id = parseInt(item.dataset.id);
        const n = notifications.find((n) => n.id === id);
        if (n && !n.is_read) markAsRead(id);
        if (n && n.link) {
          isOpen = false;
          document.getElementById('notif-panel').style.display = 'none';
        }
      }
      const dd = document.getElementById('palette-dropdown');
      if (dd && dd.style.display !== 'none' && !e.target.closest('#palette-btn')) {
        dd.style.display = 'none';
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('notif-styles')) return;
    const style = document.createElement('style');
    style.id = 'notif-styles';
    style.textContent = `
      .notif-fixed-wrapper {
        position: fixed; top: 14px; right: 18px; z-index: 9998;
        display: flex; align-items: center; gap: 6px;
      }
      .dashboard-header .header-right { margin-right: 120px; }
      .theme-toggle-btn {
        position: relative; cursor: pointer; width: 34px; height: 34px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px; transition: all 0.2s;
        background: var(--card, #fff); border: 1px solid var(--border, #E2E8F0);
        box-shadow: 0 2px 8px rgba(15,23,42,0.06);
      }
      .theme-toggle-btn:hover { background: var(--bg-alt, #F8FAFC); border-color: #CBD5E1; }
      .theme-toggle-btn svg { width: 18px; height: 18px; color: var(--muted, #64748B); }
      .theme-toggle-btn:hover svg { color: var(--text, #0F172A); }
      [data-theme="dark"] .theme-toggle-btn { background: var(--card, #111827); border-color: var(--border, #1E293B); }
      [data-theme="dark"] .theme-toggle-btn:hover { background: var(--bg-alt, #1E293B); border-color: var(--muted, #CBD5E1); }
      [data-theme="dark"] .theme-toggle-btn svg { color: var(--muted, #CBD5E1); }
      [data-theme="dark"] .theme-toggle-btn:hover svg { color: var(--text, #F8FAFC); }
      [data-theme="light"] .theme-toggle-icon-sun { display: none; }
      [data-theme="dark"] .theme-toggle-icon-moon { display: none; }
      .palette-btn {
        position: relative; cursor: pointer; width: 34px; height: 34px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px; transition: all 0.2s;
        background: var(--card, #fff); border: 1px solid var(--border, #E2E8F0);
        box-shadow: 0 2px 8px rgba(15,23,42,0.06);
      }
      .palette-btn:hover { background: var(--bg-alt, #F8FAFC); border-color: #CBD5E1; }
      .palette-dot {
        width: 16px; height: 16px; border-radius: 50%;
        background: var(--primary, #E31C23);
        border: 2px solid var(--card, #fff);
        box-shadow: 0 0 0 1px var(--border, #E2E8F0);
        transition: background 0.2s;
      }
      [data-theme="dark"] .palette-btn { background: var(--card, #111827); border-color: var(--border, #1E293B); }
      [data-theme="dark"] .palette-btn:hover { background: var(--bg-alt, #1E293B); }
      [data-theme="dark"] .palette-dot { border-color: var(--card, #111827); box-shadow: 0 0 0 1px var(--border, #1E293B); }
      .palette-dropdown {
        position: fixed; top: 54px; right: 18px; z-index: 9999;
        background: var(--card, #fff); border: 1px solid var(--border, #E2E8F0);
        border-radius: 12px; padding: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        animation: notif-slide 0.15s ease;
        min-width: 180px;
      }
      [data-theme="dark"] .palette-dropdown { background: var(--card, #111827); border-color: var(--border, #1E293B); }
      .palette-label { font-size: 11px; font-weight: 600; color: var(--muted, #64748B); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
      .palette-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .palette-item {
        width: 34px; height: 34px; border-radius: 50%; border: 2px solid transparent;
        cursor: pointer; transition: all 0.15s; position: relative;
        display: flex; align-items: center; justify-content: center;
      }
      .palette-item:hover { transform: scale(1.15); }
      .palette-item.active { border-color: var(--text, #111); }
      .palette-item.active::after {
        content: ''; width: 10px; height: 10px; border-radius: 50%;
        background: var(--card, #fff); position: absolute;
        box-shadow: 0 0 4px rgba(0,0,0,0.3);
      }
      .palette-item-swatch { width: 22px; height: 22px; border-radius: 50%; }
      .notif-bell {
        position: relative; cursor: pointer; width: 34px; height: 34px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px; transition: all 0.2s;
        background: var(--card, #fff); border: 1px solid var(--border, #E2E8F0);
        box-shadow: 0 2px 8px rgba(15,23,42,0.06);
      }
      .notif-bell:hover { background: var(--bg-alt, #F8FAFC); border-color: #CBD5E1; }
      .notif-bell svg { width: 18px; height: 18px; color: var(--muted, #64748B); }
      .notif-bell:hover svg { color: var(--text, #0F172A); }
      .notif-badge {
        position: absolute; top: 2px; right: 2px; min-width: 16px; height: 16px;
        background: #EF4444; color: #fff; font-size: 9px; font-weight: 700;
        border-radius: 8px; display: flex; align-items: center; justify-content: center;
        padding: 0 3px; border: 2px solid var(--card, #fff); animation: notif-pulse 2s infinite;
      }
      @keyframes notif-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      .notif-panel {
        position: fixed; top: 52px; right: 12px; width: 360px; max-height: 75vh;
        background: var(--card, #fff); border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        border: 1px solid var(--border-light, #F1F5F9);
        z-index: 500; display: flex; flex-direction: column; overflow: hidden;
        animation: notif-slide 0.2s ease;
      }
      @keyframes notif-slide { from { opacity:0; transform: translateY(-10px); } to { opacity:1; transform: translateY(0); } }
      .notif-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 14px 16px; border-bottom: 1px solid var(--border-light, #F1F5F9);
      }
      .notif-header-left { display: flex; align-items: center; gap: 8px; }
      .notif-title { font-weight: 700; font-size: 14px; color: var(--text, #0F172A); }
      .notif-count { font-size: 11px; color: #EF4444; font-weight: 600; }
      .notif-header-right { display: flex; gap: 4px; }
      .notif-action-btn {
        width: 28px; height: 28px; border: none; background: none; border-radius: 6px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        color: var(--muted, #64748B); transition: all 0.2s;
      }
      .notif-action-btn:hover { background: var(--bg-alt, #F1F5F9); color: var(--text, #0F172A); }
      .notif-action-btn.danger:hover { background: #FEF2F2; color: #EF4444; }
      .notif-action-btn svg { width: 14px; height: 14px; }
      .notif-filters {
        display: flex; gap: 4px; padding: 10px 16px; border-bottom: 1px solid var(--border-light, #F1F5F9);
        overflow-x: auto;
      }
      .notif-filter {
        padding: 4px 10px; border: 1px solid var(--border, #E2E8F0); border-radius: 16px;
        background: var(--card, #fff); color: var(--muted, #64748B); font-size: 10px; font-weight: 500;
        cursor: pointer; white-space: nowrap; transition: all 0.2s;
      }
      .notif-filter:hover { border-color: #E31C23; color: #E31C23; }
      .notif-filter.active { background: #E31C23; color: #fff; border-color: #E31C23; }
      .notif-list { overflow-y: auto; max-height: 50vh; }
      .notif-empty { padding: 30px; text-align: center; color: var(--muted, #94A3B8); font-size: 12px; }
      .notif-item {
        display: flex; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border-light, #F8FAFC);
        cursor: pointer; transition: background 0.15s; position: relative;
      }
      .notif-item:hover { background: var(--bg-alt, #F8FAFC); }
      .notif-item.unread { background: rgba(59,130,246,0.08); }
      .notif-item.unread:hover { background: rgba(59,130,246,0.12); }
      .notif-item-icon {
        width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; font-size: 14px;
      }
      .notif-item-content { flex: 1; min-width: 0; }
      .notif-item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .notif-item-title { font-weight: 600; font-size: 12px; color: var(--text, #0F172A); }
      .notif-item-time { font-size: 10px; color: var(--muted, #94A3B8); white-space: nowrap; }
      .notif-item-message { font-size: 11px; color: var(--text-secondary, #64748B); margin-top: 2px; line-height: 1.4; }
      .notif-item-link {
        display: inline-block; margin-top: 4px; font-size: 10px; color: #E31C23;
        font-weight: 600; text-decoration: none;
      }
      .notif-item-link:hover { text-decoration: underline; }
      .notif-item-actions {
        display: flex; flex-direction: column; gap: 2px; opacity: 0; transition: opacity 0.15s;
      }
      .notif-item:hover .notif-item-actions { opacity: 1; }
      .notif-item-btn {
        width: 22px; height: 22px; border: none; background: none; border-radius: 4px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        color: var(--muted, #94A3B8); transition: all 0.15s;
      }
      .notif-item-btn:hover { background: var(--bg-alt, #F1F5F9); color: #059669; }
      .notif-item-btn.danger:hover { background: #FEF2F2; color: #EF4444; }
      .notif-item-btn svg { width: 12px; height: 12px; }
      @media (max-width: 768px) {
        .notif-panel { width: calc(100vw - 16px); right: 8px; max-height: 70vh; }
        .notif-bell { width: 32px; height: 32px; }
        .notif-bell svg { width: 16px; height: 16px; }
        .theme-toggle-btn { width: 32px; height: 32px; }
        .theme-toggle-btn svg { width: 16px; height: 16px; }
      }
      @media (max-width: 480px) {
        .notif-panel { width: calc(100vw - 12px); right: 6px; top: 48px; max-height: 65vh; }
        .notif-bell { width: 30px; height: 30px; }
        .notif-bell svg { width: 14px; height: 14px; }
        .theme-toggle-btn { width: 30px; height: 30px; }
        .theme-toggle-btn svg { width: 14px; height: 14px; }
        .notif-item { padding: 10px 12px; gap: 8px; }
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    if (document.getElementById('notif-bell')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'notif-fixed-wrapper';
    wrapper.innerHTML = buildHTML();
    document.body.appendChild(wrapper);

    bindEvents();
    initPalette();
    fetchNotifications();
    connectWS();
  }

  window.__notifRefresh = fetchNotifications;
  window.__notifCount = () => unreadCount;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
// Marexsoft Corporation
