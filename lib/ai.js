const OpenAI = require('openai');
const { PROMPTS, NORMAL_PROMPT, GODMODE_PROMPT, KNOWLEDGE } = require('./ai-prompts');
const fs = require('fs');
const path = require('path');

const PROVIDERS = {
  free: [
    { name: 'Groq', model: 'llama-3.3-70b-versatile', baseURL: 'https://api.groq.com/openai/v1', keyEnv: 'GROQ_API_KEY' },
    { name: 'OpenRouter (Free)', model: 'meta-llama/llama-3-8b-instruct:free', baseURL: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY' },
  ],
  standard: [
    { name: 'OpenRouter', model: 'anthropic/claude-3.5-sonnet', baseURL: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY' },
  ],
  elite: [
    { name: 'DeepSeek', model: 'deepseek-chat', baseURL: 'https://api.deepseek.com/v1', keyEnv: 'DEEPSEEK_API_KEY' },
  ],
};

function getClient(mode) {
  const providers = PROVIDERS[mode] || PROVIDERS.free;
  for (const p of providers) {
    const apiKey = process.env[p.keyEnv];
    if (apiKey) {
      return { client: new OpenAI({ apiKey, baseURL: p.baseURL }), model: p.model, provider: p.name };
    }
  }
  const fallback = providers[0];
  return { client: new OpenAI({ apiKey: 'dummy', baseURL: fallback.baseURL }), model: fallback.model, provider: fallback.name };
}

// ========== CONTEXTE PUBLIC ENRICHI ==========
function buildContext(db) {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);
  const daysRemaining = daysInMonth - dayOfMonth;

  // --- Commerciaux et stats ---
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

  // --- Totaux ---
  const totals = db.prepare(`
    SELECT
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN ca ELSE 0 END) as ca,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN offres ELSE 0 END) as offres,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN bc ELSE 0 END) as bc,
      COUNT(DISTINCT id) as collectes
    FROM collectes
  `).get();

  // --- CA mois courant ---
  const caMois = db.prepare(`
    SELECT COALESCE(SUM(ca), 0) as total FROM collectes
    WHERE statut IN ('validee','approuvee') AND created_at >= date('now','start of month')
  `).get();

  // --- RDV ---
  const rdvTotal = db.prepare(`SELECT COUNT(*) as count FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee')`).get();
  const rdvMois = db.prepare(`SELECT COUNT(*) as count FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee') AND r.date >= date('now','start of month') AND r.date <= date('now','last day of month')`).get();
  const rdvMontant = db.prepare(`SELECT SUM(r.montant) as total FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee')`).get();

  // --- RDV par statut ---
  const rdvParStatut = db.prepare(`
    SELECT r.statut, COUNT(*) as count FROM rdvs r
    JOIN collectes c ON c.id = r.collecte_id
    WHERE c.statut IN ('validee','approuvee')
    GROUP BY r.statut
  `).all();

  // --- Settings ---
  const settings = db.prepare("SELECT key, value FROM settings").all();
  const s = {};
  settings.forEach(x => { s[x.key] = x.value; });
  const objCA = parseInt(s.ca_objectif || 100000000);
  const objOffres = parseInt(s.offres_objectif || 6);
  const objBC = parseInt(s.bc_objectif || 6);
  const objRDV = parseInt(s.rdv_objectif || 6);

  // --- Progression vs objectifs ---
  const pctCA = Math.round((caMois.total / objCA) * 100);
  const pctOffres = Math.round((totals.offres / objOffres) * 100);
  const pctBC = Math.round((totals.bc / objBC) * 100);
  const pctRDV = rdvTotal.count > 0 ? Math.round((rdvTotal.count / objRDV) * 100) : 0;

  // --- Taux de conversion ---
  const convRdvOffre = rdvTotal.count > 0 ? Math.round((totals.offres / rdvTotal.count) * 100) : 0;
  const convOffreBc = totals.offres > 0 ? Math.round((totals.bc / totals.offres) * 100) : 0;

  // --- Projections ---
  const projectedCA = dayOfMonth > 0 ? Math.round((caMois.total / dayOfMonth) * daysInMonth) : 0;
  const projectedOffres = dayOfMonth > 0 ? Math.round((totals.offres / dayOfMonth) * daysInMonth) : 0;
  const projectedBC = dayOfMonth > 0 ? Math.round((totals.bc / dayOfMonth) * daysInMonth) : 0;

  // --- Évolution 6 mois ---
  const evolution = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN ca ELSE 0 END) as ca,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN offres ELSE 0 END) as offres,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN bc ELSE 0 END) as bc,
      COUNT(DISTINCT id) as collectes
    FROM collectes WHERE created_at >= date('now','-6 months')
    GROUP BY month ORDER BY month ASC
  `).all();

  // --- Tendance CA (3 derniers mois) ---
  const tendanceCA = evolution.length >= 2 ? (() => {
    const recent = evolution.slice(-3);
    const avg = recent.reduce((a, e) => a + e.ca, 0) / recent.length;
    const first = recent[0]?.ca || 0;
    const last = recent[recent.length - 1]?.ca || 0;
    if (last > first * 1.1) return 'HAUSSE';
    if (last < first * 0.9) return 'BAISSE';
    return 'STABLE';
  })() : 'INDÉTERMINÉ';

  // --- Collectes en attente ---
  const pending = db.prepare("SELECT COUNT(*) as count FROM collectes WHERE statut = 'validee'").get();
  const pendingCA = db.prepare("SELECT COALESCE(SUM(ca), 0) as total FROM collectes WHERE statut = 'validee'").get();

  // --- Score santé ---
  const healthScore = Math.min(100, Math.round(
    (Math.min(pctCA, 150) * 0.35) +
    (Math.min(pctOffres, 150) * 0.2) +
    (Math.min(pctBC, 150) * 0.25) +
    (Math.min(pctRDV, 150) * 0.2)
  ));

  // --- Leader & dernier ---
  const sorted = [...perUser].sort((a, b) => b.ca - a.ca);
  const leader = sorted[0];
  const dernier = sorted[sorted.length - 1];
  const gapLeaderDernier = leader && dernier && dernier.ca > 0 ? Math.round(((leader.ca - dernier.ca) / dernier.ca) * 100) : 0;

  // --- Anomalies détectées ---
  const anomalies = [];
  if (pctCA < 50 && monthProgress > 40) anomalies.push('CA CRITIQUE <50% à ' + monthProgress + '% du mois');
  if (convRdvOffre < 30) anomalies.push('Conversion RDV→Offre FAIBLE (' + convRdvOffre + '%)');
  if (convOffreBc < 40) anomalies.push('Fermeture Offre→BC FAIBLE (' + convOffreBc + '%)');
  if (gapLeaderDernier > 200) anomalies.push('Écart leader/dernier ÉLEVÉ (' + gapLeaderDernier + '%)');
  if (leader) {
    const caLeader = leader.ca;
    perUser.forEach(u => {
      if (u.ca < caLeader * 0.3 && u.ca > 0) anomalies.push(u.nom + ' à ' + Math.round(u/caLeader*100) + '% du leader');
    });
  }

  // --- Insights proactifs ---
  const insights = [];
  if (healthScore >= 80) insights.push('Score santé EXCELLENT (' + healthScore + '/100)');
  else if (healthScore >= 60) insights.push('Score santé CORRECT (' + healthScore + '/100)');
  else if (healthScore >= 40) insights.push('Score santé MOYEN (' + healthScore + '/100) — à surveiller');
  else insights.push('Score santé CRITIQUE (' + healthScore + '/100) — action urgente');

  if (projectedCA > objCA) insights.push('Projection CA DÉPASSE l\'objectif (' + projectedCA.toLocaleString('fr-FR') + ' vs ' + objCA.toLocaleString('fr-FR') + ')');
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
- Offres: ${projectedOffres}
- BC: ${projectedBC}

🎯 SCORE DE SANTÉ: ${healthScore}/100 ${healthScore >= 70 ? '🟢' : healthScore >= 50 ? '🟡' : '🔴'}

📊 TENDANCE CA: ${tendanceCA} (3 derniers mois)
${evolution.map(e => `  - ${e.month}: CA ${e.ca.toLocaleString('fr-FR')} | ${e.offres} offres | ${e.bc} BC | ${e.collectes} collectes`).join('\n') || '  Aucune donnée'}

🏆 LEADER: ${leader ? leader.nom + ' (' + leader.ca.toLocaleString('fr-FR') + ' FCFA)' : 'N/A'}
📉 DERNIER: ${dernier ? dernier.nom + ' (' + dernier.ca.toLocaleString('fr-FR') + ' FCFA)' : 'N/A'}
📏 ÉCART LEADER/DERNIER: ${gapLeaderDernier}%

🚨 ANOMALIES DÉTECTÉES (${anomalies.length})
${anomalies.length > 0 ? anomalies.map(a => '  ⚠️ ' + a).join('\n') : '  Aucune anomalie'}

💡 INSIGHTS
${insights.map(i => '  → ' + i).join('\n')}

⚙️ PARAMÈTRES
- Objectif CA: ${objCA.toLocaleString('fr-FR')} FCFA/mois
- Objectif Offres: ${objOffres}/mois
- Objectif BC: ${objBC}/mois
- Objectif RDV: ${objRDV}/mois
`;
}

