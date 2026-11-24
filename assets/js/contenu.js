/* =====================================================================
   BIG MARKET 38 — CONTENU D'ORIGINE DU SITE
   ---------------------------------------------------------------------
   Pour modifier le site au quotidien, utilisez l'ESPACE ADMIN
   (adresse du site + /admin/) : textes, photos, prix, promos, horaires,
   galerie, TikTok, questions fréquentes... Tout y est modifiable, sans
   toucher au code.

   Ce fichier contient le contenu d'origine :
   - il s'affiche tant qu'une rubrique n'a pas été modifiée dans l'admin ;
   - il sert de secours si Supabase ne répond pas ;
   - le bouton « Contenu d'origine » de l'admin revient à ces valeurs.
   ===================================================================== */

window.BM_CONTENU = {

  /* ------------------------------------------------------------------
     1. LE MAGASIN
     ------------------------------------------------------------------ */
  magasin: {
    nom: "BIG MARKET 38",
    signature: "Big Market by Ayadi",
    adresse: "3 avenue de Grugliasco",
    codePostal: "38130",
    ville: "Échirolles",
    pays: "France",
    telephone: "",        // ex. "04 76 00 00 00" — laissé vide = masqué sur le site
    email: "",            // ex. "contact@bigmarket38.fr" — laissé vide = masqué
    reseaux: {
      tiktok: "https://www.tiktok.com/@bigmarket38",
      tiktokPseudo: "@bigmarket38",
      instagram: "",      // ex. "https://www.instagram.com/..." — vide = masqué
      facebook: "",
      snapchat: ""
    }
  },

  /* ------------------------------------------------------------------
     2. HORAIRES (format 24 h "HH:MM"). Jour fermé : null
     ------------------------------------------------------------------ */
  horaires: {
    lundi:    { ouverture: "09:00", fermeture: "19:00" },
    mardi:    { ouverture: "09:00", fermeture: "19:00" },
    mercredi: { ouverture: "09:00", fermeture: "19:00" },
    jeudi:    { ouverture: "09:00", fermeture: "19:00" },
    vendredi: { ouverture: "09:00", fermeture: "19:00" },
    samedi:   { ouverture: "09:00", fermeture: "19:00" },
    dimanche: { ouverture: "09:00", fermeture: "13:00" }
  },

  /* Fermetures ou horaires exceptionnels (jours fériés, travaux...).
     Exemples :
       { date: "2026-12-25", ferme: true, message: "Fermé le jour de Noël" },
       { date: "2026-12-31", ouverture: "09:00", fermeture: "17:00", message: "Fermeture à 17h00 le 31 décembre" }
  */
  exceptions: [],

  /* ------------------------------------------------------------------
     3. NOS RAYONS (theme : "rouge", "blanc" ou "noir")
     ------------------------------------------------------------------ */
  rayons: [
    {
      id: "fruits-legumes", nom: "Fruits et légumes", theme: "rouge",
      accroche: "La fraîcheur au fil des saisons",
      description: "Des fruits et légumes pour toutes vos envies, vos recettes du quotidien et vos repas en famille.",
      image: "assets/images/rayons/fruits-legumes.jpg", alt: "Le rayon fruits et légumes"
    },
    {
      id: "boucherie", nom: "Boucherie", theme: "blanc",
      accroche: "Du choix pour vos repas",
      description: "Viandes et volailles pour vos repas du quotidien comme pour les grandes occasions.",
      image: "assets/images/rayons/boucherie.jpg", alt: "Le rayon boucherie"
    },
    {
      id: "produits-maghreb", nom: "Produits du Maghreb", theme: "noir",
      accroche: "L'Algérie à l'honneur",
      description: "Épicerie, boissons et spécialités : retrouvez les saveurs du Maghreb, notamment d'Algérie.",
      image: "assets/images/rayons/produits-maghreb.jpg", alt: "Le rayon des produits du Maghreb"
    },
    {
      id: "epicerie", nom: "Épicerie", theme: "rouge",
      accroche: "Les essentiels du placard",
      description: "Tout ce qu'il faut pour remplir vos placards et cuisiner au quotidien.",
      image: "assets/images/rayons/epicerie.jpg", alt: "Le rayon épicerie"
    },
    {
      id: "boissons", nom: "Boissons", theme: "blanc",
      accroche: "Pour tous les goûts",
      description: "Des boissons pour accompagner vos repas, à la maison comme pour recevoir.",
      image: "assets/images/rayons/boissons.jpg", alt: "Le rayon boissons"
    },
    {
      id: "produits-frais", nom: "Produits frais", theme: "noir",
      accroche: "Le frais du quotidien",
      description: "Les indispensables du frais pour vos repas de tous les jours.",
      image: "assets/images/rayons/produits-frais.jpg", alt: "Le rayon produits frais"
    },
    {
      id: "surgeles", nom: "Surgelés", theme: "rouge",
      accroche: "Pratique et malin",
      description: "Des surgelés pratiques pour cuisiner en toute simplicité.",
      image: "assets/images/rayons/surgeles.jpg", alt: "Le rayon surgelés"
    }
  ],

  /* ------------------------------------------------------------------
     4. SAVEURS DU MAGHREB (cartes sous la grande photo)
     ------------------------------------------------------------------ */
  maghreb: [
    {
      titre: "Épicerie",
      texte: "Les produits du placard pour retrouver les saveurs du Maghreb au quotidien.",
      image: "assets/images/maghreb/epicerie.jpg", alt: "L'épicerie du Maghreb"
    },
    {
      titre: "Boissons",
      texte: "Des boissons aux saveurs du Maghreb pour accompagner vos repas.",
      image: "assets/images/maghreb/boissons.jpg", alt: "Les boissons du Maghreb"
    },
    {
      titre: "Spécialités",
      texte: "Des spécialités pour retrouver les goûts de là-bas, avec l'Algérie à l'honneur.",
      image: "assets/images/maghreb/specialites.jpg", alt: "Les spécialités du Maghreb"
    }
  ],

  /* ------------------------------------------------------------------
     5. PROMOTIONS DE LA SEMAINE
     - demo: true  => affiche le bandeau « Aperçu » et le tampon « Exemple »
       Passez demo à false dès que vous mettez de vraies promotions.
     - debut / fin : dates au format "AAAA-MM-JJ".
       Une promo dont la date de fin est passée disparaît toute seule.
       Le mot "semaine" (démo uniquement) = semaine en cours, du lundi au dimanche.
     - prix et prixAvant : nombres avec un point (1.99), prixAvant est facultatif.
     ------------------------------------------------------------------ */
  promotions: {
    demo: true,
    liste: [
      { produit: "Oranges", detail: "Calibre moyen", prix: 1.99, prixAvant: 2.49, unite: "le kg", image: "assets/images/promotions/promo-01.jpg", alt: "Oranges", debut: "semaine", fin: "semaine" },
      { produit: "Tomates", detail: "Vrac", prix: 2.29, unite: "le kg", image: "assets/images/promotions/promo-02.jpg", alt: "Tomates", debut: "semaine", fin: "semaine" },
      { produit: "Entrecôte", detail: "À la coupe", prix: 18.90, prixAvant: 21.90, unite: "le kg", image: "assets/images/promotions/promo-03.jpg", alt: "Entrecôte", debut: "semaine", fin: "semaine" },
      { produit: "Dattes", detail: "Barquette de 500 g", prix: 3.49, unite: "la barquette", image: "assets/images/promotions/promo-04.jpg", alt: "Dattes", debut: "semaine", fin: "semaine" },
      { produit: "Boissons en canette", detail: "Pack de 6 × 33 cl", prix: 3.99, unite: "le pack", image: "assets/images/promotions/promo-05.jpg", alt: "Boissons en canette", debut: "semaine", fin: "semaine" },
      { produit: "Yaourts aux fruits", detail: "Lot de 8", prix: 2.59, unite: "le lot", image: "assets/images/promotions/promo-06.jpg", alt: "Yaourts aux fruits", debut: "semaine", fin: "semaine" }
    ]
  },

  /* ------------------------------------------------------------------
     6. GALERIE PHOTOS
     format : "portrait", "paysage" ou "carre"
     categorie : doit correspondre à un identifiant de "categories"
     ------------------------------------------------------------------ */
  galerie: {
    categories: [
      { id: "magasin", nom: "Le magasin" },
      { id: "rayons", nom: "Les rayons" },
      { id: "fruits-legumes", nom: "Fruits et légumes" },
      { id: "boucherie", nom: "Boucherie" },
      { id: "produits", nom: "Produits" }
    ],
    photos: [
      { image: "assets/images/galerie/galerie-01.jpg", legende: "Le magasin", alt: "Le magasin BIG MARKET 38", categorie: "magasin", format: "paysage" },
      { image: "assets/images/galerie/galerie-02.jpg", legende: "Une allée", alt: "Une allée du magasin", categorie: "rayons", format: "portrait" },
      { image: "assets/images/galerie/galerie-03.jpg", legende: "Fruits et légumes", alt: "L'étal des fruits et légumes", categorie: "fruits-legumes", format: "carre" },
      { image: "assets/images/galerie/galerie-04.jpg", legende: "Les fruits", alt: "Des fruits frais", categorie: "fruits-legumes", format: "portrait" },
      { image: "assets/images/galerie/galerie-05.jpg", legende: "La boucherie", alt: "Le comptoir boucherie", categorie: "boucherie", format: "paysage" },
      { image: "assets/images/galerie/galerie-06.jpg", legende: "Produits du Maghreb", alt: "Des produits du Maghreb", categorie: "produits", format: "carre" },
      { image: "assets/images/galerie/galerie-07.jpg", legende: "Les boissons", alt: "Le rayon boissons", categorie: "produits", format: "portrait" },
      { image: "assets/images/galerie/galerie-08.jpg", legende: "Produits frais", alt: "Le rayon produits frais", categorie: "produits", format: "carre" },
      { image: "assets/images/galerie/galerie-09.jpg", legende: "Les surgelés", alt: "Le rayon surgelés", categorie: "rayons", format: "paysage" },
      { image: "assets/images/galerie/galerie-10.jpg", legende: "Les légumes", alt: "Des légumes frais", categorie: "fruits-legumes", format: "portrait" },
      { image: "assets/images/galerie/galerie-11.jpg", legende: "Espace de vente", alt: "L'espace de vente", categorie: "magasin", format: "paysage" },
      { image: "assets/images/galerie/galerie-12.jpg", legende: "L'épicerie", alt: "Le rayon épicerie", categorie: "rayons", format: "carre" }
    ]
  },

  /* ------------------------------------------------------------------
     7. VIDÉOS TIKTOK
     - demo: true => vignettes marquées « Exemple ».
     - lien : collez l'adresse d'une vraie vidéo TikTok
       (ex. "https://www.tiktok.com/@bigmarket38/video/1234567890").
       Sans lien, la vignette mène au compte TikTok.
     ------------------------------------------------------------------ */
  tiktok: {
    demo: true,
    videos: [
      { titre: "Les promos de la semaine", image: "assets/images/tiktok/tiktok-01.jpg", lien: "" },
      { titre: "Visite du magasin", image: "assets/images/tiktok/tiktok-02.jpg", lien: "" },
      { titre: "Le rayon fruits et légumes", image: "assets/images/tiktok/tiktok-03.jpg", lien: "" },
      { titre: "Les saveurs du Maghreb", image: "assets/images/tiktok/tiktok-04.jpg", lien: "" }
    ]
  },

  /* ------------------------------------------------------------------
     8. BON À SAVOIR
     Les informations sur les horaires, les rayons et les promos sont
     ajoutées automatiquement. Ajoutez ici vos services, une fois vérifiés.
     icone possible : "valide", "etiquette", "chariot", "horloge", "pin", "tel"
     Exemples (à décommenter et adapter) :
       { titre: "Paiement", texte: "Carte bancaire et espèces acceptées.", icone: "valide" },
       { titre: "Stationnement", texte: "...", icone: "pin" },
  ------------------------------------------------------------------ */
  bonASavoir: [
    { titre: "L'Algérie à l'honneur", texte: "Une place de choix pour les produits d'Algérie au rayon des saveurs du Maghreb.", icone: "etoile" },
    { titre: "Viandes et volailles", texte: "À la boucherie, pour le quotidien comme pour les grandes occasions.", icone: "valide" },
    { titre: "Promos chaque semaine", texte: "De nouvelles offres chaque semaine et des bonnes affaires toute l'année.", icone: "etiquette" }
  ],

  /* ------------------------------------------------------------------
     9. QUESTIONS FRÉQUENTES
     Mots remplacés automatiquement : {{horaires}}, {{dimanche}},
     {{adresse}}, {{rayons}}, {{nbRayons}}, {{tiktok}}, {{telephone}}
     ------------------------------------------------------------------ */
  faq: [
    { question: "Quels sont les horaires de BIG MARKET 38 ?", reponse: "Le magasin est ouvert {{horaires}}." },
    { question: "Le magasin est-il ouvert le dimanche ?", reponse: "{{dimanche}}" },
    { question: "Où se trouve le magasin ?", reponse: "BIG MARKET 38 se trouve au {{adresse}}. Les boutons « Itinéraire » ouvrent le trajet dans Google Maps, en voiture, en transports en commun, à pied ou à vélo ; vous pouvez aussi utiliser Waze ou Plans." },
    { question: "Quels rayons trouve-t-on au magasin ?", reponse: "Le magasin compte {{nbRayons}} rayons : {{rayons}}." },
    { question: "Trouve-t-on des produits d'Algérie ?", reponse: "Oui : le rayon des saveurs du Maghreb fait une place de choix aux produits d'Algérie, en épicerie, boissons et spécialités." },
    { question: "Que propose la boucherie ?", reponse: "Viandes et volailles, pour vos repas du quotidien comme pour les grandes occasions." },
    { question: "Comment connaître les promotions ?", reponse: "De nouvelles promos sont proposées chaque semaine et des bonnes affaires toute l'année. Retrouvez-les dans la rubrique Promos de ce site et en vidéo sur notre compte TikTok {{tiktok}}." },
    { question: "Comment contacter le magasin ?", reponse: "Le plus simple est de passer nous voir au magasin{{telephone}}. Vous pouvez aussi suivre nos actualités et nos promos sur TikTok ({{tiktok}})." }
  ],

  /* ------------------------------------------------------------------
     10. TEXTES DE CHAQUE RUBRIQUE
     Grands titres : une ligne du titre par ligne (séparées par \n).
     Bandeaux défilants : mots séparés par des virgules.
     ------------------------------------------------------------------ */
  textes: {
    accueil: {
      titre: "Le marché\nen grand",
      accroche: "Fruits et légumes frais, boucherie, saveurs du Maghreb et toutes vos courses du quotidien, à deux pas de chez vous à Échirolles.",
      bouton1: "Découvrir le magasin",
      bouton2: "Horaires et accès",
      ruban: "Fruits et légumes, Boucherie, Saveurs du Maghreb, Épicerie, Boissons, Produits frais, Surgelés"
    },
    magasin: {
      titre: "Tout près,\ntout frais",
      chapo: "Du choix, de la fraîcheur et des bonnes affaires.",
      texte: "Chez Big Market à Échirolles, faites le plein de fruits et légumes, découvrez notre boucherie et retrouvez les saveurs du Maghreb, notamment d'Algérie. Épicerie, produits frais, boissons et surgelés complètent vos courses, avec des promotions toute l'année et de nouvelles bonnes affaires chaque semaine.",
      etiquette1: "rayons, du frais au surgelé",
      etiquette2Titre: "7j/7",
      etiquette2: "ouvert tous les jours, le dimanche matin aussi",
      etiquette3Titre: "Promos",
      etiquette3: "de nouvelles offres chaque semaine",
      ruban: "Ouvert 7 jours sur 7, Promos chaque semaine, L'Algérie à l'honneur, 3 avenue de Grugliasco"
    },
    rayons: {
      titre: "Nos rayons",
      chapo: "Tout pour vos courses, au même endroit : sept rayons, du frais au surgelé."
    },
    fraicheur: {
      titre: "Des couleurs\nplein les étals",
      chapo: "La fraîcheur au fil des saisons.",
      texte: "Rouges, verts, jaunes, orangés : au rayon fruits et légumes, la couleur donne le ton. De quoi préparer vos recettes du quotidien comme vos repas en famille.",
      point1Titre: "Fraîcheur",
      point1: "Des fruits et légumes frais, à choisir sur place.",
      point2Titre: "Couleurs",
      point2: "Des étals qui donnent envie de cuisiner.",
      point3Titre: "Diversité",
      point3: "De quoi cuisiner pour toutes les envies."
    },
    maghreb: {
      titre: "Les saveurs\ndu Maghreb",
      chapo: "L'Algérie à l'honneur.",
      texte: "Épicerie, boissons et spécialités : retrouvez les saveurs du Maghreb, avec une place de choix pour les produits d'Algérie.",
      bouton: "Voir les promos de la semaine",
      badge: "Produits d'Algérie",
      ruban: "L'Algérie à l'honneur, Épicerie, Boissons, Spécialités"
    },
    promos: {
      titre: "Les promos\nde la semaine",
      chapo: "De nouvelles promos chaque semaine, et des bonnes affaires toute l'année.",
      vide: "Les nouvelles promotions arrivent bientôt. En attendant, retrouvez nos bons plans en vidéo sur TikTok.",
      bouton: "Voir les promos en vidéo sur TikTok"
    },
    galerie: {
      titre: "Le magasin\nen images"
    },
    tiktok: {
      titre: "Suivez-nous\nsur TikTok",
      chapo: "Les bons plans de la semaine et la vie du magasin, en vidéo.",
      bouton: "Voir le compte TikTok"
    },
    infos: {
      titre: "Venir\nau magasin",
      chapo: "Adresse, horaires, itinéraires et réponses à vos questions : tout ce qu'il faut savoir avant de passer.",
      titreBonASavoir: "Bon à savoir",
      titreFaq: "Questions fréquentes",
      contact: "Une question ? Passez nous voir au magasin, et suivez nos bons plans sur TikTok.",
      merci: "Merci de votre visite !"
    },
    pied: {
      slogan: "Le marché en grand, à deux pas de chez vous."
    }
  },

  /* ------------------------------------------------------------------
     11. PHOTOS FIXES DES RUBRIQUES (les photos des rayons, promos,
     galerie et TikTok sont dans leur propre rubrique)
     ------------------------------------------------------------------ */
  photos: {
    accueil: { image: "assets/images/accueil/hero.jpg", alt: "Le magasin BIG MARKET 38 à Échirolles" },
    facade: { image: "assets/images/magasin/facade.jpg", alt: "La façade du magasin BIG MARKET 38" },
    allee: { image: "assets/images/magasin/interieur-1.jpg", alt: "Une allée du magasin" },
    etal: { image: "assets/images/magasin/interieur-2.jpg", alt: "L'étal des fruits et légumes" },
    fraicheur: { image: "assets/images/fraicheur/fraicheur-principale.jpg", alt: "Des fruits et légumes frais et colorés" },
    fruits: { image: "assets/images/fraicheur/fraicheur-2.jpg", alt: "Des fruits frais" },
    legumes: { image: "assets/images/fraicheur/fraicheur-3.jpg", alt: "Des légumes frais" },
    algerie: { image: "assets/images/maghreb/algerie.jpg", alt: "Spécialités et produits d'Algérie" }
  }
};
