(function () {
  let isOpen = false;
  let isLoading = false;
  let history = [];
  let currentMode = 'free';
  let insightCount = 0;
  let godmode = false;

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
        <div class="ai-modes">
          <button class="ai-mode-btn active" data-mode="free" onclick="window.__aiSetMode('free',this)">Free</button>
          <button class="ai-mode-btn" data-mode="standard" onclick="window.__aiSetMode('standard',this)">Standard</button>
          <button class="ai-mode-btn" data-mode="elite" onclick="window.__aiSetMode('elite',this)">Elite</button>
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

  function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
      return marked.parse(text, { gfm: true, breaks: true });
    }
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

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
    history.push({ role, content });
    if (history.length > 50) history = history.slice(-50);
    try { localStorage.setItem('ai_history', JSON.stringify(history)); } catch {}
    return msg;
  }

  // --- Streaming message creation ---
  function createStreamingMessage() {
    const empty = document.getElementById('ai-empty');
    if (empty) empty.remove();

    const container = document.getElementById('ai-messages');
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const msg = document.createElement('div');
    msg.className = 'ai-msg assistant';
    msg.innerHTML = `
      <div class="ai-msg-avatar">🤖</div>
      <div>
        <div class="ai-msg-bubble ai-streaming">
          <span class="ai-stream-content" id="ai-stream-content"></span>
          <span class="ai-cursor" id="ai-cursor"></span>
        </div>
        <div class="ai-msg-time" id="ai-stream-time">${time}</div>
      </div>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
  }

  function appendChunk(text) {
    const el = document.getElementById('ai-stream-content');
    if (!el) return;
    const span = document.createElement('span');
    span.className = 'ai-chunk';
    span.textContent = text;
    el.appendChild(span);
    const container = document.getElementById('ai-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function finalizeStream(fullContent, modelName) {
    const cursor = document.getElementById('ai-cursor');
    if (cursor) {
      cursor.classList.add('ai-cursor-fadeout');
      setTimeout(() => cursor.remove(), 300);
    }
    const content = document.getElementById('ai-stream-content');
    if (content) {
      content.id = '';
      content.className = '';
      content.innerHTML = renderMarkdown(fullContent);
    }
    const bubble = document.querySelector('.ai-streaming');
    if (bubble) {
      bubble.classList.remove('ai-streaming');
      bubble.classList.add('ai-settled');
    }
    history.push({ role: 'assistant', content: fullContent });
    if (history.length > 50) history = history.slice(-50);
    try { localStorage.setItem('ai_history', JSON.stringify(history)); } catch {}
  }

  function addTyping() {
    const container = document.getElementById('ai-messages');
    const typing = document.createElement('div');
    typing.className = 'ai-msg assistant';
    typing.id = 'ai-typing';
    typing.innerHTML = `
      <div class="ai-msg-avatar">🤖</div>
      <div class="ai-msg-bubble">
        <div class="ai-typing">
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
        </div>
      </div>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('ai-typing');
    if (t) t.remove();
  }

  function addError(msg) {
    const container = document.getElementById('ai-messages');
    const err = document.createElement('div');
    err.className = 'ai-error';
    err.textContent = msg;
    container.appendChild(err);
    container.scrollTop = container.scrollHeight;
  }

  // --- Streaming send ---
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
    status.textContent = 'Analyse en cours...';

    addMessage('user', text);
    addTyping();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      });

      // Check if it's a streaming response
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        removeTyping();
        createStreamingMessage();

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let modelName = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                addError(data.error);
                break;
              }
              if (data.done) {
                modelName = data.modelName || data.model || '';
                break;
              }
              if (data.chunk) {
                fullContent += data.chunk;
                appendChunk(data.chunk);
              }
            } catch {}
          }
          if (modelName || fullContent) break;
        }

        finalizeStream(fullContent, modelName);
        status.textContent = modelName ? `${modelName}` : 'Termine';
      } else {
        // Fallback: JSON response (for /rahian, /cmds, etc.)
        removeTyping();
        const data = await res.json();
        if (data.godmode !== undefined) {
          godmode = data.godmode;
          updateGodModeUI();
        }
        if (data.godmode_prompt) {
          addMessage('assistant', data.content);
          status.textContent = 'Mode Admin';
          input.placeholder = 'Mot de passe God Mode...';
          input.type = 'password';
          isLoading = false;
          sendBtn.disabled = false;
          input.focus();
          return;
        }
        addMessage('assistant', data.content);
        status.textContent = godmode ? 'GOD MODE' : data.provider || 'System';
      }
    } catch (err) {
      removeTyping();
      addError(err.message);
      status.textContent = 'Erreur';
    }

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
    if (isOpen) {
      document.getElementById('ai-input').focus();
      document.addEventListener('click', handleOutsideClick, true);
    } else {
      document.removeEventListener('click', handleOutsideClick, true);
    }
  }

  function handleOutsideClick(e) {
    const panel = document.getElementById('ai-panel');
    const fab = document.getElementById('ai-fab');
    if (panel && fab && !panel.contains(e.target) && !fab.contains(e.target)) {
      isOpen = false;
      panel.classList.remove('open');
      document.removeEventListener('click', handleOutsideClick, true);
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
            msg.innerHTML = `
              <div class="ai-msg-avatar">${isUser ? '👤' : '🤖'}</div>
              <div>
                <div class="ai-msg-bubble">${isUser ? escapeHtml(m.content) : renderMarkdown(m.content)}</div>
              </div>
            `;
            container.appendChild(msg);
          });
          const container = document.getElementById('ai-messages');
          container.scrollTop = container.scrollHeight;
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
      const container = document.getElementById('ai-messages');
      container.innerHTML = `
        <div class="ai-empty" id="ai-empty">
          <div class="ai-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 21v-2a4 4 0 00-3-3.87"/><path d="M5 21v-2a4 4 0 013-3.87"/></svg>
          </div>
          <div class="ai-empty-title">Nouvelle conversation</div>
          <div class="ai-empty-desc">Posez une question sur vos donnees.</div>
        </div>
      `;
      document.getElementById('ai-status').textContent = 'Pret';
      const inp = document.getElementById('ai-input');
      if (inp) { inp.placeholder = 'Posez une question...'; inp.type = 'text'; }
    });

    const input = document.getElementById('ai-input');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
    });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 80) + 'px'; });

    loadHistory();
  }

  window.__aiSend = function () { const input = document.getElementById('ai-input'); sendMessage(input.value); };
  window.__aiSendSuggestion = function (text) { sendMessage(text); };
  window.__aiSetMode = function (mode, btn) {
    currentMode = mode;
    document.querySelectorAll('.ai-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fetch('/api/ai/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ mode }) }).catch(() => {});
  };

  window.__aiCopyMsg = function (btn) {
    const bubble = btn.closest('.ai-msg-bubble');
    const text = bubble.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'; }, 1500);
    });
  };

  window.addEventListener('message', e => {
    if (e.data && e.data.type === 'new_insights') {
      insightCount += e.data.count || 0;
      const badge = document.getElementById('ai-fab-badge');
      if (badge) { badge.textContent = insightCount > 9 ? '9+' : insightCount; badge.style.display = insightCount > 0 ? 'flex' : 'none'; }
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
