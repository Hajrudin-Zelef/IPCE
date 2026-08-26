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
      <div class="user-card" data-nom="${u.nom.toLowerCase()}" data-role="${u.role}">
        <div class="user-card-top">
          <div class="user-avatar ${u.role}">${initials}</div>
          <div class="user-info">
            <div class="user-name">${u.nom}</div>
            <span class="user-role-badge ${u.role}"><span class="user-role-dot"></span>${u.role === 'admin' ? 'Administrateur' : 'Commercial'}</span>
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
            <span class="user-status-value">${u.nom}</span>
          </div>
        </div>
        <div class="user-card-actions">
          <button class="user-action-btn" onclick="window.__resetUserPass(${u.id}, '${u.nom.replace(/'/g, "\\'")}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Réinit. mdp
          </button>
          ${!isProtected ? `
            <button class="user-action-btn danger" onclick="window.__deleteUser(${u.id}, '${u.nom.replace(/'/g, "\\'")}')">
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
      <button class="users-create-btn" onclick="window.__toggleCreateForm()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nouvel utilisateur
      </button>
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
            <input type="password" id="new-user-pass" placeholder="Min. 8 caractères">
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
  `;
};

// --- State ---
let resetTargetId = null;
let deleteTargetId = null;

// --- Toggle Create Form ---
window.__toggleCreateForm = function() {
  const form = document.getElementById('users-create-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

// --- Create User ---
window.__createUser = async function() {
  const nom = document.getElementById('new-user-nom').value.trim();
  const password = document.getElementById('new-user-pass').value;
  const role = document.getElementById('new-user-role').value;
  if (!nom || !password) return alert('Nom et mot de passe requis');
  if (password.length < 8) return alert('Le mot de passe doit contenir au moins 8 caractères');

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, password, role })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    document.getElementById('new-user-nom').value = '';
    document.getElementById('new-user-pass').value = '';
    document.getElementById('users-create-form').style.display = 'none';
    window.__load_users();
  } catch { alert('Erreur serveur'); }
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
