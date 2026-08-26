const express = require('express');
const { authenticate } = require('../middleware/auth');
const { chat, generateInsights, generatePredictions, generateReport, PROVIDERS } = require('../lib/ai');

const godmodeSessions = new Map();
const GODMODE_DURATION = 30 * 60 * 1000;

function isGodMode(userId) {
  const s = godmodeSessions.get(userId);
  if (!s) return false;
  if (Date.now() > s.expiresAt) { godmodeSessions.delete(userId); return false; }
  return true;
}

function createAIRouter(db, broadcast) {
  const router = express.Router();

  router.get('/config', authenticate, (req, res) => {
    const mode = process.env.AI_MODE || 'free';
    const providers = {};
    for (const [tier, list] of Object.entries(PROVIDERS)) {
      providers[tier] = list.map(p => ({ name: p.name, model: p.model, available: !!process.env[p.keyEnv] }));
    }
    res.json({ mode, providers, godmode: isGodMode(req.user.id) });
  });

  router.post('/config', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    const { mode } = req.body;
    if (!['free', 'standard', 'elite'].includes(mode)) return res.status(400).json({ error: 'Mode invalide' });
    process.env.AI_MODE = mode;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_mode', ?)").run(mode);
    res.json({ mode });
  });

  router.post('/chat', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    let { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });

    const gm = isGodMode(req.user.id);
    const cmd = message.trim().toLowerCase();

    if (cmd === '/rahian') {
      if (gm) return res.json({ content: 'God Mode est deja actif.', godmode: true, provider: 'system', model: 'godmode' });
      return res.json({ content: 'Entrez le mot de passe God Mode :', godmode_prompt: true, provider: 'system', model: 'godmode' });
    }

    if (cmd.startsWith('/rahian ')) {
      const pwd = message.trim().substring(8).trim();
      const gp = process.env.GODMODE_PASSWORD;
      if (!gp) return res.json({ content: 'God Mode non configure. Ajoutez GODMODE_PASSWORD dans .env.', godmode: false, provider: 'system', model: 'godmode' });
      if (pwd === gp) {
        godmodeSessions.set(req.user.id, { active: true, expiresAt: Date.now() + GODMODE_DURATION });
        db.prepare("INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)").run(req.user.id, 'godmode_enable', 'system', 'God Mode active');
        return res.json({ content: 'God Mode active (30 min). Acces technique complet. /cmds pour les commandes.', godmode: true, provider: 'system', model: 'godmode' });
      }
      db.prepare("INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)").run(req.user.id, 'godmode_fail', 'system', 'Mot de passe incorrect');
      return res.json({ content: 'Mot de passe incorrect.', godmode: false, provider: 'system', model: 'godmode' });
    }

    if (cmd === '/deactivate') {
      godmodeSessions.delete(req.user.id);
      return res.json({ content: 'God Mode desactive.', godmode: false, provider: 'system', model: 'godmode' });
    }

    if (cmd === '/cmds') {
      const cmds = gm
        ? 'Commandes God Mode:\n/rahian - Activer God Mode\n/rahian <pass> - Verifier le mot de passe\n/deactivate - Desactiver God Mode\n/status - Voir le statut\n/cmds - Cette aide'
        : 'Commandes:\n/rahian - Activer God Mode (admin)\n/status - Voir le statut\n/cmds - Cette aide';
      return res.json({ content: cmds, godmode: gm, provider: 'system', model: 'godmode' });
    }

    if (cmd === '/status') {
      const mode = process.env.AI_MODE || 'free';
      const remaining = gm ? Math.round((godmodeSessions.get(req.user.id).expiresAt - Date.now()) / 60000) : 0;
      return res.json({
        content: `Statut IA:\n- Mode: ${mode}\n- God Mode: ${gm ? 'ACTIF (' + remaining + ' min restantes)' : 'INACTIF'}`,
        godmode: gm, provider: 'system', model: 'godmode',
      });
    }

    try {
      const mode = process.env.AI_MODE || 'free';
      const result = await chat(message, history, db, mode, gm);
      result.godmode = gm;
      res.json(result);
    } catch (err) {
      const msg = err.message || 'Erreur IA';
      if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('API key')) {
        return res.status(503).json({ error: 'Cle API invalide ou manquante.' });
      }
      res.status(500).json({ error: msg });
    }
  });

  router.get('/insights', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    try {
      const mode = process.env.AI_MODE || 'free';
      const gm = isGodMode(req.user.id);
      const insights = await generateInsights(db, mode, gm);
      const insert = db.prepare("INSERT INTO ai_insights (type, title, message, priority) VALUES (?, ?, ?, ?)");
      for (const i of insights) insert.run(i.type, i.title, i.message, i.priority || 0);
      if (broadcast && insights.length > 0) broadcast({ type: 'new_insights', count: insights.length });
      res.json(insights);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/predictions', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    try {
      const mode = process.env.AI_MODE || 'free';
      const gm = isGodMode(req.user.id);
      res.json(await generatePredictions(db, mode, gm));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/report', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    try {
      const mode = process.env.AI_MODE || 'free';
      const gm = isGodMode(req.user.id);
      res.json(await generateReport(db, mode, gm));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/stored-insights', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    res.json(db.prepare("SELECT * FROM ai_insights ORDER BY created_at DESC LIMIT ?").all(limit));
  });

  router.patch('/insights/:id/read', authenticate, (req, res) => {
    db.prepare("UPDATE ai_insights SET is_read = 1 WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  router.delete('/insights/:id', authenticate, (req, res) => {
    db.prepare("DELETE FROM ai_insights WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  return router;
}

module.exports = createAIRouter;
