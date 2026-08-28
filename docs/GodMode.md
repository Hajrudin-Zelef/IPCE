# God Mode — Documentation

## Qu'est-ce que God Mode ?

God Mode est une fonctionnalité cachée de l'assistant IA qui donne accès au contexte complet du système, y compris les logs d'audit.

## Activation

1. Ouvrir le chat IA dans le panneau admin
2. Taper `/rahian` dans le champ de message
3. Entrer le mot de passe God Mode (configuré via `GODMODE_PASSWORD` dans `.env`)
4. La session dure 30 minutes

## Désactivation

- Taper `/deactivate` dans le chat IA
- La session expire automatiquement après 30 minutes

## Ce que God Mode expose

| Élément | Normal | God Mode |
|---------|--------|----------|
| Données commerciales | ✅ | ✅ |
| CA, offres, BC, RDV | ✅ | ✅ |
| Logs d'audit (15 dernières actions) | ❌ | ✅ |

## Sécurité

| Mécanisme | Détail |
|-----------|--------|
| Authentification requise | Oui —必须 être connecté en tant qu'admin |
| Rate limiting | 5 tentatives max par 15 minutes |
| Expiration | 30 minutes |
| Timing-safe comparison | Oui — `crypto.timingSafeEqual` |
| Logging | Toutes les activations/désactivations sont logguées en base |

## Avertissement

⚠️ **God Mode envoie les logs d'audit à l'agent IA externe** (WebSearch Agent). Ces données transitent par l'API externe. Ne pas activer God Mode si vous ne souhaitez pas exposer les actions récentes des utilisateurs à un service tiers.

## Configuration

```env
# .env
GODMODE_PASSWORD=votre_mot_de_passe_secret
```

## Code source

| Fichier | Rôle |
|---------|------|
| `routes/ai.js` (lignes 89-131) | Activation/désactivation/vérification |
| `lib/ai.js` (lignes 112-117) | `buildGodModeContext()` — construit le contexte étendu |

---

*Marexsoft Corporation — IPCE Dashboard*
