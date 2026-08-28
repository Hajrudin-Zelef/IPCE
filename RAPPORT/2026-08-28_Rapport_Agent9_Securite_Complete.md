# RAPPORT AGENT 9 — Sécurité Complète + Stabilité + Fonctionnalités

**Session :** opencode -s multiple sessions
**Tâche :** Audit sécurité complet, corrections P0-P2, optimisations, nouvelles fonctionnalités
**Date :** 27-28 Août 2026
**Heure début :** ~20h00
**Agent :** Agent 9 (opencode)
**Branche :** feat/new-logo
**Projet :** IPCE Dashboard — Pilotage Commercial

---

## 0. CONTEXTE DE LA SESSION

Au démarrage, l'app avait :
- Authentification basique sans 2FA
- Pas de rate-limit sur les endpoints sensibles
- XSS possible dans les affichages utilisateur
- Pas de compression HTTP
- Pas de graceful shutdown
- Fichiers PDF exportés très lourds (PNG scale:2)
- Pas de "Mot de passe oublié"

---

## 1. PLAN 12 — 9 CORRECTIFS SÉCURITÉ + BONUS

| # | Fix | Fichier | Impact |
|---|-----|---------|--------|
| 1 | Mots de passe uniques par commercial | `db/init.js` | Chaque commercial reçoit un MDP aléatoire unique |
| 2 | Supprimer fallback `change_me` | `routes/admin.js` | Plus de MDP par défaut en prod |
| 3 | Rate-limit godmode `/rahian` | `routes/ai.js` | 5 tentatives / 15 min par user |
| 4 | Rate-limit 2FA verify/disable | `routes/auth.js` | 5 tentatives / 15 min par user |
| 5 | TOTP timing-safe | `lib/totp.js` | `crypto.timingSafeEqual` au lieu de `.includes()` |
| 6 | HTML échappé dans emails | `email/mailer.js` | `escapeHtml()` sur commercialNom, zone, notes |
| 7 | Validation rôle dans PATCH /users/:id | `routes/admin.js` | Allowlist `admin`/`commercial` uniquement |
| 8 | Contexte God Mode anonymisé | `lib/ai.js` | Logs sans noms ni cibles, pas de schéma SQL |
| 9 | Insights routes admin-only | `routes/ai.js` | PATCH/DELETE insights avec check rôle |
| a | Accents statuts RDV | `routes/collectes.js` | `Prévu`/`Réalisé`/`BC Signé` alignés |
| b | Fichiers morts supprimés | `public/` | `admin.old.html`, `dashboard.old.html`, `.back` |

---

## 2. PLAN 13 — 8 CORRECTIFS SÉCURITÉ

| # | Fix | Fichier | Impact |
|---|-----|---------|--------|
| 1 | XSS stocké dans logs | `public/admin/js/logs.js` | `escapeHtml(l.details)` |
| 2 | God Mode timing-safe | `routes/ai.js` | `crypto.timingSafeEqual` sur les hashs |
| 3 | Rate-limit change-password | `server.js` | 5 tentatives / 15 min par IP |
| 4 | Rate-limit register | `server.js` | 10 créations / 15 min par IP |
| 5 | Validation priority reminders | `routes/admin.js` | Allowlist `low`/`medium`/`high` |
| 6 | Allowlist settings keys | `routes/admin.js` | 6 clés autorisées uniquement |
| 7 | Erreurs IA masquées côté client | `routes/ai.js` | Message générique au lieu de `err.message` |
| 8 | onclick → data-* event delegation | `public/admin/js/users.js` | Patterns XSS éliminés |

---

## 3. PLAN 15 — 13 FIX PERFORMANCE/STABILITÉ + LINUX

### Partie A — Bugs/failles

