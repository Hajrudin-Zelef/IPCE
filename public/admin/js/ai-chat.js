// Marexsoft Corporation
(function () {
  let isOpen = false;
  let isLoading = false;
  let history = [];
  let godmode = false;
  let currentAbortController = null;

  // Toggle states
  let toggleThinking = false;
  let toggleWebsearch = false;
  let attachedFile = null;

  const SUGGESTIONS = [
    'Quel est le CA total ?',
    'Quel commercial est le meilleur ?',
    'Prévision fin de mois',
    'Génère un rapport',
  ];

  function buildHTML() {
    return `
      <button class="ai-header-trigger" id="ai-fab" title="Assistant IA">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z"/>
          <path d="M19 21v-2a4 4 0 00-3-3.87"/>
          <path d="M5 21v-2a4 4 0 013-3.87"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
        </svg>
      </button>
      <div class="ai-panel" id="ai-panel">
        <div class="ai-header">
          <div class="ai-header-left">
            <div class="ai-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 21v-2a4 4 0 00-3-3.87"/><path d="M5 21v-2a4 4 0 013-3.87"/></svg>
            </div>
            <div class="ai-header-info">
              <div class="ai-header-title" id="ai-title">Assistant IA</div>
              <div class="ai-header-status" id="ai-status">Pret</div>
            </div>
          </div>
          <div class="ai-header-right">
            <button class="ai-header-btn" id="ai-clear" title="Nouvelle conversation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
            <button class="ai-header-btn" id="ai-close" title="Fermer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="ai-messages" id="ai-messages">
          <div class="ai-empty" id="ai-empty">
            <div class="ai-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 21v-2a4 4 0 00-3-3.87"/><path d="M5 21v-2a4 4 0 013-3.87"/></svg>
            </div>
            <div class="ai-empty-title">Bonjour !</div>
            <div class="ai-empty-desc">Posez une question sur vos donnees commerciales.<br>Ex: "Quel est le CA total ?"</div>
          </div>
        </div>
        <div class="ai-suggestions" id="ai-suggestions">
          ${SUGGESTIONS.map(s => `<button class="ai-suggestion" onclick="window.__aiSendSuggestion('${s}')">${s}</button>`).join('')}
        </div>
        <div class="ai-attached-file" id="ai-attached-file" style="display:none;">
          <span class="ai-attached-icon">📎</span>
          <span class="ai-attached-name" id="ai-attached-name"></span>
          <button class="ai-attached-remove" id="ai-attached-remove" title="Retirer le fichier">✕</button>
        </div>
        <div class="ai-input-area">
          <div class="ai-plus-wrapper">
            <button class="ai-plus-btn" id="ai-plus-btn" title="Plus d'options">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <div class="ai-plus-menu" id="ai-plus-menu">
              <label class="ai-plus-item ai-plus-item-file">
                <input type="file" id="ai-file-input" accept=".txt,.csv,.md,.json,.pdf" hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                <span>Joindre un fichier</span>
              </label>
              <button class="ai-plus-item" id="ai-toggle-thinking">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span>Thinking</span>
                <span class="ai-plus-badge off" id="ai-thinking-badge">OFF</span>
              </button>
              <button class="ai-plus-item" id="ai-toggle-websearch">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span>Recherche web</span>
                <span class="ai-plus-badge off" id="ai-websearch-badge">OFF</span>
              </button>
            </div>
          </div>
          <textarea class="ai-input" id="ai-input" placeholder="Posez une question..." rows="1"></textarea>
          <button class="ai-send" id="ai-send" onclick="window.__aiSend()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Sanitize HTML produced by the LLM / markdown rendering before injecting it.
  function sanitizeHtml(html) {
    if (typeof DOMParser === 'undefined') {
      return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
        .replace(/\s+on\w+(\s*=\s*["'][^"']*["'])?/gi, '')
        .replace(/(href|src|xlink:href)\s*=\s*(["'])javascript:[^"']*\2/gi, '');
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const disallowed = ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'style'];
    doc.body.querySelectorAll(disallowed.join(',')).forEach(el => el.remove());
    doc.body.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        const val = (attr.value || '').trim().toLowerCase();
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
        } else if ((name === 'href' || name === 'src' || name === 'xlink:href') && /^\s*(javascript|data:text\/html):/.test(val)) {
          el.removeAttribute(attr.name);
        } else if (name === 'srcdoc') {
          el.removeAttribute(attr.name);
        }
      });
    });
    return doc.body.innerHTML;
  }

  function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
      return sanitizeHtml(marked.parse(text, { gfm: true, breaks: true }));
    }
    return sanitizeHtml(text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>'));
  }

  function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

  function addMessage(role, content) {
    const empty = document.getElementById('ai-empty');
    if (empty) empty.remove();
    const container = document.getElementById('ai-messages');
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const isUser = role === 'user';
    const msg = document.createElement('div');
    msg.className = `ai-msg ${role}`;
    msg.innerHTML = `
      <div class="ai-msg-avatar">${isUser ? '👤' : '🤖'}</div>
      <div>
        <div class="ai-msg-bubble">${isUser ? escapeHtml(content) : renderMarkdown(content)}</div>
        <div class="ai-msg-time">${time}</div>
      </div>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    if (typeof hljs !== 'undefined') {
      msg.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    }
    history.push({ role, content });
    if (history.length > 50) history = history.slice(-50);
    try { localStorage.setItem('ai_history', JSON.stringify(history)); } catch {}
  }

  function addTyping() {
    const container = document.getElementById('ai-messages');
    const typing = document.createElement('div');
    typing.className = 'ai-msg assistant';
    typing.id = 'ai-typing';
    typing.innerHTML = `<div class="ai-msg-avatar">🤖</div><div class="ai-msg-bubble"><div class="ai-typing"><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div></div></div>`;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() { const t = document.getElementById('ai-typing'); if (t) t.remove(); }

  function addError(msg) {
    const container = document.getElementById('ai-messages');
    const err = document.createElement('div');
    err.className = 'ai-error';
    err.textContent = msg;
    container.appendChild(err);
    container.scrollTop = container.scrollHeight;
  }

  async function sendMessage(text) {
    if (isLoading || !text.trim()) return;
    isLoading = true;
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send');
    const status = document.getElementById('ai-status');
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    status.textContent = 'Analyse...';

    addMessage('user', text + (attachedFile ? ` [📎 ${attachedFile.name}]` : ''));
    addTyping();

    // Build FormData
    const fd = new FormData();
    fd.append('message', text);
    fd.append('thinking', String(toggleThinking));
    fd.append('websearch', String(toggleWebsearch));
    if (attachedFile) {
      fd.append('file', attachedFile);
    }

    // AbortController for timeout (60s)
    currentAbortController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (currentAbortController) currentAbortController.abort();
    }, 60000);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        credentials: 'include',
        body: fd,
        signal: currentAbortController.signal,
      });

      clearTimeout(timeoutId);
      removeTyping();
      const data = await res.json();

      if (data.error) {
        const isDown = data.error.includes('indisponible') || data.error.includes('Timeout') || data.error.includes('ECONNREFUSED');
        addError(isDown ? '⚠️ ' + data.error : data.error);
        status.textContent = isDown ? 'IA indisponible' : 'Erreur';
      } else if (data.godmode !== undefined) {
        godmode = data.godmode;
        updateGodModeUI();
        if (data.godmode_prompt) {
          addMessage('assistant', data.content);
          status.textContent = 'Mode Admin';
          input.placeholder = 'Mot de passe God Mode...';
          input.type = 'password';
        } else {
          addMessage('assistant', data.content);
          status.textContent = godmode ? 'GOD MODE' : (data.model || 'IA');
        }
      } else {
        addMessage('assistant', data.content);
        status.textContent = data.model || 'IA';
      }
    } catch (err) {
      clearTimeout(timeoutId);
      removeTyping();
      if (err.name === 'AbortError') {
        addError('⚠️ Temps d\'attente depasse (60s). Le serveur IA ne repond pas.');
        status.textContent = 'Timeout';
      } else {
        addError(err.message);
        status.textContent = 'Erreur';
      }
    }

    // Reset file after send
    attachedFile = null;
    updateAttachedFileUI();

    currentAbortController = null;
    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  function updateGodModeUI() {
    const title = document.getElementById('ai-title');
    const panel = document.getElementById('ai-panel');
    const fab = document.getElementById('ai-fab');
    if (godmode) {
      if (title) title.textContent = 'GOD MODE';
      if (panel) panel.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      if (fab) fab.style.background = 'linear-gradient(135deg, #7C3AED, #EC4899)';
    } else {
      if (title) title.textContent = 'Assistant IA';
      if (panel) panel.style.borderColor = '';
      if (fab) fab.style.background = '';
    }
  }

  function updateAttachedFileUI() {
    const zone = document.getElementById('ai-attached-file');
    const name = document.getElementById('ai-attached-name');
    if (attachedFile) {
      zone.style.display = '';
      name.textContent = `📎 ${attachedFile.name}`;
    } else {
      zone.style.display = 'none';
      name.textContent = '';
    }
  }

  function togglePlusMenu() {
    const menu = document.getElementById('ai-plus-menu');
    menu.classList.toggle('open');
  }

  function closePlusMenu() {
    const menu = document.getElementById('ai-plus-menu');
    if (menu) menu.classList.remove('open');
  }

  function toggleThinkingMode() {
    toggleThinking = !toggleThinking;
    const badge = document.getElementById('ai-thinking-badge');
    badge.textContent = toggleThinking ? 'ON' : 'OFF';
    badge.className = 'ai-plus-badge ' + (toggleThinking ? 'on' : 'off');
  }

  function toggleWebsearchMode() {
    toggleWebsearch = !toggleWebsearch;
    const badge = document.getElementById('ai-websearch-badge');
    badge.textContent = toggleWebsearch ? 'ON' : 'OFF';
    badge.className = 'ai-plus-badge ' + (toggleWebsearch ? 'on' : 'off');
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      attachedFile = file;
      updateAttachedFileUI();
      closePlusMenu();
    }
  }

  function removeAttachedFile() {
    attachedFile = null;
    updateAttachedFileUI();
  }

  function togglePanel() {
    const panel = document.getElementById('ai-panel');
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen) { document.getElementById('ai-input').focus(); document.addEventListener('click', handleOutsideClick, true); }
    else { document.removeEventListener('click', handleOutsideClick, true); }
  }

  function handleOutsideClick(e) {
    const panel = document.getElementById('ai-panel');
    const fab = document.getElementById('ai-fab');
    if (panel && fab && !panel.contains(e.target) && !fab.contains(e.target)) {
      isOpen = false; panel.classList.remove('open'); document.removeEventListener('click', handleOutsideClick, true);
    }
    const menu = document.getElementById('ai-plus-menu');
    const plusBtn = document.getElementById('ai-plus-btn');
    if (menu && plusBtn && !menu.contains(e.target) && !plusBtn.contains(e.target)) {
      closePlusMenu();
    }
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem('ai_history');
      if (saved) {
        history = JSON.parse(saved);
        if (history.length > 0) {
          const empty = document.getElementById('ai-empty');
          if (empty) empty.remove();
          history.forEach(m => {
            const container = document.getElementById('ai-messages');
            const isUser = m.role === 'user';
            const msg = document.createElement('div');
            msg.className = `ai-msg ${m.role}`;
            msg.innerHTML = `<div class="ai-msg-avatar">${isUser ? '👤' : '🤖'}</div><div><div class="ai-msg-bubble">${isUser ? escapeHtml(m.content) : renderMarkdown(m.content)}</div></div>`;
            container.appendChild(msg);
          });
          document.getElementById('ai-messages').scrollTop = document.getElementById('ai-messages').scrollHeight;
        }
      }
    } catch {}
  }

  function init() {
    if (document.getElementById('ai-fab')) return;

    // Injecter le bouton dans le notif-fixed-wrapper
    const notifWrapper = document.querySelector('.notif-fixed-wrapper');
    if (notifWrapper) {
      const btn = document.createElement('button');
      btn.className = 'ai-header-trigger';
      btn.id = 'ai-fab';
      btn.title = 'Assistant IA';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 21v-2a4 4 0 00-3-3.87"/><path d="M5 21v-2a4 4 0 013-3.87"/><line x1="12" y1="11" x2="12" y2="17"/></svg>`;
      notifWrapper.insertBefore(btn, notifWrapper.firstChild);
    }

    // Injecter le panel dans le body
    const panelDiv = document.createElement('div');
    panelDiv.innerHTML = buildHTML();
    const panel = panelDiv.querySelector('.ai-panel');
    if (panel) document.body.appendChild(panel);

    // Panel toujours ouvert
    isOpen = true;
    panel.classList.add('open');

    const fab = document.getElementById('ai-fab');
    fab.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
    document.getElementById('ai-close').addEventListener('click', () => { isOpen = false; panel.classList.remove('open'); });
    document.getElementById('ai-clear').addEventListener('click', () => {
      history = [];
      try { localStorage.removeItem('ai_history'); } catch {}
      document.getElementById('ai-messages').innerHTML = `<div class="ai-empty" id="ai-empty"><div class="ai-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 21v-2a4 4 0 00-3-3.87"/><path d="M5 21v-2a4 4 0 013-3.87"/></svg></div><div class="ai-empty-title">Nouvelle conversation</div><div class="ai-empty-desc">Posez une question.</div></div>`;
      document.getElementById('ai-status').textContent = 'Pret';
    });
    const input = document.getElementById('ai-input');
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); } });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 80) + 'px'; });

    // Plus button
    document.getElementById('ai-plus-btn').addEventListener('click', e => { e.stopPropagation(); togglePlusMenu(); });
    // Thinking toggle
    document.getElementById('ai-toggle-thinking').addEventListener('click', e => { e.stopPropagation(); toggleThinkingMode(); });
    // Websearch toggle
    document.getElementById('ai-toggle-websearch').addEventListener('click', e => { e.stopPropagation(); toggleWebsearchMode(); });
    // File input
    document.getElementById('ai-file-input').addEventListener('change', handleFileSelect);
    // Remove attached file
    document.getElementById('ai-attached-remove').addEventListener('click', removeAttachedFile);

    loadHistory();
  }

  window.__aiSend = function () { sendMessage(document.getElementById('ai-input').value); };
  window.__aiSendSuggestion = function (text) { sendMessage(text); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
// Marexsoft Corporation
