const OpenAI = require('openai');
const { PROMPTS, NORMAL_PROMPT, GODMODE_PROMPT } = require('./ai-prompts');
const { router } = require('./ai-router');
const fs = require('fs');
const path = require('path');

// ========== CONTEXTE PUBLIC ENRICHI ==========
function buildContext(db) {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);
  const daysRemaining = daysInMonth - dayOfMonth;

  const users = db.prepare("SELECT id, nom FROM users WHERE role = 'commercial'").all();
  const perUser = db.prepare(`
    SELECT u.id, u.nom,
      SUM(CASE WHEN c.statut IN ('validee','approuvee') THEN c.ca ELSE 0 END) as ca,
      SUM(CASE WHEN c.statut IN ('validee','approuvee') THEN c.offres ELSE 0 END) as offres,
      SUM(CASE WHEN c.statut IN ('validee','approuvee') THEN c.bc ELSE 0 END) as bc,
      COUNT(DISTINCT c.id) as collectes,
      COUNT(DISTINCT CASE WHEN c.created_at >= date('now','start of month') THEN c.id END) as collectes_mois
    FROM users u LEFT JOIN collectes c ON c.user_id = u.id
    WHERE u.role = 'commercial' GROUP BY u.id
  `).all();

  const totals = db.prepare(`
    SELECT
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN ca ELSE 0 END) as ca,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN offres ELSE 0 END) as offres,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN bc ELSE 0 END) as bc,
      COUNT(DISTINCT id) as collectes
    FROM collectes
  `).get();

  const caMois = db.prepare(`SELECT COALESCE(SUM(ca), 0) as total FROM collectes WHERE statut IN ('validee','approuvee') AND created_at >= date('now','start of month')`).get();
  const rdvTotal = db.prepare(`SELECT COUNT(*) as count FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee')`).get();
  const rdvMois = db.prepare(`SELECT COUNT(*) as count FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee') AND r.date >= date('now','start of month') AND r.date <= date('now','last day of month')`).get();
  const rdvMontant = db.prepare(`SELECT SUM(r.montant) as total FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee')`).get();

  const settings = db.prepare("SELECT key, value FROM settings").all();
  const s = {};
  settings.forEach(x => { s[x.key] = x.value; });
  const objCA = parseInt(s.ca_objectif || 100000000);
  const objOffres = parseInt(s.offres_objectif || 6);
  const objBC = parseInt(s.bc_objectif || 6);
  const objRDV = parseInt(s.rdv_objectif || 6);

  const pctCA = Math.round((caMois.total / objCA) * 100);
  const pctOffres = Math.round((totals.offres / objOffres) * 100);
  const pctBC = Math.round((totals.bc / objBC) * 100);
  const pctRDV = rdvTotal.count > 0 ? Math.round((rdvTotal.count / objRDV) * 100) : 0;

  const convRdvOffre = rdvTotal.count > 0 ? Math.round((totals.offres / rdvTotal.count) * 100) : 0;
  const convOffreBc = totals.offres > 0 ? Math.round((totals.bc / totals.offres) * 100) : 0;
  const projectedCA = dayOfMonth > 0 ? Math.round((caMois.total / dayOfMonth) * daysInMonth) : 0;

  const evolution = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN ca ELSE 0 END) as ca,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN offres ELSE 0 END) as offres,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN bc ELSE 0 END) as bc,
      COUNT(DISTINCT id) as collectes
    FROM collectes WHERE created_at >= date('now','-6 months')
    GROUP BY month ORDER BY month ASC
  `).all();

  const tendanceCA = evolution.length >= 2 ? (() => {
    const recent = evolution.slice(-3);
    const first = recent[0]?.ca || 0;
    const last = recent[recent.length - 1]?.ca || 0;
    if (last > first * 1.1) return 'HAUSSE';
    if (last < first * 0.9) return 'BAISSE';
    return 'STABLE';
  })() : 'INDÉTERMINÉ';

  const pending = db.prepare("SELECT COUNT(*) as count FROM collectes WHERE statut = 'validee'").get();
  const pendingCA = db.prepare("SELECT COALESCE(SUM(ca), 0) as total FROM collectes WHERE statut = 'validee'").get();

  const healthScore = Math.min(100, Math.round(
    (Math.min(pctCA, 150) * 0.35) + (Math.min(pctOffres, 150) * 0.2) + (Math.min(pctBC, 150) * 0.25) + (Math.min(pctRDV, 150) * 0.2)
  ));

  const sorted = [...perUser].sort((a, b) => b.ca - a.ca);
  const leader = sorted[0];
  const dernier = sorted[sorted.length - 1];
  const gapLeaderDernier = leader && dernier && dernier.ca > 0 ? Math.round(((leader.ca - dernier.ca) / dernier.ca) * 100) : 0;

  const anomalies = [];
  if (pctCA < 50 && monthProgress > 40) anomalies.push('CA CRITIQUE <50% à ' + monthProgress + '% du mois');
  if (convRdvOffre < 30) anomalies.push('Conversion RDV→Offre FAIBLE (' + convRdvOffre + '%)');
  if (convOffreBc < 40) anomalies.push('Fermeture Offre→BC FAIBLE (' + convOffreBc + '%)');
  if (gapLeaderDernier > 200) anomalies.push('Écart leader/dernier ÉLEVÉ (' + gapLeaderDernier + '%)');

  const insights = [];
  if (healthScore >= 80) insights.push('Score santé EXCELLENT (' + healthScore + '/100)');
  else if (healthScore >= 60) insights.push('Score santé CORRECT (' + healthScore + '/100)');
  else if (healthScore >= 40) insights.push('Score santé MOYEN (' + healthScore + '/100)');
  else insights.push('Score santé CRITIQUE (' + healthScore + '/100)');
  if (projectedCA > objCA) insights.push('Projection CA DÉPASSE l\'objectif');
  if (daysRemaining <= 7 && pctCA < 80) insights.push('ATTENTION: ' + daysRemaining + ' jours restants, CA à ' + pctCA + '%');

  return `
