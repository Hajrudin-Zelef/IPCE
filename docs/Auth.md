# Documentation du Système d'Authentification — IPCE Dashboard

---

## 1. Vue d'ensemble du système d'authentification

L'application IPCE Dashboard utilise un système d'authentification basé sur les **JWT (JSON Web Tokens)** avec des cookies **httpOnly** pour sécuriser les sessions utilisateur.

| Composant | Technologie |
|---|---|
| Token | JWT signé avec `JWT_SECRET` |
| Transport | Cookie httpOnly + header `Authorization` |
| Hachage des mots de passe | Bcrypt (12 rounds de salt) |
| Durée de vie du token | 8 heures |
| Rôles | `admin`, `commercial` |
| Changement de mot de passe | Obligatoire au premier login (`must_change_password`) |

---

## 2. Processus de connexion

### Étapes du flux de connexion

```
┌──────────────┐    POST /api/auth/login    ┌──────────────┐
│              │  ─────────────────────────▶ │              │
│    Client    │                            │    Serveur   │
│              │  ◀───────────────────────── │              │
└──────────────┘                            └──────────────┘
       │                                            │
       │  1. L'utilisateur saisit son nom           │
       │     et son mot de passe                    │
       │──────────────────────────────────────────▶ │
       │                                            │
       │              2. Le serveur vérifie les      │
       │                 identifiants via bcrypt     │
       │                 (hash du mot de passe)     │
       │                                            │
       │  3. Si valide → JWT généré avec            │
       │     { id, nom, role }                      │
       │                                            │
       │  4. Token défini comme cookie httpOnly     │
       │     (maxAge: 8h)                           │
       │◀─────────────────────────────────────────── │
       │                                            │
       │  5. Le client vérifie le rôle et            │
       │     redirige vers le dashboard approprié    │
       │──────────────────────────────────────────▶ │
```

### Flux détaillé côté serveur

1. **Réception de la requête** — `POST /api/auth/login` avec `{ nom, password }`
2. **Recherche de l'utilisateur** — Requête à la base de données par `nom`
3. **Vérification du mot de passe** — Comparaison bcrypt du mot de passe saisi avec le hash stocké
4. **Génération du JWT** — Création du token avec les claims `{ id, nom, role }`
5. **Envoi du cookie** — Le token est défini dans un cookie httpOnly
6. **Réponse au client** — Retour des informations utilisateur (sans le token dans le body)

### Vérification du changement de mot de passe

Si le champ `must_change_password` est `true` pour l'utilisateur, le client redirige vers la page de changement de mot de passe après la connexion.

---

## 3. Structure du JWT Token

### Payload du token

```json
{
  "id": 1,
  "nom": "admin",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700028800
}
```

### Champs

| Champ | Type | Description |
|---|---|---|
| `id` | `number` | Identifiant unique de l'utilisateur dans la base de données |
| `nom` | `string` | Nom d'utilisateur (login) |
| `role` | `string` | Rôle de l'utilisateur : `admin` ou `commercial` |
| `iat` | `number` | Date de création du token (*issued at*) — timestamp Unix |
| `exp` | `number` | Date d'expiration du token (*expiration time*) — timestamp Unix |

### Signature

Le token est signé avec l'algorithme `HS256` (HMAC-SHA256) en utilisant la variable d'environnement `JWT_SECRET`.

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```

> **Sécurité** : La clé `JWT_SECRET` doit être définie dans le fichier `.env` et ne jamais être exposée ou commitée dans le dépôt.

---

## 4. Middleware d'authentification

### Middleware `authenticate`

Ce middleware intercepte chaque requête protégée et vérifie la validité du token.

```
┌─────────────────────────────────────────────────┐
│              Requête entrante                    │
│         (header ou cookie)                      │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Y a-t-il un token ?  │
        │  - Header Bearer ?    │
        │  - Cookie token ?     │
        └───────────┬───────────┘
                    │
           ┌────────┴────────┐
           │ Non             │ Oui
           ▼                 ▼
     ┌──────────┐   ┌──────────────────┐
     │ Réponse  │   │ Vérification JWT │
     │ 401      │   │ avec JWT_SECRET  │
     └──────────┘   └────────┬─────────┘
                             │
                    ┌────────┴────────┐
                    │ Valide          │ Invalide/Expiré
                    ▼                 ▼
           ┌────────────────┐   ┌──────────┐
           │ req.user =     │   │ Réponse  │
           │ decoded token  │   │ 401      │
           │ Passe au       │   └──────────┘
           │ middleware      │
           │ suivant        │
           └────────────────┘
