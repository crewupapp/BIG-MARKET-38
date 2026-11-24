# BIG MARKET 38 — Site web et espace admin

Site de **BIG MARKET 38** (Big Market by Ayadi), supermarché de proximité au 3 avenue de Grugliasco, 38130 Échirolles.

- HTML, CSS et JavaScript, sans aucune bibliothèque externe : rien à installer.
- Prêt pour **GitHub Pages** (fichier `index.html` à la racine).
- **Espace admin** (`admin/`) relié à **Supabase** : textes, photos, prix, promos, horaires, galerie, TikTok et questions fréquentes se modifient sans toucher au code.
- Couleurs du logo uniquement : rouge, noir et blanc. Animations au défilement sur toutes les sections (désactivées si le visiteur a demandé moins d'animations).
- Aucun cookie, polices hébergées avec le site, carte Google chargée seulement au clic.

---

## 1. Mettre le site en ligne avec GitHub Pages

1. Créez un dépôt sur GitHub (par exemple `bigmarket38`).
2. Envoyez **tout le contenu de ce dossier** à la racine du dépôt (bouton *Add file › Upload files*, puis glissez les fichiers et dossiers).
3. Dans le dépôt : *Settings › Pages › Build and deployment* : *Source* = « Deploy from a branch », branche `main`, dossier `/ (root)`, puis *Save*.
4. Au bout d'une minute, le site est en ligne (`https://votre-compte.github.io/bigmarket38/`).
   L'espace admin est à la même adresse suivie de **`admin/`** (`https://votre-compte.github.io/bigmarket38/admin/`).
5. Nom de domaine (facultatif, ex. `bigmarket38.fr`) : *Settings › Pages › Custom domain*, puis suivez les indications de GitHub pour les DNS.

Après la mise en ligne, remplacez dans `index.html` la ligne
`<meta property="og:image" content="assets/images/partage/og-image.jpg">`
par l'adresse complète (ex. `https://bigmarket38.fr/assets/images/partage/og-image.jpg`) : c'est l'image affichée quand le lien est partagé sur WhatsApp, Facebook…

Pour voir le site sur votre ordinateur sans le mettre en ligne : double-cliquez sur `index.html`.

---

## 2. L'espace admin

Adresse : **votre site + `/admin/`**. Il fonctionne sur ordinateur, tablette et téléphone.

### Première connexion (une seule fois)
1. Ouvrez l'espace admin : l'écran **« Créer mon accès »** s'affiche.
2. Saisissez l'adresse de l'administrateur : **morgancoulet5@icloud.com**, puis choisissez votre mot de passe (10 caractères minimum).
3. Un **code de secours** s'affiche (format `XXXX-XXXX-XXXX-XXXX`). **Notez-le** (notes, gestionnaire de mots de passe) : il permet de choisir un nouveau mot de passe en cas d'oubli. Il n'est affiché qu'une fois.
4. Vous arrivez dans le tableau de bord. Ensuite, il suffit de vous connecter avec votre adresse et votre mot de passe.

Seule l'adresse **morgancoulet5@icloud.com** peut créer cet accès, et la création n'est possible que pendant 14 jours (jusqu'au 7 décembre 2026). Passé ce délai sans avoir créé l'accès, il faudra le réactiver dans Supabase (table `admins`, colonne `creation_avant`).

### Au quotidien
Le menu présente chaque rubrique du site, dans l'ordre de la page :

| Rubrique | Ce que vous modifiez |
|---|---|
| **Promotions** | Produit, précision, prix, prix barré, unité, dates (ou « chaque semaine »), photo. Interrupteur « Promos d'exemple » à désactiver dès que vous publiez vos vraies promos. Une promo disparaît toute seule après sa date de fin. |
| **Horaires et fermetures** | Horaires de chaque jour, jours fermés, fermetures et horaires exceptionnels (annoncés sur le site 14 jours avant). |
| **Accueil** | Grand titre, phrase d'accroche, boutons, grande photo, bandeau qui défile. |
| **Le magasin** | Titre, textes, les 3 étiquettes, les 3 photos, bandeau. |
| **Rayons** | Titre, phrase, et chaque rayon : nom, accroche, description, couleur, photo. Ajout, suppression, ordre. |
| **Fraîcheur** | Grande photo plein écran, titre, textes, les 3 points forts, 2 photos. |
| **Saveurs du Maghreb** | Titre, textes, bouton, grande photo et sa pastille, cartes, bandeau. |
| **Galerie** | Photos (légende, catégorie, format) et catégories des filtres. |
| **TikTok** | Titre, textes, vignettes des vidéos (titre, lien, image). |
| **Infos pratiques** | Titre, textes, « Bon à savoir », questions fréquentes, bloc « Une question ? ». |
| **Coordonnées et réseaux** | Nom, adresse (utilisée par les boutons Itinéraire), téléphone, e-mail, TikTok, Instagram, Facebook, Snapchat, phrase du pied de page. Un champ vide est masqué sur le site. |

- Après vos changements, cliquez sur **« Enregistrer »** (ou Ctrl+S / Cmd+S) : c'est en ligne immédiatement. Un point rouge dans le menu signale une rubrique pas encore enregistrée.
- **Photos** : « Choisir une photo » accepte les photos du téléphone ou de l'ordinateur (JPEG, PNG). Elles sont réduites automatiquement à la bonne taille avant l'envoi. Remplissez la « Description de la photo » (utile aux malvoyants et à Google).
- **Annuler** revient à la dernière version enregistrée. **Version précédente** recharge la version d'avant le dernier enregistrement. **Contenu d'origine** recharge le contenu de départ du site. Dans les trois cas, rien n'est publié tant que vous n'avez pas cliqué sur « Enregistrer ».
- Si l'onglet se ferme avant l'enregistrement, vos modifications sont récupérées à la prochaine ouverture (sur le même appareil).

### Mot de passe
- **Changer de mot de passe** ou **créer un nouveau code de secours** : bouton « Mon compte » en haut à droite.
- **Mot de passe oublié** : sur l'écran de connexion, « Mot de passe oublié ? », puis votre adresse, votre code de secours et un nouveau mot de passe. Un nouveau code de secours vous est alors donné (l'ancien ne fonctionne plus).
- Aucun e-mail n'est envoyé par l'espace admin : tout se fait avec le mot de passe et le code de secours.

---

## 3. Supabase

Le contenu du site est enregistré dans le projet Supabase **« BIG MARKET 38 »** (organisation « Gta », serveurs à Paris).

| Élément | Rôle |
|---|---|
| Table `contenu` | Un enregistrement par rubrique modifiée dans l'admin. Une rubrique jamais modifiée affiche le contenu d'origine (`assets/js/contenu.js`). |
| Table `contenu_historique` | Les versions précédentes, pour le bouton « Version précédente ». |
| Table `admins` | Les adresses autorisées dans l'espace admin (aujourd'hui : morgancoulet5@icloud.com). Invisible depuis le site. |
| Stockage `photos` | Les photos envoyées depuis l'admin. |
| Fonction `acces-admin` | Création de l'accès, mot de passe oublié, changement de mot de passe, code de secours. |

