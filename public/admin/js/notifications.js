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
    info: { icon: 'ℹ️', color: '#2563EB', bg: '#EFF6FF' },
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

  function buildHTML() {
    return `
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
              <span class="notif-item-title">${n.title}</span>
              <span class="notif-item-time">${timeAgo(n.created_at)}</span>
            </div>
            <div class="notif-item-message">${n.message}</div>
            ${n.link ? `<a class="notif-item-link" href="${n.link}">Voir</a>` : ''}
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
        }
      } catch {}
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
    });
  }

  function injectStyles() {
    if (document.getElementById('notif-styles')) return;
    const style = document.createElement('style');
    style.id = 'notif-styles';
    style.textContent = `
      .notif-fixed-wrapper {
        position: fixed; top: 14px; right: 18px; z-index: 9998;
        display: flex; align-items: center;
      }
      .dashboard-header .header-right { margin-right: 56px; }
      .notif-bell {
        position: relative; cursor: pointer; width: 40px; height: 40px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 10px; transition: all 0.2s;
        background: #fff; border: 1px solid #E2E8F0;
        box-shadow: 0 2px 8px rgba(15,23,42,0.06);
      }
      .notif-bell:hover { background: #F8FAFC; border-color: #CBD5E1; }
      .notif-bell svg { width: 20px; height: 20px; color: #64748B; }
      .notif-bell:hover svg { color: #0F172A; }
      .notif-badge {
        position: absolute; top: 2px; right: 2px; min-width: 18px; height: 18px;
        background: #EF4444; color: #fff; font-size: 10px; font-weight: 700;
        border-radius: 9px; display: flex; align-items: center; justify-content: center;
        padding: 0 4px; border: 2px solid #fff; animation: notif-pulse 2s infinite;
      }
      @keyframes notif-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      .notif-panel {
        position: fixed; top: 60px; right: 20px; width: 400px; max-height: 80vh;
        background: #fff; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        z-index: 10000; display: flex; flex-direction: column; overflow: hidden;
        animation: notif-slide 0.2s ease;
      }
      @keyframes notif-slide { from { opacity:0; transform: translateY(-10px); } to { opacity:1; transform: translateY(0); } }
      .notif-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 16px 20px; border-bottom: 1px solid #F1F5F9;
      }
      .notif-header-left { display: flex; align-items: center; gap: 8px; }
      .notif-title { font-weight: 700; font-size: 15px; color: #0F172A; }
      .notif-count { font-size: 12px; color: #EF4444; font-weight: 600; }
      .notif-header-right { display: flex; gap: 4px; }
      .notif-action-btn {
        width: 32px; height: 32px; border: none; background: none; border-radius: 6px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        color: #64748B; transition: all 0.2s;
      }
      .notif-action-btn:hover { background: #F1F5F9; color: #0F172A; }
      .notif-action-btn.danger:hover { background: #FEF2F2; color: #EF4444; }
      .notif-action-btn svg { width: 16px; height: 16px; }
      .notif-filters {
        display: flex; gap: 4px; padding: 12px 20px; border-bottom: 1px solid #F1F5F9;
        overflow-x: auto;
      }
      .notif-filter {
        padding: 5px 12px; border: 1px solid #E2E8F0; border-radius: 16px;
        background: #fff; color: #64748B; font-size: 11px; font-weight: 500;
        cursor: pointer; white-space: nowrap; transition: all 0.2s;
      }
      .notif-filter:hover { border-color: #2563EB; color: #2563EB; }
      .notif-filter.active { background: #2563EB; color: #fff; border-color: #2563EB; }
      .notif-list { overflow-y: auto; max-height: 50vh; }
      .notif-empty { padding: 40px; text-align: center; color: #94A3B8; font-size: 13px; }
      .notif-item {
        display: flex; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #F8FAFC;
        cursor: pointer; transition: background 0.15s; position: relative;
      }
      .notif-item:hover { background: #F8FAFC; }
      .notif-item.unread { background: #EFF6FF; }
      .notif-item.unread:hover { background: #DBEAFE; }
      .notif-item-icon {
        width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; font-size: 16px;
      }
      .notif-item-content { flex: 1; min-width: 0; }
      .notif-item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .notif-item-title { font-weight: 600; font-size: 13px; color: #0F172A; }
      .notif-item-time { font-size: 11px; color: #94A3B8; white-space: nowrap; }
      .notif-item-message { font-size: 12px; color: #64748B; margin-top: 3px; line-height: 1.4; }
      .notif-item-link {
        display: inline-block; margin-top: 6px; font-size: 11px; color: #2563EB;
        font-weight: 600; text-decoration: none;
      }
      .notif-item-link:hover { text-decoration: underline; }
      .notif-item-actions {
        display: flex; flex-direction: column; gap: 2px; opacity: 0; transition: opacity 0.15s;
      }
      .notif-item:hover .notif-item-actions { opacity: 1; }
      .notif-item-btn {
        width: 24px; height: 24px; border: none; background: none; border-radius: 4px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        color: #94A3B8; transition: all 0.15s;
      }
      .notif-item-btn:hover { background: #F1F5F9; color: #059669; }
      .notif-item-btn.danger:hover { background: #FEF2F2; color: #EF4444; }
      .notif-item-btn svg { width: 14px; height: 14px; }
      @media (max-width: 480px) { .notif-panel { width: calc(100vw - 20px); right: 10px; } }
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
