// Marexsoft Corporation
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticate, revokeToken } = require('../middleware/auth');
const { generateSecret, verifyTOTP, formatSecret } = require('../lib/totp');

// Constant-time comparison for secrets (works for unequal lengths via hashing).
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function createAuthRouter(db) {
  const router = express.Router();

  // --- Rate limiting for the unauthenticated admin-secret endpoint ---
  const secretAttempts = new Map();
  const SECRET_WINDOW = 15 * 60 * 1000;
  const SECRET_MAX = 5;

  // --- Rate limiting for 2FA endpoints ---
  const twoFaAttempts = new Map();
  const TWOFA_WINDOW = 15 * 60 * 1000;
  const TWOFA_MAX = 5;

  function isTwoFaLocked(userId) {
    const attempts = twoFaAttempts.get(userId) || [];
    return attempts.filter(t => Date.now() - t < TWOFA_WINDOW).length >= TWOFA_MAX;
  }
  function recordTwoFaFailure(userId) {
    const attempts = twoFaAttempts.get(userId) || [];
    attempts.push(Date.now());
    twoFaAttempts.set(userId, attempts);
  }
  function clearTwoFaFailures(userId) {
    twoFaAttempts.delete(userId);
  }

  router.post('/login', async (req, res) => {
    const { nom, password, totp } = req.body;
    if (!nom || !password) {
      return res.status(400).json({ error: 'Nom et mot de passe requis' });
    }

    const user = db.prepare('SELECT * FROM users WHERE nom = ?').get(nom);
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // --- 2FA: if enabled, require a valid TOTP before issuing the full token ---
    if (user.two_factor_enabled === 1 && user.two_factor_secret) {
      if (!totp) {
        const pendingToken = jwt.sign(
          { id: user.id, nom: user.nom, role: user.role, twoFaPending: true },
          process.env.JWT_SECRET,
          { expiresIn: '5m', jwtid: crypto.randomUUID() }
        );
        return res.status(200).json({
          twoFactorRequired: true,
          pendingToken,
          user: { id: user.id, nom: user.nom, role: user.role, mustChangePassword: user.must_change_password === 1 },
        });
      }
      if (!verifyTOTP(user.two_factor_secret, String(totp))) {
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }
    }

    const token = jwt.sign(
      { id: user.id, nom: user.nom, role: user.role, mustChangePassword: user.must_change_password === 1 },
      process.env.JWT_SECRET,
      { expiresIn: '8h', jwtid: crypto.randomUUID() }
    );

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      user: {
        id: user.id,
        nom: user.nom,
        role: user.role,
        must_change_password: user.must_change_password === 1,
      },
    });
  });

  // Second step of 2FA login: exchange the pending token + TOTP for the full token.
  router.post('/login/2fa', async (req, res) => {
    const { pendingToken, code } = req.body;
    if (!pendingToken || !code) {
      return res.status(400).json({ error: 'Token et code requis' });
    }

    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expirée, reconnectez-vous' });
    }
    if (!decoded.twoFaPending || !decoded.id) {
      return res.status(400).json({ error: 'Token invalide' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.two_factor_enabled !== 1 || !user.two_factor_secret) {
      return res.status(400).json({ error: '2FA non configurée' });
    }

    if (isTwoFaLocked(decoded.id)) {
      return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    if (!verifyTOTP(user.two_factor_secret, String(code))) {
      recordTwoFaFailure(decoded.id);
      return res.status(401).json({ error: 'Code 2FA incorrect' });
    }

    clearTwoFaFailures(decoded.id);

    const token = jwt.sign(
      { id: user.id, nom: user.nom, role: user.role, mustChangePassword: user.must_change_password === 1 },
      process.env.JWT_SECRET,
      { expiresIn: '8h', jwtid: crypto.randomUUID() }
    );

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      user: {
        id: user.id,
        nom: user.nom,
        role: user.role,
        must_change_password: user.must_change_password === 1,
      },
    });
  });

  router.post('/change-password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Ancien et nouveau mot de passe requis' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit etre different' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?').run(hash, req.user.id);

    const freshToken = jwt.sign(
      { id: user.id, nom: user.nom, role: user.role, mustChangePassword: false },
      process.env.JWT_SECRET,
      { expiresIn: '8h', jwtid: crypto.randomUUID() }
    );
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', freshToken, {
// Marexsoft Corporation
      httpOnly: true, secure: isSecure, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000, path: '/',
    });

    res.json({ message: 'Mot de passe change avec succes' });
  });

  router.post('/register', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acces refuse' });
    }

    const { nom, password, role } = req.body;
    const trimmedNom = (nom || '').trim();
    if (!trimmedNom || !password) {
      return res.status(400).json({ error: 'Nom et mot de passe requis' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caracteres' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE nom = ?').get(trimmedNom);
    if (existing) {
      return res.status(409).json({ error: 'Ce nom est deja utilise' });
    }

    const hash = await bcrypt.hash(password, 12);
    const userRole = role === 'admin' ? 'admin' : 'commercial';
    const result = db.prepare('INSERT INTO users (nom, password, role, must_change_password) VALUES (?, ?, ?, ?)').run(trimmedNom, hash, userRole, 1);

    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'create_user', 'user:' + result.lastInsertRowid, `Utilisateur "${trimmedNom}" créé avec le rôle ${userRole}`);

    res.status(201).json({ id: result.lastInsertRowid, nom: trimmedNom, role: userRole });
  });

  router.get('/me', authenticate, (req, res) => {
    const user = db.prepare('SELECT id, nom, role, must_change_password FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({
      user: {
        id: user.id,
        nom: user.nom,
        role: user.role,
        must_change_password: user.must_change_password === 1,
      },
    });
  });

  router.post('/logout', (req, res) => {
    if (req.token) revokeToken(req.token);
    res.clearCookie('token', { path: '/' });
    res.json({ message: 'Deconnecte' });
  });

  // --- Admin Secret Verification (rate-limited, constant-time) ---
  router.post('/verify-admin-secret', (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const attempts = secretAttempts.get(ip) || [];
    const recent = attempts.filter(t => now - t < SECRET_WINDOW);
    if (recent.length >= SECRET_MAX) {
      return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Mot de passe requis' });

    recent.push(now);
    secretAttempts.set(ip, recent);

    if (process.env.ADMIN_SECRET && safeEqual(password, process.env.ADMIN_SECRET)) {
      return res.json({ success: true });
    }
    return res.status(403).json({ error: 'Mot de passe admin incorrect' });
  });

  // --- 2FA Endpoints ---

  router.get('/2fa/status', authenticate, (req, res) => {
    const user = db.prepare('SELECT two_factor_enabled FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ enabled: user.two_factor_enabled === 1 });
  });

  router.post('/2fa/setup', authenticate, (req, res) => {
    const user = db.prepare('SELECT two_factor_enabled FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA déjà activée. Désactivez-la d\'abord.' });
    }

    const secret = generateSecret();
    db.prepare('UPDATE users SET two_factor_secret = ? WHERE id = ?').run(secret, req.user.id);

    res.json({
      secret: secret,
      formatted: formatSecret(secret),
      issuer: 'IPCE Dashboard',
      account: req.user.nom,
    });
  });

  router.post('/2fa/verify', authenticate, (req, res) => {
    const { code } = req.body;
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Code à 6 chiffres requis' });
    }

    if (isTwoFaLocked(req.user.id)) {
      return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const user = db.prepare('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (!user.two_factor_secret) {
      return res.status(400).json({ error: 'Aucun secret 2FA configuré. Lancez le setup d\'abord.' });
    }

    if (!verifyTOTP(user.two_factor_secret, code)) {
      recordTwoFaFailure(req.user.id);
      return res.status(400).json({ error: 'Code incorrect. Réessayez.' });
    }

    clearTwoFaFailures(req.user.id);
    db.prepare('UPDATE users SET two_factor_enabled = 1 WHERE id = ?').run(req.user.id);
    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(
      req.user.id, 'enable_2fa', 'user:' + req.user.id, 'Authentification à deux facteurs activée'
    );

    res.json({ message: '2FA activée avec succès' });
  });

  router.post('/2fa/disable', authenticate, (req, res) => {
    const { code } = req.body;
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Code à 6 chiffres requis pour désactiver' });
    }

    if (isTwoFaLocked(req.user.id)) {
      return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const user = db.prepare('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (!user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA non activée' });
    }

    if (!verifyTOTP(user.two_factor_secret, code)) {
      recordTwoFaFailure(req.user.id);
      return res.status(400).json({ error: 'Code incorrect. Réessayez.' });
    }

    clearTwoFaFailures(req.user.id);
    db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?').run(req.user.id);
    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(
      req.user.id, 'disable_2fa', 'user:' + req.user.id, 'Authentification à deux facteurs désactivée'
    );

    res.json({ message: '2FA désactivée' });
  });

  // Periodically purge stale secret-attempt entries.
  setInterval(() => {
    const cutoff = Date.now() - SECRET_WINDOW;
    for (const [ip, attempts] of secretAttempts) {
      if (attempts.length === 0 || attempts[attempts.length - 1] < cutoff) {
        secretAttempts.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  // Periodically purge stale 2FA attempt entries.
  setInterval(() => {
    const cutoff = Date.now() - TWOFA_WINDOW;
    for (const [key, attempts] of twoFaAttempts) {
      const active = attempts.filter(t => t >= cutoff);
      if (active.length === 0) twoFaAttempts.delete(key);
      else twoFaAttempts.set(key, active);
    }
  }, 5 * 60 * 1000).unref();

  return router;
}

module.exports = createAuthRouter;// Marexsoft Corporation
