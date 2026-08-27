# 📊 IPCE — Dashboard Pilotage Commercial

Application web de pilotage commercial avec authentification, 2FA, validation des collectes, export Excel/CSV, et assistant IA.

## 🚀 Démarrage rapide

```bash
git clone https://github.com/Hajrudin-Zelef/IPCE.git
cd IPCE
npm install
cp .env.example .env   # puis renseigner les secrets
node server.js
```

→ **http://localhost:4600**

## ⚙️ Configuration (`.env`)

```env
# Sécurité (obligatoire)
JWT_SECRET=secret_au_moins_16_caracteres
ADMIN_PASSWORD=mot_de_passe_admin
DEFAULT_PASSWORD=mot_de_passe_commerciaux
GODMODE_PASSWORD=mot_de_passe_godmode
ADMIN_SECRET=secret_admin_dashboard

# CORS (origines autorisées, séparées par virgules)
CORS_ORIGINS=http://localhost:4600,https://ipce.neva-ci.pro

# IA (optionnel)
AI_MODE=free                    # free / standard / elite
OPENROUTER_API_KEY=sk-or-...
GROQ_API_KEY=gsk_...
NVIDIA_API_KEY=nvapi-...
DEEPSEEK_API_KEY=sk-...

# Email (optionnel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre.email@gmail.com
EMAIL_PASS=votre_mot_de_passe_app
ADMIN_EMAIL=admin@ipce.com

# Serveur
PORT=4600
TRUST_PROXY=true                # si derrière nginx/reverse proxy
```

## 🔑 Comptes par défaut

| Rôle | Nom | Mot de passe |
|------|-----|-------------|
| Admin | `admin` | `ADMIN_PASSWORD` du `.env` |
| Commercial | `Bilé` | `DEFAULT_PASSWORD` du `.env` |
| Commercial | `Arthème` | `DEFAULT_PASSWORD` du `.env` |
| Commercial | `Catherine` | `DEFAULT_PASSWORD` du `.env` |

> ⚠️ Les comptes sont créés au premier lancement. Changer les mots de passe en production.

## 🛡️ Sécurité

| Mesure | Détail |
|--------|--------|
| **JWT** | Token httpOnly, sameSite:strict, expire 8h, révoqué au logout (deny-list jti) |
| **2FA** | Optionnel — TOTP (Google Authenticator), setup/verify/disable |
| **Rate-limit** | Login : 10 tentatives / 15 min par IP |
| **CORS** | Allowlist stricte (`CORS_ORIGINS`), 403 JSON pour les origines non autorisées |
| **CSV Injection** | Caractères `= + - @` neutralisés dans les exports |
| **XSS** | Toute donnée utilisateur échappée avant affichage (escapeHtml) |
| **Headers** | X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS |
| **must_change_password** | Forcé si le flag est actif en base |
| **WebSocket** | Authentifié par JWT, heartbeat 30s, nettoyage connexions mortes |

## 📋 Fonctionnalités

### Commercial (`/dashboard.html`)
- **Tableau de bord** — KPIs personnels (CA, offres, BC, RDV, visites, contacts)
- **Nouvelle Collecte** — Saisie CA (FCFA), offres, BC, visites, contacts, zone, notes
- **RDV** — Prospects avec date, montant, statut (Prévu/Confirmé/Terminé/Offre/BC)
- **Historique** — Collectes personnelles (brouillon = modifiable, soumis = lecture seule)
- **Calendrier** — Vue mois + timeline, RDV et collectes
- **Documentation** — Guide intégré (FAQ, tuto)
- **Paramètres** — Profil, mode sombre/clair, notifications sonores

### Admin (`/admin/index.html`)
- **Vue d'ensemble** — KPIs globaux, leaderboard, validation des collectes
- **Vue journalière** — Donuts par commercial, vue calendaire quotidienne
- **Historique** — Toutes les collectes, filtres, pagination
- **Graphiques** — CA par commercial, pipeline/funnel, répartition, top performers
- **Suivi commercial** — Grille/liste, comparaison de performance
- **Performance** — Classement, taux de conversion RDV→Offre→BC
- **Analyse executive** — CA vs objectif, projection fin de mois, évolution mensuelle
- **Rapports** — Génération personnalisée avec filtres
- **Calendrier** — Vue admin de tous les RDV
- **Suivi prospects** — Pipeline complet (Prévu→Confirmé→Terminé→Offre→BC)
- **Rappels** — CRUD avec alertes retard/aujourd'hui
- **Validation** — Approuver/rejeter les collectes soumises
- **Business Insights** — Score santé (0-100), recommandations IA
- **Utilisateurs** — CRUD, rôles, reset MDP, activation 2FA
- **Logs** — Journal des actions système
- **Export** — Excel, CSV, PNG, PDF
- **Chat IA** — Assistant pour CA, prévisions, rapports
- **Notifications** — Temps réel via WebSocket

## 🏗️ Architecture

