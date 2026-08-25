window.__load_users = async function() {
  const users = await loadSectionData('/api/admin/users');
  if (!users) return renderEmpty('section-users-content', 'Erreur de chargement');

  const el = document.getElementById('section-users-content');
  el.innerHTML = `
    <div class="users-header">
      <div style="font-size:14px;color:var(--muted)">${users.length} utilisateur(s)</div>
      <button class="users-create-btn" onclick="window.__showCreateUser()">+ Nouvel utilisateur</button>
    </div>
    <div id="create-user-form" style="display:none;margin-bottom:20px">
      <div class="reminder-create-form">
        <div class="reminder-form-row">
          <input type="text" id="new-user-nom" placeholder="Nom">
          <input type="password" id="new-user-pass" placeholder="Mot de passe">
          <select id="new-user-role"><option value="commercial">Commercial</option><option value="admin">Admin</option></select>
          <button class="section-filter active" onclick="window.__createUser()">Créer</button>
        </div>
      </div>
    </div>
    <div class="users-table-wrapper">
      <table class="section-table">
        <thead><tr><th>Nom</th><th>Rôle</th><th>Changement mdp</th><th>Actions</th></tr></thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><strong>${u.nom}</strong></td>
              <td><span class="section-badge ${u.role === 'admin' ? 'danger' : 'info'}">${u.role}</span></td>
              <td>${u.must_change_password ? 'Oui' : 'Non'}</td>
              <td class="user-actions">
                ${u.role !== 'admin' ? `
                  <button class="user-action-btn" onclick="window.__resetUserPass(${u.id})">Réinit. mdp</button>
                  <button class="user-action-btn danger" onclick="window.__deleteUser(${u.id})">Supprimer</button>
                ` : '<span style="font-size:12px;color:var(--muted)">—</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

window.__showCreateUser = function() {
  const form = document.getElementById('create-user-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.__createUser = async function() {
  const nom = document.getElementById('new-user-nom').value.trim();
  const password = document.getElementById('new-user-pass').value;
  const role = document.getElementById('new-user-role').value;
  if (!nom || !password) return alert('Nom et mot de passe requis');

  await fetch('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom, password, role })
  });
  window.__load_users();
};

window.__deleteUser = async function(id) {
  if (!confirm('Supprimer cet utilisateur ?')) return;
  await fetch('/api/admin/users/' + id, { method: 'DELETE', credentials: 'include' });
  window.__load_users();
};

window.__resetUserPass = async function(id) {
  const newPass = prompt('Nouveau mot de passe :');
  if (!newPass) return;
  await fetch('/api/admin/users/' + id, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reset_password: newPass })
  });
  alert('Mot de passe réinitialisé');
};
