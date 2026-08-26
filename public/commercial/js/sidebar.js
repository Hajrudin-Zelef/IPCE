/* ========================================
   SIDEBAR — Navigation
   ======================================== */

(function() {
  let currentSection = localStorage.getItem('commercial_section') || 'dashboard';

  function switchSection(section) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(function(el) {
      el.style.display = 'none';
    });
    // Show target
    var target = document.getElementById('section-' + section);
    if (target) {
      target.style.display = '';
      target.classList.remove('section-animate-in');
      void target.offsetWidth;
      target.classList.add('section-animate-in');
    }
    // Update sidebar active
    document.querySelectorAll('.nav-item[data-section]').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
    // Update URL hash
    history.pushState(null, '', section === 'dashboard' ? window.location.pathname : '#' + section);
    // Persist
    currentSection = section;
    localStorage.setItem('commercial_section', section);
    // Close mobile sidebar
    closeSidebar();
    // Lazy load section data
    var loadFn = window['__load_'.replace(/_/g, '') + 'load_' + section];
    if (typeof window['__load_' + section] === 'function') {
      setTimeout(function() { window['__load_' + section](); }, 50);
    }
  }

  function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  }

  function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
  }

  function setActiveFromURL() {
    var hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById('section-' + hash)) {
      currentSection = hash;
    }
    localStorage.setItem('commercial_section', currentSection);
  }

  // Bind clicks
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.nav-item[data-section]');
    if (btn) {
      e.preventDefault();
      switchSection(btn.dataset.section);
      return;
    }
    var toggle = e.target.closest('.sidebar-toggle');
    if (toggle) {
      toggleSidebar();
      return;
    }
    var overlay = e.target.closest('.sidebar-overlay');
    if (overlay) {
      closeSidebar();
    }
  });

  // Keyboard shortcut
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    if (e.key === 'Escape') closeSidebar();
  });

  // Init
  setActiveFromURL();
  switchSection(currentSection);

  window.switchSection = switchSection;
  window.toggleSidebar = toggleSidebar;
  window.closeSidebar = closeSidebar;
})();
