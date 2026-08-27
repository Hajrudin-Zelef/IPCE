// Marexsoft Corporation
window.__load_docs = async function () {
  const el = document.getElementById('section-docs-content');

  const docs = [
    {
      group: 'Général',
      items: [
        {
          file: 'Architecture.md',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
          label: 'Architecture',
        },
        {
          file: 'Installation.md',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
          label: 'Installation',
        },
        {
          file: 'Deployment.md',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
          label: 'Déploiement',
        },
      ],
    },
    {
      group: 'Sécurité',
      items: [
        {
          file: 'Auth.md',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
          label: 'Authentification',
        },
      ],
    },
    {
      group: 'Support',
      items: [
        {
          file: 'Troubleshooting.md',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
          label: 'Dépannage',
        },
        {
          file: 'FAQ.md',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
          label: 'FAQ',
        },
      ],
    },
  ];

  // --- Markdown Renderer (marked.js + highlight.js) ---
  function renderMarkdown(md) {
    const html = marked.parse(md, {
      gfm: true,
      breaks: false,
      headerIds: true,
      mangle: false,
    });
    return html;
  }

  function highlightCodeBlocks() {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }

  function syncHighlightTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const lightSheet = document.getElementById('hljs-light');
// Marexsoft Corporation
    const darkSheet = document.getElementById('hljs-dark');
    if (lightSheet) lightSheet.disabled = isDark;
    if (darkSheet) darkSheet.disabled = !isDark;
  }

  // --- Build layout ---
  el.innerHTML = `
    <div class="docs-layout">
      <aside class="docs-sidebar" id="docs-sidebar">
        <div class="docs-sidebar-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          Documentation
        </div>
        ${docs
          .map(
            (group) => `
          <div class="docs-sidebar-group">
            <div class="docs-sidebar-group-title">${group.group}</div>
            ${group.items
              .map(
                (d) => `
              <button class="docs-sidebar-item ${d.file === 'Architecture.md' ? 'active' : ''}" data-file="${d.file}" onclick="window.__selectDoc('${d.file}', this)">
                <span class="docs-sidebar-icon">${d.icon}</span>
                <span>${d.label}</span>
              </button>`
              )
              .join('')}
          </div>`
          )
          .join('')}
      </aside>
      <main class="docs-main" id="docs-main">
        <div class="docs-loading">
          <div class="docs-loading-spinner"></div>
          <span>Chargement...</span>
        </div>
      </main>
    </div>
  `;

  window.__selectDoc = async function (file, btn) {
    document.querySelectorAll('.docs-sidebar-item').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const main = document.getElementById('docs-main');
    main.innerHTML =
      '<div class="docs-loading"><div class="docs-loading-spinner"></div><span>Chargement de ' +
      file.replace('.md', '') +
      '...</span></div>';
    try {
      const res = await fetch('/docs/' + file);
      if (!res.ok) throw new Error('Fichier non trouvé');
      const text = await res.text();
      main.innerHTML = `<div class="docs-content-inner">${renderMarkdown(text)}</div>`;
      main.scrollTop = 0;
      highlightCodeBlocks();
      syncHighlightTheme();
    } catch (e) {
      main.innerHTML = '<div class="docs-error">Impossible de charger ' + file + '</div>';
    }
  };

  // Listen for theme changes
  const observer = new MutationObserver(() => {
    syncHighlightTheme();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Load first doc
  const firstBtn = document.querySelector('.docs-sidebar-item');
  if (firstBtn) window.__selectDoc('Architecture.md', firstBtn);
};
// Marexsoft Corporation
