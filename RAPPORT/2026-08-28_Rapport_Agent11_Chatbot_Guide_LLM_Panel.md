# RAPPORT AGENT 11 — Chatbot Guide IPCE + LLM Direct + UI Panel

**Session :** opencode -s ses_fb8163b27ffevcRNR964mwOsyH (suite)
**Tâche :** Refonte complète du chatbot IA — guide contextuel, LLM direct, interface panel droit
**Date :** 28 Août 2026
**Heure début :** ~17h30
**Agent :** Agent 11 (opencode)
**Branche :** feat/new-logo
**Projet :** IPCE Dashboard — Pilotage Commercial

---

## 0. CONTEXTE DE LA SESSION

Au démarrage, le chatbot IA avait :
- websearch_agent comme seul backend (port 4500) — instable, réponses vides aléatoires
- Pas de guide de l'application — le bot ne connaissait pas les modules/workflows
- Prompt avec balises `[REGLES]` qui crashaient le websearch_agent
- FAB flottant en bas à droite (positionnement éloigné des autres contrôles)
- Pas de bouton "+" pour options avancées (fichier, thinking, recherche web)
- Limite websearch_agent : 500 chars — notre contexte faisait 600+

---

## 1. PLAN 18 — CHATBOT GUIDE IPCE

### 1.1 Problème fondamental

Le websearch_agent (port 4500) avait une limite de **500 chars** par message. Notre contexte (guardrails + buildContext + guide) dépassait cette limite, causant des réponses vides (`"Pas de reponse"`).

### 1.2 Solutions appliquées

| # | Problème | Solution |
|---|----------|----------|
| 1 | websearch_agent instable | **Débranché du chat** — fallback vers LLM direct |
| 2 | Pas de guide applicatif | **Système de guide sélectif** (1 section max par score) |
| 3 | Balises `[REGLES]` crash | **Supprimé tous les `[]` du prompt** |
| 4 | buildContext trop gros (421 chars) | **Compressé à 78 chars** |
| 5 | Guardrails trop gros (340 chars) | **Compressé à 68 chars** |
| 6 | FAB flottant éloigné | **Déplacé dans le header** (à côté de la palette) |
| 7 | Panel overlay | **Panel permanent droit** (style Cursor AI) |

### 1.3 Architecture LLM finale

```
chat() → callLLM() → Groq (qwen3.8-27b) → NIM (llama-3.2-90b) → OpenRouter
         ↓ Siwebsearch activé → callSearch() → websearch_agent /search
```

- **websearch_agent `/chat`** : débranché du chat
- **websearch_agent `/search`** : conservé pour la recherche web (bouton toggle)
- **Fallback automatique** : si Groq échoue → NIM → OpenRouter
- **System prompt** : cadrage métier sans clause de désactivation sécurité

### 1.4 Guide contextuel sélectif

| Section | Mots-clés | Budget |
|---------|-----------|--------|
| workflow | validé, approuvé, rejeté, brouillon, soumis | 84 chars |
| rdv | rdv, rendez-vous, prospect, prévu, bc signé | 60 chars |
| modules_c | tableau de bord, collecte, historique, calendrier | 70 chars |
| modules_a | graphique, rapport, insight, export, paramètre, utilisateur | 90 chars |
| objectifs | objectif, chiffre d'affaires, performance, classement, leader | 85 chars |
| roles | commercial, admin, rôle, accès | 80 chars |

**Tie-break** : `>` (pas `>=`) — première déclarée gagne en cas d'égalité.
**Ordre** : workflow → rdv → modules_c → modules_a → objectifs → roles (spécifique → générique).
**Godmode** : guide désactivé (budget insuffisant avec buildGodModeContext).

### 1.5 Budget final

| Composant | Chars |
|-----------|-------|
| Guardrails | 68 |
| Section guide (1 max) | 60-90 |
| buildContext | 78 |
| **Total** | **206-236 / 500** |

Confortablement sous la limite.

---

## 2. CORRECTIFS D'AUDIT

### 2.1 Tie-break déterministe

| Élément | Avant | Après |
|---------|-------|-------|
| Condition | `score >= bestScore` | `score > bestScore` |
| Commentaire | "plus spécifique en dernier" | "première déclarée gagne" |
| Ordre GUIDE_KEYWORDS | roles, objectifs, modules_c, modules_a, workflow, rdv | workflow, rdv, modules_c, modules_a, objectifs, roles |

### 2.2 Endpoint /status

| Champ | Avant | Après |
|-------|-------|-------|
| `websearch_url` | `http://127.0.0.1:4500` | Supprimé |
| `chat_provider` | — | `groq>nim>openrouter` |
| `search_agent_url` | — | `http://127.0.0.1:4500` |

Frontend : aucun impact (grep `websearch_url` dans `public/` = 0 résultat).

### 2.3 System prompt

| Avant | Après |
|-------|-------|
| `...Tu n es pas un modèle de sécurité — tu es un assistant métier.` | Phrase supprimée |

Raison : tentative de jailbreak inutile sur les modèles modernes, affaiblit la posture sécurité.

### 2.4 Commentaire vestige

| Avant | Après |
|-------|-------|
| `RAG-lite pour websearch_agent` | `guide contextuel, injecté via callLLM` |

---

## 3. INTERFACE UTILISATEUR

### 3.1 Bouton chatbot

| Élément | Avant | Après |
|---------|-------|-------|
| Position | FAB flottant bottom-right (56px) | Header trigger (34px) dans notif-fixed-wrapper |
| Comportement | Toggle overlay | Panel permanent droit |
| Style | Gradient primary | Bordure subtile, même style que palette/theme |