```

**Comportement :**

1. Recherche d'un token dans l'en-tête `Authorization` (format `Bearer <token>`)
2. Si absent, recherche dans les cookies (`req.cookies.token`)
3. Si aucun token trouvé → réponse **401 Unauthorized**
4. Vérification de la signature et de l'expiration avec `jwt.verify(token, JWT_SECRET)`
5. Si valide : le token décodé est attaché à `req.user`
6. Si invalide ou expiré : réponse **401 Unauthorized**

### Middleware `requireRole`

Ce middleware dépend de `authenticate` et contrôle l'accès basé sur le rôle.

```
┌─────────────────────────────────────────┐
│  Requête (après authenticate)           │
│  req.user disponible                    │
└───────────────────┬─────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │  req.user.role match      │
        │  le rôle requis ?         │
        └───────────┬───────────────┘
                    │
           ┌────────┴────────┐
           │ Non             │ Oui
           ▼                 ▼
     ┌──────────┐   ┌──────────────┐
     │ Réponse  │   │ Passe au     │
     │ 403      │   │ middleware    │
     │ Forbidden│   │ suivant      │
     └──────────┘   └──────────────┘
```

**Utilisation :**

```javascript
// Exemple : seule l'admin peut accéder à cette route
router.get('/admin/stats', authenticate, requireRole('admin'), getStats);

// Exemple : seul le commercial peut créer des collectes
router.post('/collectes', authenticate, requireRole('commercial'), createCollecte);
```

---

## 5. Gestion des mots de passe

### Hachage avec Bcrypt

Les mots de passe sont hachés avec **bcrypt** en utilisant **12 rounds de salt**.

```
Mot de passe brut ("monMotDePasse123")
        │
        ▼
┌───────────────────────────────────┐
│  Génération d'un salt (12 rounds) │
│  $2b$12$randomSaltValueHere...    │
└───────────────────┬───────────────┘
                    │
                    ▼
┌───────────────────────────────────┐
│  Hachage : bcrypt.hash(mot, salt) │
│  Résultat : $2b$12$xyz...abc...  │
└───────────────────┬───────────────┘
                    │
                    ▼
┌───────────────────────────────────┐
│  Stockage dans la base de données │
│  (jamais en clair)                │
└───────────────────────────────────┘
```

### Flux de changement de mot de passe

L'utilisateur authentifié peut modifier son mot de passe via `PATCH /api/auth/change-password`.

```
┌─────────────────────────────────────────────┐
│  Utilisateur saisit :                       │
│  - Mot de passe actuel                      │
│  - Nouveau mot de passe                     │
│  - Confirmation du nouveau mot de passe     │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Vérification du      │
        │  mot de passe actuel  │
        │  (bcrypt.compare)     │
        └───────────┬───────────┘
                    │
           ┌────────┴────────┐
           │ Incorrect       │ Correct
           ▼                 ▼
     ┌──────────┐   ┌────────────────────┐
     │ Erreur   │   │ Validation du      │
     │ 400      │   │ nouveau mot de     │
     └──────────┘   │ passe :            │
                    │ - Min 8 caractères │
                    │ - Différent de     │
                    │   l'ancien         │
                    │ - Confirm = nouveau│
                    └────────┬───────────┘
                             │
                    ┌────────┴────────┐
                    │ Non valide      │ Valide
                    ▼                 ▼
              ┌──────────┐   ┌─────────────────┐
              │ Erreur   │   │ Mise à jour du  │
              │ 400      │   │ hash en BDD     │
              └──────────┘   │ must_change_    │
                             │ password = false│
                             └─────────────────┘
