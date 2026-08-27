(function () {
  let isOpen = false;
  let isLoading = false;
  let history = [];
  let godmode = false;
  let currentAbortController = null;

  const SUGGESTIONS = [
    'Quel est le CA total ?',
    'Quel commercial est le meilleur ?',
    'Prévision fin de mois',
    'Génère un rapport',
  ];

  function buildHTML() {
    return `
      <button class="ai-fab" id="ai-fab" title="Assistant IA">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z"/>
          <path d="M19 21v-2a4 4 0 00-3-3.87"/>
          <path d="M5 21v-2a4 4 0 013-3.87"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
        </svg>
        <span class="ai-fab-badge" id="ai-fab-badge"></span>
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
        <div class="ai-input-area">
          <textarea class="ai-input" id="ai-input" placeholder="Posez une question..." rows="1"></textarea>
          <button class="ai-send" id="ai-send" onclick="window.__aiSend()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Sanitize HTML produced by the LLM / markdown rendering before injecting it.
  // LLM output is untrusted (prompt injection), and `marked` passes raw HTML through.
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
    // Apply syntax highlighting to code blocks
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
    input.type = 'text';
    input.placeholder = 'Posez une question...';
    sendBtn.disabled = true;
    status.textContent = 'Analyse...';

    addMessage('user', text);
    addTyping();

    // AbortController for timeout (60s)
    currentAbortController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (currentAbortController) currentAbortController.abort();
    }, 60000);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
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
      if (panel) panel.style.borderColor = '#7C3AED';
      if (fab) fab.style.background = 'linear-gradient(135deg, #7C3AED, #EC4899)';
    } else {
      if (title) title.textContent = 'Assistant IA';
      if (panel) panel.style.borderColor = '';
      if (fab) fab.style.background = '';
    }
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
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildHTML();
    document.body.appendChild(wrapper.firstElementChild);
    document.body.appendChild(wrapper);
    const fab = document.getElementById('ai-fab');
    const panel = document.getElementById('ai-panel');
    if (panel && panel.parentElement !== document.body) document.body.appendChild(panel);
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
    loadHistory();
  }

  window.__aiSend = function () { sendMessage(document.getElementById('ai-input').value); };
  window.__aiSendSuggestion = function (text) { sendMessage(text); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
