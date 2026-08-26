# Guide de dépannage — IPCE Dashboard

Ce document couvre les problèmes courants rencontrés lors du développement et de l'utilisation du dashboard IPCE, ainsi que leurs solutions.

---

## 1. Problèmes de démarrage

### « JWT_SECRET trop court »

**Cause :** La variable `JWT_SECRET` n'est pas définie ou fait moins de 16 caractères dans le fichier `.env`.

**Solution :**

```bash
# Générer un secret sécurisé (32 octets hexadécimaux = 64 caractères)
openssl rand -hex 32
```

Copiez le résultat dans `.env` :

```
JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

---

### « ADMIN_PASSWORD manquant dans .env »

**Cause :** La variable `ADMIN_PASSWORD` n'est pas définie dans le fichier `.env`.

**Solution :** Ajoutez-la dans `.env` :

```
ADMIN_PASSWORD=VotreMotDePasseAdmin
```

Le mot de passe doit contenir au minimum 8 caractères.

---

### « DEFAULT_PASSWORD manquant dans .env »

**Cause :** La variable `DEFAULT_PASSWORD` n'est pas définie dans le fichier `.env`.

**Solution :** Ajoutez-la dans `.env` :

```
DEFAULT_PASSWORD=VotreMotDePasseParDefaut
```

Ce mot de passe sera utilisé pour les nouveaux utilisateurs lors de leur création.

---

### Port déjà utilisé

**Cause :** Un autre processus utilise déjà le port 4600 (ou le port défini dans `PORT`).

**Identifier le processus :**

```bash
lsof -i :4600
```

**Solution :**

1. Tuer le processus en conflit :
   ```bash
   kill <PID>
   ```

2. Ou changer de port dans `.env` :
   ```
   PORT=4601
   ```

---

### Erreur better-sqlite3

**Cause :** Le module natif `better-sqlite3` n'est pas compilé pour la version de Node.js en cours d'utilisation.

**Solution :**

```bash
# Recompiler le module natif
npm rebuild better-sqlite3