**Sécurité** : les visiteurs peuvent seulement lire le contenu publié. Modifier un texte, une photo ou un prix est réservé au compte administrateur, et aucun autre compte ne peut être créé. La clé écrite dans `assets/js/config.js` est une clé publique, faite pour être visible.

**Si Supabase ne répond pas**, le site reste en ligne : il affiche la dernière version reçue par le navigateur, ou à défaut le contenu d'origine. L'espace admin, lui, a besoin de Supabase.

**Offre gratuite de Supabase** : un projet qui ne reçoit aucune activité pendant une semaine peut être mis en pause par Supabase ; les visites du site suffisent en principe à l'éviter. Si cela arrive, réactivez le projet depuis supabase.com (bouton « Restore »).

Le dossier `supabase/` contient la structure de la base (`migrations/`) et le code de la fonction (`functions/acces-admin/`) : ils sont déjà installés dans le projet et servent d'archive.

**Ajouter un autre administrateur** : dans Supabase, *Table Editor › admins*, ajoutez une ligne avec son adresse e-mail (en minuscules). Il pourra créer son accès depuis « Première connexion » pendant 14 jours.

---

## 4. Logo et images de départ

| Fichier | Rôle |
|---|---|
| `assets/images/logo/logo.png` | Logo (en-tête, accueil, pied de page, admin) |
| `assets/images/logo/favicon.png`, `apple-touch-icon.png` | Icônes de l'onglet et de l'écran d'accueil du téléphone |
| `assets/images/partage/og-image.jpg` | Image de partage sur les réseaux (1200 × 630 px) |