| # | Fix | Fichier | Impact |
|---|-----|---------|--------|
| A1 | Créer `data/` si manquant | `db/init.js` | `fs.mkdirSync` auto |
| A2 | SQLite pragmas | `db/init.js` | `busy_timeout=5s`, `synchronous=NORMAL`, `cache=16Mo` |
| A3 | 9 nouveaux index | `db/init.js` | `collectes`, `rdvs`, `logs`, `validation_history` |
| A4 | N+1 queries admin | `routes/admin.js` | Stats/export = 1 requête agrégée |
| A5 | N+1 query /collectes/by-date | `routes/collectes.js` | Batch fetch RDV |
| A6 | must_change_password dans JWT | `routes/auth.js` + `middleware/auth.js` | 0 SELECT/req |
| A7 | Transaction collecte+RDV | `routes/collectes.js` | Atomicité garantie |
| A8 | Validation entrée collecte | `routes/collectes.js` | Nombres positifs, zone/notes limités |
| A9 | Fichiers morts lib/ | `lib/` | `ai-knowledge.js`, `ai-prompts.js` supprimés |
| A10 | .env.example nettoyé | `.env.example` | `DEFAULT_PASSWORD` → commentaire |
| A11 | Graceful shutdown | `server.js` | `SIGTERM`/`SIGINT` → arrêt propre |
| A12 | Uncaught exception handler | `server.js` | `uncaughtException` + `unhandledRejection` |
| A13 | Compression HTTP | `server.js` | `compression` npm (gzip) |

### Partie B — Linux

| # | Fix | Détail |
|---|-----|--------|
| B1 | Systemd amélioré | `Restart=on-failure`, `CPUQuota=150%`, `MemoryMax=512M` |
| B6 | Endpoint purge-logs | `POST /api/admin/maintenance/purge-logs` |
| B7 | Health-check enrichi | DB ping + uptime + memory |
| B8 | .nvmrc | Node 22 LTS |

---

## 4. FONCTIONNALITÉS AJOUTÉES

### 4.1 Mot de passe oublié

| Étape | Action |
|-------|--------|
| 1 | Lien "Mot de passe oublié ?" sur la page de login |
| 2 | Saisie du nom → `POST /api/auth/forgot-password` |
| 3 | Token généré (valide 1h) → formulaire reset |
| 4 | Nouveau MDP (2x) → `POST /api/auth/reset-password` |
| 5 | Retour au login |

**Fichiers :** `routes/auth.js`, `public/index.html`, `db/init.js`

### 4.2 Compression PDF

| Avant | Après |
|-------|-------|
| `scale: 2`, `image/png` | `scale: 1.5`, `image/jpeg` 85% |

**Impact :** PDFs ~70-90% plus légers. **Fichiers :** `public/admin/js/export.js`, `public/admin/templates/assets/rapport-common.js`

### 4.3 Fix modal "change password" qui revenait

**Bug :** Le JWT émis au login avait `mustChangePassword: true`. Après changement, le middleware retournait 403 sur toutes les routes. Le frontend ne pouvait pas vérifier l'état réel.

**Fix :** Le middleware vérifie la DB si le JWT dit `mustChangePassword: true` :

```js
if (decoded.mustChangePassword) {
  const row = db.prepare('SELECT must_change_password FROM users WHERE id = ?').get(decoded.id);
  if (row && row.must_change_password === 0) return next();
}
```

---

## 5. NETTOYAGE ET CONFIG

| Action | Détail |
|--------|--------|
| Commentaires nettoyés | 22 commentaires évidents supprimés |
| Commentaires conservés | 4 pertinents (raccourcis clavier, URL hash, fallback IA) |
| Marexsoft Corporation | Watermark dans 91 fichiers (JS, HTML, CSS) |
| .nettoyé .gitignore | Ajout `*.log`, `coverage/`, `.agents/` |
| TAF/ supprimé du tracking | `git rm --cached` (4 fichiers) |
| playwright.config.js | Ajouté au .gitignore |
| Backup Mega | Archive 954 KB uploadée sur `/Root/BACKUP/` |
| AGENTS.md | 6 règles permanentes pour opencode |

---

## 6. VÉRIFICATIONS

