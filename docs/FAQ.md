# FAQ — IPCE Dashboard

Questions fréquemment posées sur l'application de pilotage commercial de l'Institut de Promotion Commerciale et d'Entrepreneuriat.

---

## 1. Questions générales

### Qu'est-ce que l'IPCE Dashboard ?

Application web de pilotage commercial pour l'Institut de Promotion Commerciale et d'Entrepreneuriat. Elle permet de suivre les collectes (données commerciales), les rendez-vous, et de gérer le cycle de validation admin.

### Quelles sont les fonctionnalités principales ?

- Saisie et suivi des collectes commerciales (CA, offres, BC)
- Gestion des rendez-vous avec calendrier
- Pipeline de conversion RDV → Offre → BC
- Validation et approbation des collectes par l'admin
- Tableaux de bord avec KPIs et graphiques
- Rapports exportables (PDF, Excel, CSV)
- Système de notifications
- Business Insights avec score de santé

### Qui peut utiliser l'application ?

Deux types d'utilisateurs :

- **Commerciaux** : saisissent leurs collectes et RDV, consultent leur historique
- **Admin** : valide les collectes, gère les utilisateurs, consulte les statistiques globales

### L'application fonctionne-t-elle sur mobile ?

Oui, le dashboard commercial est responsive. L'admin dashboard est optimisé pour desktop mais utilisable sur tablette.

---

## 2. Comptes et authentification

### Comment se connecter ?

1. Aller sur la page de connexion
2. Entrer votre nom d'utilisateur et mot de passe
3. Si c'est votre première connexion, vous serez redirigé vers la page de changement de mot de passe

### Quels sont les comptes par défaut ?

| Rôle      | Nom         |
|-----------|-------------|
| Admin     | `admin`     |
| Commercial| `Bilé`      |
| Commercial| `Arthème`   |
| Commercial| `Catherine` |

Les mots de passe initiaux sont définis dans le fichier `.env`.

### Comment changer mon mot de passe ?

Depuis le tableau de bord, utiliser la fonctionnalité de changement de mot de passe. Le nouveau mot de passe doit faire au moins 8 caractères et être différent de l'ancien.

### Mon compte est bloqué, que faire ?

Après 10 tentatives de connexion échouées en 15 minutes, le compte est temporairement bloqué. Attendez 15 minutes ou contactez l'admin.

### L'admin a oublié son mot de passe ?

Supprimez le fichier `data/ipce.db` et redémarrez le serveur. Les comptes seront recréés avec les mots de passe par défaut définis dans `.env`.

---

## 3. Collectes

### Qu'est-ce qu'une collecte ?

Une collecte est l'enregistrement des données commerciales d'un commercial pour une période donnée. Elle contient :

