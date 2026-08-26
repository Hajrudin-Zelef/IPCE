# Guide d'installation — IPCE Dashboard

Guide complet d'installation et de configuration du Dashboard Pilotage Commercial IPCE.

---

## Prérequis

| Composant | Version minimale | Notes |
|-----------|-----------------|-------|
| **Node.js** | 22.x ou supérieur | [nodejs.org](https://nodejs.org) |
| **npm** | Inclus avec Node.js | Gestionnaire de paquets |
| **SQLite** | Automatique | Géré via `better-sqlite3`, aucune installation séparée nécessaire |
| **Serveur SMTP** | Optionnel | Uniquement si vous souhaitez activer l'envoi d'emails de notification |

---

## Étapes d'installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Hajrudin-Zelef/IPCE.git
cd IPCE
```

### 2. Installer les dépendances

```bash
npm install
```

Ceci installe automatiquement toutes les dépendances listées dans `package.json` :

| Paquet | Usage |
|--------|-------|
| `express` | Serveur web |
| `better-sqlite3` | Base de données SQLite |
| `bcryptjs` | Hashage des mots de passe |
| `jsonwebtoken` | Authentification JWT |
| `exceljs` | Export Excel |
| `nodemailer` | Envoi d'emails (SMTP) |
| `dotenv` | Variables d'environnement |
| `cors` | Gestion des requêtes cross-origin |

### 3. Configurer l'environnement

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

Puis éditez-le avec vos valeurs :

```env
# === OBLIGATOIRE ===
JWT_SECRET=une_chaine_au_moins_16_caracteres
ADMIN_PASSWORD=MonSuperAdmin123!
DEFAULT_PASSWORD=Commercial123!

# === OPTIONNEL ===
PORT=4600
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=mon.email@gmail.com
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx
ADMIN_EMAIL=admin@ipce.com
```

### 4. Initialiser la base de données

La base de données SQLite est **automatiquement créée et initialisée** au premier démarrage du serveur. Aucune action manuelle n'est requise.

**Fichier de la base :** `data/ipce.db`

Détails de l'initialisation :

- **Mode WAL** (Write-Ahead Logging) activé pour de meilleures performances
- **Clés étrangères** activées (`foreign_keys = ON`)
- **Utilisateurs par défaut créés :**

| Utilisateur | Rôle | Mot de passe | Doit changer le mot de passe |
|-------------|------|-------------|------------------------------|
| `admin` | Admin | Défini via `ADMIN_PASSWORD` | Oui |
| `Bilé` | Commercial | Défini via `DEFAULT_PASSWORD` | Oui |
| `Arthème` | Commercial | Défini via `DEFAULT_PASSWORD` | Oui |
| `Catherine` | Commercial | Défini via `DEFAULT_PASSWORD` | Oui |

- **Paramètres par défaut** (table `settings`) :
  - `ca_objectif` : 100 000 000 FCFA
  - `offres_objectif` : 6
  - `bc_objectif` : 6
  - `rdv_objectif` : 6
  - `theme` : light
  - `notifications_enabled` : true

### 5. Démarrer le serveur

```bash
npm start
# ou
node server.js
```

Vous devriez voir dans le terminal :

```
🚀 IPCE Dashboard running on port 4600
```

Pour arrêter le serveur : `Ctrl + C`.

### 6. Accéder à l'application

| Page | URL | Description |
|------|-----|-------------|
| **Connexion** | http://localhost:4600/ | Page de login |
| **Admin** | http://localhost:4600/admin/ | Panel administrateur |
| **Commercial** | http://localhost:4600/dashboard.html | Dashboard commercial |

> **Note :** En production, utilisez `https://` via un reverse proxy (voir [Configurations avancées](#configurations-avancées)).

### 7. Première connexion

#### Connexion administrateur

1. Ouvrez http://localhost:4600/
2. Entrez le nom : `admin`
3. Entrez le mot de passe défini dans `ADMIN_PASSWORD`
4. Le formulaire de **changement de mot de passe** s'affiche automatiquement (flag `must_change_password`)
5. Saisissez l'ancien mot de passe puis le nouveau (minimum 8 caractères, différent de l'ancien)

#### Connexion commercial

1. Connectez-vous avec l'un des comptes : `Bilé`, `Arthème` ou `Catherine`
2. Le mot de passe initial est celui défini dans `DEFAULT_PASSWORD`
3. Le changement de mot de passe est également obligatoire au premier login

> **Sécurité :** Le serveur limite à **10 tentatives de connexion** par adresse IP sur une fenêtre de 15 minutes. Au-delà, un message d'erreur 429 est retourné.

---

## Structure de la base de données

La base SQLite contient **8 tables** :

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs du système (admin et commerciaux) — noms, mots de passe hashés, rôles |
| `collectes` | Données de collecte saisies par les commerciaux (CA, offres, BC signés, statut) |
| `rdvs` | Rendez-vous associés à une collecte (prospect, date, montant, statut) |
| `validation_history` | Historique des actions de validation (approbation, rejet) avec horodatage |
| `logs` | Journal d'audit des actions utilisateur (connexion, modification, suppression...) |
| `reminders` | Rappels personnels des utilisateurs (titre, description, échéance, priorité) |
| `settings` | Paramètres globaux de l'application (clés-valeurs : objectifs, thème, notifications) |
| `notifications` | Notifications système et individuelles (collecte en attente, rappels, alertes) |