# Ou réinstaller complètement
rm -rf node_modules package-lock.json
npm install
```

Vérifiez que vous utilisez la bonne version de Node.js :

```bash
node --version
```

---

## 2. Problèmes d'authentification

### « Identifiants incorrects »

**Cause :** Le nom d'utilisateur ou le mot de passe est incorrect.

**Vérifications :**

- Le champ `nom` est **sensible à la casse** — `Admin` ≠ `admin`
- Le mot de passe doit correspondre exactement à la valeur de `DEFAULT_PASSWORD` dans `.env`, ou au mot de passe défini lors de la création/modification de l'utilisateur

**Solution :**

1. Vérifiez le contenu de `.env` :
   ```bash
   grep DEFAULT_PASSWORD .env
   ```

2. Vérifiez les utilisateurs en base :
   ```bash
   sqlite3 data/ipce.db "SELECT nom, role FROM users;"
   ```

3. Réinitialisez le mot de passe si nécessaire :
   ```bash
   sqlite3 data/ipce.db "UPDATE users SET password_hash = '<hash>' WHERE nom = 'admin';"
   ```

---

### « Session expirée »

**Cause :** Le token JWT a expiré (durée de validité : 8 heures).

**Solution :** Reconnectez-vous via `/login`. La session sera renouvelée automatiquement.

---

### « Non authentifié »

**Cause :** Aucun token n'est présent dans le cookie ou l'en-tête `Authorization`.

**Vérifications :**

1. Les cookies sont-ils activés dans le navigateur ?
2. Le cookie `token` est-il bien défini ? (Outils de développement → Application → Cookies)
3. La configuration CORS autorise-t-elle les credentials ?

---

### Redirection infinie sur /login

**Cause :** La fonction `checkAuth()` échoue systématiquement, provoquant une boucle de redirection.

**Vérifications :**

1. L'endpoint `/api/auth/me` fonctionne-t-il ?
   ```bash
   curl -v http://localhost:4600/api/auth/me -H "Cookie: token=<votre_token>"
   ```

2. Le `JWT_SECRET` est-il identique entre les redémarrages du serveur ? Un changement invalide tous les tokens existants.

3. Vérifiez les logs du serveur pour des erreurs de décodage JWT.

---

## 3. Problèmes de la base de données

### « SQLITE_CONSTRAINT: UNIQUE constraint failed »

**Cause :** Tentative d'insertion d'un doublon dans une colonne avec contrainte `UNIQUE` (généralement `nom` dans la table `users`).

**Solution :** Choisissez un nom d'utilisateur différent. Vérifiez les utilisateurs existants :

```bash
sqlite3 data/ipce.db "SELECT nom FROM users;"
```

---

### Database locked

**Cause :** Plusieurs processus accèdent simultanément à la base SQLite.

**Solution :**

1. Assurez-vous qu'**un seul processus Node.js** accède à la base :
   ```bash
   ps aux | grep node
   ```

2. Vérifiez que le mode WAL (Write-Ahead Logging) est activé :
   ```bash
   sqlite3 data/ipce.db "PRAGMA journal_mode;"
   ```

3. Si besoin, désactivez les autres processus ou redémarrez le serveur.

---

### Database corrupted

**Cause :** Fichier de base de données endommagé (coupure, erreur d'écriture, etc.).

**Solution :**

1. Tentez une récupération :
   ```bash
   sqlite3 data/ipce.db ".recover" | sqlite3 data/ipce_backup.db
   mv data/ipce_backup.db data/ipce.db
   ```

2. Si la récupération échoue, supprimez et recréez la base :
   ```bash
   rm data/ipce.db
   # Le serveur recréera la base au prochain démarrage
   node src/init.js
   ```

3. **Prévention :** Effectuez des sauvegardes régulières :
   ```bash
   cp data/ipce.db data/ipce_backup_$(date +%Y%m%d).db
   ```

---

### Tables non créées

**Cause :** Le script `init.js` a échoué lors de la première exécution.

**Vérifications :**

1. Le fichier `.env` contient toutes les variables requises :
   ```bash
   grep -E "^(JWT_SECRET|ADMIN_PASSWORD|DEFAULT_PASSWORD|PORT)" .env
   ```

2. Le répertoire `data/` existe et est accessible en écriture :
   ```bash
   ls -la data/
   ```

3. Exécutez manuellement l'initialisation :
   ```bash
   node src/init.js
   ```

---

## 4. Problèmes d'API

### Erreur 401 sur tous les endpoints

**Cause :** Le token JWT n'est pas accepté par le serveur.

**Vérifications :**

1. Le `JWT_SECRET` a-t-il changé entre deux redémarrages du serveur ?
2. Le domaine du cookie correspond-il à l'hôte en cours ?
3. Le serveur utilise-t-il HTTPS alors que la requête est en HTTP (ou inversement) ?

**Solution :**

- Reconnectez-vous pour obtenir un nouveau token
- Vérifiez la cohérence du `JWT_SECRET` dans `.env`
- Assurez-vous que le protocole (HTTP/HTTPS) est cohérent

---

### Erreur 403 sur les endpoints admin

**Cause :** Le rôle de l'utilisateur connecté n'est pas `admin`.

**Solution :**

1. Vérifiez le rôle via l'API :
   ```bash
   curl http://localhost:4600/api/auth/me -H "Cookie: token=<token>"
   ```

2. Mettez à jour le rôle en base si nécessaire :
   ```bash
   sqlite3 data/ipce.db "UPDATE users SET role = 'admin' WHERE nom = 'utilisateur';"
   ```

---

### Erreur 400 sur la création de collecte

**Cause :** Le rôle de l'utilisateur n'est pas `commercial`, ou des champs obligatoires sont manquants.

**Solution :**

1. Vérifiez le rôle de l'utilisateur connecté
2. Vérifiez que tous les champs requis sont envoyés dans le body de la requête
3. Consultez les logs du serveur pour les détails de la validation

---

### Réponses vides

**Cause :** La base de données existe mais ne contient pas de données, ou le mode WAL ne fonctionne pas correctement.

**Vérifications :**

1. Vérifiez l'existence et la taille de la base :
   ```bash
   ls -la data/ipce.db
   ```

2. Comptez les enregistrements :
   ```bash
   sqlite3 data/ipce.db "SELECT name, (SELECT count(*) FROM users) as users, (SELECT count(*) FROM collectes) as collectes FROM sqlite_master WHERE type='table';"
   ```

3. Vérifiez le mode WAL :
   ```bash
   sqlite3 data/ipce.db "PRAGMA journal_mode;"
   ```

---

## 5. Problèmes frontend

### « Chargement... » sur le tableau de bord admin

**Cause :** Erreur d'import de module JavaScript.

**Solution :**

1. Ouvrez la console du navigateur (F12 → Console) et identifiez l'erreur spécifique
2. Vérifiez que tous les fichiers JS existent dans `public/admin/js/` :
   ```bash
   ls public/admin/js/
   ```
3. Vérifiez les imports dans les fichiers JS pour détecter les références incorrectes
4. Testez chaque endpoint API directement pour confirmer que le backend fonctionne

---

### Graphiques non affichés

**Cause :** La bibliothèque Chart.js n'a pas été chargée depuis le CDN.

**Vérifications :**

1. Avez-vous une connexion internet active ?
2. Consultez la console du navigateur pour des erreurs de chargement CDN
3. Vérifiez que la balise `<script>` Chart.js est présente dans le HTML :
   ```bash
   grep -r "chart.js" public/
   ```

---

### Notifications non affichées

**Cause :** Le fichier `notifications.js` n'est pas chargé.

**Solution :**

1. Vérifiez la balise `<script>` dans `index.html` :
   ```bash
   grep "notifications.js" public/admin/index.html
   ```

2. Vérifiez que le fichier existe :
   ```bash
   ls -la public/admin/js/notifications.js
   ```

3. Ouvrez la console du navigateur pour des erreurs d'exécution

---

### Calendrier ne s'affiche pas les RDVs

**Cause :** Aucun RDV n'est trouvé dans les collectes validées ou approuvées.

**Solution :**

1. Testez l'endpoint API :
   ```bash
   curl http://localhost:4600/api/collectes/rdvs -H "Cookie: token=<token>"
   ```

2. Vérifiez les collectes avec date_rdv en base :
   ```bash
   sqlite3 data/ipce.db "SELECT id, statut, date_rdv FROM collectes WHERE date_rdv IS NOT NULL;"
   ```

3. Assurez-vous que les collectes ont le statut `validee` ou `approuvee`

---

## 6. Problèmes d'email

### « Configuration non définie — email non envoyé »

**Cause :** La variable `EMAIL_USER` n'est pas définie ou contient un texte placeholder (ex : `votre_email@gmail.com`).

**Solution :**

1. Configurez les identifiants SMTP réels dans `.env` :
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=votre.email@gmail.com
   EMAIL_PASS=votre_mot_de_passe
   ```

