/* ========================================
   SIDEBAR — Navigation
   ======================================== */

(function() {
  var currentSection = null;
  var initialized = false;

  function switchSection(section) {
    if (!section) {
      section = 'dashboard';
    }

    // Validate section exists
    var target = document.getElementById('section-' + section);
    if (!target) {
      section = 'dashboard';
      target = document.getElementById('section-dashboard');
    }
    if (!target) return;

    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(function(el) {
      el.style.display = 'none';
    });

    // Show target
    target.style.display = '';
    target.classList.remove('section-animate-in');
    void target.offsetWidth;
    target.classList.add('section-animate-in');

    // Update sidebar active
    document.querySelectorAll('.nav-item[data-section]').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.section === section);
    });

    // Update URL hash (without triggering navigation)
    var newHash = section === 'dashboard' ? window.location.pathname : '#' + section;
    if (window.location.hash !== (section === 'dashboard' ? '' : '#' + section)) {
      history.replaceState(null, '', newHash);
    }

    // Persist
    currentSection = section;
    localStorage.setItem('commercial_section', section);

    // Close mobile sidebar
    closeSidebar();

    // Lazy load section data
    var fn = window['__load_' + section];
    if (typeof fn === 'function') {
      setTimeout(fn, 50);
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

  // Bind clicks via event delegation
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
    var ov = e.target.closest('.sidebar-overlay');
    if (ov) {
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

  // Swipe to open/close sidebar on mobile
  var touchStartX = 0;
  var touchStartY = 0;
  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    var deltaX = e.changedTouches[0].clientX - touchStartX;
    var deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
    // Only trigger if horizontal swipe and not vertical scroll
    if (Math.abs(deltaX) > 60 && deltaY < 50) {
      if (deltaX > 0 && touchStartX < 30) {
        // Swipe right from left edge — open sidebar
        var sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('mobile-open')) {
          sidebar.classList.add('mobile-open');
          document.getElementById('sidebar-overlay').classList.add('active');
        }
      } else if (deltaX < 0) {
        // Swipe left — close sidebar
        closeSidebar();
      }
    }
  }, { passive: true });

  // Expose to global scope
  window.switchSection = switchSection;
  window.toggleSidebar = toggleSidebar;
  window.closeSidebar = closeSidebar;
})();
