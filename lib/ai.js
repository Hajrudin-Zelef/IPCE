const OpenAI = require('openai');
const { PROMPTS, NORMAL_PROMPT, GODMODE_PROMPT } = require('./ai-prompts');
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

// --- Public context (Normal Mode) ---
function buildContext(db) {
  const users = db.prepare("SELECT id, nom FROM users WHERE role = 'commercial'").all();
  const stats = db.prepare(`
    SELECT u.nom,
      SUM(CASE WHEN c.statut IN ('validee','approuvee') THEN c.ca ELSE 0 END) as ca,
      SUM(CASE WHEN c.statut IN ('validee','approuvee') THEN c.offres ELSE 0 END) as offres,
      SUM(CASE WHEN c.statut IN ('validee','approuvee') THEN c.bc ELSE 0 END) as bc,
      COUNT(DISTINCT c.id) as collectes
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

  const rdvCount = db.prepare(`SELECT COUNT(*) as count FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee')`).get();
  const rdvMontant = db.prepare(`SELECT SUM(r.montant) as total FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee')`).get();
  const settings = db.prepare("SELECT key, value FROM settings").all();
  const settingsMap = {};
  settings.forEach(s => { settingsMap[s.key] = s.value; });
  const pending = db.prepare("SELECT COUNT(*) as count FROM collectes WHERE statut = 'validee'").get();

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

  const evolution = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
      SUM(CASE WHEN statut IN ('validee','approuvee') THEN ca ELSE 0 END) as ca,
      COUNT(DISTINCT id) as collectes
    FROM collectes WHERE created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month ASC
  `).all();

  const convRdvOffre = rdvCount.count > 0 ? Math.round((totals.offres / rdvCount.count) * 100) : 0;
  const convOffreBc = totals.offres > 0 ? Math.round((totals.bc / totals.offres) * 100) : 0;
  const projectedCA = dayOfMonth > 0 ? Math.round((totals.ca / dayOfMonth) * daysInMonth) : 0;

  return `
CONTEXTE IPCE Dashboard — ${now.toLocaleDateString('fr-FR')}
═══════════════════════════════════════════

ÉQUIPE (${users.length} commerciaux)
${stats.map(s => `- ${s.nom}: CA ${s.ca.toLocaleString('fr-FR')} FCFA | ${s.offres} offres | ${s.bc} BC | ${s.collectes} collectes`).join('\n')}

RÉSUMÉ GLOBAL
- CA total: ${totals.ca.toLocaleString('fr-FR')} FCFA (objectif: ${parseInt(settingsMap.ca_objectif || 100000000).toLocaleString('fr-FR')})
- Offres: ${totals.offres} (objectif: ${settingsMap.offres_objectif || 6})
- BC signés: ${totals.bc} (objectif: ${settingsMap.bc_objectif || 6})
- RDV total: ${rdvCount.count}
- Montant total RDV: ${(rdvMontant.total || 0).toLocaleString('fr-FR')} FCFA
- Collectes en attente: ${pending.count}

TAUX DE CONVERSION
- RDV → Offre: ${convRdvOffre}%
- Offre → BC: ${convOffreBc}%

ÉVOLUTION (6 derniers mois)
${evolution.map(e => `- ${e.month}: CA ${e.ca.toLocaleString('fr-FR')} | ${e.collectes} collectes`).join('\n') || 'Aucune donnée'}

PRÉVISIONS
- Progression mois: ${monthProgress}% (jour ${dayOfMonth}/${daysInMonth})
- CA projeté fin de mois: ${projectedCA.toLocaleString('fr-FR')} FCFA

PARAMÈTRES
- Objectif CA: ${parseInt(settingsMap.ca_objectif || 100000000).toLocaleString('fr-FR')} FCFA/mois
- Objectif RDV: ${settingsMap.rdv_objectif || 6}/mois
`;
}

// --- Full backend context (God Mode) ---
function buildGodModeContext(db) {
  const publicCtx = buildContext(db);

  // DB Schema
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const schema = tables.map(t => {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
    return `${t.name}:\n${cols.map(c => `  - ${c.name} (${c.type}${c.notnull ? ' NOT NULL' : ''}${c.pk ? ' PK' : ''}${c.dflt_value ? ' DEFAULT ' + c.dflt_value : ''})`).join('\n')}`;
  }).join('\n\n');

  // All users
  const allUsers = db.prepare("SELECT id, nom, role, must_change_password, two_factor_enabled FROM users").all();

  // Logs
  const recentLogs = db.prepare("SELECT action, target, details, created_at FROM logs ORDER BY created_at DESC LIMIT 20").all();

  // Validation history
  const validationHistory = db.prepare("SELECT action, details, created_at FROM validation_history ORDER BY created_at DESC LIMIT 10").all();

  // Notifications stats
  const notifStats = db.prepare("SELECT type, COUNT(*) as count FROM notifications GROUP BY type").all();

  // AI insights
  const insightStats = db.prepare("SELECT type, COUNT(*) as count FROM ai_insights GROUP BY type").all();

  // File structure
  const projectRoot = path.join(__dirname, '..');
  const fileList = [];
  const walk = (dir, prefix = '') => {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item === 'node_modules' || item === '.git' || item === 'data' || item === 'test-results') continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walk(full, prefix + item + '/');
        } else {
          fileList.push(prefix + item);
        }
      }
    } catch {}
  };
  walk(projectRoot);

  // Server config
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

  return `${publicCtx}

═══════════════════════════════════════════════
🔓 GOD MODE — ACCÈS TECHNIQUE COMPLET
═══════════════════════════════════════════════

SCHEMA BASE DE DONNÉES (SQLite)
${schema}

UTILISATEURS (${allUsers.length})
${allUsers.map(u => `- [${u.id}] ${u.nom} (${u.role}) | mdp_change: ${u.must_change_password} | 2FA: ${u.two_factor_enabled ? 'oui' : 'non'}`).join('\n')}

DERNIERS LOGS (${recentLogs.length})
${recentLogs.map(l => `- [${l.created_at}] ${l.action} → ${l.target} | ${l.details || ''}`).join('\n')}

HISTORIQUE VALIDATIONS (${validationHistory.length})
${validationHistory.map(v => `- ${v.action} | ${v.details || ''} | ${v.created_at}`).join('\n')}

NOTIFICATIONS PAR TYPE
${notifStats.map(n => `- ${n.type}: ${n.count}`).join('\n') || 'Aucune'}

INSIGHTS IA PAR TYPE
${insightStats.map(i => `- ${i.type}: ${i.count}`).join('\n') || 'Aucun'}

ARCHITECTURE
- Stack: Node.js ${process.version} + Express 4 + SQLite (better-sqlite3)
- Auth: JWT httpOnly cookies (8h), bcrypt 12 rounds
- Frontend: Vanilla JS/CSS, pas de framework
- WebSocket: ws (notifications temps réel)
- IA: OpenAI SDK (Groq/OpenRouter/DeepSeek)
- Port: ${process.env.PORT || 4600}

DÉPENDANCES (package.json v${pkg.version})
Production: ${Object.keys(pkg.dependencies || {}).join(', ')}
Dev: ${Object.keys(pkg.devDependencies || {}).join(', ')}

FICHIERS DU PROJET (${fileList.length})
${fileList.join('\n')}

ENV VARIABLES (noms seulement, jamais les valeurs)
${Object.keys(process.env).filter(k => ['PORT', 'NODE_ENV', 'JWT_SECRET', 'ADMIN_PASSWORD', 'DEFAULT_PASSWORD', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'GODMODE_PASSWORD', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'ADMIN_EMAIL', 'AI_MODE'].includes(k)).map(k => `- ${k}: [DÉFINI]`).join('\n')}
`;
}

// --- Chat ---
async function chat(message, history, db, mode = 'free', godmode = false) {
  const { client, model, provider } = getClient(mode);
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? PROMPTS.chat_godmode : PROMPTS.chat;

  const messages = [
    { role: 'system', content: prompt + '\n\n' + context },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const response = await client.chat.completions.create({ model, messages, max_tokens: godmode ? 2048 : 1024, temperature: 0.7 });
  return { content: response.choices[0].message.content, provider, model, usage: response.usage };
}

async function generateInsights(db, mode = 'free', godmode = false) {
  const { client, model } = getClient(mode);
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? PROMPTS.insights_godmode : PROMPTS.insights;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt + '\n\n' + context },
      { role: 'user', content: 'Analyse les données et génère les insights.' },
    ],
    max_tokens: 2048, temperature: 0.5,
  });

  const content = response.choices[0].message.content;
  try { const m = content.match(/\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : []; } catch { return []; }
}

async function generatePredictions(db, mode = 'free', godmode = false) {
  const { client, model } = getClient(mode);
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? GODMODE_PROMPT : NORMAL_PROMPT;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt + '\n\n' + context },
      { role: 'user', content: 'Prédit les performances pour la fin du mois.' },
    ],
    max_tokens: 2048, temperature: 0.5,
  });

  const content = response.choices[0].message.content;
  try { const m = content.match(/\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : []; } catch { return []; }
}

async function generateReport(db, mode = 'free', godmode = false) {
  const { client, model, provider } = getClient(mode);
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const prompt = godmode ? GODMODE_PROMPT : NORMAL_PROMPT;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt + '\n\n' + context },
      { role: 'user', content: "Génère le rapport d'analyse commerciale complet." },
    ],
    max_tokens: 4096, temperature: 0.6,
  });

  return { content: response.choices[0].message.content, provider, model };
}

module.exports = { chat, generateInsights, generatePredictions, generateReport, buildContext, buildGodModeContext, PROVIDERS };