═══════════════════════════════════════════════════════════════
CONTEXTE IPCE Dashboard — ${now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
═══════════════════════════════════════════════════════════════

📅 MOIS : Jour ${dayOfMonth}/${daysInMonth} — ${monthProgress}% écoulé — ${daysRemaining} jours restants

👥 ÉQUIPE (${users.length} commerciaux)
${perUser.map(u => {
  const pct = objCA > 0 ? Math.round((u.ca / objCA) * 100) : 0;
  const convR = u.offres > 0 ? Math.round((u.bc / u.offres) * 100) : 0;
  return `- ${u.nom}: CA ${u.ca.toLocaleString('fr-FR')} FCFA (${pct}% obj) | ${u.offres} offres | ${u.bc} BC (${convR}% conv) | ${u.collectes} collectes`;
}).join('\n')}

📊 RÉSUMÉ GLOBAL (ce mois)
- CA: ${caMois.total.toLocaleString('fr-FR')} / ${objCA.toLocaleString('fr-FR')} FCFA (${pctCA}%)
- Offres: ${totals.offres} / ${objOffres} (${pctOffres}%)
- BC: ${totals.bc} / ${objBC} (${pctBC}%)
- RDV total: ${rdvTotal.count} | Ce mois: ${rdvMois.count}
- Montant total RDV: ${(rdvMontant.total || 0).toLocaleString('fr-FR')} FCFA
- En attente validation: ${pending.count} (${pendingCA.total.toLocaleString('fr-FR')} FCFA)

🔄 TAUX DE CONVERSION
- RDV → Offre: ${convRdvOffre}%
- Offre → BC: ${convOffreBc}%

📈 PROJECTIONS FIN DE MOIS
- CA: ${projectedCA.toLocaleString('fr-FR')} FCFA ${projectedCA > objCA ? '✅ DÉPASSE' : '⚠️ En dessous'}
- Offres: ${projectedOffres || Math.round((totals.offres / dayOfMonth) * daysInMonth)}
- BC: ${projectedBC || Math.round((totals.bc / dayOfMonth) * daysInMonth)}

🎯 SCORE DE SANTÉ: ${healthScore}/100 ${healthScore >= 70 ? '🟢' : healthScore >= 50 ? '🟡' : '🔴'}
📊 TENDANCE CA: ${tendanceCA} (3 derniers mois)
${evolution.map(e => `  - ${e.month}: CA ${e.ca.toLocaleString('fr-FR')} | ${e.offres} offres | ${e.bc} BC | ${e.collectes} collectes`).join('\n') || '  Aucune donnée'}

🏆 LEADER: ${leader ? leader.nom + ' (' + leader.ca.toLocaleString('fr-FR') + ' FCFA)' : 'N/A'}
📉 DERNIER: ${dernier ? dernier.nom + ' (' + dernier.ca.toLocaleString('fr-FR') + ' FCFA)' : 'N/A'}
📏 ÉCART LEADER/DERNIER: ${gapLeaderDernier}%

🚨 ANOMALIES (${anomalies.length})
${anomalies.length > 0 ? anomalies.map(a => '  ⚠️ ' + a).join('\n') : '  Aucune'}

💡 INSIGHTS
${insights.map(i => '  → ' + i).join('\n')}

⚙️ PARAMÈTRES
- Objectif CA: ${objCA.toLocaleString('fr-FR')} FCFA/mois | Offres: ${objOffres} | BC: ${objBC} | RDV: ${objRDV}
`;
}

// ========== CONTEXTE GOD MODE ==========
function buildGodModeContext(db) {
  const publicCtx = buildContext(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const schema = tables.map(t => {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
    const indexes = db.prepare(`PRAGMA index_list(${t.name})`).all();
    return `📋 ${t.name} (${cols.length} colonnes)\n${cols.map(c => `  ${c.name} ${c.type}${c.notnull ? ' NOT NULL' : ''}${c.pk ? ' [PK]' : ''}${c.dflt_value ? ' DEFAULT ' + c.dflt_value : ''}`).join('\n')}${indexes.length > 0 ? '\n  Indexes: ' + indexes.map(i => i.name).join(', ') : ''}`;
  }).join('\n\n');

  const allUsers = db.prepare("SELECT id, nom, role, must_change_password, two_factor_enabled FROM users").all();
  const logs = db.prepare("SELECT u.nom as user_nom, l.action, l.target, l.details, l.created_at FROM logs l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC LIMIT 50").all();
  const validations = db.prepare(`SELECT u.nom as admin_nom, p.nom as commercial_nom, vh.action, vh.details, vh.created_at FROM validation_history vh JOIN users u ON u.id = vh.user_id JOIN collectes c ON c.id = vh.collecte_id JOIN users p ON p.id = c.user_id ORDER BY vh.created_at DESC LIMIT 20`).all();
  const notifStats = db.prepare("SELECT type, COUNT(*) as count, SUM(CASE WHEN is_read=0 THEN 1 ELSE 0 END) as unread FROM notifications GROUP BY type").all();
  const insightStats = db.prepare("SELECT type, COUNT(*) as count FROM ai_insights GROUP BY type").all();
  const collecteStats = db.prepare("SELECT statut, COUNT(*) as count, SUM(ca) as ca FROM collectes GROUP BY statut").all();
  const rdvStats = db.prepare(`SELECT r.statut, COUNT(*) as count, SUM(r.montant) as montant FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee') GROUP BY r.statut`).all();

  const projectRoot = path.join(__dirname, '..');
  const fileList = [];
  const walk = (dir, prefix = '') => {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (['node_modules', '.git', 'data', 'test-results', 'TAF', 'RAPPORT'].includes(item)) continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full, prefix + item + '/');
        else fileList.push(prefix + item);
      }
    } catch {}
  };
  walk(projectRoot);

  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

  const routes = [];
  for (const file of ['admin.js', 'auth.js', 'collectes.js', 'ai.js']) {
    try {
      const content = fs.readFileSync(path.join(projectRoot, 'routes', file), 'utf8');
      const matches = content.match(/router\.(get|post|put|patch|delete)\('([^']+)'/g);
      if (matches) routes.push(...matches.map(r => r.replace('router.', '')));
    } catch {}
  }

  return `${publicCtx}

═══════════════════════════════════════════════════════════════
🔓 GOD MODE — ACCÈS TECHNIQUE COMPLET
═══════════════════════════════════════════════════════════════

🗄️ SCHEMA BDD (${tables.length} tables)
${schema}

👤 USERS (${allUsers.length})
${allUsers.map(u => `  [${u.id}] ${u.nom} (${u.role}) | mdp_change: ${u.must_change_password ? 'OUI' : 'non'} | 2FA: ${u.two_factor_enabled ? 'active' : 'non'}`).join('\n')}

📊 COLLECTES PAR STATUT
${collecteStats.map(c => `  ${c.statut}: ${c.count} | CA ${(c.ca || 0).toLocaleString('fr-FR')} FCFA`).join('\n')}

📅 RDV PAR STATUT
${rdvStats.map(r => `  ${r.statut}: ${r.count} | ${(r.montant || 0).toLocaleString('fr-FR')} FCFA`).join('\n')}

📜 LOGS (${logs.length})
${logs.slice(0, 20).map(l => `  [${l.created_at}] ${l.user_nom || 'system'} → ${l.action} | ${l.target || ''}`).join('\n')}

✅ VALIDATIONS (${validations.length})
${validations.slice(0, 10).map(v => `  ${v.admin_nom} → ${v.action} (${v.commercial_nom}) | ${v.created_at}`).join('\n')}

🔔 NOTIFICATIONS
${notifStats.map(n => `  ${n.type}: ${n.count} (${n.unread} non lues)`).join('\n') || '  Aucune'}

🤖 INSIGHTS IA
${insightStats.map(i => `  ${i.type}: ${i.count}`).join('\n') || '  Aucun'}

🏗️ ARCHITECTURE
- Node.js ${process.version} + Express 4 + SQLite WAL
- Auth: JWT httpOnly (8h) + bcrypt 12 rounds + rate limit 10/15min
- WebSocket: ws (notifications temps réel)
- IA: Smart Router (OpenRouter + Groq + Nvidia + DeepSeek)
- Port: ${process.env.PORT || 4600} (systemd: ipce.service)
- PWA: Service worker + manifest

📦 DÉPENDANCES (v${pkg.version})
Production: ${Object.keys(pkg.dependencies || {}).join(', ')}
Dev: ${Object.keys(pkg.devDependencies || {}).join(', ')}

🔗 ROUTES (${routes.length})
${routes.join('\n')}

📁 FICHIERS (${fileList.length})
${fileList.join('\n')}
`;
}