2. Pour Gmail avec l'authentification à deux facteurs (2FA) activée, utilisez un **mot de passe d'application** :
   - Allez dans https://myaccount.google.com/apppasswords
   - Générez un mot de passe dédié
   - Utilisez-le dans `EMAIL_PASS`

---

### L'envoi d'email échoue

**Vérifications :**

1. Le serveur SMTP est-il accessible ?
   ```bash
   telnet smtp.gmail.com 587
   ```

2. Les identifiants sont-ils corrects ?
   - Gmail : utilisez un mot de passe d'application si la 2FA est activée
   - Vérifiez que l'adresse email est bien la bonne

3. Le port SMTP est-il correct ?
   - 587 : TLS (STARTTLS)
   - 465 : SSL/TLS
   - 25 : non sécurisé (déconseillé)

4. Consultez les logs du serveur pour le message d'erreur détaillé

---

## 7. Problèmes de performance

### Serveur lent

**Cause :** La base de données SQLite est devenue volumineuse ou le mode WAL n'est pas optimal.

**Solution :**

1. Nettoyez les anciennes collectes :
   ```bash
   sqlite3 data/ipce.db "DELETE FROM collectes WHERE created_at < datetime('now', '-1 year');"
   ```

2. Effectuez un checkpoint WAL :
   ```bash
   sqlite3 data/ipce.db "PRAGMA wal_checkpoint(TRUNCATE);"
   ```

