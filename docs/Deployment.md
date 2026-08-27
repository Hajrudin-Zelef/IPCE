# Guide de Déploiement — IPCE Dashboard

Guide complet de déploiement du Dashboard Pilotage Commercial IPCE en production.

---

## Table des matières

1. [Options de déploiement](#1-options-de-déploiement)
2. [Déploiement sur VPS (Ubuntu/Debian)](#2-déploiement-sur-vps-ubuntudebian)
3. [Configuration Nginx](#3-configuration-nginx)
4. [Configuration Systemd](#4-configuration-systemd)
5. [Déploiement avec Docker](#5-déploiement-avec-docker)
6. [Variables d'environnement de production](#6-variables-denvironnement-de-production)
7. [Sauvegarde de la base de données](#7-sauvegarde-de-la-base-de-données)
8. [Monitoring et logs](#8-monitoring-et-logs)
9. [Mise à jour en production](#9-mise-à-jour-en-production)
10. [Sécurité en production](#10-sécurité-en-production)
11. [Performances](#11-performances)

---

## 1. Options de déploiement

| Option | Idéal pour | Complexité | Coût |
|--------|-----------|------------|------|
| **A: Serveur dédié/VPS** | Production, contrôle total | Moyenne | ~5-20€/mois |
| **B: Docker** | Portabilité, reproductibilité | Moyenne | Selon l'hébergeur |
| **C: PaaS (Railway, Render)** | Rapidité, pas de maintenance serveur | Faible | ~5-25€/mois |

### Option A: Serveur dédié/VPS (recommandé pour production)

Recommandé pour un contrôle total sur l'infrastructure, les performances et la sécurité. Idéal pour les serveurs Ubuntu/Debian.

### Option B: Docker

Pas de Dockerfile n'est fourni dans le dépôt. Le guide ci-dessous ([Section 5](#5-déploiement-avec-docker)) explique comment en créer un.

### Option C: PaaS (Railway, Render, etc.)

Déploiement simplifié via un service managé. Le serveur Node.js est directement exécuté par la plateforme. Pas de gestion de serveur, mais moins de contrôle.

---

## 2. Déploiement sur VPS (Ubuntu/Debian)

### Prérequis

| Composant | Version | Notes |
|-----------|---------|-------|
| **Système** | Ubuntu 22.04+ / Debian 12+ | Serveur avec accès root ou sudo |
| **Node.js** | 22.x | Via NodeSource |
| **npm** | Inclus avec Node.js | Gestionnaire de paquets |
| **nginx** | 1.18+ | Reverse proxy |
| **Certbot** | Dernière version | Certificats SSL Let's Encrypt |

### Étape 1 — Connexion au serveur

```bash
ssh root@VOTRE_IP_SERVEUR
```

Ou avec un utilisateur non-root :

```bash
ssh utilisateur@VOTRE_IP_SERVEUR
```

### Étape 2 — Mettre à jour le système

```bash
sudo apt update && sudo apt upgrade -y
```

### Étape 3 — Installer Node.js 22.x (via NodeSource)

```bash
# Installer curl si non présent
sudo apt install -y curl

# Ajouter le dépôt NodeSource pour Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Installer Node.js
sudo apt install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v22.x.x
npm --version
```

### Étape 4 — Installer nginx et Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Étape 5 — Cloner le dépôt

```bash
# Créer un répertoire dédié
sudo mkdir -p /var/www
cd /var/www

# Cloner
sudo git clone https://github.com/Hajrudin-Zelef/IPCE.git
cd IPCE

# Créer un utilisateur dédié (bonne pratique)
sudo useradd -r -s /bin/false ipce
sudo chown -R ipce:ipce /var/www/IPCE
```

### Étape 6 — Installer les dépendances

```bash
# En tant qu'utilisateur ipce
sudo -u ipce npm install --production
```

### Étape 7 — Configurer .env (valeurs de production)

```bash
cp .env.example .env
```

Éditez le fichier avec vos valeurs de production :

```bash
nano .env
```

```env
# === SÉCURITÉ (obligatoire) ===
JWT_SECRET=<generer avec la commande ci-dessous>
ADMIN_PASSWORD=<mot_de_passe_fort_unique>
DEFAULT_PASSWORD=<mot_de_passe_fort_unique>

# === SERVEUR ===
PORT=4600

# === SMTP (optionnel) ===
EMAIL_HOST=smtp.votredomaine.com
EMAIL_PORT=587
EMAIL_USER=noreply@votredomaine.com
EMAIL_PASS=<mot_de_passe_smtp>
ADMIN_EMAIL=admin@votredomaine.com
```

**Générer un JWT_SECRET sécurisé :**

```bash
openssl rand -hex 32
```

Copiez la sortie et collez-la dans la variable `JWT_SECRET`.

### Étape 8 — Créer le fichier de service systemd

Voir la [Section 4](#4-configuration-systemd) pour le fichier complet.

```bash
sudo nano /etc/systemd/system/ipce.service
```

Copiez le contenu de la section 4, puis :

```bash
# Recharger systemd
sudo systemctl daemon-reload

# Activer le service au démarrage
sudo systemctl enable ipce
```

### Étape 9 — Configurer nginx

Voir la [Section 3](#3-configuration-nginx) pour le fichier complet.

```bash
sudo nano /etc/nginx/sites-available/ipce
```

Copiez le contenu de la section 3, puis :

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/ipce /etc/nginx/sites-enabled/

# Supprimer la config par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la config
sudo nginx -t

# Recharger nginx
sudo systemctl reload nginx
```

### Étape 10 — Activer HTTPS avec Let's Encrypt

```bash
# Obtenir le certificat (remplacez avec votre domaine)
sudo certbot --nginx -d ipce.votredomaine.com

# Renouvellement automatique (vérifiez que le cron tourne)
sudo systemctl status certbot.timer
```

Le renouvellement automatique est configuré par défaut via le timer systemd `certbot.timer`.

### Étape 11 — Configurer le pare-feu

```bash
# Autoriser HTTP et HTTPS
sudo ufw allow 'Nginx Full'

# Autoriser SSH
sudo ufw allow OpenSSH

# Activer le pare-feu
sudo ufw enable
```

### Étape 12 — Démarrer le service

```bash
# Démarrer
sudo systemctl start ipce

# Vérifier le statut
sudo systemctl status ipce

# Voir les logs
sudo journalctl -u ipce -f
```

---

## 3. Configuration Nginx

### Fichier complet : `/etc/nginx/sites-available/ipce`

```nginx
# Redirection HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ipce.votredomaine.com;

    # Pour Let's Encrypt (vérification de domaine)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuration HTTPS principale
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ipce.votredomaine.com;

    # --- SSL/TLS (Let's Encrypt) ---
    ssl_certificate /etc/letsencrypt/live/ipce.votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ipce.votredomaine.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # --- Sécurité ---
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';" always;

    # --- Gzip ---
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml;

    # --- Proxy vers Node.js ---
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
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
    }

    # --- Fichiers statiques (optionnel — optimisation) ---
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:4600;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # --- Bloquer l'accès aux fichiers sensibles ---
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~* \.(db|sqlite|db-journal|db-wal|db-shm)$ {
        deny all;
    }

    # --- Logs ---
    access_log /var/log/nginx/ipce_access.log;
    error_log /var/log/nginx/ipce_error.log;
}
```

### Test et rechargement

```bash
# Vérifier la syntaxe
sudo nginx -t

# Recharger sans interruption
sudo systemctl reload nginx
```

---

## 4. Configuration Systemd

### Fichier complet : `/etc/systemd/system/ipce.service`

```ini
[Unit]
Description=IPCE Dashboard — Tableau de bord pilotage commercial
Documentation=https://github.com/Hajrudin-Zelef/IPCE
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=ipce
Group=ipce
WorkingDirectory=/var/www/IPCE

# Environnement
EnvironmentFile=/var/www/IPCE/.env

# Commande de démarrage
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP $MAINPID

# Redémarrage
Restart=on-failure
RestartSec=3
StartLimitBurst=5
StartLimitIntervalSec=60

# Limites ressources
MemoryMax=512M
CPUQuota=150%

# Sécurité
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/www/IPCE/data
ReadWritePaths=/var/www/IPCE/logs
PrivateTmp=yes

# Logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ipce

# Limites
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### Commandes systemd utiles

```bash
# Recharger après modification
sudo systemctl daemon-reload

# Démarrer
sudo systemctl start ipce

# Arrêter
sudo systemctl stop ipce

# Redémarrer
sudo systemctl restart ipce

# Voir le statut
sudo systemctl status ipce

# Activer au démarrage
sudo systemctl enable ipce

# Désactiver au démarrage
sudo systemctl disable ipce
```

---

## 5. Déploiement avec Docker

### Dockerfile (build multi-étapes)

```dockerfile
# --- Étape 1 : Installation des dépendances ---
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Étape 2 : Image de production ---
FROM node:22-alpine AS production

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S ipce && \
    adduser -S ipce -u 1001 -G ipce

WORKDIR /app

# Copier les dépendances
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY package.json server.js ./
COPY db/ ./db/
COPY routes/ ./routes/
COPY middleware/ ./middleware/
COPY email/ ./email/
COPY public/ ./public/

# Créer le répertoire de données
RUN mkdir -p /app/data && chown -R ipce:ipce /app

USER ipce

# Port
EXPOSE 4600

# Variable d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=4600

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4600/api/health || exit 1

# Démarrage
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  ipce:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ipce-dashboard
    restart: always
    ports:
      - "4600:4600"
    env_file:
      - .env
    volumes:
      # Persister la base de données SQLite
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4600/api/health"]
      interval: 30s
      timeout: 5s
      start_period: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Optionnel : nginx en tant que reverse proxy
  nginx:
    image: nginx:alpine
    container_name: ipce-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/html:ro
    depends_on:
      - ipce
```

### .dockerignore

```
node_modules
npm-debug.log
.env
.env.example
.git
.gitignore
docs/
*.md
data/*.db
data/*.db-journal
data/*.db-wal
data/*.db-shm
Dockerfile
docker-compose.yml
.dockerignore
```

### Commandes Docker

```bash
# Construire l'image
docker compose build

# Démarrer
docker compose up -d

# Voir les logs
docker compose logs -f ipce

# Arrêter
docker compose down

# Reconstruire après modification
docker compose up -d --build
```

---

## 6. Variables d'environnement de production

| Variable | Requis | Valeur recommandée | Description |
|----------|--------|-------------------|-------------|
| `JWT_SECRET` | **Oui** | `openssl rand -hex 32` | Secret pour signer les tokens JWT. Minimum 16 caractères. |
| `ADMIN_PASSWORD` | **Oui** | Mot de passe fort unique (12+ caractères) | Mot de passe initial de l'utilisateur `admin`. |
| `DEFAULT_PASSWORD` | **Oui** | Mot de passe fort unique (12+ caractères) | Mot de passe initial des commerciaux. |
| `PORT` | Non | `4600` | Port du serveur HTTP. |
| `EMAIL_HOST` | Non | `smtp.votredomaine.com` | Hôte du serveur SMTP. |
| `EMAIL_PORT` | Non | `587` | Port SMTP (587 = STARTTLS, 465 = SSL). |
| `EMAIL_USER` | Non | `noreply@votredomaine.com` | Adresse d'envoi SMTP. |
| `EMAIL_PASS` | Non | `<mot_de_passe_application>` | Mot de passe d'application SMTP. |
| `ADMIN_EMAIL` | Non | `admin@votredomaine.com` | Adresse de réception des notifications. |

### Génération de secrets sécurisés

```bash
# JWT_SECRET (64 caractères hexadécimaux)
openssl rand -hex 32

# ADMIN_PASSWORD (mot de passe fort aléatoire)
openssl rand -base64 24

# Ou combinaison de caractères alphanumériques
tr -dc 'A-Za-z0-9!@#$%^&*' < /dev/urandom | head -c 24; echo
```

> **Règles critiques :**
> - Ne jamais utiliser de mots de passe faibles ou prédéfinis
> - Ne jamais commiter le fichier `.env` dans un dépôt Git
> - Ne jamais réutiliser un même `JWT_SECRET` entre environnements
> - Changer les mots de passe régulièrement

---

## 7. Sauvegarde de la base de données

### Emplacement de la base

```
data/ipce.db
```

La base SQLite utilise le mode **WAL** (Write-Ahead Logging) pour de meilleures performances. En mode WAL, trois fichiers coexistent :

| Fichier | Description |
|---------|-------------|
| `ipce.db` | Base de données principale |
| `ipce.db-wal` | Journal des écritures en attente |
| `ipce.db-shm` | Mémoire partagée pour la synchronisation |

### Sauvegarde manuelle

```bash
# Méthode 1 : copie directe (utiliser si le serveur est arrêté)
cp /var/www/IPCE/data/ipce.db /var/www/IPCE/data/ipce.db.bak

# Méthode 2 : sauvegarde via SQLite (sûr, même si le serveur tourne)
sqlite3 /var/www/IPCE/data/ipce.db ".backup '/var/www/IPCE/data/ipce.db.bak'"

# Méthode 3 : sauvegarde avec timestamp
BACKUP_DIR="/var/backups/ipce"
mkdir -p "$BACKUP_DIR"
sqlite3 /var/www/IPCE/data/ipce.db ".backup '$BACKUP_DIR/ipce_$(date +%Y%m%d_%H%M%S).db'"
```

### Script de sauvegarde automatique

Créez le fichier `/usr/local/bin/ipce-backup.sh` :

```bash
#!/bin/bash

# === Configuration ===
DB_PATH="/var/www/IPCE/data/ipce.db"
BACKUP_DIR="/var/backups/ipce"
KEEP_DAYS=30

# Créer le répertoire de sauvegarde
mkdir -p "$BACKUP_DIR"

# Nom du fichier avec timestamp
BACKUP_FILE="$BACKUP_DIR/ipce_$(date +%Y%m%d_%H%M%S).db"

# Sauvegarder la base
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Vérifier que la sauvegarde est valide
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "[$(date)] Sauvegarde réussie : $BACKUP_FILE"
else
    echo "[$(date)] ERREUR : La sauvegarde a échoué" >&2
    exit 1
fi

# Nettoyer les anciennes sauvegardes
find "$BACKUP_DIR" -name "ipce_*.db" -mtime +$KEEP_DAYS -delete

echo "[$(date)] Nettoyage terminé. Sauvegardes conservées : $(ls "$BACKUP_DIR"/ipce_*.db 2>/dev/null | wc -l)"
```

Rendez le script exécutable et planifiez-le :

```bash
# Rendre exécutable
sudo chmod +x /usr/local/bin/ipce-backup.sh

# Tester manuellement
sudo /usr/local/bin/ipce-backup.sh

# Planifier tous les jours à 2h du matin
sudo crontab -e
```

Ajoutez cette ligne dans le crontab :

```
0 2 * * * /usr/local/bin/ipce-backup.sh >> /var/log/ipce-backup.log 2>&1
```

---

## 8. Monitoring et logs

### Logs de l'application

L'application utilise `console.log` et `console.error`. En mode systemd, les logs sont redirigés vers journald.

```bash
# Voir les logs en temps réel
sudo journalctl -u ipce -f

# Voir les 100 dernières lignes
sudo journalctl -u ipce -n 100

# Voir les erreurs uniquement
sudo journalctl -u ipce -p err

# Voir les logs depuis une date
sudo journalctl -u ipce --since "2026-01-01"
```

### Health check

L'endpoint de health check est disponible à :

```
GET /api/health
```

Réponse attendue :

```json
{
  "status": "ok",
  "uptime": 12345.67,
  "timestamp": "2026-08-26T10:00:00.000Z"
}
```

### Vérification avec curl

```bash
curl -s http://localhost:4600/api/health | python3 -m json.tool
```

### Logs nginx

```bash
# Accès
sudo tail -f /var/log/nginx/ipce_access.log

# Erreurs
sudo tail -f /var/log/nginx/ipce_error.log
```

### Rotation des logs

La rotation des logs nginx est configurée par défaut via `/etc/logrotate.d/nginx`. Pour les logs de l'application (journald), systemd gère automatiquement la rotation.

Pour limiter la taille des logs journald :

```bash
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
SystemMaxUse=200M
SystemMaxFileSize=50M
MaxRetentionSec=30day
```

Puis redémarrez journald :

```bash
sudo systemctl restart systemd-journald
```

### Monitoring avec un script de vérification

Créez `/usr/local/bin/ipce-healthcheck.sh` :

```bash
#!/bin/bash

URL="http://localhost:4600/api/health"
LOG_FILE="/var/log/ipce-healthcheck.log"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")

if [ "$RESPONSE" != "200" ]; then
    echo "[$(date)] ERREUR : Health check échoué (HTTP $RESPONSE)" >> "$LOG_FILE"
    # Optionnel : envoyer une alerte email
    # echo "IPCE Health Check failed" | mail -s "IPCE Alert" admin@votredomaine.com
    exit 1
else
    echo "[$(date)] OK : Health check réussi (HTTP $RESPONSE)" >> "$LOG_FILE"
    exit 0
fi
```

---

## 9. Mise à jour en production

### Procédure de mise à jour

```bash
# 1. Se connecter au serveur
ssh root@VOTRE_IP_SERVEUR

# 2. Sauvegarder la base de données
sqlite3 /var/www/IPCE/data/ipce.db ".backup '/var/backups/ipce/pre_update_$(date +%Y%m%d_%H%M%S).db'"

# 3. Basculer sur le répertoire du projet
cd /var/www/IPCE

# 4. Récupérer les dernières modifications
sudo -u ipce git pull origin main

# 5. Installer les dépendances (si de nouveaux paquets ont été ajoutés)
sudo -u ipce npm install --production

# 6. Redémarrer le service
sudo systemctl restart ipce

# 7. Vérifier que le service tourne
sudo systemctl status ipce
curl -s http://localhost:4600/api/health
```

### Zéro downtime

Pour une mise à jour sans interruption, deux approches :

**Approche 1 : Rolling update (simple)**

```bash
# Mettre à jour et redémarrer — l'interruption est < 1 seconde
sudo systemctl restart ipce
```

**Approche 2 : Blue/Green (avancé)**

```bash
# 1. Copier le code dans un nouveau répertoire
cp -r /var/www/IPCE /var/www/IPCE_new

# 2. Mettre à jour le nouveau répertoire
cd /var/www/IPCE_new
sudo -u ipce git pull origin main
sudo -u ipce npm install --production

# 3. Tester le nouveau code
PORT=4601 node server.js &
curl http://localhost:4601/api/health

# 4. Basculer nginx
sudo sed -i 's/127.0.0.1:4600/127.0.0.1:4601/' /etc/nginx/sites-available/ipce
sudo nginx -t && sudo systemctl reload nginx

# 5. Arrêter l'ancien code
kill $(pgrep -f "PORT=4601 node server.js")

# 6. Nettoyer
rm -rf /var/www/IPCE
mv /var/www/IPCE_new /var/www/IPCE

# 7. Mettre à jour la config systemd si nécessaire
sudo systemctl daemon-reload
```

> **Note :** L'approche blue/green est rarement nécessaire pour un dashboard interne. Le redémarrage standard convient dans la majorité des cas.

---

## 10. Sécurité en production

### Checklist de sécurité

| Mesure | Statut | Commande/Détail |
|--------|--------|-----------------|
| HTTPS actif | **Obligatoire** | `certbot --nginx -d domaine.com` |
| JWT_SECRET fort | **Obligatoire** | `openssl rand -hex 32` |
| Mots de passe forts | **Obligatoire** | 12+ caractères, aléatoires |
| Pare-feu actif | **Recommandé** | `sudo ufw enable` |
| Utilisateur dédié | **Recommandé** | `useradd -r -s /bin/false ipce` |
| Logs monitorés | **Recommandé** | `journalctl -u ipce -f` |
| Sauvegardes auto | **Recommandé** | Cron + script de backup |
| Mises à jour OS | **Recommandé** | `apt update && apt upgrade` |

### Configuration UFW (pare-feu)

```bash
# Vérifier le statut
sudo ufw status

# Règles
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Activer
sudo ufw enable
```

### Durcissement nginx

Les headers de sécurité sont déjà inclus dans la configuration nginx de la [Section 3](#3-configuration-nginx). Vérifiez-les :

```bash
curl -I https://ipce.votredomaine.com
```

Headers attendus :

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'self'; ...
```

### Protection contre les attaques

L'application intègre déjà :

- **Rate limiting** sur `/api/auth/login` : 10 tentatives par IP / 15 minutes
- **JWT** avec expiration configurable
- **RBAC** (admin/commercial) via middleware
- **Headers de sécurité** (HSTS, CSP, X-Frame-Options, etc.)

### Rotation des secrets

En cas de compromission du `JWT_SECRET` :

1. Générer un nouveau secret : `openssl rand -hex 32`
2. Mettre à jour le fichier `.env`
3. Redémarrer le service : `sudo systemctl restart ipce`
4. **Tous les utilisateurs seront déconnectés** (les anciens tokens JWT ne seront plus valides)

---

## 11. Performances

### SQLite WAL mode

Le mode WAL est activé par défaut dans l'application. Il permet des lectures concurrentes avec les écritures.

Vérifier le mode :

```bash
sqlite3 /var/www/IPCE/data/ipce.db "PRAGMA journal_mode;"
```

Si le mode n'est pas WAL, l'activer :

```bash
sqlite3 /var/www/IPCE/data/ipce.db "PRAGMA journal_mode=WAL;"
```

### Cache des fichiers statiques

La configuration nginx inclut le cache des fichiers statiques (CSS, JS, images) avec un TTL de 7 jours :

```nginx
expires 7d;
add_header Cache-Control "public, immutable";
```

### Mode cluster Node.js (optionnel)

Pour exploiter tous les cœurs du CPU, utiliser `pm2` ou le module `cluster` :

```bash
# Installer pm2
sudo npm install -g pm2

# Démarrer en mode cluster
cd /var/www/IPCE
sudo -u ipce pm2 start server.js -i max --name ipce

# Voir les processus
sudo -u ipce pm2 status

# Logs
sudo -u ipce pm2 logs ipce

# Sauvegarder la config
sudo -u ipce pm2 save

# Démarrage automatique
sudo -u ipce pm2 startup
```

### Considérations mémoire

| Composant | Mémoire typique | Limite recommandée |
|-----------|----------------|-------------------|
| Node.js (IPCE) | ~50-100 MB | 512 MB (via systemd) |
| SQLite | ~5-20 MB | Limité par la taille des données |
| nginx | ~5-10 MB | Géré par le système |

Sur un VPS avec 1 Go de RAM, l'application fonctionne sans problème. Pour 512 Mo, surveillez la consommation.

### Surveillance de la mémoire

```bash
# Voir la consommation du processus
ps aux | grep node

# Voir la mémoire totale
free -h

# Surveiller en continu
watch -n 5 "ps aux | grep node | grep -v grep"
```

---

## Annexe : Commandes rapides

| Action | Commande |
|--------|----------|
| Démarrer le service | `sudo systemctl start ipce` |
| Arrêter le service | `sudo systemctl stop ipce` |
| Redémarrer le service | `sudo systemctl restart ipce` |
| Voir le statut | `sudo systemctl status ipce` |
| Voir les logs | `sudo journalctl -u ipce -f` |
| Health check | `curl http://localhost:4600/api/health` |
| Sauvegarder la DB | `sqlite3 data/ipce.db ".backup 'data/ipce.db.bak'"` |
| Recharger nginx | `sudo systemctl reload nginx` |
| Vérifier SSL | `sudo certbot certificates` |
| Renouveler SSL | `sudo certbot renew` |