// ========== CHAT (Non-streaming pour insights/predictions/report) ==========
async function chat(message, history, db, mode = 'free', godmode = false, forceModel = null) {
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.chat;
  const context = godmode ? buildGodModeContext(db) : buildContext(db);

  const result = await router.failover(mode, async (model) => {
    const client = new OpenAI({ apiKey: process.env[model.keyEnv], baseURL: model.baseURL });

    const messages = [
      { role: 'system', content: prompt + '\n\n' + context },
      ...history.slice(-15).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const response = await client.chat.completions.create({
      model: model.id,
      messages,
      max_tokens: godmode ? 4096 : 2048,
      temperature: godmode ? 0.6 : 0.7,
    });

    return { content: response.choices[0].message.content, usage: response.usage };
  }, forceModel);

  return {
    content: result.content,
    model: result._model,
    modelName: result._modelName,
    provider: result._provider,
    usage: result.usage,
  };
}

// ========== CHAT STREAMING ==========
async function chatStream(message, history, db, mode = 'free', godmode = false, forceModel = null, res) {
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.chat;
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const maxAttempts = 3;
  const tried = new Set();

  for (let i = 0; i < maxAttempts; i++) {
    let model = router.resolve(mode, i === 0 ? forceModel : null);
    if (!model) {
      res.write(`data: ${JSON.stringify({ error: 'Aucun modèle disponible', done: true })}\n\n`);
      res.end();
      return;
    }
    if (tried.has(model.id)) { router.blacklist(model.id); continue; }
    tried.add(model.id);

    try {
      const client = new OpenAI({ apiKey: process.env[model.keyEnv], baseURL: model.baseURL });
      const messages = [
        { role: 'system', content: prompt + '\n\n' + context },
        ...history.slice(-15).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ];

      const stream = await client.chat.completions.create({
        model: model.id,
        messages,
        max_tokens: godmode ? 4096 : 2048,
        temperature: godmode ? 0.6 : 0.7,
        stream: true,
      });

      router.recordSuccess(model.id);
      let fullContent = '';

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          fullContent += text;
          res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, model: model.id, modelName: model.name, provider: model.provider })}\n\n`);
      res.end();
      return;
    } catch (err) {
      router.recordFail(model.id);
      router.blacklist(model.id);
      if (i === maxAttempts - 1) {
        res.write(`data: ${JSON.stringify({ error: err.message || 'Erreur IA', done: true })}\n\n`);
        res.end();
      }
    }
  }
}

// ========== INSIGHTS ==========
async function generateInsights(db, mode = 'free', godmode = false) {
  const { client, model } = router.resolve(mode);
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.insights;

  const result = await router.failover(mode, async (m) => {
    const c = new OpenAI({ apiKey: process.env[m.keyEnv], baseURL: m.baseURL });
    const response = await c.chat.completions.create({
      model: m.id,
      messages: [
        { role: 'system', content: prompt + '\n\n' + context },
        { role: 'user', content: 'Analyse les données et génère les insights critiques.' },
      ],
      max_tokens: 4096,
      temperature: 0.4,
    });
    const content = response.choices[0].message.content;
    try { const j = content.match(/\[[\s\S]*\]/); return { data: j ? JSON.parse(j[0]) : [] }; } catch { return { data: [] }; }
  });

  return result.data;
}

// ========== PREDICTIONS ==========
async function generatePredictions(db, mode = 'free', godmode = false) {
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.predictions;

  const result = await router.failover(mode, async (m) => {
    const c = new OpenAI({ apiKey: process.env[m.keyEnv], baseURL: m.baseURL });
    const response = await c.chat.completions.create({
      model: m.id,
      messages: [
        { role: 'system', content: prompt + '\n\n' + context },
        { role: 'user', content: 'Prédit les performances pour la fin du mois.' },
      ],
      max_tokens: 4096,
      temperature: 0.4,
    });
    const content = response.choices[0].message.content;
    try { const j = content.match(/\[[\s\S]*\]/); return { data: j ? JSON.parse(j[0]) : [] }; } catch { return { data: [] }; }
  });

  return result.data;
}

// ========== REPORT ==========
async function generateReport(db, mode = 'free', godmode = false) {
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.report;

  const result = await router.failover(mode, async (m) => {
    const c = new OpenAI({ apiKey: process.env[m.keyEnv], baseURL: m.baseURL });
    const response = await c.chat.completions.create({
      model: m.id,
      messages: [
        { role: 'system', content: prompt + '\n\n' + context },
        { role: 'user', content: "Génère le rapport d'analyse commerciale complet." },
      ],
      max_tokens: 8192,
      temperature: 0.5,
    });
    return { content: response.choices[0].message.content };
  });

  return { content: result.content, model: result._model, modelName: result._modelName, provider: result._provider };
}

module.exports = { chat, chatStream, generateInsights, generatePredictions, generateReport, buildContext, buildGodModeContext };
