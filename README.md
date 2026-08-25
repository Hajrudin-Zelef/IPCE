# 📊 IPCE — Dashboard Pilotage Commercial

Application web de pilotage commercial avec authentification, validation des collectes, et export Excel.

## 🚀 Démarrage rapide

```bash
# Cloner le repo
git clone https://github.com/Hajrudin-Zelef/IPCE.git
cd IPCE

# Installer les dépendances
npm install

# Lancer le serveur
node server.js
```

→ Ouvrir **http://localhost:4600** dans le navigateur

## 🔑 Comptes par défaut

> ⚠️ **Change les mots de passe dès le premier lancement !**

| Rôle | Nom | Mot de passe |
|------|-----|-------------|
| Admin | `admin` | *(défini lors de l'installation)* |
| Commercial | `Bilé` | *(défini lors de l'installation)* |
| Commercial | `Arthème` | *(défini lors de l'installation)* |
| Commercial | `Catherine` | *(défini lors de l'installation)* |

Les mots de passe par défaut sont dans le fichier `db/init.js` — modifie-les avant de mettre en production.

## 📋 Fonctionnalités

### Commercial
- Saisie des collectes (CA, Offres, BC signés)
- Gestion des RDV (prospect, date, montant, statut)
- Historique personnel des collectes
- Bouton **Valider** → envoi automatique à l'administrateur

### Administrateur
- Panel de validation (approuver / rejeter les collectes)
- KPIs globaux en temps réel
- Graphiques de performance (Chart.js)
- Export Excel structuré (3 feuilles : Résumé, Détail commercial, RDV)
- Analyse automatique avec recommandations

### Notifications
- Email automatique via Nodemailer quand un commercial valide une collecte

## 🏗️ Architecture

```
IPCE/
├── server.js              # Entry point Express (port 4600)
├── db/init.js             # SQLite + seed utilisateurs
├── middleware/auth.js      # JWT + RBAC (admin/commercial)
├── routes/
│   ├── auth.js            # Login / Register
│   ├── collectes.js       # CRUD collectes + validation
│   └── admin.js           # Stats + export Excel
├── email/mailer.js        # Nodemailer (Gmail SMTP)
├── public/
│   ├── index.html         # Page de connexion
│   ├── dashboard.html     # Vue commercial
│   └── admin.html         # Vue administrateur
└── data/ipce.db           # Base SQLite (auto-créée)
```

## ⚙️ Configuration

Copier `.env.example` en `.env` et renseigner :

```env
JWT_SECRET=votre_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre.email@gmail.com
EMAIL_PASS=votre_mot_de_passe_app
ADMIN_EMAIL=admin@ipce.com
PORT=4600
```

## 📦 Dépendances

- **express** — Serveur web
- **better-sqlite3** — Base de données SQLite
- **bcryptjs** — Hashage des mots de passe
- **jsonwebtoken** — Authentification JWT
- **exceljs** — Export Excel
- **nodemailer** — Envoi d'emails
- **dotenv** — Variables d'environnement

## 📜 API Endpoints

| Méthode | Route | Description | Rôle |
|---------|-------|-------------|------|
| POST | `/api/auth/login` | Connexion | Public |
| POST | `/api/auth/register` | Créer un compte | Admin |
| GET | `/api/collectes` | Mes collectes | Commercial |
| POST | `/api/collectes` | Créer une collecte | Commercial |
| PUT | `/api/collectes/:id` | Modifier une collecte | Commercial |
| PATCH | `/api/collectes/:id/validate` | Valider une collecte | Commercial |
| GET | `/api/admin/stats` | Statistiques globales | Admin |
| GET | `/api/admin/pending` | Collectes en attente | Admin |
| PATCH | `/api/admin/:id/approve` | Approuver une collecte | Admin |
| PATCH | `/api/admin/:id/reject` | Rejeter une collecte | Admin |
| GET | `/api/admin/export` | Export Excel | Admin |

## 📄 Licence

Projet privé — IPCE