```
IPCE/
├── server.js                  # Entry point Express + WebSocket
├── db/init.js                 # SQLite + seed utilisateurs
├── lib/totp.js                # Génération/vérification TOTP (2FA)
├── middleware/auth.js          # JWT + RBAC + deny-list jti
├── routes/
│   ├── auth.js                # Login, logout, 2FA, change-password
│   ├── collectes.js           # CRUD collectes + RDV
│   ├── admin.js               # Stats, export, utilisateurs, reminders
│   └── ai.js                  # Chat IA, insights, prédictions
├── email/mailer.js            # Nodemailer (Gmail SMTP)
├── tests/unit/                # Tests Jest
├── public/
│   ├── index.html             # Login + 2FA
│   ├── dashboard.html         # Vue commercial
│   ├── commercial/js/         # Sections commercial (modules ES)
│   ├── admin/index.html       # Vue administrateur
│   └── admin/js/              # Sections admin (modules ES)
└── data/ipce.db               # Base SQLite (auto-créée)
```

## 📦 Dépendances

| Paquet | Usage |
|--------|-------|
| express | Serveur web |
| better-sqlite3 | Base SQLite |
| bcryptjs | Hashage mots de passe |
| jsonwebtoken | Auth JWT |
| cors | Contrôle d'origine |
| ws | WebSocket temps réel |
| exceljs | Export Excel |
| nodemailer | Emails |
| dotenv | Variables d'environnement |

## 📜 API Endpoints

### Auth (`/api/auth`)
| Méthode | Route | Description | Rôle |
|---------|-------|-------------|------|
| POST | `/login` | Connexion (retourne 2FA si activé) | Public |
| POST | `/login/2fa` | Connexion avec code TOTP | Public |
| POST | `/logout` | Déconnexion (révoque le token) | Tous |
| GET | `/me` | Profil utilisateur | Tous |
| POST | `/register` | Créer un compte | Admin |
| POST | `/verify-admin-secret` | Vérification secret admin | Public |
| POST | `/change-password` | Changer son mot de passe | Tous |
| GET | `/2fa/status` | Statut 2FA | Tous |
| POST | `/2fa/setup` | Activer 2FA (génère secret) | Tous |
| POST | `/2fa/verify` | Valider code TOTP | Tous |
| POST | `/2fa/disable` | Désactiver 2FA | Tous |

### Collectes (`/api/collectes`)
| Méthode | Route | Description | Rôle |
|---------|-------|-------------|------|
| GET | `/` | Mes collectes | Commercial |
| POST | `/` | Créer une collecte | Commercial |
| PUT | `/:id` | Modifier une collecte | Commercial |
| DELETE | `/:id` | Supprimer une collecte (brouillon) | Commercial |
| PATCH | `/:id/validate` | Soumettre pour validation | Commercial |
| GET | `/rdvs` | Mes RDV | Commercial |
| PATCH | `/rdvs/:id` | Modifier un RDV | Commercial |
| DELETE | `/rdvs/:id` | Supprimer un RDV | Commercial |

### Admin (`/api/admin`)
| Méthode | Route | Description | Rôle |
|---------|-------|-------------|------|
| GET | `/stats` | Statistiques globales | Admin |
| GET | `/pending` | Collectes en attente | Admin |
| PATCH | `/:id/approve` | Approuver une collecte | Admin |
| PATCH | `/:id/reject` | Rejeter une collecte | Admin |
| GET | `/export` | Export Excel | Admin |
| GET | `/export/csv` | Export CSV | Admin |
| GET | `/history` | Historique des collectes | Admin |
| GET | `/evolution` | Évolution CA | Admin |
| GET | `/users` | Liste des utilisateurs | Admin |
| PATCH | `/users/:id` | Modifier un utilisateur | Admin |
| DELETE | `/users/:id` | Supprimer un utilisateur | Admin |
| POST | `/reset` | Reset mot de passe | Admin |
| GET | `/reminders` | Liste des rappels | Admin |
| POST | `/reminders` | Créer un rappel | Admin |
| PATCH | `/reminders/:id` | Modifier un rappel | Admin |
| DELETE | `/reminders/:id` | Supprimer un rappel | Admin |
| GET | `/notifications` | Notifications | Admin |
| GET | `/logs` | Journal système | Admin |
| GET | `/settings` | Paramètres globaux | Admin |
| PATCH | `/settings` | Modifier paramètres | Admin |

### IA (`/api/ai`)
| Méthode | Route | Description | Rôle |
|---------|-------|-------------|------|
| POST | `/chat` | Chat IA | Tous |
| GET | `/insights` | Insights business | Tous |
| GET | `/predictions` | Prédictions | Tous |
| POST | `/report` | Générer un rapport | Tous |

## 🚀 Déploiement (systemd)

```ini
# /etc/systemd/system/ipce.service
[Unit]
Description=IPCE Dashboard - Pilotage Commercial
After=network.target

[Service]
Type=simple
User=sam
WorkingDirectory=/home/sam/IPCE
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ipce
sudo systemctl start ipce
sudo systemctl status ipce
```

## 📄 Licence

Projet privé — IPCE