| Test | Résultat |
|------|----------|
| `node --check` (tous fichiers serveur) | ✅ OK |
| `npm test` (34 tests unitaires) | ✅ 34/34 |
| `npx eslint` (fichiers serveur modifiés) | ✅ 0 erreur |
| Test forgot-password | ✅ Token → Reset → Login |
| Test change-password | ✅ Nouveau MDP fonctionne |
| Test modal fix | ✅ Plus de popup après refresh |
| Test CORS | ✅ 403 JSON (pas de 500 HTML) |
| Test 2FA E2E | ✅ Setup → Verify → Login 2FA → Disable |
| Service systemd restart | ✅ OK |
| Health-check | ✅ `{ status: 'ok', uptime: ..., memory: ... }` |

---

## 7. SÉCURITÉ — ÉTAT FINAL

### Corrigé

| Vulnérabilité | Sévérité | Fix |
|---------------|----------|-----|
| XSS stocké (logs, calendrier, users) | CRITICAL | `escapeHtml()` partout |
| CORS sans allowlist | HIGH | Pré-check middleware + 403 JSON |
| Pas de 2FA | HIGH | TOTP complet (setup/verify/disable) |
| Timing attack (God Mode, TOTP) | HIGH | `crypto.timingSafeEqual` |
| CSV injection | HIGH | `escCsv()` neutralise `= + - @` |
| Pas de rate-limit | HIGH | Login, change-password, register, 2FA, godmode |
| SQL injection | MEDIUM | Parameterized queries (déjà OK) |
| CSRF | MEDIUM | `sameSite:strict` sur cookie |
| Tokens non révoqués | MEDIUM | Deny-list jti (purge 10 min) |
| Erreurs IA exposées | MEDIUM | Message générique côté client |
| MDP par défaut partagés | MEDIUM | Génération aléatoire unique |
| Settings keys non validées | MEDIUM | Allowlist 6 clés |
| Priority reminders non validée | MEDIUM | Allowlist low/medium/high |

### Reste à faire (manuel)

| Action | Urgence |
|--------|---------|
| Rotation `JWT_SECRET` | CRITIQUE |
| Rotation `ADMIN_SECRET` | HAUTE |
| Rotation clés API (OpenRouter, Groq, Nvidia, DeepSeek) | MOYENNE |
| Décider pour `/docs` (accessible à tous ?) | FAIBLE |

---

## 8. COMMITS

| Hash | Message |
|------|---------|
| `5138a12` | fix(auth): middleware checks DB if JWT is stale after password change |
| `a3a2db8` | feat(auth): add forgot password flow |
| `66fb0cf` | chore: add AGENTS.md — persistent rules |
| `22175af` | chore: gitignore cleanup |
| `1219eda` | chore: add playwright + test-results to gitignore |
| `4b7cc2a` | chore: Marexsoft watermark CSS/templates |
| `0fcd401` | chore: Marexsoft watermark JS/HTML |
| `f817cf9` | fix(security): remove hardcoded admin123 |
| `0ca313c` | fix(security): Plan 13 — 8 correctifs |
| `1614f4d` | fix(pdf): compress PDF exports JPEG 85% |
| `225a140` | fix(perf,stability): Plan 15 — 13 fixes |
| `81d3562` | fix(ui): remove always-visible export button |
| `cea2f6a` | fix(security): PASSWORD_FREE_PATHS relative paths |
| `4cfb004` | fix(security): force password change on first login |
| `8d51701` | fix(security): user creation trim + double-click |
| `f27d001` | fix(security): Plan 12 — 9 correctifs + bonus |
| `dab6bfa` | docs: update README |
| `ccab115` | fix(security): XSS, CORS, auth rewrite, 2FA |

---

## 9. MÉTRIQUES

| Métrique | Valeur |
|----------|--------|
| Fichiers modifiés | 53 |
| Lignes ajoutées | 1 200+ |
| Lignes supprimées | 500+ |
| Tests unitaires | 34/34 ✅ |
| Vulnérabilités corrigées | 15+ |
| Nouvelles fonctionnalités | 3 (forgot-password, compression PDF, health-check) |
| Backup créé | 954 KB sur Mega |

---

**Rapport généré le 28 Août 2026 à 11h35**
**Agent 9 — Marexsoft Corporation**
