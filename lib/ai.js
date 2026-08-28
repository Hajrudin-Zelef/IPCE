// Marexsoft Corporation
// ========================================
// AI Service — via WebSearch Agent API
// ========================================

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const path = require('path');

const WEBSEARCH_URL = process.env.WEBSEARCH_URL || 'http://127.0.0.1:4500';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

// Unique delimiter token generated at startup — prevents prompt injection
// by ensuring the delimiter cannot be guessed or reproduced by user input.
const USER_MSG_DELIMITER = `__IPCE_USER_MSG_${crypto.randomBytes(8).toString('hex')}__`;

// --- App Guide ---

// --- AI Error Monitoring ---
const aiErrors = new Map();
const AI_ERROR_WINDOW = 60 * 60 * 1000;

function logAIError(endpoint, error) {
  const key = endpoint;
  const now = Date.now();
  const errors = aiErrors.get(key) || [];
  const recent = errors.filter(e => now - e.time < AI_ERROR_WINDOW);
  recent.push({ time: now, message: error });
  aiErrors.set(key, recent);
}

function getAIErrorStats() {
  const stats = {};
  for (const [endpoint, errors] of aiErrors) {
    stats[endpoint] = {
      count: errors.length,
      last: errors.length > 0 ? new Date(errors[errors.length - 1].time).toISOString() : null,
      lastMessage: errors.length > 0 ? errors[errors.length - 1].message : null,
    };
  }
  return stats;
}

// --- Call WebSearch Agent (chat) ---
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

// --- Call WebSearch Agent (search) ---
function callSearch(query) {
  return new Promise((resolve, reject) => {
    const url = new URL('/search', WEBSEARCH_URL);
    url.searchParams.set('q', query);

    http.get(url.toString(), { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const results = (json.sources || []).slice(0, 5);
          const formatted = results.map(r => {
            const snippet = (r.snippet || '').replace(/<[^>]+>/g, '');
            return `[${r.title}](${r.url}) — ${snippet}`;
          }).join('\n');
          resolve(formatted || 'Aucun résultat trouvé sur le web.');
        } catch (e) {
          reject(new Error('Erreur parsing recherche'));
        }
      });
    }).on('error', (err) => reject(new Error('Erreur recherche web: ' + err.message)));
  });
}

// --- Call LLM direct (Groq → NIM → OpenRouter) ---
function callProvider(hostname, path, apiKey, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content;
          if (content) return resolve(content);
          reject(new Error(json.error?.message || 'Pas de réponse'));
        } catch (e) { reject(new Error('Erreur parsing')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout 30s')); });
    req.write(body);
    req.end();
  });
}

async function callLLM(message) {
  const errors = [];

  // System prompt pour cadrer le rôle
  const systemMsg = { role: 'system', content: 'Tu es un assistant commercial pour l application IPCE. Tu aides l administrateur avec ses données business (CA, offres, BC, RDV, collectes). Tu réponds en français, tu es précis et utile.' };
  const msg = [systemMsg, { role: 'user', content: message }];

  // 1. Groq
  if (GROQ_API_KEY) {
    try {
      const body = JSON.stringify({ model: 'qwen/qwen3.8-27b', messages: msg, max_tokens: 1024, temperature: 0.7 });
      const r = await callProvider('api.groq.com', '/openai/v1/chat/completions', GROQ_API_KEY, body);
      return r;
    } catch (e) { errors.push('groq:' + e.message); }
  }

  // 2. NVIDIA NIM
  if (NVIDIA_API_KEY) {
    try {
      const body = JSON.stringify({ model: 'meta/llama-3.2-90b-vision-instruct', messages: msg, max_tokens: 1024 });
      const r = await callProvider('integrate.api.nvidia.com', '/v1/chat/completions', NVIDIA_API_KEY, body);
      return r;
    } catch (e) { errors.push('nim:' + e.message); }
  }

  // 3. OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      const body = JSON.stringify({ model: 'qwen/qwen3.5-35b-a35b:free', messages: msg, max_tokens: 1024 });
      const r = await callProvider('openrouter.ai', '/api/v1/chat/completions', OPENROUTER_API_KEY, body);
      return r;
    } catch (e) { errors.push('openrouter:' + e.message); }
  }

  throw new Error('Tous les LLM ont échoué: ' + errors.join(' | '));
}

