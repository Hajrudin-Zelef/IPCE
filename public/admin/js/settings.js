window.__load_settings = async function() {
  const settings = await loadSectionData('/api/admin/settings');
  if (!settings) return renderEmpty('section-settings-content', 'Erreur de chargement');

  const el = document.getElementById('section-settings-content');
  const users = await loadSectionData('/api/admin/users');
  const userCount = users ? users.length : 0;

  el.innerHTML = `
    <div class="settings-layout">
      <aside class="settings-sidebar">
        <div class="settings-sidebar-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          Paramètres
        </div>
        <button class="settings-nav-item active" onclick="settingsTab('objectifs', this)">
          <span class="settings-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
          Objectifs
        </button>
        <button class="settings-nav-item" onclick="settingsTab('apparence', this)">
          <span class="settings-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></span>
          Apparence
        </button>
        <button class="settings-nav-item" onclick="settingsTab('notifications', this)">
          <span class="settings-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></span>
          Notifications
        </button>
        <button class="settings-nav-item" onclick="settingsTab('securite', this)">
          <span class="settings-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></span>
          Sécurité
        </button>
        <button class="settings-nav-item" onclick="settingsTab('systeme', this)">
          <span class="settings-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span>
          Système
          <span class="settings-nav-badge">v2.0</span>
        </button>
        <button class="settings-nav-item" onclick="settingsTab('donnees', this)">
          <span class="settings-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></span>
          Données
        </button>
      </aside>

      <main class="settings-main">
        <!-- Objectifs -->
        <div class="settings-section active" id="settings-objectifs">
          <div class="settings-section-title">Objectifs Commerciaux</div>
          <div class="settings-section-desc">Définissez les objectifs mensuels pour piloter la performance de l'équipe.</div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
              <div>
                <div class="settings-card-title">Chiffre d'Affaires</div>
                <div class="settings-card-subtitle">Objectif CA mensuel de l'équipe</div>
              </div>
            </div>
            <div class="settings-field">
              <label>Objectif CA (FCFA)</label>
              <input type="number" id="set-ca-objectif" value="${settings.ca_objectif || 100000000}" min="0" step="1000000">
              <div class="settings-field-hint">Valeur actuelle : ${parseInt(settings.ca_objectif || 100000000).toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
              <div>
                <div class="settings-card-title">Activité Commerciale</div>
                <div class="settings-card-subtitle">Objectifs offres, BC et rendez-vous</div>
              </div>
            </div>
            <div class="settings-field-row">
              <div class="settings-field">
                <label>Offres émises / mois</label>
                <input type="number" id="set-offres-objectif" value="${settings.offres_objectif || 6}" min="1">
              </div>
              <div class="settings-field">
                <label>BC signés / mois</label>
                <input type="number" id="set-bc-objectif" value="${settings.bc_objectif || 6}" min="1">
              </div>
            </div>
            <div class="settings-field" style="margin-top:12px">
              <label>RDV / mois</label>
              <input type="number" id="set-rdv-objectif" value="${settings.rdv_objectif || 6}" min="1">
            </div>
          </div>

          <div class="settings-actions">
            <button class="settings-btn settings-btn-primary" onclick="window.__saveObjectifs()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Sauvegarder les objectifs
            </button>
          </div>
        </div>

        <!-- Apparence -->
        <div class="settings-section" id="settings-apparence">
          <div class="settings-section-title">Apparence</div>
          <div class="settings-section-desc">Personnalisez l'apparence de l'interface.</div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/></svg></div>
              <div>
                <div class="settings-card-title">Thème</div>
                <div class="settings-card-subtitle">Choisissez entre le mode clair et sombre</div>
              </div>
            </div>
            <div class="settings-toggle">
              <div class="settings-toggle-info">
                <div class="settings-toggle-label">Mode sombre</div>
                <div class="settings-toggle-desc">Réduit la luminosité pour les environnements sombres</div>
              </div>
              <div class="toggle-switch ${settings.theme === 'dark' ? 'active' : ''}" id="set-theme-toggle" onclick="this.classList.toggle('active'); window.__applyTheme()"></div>
            </div>
          </div>

          <div class="settings-actions">
            <button class="settings-btn settings-btn-primary" onclick="window.__saveApparence()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Appliquer
            </button>
          </div>
        </div>

        <!-- Notifications -->
        <div class="settings-section" id="settings-notifications">
          <div class="settings-section-title">Notifications</div>
          <div class="settings-section-desc">Configurez les alertes et notifications de l'application.</div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>
              <div>
                <div class="settings-card-title">Notifications In-App</div>
                <div class="settings-card-subtitle">Alertes dans l'interface utilisateur</div>
              </div>
            </div>
            <div class="settings-toggle">
              <div class="settings-toggle-info">
                <div class="settings-toggle-label">Notifications activées</div>
                <div class="settings-toggle-desc">Afficher les notifications dans la cloche</div>
              </div>
              <div class="toggle-switch ${settings.notifications_enabled === 'true' ? 'active' : ''}" id="set-notif-toggle" onclick="this.classList.toggle('active')"></div>
            </div>
            <div class="settings-toggle">
              <div class="settings-toggle-info">
                <div class="settings-toggle-label">Alertes collectes</div>
                <div class="settings-toggle-desc">Notification quand une collecte est soumise</div>
              </div>
              <div class="toggle-switch active" id="set-notif-collectes"></div>
            </div>
            <div class="settings-toggle">
              <div class="settings-toggle-info">
                <div class="settings-toggle-label">Alertes validations</div>
                <div class="settings-toggle-desc">Notification après approbation ou rejet</div>
              </div>
              <div class="toggle-switch active" id="set-notif-validations"></div>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
              <div>
                <div class="settings-card-title">Notifications Email</div>
                <div class="settings-card-subtitle">Envoi d'emails pour les événements importants</div>
              </div>
            </div>
            <div class="settings-toggle">
              <div class="settings-toggle-info">
                <div class="settings-toggle-label">Email validation collecte</div>
                <div class="settings-toggle-desc">Envoyer un email à l'admin quand une collecte est soumise</div>
              </div>
              <div class="toggle-switch active" id="set-email-validation"></div>
            </div>
          </div>

          <div class="settings-actions">
            <button class="settings-btn settings-btn-primary" onclick="window.__saveNotifications()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Sauvegarder
            </button>
          </div>
        </div>

        <!-- Sécurité -->
        <div class="settings-section" id="settings-securite">
          <div class="settings-section-title">Sécurité</div>
          <div class="settings-section-desc">Gérez la sécurité de votre compte et de l'application.</div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
              <div>
                <div class="settings-card-title">Changer le mot de passe</div>
                <div class="settings-card-subtitle">Mettez à jour votre mot de passe administrateur</div>
              </div>
            </div>
            <div class="settings-field">
              <label>Mot de passe actuel</label>
              <input type="password" id="set-current-pass" placeholder="Entrez votre mot de passe actuel">
            </div>
            <div class="settings-field-row">
              <div class="settings-field">
                <label>Nouveau mot de passe</label>
                <input type="password" id="set-new-pass" placeholder="Min. 8 caractères">
              </div>
              <div class="settings-field">
                <label>Confirmer</label>
                <input type="password" id="set-confirm-pass" placeholder="Retapez le mot de passe">
              </div>
            </div>
            <div class="settings-actions">
              <button class="settings-btn settings-btn-primary" onclick="window.__changeAdminPass()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Changer le mot de passe
              </button>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
              <div>
                <div class="settings-card-title">Sécurité du compte</div>
                <div class="settings-card-subtitle">Informations sur la session active</div>
              </div>
            </div>
            <div class="settings-info-grid">
              <div class="settings-info-item">
                <span class="settings-info-label">Session</span>
                <span class="settings-info-value">Active</span>
              </div>
              <div class="settings-info-item">
                <span class="settings-info-label">Expiration</span>
                <span class="settings-info-value">8 heures</span>
              </div>
              <div class="settings-info-item">
                <span class="settings-info-label">Cookie</span>
                <span class="settings-info-value">HttpOnly</span>
              </div>
              <div class="settings-info-item">
                <span class="settings-info-label">Rate Limit</span>
                <span class="settings-info-value">10 req / 15 min</span>
              </div>
            </div>
          </div>

          <!-- 2FA Section -->
          <div class="settings-card" id="settings-2fa-card">
            <div class="settings-card-header">
              <div class="settings-card-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg></div>
              <div>
                <div class="settings-card-title">Authentification à Deux Facteurs (2FA)</div>
                <div class="settings-card-subtitle">Sécurité renforcée avec code TOTP</div>
              </div>
            </div>
            <div id="settings-2fa-content">
              <div style="padding:12px 0;color:var(--muted);font-size:13px">Chargement...</div>
            </div>
          </div>
        </div>

        <!-- Système -->
        <div class="settings-section" id="settings-systeme">
          <div class="settings-section-title">Informations Système</div>
          <div class="settings-section-desc">État du serveur et de l'application.</div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
              <div>
                <div class="settings-card-title">Application</div>
                <div class="settings-card-subtitle">Version et technos utilisées</div>
              </div>
            </div>
            <div class="settings-info-grid">
              <div class="settings-info-item">
                <span class="settings-info-label">Version</span>
                <span class="settings-info-value">2.0.0</span>
              </div>
              <div class="settings-info-item">
                <span class="settings-info-label">Runtime</span>
                <span class="settings-info-value">Node.js</span>
              </div>
              <div class="settings-info-item">
                <span class="settings-info-label">Framework</span>
                <span class="settings-info-value">Express 4.21</span>
              </div>
              <div class="settings-info-item">
                <span class="settings-info-label">Base de données</span>
                <span class="settings-info-value">SQLite (WAL)</span>
              </div>
              <div class="settings-info-item">
                <span class="settings-info-label">Auth</span>
                <span class="settings-info-value">JWT + bcrypt</span>
              </div>
              <div class="settings-info-item">
                <span class="settings-info-label">Utilisateurs</span>
                <span class="settings-info-value">${userCount} comptes</span>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
              <div>
                <div class="settings-card-title">Santé du serveur</div>
                <div class="settings-card-subtitle">Vérification de l'état du système</div>
              </div>
            </div>
            <div id="settings-health-status" style="padding:8px 0;color:var(--muted);font-size:13px">Vérification en cours...</div>
            <div class="settings-actions">
              <button class="settings-btn" onclick="window.__checkHealth()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15A9 9 0 1112.36 3.64L1 10"/></svg>
                Vérifier l'état
              </button>
            </div>
          </div>
        </div>

        <!-- Données -->
        <div class="settings-section" id="settings-donnees">
          <div class="settings-section-title">Gestion des Données</div>
          <div class="settings-section-desc">Exportez, importez ou réinitialisez les données de l'application.</div>

          <div class="settings-card">
            <div class="settings-card-header">
              <div class="settings-card-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
              <div>
                <div class="settings-card-title">Export</div>
                <div class="settings-card-subtitle">Téléchargez les données de l'application</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="settings-btn" onclick="window.open('/api/admin/export', {credentials:'include'})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Export Excel
              </button>
              <button class="settings-btn" onclick="window.open('/api/admin/export/csv', {credentials:'include'})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Export CSV
              </button>
            </div>
          </div>

          <div class="settings-card" style="border-color:var(--danger)">
            <div class="settings-card-header">
              <div class="settings-card-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
              <div>
                <div class="settings-card-title" style="color:var(--danger)">Zone de Danger</div>
                <div class="settings-card-subtitle">Actions irréversibles</div>
              </div>
            </div>
            <p style="font-size:13px;color:var(--muted);margin:0 0 16px">La réinitialisation supprime toutes les collectes, RDV et remet les mots de passe par défaut.</p>
            <button class="settings-btn settings-btn-danger" onclick="window.__confirmReset()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              Réinitialiser toutes les données
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Reset Modal -->
    <div class="settings-modal-overlay" id="settings-reset-modal" style="display:none">
      <div class="settings-modal">
        <div class="settings-modal-header">
          <div class="settings-modal-title">⚠️ Réinitialiser les données</div>
          <button class="settings-modal-close" onclick="document.getElementById('settings-reset-modal').style.display='none'">&times;</button>
        </div>
        <div class="settings-modal-body">
          <p style="font-size:14px;color:var(--text-secondary);margin:0 0 12px">Cette action va <strong>supprimer définitivement</strong> :</p>
          <ul style="font-size:13px;color:var(--text-secondary);padding-left:20px;margin:0 0 16px">
            <li>Toutes les collectes</li>
            <li>Tous les rendez-vous</li>
            <li>Les mots de passe seront réinitialisés</li>
          </ul>
          <p style="font-size:12px;color:var(--danger);margin:0;font-weight:600">Cette action est irréversible.</p>
        </div>
        <div class="settings-modal-actions">
          <button class="settings-btn" onclick="document.getElementById('settings-reset-modal').style.display='none'">Annuler</button>
          <button class="settings-btn settings-btn-danger" onclick="window.__executeReset()">Confirmer la réinitialisation</button>
        </div>
      </div>
    </div>
  `;

  window.__checkHealth();
  load2FAStatus();
};

