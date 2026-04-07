# Qu'est-ce que sE2EEnd ?

**sE2EEnd** est une plateforme de partage de fichiers sécurisée pour votre organisation. Les fichiers sont **chiffrés directement dans votre navigateur** avant d'être envoyés — le serveur ne stocke jamais que du contenu chiffré. Même l'administrateur ne peut pas lire vos données.

La clé de chiffrement est intégrée dans le lien de partage lui-même et n'est jamais transmise au serveur.

---

# Envoyer un fichier

## Étape 1 — Se connecter

Connectez-vous avec votre compte d'organisation. L'authentification est gérée par le fournisseur d'identité de votre entreprise.

## Étape 2 — Créer un nouvel envoi

Cliquez sur **Nouvel envoi** depuis la page d'accueil ou la barre latérale.

## Étape 3 — Ajouter vos fichiers

Glissez-déposez vos fichiers dans la zone d'upload, ou cliquez pour parcourir. Plusieurs fichiers peuvent être ajoutés à un même envoi.

## Étape 4 — Configurer les options

| Option | Description |
|--------|-------------|
| Date d'expiration | Le lien cessera de fonctionner après cette date |
| Limite de téléchargements | Nombre maximum de fois que les fichiers peuvent être téléchargés |
| Mot de passe | Les destinataires devront saisir un mot de passe pour accéder aux fichiers |

## Étape 5 — Envoyer et partager

Cliquez sur **Envoyer**. Copiez le lien généré et partagez-le avec votre destinataire via un canal sécurisé.

> **Important :** Le lien contient la clé de déchiffrement. Toute personne disposant du lien peut accéder aux fichiers. Ne le partagez pas via des canaux non sécurisés comme les e-mails non chiffrés.

---

# Télécharger un fichier

## Recevoir un lien

Lorsqu'un lien sE2EEnd vous est partagé, ouvrez-le dans votre navigateur.

- Si l'envoi est **protégé par un mot de passe**, vous serez invité à le saisir.
- Cliquez sur **Télécharger** à côté de chaque fichier, ou utilisez **Tout télécharger** si disponible.

Les fichiers sont déchiffrés automatiquement dans votre navigateur. Rien n'est stocké après le déchiffrement — le processus est entièrement local.

---

# Gérer vos envois

Accédez au **Tableau de bord** pour surveiller et gérer vos transferts actifs.

| Action | Description |
|--------|-------------|
| Voir le statut | Consultez les compteurs de téléchargements et les dates d'expiration |
| Révoquer | Invalide le lien instantanément — même si le destinataire le possède déjà |
| Supprimer | Supprime définitivement l'envoi et ses fichiers du serveur |

---

# Sécurité

| Propriété | Détail |
|-----------|--------|
| Algorithme | AES-256-GCM (chiffrement de niveau militaire) |
| Emplacement de la clé | Fragment d'URL uniquement — jamais envoyé ni stocké par le serveur |
| Stockage serveur | Contenu chiffré uniquement — noms de fichiers et contenu illisibles côté serveur |
| Révocation | Instantanée et permanente |
| Authentification | OAuth2 / OIDC via le fournisseur d'identité de votre organisation |

> Si vous perdez le lien, les fichiers ne peuvent pas être récupérés. La clé de chiffrement n'existe que dans le lien lui-même.

---

# Questions fréquentes

**Puis-je envoyer plusieurs fichiers à la fois ?**
Oui. Tous les fichiers d'un envoi partagent le même lien, la même expiration et les mêmes paramètres d'accès.

**Que se passe-t-il quand la limite de téléchargements est atteinte ?**
Le lien devient automatiquement inactif et apparaît comme expiré dans votre tableau de bord.

**Puis-je prolonger une date d'expiration après création ?**
Pas actuellement. Créez un nouvel envoi si vous avez besoin d'un nouveau lien.

**Y a-t-il une limite de taille de fichier ?**
Cela dépend de la configuration de votre organisation. Contactez votre administrateur si vous rencontrez des problèmes avec des fichiers volumineux.

**Qui peut voir mes fichiers ?**
Uniquement les destinataires qui disposent du lien (et du mot de passe, si défini). L'administrateur du serveur ne peut pas lire vos fichiers.
