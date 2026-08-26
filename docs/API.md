# IPCE Dashboard — Documentation API

Base URL : `/api`

- Stack : Express.js + SQLite (better-sqlite3)
- Format des réponses : JSON (sauf export xlsx/csv)
- Authentification : JWT en cookie httpOnly (8h) ou header `Authorization: Bearer <token>`
- Rôles : `admin`, `commercial`

---

## Table des matières

1. [Authentification](#authentification)
2. [Rate Limiting](#rate-limiting)
3. [Auth Routes `/api/auth`](#auth-routes)
4. [Collectes Routes `/api/collectes`](#collectes-routes)
5. [Admin Routes `/api/admin`](#admin-routes)
6. [Notifications](#notifications)
7. [Health Check](#health-check)
8. [Modèle de données](#modèle-de-données)

---

## Authentification

### Schéma

Le serveur émet un cookie `token` (httpOnly, SameSite=Strict) contenant un JWT signé. Le token peut également être envoyé via le header `Authorization: Bearer <token>`.

### Claims du JWT

| Champ  | Description              |
| ------ | ------------------------ |
| `id`   | ID de l'utilisateur      |
| `nom`  | Nom de l'utilisateur     |
| `role` | `admin` ou `commercial`  |

### Durée de vie

Le token expire après **8 heures**.

### Cookies

| Nom     | Type   | HttpOnly | SameSite | Max-Age  |
| ------- | ------ | -------- | -------- | -------- |
| `token` | string | true     | Strict   | 28800 s  |

---

## Rate Limiting

L'endpoint `POST /api/auth/login` est limité à **10 tentatives par tranche de 15 minutes** par adresse IP. Le dépassement renvoie un `429 Too Many Requests`.

---

## Auth Routes

### POST `/api/auth/login`

Connexion avec identifiants. Renvoie le token JWT en cookie.

**Body**

```json
{
  "nom": "string",
  "password": "string"
}
```

**Réponse `200`**

```json
{
  "user": {
    "id": 1,
    "nom": "Jean Dupont",
    "role": "commercial",
    "must_change_password": false
  }
}
```

**Erreurs**

| Code | Description                   |
| ---- | ----------------------------- |
| 400  | Champs manquants (`nom`, `password`) |
| 401  | Identifiants incorrects       |
| 429  | Trop de tentatives            |

---

### POST `/api/auth/change-password`

Change le mot de passe de l'utilisateur courant. Nécessite une session valide.

**Authentification** : Requise (cookie ou Bearer token).

**Body**

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Contraintes**

- `newPassword` doit faire au minimum **8 caractères**
- `newPassword` doit être différent du mot de passe actuel

**Réponse `200`**

```json
{
  "message": "Mot de passe modifié avec succès"
}
```

**Erreurs**

| Code | Description                        |
| ---- | ---------------------------------- |
| 400  | Champs manquants ou mots de passe identiques |
| 401  | Mot de passe actuel incorrect      |

---

### POST `/api/auth/register`

Crée un nouvel utilisateur. Réservé aux administrateurs.

**Authentification** : Requise — rôle `admin`.

**Body**

```json
{
  "nom": "string",
  "password": "string",
  "role": "commercial"
}
```

| Champ      | Requis | Valeur par défaut | Description                          |
| ---------- | ------ | ----------------- | ------------------------------------ |
| `nom`      | Oui    | —                 | Nom unique de l'utilisateur          |
| `password` | Oui    | —                 | Mot de passe en clair                |
| `role`     | Non    | `commercial`      | `admin` ou `commercial`              |

**Réponse `201`**

```json
{
  "id": 2,
  "nom": "Marie Martin",
  "role": "commercial"
}
```

**Erreurs**

| Code | Description              |
| ---- | ------------------------ |
| 409  | Un utilisateur avec ce nom existe déjà |

---

### GET `/api/auth/me`

Retourne les informations de l'utilisateur connecté.

**Authentification** : Requise.

**Réponse `200`**

```json
{
  "user": {
    "id": 1,
    "nom": "Jean Dupont",
    "role": "commercial",
    "must_change_password": false
  }
}
```

---

### POST `/api/auth/logout`

Supprime le cookie de session.

**Réponse `200`**

```json
{
  "message": "Déconnecté"
}
```

---

## Collectes Routes

Une **collecte** regroupe les données commerciales d'un utilisateur (CA, offres, BC) et les rendez-vous associés. Une collecte passe par le cycle de vie suivant :

```
brouillon → validée (soumise) → approuvée ou rejetée
```

---

### GET `/api/collectes/`

Retourne les collectes de l'utilisateur courant, avec les RDVs intégrés.

**Authentification** : Requise (tous rôles).

**Réponse `200`**

```json
[
  {
    "id": 1,
    "user_id": 1,
    "ca": 15000,
    "offres": 5,
    "bc": 2,
    "created_at": "2026-08-25T10:00:00.000Z",
    "statut": "brouillon",
    "rdvs": [
      {
        "id": 10,
        "prospect": "Entreprise ABC",
        "date": "2026-08-26",
        "montant": 5000,
        "statut": "Prevu"
      }
    ]
  }
]
```

---

### GET `/api/collectes/all`

Retourne **toutes** les collectes de tous les utilisateurs, avec le nom du commercial.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
[
  {
    "id": 1,
    "user_id": 1,
    "ca": 15000,
    "offres": 5,
    "bc": 2,
    "created_at": "2026-08-25T10:00:00.000Z",
    "statut": "validee",
    "commercial": "Jean Dupont",
    "rdvs": [...]
  }
]
```

---

### POST `/api/collectes/`

Crée une nouvelle collecte avec ses RDVs.

**Authentification** : Requise — rôle `commercial`.

**Body**

```json
{
  "ca": 15000,
  "offres": 5,
  "bc": 2,
  "rdvs": [
    {
      "prospect": "Entreprise ABC",
      "date": "2026-08-26",
      "montant": 5000,
      "statut": "Prevu"
    }
  ]
}
```

| Champ   | Requis | Type       | Description                                      |
| ------- | ------ | ---------- | ------------------------------------------------ |
| `ca`    | Non    | `number`   | Chiffre d'affaires (défaut : 0)                  |
| `offres`| Non    | `number`   | Nombre d'offres (défaut : 0)                     |
| `bc`    | Non    | `number`   | Nombre de bons de commande (défaut : 0)          |
| `rdvs`  | Non    | `array`    | Liste des rendez-vous à associer                 |

**Valeurs autorisées pour `rdvs[].statut`** : `Prevu`, `Realise`, `Offre`, `BC Signe`

**Réponse `201`**

```json
{
  "id": 12,
  "message": "Collecte créée"
}
```

---

### PUT `/api/collectes/:id`

Modifie une collecte existante. Uniquement possible si la collecte est en statut `brouillon` et appartient à l'utilisateur courant.

**Authentification** : Requise — propriétaire de la collecte.

**Body** : Même schéma que `POST /api/collectes/`.

**Réponse `200`**

```json
{
  "message": "Collecte mise à jour"
}
```

**Erreurs**

| Code | Description                                           |
| ---- | ----------------------------------------------------- |
| 403  | La collecte n'appartient pas à l'utilisateur          |
| 404  | Collecte introuvable                                   |
| 400  | La collecte n'est plus en brouillon                   |

---

### DELETE `/api/collectes/:id`

Supprime une collecte. Uniquement possible si la collecte est en statut `brouillon` et appartient à l'utilisateur courant.

**Authentification** : Requise — propriétaire de la collecte.

**Réponse `200`**

```json
{
  "message": "Collecte supprimée"
}
```

**Erreurs**

| Code | Description                                           |
| ---- | ----------------------------------------------------- |
| 403  | La collecte n'appartient pas à l'utilisateur          |
| 404  | Collecte introuvable                                   |
| 400  | La collecte n'est plus en brouillon                   |

---

### PATCH `/api/collectes/:id/validate`

Soumet une collecte pour validation admin (passe le statut de `brouillon` à `validee`). Déclenche l'envoi d'un e-mail à l'administrateur et des notifications in-app.

**Authentification** : Requise — propriétaire de la collecte.

**Réponse `200`**

```json
{
  "message": "Collecte soumise pour validation"
}
```

**Effets secondaires**

- Envoi d'e-mail à l'administrateur
- Création de notifications in-app pour les admins

---

### GET `/api/collectes/rdvs`

Retourne les RDVs de l'utilisateur courant avec des filtres de date optionnels.

**Authentification** : Requise.

**Paramètres de requête**

| Paramètre | Type     | Obligatoire | Format       | Description                    |
| --------- | -------- | ----------- | ------------ | ------------------------------ |
| `from`    | `string` | Non         | `YYYY-MM-DD` | Date de début (inclus)         |
| `to`      | `string` | Non         | `YYYY-MM-DD` | Date de fin (inclus)           |

**Réponse `200`**

```json
[
  {
    "id": 10,
    "prospect": "Entreprise ABC",
    "date": "2026-08-26",
    "montant": 5000,
    "statut": "Realise",
    "collecte_id": 1,
    "collecte_statut": "brouillon"
  }
]
```

---

### PATCH `/api/collectes/rdvs/:id`

Met à jour le statut d'un RDV. Uniquement possible si le RDV appartient à une collecte en `brouillon` de l'utilisateur courant.

**Authentification** : Requise — propriétaire de la collecte parente.

**Body**

```json
{
  "statut": "Realise"
}
```

**Valeurs autorisées pour `statut`**

| Valeur     | Description               |
| ---------- | ------------------------- |
| `Prevu`    | RDV planifié              |
| `Realise`  | RDV effectué              |
| `Offre`    | Offre envoyée             |
| `BC Signe` | Bon de commande signé     |

**Réponse `200`**

```json
{
  "message": "RDV mis à jour"
}
```

**Erreurs**

| Code | Description                                       |
| ---- | ------------------------------------------------- |
| 403  | RDV n'appartient pas à l'utilisateur              |
| 404  | RDV introuvable                                    |
| 400  | La collecte parente n'est plus en brouillon       |

---

### DELETE `/api/collectes/rdvs/:id`

Supprime un RDV. Uniquement possible si le RDV appartient à une collecte en `brouillon` de l'utilisateur courant.

**Authentification** : Requise — propriétaire de la collecte parente.

**Réponse `200`**

```json
{
  "message": "RDV supprimé"
}
```

---

## Admin Routes

Toutes les routes `/api/admin` nécessitent le rôle `admin`, sauf indication contraire.

---

### GET `/api/admin/stats`

Statistiques agrégées par commercial et totaux globaux.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
{
  "users": [
    {
      "id": 1,
      "nom": "Jean Dupont",
      "role": "commercial",
      "ca": 150000,
      "offres": 45,
      "bc": 12,
      "rdvCount": 38
    }
  ],
  "totals": {
    "ca": 500000,
    "offres": 120,
    "bc": 35,
    "rdvCount": 95
  }
}
```

---

### GET `/api/admin/evolution`

Données d'évolution mensuelles.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
[
  {
    "month": "2026-01",
    "ca": 45000,
    "offres": 12,
    "bc": 3,
    "collectes": 8
  },
  {
    "month": "2026-02",
    "ca": 52000,
    "offres": 15,
    "bc": 4,
    "collectes": 10
  }
]
```

---

### GET `/api/admin/pending`

Collectes en attente de validation (statut `validee`).

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
[
  {
    "id": 12,
    "user_id": 1,
    "ca": 15000,
    "offres": 5,
    "bc": 2,
    "created_at": "2026-08-25T10:00:00.000Z",
    "statut": "validee",
    "commercial": "Jean Dupont",
    "rdvs": [
      {
        "id": 10,
        "prospect": "Entreprise ABC",
        "date": "2026-08-26",
        "montant": 5000,
        "statut": "Realise"
      }
    ]
  }
]
```

---

### PATCH `/api/admin/:id/approve`

Approuve une collecte (passe le statut de `validee` à `approuvee`). Enregistre l'action dans l'historique.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
{
  "message": "Collecte approuvée"
}
```

**Effets secondaires**

- Écriture dans `validation_history`
- Notifications in-app au commercial propriétaire

---

### PATCH `/api/admin/:id/reject`

Rejette une collecte (passe le statut de `validee` à `rejetee`). Enregistre l'action dans l'historique.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
{
  "message": "Collecte rejetée"
}
```

---

### GET `/api/admin/rdvs`

Tous les RDVs des collectes validées ou approuvées, avec filtres optionnels.

**Authentification** : Requise — rôle `admin`.

**Paramètres de requête**

| Paramètre   | Type     | Obligatoire | Description                       |
| ----------- | -------- | ----------- | --------------------------------- |
| `commercial`| `string` | Non         | Filtrer par nom du commercial     |
| `statut`    | `string` | Non         | Filtrer par statut RDV             |
| `from`      | `string` | Non         | Date de début (`YYYY-MM-DD`)      |
| `to`        | `string` | Non         | Date de fin (`YYYY-MM-DD`)        |

**Réponse `200`**

```json
[
  {
    "id": 10,
    "prospect": "Entreprise ABC",
    "date": "2026-08-26",
    "montant": 5000,
    "statut": "Realise",
    "commercial": "Jean Dupont",
    "collecte_id": 1
  }
]
```

---

### GET `/api/admin/users`

Liste de tous les utilisateurs.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
[
  {
    "id": 1,
    "nom": "Jean Dupont",
    "role": "commercial",
    "must_change_password": false
  }
]
```

---

### DELETE `/api/admin/users/:id`

Supprime un utilisateur. Impossible de supprimer un administrateur.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
{
  "message": "Utilisateur supprimé"
}
```

**Erreurs**

| Code | Description                                      |
| ---- | ------------------------------------------------ |
| 400  | Tentative de suppression d'un administrateur     |
| 404  | Utilisateur introuvable                           |

---

### PATCH `/api/admin/users/:id`

Met à jour le rôle ou réinitialise le mot de passe d'un utilisateur.

**Authentification** : Requise — rôle `admin`.

**Body**

```json
{
  "role": "admin",
  "reset_password": true
}
```

| Champ            | Requis | Type      | Description                                    |
| ---------------- | ------ | --------- | ---------------------------------------------- |
| `role`           | Non    | `string`  | Nouveau rôle (`admin` ou `commercial`)          |
| `reset_password` | Non    | `boolean` | Si `true`, réinitialise le mot de passe         |

**Réponse `200`**

```json
{
  "message": "Utilisateur mis à jour"
}
```

---

### GET `/api/admin/reminders`

Liste de tous les rappels.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
[
  {
    "id": 1,
    "user_id": 1,
    "title": "Relancer client ABC",
    "description": "Suite à la réunion du 20 août",
    "due_date": "2026-08-28",
    "priority": "high",
    "completed": false
  }
]
```

---

### POST `/api/admin/reminders`

Crée un nouveau rappel.

**Authentification** : Requise — rôle `admin`.

**Body**

```json
{
  "title": "Relancer client ABC",
  "description": "Suite à la réunion du 20 août",
  "due_date": "2026-08-28",
  "priority": "high"
}
```

| Champ         | Requis | Type     | Valeur par défaut | Description                            |
| ------------- | ------ | -------- | ----------------- | -------------------------------------- |
| `title`       | Oui    | `string` | —                 | Titre du rappel                        |
| `description` | Non    | `string` | `null`            | Description détaillée                  |
| `due_date`    | Non    | `string` | `null`            | Date d'échéance (`YYYY-MM-DD`)         |
| `priority`    | Non    | `string` | `medium`          | `low`, `medium` ou `high`              |

**Réponse `201`**

```json
{
  "id": 5,
  "message": "Rappel créé"
}
```

---

### PATCH `/api/admin/reminders/:id`

Met à jour un rappel existant.

**Authentification** : Requise — rôle `admin`.

**Body** : Tous les champs sont optionnels (même schéma que la création).

**Réponse `200`**

```json
{
  "message": "Rappel mis à jour"
}
```

---

### DELETE `/api/admin/reminders/:id`

Supprime un rappel.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
{
  "message": "Rappel supprimé"
}
```

---

### GET `/api/admin/logs`

Requête des journaux d'activité.

**Authentification** : Requise — rôle `admin`.

**Paramètres de requête**

| Paramètre | Type     | Obligatoire | Description                               |
| --------- | -------- | ----------- | ----------------------------------------- |
| `action`  | `string` | Non         | Filtrer par type d'action                 |
| `user_id` | `number` | Non         | Filtrer par utilisateur                   |
| `limit`   | `number` | Non         | Nombre max de résultats (défaut : 100)    |

**Réponse `200`**

```json
[
  {
    "id": 1,
    "user_id": 1,
    "action": "collecte_created",
    "target": "collecte",
    "details": "Création de la collecte #12",
    "created_at": "2026-08-25T10:00:00.000Z",
    "user_nom": "Jean Dupont"
  }
]
```

---

### GET `/api/admin/settings`

Retourne tous les paramètres sous forme d'objet clé-valeur.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

```json
{
  "ca_objectif": "500000",
  "offres_objectif": "120",
  "bc_objectif": "35",
  "rdv_objectif": "100",
  "theme": "light",
  "notifications_enabled": "true"
}
```

---

### PATCH `/api/admin/settings`

Met à jour les paramètres. Accepte des paires clé-valeur arbitraires.

**Authentification** : Requise — rôle `admin`.

**Body**

```json
{
  "ca_objectif": "600000",
  "theme": "dark"
}
```

**Réponse `200`**

```json
{
  "message": "Paramètres mis à jour"
}
```

---

### GET `/api/admin/history`

Historique des validations de collectes.

**Authentification** : Requise — rôle `admin`.

**Paramètres de requête**

| Paramètre   | Type     | Obligatoire | Description                           |
| ----------- | -------- | ----------- | ------------------------------------- |
| `collecte_id`| `number`| Non         | Filtrer par collecte                  |
| `action`    | `string` | Non         | Filtrer par type d'action             |

**Réponse `200`**

```json
[
  {
    "id": 1,
    "collecte_id": 12,
    "user_id": 1,
    "action": "approved",
    "details": "Collecte approuvée",
    "created_at": "2026-08-25T14:00:00.000Z",
    "user_nom": "Admin",
    "commercial": "Jean Dupont"
  }
]
```

---

### GET `/api/admin/export`

Exporte les données au format Excel (.xlsx). Le fichier contient 3 feuilles :

1. **Collectes** — Liste des collectes avec CA, offres, BC, statut
2. **RDVs** — Liste des rendez-vous avec prospect, date, montant, statut
3. **Stats** — Statistiques par commercial

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

- Content-Type : `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition : `attachment; filename="ipce_export.xlsx"`

---

### GET `/api/admin/export/csv`

Exporte les données au format CSV.

**Authentification** : Requise — rôle `admin`.

**Réponse `200`**

- Content-Type : `text/csv`
- Content-Disposition : `attachment; filename="ipce_export.csv"`

---

### POST `/api/admin/reset`

Réinitialise **toutes** les données de l'application. **Action irréversible.**

**Authentification** : Requise — rôle `admin`.

**Body**

```json
{
  "confirmed": true
}
```

| Champ       | Requis | Type      | Description                                    |
| ----------- | ------ | --------- | ---------------------------------------------- |
| `confirmed` | Oui    | `boolean` | Doit être `true` pour confirmer la réinitialisation |

**Réponse `200`**

```json
{
  "message": "Toutes les données ont été réinitialisées"
}
```

**Erreurs**

| Code | Description                                 |
| ---- | ------------------------------------------- |
| 400  | Champ `confirmed` manquant ou `false`       |

**Effets secondaires**

- Suppression de toutes les collectes, RDVs, historique, logs, rappels et notifications
- Réinitialisation des paramètres par défaut
- Les utilisateurs ne sont **pas** supprimés

---

## Notifications

Tous les endpoints de notifications sont situés sous `/api/admin/notifications`.

**Authentification** : Requise — rôle `admin` pour tous les endpoints.

---

### GET `/api/admin/notifications`

Liste des notifications de l'utilisateur courant.

**Paramètres de requête**

| Paramètre    | Type     | Obligatoire | Description                           |
| ------------ | -------- | ----------- | ------------------------------------- |
| `unread_only`| `boolean`| Non         | Filtrer uniquement les non-lues       |
| `limit`      | `number` | Non         | Nombre max de résultats (défaut : 50) |

**Réponse `200`**

```json
[
  {
    "id": 1,
    "user_id": 1,
    "type": "validation",
    "title": "Collecte validée",
    "message": "La collecte #12 a été validée par l'admin",
    "link": "/collectes/12",
    "is_read": false,
    "created_at": "2026-08-25T14:00:00.000Z"
  }
]
```

---

### GET `/api/admin/notifications/unread-count`

Retourne le nombre de notifications non lues.

**Réponse `200`**

```json
{
  "count": 3
}
```

---

### PATCH `/api/admin/notifications/:id/read`

Marque une notification comme lue.

**Réponse `200`**

```json
{
  "message": "Notification marquée comme lue"
}
```

---

### PATCH `/api/admin/notifications/read-all`

Marque toutes les notifications de l'utilisateur comme lues.

**Réponse `200`**

```json
{
  "message": "Toutes les notifications marquées comme lues"
}
```

---

### DELETE `/api/admin/notifications/:id`

Supprime une notification.

**Réponse `200`**

```json
{
  "message": "Notification supprimée"
}
```

---

### DELETE `/api/admin/notifications`

Supprime toutes les notifications de l'utilisateur.

**Réponse `200`**

```json
{
  "message": "Toutes les notifications supprimées"
}
```

---

### GET `/api/admin/notifications/stats`

Statistiques des notifications par type.

**Réponse `200`**

```json
{
  "validation": 5,
  "info": 12,
  "alert": 3
}
```

---

## Health Check

### GET `/api/health`

Vérifie que le serveur est opérationnel. Ne nécessite aucune authentification.

**Réponse `200`**

```json
{
  "status": "ok"
}
```

---

## Modèle de données

### Table `users`

| Colonne              | Type    | Contrainte          | Description                           |
| -------------------- | ------- | ------------------- | ------------------------------------- |
| `id`                 | INTEGER | PK, AUTOINCREMENT   | Identifiant unique                    |
| `nom`                | TEXT    | UNIQUE, NOT NULL    | Nom de l'utilisateur                  |
| `password`           | TEXT    | NOT NULL            | Mot de passe hashé (bcrypt)           |
| `role`               | TEXT    | DEFAULT 'commercial'| `admin` ou `commercial`               |
| `must_change_password`| INTEGER| DEFAULT 1           | 1 = doit changer le mot de passe      |

### Table `collectes`

| Colonne       | Type    | Contrainte                          | Description                                |
| ------------- | ------- | ----------------------------------- | ------------------------------------------ |
| `id`          | INTEGER | PK, AUTOINCREMENT                   | Identifiant unique                         |
| `user_id`     | INTEGER | FK → users(id), NOT NULL            | Propriétaire de la collecte                |
| `ca`          | REAL    | DEFAULT 0                           | Chiffre d'affaires                         |
| `offres`      | INTEGER | DEFAULT 0                           | Nombre d'offres                            |
| `bc`          | INTEGER | DEFAULT 0                           | Nombre de bons de commande                 |
| `created_at`  | TEXT    | DEFAULT CURRENT_TIMESTAMP           | Date de création                           |
| `statut`      | TEXT    | DEFAULT 'brouillon'                | `brouillon`, `validee`, `approuvee`, `rejetee` |

### Table `rdvs`

| Colonne       | Type    | Contrainte                          | Description                                |
| ------------- | ------- | ----------------------------------- | ------------------------------------------ |
| `id`          | INTEGER | PK, AUTOINCREMENT                   | Identifiant unique                         |
| `collecte_id` | INTEGER | FK → collectes(id) ON DELETE CASCADE| Collecte parente                           |
| `prospect`    | TEXT    | NOT NULL                            | Nom du prospect                            |
| `date`        | TEXT    | NOT NULL                            | Date du RDV (`YYYY-MM-DD`)                 |
| `montant`     | REAL    | DEFAULT 0                           | Montant estimé                             |
| `statut`      | TEXT    | DEFAULT 'Prevu'                     | `Prevu`, `Realise`, `Offre`, `BC Signe`    |

### Table `validation_history`

| Colonne       | Type    | Contrainte                          | Description                                |
| ------------- | ------- | ----------------------------------- | ------------------------------------------ |
| `id`          | INTEGER | PK, AUTOINCREMENT                   | Identifiant unique                         |
| `collecte_id` | INTEGER | FK → collectes(id)                  | Collecte concernée                         |
| `user_id`     | INTEGER | FK → users(id)                      | Auteur de l'action                         |
| `action`      | TEXT    | NOT NULL                            | `approved` ou `rejected`                   |
| `details`     | TEXT    |                                     | Description de l'action                    |
| `created_at`  | TEXT    | DEFAULT CURRENT_TIMESTAMP           | Date de l'action                           |

### Table `logs`

| Colonne       | Type    | Contrainte                          | Description                                |
| ------------- | ------- | ----------------------------------- | ------------------------------------------ |
| `id`          | INTEGER | PK, AUTOINCREMENT                   | Identifiant unique                         |
| `user_id`     | INTEGER | FK → users(id)                      | Utilisateur concerné                       |
| `action`      | TEXT    | NOT NULL                            | Type d'action enregistrée                  |
| `target`      | TEXT    |                                     | Cible de l'action                          |
| `details`     | TEXT    |                                     | Détails supplémentaires                    |
| `created_at`  | TEXT    | DEFAULT CURRENT_TIMESTAMP           | Date de l'action                           |

### Table `reminders`

| Colonne       | Type    | Contrainte                          | Description                                |
| ------------- | ------- | ----------------------------------- | ------------------------------------------ |
| `id`          | INTEGER | PK, AUTOINCREMENT                   | Identifiant unique                         |
| `user_id`     | INTEGER | FK → users(id), NOT NULL            | Utilisateur assigné                        |
| `title`       | TEXT    | NOT NULL                            | Titre du rappel                            |
| `description` | TEXT    |                                     | Description détaillée                      |
| `due_date`    | TEXT    |                                     | Date d'échéance (`YYYY-MM-DD`)             |
| `priority`    | TEXT    | DEFAULT 'medium'                    | `low`, `medium`, `high`                    |
| `completed`   | INTEGER | DEFAULT 0                           | 1 = terminé                                |
| `created_at`  | TEXT    | DEFAULT CURRENT_TIMESTAMP           | Date de création                           |

### Table `settings`

| Colonne       | Type    | Contrainte                          | Description                                |
| ------------- | ------- | ----------------------------------- | ------------------------------------------ |
| `key`         | TEXT    | PK                                  | Nom du paramètre                           |
| `value`       | TEXT    |                                     | Valeur du paramètre                        |
| `updated_at`  | TEXT    | DEFAULT CURRENT_TIMESTAMP           | Dernière mise à jour                       |

**Paramètres par défaut**

| Clé                    | Valeur par défaut |
| ---------------------- | ----------------- |
| `ca_objectif`          | `500000`          |
| `offres_objectif`      | `120`             |
| `bc_objectif`          | `35`              |
| `rdv_objectif`         | `100`             |
| `theme`                | `light`           |
| `notifications_enabled`| `true`            |

### Table `notifications`

| Colonne       | Type    | Contrainte                          | Description                                |
| ------------- | ------- | ----------------------------------- | ------------------------------------------ |
| `id`          | INTEGER | PK, AUTOINCREMENT                   | Identifiant unique                         |
| `user_id`     | INTEGER | FK → users(id), NOT NULL            | Destinataire                               |
| `type`        | TEXT    | NOT NULL                            | Type de notification                       |
| `title`       | TEXT    | NOT NULL                            | Titre                                      |
| `message`     | TEXT    |                                     | Corps du message                           |
| `link`        | TEXT    |                                     | Lien de redirection                        |
| `is_read`     | INTEGER | DEFAULT 0                           | 1 = lue                                    |
| `created_at`  | TEXT    | DEFAULT CURRENT_TIMESTAMP           | Date de création                           |

---

## Codes de réponse HTTP

| Code  | Description                                          |
| ----- | ---------------------------------------------------- |
| `200` | Succès                                               |
| `201` | Ressource créée                                      |
| `400` | Requête invalide (champs manquants ou invalides)     |
| `401` | Non authentifié ou token invalide/expiré              |
| `403` | Non autorisé (mauvais rôle ou pas propriétaire)      |
| `404` | Ressource introuvable                                |
| `409` | Conflit (ex: nom d'utilisateur déjà utilisé)         |
| `429` | Trop de requêtes (rate limiting)                     |
| `500` | Erreur interne du serveur                            |