Les dossiers `assets/images/…` contiennent les **cadres d'attente** (rouge, noir ou blanc) affichés tant que vous n'avez pas mis vos photos. Le plus simple est de remplacer chaque photo depuis l'espace admin. Astuce : ajoutez `?images` à la fin de l'adresse du site pour afficher le nom du fichier d'origine sur chaque photo.

---

## 5. Les animations

| Section | Animation |
|---|---|
| Accueil | Introduction au logo (une fois par visite), titre lettre par lettre, photo dévoilée, badge tournant, bandeau qui accélère avec le défilement. |
| Toutes les sections | Chaque section glisse par-dessus la précédente, grands mots de fond qui défilent. |
| Le magasin | Texte qui s'allume mot à mot, étiquettes qui se balancent, photos dévoilées par un rideau rouge. |
| Nos rayons | Sur ordinateur, défilement horizontal des rayons avec compteur ; sur mobile, cartes empilées. |
| Fraîcheur | La photo s'agrandit jusqu'au plein écran. |
| Maghreb, Promos, Galerie, TikTok | Photo qui s'ouvre, auvent rayé, étiquettes prix, colonnes à vitesses différentes, visionneuse plein écran, téléphones qui montent. |
| Infos pratiques, pied de page | Ticket de caisse qui « s'imprime », FAQ animée, lettres géantes qui montent. |

Les grands titres modifiés dans l'admin s'ajustent tout seuls à la largeur de l'écran.

---

## 6. À vérifier avant la mise en ligne

- **Adresse** : vous avez indiqué « 3 avenue de Grugliasco, Échirolles ». L'ancien site envoie l'itinéraire vers « 3 Avenue d'Honhoue, 38130 Echirolles ». Vérifiez le point exact dans Google Maps, puis corrigez si besoin dans l'admin (« Coordonnées et réseaux »).
- **Téléphone, e-mail, autres réseaux** : aucun n'était public ; ajoutez-les dans l'admin si vous le souhaitez.
- **Promotions et vidéos TikTok** : ce sont des exemples (prix fictifs, tampons « Exemple »). Remplacez-les dans l'admin et désactivez « Promos d'exemple » et « Vignettes d'exemple ».
- **Mentions légales** (`mentions-legales.html`) : complétez les passages encadrés en rouge (raison sociale, SIRET, directeur de la publication…).

---

## 7. Organisation des fichiers

```
index.html                 Page principale (les 10 sections)
mentions-legales.html      Mentions légales (à compléter)
404.html                   Page « introuvable »
robots.txt, .nojekyll      Fichiers techniques (l'admin n'est pas référencé par Google)
admin/
  index.html               Espace admin
  admin.css, admin.js      Mise en page et fonctionnement de l'admin
assets/
  css/style.css            Mise en forme et animations du site
  js/config.js             Connexion au projet Supabase « BIG MARKET 38 »
  js/supabase.js           Échanges avec Supabase (lecture, connexion, enregistrement, photos)
  js/contenu.js            Contenu d'origine (secours si Supabase ne répond pas)
  js/donnees.js            Accès aux données + horaires en direct
  js/rendu.js              Construction des sections à partir des données
  js/animations.js         Moteur d'animations au défilement
  js/app.js                Menu, visionneuse, carte, FAQ, statut ouvert/fermé
  fonts/                   Polices Archivo Black, Anton, DM Sans (+ licences)
  images/                  Logo et images de départ
supabase/
  migrations/              Structure de la base (déjà appliquée)
  functions/acces-admin/   Fonction d'accès à l'admin (déjà installée)
```

Polices : Archivo Black, Anton et DM Sans, sous licence SIL Open Font License (textes dans `assets/fonts/licences/`).