---

## Variables d'environnement

| Variable | Requis | Défaut | Description |
|----------|--------|--------|-------------|
| `JWT_SECRET` | **Oui** | — | Secret pour signer les tokens JWT. Minimum **16 caractères**. |
| `ADMIN_PASSWORD` | **Oui** | — | Mot de passe initial de l'utilisateur `admin`. |
| `DEFAULT_PASSWORD` | **Oui** | — | Mot de passe initial des commerciaux (`Bilé`, `Arthème`, `Catherine`). |
| `PORT` | Non | `4600` | Port du serveur HTTP. |
| `EMAIL_HOST` | Non | — | Hôte du serveur SMTP (ex: `smtp.gmail.com`). |
| `EMAIL_PORT` | Non | `587` | Port du serveur SMTP (587 pour STARTTLS, 465 pour SSL). |
| `EMAIL_USER` | Non | — | Adresse email pour l'authentification SMTP. |
| `EMAIL_PASS` | Non | — | Mot de passe d'application SMTP (pas le mot de passe du compte). |
| `ADMIN_EMAIL` | Non | `admin@ipce.com` | Adresse de réception des notifications email. |

> **Important :** Les variables `JWT_SECRET`, `ADMIN_PASSWORD` et `DEFAULT_PASSWORD` sont **obligatoires**. Le serveur refuse de démarrer si `JWT_SECRET` est absent ou trop court.

---

## Configurations avancées

### Changer le port

Modifiez la variable `PORT` dans votre fichier `.env` :

```env
PORT=3000
```

Le serveur démarrera sur le port spécifié.

### Configurer l'email SMTP

#### Exemple avec Gmail

1. Activez l'**authentification à 2 facteurs** sur votre compte Google
2. Générez un **mot de passe d'application** dans : Google Account → Sécurité → Validation en 2 étapes → Mots de passe d'application
3. Renseignez les variables :

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre.email@gmail.com
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx
ADMIN_EMAIL=admin@votredomaine.com
```

> **Note :** L'envoi d'emails est optionnel. Si `EMAIL_HOST` ou `EMAIL_USER` n'est pas défini, les notifications email sont simplement ignorées (le message `[EMAIL] Configuration non définie` s'affiche dans les logs).

#### Exemple avec un serveur SMTP自管

```env
EMAIL_HOST=smtp.votredomaine.com
EMAIL_PORT=587
EMAIL_USER=noreply@votredomaine.com
EMAIL_PASS=votre_mot_de_passe
ADMIN_EMAIL=admin@votredomaine.com
```

### HTTPS via reverse proxy (nginx)

En production, utilisez **nginx** comme reverse proxy pour terminer les connexions TLS :

```nginx
server {
    listen 80;
    server_name ipce.votredomaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ipce.votredomaine.com;

    ssl_certificate /etc/letsencrypt/live/ipce.votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ipce.votredomaine.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4600;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Puis activez le certificat SSL avec Certbot :

```bash
sudo certbot --nginx -d ipce.votredomaine.com
```

---

## Mise à jour

```bash
# Récupérer les dernières modifications
git pull

# Installer les dépendances (si de nouveaux paquets ont été ajoutés)
npm install

# Redémarrer le serveur
# Si vous utilisez npm start : Ctrl+C puis relancer
npm start
```

> **Attention :** Si la structure de la base de données a changé, une migration peut être nécessaire. Consultez les changelog après chaque mise à jour.

---

## Dépannage

| Problème | Cause probable | Solution |
|----------|---------------|----------|
| `JWT_SECRET trop court` | `JWT_SECRET` absent ou < 16 caractères dans `.env` | Définissez un secret d'au moins 16 caractères |
| `ADMIN_PASSWORD manquant` | Variable `ADMIN_PASSWORD` non définie dans `.env` | Ajoutez-la dans votre fichier `.env` |
| `DEFAULT_PASSWORD manquant` | Variable `DEFAULT_PASSWORD` non définie dans `.env` | Ajoutez-la dans votre fichier `.env` |
| Erreur de port | Le port est déjà utilisé | Changez la variable `PORT` dans `.env` |
| Email non envoyé | Configuration SMTP non renseignée | Vérifiez `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` |
| `Cannot find module` | Dépendances non installées | Exécutez `npm install` |

---

## Structure du projet

```
IPCE/
├── server.js              # Point d'entrée Express (port 4600)
├── db/init.js             # Initialisation SQLite + seed utilisateurs
├── middleware/auth.js      # JWT + RBAC (admin/commercial)
├── routes/
│   ├── auth.js            # Connexion / Déconnexion / Inscription
│   ├── collectes.js       # CRUD collectes + validation
│   └── admin.js           # Statistiques + export Excel
├── email/mailer.js        # Envoi d'emails (Nodemailer)
├── public/
│   ├── index.html         # Page de connexion
│   ├── dashboard.html     # Dashboard commercial
│   └── admin/             # Interface administrateur
│       ├── index.html
│       ├── js/
│       └── templates/
├── data/
│   └── ipce.db            # Base SQLite (auto-créée au premier lancement)
├── docs/                  # Documentation
├── .env                   # Variables d'environnement (à créer)
├── .env.example           # Modèle de fichier .env
└── package.json           # Dépendances et scripts
```