// ========== CONTEXTE GOD MODE ==========
function buildGodModeContext(db) {
  const publicCtx = buildContext(db);

  // DB Schema complet
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const schema = tables.map(t => {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
    const indexes = db.prepare(`PRAGMA index_list(${t.name})`).all();
    return `📋 ${t.name} (${cols.length} colonnes)\n${cols.map(c => `  ${c.name} ${c.type}${c.notnull ? ' NOT NULL' : ''}${c.pk ? ' [PK]' : ''}${c.dflt_value ? ' DEFAULT ' + c.dflt_value : ''}`).join('\n')}${indexes.length > 0 ? '\n  Indexes: ' + indexes.map(i => i.name).join(', ') : ''}`;
  }).join('\n\n');

  // Tous les users
  const allUsers = db.prepare("SELECT id, nom, role, must_change_password, two_factor_enabled FROM users").all();

  // Logs (50 derniers)
  const logs = db.prepare("SELECT u.nom as user_nom, l.action, l.target, l.details, l.created_at FROM logs l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC LIMIT 50").all();

  // Validation history
  const validations = db.prepare(`
    SELECT u.nom as admin_nom, p.nom as commercial_nom, vh.action, vh.details, vh.created_at
    FROM validation_history vh
    JOIN users u ON u.id = vh.user_id
    JOIN collectes c ON c.id = vh.collecte_id
    JOIN users p ON p.id = c.user_id
    ORDER BY vh.created_at DESC LIMIT 20
  `).all();

  // Notifications stats
  const notifStats = db.prepare("SELECT type, COUNT(*) as count, SUM(CASE WHEN is_read=0 THEN 1 ELSE 0 END) as unread FROM notifications GROUP BY type").all();

  // AI insights
  const insightStats = db.prepare("SELECT type, COUNT(*) as count FROM ai_insights GROUP BY type").all();

  // Collectes par statut
  const collecteStats = db.prepare("SELECT statut, COUNT(*) as count, SUM(ca) as ca FROM collectes GROUP BY statut").all();

  // RDV par statut
  const rdvStats = db.prepare(`
    SELECT r.statut, COUNT(*) as count, SUM(r.montant) as montant FROM rdvs r
    JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee')
    GROUP BY r.statut
  `).all();

  // Fichiers du projet
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

  // Package.json
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

  // Routes API
  const routes = [];
  try {
    const adminRoutes = fs.readFileSync(path.join(projectRoot, 'routes', 'admin.js'), 'utf8');
    const routeMatches = adminRoutes.match(/router\.(get|post|put|patch|delete)\('([^']+)'/g);
    if (routeMatches) routes.push(...routeMatches.map(r => r.replace('router.', '')));
  } catch {}
  try {
    const authRoutes = fs.readFileSync(path.join(projectRoot, 'routes', 'auth.js'), 'utf8');
    const routeMatches = authRoutes.match(/router\.(get|post|put|patch|delete)\('([^']+)'/g);
    if (routeMatches) routes.push(...routeMatches.map(r => r.replace('router.', '')));
  } catch {}
  try {
    const collecteRoutes = fs.readFileSync(path.join(projectRoot, 'routes', 'collectes.js'), 'utf8');
    const routeMatches = collecteRoutes.match(/router\.(get|post|put|patch|delete)\('([^']+)'/g);
    if (routeMatches) routes.push(...routeMatches.map(r => r.replace('router.', '')));
  } catch {}
  try {
    const aiRoutes = fs.readFileSync(path.join(projectRoot, 'routes', 'ai.js'), 'utf8');
    const routeMatches = aiRoutes.match(/router\.(get|post|put|patch|delete)\('([^']+)'/g);
    if (routeMatches) routes.push(...routeMatches.map(r => r.replace('router.', '')));
  } catch {}

  return `${publicCtx}

═══════════════════════════════════════════════════════════════
🔓 GOD MODE — ACCÈS TECHNIQUE COMPLET
═══════════════════════════════════════════════════════════════

🗄️ SCHEMA BASE DE DONNÉES (${tables.length} tables)
${schema}

👤 UTILISATEURS (${allUsers.length})
${allUsers.map(u => `  [${u.id}] ${u.nom} (${u.role}) | mdp_change: ${u.must_change_password ? 'OUI' : 'non'} | 2FA: ${u.two_factor_enabled ? 'active' : 'non'}`).join('\n')}

📊 COLLECTES PAR STATUT
${collecteStats.map(c => `  ${c.statut}: ${c.count} collectes | CA ${c.ca.toLocaleString('fr-FR')} FCFA`).join('\n')}

📅 RDV PAR STATUT
${rdvStats.map(r => `  ${r.statut}: ${r.count} RDV | Montant ${(r.montant || 0).toLocaleString('fr-FR')} FCFA`).join('\n')}

📜 DERNIERS LOGS (${logs.length})
${logs.slice(0, 20).map(l => `  [${l.created_at}] ${l.user_nom || 'system'} → ${l.action} | ${l.target || ''} | ${l.details || ''}`).join('\n')}

✅ HISTORIQUE VALIDATIONS (${validations.length})
${validations.slice(0, 10).map(v => `  ${v.admin_nom} → ${v.action} sur collecte de ${v.commercial_nom} | ${v.details || ''} | ${v.created_at}`).join('\n')}

🔔 NOTIFICATIONS
${notifStats.map(n => `  ${n.type}: ${n.count} total (${n.unread} non lues)`).join('\n') || '  Aucune'}

🤖 INSIGHTS IA
${insightStats.map(i => `  ${i.type}: ${i.count}`).join('\n') || '  Aucun'}

🏗️ ARCHITECTURE
- Stack: Node.js ${process.version} + Express 4 + SQLite (better-sqlite3, WAL mode)
- Auth: JWT httpOnly cookies (8h), bcrypt 12 rounds, rate limiting 10req/15min/IP
- Frontend: Vanilla JS/CSS, ES modules + IIFEs, SPA hash routing (#section)
- WebSocket: ws library pour notifications temps reseau
- IA: OpenAI SDK (Groq/OpenRouter/DeepSeek), God Mode
- DB: ${tables.length} tables, FK constraints, indexes
- Sécurité: HSTS, X-Frame-Options DENY, CSP, nosniff, no-referrer
- Port: ${process.env.PORT || 4600} (systemd: ipce.service)
- PWA: Service worker + manifest.json

📦 DÉPENDANCES (v${pkg.version})
Production: ${Object.keys(pkg.dependencies || {}).join(', ')}
Dev: ${Object.keys(pkg.devDependencies || {}).join(', ')}

🔗 ROUTES API (${routes.length})
${routes.join('\n')}

📁 FICHIERS (${fileList.length})
${fileList.join('\n')}

🔒 VARIABLES D'ENVIRONNEMENT (noms seulement)
${Object.keys(process.env).filter(k => ['PORT', 'NODE_ENV', 'JWT_SECRET', 'ADMIN_PASSWORD', 'DEFAULT_PASSWORD', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'GODMODE_PASSWORD', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'ADMIN_EMAIL', 'AI_MODE'].includes(k)).map(k => `  ${k}: [CONFIGURÉ]`).join('\n')}
`;
}

