// Marexsoft Corporation
let usersView = localStorage.getItem('users_view') || 'grid';

window.__load_users = async function() {
  const users = await loadSectionData('/api/admin/users');
  if (!users) return renderEmpty('section-users-content', 'Erreur de chargement');

  const el = document.getElementById('section-users-content');
  const admins = users.filter(u => u.role === 'admin');
  const commercials = users.filter(u => u.role === 'commercial');
  const needingReset = users.filter(u => u.must_change_password);

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  function renderUserCard(u) {
    const initials = getInitials(u.nom);
    const isProtected = u.role === 'admin' && admins.length <= 1;
    return `
      <div class="user-card" data-nom="${escapeHtml(u.nom.toLowerCase())}" data-role="${escapeHtml(u.role)}">
        <div class="user-card-top">
          <div class="user-avatar ${escapeHtml(u.role)}">${escapeHtml(initials)}</div>
          <div class="user-info">
            <div class="user-name">${escapeHtml(u.nom)}</div>
            <span class="user-role-badge ${escapeHtml(u.role)}"><span class="user-role-dot"></span>${u.role === 'admin' ? 'Administrateur' : 'Commercial'}</span>
          </div>
        </div>
        <div class="user-card-body">
          <div class="user-status-row">
            <span class="user-status-label">Statut</span>
            <span class="user-status-value ${u.must_change_password ? 'warning' : 'ok'}">${u.must_change_password ? 'Changement mdp requis' : 'Actif'}</span>
          </div>
          <div class="user-status-row">
            <span class="user-status-label">Rôle</span>
            <span class="user-status-value">${u.role === 'admin' ? 'Administrateur' : 'Commercial'}</span>
          </div>
          <div class="user-status-row">
            <span class="user-status-label">Identifiant</span>
            <span class="user-status-value">${escapeHtml(u.nom)}</span>
          </div>
          <div class="user-status-row">
            <span class="user-status-label">Email</span>
            <span class="user-status-value ${u.email ? 'ok' : 'warning'}">${u.email ? escapeHtml(u.email) : 'Non renseigné'}</span>
          </div>
        </div>
        <div class="user-card-actions">
          <button class="user-action-btn" data-action="edit-email" data-id="${u.id}" data-nom="${escapeHtml(u.nom)}" data-email="${escapeHtml(u.email || '')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Email
          </button>
          <button class="user-action-btn" data-action="reset" data-id="${u.id}" data-nom="${escapeHtml(u.nom)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Réinit. mdp
          </button>
          ${!isProtected ? `
            <button class="user-action-btn danger" data-action="delete" data-id="${u.id}" data-nom="${escapeHtml(u.nom)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Supprimer
            </button>
          ` : `
            <button class="user-action-btn" disabled style="opacity:0.4;cursor:not-allowed">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Protégé
            </button>
          `}
        </div>
      </div>
    `;
  }

  el.innerHTML = `
    <!-- KPI Bar -->
    <div class="users-kpi-bar">
      <div class="users-kpi kpi-total">
        <div class="users-kpi-label">Total</div>
        <div class="users-kpi-value">${users.length}</div>
        <div class="users-kpi-sub">utilisateurs</div>
      </div>
      <div class="users-kpi kpi-admin">
        <div class="users-kpi-label">Administrateurs</div>
        <div class="users-kpi-value">${admins.length}</div>
        <div class="users-kpi-sub">${admins.length <= 1 ? 'minimum requis' : 'comptes admin'}</div>
      </div>
      <div class="users-kpi kpi-commercial">
        <div class="users-kpi-label">Commerciaux</div>
        <div class="users-kpi-value">${commercials.length}</div>
        <div class="users-kpi-sub">${commercials.length === 1 ? 'agent actif' : 'agents actifs'}</div>
      </div>
      <div class="users-kpi kpi-reset">
        <div class="users-kpi-label">Mdp à changer</div>
        <div class="users-kpi-value">${needingReset.length}</div>
        <div class="users-kpi-sub">${needingReset.length === 0 ? 'tout est ok' : needingReset.length === 1 ? 'compte en attente' : 'comptes en attente'}</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="users-toolbar">
      <div class="users-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Rechercher un utilisateur..." oninput="window.__filterUsers(this.value)">
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;">
          <button onclick="UsersView.setView('grid')" style="padding:4px 10px;border:none;background:${usersView === 'grid' ? 'var(--primary)' : 'var(--card)'};color:${usersView === 'grid' ? '#fff' : 'var(--text)'};cursor:pointer;font-size:12px;font-family:inherit;border-right:1px solid var(--border);" title="Grille">⊞</button>
          <button onclick="UsersView.setView('list')" style="padding:4px 10px;border:none;background:${usersView === 'list' ? 'var(--primary)' : 'var(--card)'};color:${usersView === 'list' ? '#fff' : 'var(--text)'};cursor:pointer;font-size:12px;font-family:inherit;" title="Liste">☰</button>
        </div>
        <button class="users-create-btn" onclick="window.__toggleCreateForm()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouvel utilisateur
        </button>
      </div>
    </div>

    <!-- Create Form (hidden) -->
    <div id="users-create-form" style="display:none">
      <div class="users-create-form">
        <div class="users-form-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Créer un utilisateur
        </div>
        <div class="users-form-row">
          <div class="users-form-group">
            <label>Nom</label>
            <input type="text" id="new-user-nom" placeholder="Nom complet">
          </div>
          <div class="users-form-group">
            <label>Mot de passe</label>
            <div class="users-pass-field">
              <input type="text" id="new-user-pass" placeholder="Min. 8 caractères">
              <button type="button" class="users-pass-generate" onclick="window.__generatePassword()" title="Générer un mot de passe">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                Générer
              </button>
              <button type="button" class="users-pass-copy" onclick="window.__copyPassword()" title="Copier le mot de passe">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="users-form-row">
          <div class="users-form-group">
            <label>Rôle</label>
            <select id="new-user-role">
              <option value="commercial">Commercial</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div class="users-form-group">
            <label>Email (optionnel)</label>
            <input type="email" id="new-user-email" placeholder="exemple@domaine.com">
          </div>
        </div>
        <div class="users-form-actions">
          <button class="user-action-btn" onclick="window.__toggleCreateForm()">Annuler</button>
          <button class="users-create-btn" onclick="window.__createUser()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Créer
          </button>
        </div>
      </div>
    </div>

    <!-- Users Grid -->
    <div class="users-grid" id="users-grid">
      ${users.map(u => renderUserCard(u)).join('')}
    </div>

    <!-- Reset Password Modal (hidden) -->
    <div class="users-modal-overlay" id="users-reset-modal" style="display:none">
      <div class="users-modal">
        <div class="users-modal-header">
          <div class="users-modal-title">Réinitialiser le mot de passe</div>
          <button class="users-modal-close" onclick="window.__closeResetModal()">&times;</button>
        </div>
        <div class="users-modal-body">
          <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Nouveau mot de passe pour <strong id="reset-user-name"></strong></p>
          <div class="users-form-group">
            <label>Nouveau mot de passe</label>
            <input type="password" id="reset-new-pass" placeholder="Min. 8 caractères" style="width:100%">
          </div>
        </div>
        <div class="users-modal-actions">
          <button class="user-action-btn" onclick="window.__closeResetModal()">Annuler</button>
          <button class="users-create-btn" onclick="window.__confirmResetPass()">Réinitialiser</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal (hidden) -->
    <div class="users-modal-overlay" id="users-delete-modal" style="display:none">
      <div class="users-modal">
        <div class="users-modal-header">
          <div class="users-modal-title">Supprimer l'utilisateur</div>
          <button class="users-modal-close" onclick="window.__closeDeleteModal()">&times;</button>
        </div>
        <div class="users-modal-body">
          <p style="font-size:14px;color:var(--text-secondary);margin:0">Voulez-vous vraiment supprimer <strong id="delete-user-name"></strong> ?</p>
          <p style="font-size:12px;color:var(--danger);margin:8px 0 0">Cette action est irréversible.</p>
        </div>
        <div class="users-modal-actions">
          <button class="user-action-btn" onclick="window.__closeDeleteModal()">Annuler</button>
          <button class="users-create-btn" style="background:var(--danger)" onclick="window.__confirmDelete()">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Success Modal — Mot de passe temporaire (hidden) -->
    <div class="users-modal-overlay" id="users-success-modal" style="display:none">
      <div class="users-modal">
        <div class="users-modal-header" style="border-bottom-color: var(--success);">
          <div class="users-modal-title" style="color:var(--success);">✅ Compte créé avec succès</div>
          <button class="users-modal-close" onclick="window.__closeSuccessModal()">&times;</button>
        </div>
        <div class="users-modal-body">
          <p style="font-size:13px;color:var(--muted);margin:0 0 12px">
            Utilisateur : <strong id="success-user-name"></strong><br>
            Rôle : <strong id="success-user-role"></strong>
          </p>
          <p style="font-size:12px;color:var(--muted);margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Mot de passe temporaire</p>
          <div class="users-pass-display">
            <input type="text" id="success-pass-value" readonly style="flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:monospace;color:var(--text);background:var(--bg);">
            <button type="button" class="users-pass-copy" onclick="window.__copySuccessPassword()" title="Copier">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
          <p style="font-size:12px;color:var(--warning);margin:12px 0 0">⚠️ Donnez ce mot de passe au commercial. Il devra le changer à la connexion.</p>
        </div>
        <div class="users-modal-actions">
          <button class="users-create-btn" onclick="window.__closeSuccessModal()">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Edit Email Modal (hidden) -->
    <div class="users-modal-overlay" id="users-email-modal" style="display:none">
      <div class="users-modal">
        <div class="users-modal-header">
          <div class="users-modal-title">Modifier l'email</div>
          <button class="users-modal-close" onclick="window.__closeEmailModal()">&times;</button>
        </div>
        <div class="users-modal-body">
          <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Email pour <strong id="email-user-name"></strong></p>
          <div class="users-form-group">
            <label>Adresse email</label>
            <input type="email" id="edit-email-value" placeholder="exemple@domaine.com" style="width:100%">
          </div>
        </div>
        <div class="users-modal-actions">
          <button class="user-action-btn" onclick="window.__closeEmailModal()">Annuler</button>
          <button class="users-create-btn" onclick="window.__confirmEditEmail()">Enregistrer</button>
        </div>
      </div>
    </div>
  `;
};

