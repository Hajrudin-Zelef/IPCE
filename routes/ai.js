const express = require('express');
const { authenticate } = require('../middleware/auth');
const { chat, generateInsights, generatePredictions, generateReport, getAIErrorStats } = require('../lib/ai');

const godmodeSessions = new Map();
const GODMODE_DURATION = 30 * 60 * 1000;

// --- Rate Limiting for AI ---
const aiRateLimits = new Map();
const AI_RATE_WINDOW = 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - AI_RATE_WINDOW;
  for (const [key, hits] of aiRateLimits) {
    const active = hits.filter(t => t >= cutoff);
    if (active.length === 0) aiRateLimits.delete(key);
    else aiRateLimits.set(key, active);
  }
}, 5 * 60 * 1000).unref();

// --- Rate Limiting for God Mode /rahian ---
const godmodeAttempts = new Map();
const GODMODE_ATTEMPT_WINDOW = 15 * 60 * 1000;
const GODMODE_ATTEMPT_MAX = 5;

function isGodmodeLocked(userId) {
  const attempts = godmodeAttempts.get(userId) || [];
  return attempts.filter(t => Date.now() - t < GODMODE_ATTEMPT_WINDOW).length >= GODMODE_ATTEMPT_MAX;
}
function recordGodmodeFailure(userId) {
  const attempts = godmodeAttempts.get(userId) || [];
  attempts.push(Date.now());
  godmodeAttempts.set(userId, attempts);
}
function clearGodmodeFailures(userId) {
  godmodeAttempts.delete(userId);
}

setInterval(() => {
  const cutoff = Date.now() - GODMODE_ATTEMPT_WINDOW;
  for (const [key, attempts] of godmodeAttempts) {
    const active = attempts.filter(t => t >= cutoff);
    if (active.length === 0) godmodeAttempts.delete(key);
    else godmodeAttempts.set(key, active);
  }
}, 5 * 60 * 1000).unref();

function aiRateLimit(maxPerMinute) {
  return (req, res, next) => {
    const key = `${req.user.id}`;
    const now = Date.now();
    const hits = aiRateLimits.get(key) || [];
    const recent = hits.filter(t => now - t < AI_RATE_WINDOW);
    if (recent.length >= maxPerMinute) {
      return res.status(429).json({ error: `Trop de requetes IA. Limite: ${maxPerMinute}/min.` });
    }
    recent.push(now);
    aiRateLimits.set(key, recent);
    next();
  };
}

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
  router.post('/chat', authenticate, aiRateLimit(20), async (req, res) => {
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
      if (isGodmodeLocked(req.user.id)) {
        return res.status(429).json({ content: 'Trop de tentatives. Réessayez dans 15 minutes.', godmode: false });
      }
      const pwd = message.trim().substring(8).trim();
      const gp = process.env.GODMODE_PASSWORD;
      if (!gp) return res.json({ content: 'God Mode non configure.', godmode: false });
      if (pwd === gp) {
        clearGodmodeFailures(req.user.id);
        godmodeSessions.set(req.user.id, { active: true, expiresAt: Date.now() + GODMODE_DURATION });
        db.prepare("INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)").run(req.user.id, 'godmode_enable', 'system', 'God Mode active');
        return res.json({ content: 'God Mode active (30 min). Acces technique complet.', godmode: true });
      }
      recordGodmodeFailure(req.user.id);
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

    // Log user message
    const startTime = Date.now();
    db.prepare("INSERT INTO ai_conversations (user_id, role, message, godmode) VALUES (?, 'user', ?, ?)").run(req.user.id, message, gm ? 1 : 0);

    // Chat via websearch_agent
    try {
      const result = await chat(message, [], db, gm);
      const responseTime = Date.now() - startTime;
      db.prepare("INSERT INTO ai_conversations (user_id, role, message, model, godmode, response_time_ms) VALUES (?, 'assistant', ?, ?, ?, ?)").run(req.user.id, result.content, result.model, gm ? 1 : 0, responseTime);
      res.json({ content: result.content, godmode: gm, model: result.model, provider: result.provider });
    } catch (err) {
      const responseTime = Date.now() - startTime;
      db.prepare("INSERT INTO ai_conversations (user_id, role, message, godmode, response_time_ms) VALUES (?, 'assistant', 'ERROR', ?, ?)").run(req.user.id, gm ? 1 : 0, responseTime);
      // Fallback message if websearch_agent is down
      const fallbackMsg = err.message.includes('indisponible') || err.message.includes('Timeout')
        ? 'Le serveur IA est temporairement indisponible. Verifiez que websearch_agent est actif sur le port 4500.'
        : err.message || 'Erreur IA inconnue';
      res.status(500).json({ error: fallbackMsg });
    }
  });

  router.get('/insights', authenticate, aiRateLimit(5), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    try {
      const gm = isGodMode(req.user.id);
      const insights = await generateInsights(db, gm);
      const insert = db.prepare("INSERT INTO ai_insights (type, title, message, priority) VALUES (?, ?, ?, ?)");
      for (const i of insights) insert.run(i.type, i.title, i.message, i.priority || 0);
      if (broadcast && insights.length > 0) broadcast({ type: 'new_insights', count: insights.length, insights });
      res.json(insights);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/predictions', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    try { res.json(await generatePredictions(db, isGodMode(req.user.id))); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/report', authenticate, aiRateLimit(5), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    try { res.json(await generateReport(db, isGodMode(req.user.id))); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/stored-insights', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    res.json(db.prepare("SELECT * FROM ai_insights ORDER BY created_at DESC LIMIT ?").all(Math.min(parseInt(req.query.limit) || 20, 100)));
  });

  router.patch('/insights/:id/read', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    db.prepare("UPDATE ai_insights SET is_read = 1 WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  router.delete('/insights/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    db.prepare("DELETE FROM ai_insights WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  // Conversation history
  router.get('/conversations', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const rows = db.prepare("SELECT * FROM ai_conversations ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);
    const total = db.prepare("SELECT COUNT(*) as count FROM ai_conversations").get().count;
    res.json({ conversations: rows, total });
  });

  router.delete('/conversations', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    db.prepare("DELETE FROM ai_conversations").run();
    res.json({ ok: true });
  });

  // AI Status & Error monitoring
  router.get('/status', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });
    const convCount = db.prepare("SELECT COUNT(*) as count FROM ai_conversations").get().count;
    const errorStats = getAIErrorStats();
    const avgResponseTime = db.prepare("SELECT AVG(response_time_ms) as avg FROM ai_conversations WHERE role = 'assistant' AND message != 'ERROR'").get();
    res.json({
      websearch_url: process.env.WEBSEARCH_URL || 'http://127.0.0.1:4500',
      total_conversations: convCount,
      avg_response_time_ms: Math.round(avgResponseTime.avg || 0),
      errors: errorStats,
      godmode_sessions: godmodeSessions.size,
    });
  });

  return router;
}

module.exports = createAIRouter;