// --- Tab Navigation ---
function settingsTab(tab, btn) {
  document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('settings-' + tab);
  if (target) target.classList.add('active');
}

// --- Toast ---
function showToast(msg, type) {
  const existing = document.querySelector('.settings-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'settings-toast ' + (type || '');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --- Apply Theme Immediately ---
window.__applyTheme = async function() {
  const theme = document.getElementById('set-theme-toggle').classList.contains('active') ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ipce_theme', theme);
  try {
    await fetch('/api/admin/settings', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    });
  } catch {}
};

// --- Save Functions ---
window.__saveObjectifs = async function() {
  const data = {
    ca_objectif: document.getElementById('set-ca-objectif').value,
    offres_objectif: document.getElementById('set-offres-objectif').value,
    bc_objectif: document.getElementById('set-bc-objectif').value,
    rdv_objectif: document.getElementById('set-rdv-objectif').value,
  };
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error();
    showToast('Objectifs sauvegardés', 'success');
  } catch { showToast('Erreur de sauvegarde', 'error'); }
};

window.__saveApparence = async function() {
  const theme = document.getElementById('set-theme-toggle').classList.contains('active') ? 'dark' : 'light';
  try {
    await fetch('/api/admin/settings', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    });
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ipce_theme', theme);
    showToast('Thème appliqué', 'success');
  } catch { showToast('Erreur', 'error'); }
};

