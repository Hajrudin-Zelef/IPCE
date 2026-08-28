# TAF — Travaux Assignés

## Plan 18 — Chatbot Guide IPCE + Bouton Plus

**Date** : 2026-08-28
**Branche** : feat/new-logo
**Statut** : ✅ Terminé (v2 — RAG-lite sélectif)

### Objectif
Transformer le chatbot IA en guide ultra-précis de l'application IPCE. Ajouter un bouton "plus" avec : fichier joint, thinking, recherche web. L'IA ne révèle jamais le backend sauf en God Mode.

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `lib/ai.js` | Ajouter `APP_GUIDE`, `callSearch()`, `extractFileContent()`, réécrire `chat()` |
| `routes/ai.js` | Ajouter multer, modifier POST `/chat` pour multipart |
| `public/admin/js/ai-chat.js` | Ajouter bouton `+`, menu popover, toggles, zone fichier |
| `public/admin/css/ai-chat.css` | Styles menu `+`, badges, zone fichier |
| `package.json` | Ajouter `multer` + `pdf-parse` |

### Étapes

1. Installer multer + pdf-parse
2. Créer APP_GUIDE dans lib/ai.js (~90 lignes)
3. Ajouter callSearch() dans lib/ai.js
4. Ajouter extractFileContent() dans lib/ai.js
5. Réécrire chat() avec guardrails + APP_GUIDE + options (thinking, websearch, file)
6. Modifier routes/ai.js : multer + route /chat multipart
7. Modifier ai-chat.js : bouton +, menu, toggles, fichier
8. Modifier ai-chat.css : styles
9. Validation : node --check + npm ls

### Détails techniques

- `/search` endpoint : GET `http://127.0.0.1:4500/search?q=...` → retourne sources (url, title, snippet)
- `/chat` endpoint : POST `http://127.0.0.1:4500/chat` → already used
- Multer : memoryStorage, limite 5MB
- pdf-parse : extraction texte depuis PDF
- Thinking mode : prefixe [MODE THINKING] dans le contexte
- Web search : appel callSearch() + résultats injectés dans le contexte
- Fichier : extraction texte + injecté dans le contexte

### Résultat

✅ Toutes les étapes terminées et validées :
- `node --check lib/ai.js` → OK
- `node --check routes/ai.js` → OK
- `npm test` → 36/36 tests passent
- Budget : 281 chars / 400 (119 marge)
- Websearch_agent → fallback Groq direct quand instable
- Guide sélectif : 1 section max par score, pas de guide en godmode
- Aucun tag [] dans le prompt (conflit websearch_agent)
- Backend redémarré et testé : salut, valide, CA → tous répondent
