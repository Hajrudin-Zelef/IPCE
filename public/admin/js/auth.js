// Marexsoft Corporation
let currentUser = null;

export function getUser() {
  return currentUser;
}

export async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      window.location.href = '/';
      return null;
    }
    const data = await res.json();
    if (data.user.must_change_password) {
      window.location.href = '/';
      return null;
    }
    if (data.user.role !== 'admin') {
      window.location.href = '/dashboard.html';
      return null;
    }

    // Vérifier le flag admin_verified dans localStorage
    const verified = localStorage.getItem('admin_verified_' + data.user.id);
    if (!verified) {
      // Afficher le modal de vérification
      currentUser = data.user;
      showAdminSecretModal(data.user.id);
      return null;
    }

    currentUser = data.user;
    return currentUser;
  } catch {
    window.location.href = '/';
    return null;
  }
}

function showAdminSecretModal(adminId) {
  // Cacher le loading, afficher l'app
  const loading = document.getElementById('loading');
  const app = document.getElementById('app');
  if (loading) loading.style.display = 'none';
  if (app) app.style.display = 'block';

  // Créer le modal plein écran
  const overlay = document.createElement('div');
  overlay.id = 'admin-secret-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

  overlay.innerHTML = '<div style="background:var(--card);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:90%;max-width:400px;padding:32px;text-align:center;">'
    + '<div style="font-size:48px;margin-bottom:12px;">🔐</div>'
    + '<h2 style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:6px;">Accès réservé</h2>'
    + '<p style="font-size:13px;color:var(--muted);margin-bottom:20px;">Renseignez le mot de passe admin pour accéder au panneau de pilotage</p>'
    + '<div id="secret-modal-error" style="background:#fee2e2;color:#dc2626;padding:10px;border-radius:8px;font-size:13px;margin-bottom:14px;display:none;"></div>'
    + '<input type="password" id="secret-modal-pass" placeholder="Mot de passe admin" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-size:14px;margin-bottom:14px;background:var(--bg);color:var(--text);box-sizing:border-box;">'
    + '<button id="secret-modal-btn" style="width:100%;padding:12px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Valider</button>'
// Marexsoft Corporation
    + '<button onclick="window.location.href=\'/\'' + '" style="width:100%;padding:10px;background:transparent;color:var(--muted);border:none;font-size:12px;margin-top:8px;cursor:pointer;">Retour à la connexion</button>'
    + '</div>';

  document.body.appendChild(overlay);

  // Focus + Enter
  const passInput = document.getElementById('secret-modal-pass');
  const btn = document.getElementById('secret-modal-btn');
  passInput.focus();
  passInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') btn.click();
  });

  btn.addEventListener('click', async function() {
    const password = passInput.value;
    const errEl = document.getElementById('secret-modal-error');
    if (!password) {
      errEl.textContent = 'Veuillez saisir le mot de passe admin';
      errEl.style.display = 'block';
      return;
    }

    btn.textContent = 'Vérification...';
    btn.disabled = true;

    try {
      const res = await fetch('/api/auth/verify-admin-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || 'Mot de passe incorrect';
        errEl.style.display = 'block';
        btn.textContent = 'Valider';
        btn.disabled = false;
        passInput.value = '';
        passInput.focus();
        return;
      }

      // Succès → marquer vérifié et recharger
      localStorage.setItem('admin_verified_' + adminId, '1');
      window.location.reload();
    } catch {
      errEl.textContent = 'Erreur de connexion';
      errEl.style.display = 'block';
      btn.textContent = 'Valider';
      btn.disabled = false;
    }
  });
}

export async function logout() {
  localStorage.removeItem('admin_verified_' + (currentUser ? currentUser.id : ''));
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/';
}
// Marexsoft Corporation
