const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const { generateSecret, generateTOTP, verifyTOTP, formatSecret } = require('../lib/totp');

function createAuthRouter(db) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { nom, password } = req.body;
    if (!nom || !password) {
      return res.status(400).json({ error: 'Nom et mot de passe requis' });
    }

    const user = db.prepare('SELECT * FROM users WHERE nom = ?').get(nom);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: user.id, nom: user.nom, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'strict' : 'lax',
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

  router.post('/change-password', authenticate, (req, res) => {
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
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?').run(hash, req.user.id);

    res.json({ message: 'Mot de passe change avec succes' });
  });

  router.post('/register', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acces refuse' });
    }

    const { nom, password, role } = req.body;
    if (!nom || !password) {
      return res.status(400).json({ error: 'Nom et mot de passe requis' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caracteres' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE nom = ?').get(nom);
    if (existing) {
      return res.status(409).json({ error: 'Ce nom est deja utilise' });
    }

    const hash = bcrypt.hashSync(password, 12);
    const userRole = role === 'admin' ? 'admin' : 'commercial';
    const result = db.prepare('INSERT INTO users (nom, password, role, must_change_password) VALUES (?, ?, ?, ?)').run(nom, hash, userRole, 0);

    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'create_user', 'user:' + result.lastInsertRowid, `Utilisateur "${nom}" créé avec le rôle ${userRole}`);

    res.status(201).json({ id: result.lastInsertRowid, nom, role: userRole });
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
    res.clearCookie('token', { path: '/' });
    res.json({ message: 'Deconnecte' });
  });

  // --- Admin Secret Verification ---
  router.post('/verify-admin-secret', (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Mot de passe requis' });
    if (password === process.env.ADMIN_SECRET) {
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

    const user = db.prepare('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (!user.two_factor_secret) {
      return res.status(400).json({ error: 'Aucun secret 2FA configuré. Lancez le setup d\'abord.' });
    }

    if (!verifyTOTP(user.two_factor_secret, code)) {
      return res.status(400).json({ error: 'Code incorrect. Réessayez.' });
    }

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

    const user = db.prepare('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (!user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA non activée' });
    }

    if (!verifyTOTP(user.two_factor_secret, code)) {
      return res.status(400).json({ error: 'Code incorrect. Réessayez.' });
    }

    db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?').run(req.user.id);
    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(
      req.user.id, 'disable_2fa', 'user:' + req.user.id, 'Authentification à deux facteurs désactivée'
    );

    res.json({ message: '2FA désactivée' });
  });

  return router;
}

module.exports = createAuthRouter;