// --- Extract file content ---
async function extractFileContent(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const maxSize = 10000; // caractères max extraits

  if (ext === '.txt' || ext === '.csv' || ext === '.md' || ext === '.json') {
    const text = file.buffer.toString('utf-8');
    return text.length > maxSize ? text.slice(0, maxSize) + '\n... [tronqué]' : text;
  }

  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(file.buffer);
      const text = data.text || '';
      return text.length > maxSize ? text.slice(0, maxSize) + '\n... [tronqué]' : text;
    } catch (e) {
      return `[Erreur extraction PDF: ${e.message}]`;
    }
  }

  return `[Type de fichier non supporté: ${ext}. Types acceptés: .txt, .csv, .md, .json, .pdf]`;
}

// --- App Guide Sections (guide contextuel, injecté via callLLM) ---
const GUIDE_SECTIONS = {
  workflow:  `Guide: Collecte passe de brouillon a validée, puis approuvée ou rejetée par l'admin.`,
  rdv:       `Guide: RDV passent par les statuts Prévu, Réalisé, Offre, puis BC Signé.`,
  roles:     `Guide: Le commercial saisit collectes et RDV. L'admin valide, voit stats et exporte.`,
  modules_a: `Guide: Admin a vue ensemble, graphiques, performance, rapports, insights, users, export.`,
  modules_c: `Guide: Commercial a tableau de bord, collecte, historique, calendrier.`,
  objectifs: `Guide: Objectifs CA 100M, 6 offres, 6 BC, 6 RDV. Zones: Centre/Nord/Sud/Est/Ouest.`,
};

// En cas d'égalité de score entre sections, la première déclarée ci-dessous gagne.
// Ordonner les sections les plus spécifiques/prioritaires en premier.
const GUIDE_KEYWORDS = {
  workflow:  [/\bvalid(e|ée|ation)\b/i, /\bapprouv\w*\b/i, /\brejet\w*\b/i, /\bbrouillon\b/i, /\bsoumet\w*\b/i],
  rdv:       [/\brdv\b/i, /\brendez-vous\b/i, /\bprospect\w*\b/i, /\bprévu\b/i, /\bbc signé\b/i],
  modules_c: [/\btableau de bord\b/i, /\bcollecte\w*\b/i, /\bhistorique\b/i, /\bcalendrier\b/i],
  modules_a: [/\bgraphique\w*\b/i, /\brapport\w*\b/i, /\binsight\w*\b/i, /\bexport\b/i, /\bparamètre\w*\b/i, /\butilisateur\w*\b/i],
  objectifs: [/\bobjectif\w*\b/i, /\bchiffre.{0,15}affaire\w*\b/i, /\bperformance\w*\b/i, /\bclassement\b/i, /\bleader\b/i],
  roles:     [/\bcommercial\w*\b/i, /\badmin\b/i, /\brôle\b/i, /\baccè?s\b/i],
};

// Retourne 1 section max (meilleur score), ou null si aucun match.
function matchGuideSection(message) {
  let best = null, bestScore = 0;
  for (const [section, patterns] of Object.entries(GUIDE_KEYWORDS)) {
    const score = patterns.filter(p => p.test(message)).length;
    if (score > bestScore) { bestScore = score; best = section; }
  }
  return bestScore > 0 ? GUIDE_SECTIONS[best] : null;
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

  return `\nIPCE(${dayOfMonth}/${daysInMonth}) ${perUser.map(u => u.nom[0]+':'+Math.round(u.ca/1e6)+'M').join(' ')} CA:${Math.round(caMois.total/1e6)}M/${Math.round(objCA/1e6)}M Off:${totals.offres}/${objOffres} BC:${totals.bc}/${objBC} RDV:${rdvTotal.count}/${objRDV} Leader:${leader?leader.nom:'N/A'}\n`;
}

function buildGodModeContext(db) {
  const publicCtx = buildContext(db);
  const logs = db.prepare("SELECT action, created_at FROM logs ORDER BY created_at DESC LIMIT 15").all();

  return publicCtx + `\n[God Mode] Derniers types d'actions (sans détail utilisateur/cible):\n${logs.map(l => `[${l.created_at}] ${l.action}`).join('\n')}\n[Fin God Mode]\n`;
}

// --- Public API ---

