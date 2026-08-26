window.__load_docs = async function() {
  const el = document.getElementById('section-docs-content');

  const docs = [
    {
      group: 'Général',
      items: [
        { file: 'Architecture.md', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>', label: 'Architecture' },
        { file: 'Installation.md', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', label: 'Installation' },
        { file: 'Deployment.md', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>', label: 'Déploiement' },
      ]
    },
    {
      group: 'Sécurité',
      items: [
        { file: 'Auth.md', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>', label: 'Authentification' },
      ]
    },
    {
      group: 'Support',
      items: [
        { file: 'Troubleshooting.md', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>', label: 'Dépannage' },
        { file: 'FAQ.md', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', label: 'FAQ' },
      ]
    }
  ];

  // --- Premium Markdown Renderer ---
  function renderMarkdown(md) {
    const lines = md.split('\n');
    const tokens = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code block
      if (line.match(/^```/)) {
        const lang = line.replace(/^```/, '').trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].match(/^```/)) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        tokens.push({ type: 'code', lang, code: codeLines.join('\n') });
        continue;
      }

      // Table
      if (line.match(/^\|/) && i + 1 < lines.length && lines[i + 1].match(/^\|[\s\-|]+\|/)) {
        const headers = line.split('|').filter(c => c.trim()).map(c => c.trim());
        i += 2; // skip header + separator
        const rows = [];
        while (i < lines.length && lines[i].match(/^\|/)) {
          rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()));
          i++;
        }
        tokens.push({ type: 'table', headers, rows });
        continue;
      }

      // Headings
      if (line.match(/^#### /)) {
        tokens.push({ type: 'h4', text: line.replace(/^#### /, '') });
        i++; continue;
      }
      if (line.match(/^### /)) {
        tokens.push({ type: 'h3', text: line.replace(/^### /, '') });
        i++; continue;
      }
      if (line.match(/^## /)) {
        tokens.push({ type: 'h2', text: line.replace(/^## /, '') });
        i++; continue;
      }
      if (line.match(/^# /)) {
        tokens.push({ type: 'h1', text: line.replace(/^# /, '') });
        i++; continue;
      }

      // Blockquote
      if (line.match(/^> /)) {
        tokens.push({ type: 'blockquote', text: line.replace(/^> /, '') });
        i++; continue;
      }

      // Horizontal rule
      if (line.match(/^---+$/)) {
        tokens.push({ type: 'hr' });
        i++; continue;
      }

      // Unordered list
      if (line.match(/^- /)) {
        const items = [];
        while (i < lines.length && lines[i].match(/^- /)) {
          items.push(lines[i].replace(/^- /, ''));
          i++;
        }
        tokens.push({ type: 'ul', items });
        continue;
      }

      // Ordered list
      if (line.match(/^\d+\. /)) {
        const items = [];
        while (i < lines.length && lines[i].match(/^\d+\. /)) {
          items.push(lines[i].replace(/^\d+\. /, ''));
          i++;
        }
        tokens.push({ type: 'ol', items });
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        i++; continue;
      }

      // Paragraph - collect consecutive non-empty lines
      const paraLines = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^(#{1,4} |```|> |- |\d+\. |\||---)/)) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        tokens.push({ type: 'p', text: paraLines.join(' ') });
      }
    }

    // --- Render tokens to HTML ---
    function inline(text) {
      return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="d-inline-code">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    }

    let html = '';
    for (const t of tokens) {
      switch (t.type) {
        case 'h1':
          html += `<div class="d-h1">${inline(t.text)}</div>`;
          break;
        case 'h2':
          html += `<div class="d-h2">${inline(t.text)}</div>`;
          break;
        case 'h3':
          html += `<div class="d-h3">${inline(t.text)}</div>`;
          break;
        case 'h4':
          html += `<div class="d-h4">${inline(t.text)}</div>`;
          break;
        case 'p':
          html += `<p class="d-p">${inline(t.text)}</p>`;
          break;
        case 'blockquote':
          html += `<blockquote class="d-blockquote">${inline(t.text)}</blockquote>`;
          break;
        case 'hr':
          html += '<hr class="d-hr">';
          break;
        case 'ul':
          html += '<ul class="d-ul">' + t.items.map(item => `<li>${inline(item)}</li>`).join('') + '</ul>';
          break;
        case 'ol':
          html += '<ol class="d-ol">' + t.items.map(item => `<li>${inline(item)}</li>`).join('') + '</ol>';
          break;
        case 'code':
          const highlighted = t.code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          html += `<div class="d-code-block"><div class="d-code-lang">${t.lang || 'code'}</div><pre><code>${highlighted}</code></pre></div>`;
          break;
        case 'table':
          html += '<div class="d-table-wrap"><table class="d-table"><thead><tr>';
          html += t.headers.map(h => `<th>${inline(h)}</th>`).join('');
          html += '</tr></thead><tbody>';
          for (const row of t.rows) {
            html += '<tr>' + row.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
          }
          html += '</tbody></table></div>';
          break;
      }
    }
    return html;
  }

  // --- Build layout ---
  el.innerHTML = `
    <div class="docs-layout">
      <aside class="docs-sidebar" id="docs-sidebar">
        <div class="docs-sidebar-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          Documentation
        </div>
        ${docs.map(group => `
          <div class="docs-sidebar-group">
            <div class="docs-sidebar-group-title">${group.group}</div>
            ${group.items.map((d, i) => `
              <button class="docs-sidebar-item ${d.file === 'Architecture.md' ? 'active' : ''}" data-file="${d.file}" onclick="window.__selectDoc('${d.file}', this)">
                <span class="docs-sidebar-icon">${d.icon}</span>
                <span>${d.label}</span>
              </button>
            `).join('')}
          </div>
        `).join('')}
      </aside>
      <main class="docs-main" id="docs-main">
        <div class="docs-loading">
          <div class="docs-loading-spinner"></div>
          <span>Chargement...</span>
        </div>
      </main>
    </div>
  `;

  window.__selectDoc = async function(file, btn) {
    document.querySelectorAll('.docs-sidebar-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const main = document.getElementById('docs-main');
    main.innerHTML = '<div class="docs-loading"><div class="docs-loading-spinner"></div><span>Chargement de ' + file.replace('.md', '') + '...</span></div>';
    try {
      const res = await fetch('/docs/' + file);
      if (!res.ok) throw new Error('Fichier non trouvé');
      const text = await res.text();
      main.innerHTML = `<div class="docs-content-inner">${renderMarkdown(text)}</div>`;
      main.scrollTop = 0;
    } catch (e) {
      main.innerHTML = '<div class="docs-error">Impossible de charger ' + file + '</div>';
    }
  };

  // Load first doc
  const firstBtn = document.querySelector('.docs-sidebar-item');
  if (firstBtn) window.__selectDoc('Architecture.md', firstBtn);
};