- **CA** (Chiffre d'Affaires) en FCFA
- Nombre d'**offres** émises
- Nombre de **BC** (Bons de Commande) signés
- Liste de **RDV** associés

### Comment créer une collecte ?

1. Remplir le formulaire « Nouvelle Collecte »
2. Ajouter les RDV si nécessaire
3. Cliquer sur « Sauvegarder » (brouillon) ou « Valider et envoyer » (pour admin)

### Quelle est la différence entre « Sauvegarder » et « Valider et envoyer » ?

| Action              | Résultat                                                     |
|---------------------|--------------------------------------------------------------|
| **Sauvegarder**     | Crée un brouillon, modifiable et supprimable                 |
| **Valider et envoyer** | Soumet la collecte à l'admin pour validation, plus modifiable |

### Puis-je modifier une collecte validée ?

Non, une collecte validée (soumise à l'admin) ne peut plus être modifiée ni supprimée.

### Comment voir mes collectes passées ?

Dans la section « Historique de mes collectes » du dashboard commercial.

---

## 4. Rendez-vous (RDV)

### Comment ajouter un RDV ?

Dans le formulaire de collecte, remplir les champs RDV :

- Nom du prospect
- Date du RDV
- Montant estimé (en M FCFA)
- Statut (Prévu, Réalisé, Offre, BC Signé)

### Puis-je modifier le statut d'un RDV ?

Oui, via le calendrier du dashboard commercial. Cliquez sur un RDV pour modifier son statut ou le supprimer.

### Quand un RDV peut-il être modifié ?

Uniquement tant que la collecte parente est en statut « brouillon ». Une fois validée, les RDV sont en lecture seule.

### Comment filtrer les RDV par date ?

Le calendrier permet de naviguer mois par mois avec les boutons précédent/suivant.

### Où apparaissent les RDV côté admin ?

- Dans le module « Suivi Prospects » (pipeline de conversion)
- Dans le module « Calendrier » (vue mensuelle)
- Dans les exports Excel/CSV

---

## 5. Validation (Admin)

### Comment valider une collecte ?

1. Aller dans « Demandes en attente »
2. Voir les détails de la collecte (CA, offres, BC, RDV)
3. Cliquer sur « Approuver » ou « Rejeter »

### Que se passe-t-il après approbation ?

- La collecte passe en statut `approuvee`
- Le commercial reçoit une notification
- Les données sont incluses dans les statistiques globales

### Que se passe-t-il après rejet ?

- La collecte passe en statut `rejetee`
- Le commercial reçoit une notification
- Les données ne sont pas incluses dans les statistiques

### Puis-je voir l'historique des validations ?

Oui, dans l'onglet « Historique » du module « Demandes en attente ».

---

## 6. Statistiques et rapports

### D'où viennent les statistiques ?

Les stats ne incluent que les collectes avec statut `validee` ou `approuvee`. Les brouillons et rejets ne comptent pas.

### Comment sont calculés les KPIs ?

| KPI  | Calcul                                                       |
|------|--------------------------------------------------------------|
| CA   | Somme des CA de toutes les collectes validées/approuvées     |
| Offres | Somme des offres émises                                    |
| BC   | Somme des BC signés                                          |
| RDV  | Nombre total de RDV dans les collectes validées/approuvées   |

### Qu'est-ce que le Score de Santé ?

Un score de 0 à 100 calculé à partir des 4 KPIs pondérés :

| KPI     | Pondération |
|---------|-------------|
| CA      | 35%         |
| Offres  | 20%         |
| BC      | 25%         |
| RDV     | 20%         |

### Comment exporter les données ?

Plusieurs options d'export disponibles dans le menu Export (bouton fixé en haut à droite) :

- **PDF** : rapport visuel complet
- **Excel** : fichier `.xlsx` avec 3 feuilles
- **CSV** : données brutes
- **JPEG** : capture d'écran du rapport

---

## 7. Paramètres

### Que peut-on configurer ?

Depuis « Paramètres » (admin uniquement) :

| Paramètre             | Défaut         |
|-----------------------|----------------|
| Objectif CA           | 100M FCFA      |
| Objectif Offres       | 6              |
| Objectif BC           | 6              |
| Objectif RDV          | 6              |
| Thème                 | clair / sombre |
| Notifications         | activées       |

### Les paramètres affectent-ils les stats ?

Oui, les objectifs sont utilisés pour calculer les pourcentages de réalisation dans les KPIs et les Business Insights.

---

## 8. Notifications

### Quels types de notifications ?

| Type                 | Description                          |
|----------------------|--------------------------------------|
| `collecte_pending`   | Nouvelle collecte à valider          |
| `collecte_approved`  | Collecte approuvée                   |
| `collecte_rejected`  | Collecte rejetée                     |
| `reminder`           | Rappel créé                          |
| `system`             | Notification système                 |
| `info`               | Information générale                 |

### Comment voir mes notifications ?

Cliquer sur l'icône de cloche en haut à droite de l'interface admin.

### Les notifications disparaissent-elles ?

Elles restent jusqu'à ce que vous les supprimiez manuellement. L'option « Marquer tout comme lu » les marque comme lues mais ne les supprime pas.

---

## 9. Business Insights

### Qu'est-ce que les Business Insights ?

Un module d'analyse intelligente qui fournit :

- **Score de santé commerciale** (0-100)
- **Opportunités** identifiées
- **Points d'attention**
- **Prévisions**
- **Actions recommandées**

### Comment sont générés les insights ?

L'analyse est basée sur les données des collectes validées/approuvées, les objectifs configurés, et des règles métier prédéfinies.

---

## 10. Problèmes courants

### Je ne vois pas mes données

- Vérifiez que votre collecte est bien enregistrée
- Si elle est « brouillon », elle n'apparaît pas dans les stats globales
- L'admin ne voit que les collectes `validee` ou `approuvee`

### Le calendrier est vide

- Aucun RDV n'a été créé, ou
- Les RDV sont dans des collectes non validées

### Les graphiques ne s'affichent pas

- Vérifiez votre connexion internet (Chart.js est chargé via CDN)
- Regardez la console du navigateur pour les erreurs

### L'export ne fonctionne pas

- Vérifiez que les librairies CDN sont accessibles
- Le PDF nécessite `html2canvas` + `jsPDF`
- L'Excel nécessite `ExcelJS`
