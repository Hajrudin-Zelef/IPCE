# Architecture Technique — IPCE Dashboard

> Document de référence pour l'architecture du système de pilotage commercial IPCE.
> Dernière mise à jour : Août 2026

---

## 1. Vue d'ensemble

L'**IPCE Dashboard** est une application web de pilotage commercial destinée à l'Institut de Promotion Commerciale et d'Entrepreneuriat (IPCE). Elle permet aux commerciaux de saisir leurs collectes quotidiennes (CA, offres, BC signés, RDV), et aux administrateurs de suivre, valider et analyser ces données en temps réel.

### Architecture globale

- **Architecture monolithique** : un seul processus Node.js gère l'API, la logique métier et le service des fichiers statiques.
- **Backend** : Express.js avec SQLite (via better-sqlite3) en base de données embarquée.
- **Frontend** : deux interfaces distinctes servies en fichiers statiques :
  - **Admin Dashboard** (`/admin/index.html`) — SPA vanilla JS avec navigation latérale et chargement paresseux par section.
  - **Dashboard Commercial** (`/dashboard.html`) — page standalone avec sections empilées (formulaire, historique, graphiques, calendrier).
- **Pas de framework frontend** : tout est écrit en HTML/CSS/JS natif, sans React, Vue ou Angular.
- **Authentification** : JWT via cookies httpOnly, contrôle des rôles (admin / commercial).