window.__saveNotifications = async function() {
  const data = {
    notifications_enabled: document.getElementById('set-notif-toggle').classList.contains('active') ? 'true' : 'false',
  };
  try {
    await fetch('/api/admin/settings', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    showToast('Notifications sauvegardées', 'success');
  } catch { showToast('Erreur', 'error'); }
};

// --- Password Change ---
window.__changeAdminPass = async function() {
  const current = document.getElementById('set-current-pass').value;
  const newPass = document.getElementById('set-new-pass').value;
  const confirm = document.getElementById('set-confirm-pass').value;
  if (!current || !newPass) return showToast('Remplissez tous les champs', 'error');
  if (newPass.length < 8) return showToast('Min. 8 caractères', 'error');
  if (newPass !== confirm) return showToast('Les mots de passe ne correspondent pas', 'error');

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: newPass })
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, 'error');
    document.getElementById('set-current-pass').value = '';
    document.getElementById('set-new-pass').value = '';
    document.getElementById('set-confirm-pass').value = '';
    showToast('Mot de passe changé', 'success');
  } catch { showToast('Erreur', 'error'); }
};

// --- Health Check ---
window.__checkHealth = async function() {
  const el = document.getElementById('settings-health-status');
  if (!el) return;
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    el.innerHTML = `<span style="color:var(--success);font-weight:600">● Serveur opérationnel</span> — Statut : ${data.status}`;
  } catch {
    el.innerHTML = `<span style="color:var(--danger);font-weight:600">● Serveur inaccessible</span>`;
  }
};