// --- State ---
let resetTargetId = null;
let deleteTargetId = null;

// --- Generate Password ---
window.__generatePassword = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  let pass = '';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  for (let i = 0; i < 16; i++) pass += chars[array[i] % chars.length];
  const input = document.getElementById('new-user-pass');
  input.value = pass;
  input.type = 'text';
  input.focus();
  input.select();
};

// --- Copy Password ---
window.__copyPassword = function() {
  const input = document.getElementById('new-user-pass');
  if (!input.value) return alert('Générez d\'abord un mot de passe');
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.querySelector('.users-pass-field .users-pass-copy');
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1500);
  });
};

// --- Success Modal ---
window.__showSuccessModal = function(nom, role, tempPassword) {
  document.getElementById('success-user-name').textContent = nom;
  document.getElementById('success-user-role').textContent = role === 'admin' ? 'Administrateur' : 'Commercial';
  document.getElementById('success-pass-value').value = tempPassword;
  document.getElementById('users-success-modal').style.display = 'flex';
};

window.__closeSuccessModal = function() {
  document.getElementById('users-success-modal').style.display = 'none';
};

window.__copySuccessPassword = function() {
  const input = document.getElementById('success-pass-value');
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.querySelector('#users-success-modal .users-pass-copy');
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1500);
  });
};