// ========== FONCTIONS IA ==========

async function chat(message, history, db, mode = 'free', godmode = false) {
  const { client, model, provider } = getClient(mode);
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.chat;

  const messages = [
    { role: 'system', content: prompt + '\n\n' + context },
    ...history.slice(-15).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: godmode ? 4096 : 2048,
    temperature: godmode ? 0.6 : 0.7,
  });

  return {
    content: response.choices[0].message.content,
    provider,
    model,
    usage: response.usage,
  };
}

async function generateInsights(db, mode = 'free', godmode = false) {
  const { client, model } = getClient(mode);
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.insights;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt + '\n\n' + context },
      { role: 'user', content: 'Analyse les données et génère les insights critiques.' },
    ],
    max_tokens: 4096,
    temperature: 0.4,
  });

  const content = response.choices[0].message.content;
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch { return []; }
}

async function generatePredictions(db, mode = 'free', godmode = false) {
  const { client, model } = getClient(mode);
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.predictions;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt + '\n\n' + context },
      { role: 'user', content: 'Prédit les performances pour la fin du mois.' },
    ],
    max_tokens: 4096,
    temperature: 0.4,
  });

  const content = response.choices[0].message.content;
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch { return []; }
}

async function generateReport(db, mode = 'free', godmode = false) {
  const { client, model, provider } = getClient(mode);
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.report;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt + '\n\n' + context },
      { role: 'user', content: "Génère le rapport d'analyse commerciale complet." },
    ],
    max_tokens: 8192,
    temperature: 0.5,
  });

  return {
    content: response.choices[0].message.content,
    provider,
    model,
  };
}

module.exports = { chat, generateInsights, generatePredictions, generateReport, buildContext, buildGodModeContext, PROVIDERS };