// --- Reset Data ---
window.__confirmReset = function() {
  document.getElementById('settings-reset-modal').style.display = 'flex';
};

window.__executeReset = async function() {
  try {
    const res = await fetch('/api/admin/reset', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true })
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, 'error');
    document.getElementById('settings-reset-modal').style.display = 'none';
    showToast('Données réinitialisées', 'success');
  } catch { showToast('Erreur', 'error'); }
};

// --- 2FA ---
async function load2FAStatus() {
  const el = document.getElementById('settings-2fa-content');
  if (!el) return;
  try {
    const res = await fetch('/api/auth/2fa/status', { credentials: 'include' });
    const data = await res.json();
    if (data.enabled) {
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-light)">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--success-light);display:flex;align-items:center;justify-content:center;color:var(--success)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600;color:var(--text)">2FA Activée</div>
            <div style="font-size:12px;color:var(--muted)">Votre compte est protégé par un code TOTP</div>
          </div>
        </div>
        <div style="padding:12px 0">
          <div class="settings-field">
            <label>Code de vérification (pour désactiver)</label>
            <input type="text" id="2fa-disable-code" placeholder="Entrez le code à 6 chiffres" maxlength="6" style="max-width:200px">
          </div>
          <button class="settings-btn settings-btn-danger" onclick="window.__disable2FA()" style="margin-top:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Désactiver la 2FA
          </button>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div style="padding:12px 0">
          <p style="font-size:13px;color:var(--muted);margin:0 0 16px">L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire. Vous aurez besoin d'une application comme Google Authenticator ou Authy.</p>
          <button class="settings-btn settings-btn-primary" onclick="window.__setup2FA()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Configurer la 2FA
          </button>
        </div>
        <div id="settings-2fa-setup" style="display:none"></div>
      `;
    }
  } catch {
    el.innerHTML = '<div style="padding:12px 0;color:var(--danger);font-size:13px">Erreur de chargement</div>';
  }
}

window.__setup2FA = async function() {
  const setupEl = document.getElementById('settings-2fa-setup');
  if (!setupEl) return;
  try {
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, 'error');

    const otpauth = `otpauth://totp/${encodeURIComponent(data.issuer)}:${encodeURIComponent(data.account)}?secret=${data.secret}&issuer=${encodeURIComponent(data.issuer)}&digits=6&period=30`;

    setupEl.style.display = 'block';
    setupEl.innerHTML = `
      <div style="margin-top:16px;padding:20px;background:var(--bg);border-radius:var(--radius-md)">
        <p style="font-size:13px;color:var(--text-secondary);margin:0 0 16px;font-weight:600">Scannez ce QR code avec votre application d'authentification :</p>
        <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
          <div style="background:white;padding:16px;border-radius:var(--radius-md);border:1px solid var(--border)">
            <canvas id="settings-2fa-qr"></canvas>
          </div>
          <div style="flex:1;min-width:200px">
            <p style="font-size:12px;color:var(--muted);margin:0 0 8px">Ou entrez ce secret manuellement :</p>
            <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
              <code style="font-size:14px;font-weight:700;letter-spacing:0.1em;color:var(--primary);font-family:monospace">${data.formatted}</code>
              <button class="settings-btn" onclick="navigator.clipboard.writeText('${data.secret}');showToast('Copié !','success')" style="padding:4px 10px;font-size:11px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copier
              </button>
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-top:16px">
              <input type="text" id="2fa-verify-code" placeholder="Code à 6 chiffres" maxlength="6" style="width:150px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:18px;font-family:monospace;text-align:center;letter-spacing:0.2em;font-weight:700">
              <button class="settings-btn settings-btn-primary" onclick="window.__verify2FA()" style="padding:10px 16px">Activer</button>
              <button class="settings-btn" onclick="document.getElementById('settings-2fa-setup').style.display='none'" style="padding:10px 16px">Annuler</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Generate QR code
    if (typeof QRCode !== 'undefined') {
      QRCode.toCanvas(document.getElementById('settings-2fa-qr'), otpauth, {
        width: 180,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      });
    }
  } catch { showToast('Erreur', 'error'); }
};

window.__verify2FA = async function() {
  const code = document.getElementById('2fa-verify-code')?.value?.trim();
  if (!code || code.length !== 6) return showToast('Entrez le code à 6 chiffres', 'error');
  try {
    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, 'error');
    showToast('2FA activée avec succès', 'success');
    load2FAStatus();
  } catch { showToast('Erreur', 'error'); }
};

window.__disable2FA = async function() {
  const code = document.getElementById('2fa-disable-code')?.value?.trim();
  if (!code || code.length !== 6) return showToast('Entrez le code à 6 chiffres', 'error');
  try {
    const res = await fetch('/api/auth/2fa/disable', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, 'error');
    showToast('2FA désactivée', 'success');
    load2FAStatus();
  } catch { showToast('Erreur', 'error'); }
};

// Load 2FA on settings init
if (document.getElementById('settings-2fa-content')) load2FAStatus();