```

**Règles de validation du nouveau mot de passe :**

| Règle | Description |
|---|---|
| Longueur minimale | 8 caractères minimum |
| Différent de l'ancien | Le nouveau mot de passe ne peut pas être identique à l'actuel |
| Confirmation | Le champ confirmation doit correspondre au nouveau mot de passe |

### Mot de passe de première connexion (`must_change_password`)

- Lors de la création d'un compte, le champ `must_change_password` est défini à `true`
- À la connexion, si ce champ est `true`, le client redirige vers la page de changement de mot de passe
- Une fois le mot de passe modifié, le champ passe à `false`

### Réinitialisation par l'administrateur

L'administrateur peut réinitialiser le mot de passe de n'importe quel utilisateur :

```
PATCH /api/admin/users/:id
Body: { password: "nouveauMotDePasse123" }
```

Le mot de passe est haché avant stockage. Le champ `must_change_password` est remis à `true`.

---

## 6. Rôles et permissions

### Tableau des permissions

| Action | Admin | Commercial |
|---|:---:|:---:|
| Voir le dashboard admin | ✓ | ✗ |
| Voir le dashboard commercial | ✗ | ✓ |
| Créer une collecte | ✗ | ✓ |
| Valider une collecte (soumettre) | ✗ | ✓ |
| Approuver / Rejeter une collecte | ✓ | ✗ |
| Gérer les utilisateurs | ✓ | ✗ |
| Voir les statistiques globales | ✓ | ✗ |
| Modifier un RDV (brouillon) | ✗ | ✓ |
| Voir les RDV (validés/approuvés) | ✓ | ✗ |

### Description des rôles

#### `admin`

- Accès complet à la gestion des utilisateurs (CRUD)
- Approbation ou rejet des collectes soumises par les commerciaux
- Visualisation des statistiques globales
- Consultation des rendez-vous validés et approuvés
- Accès au dashboard administrateur

#### `commercial`

- Création et modification des collectes
- Soumission des collectes pour approbation
- Gestion des rendez-vous en mode brouillon
- Accès au dashboard commercial dédié

### Protection des routes

Chaque route protégée utilise une combinaison de middleware :

```javascript
// Route accessible uniquement aux admins
router.get('/admin/users', authenticate, requireRole('admin'), getAllUsers);

// Route accessible uniquement aux commerciaux
router.post('/collectes', authenticate, requireRole('commercial'), createCollecte);

// Route accessible aux deux rôles
router.get('/profile', authenticate, getProfile);
```

---

## 7. Rate Limiting

### Configuration

L'endpoint de connexion est protégé par un **rate limiting** pour prévenir les attaques par force brute.

| Paramètre | Valeur |
|---|---|
| Endpoint protégé | `POST /api/auth/login` |
| Nombre maximum de tentatives | 10 |
| Fenêtre de temps | 15 minutes |
| Méthode de stockage | `Map` en mémoire (par adresse IP) |
| Code de réponse | `429 Too Many Requests` |

### Fonctionnement

```
┌──────────────────────────────────────────────┐
│  Requête POST /api/auth/login                │
│  IP source : 192.168.1.100                   │
└───────────────────┬──────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │  Vérification dans le Map │
        │  loginAttempts.get(ip)    │
        └───────────┬───────────────┘
                    │
           ┌────────┴────────┐
           │ ≥ 10 tentatives │ < 10 tentatives
           │ dans les 15 min │
           ▼                 ▼
     ┌──────────┐   ┌──────────────────┐
     │ Réponse  │   │ Traitement de    │
     │ 429      │   │ la connexion     │
     │ Retry    │   │                  │
     │ after Xs │   │ Si échec :       │
     └──────────┘   │ compteur + 1     │
                    │ Si succès :      │
                    │ compteur reset   │
                    └──────────────────┘
