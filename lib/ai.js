// ========================================
// AI Service — via WebSearch Agent API
// ========================================

const http = require('http');
const { PROMPTS } = require('./ai-prompts');
const KNOWLEDGE = require('./ai-knowledge');

const WEBSEARCH_URL = process.env.WEBSEARCH_URL || 'http://127.0.0.1:4500';

// --- Call WebSearch Agent ---
function callWebSearch(message, threadId = null) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ message, thread_id: threadId });
    const url = new URL('/chat', WEBSEARCH_URL);

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 60000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error('Reponse invalide du serveur IA'));
        }
      });
    });

    req.on('error', (err) => reject(new Error('Serveur IA indisponible: ' + err.message)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout serveur IA (60s)')); });
    req.write(body);
    req.end();
  });
}

// --- Build IPCE Context ---
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
      COUNT(DISTINCT c.id) as collectes
    FROM users u LEFT JOIN collectes c ON c.user_id = u.id
    WHERE u.role = 'commercial' GROUP BY u.id
  `).all();

  const caMois = db.prepare(`SELECT COALESCE(SUM(ca), 0) as total FROM collectes WHERE statut IN ('validee','approuvee') AND created_at >= date('now','start of month')`).get();
  const totals = db.prepare(`SELECT SUM(CASE WHEN statut IN ('validee','approuvee') THEN ca ELSE 0 END) as ca, SUM(CASE WHEN statut IN ('validee','approuvee') THEN offres ELSE 0 END) as offres, SUM(CASE WHEN statut IN ('validee','approuvee') THEN bc ELSE 0 END) as bc FROM collectes`).get();
  const rdvTotal = db.prepare(`SELECT COUNT(*) as count FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.statut IN ('validee','approuvee')`).get();

  const settings = db.prepare("SELECT key, value FROM settings").all();
  const s = {};
  settings.forEach(x => { s[x.key] = x.value; });
  const objCA = parseInt(s.ca_objectif || 100000000);
  const objOffres = parseInt(s.offres_objectif || 6);
  const objBC = parseInt(s.bc_objectif || 6);
  const objRDV = parseInt(s.rdv_objectif || 6);

  const pctCA = Math.round((caMois.total / objCA) * 100);
  const convRdvOffre = rdvTotal.count > 0 ? Math.round((totals.offres / rdvTotal.count) * 100) : 0;
  const convOffreBc = totals.offres > 0 ? Math.round((totals.bc / totals.offres) * 100) : 0;
  const projectedCA = dayOfMonth > 0 ? Math.round((caMois.total / dayOfMonth) * daysInMonth) : 0;

  const sorted = [...perUser].sort((a, b) => b.ca - a.ca);
  const leader = sorted[0];
  const dernier = sorted[sorted.length - 1];

  return `\n[CONTEXTE IPCE — ${now.toLocaleDateString('fr-FR')}] Jour ${dayOfMonth}/${daysInMonth} (${monthProgress}%, ${daysRemaining}j restants)\nEquipe: ${users.length} commerciaux\n${perUser.map(u => `- ${u.nom}: CA ${u.ca.toLocaleString('fr-FR')} (${Math.round(u.ca/objCA*100)}% obj) | ${u.offres} offres | ${u.bc} BC`).join('\n')}\nCA mois: ${caMois.total.toLocaleString('fr-FR')}/${objCA.toLocaleString('fr-FR')} (${pctCA}%) | Offres: ${totals.offres}/${objOffres} | BC: ${totals.bc}/${objBC} | RDV: ${rdvTotal.count}/${objRDV}\nConversion: RDV→Offre ${convRdvOffre}% | Offre→BC ${convOffreBc}%\nProjection fin mois: ${projectedCA.toLocaleString('fr-FR')} FCFA\nLeader: ${leader ? leader.nom : 'N/A'} | Dernier: ${dernier ? dernier.nom : 'N/A'}\n[FIN CONTEXTE]\n`;
}

function buildGodModeContext(db) {
  const publicCtx = buildContext(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  const schema = tables.map(t => {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
    return `${t.name}: ${cols.map(c => c.name + '(' + c.type + ')').join(', ')}`;
  }).join('\n');
  const logs = db.prepare("SELECT u.nom, l.action, l.target, l.created_at FROM logs l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC LIMIT 15").all();

  return publicCtx + `\n[God Mode] Schema BDD:\n${schema}\n\nDerniers logs:\n${logs.map(l => `[${l.created_at}] ${l.nom||'system'}: ${l.action} → ${l.target||''}`).join('\n')}\n[Fin God Mode]\n`;
}

// --- Public API ---
// Detect if message needs IPCE context
function needsContext(message) {
  const keywords = ['ca', 'chiffre', 'affaires', 'commercial', 'offre', 'bc', 'bonne commande', 'rdv', 'rendez', 'prospect', 'collecte', 'performance', 'rapport', 'analyse', 'tendance', 'prevision', 'sante', 'conversion', 'objectif', 'bile', 'arth', 'catherin', 'equipe', 'dashboard', 'ipce', 'stat', 'methode', 'score', 'insight', 'alerte', 'recommand', 'compar', 'classement', 'leader', 'dernier', 'meilleur', 'worst', 'ka', 'ca.', 'ca ', 'ca:', 'ca=', 'ca,'];
  const lower = message.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

async function chat(message, history, db, godmode = false) {
  const useContext = needsContext(message) || godmode;
  const context = useContext ? (godmode ? buildGodModeContext(db) : buildContext(db)) : '';
  const fullMessage = context ? context + '\n\nUtilisateur: ' + message : message;

  const result = await callWebSearch(fullMessage);
  return {
    content: result.response || 'Pas de reponse',
    thread_id: result.thread_id,
    model: 'websearch_agent',
    provider: 'websearch',
  };
}

async function generateInsights(db, godmode = false) {
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const msg = context + '\n\nAnalyse les donnees et genere 3-5 insights critiques (alerts, opportunites, tendances). Pour chaque insight: type (alert/opportunity/trend/recommendation), titre court, message detaille, priorite (0-2). Reponds en JSON.';
  const result = await callWebSearch(msg);
  try {
    const jsonMatch = result.response.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch { return []; }
}

async function generatePredictions(db, godmode = false) {
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const msg = context + '\n\nPredis les performances fin de mois. Pour chaque metrique (CA, Offres, BC, RDV): valeur predite, confidence (high/medium/low), trend (up/down/stable), explication. Reponds en JSON.';
  const result = await callWebSearch(msg);
  try {
    const jsonMatch = result.response.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch { return []; }
}

async function generateReport(db, godmode = false) {
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const msg = context + '\n\nGenere un rapport d\'analyse commerciale complet: 1. Resume executif 2. Points forts 3. Points d\'attention 4. Recommandations (3 max) 5. Previsions fin de mois. Sois factuel avec les chiffres.';
  const result = await callWebSearch(msg);
  return { content: result.response || 'Pas de rapport', model: 'websearch_agent', provider: 'websearch' };
}

module.exports = { chat, generateInsights, generatePredictions, generateReport, buildContext, buildGodModeContext, callWebSearch };