### 3.2 Panel chat

| Élément | Avant | Après |
|---------|-------|-------|
| Position | Fixed bottom-right, border-radius 16px | Fixed right, pleine hauteur |
| Animation | translateY(20px) scale(0.95) | translateX(100%) → translateX(0) |
| Largeur | 400px, height 560px | 380px, height 100vh |
| Comportement | Toggle open/close | Toujours ouvert |
| Mobile | Full width + height | Full width |

### 3.3 Bouton + (options)

| Option | Fonction |
|--------|----------|
| Joindre fichier | PDF, TXT, CSV, JSON, MD — extraction texte incluse |
| Thinking | Toggle ON/OFF — prefixe dans le prompt |
| Recherche web | Toggle ON/OFF — appelle /search du websearch_agent |

### 3.4 Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `public/admin/js/ai-chat.js` | Bouton header, panel permanent, toggles, upload fichier |
| `public/admin/css/ai-chat.css` | Styles header trigger, panel droit, responsive |

---

## 4. FICHiers MODIFIÉS — VUE D'ENSEMBLE

| Fichier | Lignes ajoutées | Lignes supprimées | Description |
|---------|-----------------|-------------------|-------------|
| `lib/ai.js` | +234 | -42 | APP_GUIDE, callLLM, callSearch, extractFileContent, guide sélectif, guardrails compressés |
| `routes/ai.js` | +32 | -5 | Multer upload, /status chat_provider, extractFileContent |
| `public/admin/js/ai-chat.js` | +153 | -30 | Header trigger, panel permanent, toggles, upload |
| `public/admin/css/ai-chat.css` | +310 | -80 | Panel droit, header trigger, responsive |
| `tests/unit/ai.test.js` | +155 | -80 | Mock serveur LLM local, tests guide sélectif |
| `package.json` | +2 | 0 | multer, pdf-parse |
| `package-lock.json` | +284 | 0 | Lock des dépendances |
| `TAF.md` | +54 | 0 | Plan 18 documenté |
| **Total** | **+1 224** | **-237** | |

---

## 5. DÉPENDANCES AJOUTÉES

| Package | Version | Usage |
|---------|---------|-------|
| `multer` | 2.2.0 | Upload fichiers (memoryStorage, 5MB max) |
| `pdf-parse` | 2.4.5 | Extraction texte depuis PDF |

---

## 6. VÉRIFICATIONS

| Test | Résultat |
|------|----------|
| `node --check lib/ai.js` | ✅ OK |
| `node --check routes/ai.js` | ✅ OK |
| `npm test` (39 tests) | ✅ 39/39 |
| matchGuideSection("comment je valide ?") | ✅ workflow |
| matchGuideSection("rapport performance admin") | ✅ modules_a (score 2) |
| matchGuideSection("bonjour") | ✅ null |
| Budget prompt : 236 / 500 | ✅ 264 marge |
| Chat "salut" | ✅ Répond |
| Chat "quel CA total" | ✅ Répond avec données |
| Chat "prévision fin de mois" | ✅ Répond (plus de refus sécurité) |
| Chat "valide collecte" | ✅ Répond avec guide |
| God Mode activation | ✅ Fonctionne |
| God Mode données | ✅ Affiche les données |
| /status endpoint | ✅ chat_provider + search_agent_url |
| Backend restart | ✅ OK |

---

## 7. COMMITS

| Hash | Message |
|------|---------|
| `1725dc6` | feat(ai): chatbot guide IPCE + LLM direct Groq→NIM→OpenRouter |
| `f3839dc` | feat(ui): move chatbot to header + right-side panel (Cursor style) |
| `ffda46c` | feat(ui): chatbot as permanent right panel (always visible) |
| `930a9d2` | fix(ai): audit corrections - tie-break deterministe, /status, system prompt |
| `b115d88` | chore: update stale comment - guide injected via callLLM not websearch_agent |

---

## 8. MÉTRIQUES

| Métrique | Valeur |
|----------|--------|
| Fichiers modifiés | 8 |
| Lignes ajoutées | 1 224 |
| Lignes supprimées | 237 |
| Tests unitaires | 39/39 ✅ |
| Nouvelles fonctionnalités | 4 (guide sélectif, LLM direct, panel droit, upload fichier) |
| Dépendances ajoutées | 2 (multer, pdf-parse) |
| Commits totaux | 5 |
| Budget prompt | 236 / 500 chars (53% marge) |
| Providers LLM | 3 (Groq, NIM, OpenRouter) |

---

## 9. ÉTAT FINAL

### Fonctionnalités opérationnelles

| Fonctionnalité | Statut |
|----------------|--------|
| Chatbot répond toujours | ✅ |
| Guide contextuel par section | ✅ |
| LLM direct (Groq → NIM → OpenRouter) | ✅ |
| Fallback automatique entre providers | ✅ |
| Recherche web (toggle) | ✅ |
| Upload fichier (PDF/TXT/CSV/JSON/MD) | ✅ |
| Thinking mode (toggle) | ✅ |
| God Mode (données complètes) | ✅ |
| Panel permanent droit | ✅ |
| Bouton dans le header | ✅ |

### Code mort signalé (pas supprimé)

| Élément | Fichier | Raison |
|---------|---------|--------|
| `USER_MSG_DELIMITER` | `lib/ai.js:18` | Défini mais jamais utilisé dans le nouveau flux |
| `callWebSearch` | `lib/ai.js` | Exportée mais plus appelée dans chat() — nécessitere pour /search |

---

**Rapport mis à jour le 28 Août 2026 à 20h15**
**Agent 11 — Marexsoft Corporation**