// --- Edit Email Modal ---
let editEmailTargetId = null;

window.__editUserEmail = function(id, name, currentEmail) {
  editEmailTargetId = id;
  document.getElementById('email-user-name').textContent = name;
  document.getElementById('edit-email-value').value = currentEmail || '';
  document.getElementById('users-email-modal').style.display = 'flex';
};

window.__closeEmailModal = function() {
  document.getElementById('users-email-modal').style.display = 'none';
  editEmailTargetId = null;
};

window.__confirmEditEmail = async function() {
  const email = document.getElementById('edit-email-value').value.trim();
  if (!editEmailTargetId) return;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return alert('Format d\'email invalide');
  }
  try {
    const res = await fetch('/api/admin/users/' + editEmailTargetId, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email || null })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    window.__closeEmailModal();
    window.__load_users();
  } catch { alert('Erreur serveur'); }
};

// --- Toggle Create Form ---
window.__toggleCreateForm = function() {
  const form = document.getElementById('users-create-form');
  const isOpen = form.style.display !== 'none';
  form.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    document.getElementById('new-user-nom').value = '';
    document.getElementById('new-user-pass').value = '';
    document.getElementById('new-user-pass').type = 'text';
    document.getElementById('new-user-email').value = '';
  }
};

// --- Create User ---
window.__createUser = async function() {
  const nom = document.getElementById('new-user-nom').value.trim();
  const password = document.getElementById('new-user-pass').value;
  const role = document.getElementById('new-user-role').value;
  const email = document.getElementById('new-user-email').value.trim();
  if (!nom || !password) return alert('Nom et mot de passe requis');
  if (password.length < 8) return alert('Le mot de passe doit contenir au moins 8 caractères');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Format d\'email invalide');

  const btn = document.querySelector('.users-create-btn[onclick="window.__createUser()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Création...'; }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, password, role, email: email || null })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    document.getElementById('new-user-nom').value = '';
    document.getElementById('new-user-pass').value = '';
    document.getElementById('new-user-pass').type = 'text';
    document.getElementById('new-user-email').value = '';
    document.getElementById('users-create-form').style.display = 'none';
    window.__showSuccessModal(nom, role, data.tempPassword || password);
    window.__load_users();
  } catch { alert('Erreur serveur'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Créer'; } }
};

// --- Search ---
window.__filterUsers = function(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.user-card').forEach(card => {
    const nom = card.dataset.nom || '';
    const role = card.dataset.role || '';
    card.style.display = (!q || nom.includes(q) || role.includes(q)) ? '' : 'none';
  });
};

