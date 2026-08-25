const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');

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

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
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

  return router;
}

module.exports = createAuthRouter;