### Flux d'utilisation principal

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│  Commercial  │───▶│  Dashboard Perso │───▶│  API REST    │
│  (navigateur)│    │  /dashboard.html │    │  /api/*      │
└─────────────┘    └──────────────────┘    └──────┬──────┘
                                                   │
┌─────────────┐    ┌──────────────────┐            │
│  Admin       │───▶│  Admin SPA       │────────────┘
│  (navigateur)│    │  /admin/index    │
└─────────────┘    └──────────────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  SQLite (WAL)    │
                                          │  data/ipce.db    │
                                          └─────────────────┘
```

---

## 2. Stack Technique

| Couche          | Technologie                    | Version    | Rôle                                    |
|-----------------|--------------------------------|------------|-----------------------------------------|
| Runtime         | Node.js                        | 22.x       | Environnement d'exécution               |
| Framework       | Express.js                     | 4.21       | Serveur HTTP, routage, middleware        |
| Base de données | SQLite via better-sqlite3       | 11.x       | Stockage persistant (WAL mode)          |
| Authentification| jsonwebtoken + bcryptjs         | 9.x / 2.4  | JWT cookies httpOnly + hashage mots de passe |
| Email           | Nodemailer                     | 6.x        | Envoi d'emails de notification          |
| Export Excel    | ExcelJS (client + serveur)      | 4.4        | Génération de fichiers .xlsx            |
| Export PDF      | html2canvas + jsPDF             | 1.4 / 2.5  | Capture d'écran HTML → PDF côté client  |
| Graphiques      | Chart.js                       | 3.9.1      | Visualisations (barres, donuts, lignes) |
| Frontend        | Vanilla HTML/CSS/JS             | —          | Aucun framework SPA                     |

### Variables d'environnement (`/home/sam/IPCE/.env`)

| Variable          | Rôle                                        |
|-------------------|---------------------------------------------|
| `JWT_SECRET`      | Clé secrète pour signer les tokens JWT (≥16 caractères) |
| `ADMIN_PASSWORD`  | Mot de passe initial de l'administrateur    |
| `DEFAULT_PASSWORD`| Mot de passe par défaut des commerciaux     |
| `EMAIL_HOST`      | Serveur SMTP (ex: smtp.gmail.com)           |
| `EMAIL_PORT`      | Port SMTP (587 par défaut)                  |
| `EMAIL_USER`      | Adresse email d'envoi                       |
| `EMAIL_PASS`      | Mot de passe / mot de passe d'application   |
| `ADMIN_EMAIL`     | Adresse email de l'admin pour notifications |
| `PORT`            | Port du serveur (4600 par défaut)           |

---

## 3. Architecture des fichiers

```
IPCE/
├── server.js                          # Point d'entrée — Express, middleware, routage
├── package.json                       # Dépendances et scripts (start, dev)
├── .env                               # Variables d'environnement (non versionné)
├── .env.example                       # Modèle de variables d'environnement
├── .gitignore
│
├── db/
│   └── init.js                        # Initialisation SQLite, création des tables, seed admin/commerciaux
│
├── middleware/
│   └── auth.js                        # authenticate (JWT) + requireRole (admin)
│
├── routes/
│   ├── auth.js                        # POST /login, /register, /logout, /change-password, GET /me
│   ├── collects.js                    # CRUD collectes + RDVs, validation par le commercial
│   └── admin.js                       # Admin: stats, evolution, pending, approve/reject, export, users, reminders, logs, settings, notifications
│
├── email/
│   └── mailer.js                      # Envoi email via Nodemailer (validation de collecte)
│
├── data/
│   └── ipce.db                        # Base SQLite (créée automatiquement au démarrage)
│
├── public/
│   ├── index.html                     # Page de connexion + modal changement de mot de passe
│   ├── dashboard.html                 # Dashboard commercial standalone (collecte, historique, graphiques, calendrier)
│   ├── admin.old.html                 # Ancienne version admin (archivée)
│   ├── dashboard.old.html             # Ancienne version dashboard (archivée)
│   │
│   └── admin/                         # Admin Dashboard (SPA)
│       ├── index.html                 # Point d'entrée SPA (sidebar + sections)
│       ├── css/
│       │   ├── index.css              # Import de tous les fichiers CSS
│       │   ├── variables.css          # Variables CSS (couleurs, espacements, ombres)
│       │   ├── base.css               # Styles de base (reset, typographie)
│       │   ├── sidebar.css            # Sidebar de navigation
│       │   ├── header.css             # En-tête du dashboard
│       │   ├── kpi.css                # Cartes KPI
│       │   ├── charts.css             # Grille et cartes de graphiques
│       │   ├── leaderboard.css        # Classement des commerciaux
│       │   ├── performance.css        # Section performance
│       │   ├── executive.css          # Analyse exécutive
│       │   ├── reports.css            # Rapports personnalisés
│       │   ├── calendar.css           # Calendrier
│       │   ├── prospects.css          # Suivi prospects
│       │   ├── reminders.css          # Rappels
│       │   ├── validation.css         # Centre de validation
│       │   ├── insights.css           # Business insights
│       │   ├── docs.css               # Documentation
│       │   ├── users.css              # Gestion utilisateurs
│       │   ├── logs.css               # Logs système
│       │   ├── settings.css           # Paramètres
│       │   ├── export.css             # Menu d'export
│       │   ├── animations.css         # Animations et transitions
│       │   ├── section-shared.css     # Styles partagés entre sections
│       │   ├── detail-panel.css       # Panneau de détail latéral
│       │   └── responsive.css         # Media queries responsives
│       │
│       ├── js/
│       │   ├── app.js                 # Point d'entrée JS (ES modules), initialisation globale
│       │   ├── auth.js                # Vérification d'authentification, redirect si non connecté
│       │   ├── api.js                 # fetchJSON() wrapper pour les appels API
│       │   ├── sidebar.js             # Navigation sidebar, collapse, mobile, raccourcis clavier
│       │   ├── section-loader.js      # Utilitaires de chargement de sections (fetchJSON, renderEmpty, formatDate, formatCA)
│       │   ├── kpi.js                 # Rendu des cartes KPI (CA, offres, BC, RDV)
│       │   ├── leaderboard.js         # Classement des commerciaux
│       │   ├── charts.js              # Graphiques Chart.js (barres, donuts, funnel)
│       │   ├── commercial-suivi.js    # Suivi détaillé par commercial
│       │   ├── performance.js         # Métriques de performance
│       │   ├── executive.js           # Analyse exécutive
│       │   ├── reports.js             # Rapports personnalisés
│       │   ├── calendar.js            # Calendrier RDV (vue mensuelle)
│       │   ├── prospects.js           # Suivi des prospects
│       │   ├── reminders.js           # Gestion des rappels
│       │   ├── validation.js          # Approbation/rejet des collectes
│       │   ├── validation-section.js  # Section validation dans le dashboard
│       │   ├── insights.js            # Business insights et tendances
│       │   ├── docs.js                # Documentation intégrée
│       │   ├── users.js               # CRUD utilisateurs
│       │   ├── logs.js                # Consultation des logs
│       │   ├── settings.js            # Paramètres système
│       │   ├── notifications.js       # Système de notifications in-app (cloche)
│       │   ├── export.js              # Export client-side (PDF, JPEG, CSV, XLSX)
│       │   └── animations.js          # Animations de compteur et transitions
│       │
│       ├── img/
│       │   ├── logo-ipce-32.png
│       │   ├── logo-ipce-64.png
│       │   ├── logo-ipce-192.png
│       │   ├── logo-ipce-512.png
│       │   └── logo-ipce.svg
│       │
│       ├── assets/
│       │   └── rapport-common.js      # Fonctions communes aux templates de rapport
│       │
│       └── templates/
│           ├── rapport_ipce.html          # Template rapport IPCE global
│           ├── rapport_commercial.html    # Template rapport par commercial
│           ├── rapport_mensuel.html       # Template rapport mensuel
│           ├── apercu_rapport_ipce.html   # Aperçu avant export
│           ├── rapport.css                # Styles des rapports
│           └── assets/
│               ├── rapport.css            # Styles communs rapports
│               └── rapport-common.js      # Utilitaires rapports (partagé)
│
├── docs/
│   ├── API.md                         # Documentation de l'API REST
│   └── Architecture.md                # Ce document
│
├── TAF/                               # Travail à faire / notes
└── RAPPORT/                           # Rapports générés / exports
```

---

## 4. Modèle de Données

Base de données SQLite stockée dans `/home/sam/IPCE/data/ipce.db`.

**Mode WAL** activé pour la concurrence lecture/écriture. **Clés étrangères** activées (`PRAGMA foreign_keys = ON`).

### 4.1 Table `users`

Utilisateurs de l'application (admin et commerciaux).

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'commercial' CHECK(role IN ('admin', 'commercial')),
  must_change_password INTEGER DEFAULT 0
);
```

| Colonne               | Type    | Contrainte                  | Description                                    |
|-----------------------|---------|----------------------------|------------------------------------------------|
| `id`                  | INTEGER | PK AUTOINCREMENT           | Identifiant unique                             |
| `nom`                 | TEXT    | UNIQUE NOT NULL            | Nom d'utilisateur (login)                      |
| `password`            | TEXT    | NOT NULL                   | Hash bcrypt du mot de passe (12 rounds)        |
| `role`                | TEXT    | CHECK IN ('admin','commercial') | Rôle de l'utilisateur                     |
| `must_change_password`| INTEGER | DEFAULT 0                  | 1 = changement de mot de passe obligatoire au prochain login |

**Seed** : un admin (`admin`) et 3 commerciaux (`Bilé`, `Arthème`, `Catherine`) sont créés automatiquement à l'initialisation.

### 4.2 Table `collectes`

Collectes quotidiennes saisies par les commerciaux.

```sql
CREATE TABLE IF NOT EXISTS collectes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  ca REAL DEFAULT 0,
  offres INTEGER DEFAULT 0,
  bc INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  statut TEXT DEFAULT 'brouillon' CHECK(statut IN ('brouillon', 'validee', 'approuvee', 'rejetee')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Colonne      | Type     | Contrainte                        | Description                                          |
|--------------|----------|-----------------------------------|------------------------------------------------------|
| `id`         | INTEGER  | PK AUTOINCREMENT                  | Identifiant unique                                   |
| `user_id`    | INTEGER  | FK → users(id) NOT NULL           | Commercial propriétaire de la collecte               |
| `ca`         | REAL     | DEFAULT 0                         | Chiffre d'affaires (en FCFA)                         |
| `offres`     | INTEGER  | DEFAULT 0                         | Nombre d'offres émises                               |
| `bc`         | INTEGER  | DEFAULT 0                         | Nombre de bons de commande signés                    |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP         | Date de création                                     |
| `statut`     | TEXT     | CHECK, DEFAULT 'brouillon'        | Statut du cycle de vie                               |

**Cycle de vie du statut** : `brouillon` → `validee` → `approuvee` | `rejetee`

### 4.3 Table `rdvs`

Rendez-vous commerciaux liés à une collecte.

```sql
CREATE TABLE IF NOT EXISTS rdvs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collecte_id INTEGER NOT NULL,
  prospect TEXT NOT NULL,
  date TEXT NOT NULL,
  montant REAL DEFAULT 0,
  statut TEXT DEFAULT 'Prévu',
  FOREIGN KEY (collecte_id) REFERENCES collectes(id) ON DELETE CASCADE
);
```

| Colonne       | Type    | Contrainte                           | Description                              |
|---------------|---------|--------------------------------------|------------------------------------------|
| `id`          | INTEGER | PK AUTOINCREMENT                     | Identifiant unique                       |
| `collecte_id` | INTEGER | FK → collectes(id) ON DELETE CASCADE | Collecte parente (suppression en cascade)|
| `prospect`    | TEXT    | NOT NULL                             | Nom du prospect                          |
| `date`        | TEXT    | NOT NULL                             | Date du RDV (format ISO)                 |
| `montant`     | REAL    | DEFAULT 0                            | Montant estimé du RDV (FCFA)             |
| `statut`      | TEXT    | DEFAULT 'Prévu'                      | Statut : Prévu, Realise, Offre, BC Signe |

### 4.4 Table `validation_history`

Historique des actions de validation (approbation/rejet).

```sql
CREATE TABLE IF NOT EXISTS validation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collecte_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collecte_id) REFERENCES collectes(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Colonne       | Type     | Contrainte                  | Description                                |
|---------------|----------|----------------------------|--------------------------------------------|
| `id`          | INTEGER  | PK AUTOINCREMENT           | Identifiant unique                         |
| `collecte_id` | INTEGER  | FK → collectes(id)         | Collecte concernée                         |
| `user_id`     | INTEGER  | FK → users(id)             | Admin ayant effectué l'action              |
| `action`      | TEXT     | NOT NULL                   | `approve` ou `reject`                      |
| `details`     | TEXT     | NULLABLE                   | Commentaire optionnel                      |
| `created_at`  | DATETIME | DEFAULT CURRENT_TIMESTAMP  | Horodatage de l'action                     |

### 4.5 Table `logs`

Journal d'audit des actions système.

```sql
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| Colonne      | Type     | Contrainte                  | Description                              |
|--------------|----------|----------------------------|------------------------------------------|
| `id`         | INTEGER  | PK AUTOINCREMENT           | Identifiant unique                       |
| `user_id`    | INTEGER  | NULLABLE                   | Utilisateur ayant effectué l'action      |
| `action`     | TEXT     | NOT NULL                   | Type d'action (ex: `approve_collecte`)   |
| `target`     | TEXT     | NULLABLE                   | Cible de l'action (ex: `collecte:42`)    |
| `details`    | TEXT     | NULLABLE                   | Description détaillée                    |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP  | Horodatage                               |

### 4.6 Table `reminders`

Rappels pour les administrateurs.

```sql
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATETIME,
  priority TEXT DEFAULT 'medium',
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Colonne       | Type     | Contrainte                  | Description                                |
|---------------|----------|----------------------------|--------------------------------------------|
| `id`          | INTEGER  | PK AUTOINCREMENT           | Identifiant unique                         |
| `user_id`     | INTEGER  | FK → users(id) NOT NULL    | Admin propriétaire du rappel               |
| `title`       | TEXT     | NOT NULL                   | Titre du rappel                            |
| `description` | TEXT     | NULLABLE                   | Description détaillée                      |
| `due_date`    | DATETIME | NULLABLE                   | Date d'échéance                            |
| `priority`    | TEXT     | DEFAULT 'medium'           | Priorité : low, medium, high               |
| `completed`   | INTEGER  | DEFAULT 0                  | 1 = rappel terminé                         |
| `created_at`  | DATETIME | DEFAULT CURRENT_TIMESTAMP  | Date de création                           |

### 4.7 Table `settings`

Paramètres clé-valeur de l'application.

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Paramètres par défaut** :

| Clé                    | Valeur      | Description                      |
|------------------------|-------------|----------------------------------|
| `ca_objectif`          | 100000000   | Objectif CA global (100M FCFA)   |
| `offres_objectif`      | 6           | Objectif offres émises           |
| `bc_objectif`          | 6           | Objectif BC signés               |
| `rdv_objectif`         | 6           | Objectif RDV                     |
| `theme`                | light       | Thème d'affichage                |
| `notifications_enabled`| true        | Notifications activées           |

### 4.8 Table `notifications`

Notifications in-app pour les utilisateurs.

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN (
    'collecte_pending', 'collecte_approved', 'collecte_rejected',
    'reminder', 'system', 'info'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
```

| Colonne      | Type     | Contrainte                           | Description                              |
|--------------|----------|--------------------------------------|------------------------------------------|
| `id`         | INTEGER  | PK AUTOINCREMENT                     | Identifiant unique                       |
| `user_id`    | INTEGER  | FK → users(id) NOT NULL              | Destinataire de la notification          |
| `type`       | TEXT     | CHECK IN (6 types) NOT NULL          | Catégorie de notification                |
| `title`      | TEXT     | NOT NULL                             | Titre court                              |
| `message`    | TEXT     | NOT NULL                             | Corps du message                         |
| `link`       | TEXT     | NULLABLE                             | Lien de redirection (ex: `#validation`)  |
| `is_read`    | INTEGER  | DEFAULT 0                            | 1 = notification lue                     |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP            | Date de création                         |

### 4.9 Index

```sql
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
```

### 4.10 Diagramme des relations

```
┌──────────┐       ┌──────────────┐       ┌───────────┐
│  users   │──1:N──│  collectes   │──1:N──│   rdvs    │
│          │       │              │       │           │
│ id (PK)  │       │ id (PK)      │       │ id (PK)   │
│ nom      │       │ user_id (FK) │       │ collecte_id│
│ password │       │ ca           │       │ prospect  │
│ role     │       │ offres       │       │ date      │
│ must_    │       │ bc           │       │ montant   │
│  change_ │       │ statut       │       │ statut    │
│  password│       │ created_at   │       └───────────┘
└──────────┘       └──────────────┘
     │                    │
     │                    ├──1:N──┌─────────────────────┐
     │                    │       │ validation_history   │
     │                    │       │ id (PK)             │
     │                    │       │ collecte_id (FK)    │
     │                    │       │ user_id (FK)        │
     │                    │       │ action              │
     │                    │       └─────────────────────┘
     │                    │
     │                    └──1:N──┌───────────┐
     │                            │   logs    │
     ├──1:N──┌─────────────┐     │ id (PK)   │
     │       │ reminders   │     │ user_id   │
     │       │ id (PK)     │     │ action    │
     │       │ user_id(FK) │     │ target    │
     │       │ title       │     └───────────┘
     │       │ due_date    │
     │       └─────────────┘
     │
     ├──1:N──┌───────────────────┐
     │       │  notifications    │
     │       │ id (PK)           │
     │       │ user_id (FK)      │
     │       │ type              │
     │       │ title, message    │
     │       │ is_read           │
     │       └───────────────────┘
     │
     └──(seed)──┌───────────┐
                 │ settings  │
                 │ key (PK)  │
                 │ value     │
                 └───────────┘
```

---

## 5. Flux de Données

### 5.1 Cycle de vie d'une collecte

```
┌─────────────┐     ┌──────────┐     ┌───────────┐     ┌──────────────┐
│  Commercial  │────▶│BROUILLON │────▶│ VALIDÉE   │────▶│ APPROUVÉE    │
│  crée collecte│     │(modifiable)│    │(en attente)│    │ (final)      │
└─────────────┘     └──────────┘     └───────────┘     └──────────────┘
                           │                │
                           │                └──────────────────┐
                           ▼                                   ▼
                    ┌──────────┐                       ┌──────────┐
                    │ SUPPRIMÉE│                       │ REJETÉE  │
                    └──────────┘                       └──────────┘
```

**Détail du flux** :

1. **Création** (`POST /api/collectes`) — Le commercial crée une collecte avec `statut = 'brouillon'`. Les RDV sont insérés en même temps dans une transaction.
2. **Modification** (`PUT /api/collectes/:id`) — Tant que le statut est `brouillon`, le commercial peut modifier les données (CA, offres, BC) et les RDV associés.
3. **Validation** (`PATCH /api/collectes/:id/validate`) — Le commercial soumet la collecte → `statut = 'validee'` :
   - Un email de notification est envoyé à l'admin via Nodemailer.
   - Une notification in-app (`collecte_pending`) est créée pour chaque administrateur.
4. **Approbation** (`PATCH /api/admin/:id/approve`) — L'admin approuve → `statut = 'approuvee'` :
   - Une entrée dans `validation_history` est créée.
   - Une action est loguée dans `logs`.
   - Une notification in-app (`collecte_approved`) est envoyée au commercial.
5. **Rejet** (`PATCH /api/admin/:id/reject`) — L'admin rejette → `statut = 'rejetee'` :
   - Même mécanisme que l'approbation avec `collecte_rejected`.

### 5.2 Cycle de vie d'un RDV

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│  Prévu   │────▶│ Realisé  │────▶│  Offre   │────▶│ BC Signé  │
└─────────┘     └──────────┘     └──────────┘     └───────────┘
```

- Les RDV sont créés lors de la création d'une collecte (`POST /api/collectes`).
- Un RDV ne peut être modifié que si la collecte parente est en statut `brouillon`.
- Les statuts autorisés : `Prévu`, `Realise`, `Offre`, `BC Signe`.
- La suppression d'un RDV respecte la même règle de statut.
- La suppression d'une collecte entraîne la suppression cascade de tous ses RDV (`ON DELETE CASCADE`).

### 5.3 Système de notifications

**Déclencheurs** :

| Événement                      | Type de notification   | Destinataire(s)   | Canal            |
|--------------------------------|------------------------|--------------------|------------------|
| Commercial valide une collecte | `collecte_pending`     | Tous les admins    | In-app + Email   |
| Admin approuve une collecte    | `collecte_approved`    | Le commercial      | In-app           |
| Admin rejette une collecte     | `collecte_rejected`    | Le commercial      | In-app           |
| Création d'un rappel           | `reminder`             | L'admin créateur   | In-app           |
| Événement système              | `system`               | Utilisateur ciblé  | In-app           |
| Information générale           | `info`                 | Utilisateur ciblé  | In-app           |

**Affichage** : L'icône de cloche dans l'interface affiche le nombre de notifications non lues. L'utilisateur peut marquer une notification comme lue, toutes les lire, ou les supprimer.

---

## 6. Architecture des Routes

### 6.1 Route d'authentification (`/api/auth`)

| Méthode | Endpoint             | Auth     | Rôle      | Description                          |
|---------|----------------------|----------|-----------|--------------------------------------|
| POST    | `/api/auth/login`    | Non      | Public    | Connexion, retourne un JWT en cookie |
| POST    | `/api/auth/logout`   | Non      | Public    | Supprime le cookie token             |
| GET     | `/api/auth/me`       | Oui      | Tous      | Retourne les infos de l'utilisateur  |
| POST    | `/api/auth/change-password` | Oui | Tous     | Changement de mot de passe           |
| POST    | `/api/auth/register` | Oui      | Admin     | Création d'un nouvel utilisateur     |

### 6.2 Routes collectes (`/api/collectes`)

| Méthode | Endpoint                    | Auth | Rôle       | Description                           |
|---------|-----------------------------|------|------------|---------------------------------------|
| GET     | `/api/collectes`            | Oui  | Tous       | Liste les collectes du commercial     |
| GET     | `/api/collectes/all`        | Oui  | Admin      | Toutes les collectes (avec nom commercial) |
| POST    | `/api/collectes`            | Oui  | Commercial | Créer une nouvelle collecte           |
| PUT     | `/api/collectes/:id`        | Oui  | Commercial | Modifier (brouillon uniquement)       |
| DELETE  | `/api/collectes/:id`        | Oui  | Commercial | Supprimer (brouillon uniquement)      |
| PATCH   | `/api/collectes/:id/validate` | Oui | Commercial | Soumettre pour validation            |
| GET     | `/api/collectes/rdvs`       | Oui  | Tous       | Liste les RDV du commercial           |
| PATCH   | `/api/collectes/rdvs/:id`   | Oui  | Commercial | Modifier le statut d'un RDV           |
| DELETE  | `/api/collectes/rdvs/:id`   | Oui  | Commercial | Supprimer un RDV                      |

### 6.3 Routes admin (`/api/admin`)

| Méthode | Endpoint                         | Auth | Rôle  | Description                           |
|---------|----------------------------------|------|-------|---------------------------------------|
| GET     | `/api/admin/stats`               | Oui  | Admin | Statistiques par commercial + totaux  |
| GET     | `/api/admin/evolution`           | Oui  | Admin | Évolution mensuelle (CA, offres, BC)  |
| GET     | `/api/admin/pending`             | Oui  | Admin | Collectes en attente de validation    |
| PATCH   | `/api/admin/:id/approve`         | Oui  | Admin | Approuver une collecte                |
| PATCH   | `/api/admin/:id/reject`          | Oui  | Admin | Rejeter une collecte                  |
| GET     | `/api/admin/export`              | Oui  | Admin | Export Excel (résumé + détails)       |
| GET     | `/api/admin/export/csv`          | Oui  | Admin | Export CSV                            |
| POST    | `/api/admin/reset`               | Oui  | Admin | Réinitialiser toutes les données      |
| GET     | `/api/admin/rdvs`                | Oui  | Admin | RDV avec filtres (commercial, statut, dates) |
| GET     | `/api/admin/users`               | Oui  | Admin | Liste des utilisateurs                |
| PATCH   | `/api/admin/users/:id`           | Oui  | Admin | Modifier un utilisateur (rôle, reset password) |
| DELETE  | `/api/admin/users/:id`           | Oui  | Admin | Supprimer un utilisateur (non-admin)  |
| GET     | `/api/admin/reminders`           | Oui  | Admin | Liste des rappels                     |
| POST    | `/api/admin/reminders`           | Oui  | Admin | Créer un rappel                       |
| PATCH   | `/api/admin/reminders/:id`       | Oui  | Admin | Modifier un rappel                    |
| DELETE  | `/api/admin/reminders/:id`       | Oui  | Admin | Supprimer un rappel                   |
| GET     | `/api/admin/logs`                | Oui  | Admin | Consultation des logs                 |
| GET     | `/api/admin/settings`            | Oui  | Admin | Lecture des paramètres                |
| PATCH   | `/api/admin/settings`            | Oui  | Admin | Mise à jour des paramètres            |
| GET     | `/api/admin/history`             | Oui  | Admin | Historique des validations            |
| GET     | `/api/admin/notifications`       | Oui  | Tous  | Notifications de l'utilisateur        |
| GET     | `/api/admin/notifications/unread-count` | Oui | Tous | Nombre de non-lues             |
| PATCH   | `/api/admin/notifications/:id/read` | Oui | Tous | Marquer comme lue                |
| PATCH   | `/api/admin/notifications/read-all`  | Oui | Tous | Marquer toutes comme lues        |
| DELETE  | `/api/admin/notifications/:id`   | Oui  | Tous  | Supprimer une notification            |
| DELETE  | `/api/admin/notifications`       | Oui  | Tous  | Supprimer toutes les notifications    |
| GET     | `/api/admin/notifications/stats` | Oui  | Tous  | Statistiques des notifications        |

### 6.4 Fichiers statiques

| Chemin              | Description                                   |
|---------------------|-----------------------------------------------|
| `/`                 | Page de connexion (`public/index.html`)       |
| `/dashboard.html`   | Dashboard commercial                          |
| `/admin/index.html` | Admin Dashboard SPA                           |
| `/admin/js/*`       | Scripts JavaScript admin                      |
| `/admin/css/*`      | Stylesheets admin                             |
| `/admin/img/*`      | Logo et images                                |
| `/admin/templates/*`| Templates de rapports                         |

### 6.5 Route de santé

| Méthode | Endpoint     | Description                  |
|---------|--------------|------------------------------|
| GET     | `/api/health`| Retourne `{ status: 'ok' }`  |

---

## 7. Sécurité

### 7.1 Authentification

- **JWT** signé avec `JWT_SECRET` (minimum 16 caractères, vérifié au démarrage).
- Token stocké dans un **cookie httpOnly** avec les attributs :
  - `httpOnly: true` — inaccessible via JavaScript côté client.
  - `secure: true` — envoyé uniquement via HTTPS.
  - `sameSite: 'strict'` — protection CSRF.
  - `maxAge: 8h` (28800000 ms).
  - `path: '/'`.
- Le middleware `authenticate` accepte aussi le token via `Authorization: Bearer <token>` pour les appels API.

### 7.2 Hashage des mots de passe

- **bcryptjs** avec **12 rounds** de salt.
- Les mots de passe ne sont jamais stockés en clair.
- Les mots de passe par défaut imposent un changement au premier login (`must_change_password = 1`).

### 7.3 Rate Limiting

- Protection contre le brute-force sur `/api/auth/login` :
  - **10 tentatives** maximum par tranche de **15 minutes** par adresse IP.
  - Stocké en mémoire (`Map`) — pas de Redis ni de stockage persistant.
  - Au-delà : réponse `429 Too Many Requests`.

### 7.4 En-têtes de sécurité

Appliqués à toutes les réponses via un middleware global :

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
x-powered-by: désactivé (app.disable)
```

### 7.5 Contrôle d'accès basé sur les rôles (RBAC)

Deux rôles : `admin` et `commercial`.

- **Commercial** : peut créer, modifier, supprimer et valider ses propres collectes et RDV.
- **Admin** : peut approuver/rejeter des collectes, gérer les utilisateurs, consulter les logs, modifier les paramètres, gérer les rappels.
- Le middleware `requireRole('admin')` protège les routes administratives.
- Chaque endpoint vérifie la propriété des données (ex: `user_id` correspond à l'utilisateur connecté).

### 7.6 Validation des entrées

- Vérification des champs obligatoires sur chaque endpoint (`nom`, `password`, `ca`, etc.).
- Validation des statuts autorisés via `CHECK` en SQLite et `includes()` côté serveur.
- Longueur minimale des mots de passe : 8 caractères.
- Taille maximale du body JSON : 1 Mo (`express.json({ limit: '1mb' })`).

### 7.7 Suppression en cascade

- La suppression d'une collecte entraîne la suppression de tous ses RDV associés (`ON DELETE CASCADE`).
- La suppression d'un utilisateur ne supprime pas ses collectes (contrainte d'intégrité).

### 7.8 Journalisation

- Toutes les actions critiques (approbation, rejet, création d'utilisateur) sont enregistrées dans la table `logs`.
- L'historique des validations est conservé dans `validation_history`.

---

## 8. Système de Cache

| Type de fichier | Directive Cache-Control       | Justification                     |
|-----------------|-------------------------------|-----------------------------------|
| `*.html`        | `no-store`                    | Toujours servir la dernière version |
| `*.js`, `*.css` | `max-age=0` (développement)   | Pas de cache en développement     |

**Note** : en production, il est recommandé de mettre en place un hash de version dans les noms de fichiers statiques (ex: `app.a1b2c3.js`) et d'activer un cache plus agressif.

---

## 9. Modules Frontend

### 9.1 Admin Dashboard (SPA)

**Point d'entrée** : `/home/sam/IPCE/public/admin/index.html`

**Architecture** : Single Page Application vanilla JavaScript avec :

- **Navigation latérale** (`sidebar.js`) — Gestion de l'état (ouvert/fermé/mobile), raccourci `Ctrl+B`, persistance dans `localStorage`.
- **Chargement paresseux par section** (`section-loader.js`) — Chaque section a une fonction de chargement (`window.__load_<section>`) appelée uniquement quand l'utilisateur navigue vers cette section.
- **Routing côté client** — Basé sur le hash de l'URL (`#dashboard`, `#graphs`, etc.), avec `history.pushState`.

**Les 15 sections** :

| Section             | Fichier JS              | Description                                    |
|---------------------|-------------------------|------------------------------------------------|
| `dashboard`         | `app.js` + `kpi.js`     | Vue d'ensemble avec KPI et leaderboard         |
| `graphs`            | `charts.js`             | Graphiques Chart.js (CA, donut, barres, funnel)|
| `commercial-suivi`  | `commercial-suivi.js`   | Suivi détaillé par commercial                   |
| `performance`       | `performance.js`        | Métriques de performance                       |
| `executive`         | `executive.js`          | Analyse exécutive                              |
| `custom-reports`    | `reports.js`            | Rapports personnalisés                         |
| `calendar`          | `calendar.js`           | Calendrier RDV (vue mensuelle)                 |
| `prospects`         | `prospects.js`          | Suivi des prospects                            |
| `reminders`         | `reminders.js`          | Gestion des rappels                            |
| `validation`        | `validation-section.js` | Validation des collectes en attente            |
| `insights`          | `insights.js`           | Business insights et tendances                 |
| `docs`              | `docs.js`               | Documentation intégrée                         |
| `users`             | `users.js`              | CRUD utilisateurs                              |
| `logs`              | `logs.js`               | Consultation des logs système                  |
| `settings`          | `settings.js`           | Paramètres système (objectifs, thème, etc.)    |

**Modules transversaux** :

| Module            | Fichier               | Rôle                                         |
|-------------------|-----------------------|----------------------------------------------|
| Auth              | `auth.js`             | Vérification de session, redirection login   |
| API               | `api.js`              | Wrapper `fetchJSON()` pour les appels HTTP   |
| Notifications     | `notifications.js`    | Cloche de notifications, compteur non-lues   |
| Export            | `export.js`           | Export PDF, JPEG, CSV, XLSX côté client      |
| Animations        | `animations.js`       | Compteurs animés, transitions fade-in        |
| Sidebar           | `sidebar.js`          | Navigation, collapse, mobile, raccourcis     |
| Section Loader    | `section-loader.js`   | Utilitaires de chargement et formatage       |

### 9.2 Dashboard Commercial

**Point d'entrée** : `/home/sam/IPCE/public/dashboard.html`

Page standalone (pas une SPA) avec sections empilées :

| Section                | Description                                          |
|------------------------|------------------------------------------------------|
| Formulaire de collecte | Saisie du CA, offres, BC + ajout de RDV              |
| Historique des collectes| Liste des collectes avec statut et actions           |
| Graphiques             | Visualisation Chart.js des performances personnelles |
| Calendrier             | Vue des RDV à venir                                  |

Le dashboard commercial redirige vers `/admin/index.html` si l'utilisateur est admin.

---

## 10. Système d'Export

### 10.1 Export côté client

| Format | Bibliothèque          | Description                                         |
|--------|-----------------------|-----------------------------------------------------|
| PDF    | html2canvas + jsPDF   | Capture d'écran HTML convertie en PDF               |
| JPEG   | html2canvas           | Capture d'écran HTML en image JPEG                  |
| CSV    | Vanilla JS            | Génération de texte CSV                             |
| XLSX   | ExcelJS (client)      | Génération de fichier Excel côté navigateur         |

**Rapports éditoriaux** (PDF/JPEG/CSV) utilisent des templates HTML dédiés :
- `rapport_ipce.html` — Rapport global IPCE
- `rapport_commercial.html` — Rapport par commercial
- `rapport_mensuel.html` — Rapport mensuel

### 10.2 Export côté serveur

| Format | Endpoint                     | Bibliothèque | Description                      |
|--------|------------------------------|-------------|----------------------------------|
| XLSX   | `GET /api/admin/export`      | ExcelJS     | Fichier Excel avec 3 feuilles    |
| CSV    | `GET /api/admin/export/csv`  | Natif       | CSV texte avec séparateur virgule|

**Structure du fichier Excel** :

| Feuille               | Contenu                                           |
|-----------------------|---------------------------------------------------|
| Résumé Exécutif       | CA total, offres, BC, RDV, taux de conversion     |
| Détail par Commercial | Lignes par commercial avec métriques              |
| Détail RDV            | Liste de tous les RDV avec prospect, date, montant|

---

## 11. Système de Notifications

### 11.1 Types de notifications

| Type                  | Déclencheur                          | Destinataire  | Canal     |
|-----------------------|--------------------------------------|---------------|-----------|
| `collecte_pending`    | Commercial valide une collecte       | Admin(s)      | In-app + Email |
| `collecte_approved`   | Admin approuve une collecte          | Commercial    | In-app    |
| `collecte_rejected`   | Admin rejette une collecte           | Commercial    | In-app    |
| `reminder`            | Création d'un rappel avec échéance   | Admin créateur| In-app    |
| `system`              | Événement système                    | Ciblé         | In-app    |
| `info`                | Information générale                 | Ciblé         | In-app    |

### 11.2 Interface in-app

- **Icône de cloche** dans l'en-tête avec compteur de notifications non lues.
- **Dropdown** affichant les notifications récentes (50 max par requête).
- **Actions** : marquer comme lue, marquer toutes comme lues, supprimer une notification, supprimer toutes les notifications.
- **Sondage automatique** : le compteur de validations en attente est actualisé toutes les 30 secondes.

### 11.3 Notifications email

- Envoyées via **Nodemailer** avec configuration SMTP (Gmail par défaut).
- Le contenu est un email HTML formaté avec les détails de la collecte (CA, offres, BC, RDV).
- Si l'email n'est pas configuré (`EMAIL_USER` non défini ou valeur par défaut), l'envoi est silencieusement ignoré.
- L'adresse de destination est `ADMIN_EMAIL` (défaut : `admin@ipce.com`).

---

## Annexe : Points d'entrée et démarrage

### Point d'entrée

`/home/sam/IPCE/server.js`

### Commandes

```bash
npm install    # Installation des dépendances
npm start      # Démarrage du serveur (port 4600)
npm run dev    # Idem (pas de nodemon configuré)
```

### Initialisation

1. Chargement des variables d'environnement (`dotenv`).
2. Vérification de `JWT_SECRET` (≥ 16 caractères).
3. Initialisation de la base SQLite (`db/init.js`) :
   - Création des tables si elles n'existent pas.
   - Seed des paramètres par défaut.
   - Création de l'admin et des commerciaux si absents.
4. Démarrage du serveur Express sur le port configuré.

### URL d'accès

| Page                    | URL                              |
|-------------------------|----------------------------------|
| Connexion               | `http://localhost:4600/`          |
| Dashboard commercial    | `http://localhost:4600/dashboard.html` |
| Admin Dashboard         | `http://localhost:4600/admin/index.html` |
| Santé                   | `http://localhost:4600/api/health`|
