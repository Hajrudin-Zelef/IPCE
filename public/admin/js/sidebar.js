/* ========================================
   SIDEBAR — Interactions & Navigation
   ======================================== */

(function() {
  'use strict';

  // --- Configuration ---
  const SIDEBAR_STATE_KEY = 'ipce_sidebar_state';
  const MOBILE_BREAKPOINT = 1024;

  // --- DOM References ---
  let sidebar, overlay, hamburger, collapseBtn;
  let navItems = [];

  // --- Initialize ---
  function init() {
    sidebar = document.getElementById('sidebar');
    overlay = document.getElementById('sidebar-overlay');
    hamburger = document.getElementById('sidebar-hamburger');
    collapseBtn = document.getElementById('sidebar-collapse-btn');

    if (!sidebar) return;

    navItems = Array.from(sidebar.querySelectorAll('.sidebar-nav-item[data-section]'));

    restoreState();
    bindEvents();
    setActiveFromURL();
    updateBadges();
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Collapse toggle
    if (collapseBtn) {
      collapseBtn.addEventListener('click', toggleCollapse);
    }

    // Mobile hamburger
    if (hamburger) {
      hamburger.addEventListener('click', toggleMobile);
    }

    // Overlay click closes mobile sidebar
    if (overlay) {
      overlay.addEventListener('click', closeMobile);
    }

    // Navigation clicks
    navItems.forEach(item => {
      item.addEventListener('click', handleNavClick);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Responsive listener
    window.addEventListener('resize', handleResize);
  }

  // --- Collapse / Expand ---
  function toggleCollapse() {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    saveState(isCollapsed);
  }

  function collapse() {
    sidebar.classList.add('collapsed');
    saveState(true);
  }

  function expand() {
    sidebar.classList.remove('collapsed');
    saveState(false);
  }

  // --- Mobile ---
  function toggleMobile() {
    const isOpen = sidebar.classList.contains('mobile-open');
    if (isOpen) {
      closeMobile();
    } else {
      openMobile();
    }
  }

  function openMobile() {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeMobile() {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  // --- Navigation ---
  function handleNavClick(e) {
    const item = e.currentTarget;
    const section = item.dataset.section;

    if (section === 'logout') {
      handleLogout();
      return;
    }

    setActive(section);

    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      closeMobile();
    }

    if (section) {
      switchSection(section);
    }
  }

  function setActive(section) {
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });
    localStorage.setItem('ipce_active_section', section);
  }

  function setActiveFromURL() {
    const hash = window.location.hash.slice(1);
    if (hash && hash !== 'dashboard') {
      setActive(hash);
      switchSection(hash);
    } else {
      setActive('dashboard');
      switchSection('dashboard');
    }
  }

  function switchSection(section) {
    document.querySelectorAll('.dashboard-section').forEach(el => {
      el.style.display = 'none';
    });
    const target = document.getElementById('section-' + section);
    if (target) {
      target.style.display = 'block';
      target.classList.remove('section-animate-in');
      void target.offsetWidth;
      target.classList.add('section-animate-in');
    }
    const header = document.querySelector('.dashboard-header');
    if (header) {
      header.style.display = section === 'dashboard' ? 'flex' : 'none';
    }
    if (section !== 'dashboard') {
      history.pushState(null, '', '#' + section);
    } else {
      history.pushState(null, '', window.location.pathname);
    }
    const loadFn = window['__load_' + section.replace(/-/g, '_')];
    if (typeof loadFn === 'function') {
      setTimeout(loadFn, 50);
    }
  }

  function scrollToSection(section) {
    switchSection(section);
  }

  // --- Badges ---
  function updateBadges() {
    const badge = sidebar.querySelector('.sidebar-nav-badge[data-badge="notifications"]');
    if (badge) {
      const count = getNotificationCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
      if (count > 0) {
        badge.classList.add('pulse');
      }
    }
  }

  function getNotificationCount() {
    const stored = localStorage.getItem('ipce_notifications_count');
    return stored ? parseInt(stored, 10) : 0;
  }

  function setNotificationCount(count) {
    localStorage.setItem('ipce_notifications_count', count);
    updateBadges();
  }

  // --- Logout ---
  async function handleLogout() {
    if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.clear();
    window.location.href = '/';
  }

  // --- Keyboard Shortcuts ---
  function handleKeyboard(e) {
    // Ctrl/Cmd + B: Toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        toggleMobile();
      } else {
        toggleCollapse();
      }
    }

    // Escape: Close mobile sidebar
    if (e.key === 'Escape') {
      closeMobile();
    }
  }

  // --- Responsive ---
  function handleResize() {
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      closeMobile();
    }
  }

  // --- State Persistence ---
  function saveState(isCollapsed) {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, isCollapsed ? 'collapsed' : 'expanded');
    } catch (e) {
      // localStorage not available
    }
  }

  function restoreState() {
    try {
      const state = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (state === 'collapsed' && window.innerWidth > MOBILE_BREAKPOINT) {
        sidebar.classList.add('collapsed');
      }
    } catch (e) {
      // localStorage not available
    }
  }

  // --- User Dropdown ---
  window.__userDropdownAction = function(action) {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    switch (action) {
      case 'profile':
        switchSection('settings');
        setTimeout(() => {
          const navItems = document.querySelectorAll('.settings-nav-item');
          navItems.forEach(b => b.classList.remove('active'));
          const secBtn = Array.from(navItems).find(b => b.textContent.includes('Sécurité'));
          if (secBtn) { secBtn.classList.add('active'); settingsTab('securite', secBtn); }
        }, 100);
        break;
      case 'password':
        switchSection('settings');
        setTimeout(() => {
          const navItems = document.querySelectorAll('.settings-nav-item');
          navItems.forEach(b => b.classList.remove('active'));
          const secBtn = Array.from(navItems).find(b => b.textContent.includes('Sécurité'));
          if (secBtn) { secBtn.classList.add('active'); settingsTab('securite', secBtn); }
        }, 100);
        break;
      case '2fa':
        switchSection('settings');
        setTimeout(() => {
          const navItems = document.querySelectorAll('.settings-nav-item');
          navItems.forEach(b => b.classList.remove('active'));
          const secBtn = Array.from(navItems).find(b => b.textContent.includes('Sécurité'));
          if (secBtn) { secBtn.classList.add('active'); settingsTab('securite', secBtn); }
        }, 100);
        break;
      case 'logout':
        handleLogout();
        break;
    }
  };

  // Close dropdown on outside click
  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('user-dropdown');
    const user = document.getElementById('sidebar-user');
    if (dropdown && !dropdown.contains(e.target) && !user?.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  // --- Public API ---
  window.Sidebar = {
    toggle: toggleCollapse,
    collapse,
    expand,
    openMobile,
    closeMobile,
    setActive,
    updateBadges,
    setNotificationCount
  };

  // --- Init on DOM Ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
