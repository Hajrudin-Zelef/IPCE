const express = require('express');
const { authenticate } = require('../middleware/auth');
const { chat, generateInsights, generatePredictions, generateReport, callWebSearch } = require('../lib/ai');

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
    res.json({ godmode: isGodMode(req.user.id) });
  });

  // Chat (simple, via websearch_agent)
  router.post('/chat', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });

    const gm = isGodMode(req.user.id);
    const cmd = message.trim().toLowerCase();

    // God Mode commands
    if (cmd === '/rahian') {
      if (gm) return res.json({ content: 'God Mode est deja actif.', godmode: true });
      return res.json({ content: 'Entrez le mot de passe God Mode :', godmode_prompt: true });
    }

    if (cmd.startsWith('/rahian ')) {
      const pwd = message.trim().substring(8).trim();
      const gp = process.env.GODMODE_PASSWORD;
      if (!gp) return res.json({ content: 'God Mode non configure.', godmode: false });
      if (pwd === gp) {
        godmodeSessions.set(req.user.id, { active: true, expiresAt: Date.now() + GODMODE_DURATION });
        db.prepare("INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)").run(req.user.id, 'godmode_enable', 'system', 'God Mode active');
        return res.json({ content: 'God Mode active (30 min). Acces technique complet.', godmode: true });
      }
      db.prepare("INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)").run(req.user.id, 'godmode_fail', 'system', 'Mot de passe incorrect');
      return res.json({ content: 'Mot de passe incorrect.', godmode: false });
    }

    if (cmd === '/deactivate') {
      godmodeSessions.delete(req.user.id);
      return res.json({ content: 'God Mode desactive.', godmode: false });
    }

    if (cmd === '/cmds') {
      const cmds = gm
        ? '/rahian - Activer God Mode\n/rahian <pass> - Verifier\n/deactivate - Desactiver\n/status - Statut'
        : '/rahian - Activer God Mode (admin)\n/status - Statut';
      return res.json({ content: cmds, godmode: gm });
    }

    if (cmd === '/status') {
      const remaining = gm ? Math.round((godmodeSessions.get(req.user.id).expiresAt - Date.now()) / 60000) : 0;
      return res.json({ content: `God Mode: ${gm ? 'ACTIF (' + remaining + ' min)' : 'INACTIF'}`, godmode: gm });
    }

    // Chat via websearch_agent
    try {
      const result = await chat(message, [], db, gm);
      res.json({ content: result.content, godmode: gm, model: result.model, provider: result.provider });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Erreur IA' });
    }
  });

  router.get('/insights', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    try {
      const gm = isGodMode(req.user.id);
      const insights = await generateInsights(db, gm);
      const insert = db.prepare("INSERT INTO ai_insights (type, title, message, priority) VALUES (?, ?, ?, ?)");
      for (const i of insights) insert.run(i.type, i.title, i.message, i.priority || 0);
      if (broadcast && insights.length > 0) broadcast({ type: 'new_insights', count: insights.length });
      res.json(insights);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/predictions', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    try { res.json(await generatePredictions(db, isGodMode(req.user.id))); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/report', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    try { res.json(await generateReport(db, isGodMode(req.user.id))); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/stored-insights', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    res.json(db.prepare("SELECT * FROM ai_insights ORDER BY created_at DESC LIMIT ?").all(Math.min(parseInt(req.query.limit) || 20, 100)));
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