// --- Reset Password ---
window.__resetUserPass = function(id, name) {
  resetTargetId = id;
  document.getElementById('reset-user-name').textContent = name;
  document.getElementById('reset-new-pass').value = '';
  document.getElementById('users-reset-modal').style.display = 'flex';
};

window.__closeResetModal = function() {
  document.getElementById('users-reset-modal').style.display = 'none';
  resetTargetId = null;
};

window.__confirmResetPass = async function() {
  const newPass = document.getElementById('reset-new-pass').value;
  if (!newPass) return alert('Entrez un nouveau mot de passe');
  if (newPass.length < 8) return alert('Le mot de passe doit contenir au moins 8 caractères');
  if (!resetTargetId) return;

  try {
    const res = await fetch('/api/admin/users/' + resetTargetId, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset_password: newPass })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    window.__closeResetModal();
    window.__load_users();
  } catch { alert('Erreur serveur'); }
};

// --- Delete User ---
window.__deleteUser = function(id, name) {
  deleteTargetId = id;
  document.getElementById('delete-user-name').textContent = name;
  document.getElementById('users-delete-modal').style.display = 'flex';
};

window.__closeDeleteModal = function() {
  document.getElementById('users-delete-modal').style.display = 'none';
  deleteTargetId = null;
};

window.__confirmDelete = async function() {
  if (!deleteTargetId) return;
  try {
    const res = await fetch('/api/admin/users/' + deleteTargetId, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    window.__closeDeleteModal();
    window.__load_users();
  } catch { alert('Erreur serveur'); }
};

window.UsersView = {
  setView(view) {
    usersView = view;
    localStorage.setItem('users_view', view);
    window.__load_users();
  }
};

// Event delegation for data-action buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = parseInt(btn.dataset.id);
  const nom = btn.dataset.nom;
  if (action === 'reset') window.__resetUserPass(id, nom);
  if (action === 'delete') window.__deleteUser(id, nom);
  if (action === 'edit-email') window.__editUserEmail(id, nom, btn.dataset.email);
});
// Marexsoft Corporation