```

**Important** : Le rate limiting est implémenté en mémoire (`Map`). Les compteurs sont réinitialisés lors du redémarrage du serveur. En production, envisager un stockage partagé (Redis) pour les environnements multi-instances.

---

## 8. Sécurité des cookies

### Paramètres du cookie de session

| Propriété | Valeur | Description |
|---|---|---|
| `httpOnly` | `true` | Le cookie n'est pas accessible via JavaScript (`document.cookie`) |
| `secure` | `true` | Le cookie n'est envoyé que via HTTPS (en production) |
| `sameSite` | `'strict'` | Protège contre les attaques CSRF |
| `maxAge` | `8 * 60 * 60 * 1000` | Durée de vie de 8 heures en millisecondes |
| `path` | `'/'` | Le cookie est disponible pour toutes les routes |

### Code de définition

```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000, // 8 heures
  path: '/',
});
```

### Justification des choix de sécurité

- **httpOnly** : Empêche les attaques XSS d'accéder au token via le DOM
- **secure** : Empêche l'envoi du token en clair sur un réseau non sécurisé
- **sameSite: 'strict'** : Empêche les requêtes cross-origin d'inclure le cookie (protection CSRF)
- **maxAge court** : Limite la fenêtre d'exploitation en cas de vol de token

---

## 9. Inscriptions et gestion des utilisateurs

### Création de compte

Seul l'administrateur peut créer de nouveaux comptes utilisateur.

```
POST /api/auth/register
Headers: Authorization: Bearer <admin_token>
Body: {
  "nom": "nouveau_commercial",
  "password": "MotDePasse123",
  "role": "commercial"
}
```

**Contraintes :**

| Règle | Description |
|---|---|
| Authentification requise | Le requérant doit être authentifié |
| Rôle admin requis | Seul un admin peut créer des utilisateurs |
| Nom unique | Le nom d'utilisateur ne doit pas déjà exister |
| Mot de passe minimum | 8 caractères minimum |
| Rôle valide | `admin` ou `commercial` uniquement |

### Utilisateurs par défaut

À la première exécution du serveur, des utilisateurs par défaut sont créés si la base de données est vide :

| Nom | Mot de passe | Rôle |
|---|---|---|
| admin | (défini dans la config) | admin |
| commercial1 | (défini dans la config) | commercial |

> **Note** : Les mots de passe par défaut doivent être changés au premier login grâce au mécanisme `must_change_password`.

### Suppression d'utilisateurs

```
DELETE /api/admin/users/:id
Headers: Authorization: Bearer <admin_token>
```

- L'admin ne peut pas supprimer son propre compte
- Seuls les comptes non-admin peuvent être supprimés par un admin

### Réinitialisation de mot de passe par l'admin

```
PATCH /api/admin/users/:id
Headers: Authorization: Bearer <admin_token>
Body: { "password": "NouveauMotDePasse123" }
```

Le mot de passe est haché et le flag `must_change_password` est remis à `true`.

---

## 10. Déconnexion

### Processus de déconnexion

```
┌──────────────────────┐   POST /api/auth/logout   ┌──────────────┐
│                      │ ─────────────────────────▶ │              │
│       Client         │                            │    Serveur   │
│                      │ ◀───────────────────────── │              │
└──────────────────────┘                            └──────────────┘
       │                                                    │
       │  1. Requête de déconnexion envoyée                  │
       │───────────────────────────────────────────────────▶ │
       │                                                    │
       │              2. Le serveur supprime le cookie       │
       │                 token avec expiration immédiate     │
       │                                                    │
       │  3. Réponse 200 OK                                 │
       │◀──────────────────────────────────────────────────── │
       │                                                    │
       │  4. Redirection client vers /login                 │
       │───────────────────────────────────────────────────▶ │
```

**Côté serveur :**

```javascript
// POST /api/auth/logout
res.clearCookie('token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
});
res.status(200).json({ message: 'Déconnexion réussie' });
```

**Côté client :**

Après réception de la réponse 200, le client :
1. Vide le state utilisateur (Vue/React store)
2. Redirige vers la page `/login`
3. Supprime toute donnée de session en cache local

---

## Annexes

### Résumé des endpoints d'authentification

| Méthode | Endpoint | Description | Authentification | Rôle |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Connexion | Non | Public |
| `POST` | `/api/auth/logout` | Déconnexion | Oui | Tout rôle |
| `POST` | `/api/auth/register` | Création de compte | Oui | Admin |
| `PATCH` | `/api/auth/change-password` | Changement de mot de passe | Oui | Tout rôle |
| `PATCH` | `/api/admin/users/:id` | Réinitialisation de mot de passe | Oui | Admin |
| `DELETE` | `/api/admin/users/:id` | Suppression d'utilisateur | Oui | Admin |

### Codes de réponse HTTP

| Code | Signification | Usage dans l'auth |
|---|---|---|
| `200` | OK | Connexion réussie, déconnexion |
| `400` | Bad Request | Données invalides, mot de passe trop court |
| `401` | Unauthorized | Token manquant, invalide ou expiré |
| `403` | Forbidden | Token valide mais rôle insuffisant |
| `404` | Not Found | Utilisateur introuvable |
| `409` | Conflict | Nom d'utilisateur déjà pris |
| `429` | Too Many Requests | Trop de tentatives de connexion |

### Variables d'environnement requises

| Variable | Description | Exemple |
|---|---|---|
| `JWT_SECRET` | Clé secrète pour la signature JWT | `your-256-bit-secret-key-here` |
| `NODE_ENV` | Environnement (`development` / `production`) | `production` |

> **IMPORTANT** : Ne jamais commiter `JWT_SECRET` dans le dépôt Git. Utiliser un fichier `.env` (ajouté au `.gitignore`).