3. Compressez la base :
   ```bash
   sqlite3 data/ipce.db "VACUUM;"
   ```

---

### Problèmes de mémoire

**Cause :** Le processus Node.js dépasse la limite de mémoire par défaut.

**Solution :**

1. Augmentez la limite mémoire en lançant le serveur avec :
   ```bash
   node --max-old-space-size=4096 src/server.js
   ```

2. Surveillez l'utilisation mémoire :
   ```bash
   node -e "const v8 = require('v8'); console.log(v8.getHeapStatistics());"
   ```

3. Vérifiez les fuites de mémoire en monitorant le processus :
   ```bash
   top -p $(pgrep -f "node src/server")
   ```

---

## 8. Commandes de diagnostic

### Vérifier l'état du serveur

```bash
# Test de santé rapide
curl -s http://localhost:4600/api/auth/me | head -c 200

# Vérifier que le serveur écoute
curl -I http://localhost:4600
```

### Vérifier la base de données

```bash
# Lister les tables
sqlite3 data/ipce.db ".tables"

# Compter les enregistrements
sqlite3 data/ipce.db "SELECT name, (SELECT count(*) FROM users) as users, (SELECT count(*) FROM collectes) as collectes, (SELECT count(*) FROM settings) as settings;"

# Vérifier le mode journal
sqlite3 data/ipce.db "PRAGMA journal_mode;"

# Vérifier l'intégrité
sqlite3 data/ipce.db "PRAGMA integrity_check;"
```

### Consulter les logs

```bash
# Logs en temps réel (si le serveur est lancé en arrière-plan)
journalctl -u ipce-dashboard -f

# Logs du processus Node
# (dépend de la méthode de lancement — PM2, systemd, etc.)
pm2 logs ipce-dashboard 2>/dev/null || echo "PM2 non utilisé"

# Afficher les erreurs récentes
grep -i error logs/*.log 2>/dev/null || echo "Pas de fichiers de logs"
```

### Vérifier l'utilisation des ports

```bash
# Port 4600 en cours d'utilisation
lsof -i :4600

# Tous les ports Node.js
lsof -i -P -n | grep node

# Vérifier les connexions actives
ss -tlnp | grep 4600
```

### Tester les endpoints API

```bash
# Obtenir un token
TOKEN=$(curl -s -X POST http://localhost:4600/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nom":"admin","password":"VotreMotDePasse"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Tester /api/auth/me
curl -s http://localhost:4600/api/auth/me \
  -H "Cookie: token=$TOKEN" | python3 -m json.tool

# Tester /api/collectes
curl -s http://localhost:4600/api/collectes \
  -H "Cookie: token=$TOKEN" | python3 -m json.tool

# Tester /api/collectes/rdvs
curl -s http://localhost:4600/api/collectes/rdvs \
  -H "Cookie: token=$TOKEN" | python3 -m json.tool
```

### Vérifier les variables d'environnement

```bash
# Vérifier que toutes les variables requises sont définies
for var in JWT_SECRET ADMIN_PASSWORD DEFAULT_PASSWORD PORT; do
  if grep -q "^${var}=" .env; then
    echo "✓ $var"
  else
    echo "✗ $var manquant"
  fi
done
```

### Réinitialisation complète

En cas de problème grave, voici les étapes de réinitialisation :

```bash
# 1. Arrêter le serveur
kill $(pgrep -f "node src/server")

# 2. Sauvegarder la base (optionnel)
cp data/ipce.db data/ipce_backup_$(date +%Y%m%d).db

# 3. Réinitialiser les modules
rm -rf node_modules package-lock.json
npm install

# 4. Recréer la base (conserve les .env)
rm data/ipce.db
node src/init.js

# 5. Relancer le serveur
node src/server.js
```

---

> **Astuce :** En cas de problème non résolu, consultez les logs du serveur avec `tail -f` ou redirigez la sortie standard vers un fichier pour conserver l'historique des erreurs.