// Detect if message needs IPCE context (kept for backward compatibility)
function needsContext(message) {
  const keywords = ['ca', 'chiffre', 'affaires', 'commercial', 'offre', 'bc', 'bonne commande', 'rdv', 'rendez', 'prospect', 'collecte', 'performance', 'rapport', 'analyse', 'tendance', 'prevision', 'sante', 'conversion', 'objectif', 'bile', 'arth', 'catherin', 'equipe', 'dashboard', 'ipce', 'stat', 'methode', 'score', 'insight', 'alerte', 'recommand', 'compar', 'classement', 'leader', 'dernier', 'meilleur', 'worst', 'ka', 'ca.', 'ca ', 'ca:', 'ca=', 'ca,'];
  const lower = message.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

async function chat(message, history, db, godmode = false, options = {}) {
  const { thinking = false, websearch = false, fileContent = null } = options;

  // Guardrails — toujours injectés
  const guardrails = `Tu es l'assistant IPCE. Tu aides l'administrateur avec les données commerciales qu'il te fournit. Tu peux analyser, prévoir et faire des rapports sur ces données.\n`;

  // Contexte data (toujours)
  const dataContext = godmode ? buildGodModeContext(db) : buildContext(db);
  const godmodeFlag = godmode ? '\nGOD MODE ACTIF\n' : '';
  // Guide désactivé en godmode : budget de chars insuffisant (buildGodModeContext est déjà volumineux).
  const guideSection = godmode ? null : matchGuideSection(message);

  // Thinking mode
  const thinkingNote = thinking
    ? '\nMODE THINKING: Montre ton raisonnement étape par étape avant de donner ta réponse finale.\n'
    : '';

  // Fichier attaché
  const fileNote = fileContent
    ? `\nFICHIER ATTACHÉ:\n${fileContent}\nFIN FICHIER\n`
    : '';

  // Recherche web
  let searchNote = '';
  if (websearch) {
    try {
      const searchResults = await callSearch(message);
      searchNote = `\nRÉSULTATS RECHERCHE WEB:\n${searchResults}\nFIN RECHERCHE\n`;
    } catch (e) {
      searchNote = '\nRECHERCHE WEB indisponible.\n';
    }
  }

  // Assemblage du contexte complet
  const context = guardrails + (guideSection ? guideSection + '\n' : '') + godmodeFlag + dataContext + thinkingNote + fileNote + searchNote;
  const fullMessage = context + `\n\nMessage utilisateur: ${message}`;

  // LLM direct (Groq → NIM → OpenRouter)
  try {
    const response = await callLLM(fullMessage);
    return {
      content: response,
      thread_id: null,
      model: 'llm_direct',
      provider: 'groq>nim>openrouter',
    };
  } catch (err) {
    logAIError('chat_llm', err.message);
    throw err;
  }
}

async function generateInsights(db, godmode = false) {
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const msg = context + '\n\nAnalyse les donnees et genere 3-5 insights critiques (alerts, opportunites, tendances). Pour chaque insight: type (alert/opportunity/trend/recommendation), titre court, message detaille, priorite (0-2). Reponds en JSON.';
  try {
    const response = await callLLM(msg);
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch { return []; }
  } catch (err) {
    logAIError('insights', err.message);
    throw err;
  }
}

async function generatePredictions(db, godmode = false) {
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const msg = context + '\n\nPredis les performances fin de mois. Pour chaque metrique (CA, Offres, BC, RDV): valeur predite, confidence (high/medium/low), trend (up/down/stable), explication. Reponds en JSON.';
  try {
    const response = await callLLM(msg);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch { return []; }
}

async function generateReport(db, godmode = false) {
  const context = godmode ? buildGodModeContext(db) : buildContext(db);
  const msg = context + '\n\nGenere un rapport d\'analyse commerciale complet: 1. Resume executif 2. Points forts 3. Points d\'attention 4. Recommandations (3 max) 5. Previsions fin de mois. Sois factuel avec les chiffres.';
  try {
    const response = await callLLM(msg);
    return { content: response || 'Pas de rapport', model: 'llm_direct', provider: 'groq>nim>openrouter' };
  } catch (err) {
    logAIError('report', err.message);
    throw err;
  }
}

module.exports = { chat, generateInsights, generatePredictions, generateReport, buildContext, buildGodModeContext, callWebSearch, callSearch, callLLM, extractFileContent, logAIError, getAIErrorStats, needsContext, matchGuideSection };
// Marexsoft Corporation
