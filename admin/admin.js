/* =====================================================================
   BIG MARKET 38 — ESPACE ADMIN
   ---------------------------------------------------------------------
   Connexion de l'administrateur, puis modification de chaque rubrique
   du site : textes, photos, prix, promos, horaires, galerie, TikTok...
   Chaque rubrique s'enregistre dans Supabase (table « contenu ») et
   apparaît aussitôt sur le site.
   ===================================================================== */
(function () {
  'use strict';

  var S = window.BM && BM.supabase, O = window.BM && BM.outils;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var SVG = 'http://www.w3.org/2000/svg';
  var CLE_SESSION = 'bm-admin-session', CLE_BROUILLON = 'bm-admin-brouillon';

  var ORIGINE = O ? O.cloner(window.BM_CONTENU || {}) : {};
  var travail = O ? O.cloner(ORIGINE) : {};
  var session = null, active = null, infos = {}, compteur = 0, dernierEnregistrement = 0;

  /* =================================================================
     OUTILS
     ================================================================= */
  function el(tag, attrs, enfants) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    [].concat(enfants == null ? [] : enfants).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return n;
  }
  function icone(id) {
    var s = document.createElementNS(SVG, 'svg'), u = document.createElementNS(SVG, 'use');
    s.setAttribute('class', 'icone'); s.setAttribute('aria-hidden', 'true');
    u.setAttribute('href', '#a-' + id);
    s.appendChild(u);
    return s;
  }
  function nouvelId() { return 'c' + (++compteur); }
  function slug(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'element';
  }
  function url(img) {
    if (!img) return '';
    return /^(https?:|data:|blob:)/.test(img) ? img : '../' + String(img).replace(/^\.?\//, '');
  }
  function prixTexte(n) { return n == null || n === '' || isNaN(n) ? '' : Number(n).toFixed(2).replace('.', ',') + ' €'; }
  function dateHeure(iso) {
    try {
      return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
        .format(new Date(iso)).replace(/(\d{2}):(\d{2})/, '$1h$2');
    } catch (e) { return ''; }
  }
  function heureCourte(d) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(d || new Date()).replace(':', 'h');
  }
  function semaine(decalage) {
    var n = O.maintenant(), lundi = O.isoPlus(n.iso, -((n.jour + 6) % 7) + 7 * (decalage || 0));
    return { lundi: lundi, dimanche: O.isoPlus(lundi, 6) };
  }
  function vide(v) { return v == null || String(v).trim() === ''; }

  var minuteurToast = null;
  function toast(message, erreur) {
    var t = $('#toast');
    t.textContent = message;
    t.classList.toggle('est-erreur', !!erreur);
    t.classList.add('est-visible');
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(function () { t.classList.remove('est-visible'); }, erreur ? 6500 : 3400);
  }
  function occupe(bouton, oui) {
    if (!bouton) return;
    bouton.classList.toggle('est-occupe', !!oui);
    bouton.disabled = !!oui;
  }
  function confirmer(titre, texte, libelleOui) {
    var d = $('#fenetre-question');
    $('h2', d).textContent = titre;
    $('.fenetre__texte', d).textContent = texte;
    $('[data-oui]', d).textContent = libelleOui || 'Confirmer';
    return new Promise(function (ok) {
      function fin(v) { d.close(); ok(v); }
      $('[data-oui]', d).onclick = function () { fin(true); };
      $('[data-non]', d).onclick = function () { fin(false); };
      d.oncancel = function (e) { e.preventDefault(); fin(false); };
      d.showModal();
      $('[data-non]', d).focus();
    });
  }

  /* =================================================================
     LES RUBRIQUES DU SITE ET LEURS CHAMPS
     ================================================================= */
  var ICONES_INFO = [['valide', 'Coche'], ['etiquette', 'Étiquette'], ['chariot', 'Chariot'], ['horloge', 'Horloge'], ['calendrier', 'Calendrier'], ['pin', 'Lieu'], ['tel', 'Téléphone'], ['etoile', 'Étoile'], ['carte', 'Carte'], ['voiture', 'Voiture'], ['tram', 'Bus et tram'], ['pied', 'À pied'], ['velo', 'Vélo']];
  var UNITES = ['le kg', 'la pièce', 'le lot', 'la barquette', 'le pack', 'la bouteille', 'le sachet', 'la boîte', 'les 100 g', 'le litre'];
  var AIDE_TITRE = "Une ligne du titre par ligne (touche Entrée pour passer à la ligne). Deux lignes courtes, c'est l'idéal.";
  var AIDE_BANDEAU = 'Les mots du bandeau qui défile, séparés par des virgules.';

  function titre(chemin, label) { return { type: 'titre', chemin: chemin, label: label || 'Grand titre', aide: AIDE_TITRE, requis: true }; }
  function photo(chemin, label, dims, aide) { return { type: 'photo', chemin: chemin + '.image', alt: chemin + '.alt', label: label, dims: dims, aide: aide }; }

  var RUBRIQUES = [
    {
      id: 'promos', nom: 'Promotions', icone: 'etiquette', ancre: 'promos',
      intro: "Les promos de la semaine : produit, prix, dates et photo. Une promo disparaît toute seule du site après sa date de fin.",
      cles: ['promotions', 'textes.promos'],
      champs: [
        { type: 'case', chemin: 'promotions.demo', label: 'Promos d\'exemple', aide: "Activé : le site affiche le bandeau « Aperçu » et un tampon « Exemple » sur chaque promo. Désactivez-le dès que vous publiez vos vraies promos." },
        {
          type: 'liste', chemin: 'promotions.liste', label: 'Les promos', element: 'une promo', singulier: 'promo', pluriel: 'promos', vignette: 'image',
          resume: function (x) { return [x.produit, prixTexte(x.prix)].filter(Boolean).join(' · '); },
          nouveau: function () { var s = semaine(0); return { produit: '', detail: '', prix: null, prixAvant: null, unite: 'le kg', image: '', alt: '', debut: s.lundi, fin: s.dimanche }; },
          champs: [
            { type: 'texte', cle: 'produit', label: 'Produit', requis: true, exemple: 'Ex. : Oranges' },
            { type: 'texte', cle: 'detail', label: 'Précision (facultatif)', exemple: 'Ex. : Calibre moyen, origine Espagne' },
            { type: 'groupe', champs: [
              { type: 'prix', cle: 'prix', label: 'Prix promo', requis: true },
              { type: 'prix', cle: 'prixAvant', label: 'Prix barré (facultatif)' },
              { type: 'texte', cle: 'unite', label: 'Unité', suggestions: UNITES }
            ] },
            { type: 'periode', label: 'Période de la promo' },
            { type: 'photo', cle: 'image', alt: 'alt', label: 'Photo du produit', dims: [1000, 1000], requis: true }
          ]
        },
        { type: 'carte', titre: 'Textes de la rubrique' },
        titre('textes.promos.titre'),
        { type: 'texte-long', chemin: 'textes.promos.chapo', label: 'Phrase sous le titre', lignes: 2 },
        { type: 'texte-long', chemin: 'textes.promos.vide', label: "Message quand il n'y a aucune promo en cours", lignes: 2 },
        { type: 'texte', chemin: 'textes.promos.bouton', label: 'Bouton vers TikTok', requis: true }
      ]
    },
    {
      id: 'horaires', nom: 'Horaires et fermetures', icone: 'horloge', ancre: 'infos',
      intro: "Les horaires de chaque jour et les fermetures exceptionnelles (jours fériés, inventaire...). Le statut « Ouvert / Fermé » du site se met à jour tout seul.",
      cles: ['horaires', 'exceptions'],
      champs: [
        { type: 'carte', titre: 'Horaires de la semaine' },
        { type: 'horaires', chemin: 'horaires' },
        { type: 'carte', titre: 'Fermetures et horaires exceptionnels', aide: "Une date ajoutée ici remplace les horaires habituels ce jour-là. Elle est annoncée sur le site 14 jours avant." },
        {
          type: 'liste', chemin: 'exceptions', element: 'une date', singulier: 'date', pluriel: 'dates',
          resume: function (x) {
            if (!x.date) return 'Nouvelle date';
            var t = O.dateLongue(x.date);
            return t.charAt(0).toUpperCase() + t.slice(1) + ' : ' + (x.ferme ? 'fermé' : (x.ouverture && x.fermeture ? O.heure(x.ouverture) + ' – ' + O.heure(x.fermeture) : ''));
          },
          nouveau: function () { return { date: O.isoPlus(O.maintenant().iso, 1), ferme: true, message: '' }; },
          champs: [
            { type: 'date', cle: 'date', label: 'Date', requis: true },
            { type: 'exception' },
            { type: 'texte', cle: 'message', label: 'Message affiché (facultatif)', exemple: 'Ex. : Fermé le jour de Noël' }
          ]
        }
      ]
    },
    {
      id: 'accueil', nom: 'Accueil', icone: 'maison', ancre: 'accueil',
      intro: "Le haut de la page : le grand titre, la phrase d'accroche, les boutons, la grande photo et le bandeau qui défile.",
      cles: ['textes.accueil', 'photos.accueil'],
      champs: [
        titre('textes.accueil.titre'),
        { type: 'texte-long', chemin: 'textes.accueil.accroche', label: "Phrase d'accroche", lignes: 3 },
        { type: 'groupe', champs: [
          { type: 'texte', chemin: 'textes.accueil.bouton1', label: 'Bouton blanc', requis: true },
          { type: 'texte', chemin: 'textes.accueil.bouton2', label: 'Bouton noir', requis: true }
        ] },
        photo('photos.accueil', "Photo d'accueil", [1200, 1500]),
        { type: 'mots', chemin: 'textes.accueil.ruban', label: 'Bandeau qui défile', aide: AIDE_BANDEAU }
      ]
    },
    {
      id: 'magasin', nom: 'Le magasin', icone: 'magasin', ancre: 'magasin',
      intro: "La présentation du magasin, ses trois étiquettes et ses trois photos.",
      cles: ['textes.magasin', 'photos.facade', 'photos.allee', 'photos.etal'],
      champs: [
        titre('textes.magasin.titre'),
        { type: 'texte', chemin: 'textes.magasin.chapo', label: 'Phrase sous le titre' },
        { type: 'texte-long', chemin: 'textes.magasin.texte', label: 'Texte de présentation', aide: "Ce texte s'allume mot à mot quand on fait défiler la page.", lignes: 5 },
        { type: 'carte', titre: 'Les trois étiquettes' },
        { type: 'texte', chemin: 'textes.magasin.etiquette1', label: 'Étiquette 1', aide: "Le nombre de rayons s'affiche tout seul au-dessus de ce texte." },
        { type: 'groupe', champs: [
          { type: 'texte', chemin: 'textes.magasin.etiquette2Titre', label: 'Étiquette 2 : en gros', requis: true },
          { type: 'texte', chemin: 'textes.magasin.etiquette2', label: 'Étiquette 2 : texte' }
        ] },
        { type: 'groupe', champs: [
          { type: 'texte', chemin: 'textes.magasin.etiquette3Titre', label: 'Étiquette 3 : en gros', requis: true },
          { type: 'texte', chemin: 'textes.magasin.etiquette3', label: 'Étiquette 3 : texte' }
        ] },
        { type: 'carte', titre: 'Photos' },
        photo('photos.facade', 'Façade du magasin', [1600, 1200]),
        photo('photos.allee', 'Une allée du magasin', [1200, 1600]),
        photo('photos.etal', 'Un étal ou un rayon', [1400, 1400]),
        { type: 'carte', titre: 'Bandeau' },
        { type: 'mots', chemin: 'textes.magasin.ruban', label: 'Bandeau rouge qui défile', aide: AIDE_BANDEAU }
      ]
    },
    {
      id: 'rayons', nom: 'Rayons', icone: 'rayons', ancre: 'rayons',
      intro: "Les rayons défilent dans cet ordre sur le site. Ajoutez-en, modifiez-les ou changez leur ordre avec les flèches.",
      cles: ['textes.rayons', 'rayons'],
      champs: [
        titre('textes.rayons.titre'),
        { type: 'texte-long', chemin: 'textes.rayons.chapo', label: 'Phrase sous le titre', lignes: 2 },
        { type: 'carte' },
        {
          type: 'liste', chemin: 'rayons', label: 'Les rayons', element: 'un rayon', singulier: 'rayon', pluriel: 'rayons', vignette: 'image',
          resume: function (r) { return r.nom; },
          nouveau: function () { return { id: '', nom: '', theme: 'rouge', accroche: '', description: '', image: '', alt: '' }; },
          champs: [
            { type: 'texte', cle: 'nom', label: 'Nom du rayon', requis: true },
            { type: 'texte', cle: 'accroche', label: 'Accroche', exemple: 'Ex. : La fraîcheur au fil des saisons' },
            { type: 'texte-long', cle: 'description', label: 'Description', lignes: 3 },
            { type: 'choix', cle: 'theme', label: 'Couleur de la carte', options: [['rouge', 'Rouge'], ['blanc', 'Blanc'], ['noir', 'Noir']] },
            { type: 'photo', cle: 'image', alt: 'alt', label: 'Photo du rayon', dims: [1200, 1500], requis: true }
          ]
        }
      ],
      avant: function (c) {
        var vus = {};
        (c.rayons || []).forEach(function (r) {
          var base = r.id || slug(r.nom), id = base, i = 2;
          while (vus[id]) id = base + '-' + (i++);
          vus[id] = true;
          r.id = id;
        });
      }
    },
    {
      id: 'fraicheur', nom: 'Fraîcheur', icone: 'feuille', ancre: 'fraicheur',
      intro: "La grande photo qui s'agrandit pendant le défilement, puis le texte, les trois points forts et deux photos.",
      cles: ['textes.fraicheur', 'photos.fraicheur', 'photos.fruits', 'photos.legumes'],
      champs: [
        photo('photos.fraicheur', 'Grande photo (plein écran)', [2000, 1125], 'Une photo en largeur, très colorée : elle remplit tout l\'écran.'),
        titre('textes.fraicheur.titre', 'Titre sur la grande photo'),
        { type: 'texte', chemin: 'textes.fraicheur.chapo', label: 'Phrase en gras' },
        { type: 'texte-long', chemin: 'textes.fraicheur.texte', label: 'Texte', lignes: 3 },
        { type: 'carte', titre: 'Les trois points forts' },
        { type: 'groupe', champs: [{ type: 'texte', chemin: 'textes.fraicheur.point1Titre', label: 'Point 1', requis: true }, { type: 'texte', chemin: 'textes.fraicheur.point1', label: 'Texte du point 1' }] },
        { type: 'groupe', champs: [{ type: 'texte', chemin: 'textes.fraicheur.point2Titre', label: 'Point 2', requis: true }, { type: 'texte', chemin: 'textes.fraicheur.point2', label: 'Texte du point 2' }] },
        { type: 'groupe', champs: [{ type: 'texte', chemin: 'textes.fraicheur.point3Titre', label: 'Point 3', requis: true }, { type: 'texte', chemin: 'textes.fraicheur.point3', label: 'Texte du point 3' }] },
        { type: 'carte', titre: 'Photos' },
        photo('photos.fruits', 'Photo 1 (fruits)', [1200, 1500]),
        photo('photos.legumes', 'Photo 2 (légumes)', [1200, 1500])
      ]
    },
    {
      id: 'maghreb', nom: 'Saveurs du Maghreb', icone: 'etoile', ancre: 'maghreb',
      intro: "La rubrique des saveurs du Maghreb : textes, grande photo et cartes.",
      cles: ['textes.maghreb', 'photos.algerie', 'maghreb'],
      champs: [
        titre('textes.maghreb.titre'),
        { type: 'texte', chemin: 'textes.maghreb.chapo', label: 'Phrase en gras' },
        { type: 'texte-long', chemin: 'textes.maghreb.texte', label: 'Texte', lignes: 3 },
        { type: 'texte', chemin: 'textes.maghreb.bouton', label: 'Bouton vers les promos', requis: true },
        { type: 'carte', titre: 'Grande photo' },
        photo('photos.algerie', 'Grande photo', [1600, 1200]),
        { type: 'texte', chemin: 'textes.maghreb.badge', label: 'Pastille sur la photo' },
        { type: 'carte' },
        {
          type: 'liste', chemin: 'maghreb', label: 'Les cartes', element: 'une carte', singulier: 'carte', pluriel: 'cartes', vignette: 'image',
          resume: function (c) { return c.titre; },
          nouveau: function () { return { titre: '', texte: '', image: '', alt: '' }; },
          champs: [
            { type: 'texte', cle: 'titre', label: 'Titre', requis: true },
            { type: 'texte-long', cle: 'texte', label: 'Texte', lignes: 2 },
            { type: 'photo', cle: 'image', alt: 'alt', label: 'Photo', dims: [1200, 1200], requis: true }
          ]
        },
        { type: 'carte', titre: 'Bandeau' },
        { type: 'mots', chemin: 'textes.maghreb.ruban', label: 'Bandeau rouge qui défile', aide: AIDE_BANDEAU }
      ]
    },
    {
      id: 'galerie', nom: 'Galerie', icone: 'image', ancre: 'galerie',
      intro: "Les photos de la galerie et les filtres (catégories) au-dessus. Le visiteur peut agrandir chaque photo.",
      cles: ['textes.galerie', 'galerie'],
      champs: [
        titre('textes.galerie.titre'),
        { type: 'carte' },
        {
          type: 'liste', chemin: 'galerie.photos', label: 'Les photos', element: 'une photo', singulier: 'photo', pluriel: 'photos', vignette: 'image',
          resume: function (p) { return p.legende || p.alt; },
          nouveau: function (c) { var cat = ((c.galerie && c.galerie.categories) || [])[0]; return { image: '', legende: '', alt: '', categorie: cat ? cat.id : '', format: 'portrait' }; },
          champs: [
            { type: 'photo', cle: 'image', alt: 'alt', label: 'Photo', dims: [1600, 1600], requis: true },
            { type: 'texte', cle: 'legende', label: 'Légende' },
            { type: 'groupe', champs: [
              { type: 'choix', cle: 'categorie', label: 'Catégorie', options: function () { return ((travail.galerie && travail.galerie.categories) || []).map(function (c) { return [c.id, c.nom || 'Sans nom']; }); } },
              { type: 'choix', cle: 'format', label: 'Format', options: [['portrait', 'En hauteur'], ['paysage', 'En largeur'], ['carre', 'Carré']] }
            ] }
          ]
        },
        { type: 'carte' },
        {
          type: 'liste', chemin: 'galerie.categories', label: 'Les catégories (filtres)', element: 'une catégorie', singulier: 'catégorie', pluriel: 'catégories',
          aide: "Seules les catégories qui contiennent au moins une photo s'affichent sur le site.",
          resume: function (c) { return c.nom; },
          nouveau: function () { return { id: 'categorie-' + Date.now().toString(36), nom: '' }; },
          champs: [{ type: 'texte', cle: 'nom', label: 'Nom de la catégorie', requis: true }]
        }
      ],
      avant: function (c) {
        var g = c.galerie || {}, ids = (g.categories || []).map(function (x) { return x.id; });
        (g.photos || []).forEach(function (p) {
          if (ids.indexOf(p.categorie) < 0) p.categorie = ids[0] || '';
          if (vide(p.alt)) p.alt = p.legende || '';
        });
      }
    },
    {
      id: 'tiktok', nom: 'TikTok', icone: 'tiktok', ancre: 'tiktok',
      intro: "Les vignettes de vidéos TikTok et les textes de la rubrique. Le compte TikTok se règle dans « Coordonnées et réseaux ».",
      cles: ['textes.tiktok', 'tiktok'],
      champs: [
        titre('textes.tiktok.titre'),
        { type: 'texte-long', chemin: 'textes.tiktok.chapo', label: 'Phrase sous le titre', lignes: 2 },
        { type: 'texte', chemin: 'textes.tiktok.bouton', label: 'Bouton vers le compte', requis: true },
        { type: 'carte' },
        { type: 'case', chemin: 'tiktok.demo', label: "Vignettes d'exemple", aide: "Activé : chaque vignette porte la mention « Exemple ». Désactivez-le quand vous mettez vos vraies vidéos." },
        {
          type: 'liste', chemin: 'tiktok.videos', label: 'Les vidéos', element: 'une vidéo', singulier: 'vidéo', pluriel: 'vidéos', vignette: 'image', max: 8,
          resume: function (v) { return v.titre; },
          nouveau: function () { return { titre: '', lien: '', image: '' }; },
          champs: [
            { type: 'texte', cle: 'titre', label: 'Titre de la vidéo', requis: true },
            { type: 'url', cle: 'lien', label: 'Lien de la vidéo (facultatif)', aide: "Dans TikTok : Partager > Copier le lien. Sans lien, la vignette mène au compte TikTok.", exemple: 'https://www.tiktok.com/@bigmarket38/video/…' },
            { type: 'photo', cle: 'image', label: 'Image de la vignette', dims: [720, 1280], requis: true, aide: 'Une capture de la vidéo, en hauteur.' }
          ]
        }
      ]
    },
    {
      id: 'infos', nom: 'Infos pratiques', icone: 'info', ancre: 'infos',
      intro: "Les textes de la rubrique « Venir au magasin », les informations « Bon à savoir » et les questions fréquentes.",
      cles: ['textes.infos', 'bonASavoir', 'faq'],
      champs: [
        titre('textes.infos.titre'),
        { type: 'texte-long', chemin: 'textes.infos.chapo', label: 'Phrase sous le titre', lignes: 2 },
        { type: 'carte', titre: 'Bon à savoir', aide: "Les horaires, le dimanche, le nombre de rayons, TikTok et l'itinéraire s'ajoutent tout seuls. Ajoutez ici vos autres informations : paiement, stationnement, services..." },
        { type: 'texte', chemin: 'textes.infos.titreBonASavoir', label: 'Titre de la liste', requis: true },
        {
          type: 'liste', chemin: 'bonASavoir', element: 'une information', singulier: 'information', pluriel: 'informations',
          resume: function (x) { return x.titre; },
          nouveau: function () { return { titre: '', texte: '', icone: 'valide' }; },
          champs: [
            { type: 'texte', cle: 'titre', label: 'Titre', requis: true, exemple: 'Ex. : Paiement' },
            { type: 'texte', cle: 'texte', label: 'Texte', exemple: 'Ex. : Carte bancaire et espèces acceptées.' },
            { type: 'choix', cle: 'icone', label: 'Pictogramme', options: ICONES_INFO }
          ]
        },
        { type: 'carte', titre: 'Questions fréquentes', aide: "Mots remplacés automatiquement dans les réponses : {{horaires}}, {{dimanche}}, {{adresse}}, {{rayons}}, {{nbRayons}}, {{tiktok}}, {{telephone}}." },
        { type: 'texte', chemin: 'textes.infos.titreFaq', label: 'Titre de la liste', requis: true },
        {
          type: 'liste', chemin: 'faq', element: 'une question', singulier: 'question', pluriel: 'questions',
          resume: function (q) { return q.question; },
          nouveau: function () { return { question: '', reponse: '' }; },
          champs: [
            { type: 'texte', cle: 'question', label: 'Question', requis: true },
            { type: 'texte-long', cle: 'reponse', label: 'Réponse', requis: true, lignes: 3 }
          ]
        },
        { type: 'carte', titre: 'Fin de la rubrique' },
        { type: 'texte-long', chemin: 'textes.infos.contact', label: 'Texte du bloc « Une question ? »', lignes: 2 },
        { type: 'texte', chemin: 'textes.infos.merci', label: 'Bas du ticket des horaires' }
      ]
    },
    {
      id: 'coordonnees', nom: 'Coordonnées et réseaux', icone: 'pin', ancre: 'infos',
      intro: "Le nom, l'adresse, le téléphone, l'e-mail et les réseaux sociaux du magasin. L'adresse sert aussi aux boutons « Itinéraire ». Un champ laissé vide est masqué sur le site.",
      cles: ['magasin', 'textes.pied'],
      champs: [
        { type: 'groupe', champs: [
          { type: 'texte', chemin: 'magasin.nom', label: 'Nom du magasin', requis: true },
          { type: 'texte', chemin: 'magasin.signature', label: 'Signature' }
        ] },
        { type: 'texte', chemin: 'magasin.adresse', label: 'Adresse', requis: true },
        { type: 'groupe', champs: [
          { type: 'texte', chemin: 'magasin.codePostal', label: 'Code postal', requis: true },
          { type: 'texte', chemin: 'magasin.ville', label: 'Ville', requis: true }
        ] },
        { type: 'groupe', champs: [
          { type: 'tel', chemin: 'magasin.telephone', label: 'Téléphone (facultatif)', exemple: '04 76 00 00 00' },
          { type: 'email', chemin: 'magasin.email', label: 'E-mail (facultatif)', exemple: 'contact@…' }
        ] },
        { type: 'carte', titre: 'Position sur Google Maps', aide: "Facultatif. Sans lien, la carte et les itinéraires utilisent l'adresse ci-dessus." },
        { type: 'lieu', chemin: 'magasin.carte', label: 'Lien Google Maps du magasin',
          aide: "Dans Google Maps, ouvrez la fiche du magasin, touchez « Partager » puis « Copier le lien », et collez-le ici. Le code « Intégrer une carte » (sur ordinateur) fonctionne aussi.",
          exemple: 'https://maps.app.goo.gl/…' },
        { type: 'carte', titre: 'Réseaux sociaux' },
        { type: 'groupe', champs: [
          { type: 'url', chemin: 'magasin.reseaux.tiktok', label: 'Lien du compte TikTok', exemple: 'https://www.tiktok.com/@…' },
          { type: 'texte', chemin: 'magasin.reseaux.tiktokPseudo', label: 'Pseudo TikTok', exemple: '@bigmarket38' }
        ] },
        { type: 'url', chemin: 'magasin.reseaux.instagram', label: 'Instagram (facultatif)', exemple: 'https://www.instagram.com/…' },
        { type: 'url', chemin: 'magasin.reseaux.facebook', label: 'Facebook (facultatif)', exemple: 'https://www.facebook.com/…' },
        { type: 'url', chemin: 'magasin.reseaux.snapchat', label: 'Snapchat (facultatif)', exemple: 'https://www.snapchat.com/add/…' },
        { type: 'carte', titre: 'Pied de page' },
        { type: 'texte', chemin: 'textes.pied.slogan', label: 'Phrase sous le logo' }
      ]
    }
  ];
  var RUB = {};
  RUBRIQUES.forEach(function (r) { RUB[r.id] = r; });
  var GROUPES = [
    { titre: 'Au quotidien', ids: ['promos', 'horaires'] },
    { titre: 'Rubriques du site', ids: ['accueil', 'magasin', 'rayons', 'fraicheur', 'maghreb', 'galerie', 'tiktok', 'infos', 'coordonnees'] }
  ];

  /* =================================================================
     ÉTAT DES RUBRIQUES (modifiée ou non)
     ================================================================= */
  function etatRubrique(r) { return JSON.stringify(r.cles.map(function (c) { var v = O.lire(travail, c); return v === undefined ? null : v; })); }
  function modifiee(r) { return r.reference !== undefined && etatRubrique(r) !== r.reference; }
  function auMoinsUneModifiee() { return RUBRIQUES.some(modifiee); }

  var majPrevue = false, minuteurBrouillon = null;
  function changement() {
    if (!majPrevue) { majPrevue = true; requestAnimationFrame(function () { majPrevue = false; majIndicateurs(); }); }
    clearTimeout(minuteurBrouillon);
    minuteurBrouillon = setTimeout(sauverBrouillon, 500);
  }
  function majIndicateurs() {
    RUBRIQUES.forEach(function (r) {
      var b = $('[data-rubrique="' + r.id + '"]');
      if (!b) return;
      var point = $('.navigation__point', b), m = modifiee(r);
      if (m && !point) b.appendChild(el('span', { class: 'navigation__point', title: 'Modifications non enregistrées' }));
      if (!m && point) point.remove();
    });
    majBarre();
  }
  function majBarre(message, type) {
    var etat = $('#barre-etat'), r = active;
    if (!r) return;
    var m = modifiee(r);
    $('[data-enregistrer]').disabled = !m;
    $('[data-annuler]').disabled = !m;
    etat.classList.remove('est-modifie', 'est-ok');
    if (message) { etat.textContent = message; if (type) etat.classList.add(type); return; }
    if (m) { etat.textContent = 'Modifications non enregistrées'; etat.classList.add('est-modifie'); }
    else if (Date.now() - dernierEnregistrement < 60000) { etat.textContent = 'Enregistré à ' + heureCourte() + ' : en ligne sur le site'; etat.classList.add('est-ok'); }
    else etat.textContent = 'Aucune modification';
  }

  /* Brouillon : les modifications non enregistrées survivent à une fermeture d'onglet */
  function sauverBrouillon() {
    var modifs = {}, n = 0;
    RUBRIQUES.forEach(function (r) { if (modifiee(r)) r.cles.forEach(function (c) { modifs[c] = O.lire(travail, c); n++; }); });
    try {
      if (n) localStorage.setItem(CLE_BROUILLON, JSON.stringify({ le: Date.now(), email: session && session.email, modifs: modifs }));
      else localStorage.removeItem(CLE_BROUILLON);
    } catch (e) { /* stockage indisponible */ }
  }
  function reprendreBrouillon() {
    var b = null;
    try { b = JSON.parse(localStorage.getItem(CLE_BROUILLON) || 'null'); } catch (e) { b = null; }
    if (!b || !b.modifs || Date.now() - b.le > 3 * 864e5 || (b.email && session && b.email !== session.email)) return 0;
    var n = 0;
    Object.keys(b.modifs).forEach(function (c) {
      if (RUBRIQUES.some(function (r) { return r.cles.indexOf(c) > -1; })) { O.ecrire(travail, c, b.modifs[c]); n++; }
    });
    return n;
  }

  /* =================================================================
     CHAMPS DU FORMULAIRE
     ================================================================= */
  function bloc(def, id) {
    var b = el('div', { class: 'champ' });
    if (def.label) b.appendChild(el(id ? 'label' : 'p', id ? { for: id } : { class: 'champ__label' }, def.label));
    if (def.aide) b.appendChild(el('p', { class: 'champ__aide', id: id ? id + '-aide' : null }, def.aide));
    return b;
  }
  function autoHauteur(t) {
    function ajuste() { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 3, 520) + 'px'; }
    t.addEventListener('input', ajuste);
    requestAnimationFrame(ajuste);
  }

  function champ(def, objet, chemin) {
    switch (def.type) {
      case 'texte': case 'texte-long': case 'mots': case 'url': case 'email': case 'tel': return champTexte(def, objet, chemin);
      case 'titre': return champTitre(def, objet, chemin);
      case 'prix': return champPrix(def, objet, chemin);
      case 'date': return champDate(def, objet, chemin);
      case 'choix': return champChoix(def, objet, chemin);
      case 'case': return champCase(def, objet, chemin);
      case 'photo': return champPhoto(def, objet, chemin);
      case 'liste': return champListe(def, objet, chemin);
      case 'horaires': return champHoraires(def, objet, chemin);
      case 'lieu': return champLieu(def, objet, chemin);
      case 'periode': return champPeriode(def, objet);
      case 'exception': return champException(def, objet);
      case 'groupe':
        var g = el('div', { class: 'groupe' });
        def.champs.forEach(function (d) { g.appendChild(champ(d, objet, d.chemin || d.cle)); });
        return g;
      case 'note': return el('p', { class: 'note' }, def.texte);
    }
    return el('div');
  }

  function champTexte(def, objet, chemin) {
    var id = nouvelId(), b = bloc(def, id), long = def.type === 'texte-long';
    var input = el(long ? 'textarea' : 'input', {
      id: id, type: long ? null : ({ url: 'url', email: 'email', tel: 'tel' }[def.type] || 'text'), rows: long ? (def.lignes || 3) : null,
      placeholder: def.exemple || null, 'aria-describedby': def.aide ? id + '-aide' : null, autocomplete: 'off',
      inputmode: def.type === 'tel' ? 'tel' : (def.type === 'email' ? 'email' : (def.type === 'url' ? 'url' : null)),
      spellcheck: def.type === 'url' || def.type === 'email' ? 'false' : null, list: def.suggestions ? id + '-liste' : null
    });
    var v = O.lire(objet, chemin);
    input.value = v == null ? '' : String(v);
    input.addEventListener('input', function () { O.ecrire(objet, chemin, input.value); changement(); });
    b.appendChild(input);
    if (def.suggestions) b.appendChild(el('datalist', { id: id + '-liste' }, def.suggestions.map(function (s) { return el('option', { value: s }); })));
    if (long) autoHauteur(input);
    return b;
  }

  /* Lien Google Maps : lien court ou long de la fiche, ou code « Intégrer une carte ».
     On en tire la position (coordonnées) ou le nom + l'adresse tels que Google les donne.
     Un lien court (maps.app.goo.gl) est lu par la fonction acces-admin, le navigateur ne pouvant pas l'ouvrir lui-même. */
  var VIDE_LIEU = { texte: '', lien: '', integration: '', requete: '', latitude: null, longitude: null, precision: '' };
  function champLieu(def, objet, chemin) {
    var id = nouvelId(), b = bloc(def, id);
    b.classList.add('champ--lieu');
    var t = el('textarea', { id: id, rows: 2, placeholder: def.exemple || null, 'aria-describedby': id + '-aide ' + id + '-etat', autocomplete: 'off', spellcheck: 'false' });
    var etat = el('p', { class: 'lieu__etat', id: id + '-etat', role: 'status', 'aria-live': 'polite' });
    var verifier = el('a', { class: 'bouton bouton--contour bouton--petit', target: '_blank', rel: 'noopener', hidden: true }, [icone('pin'), 'Vérifier dans Google Maps']);
    var effacer = el('button', { type: 'button', class: 'bouton bouton--contour bouton--petit' }, 'Effacer');
    var apercu = el('div', { class: 'lieu__apercu', hidden: true });
    var actuel = O.lire(objet, chemin) || {};
    t.value = actuel.texte || '';
    b.appendChild(t);
    b.appendChild(etat);
    b.appendChild(el('div', { class: 'lieu__outils' }, [verifier, effacer]));
    b.appendChild(apercu);
    var numero = 0, minuteur = 0;

    function ecrire(c) {
      var avant = JSON.stringify(O.lire(objet, chemin) || {});
      var apres = Object.assign({}, VIDE_LIEU, O.lire(objet, chemin) || {}, c);
      if (JSON.stringify(apres) === avant) return;
      O.ecrire(objet, chemin, apres);
      changement();
    }
    function montrer(c, message, ton) {
      etat.textContent = message;
      etat.className = 'lieu__etat' + (ton ? ' lieu__etat--' + ton : '');
      var src = '';
      if (c && c.integration) src = c.integration;
      else if (c && c.latitude != null) src = 'https://maps.google.com/maps?q=' + c.latitude + ',' + c.longitude + '&z=17&output=embed';
      else if (c && c.requete) src = 'https://maps.google.com/maps?q=' + encodeURIComponent(c.requete) + '&z=16&output=embed';
      var lien = c && (c.lien || (c.latitude != null ? 'https://www.google.com/maps/search/?api=1&query=' + c.latitude + '%2C' + c.longitude : ''));
      if (lien) { verifier.href = lien; verifier.hidden = false; } else verifier.hidden = true;
      var f = $('iframe', apercu);
      if (!src) { apercu.hidden = true; if (f) f.remove(); return; }
      apercu.hidden = false;
      if (f && f.getAttribute('src') === src) return;
      if (f) f.remove();
      apercu.appendChild(el('iframe', { src: src, title: 'Aperçu de la position sur Google Maps', loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade' }));
    }
    function messageFinal(c) {
      if (c.integration) return ['Carte Google reconnue : le site affichera exactement cette carte.', 'ok'];
      if (c.latitude != null) return ['Position trouvée (' + Number(c.latitude).toFixed(5) + ', ' + Number(c.longitude).toFixed(5) + ') : la carte et les itinéraires du site pointeront ici.', 'ok'];
      if (c.requete) return ['Fiche reconnue : « ' + c.requete + ' ». La carte et les itinéraires du site l’utiliseront.', 'ok'];
      return ['Lien enregistré pour le bouton « Voir la fiche Google Maps ». La position exacte n’a pas pu être lue : la carte du site utilisera l’adresse.', 'info'];
    }
    function depuis(L, texte) {
      var c = { texte: texte, lien: L.lien, integration: L.integration, requete: L.requete, latitude: L.latitude, longitude: L.longitude, precision: L.precision };
      if (L.precision === 'centre') { c.latitude = null; c.longitude = null; c.precision = ''; }   // simple centre de carte : trop imprécis
      return c;
    }
    function analyser() {
      var texte = t.value.trim(), n = ++numero;
      if (!texte) { ecrire(Object.assign({}, VIDE_LIEU)); montrer(null, 'Aucun lien : la carte et les itinéraires utilisent l’adresse du magasin.'); return; }
      var L = O.lieuMaps(texte);
      if (!L.valide) { ecrire(Object.assign({}, VIDE_LIEU, { texte: texte })); montrer(null, 'Ce n’est pas un lien Google Maps. Copiez-le depuis Google Maps : fiche du magasin, « Partager », « Copier le lien ».', 'erreur'); return; }
      var c = depuis(L, texte);
      ecrire(c);
      if (L.precision === 'centre') { montrer(c, 'Ce lien montre seulement une zone de la carte, pas le magasin. Ouvrez la fiche du magasin dans Google Maps et copiez son lien.', 'erreur'); return; }
      if (L.court) {
        montrer(c, 'Lien court reconnu : recherche de la position…', 'attente');
        jeton().then(function (j) { return S.fonction('acces-admin', { action: 'lien-maps', lien: L.lien }, j); }).then(function (r) {
          if (n !== numero) return;
          var L2 = O.lieuMaps(r && r.lien);
          if (!L2.valide) throw new Error('illisible');
          var c2 = depuis(L2, texte);
          c2.lien = L.lien;            // on garde le lien court, plus lisible, pour ouvrir la fiche
          ecrire(c2);
          var m = messageFinal(c2); montrer(c2, m[0], m[1]);
        }).catch(function () {
          if (n !== numero) return;
          var m = messageFinal(c); montrer(c, m[0], m[1]);
        });
        return;
      }
      var m = messageFinal(c); montrer(c, m[0], m[1]);
    }
    t.addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(analyser, 450); });
    t.addEventListener('paste', function () { clearTimeout(minuteur); minuteur = setTimeout(analyser, 30); });
    effacer.addEventListener('click', function () { t.value = ''; analyser(); t.focus(); });
    // état affiché à l'ouverture (sans rien modifier)
    if (!t.value.trim()) montrer(null, 'Aucun lien : la carte et les itinéraires utilisent l’adresse du magasin.');
    else if (actuel.lien || actuel.integration || actuel.requete || actuel.latitude != null) { var m0 = messageFinal(actuel); montrer(actuel, m0[0], m0[1]); }
    else montrer(null, 'Ce n’est pas un lien Google Maps. Copiez-le depuis Google Maps : fiche du magasin, « Partager », « Copier le lien ».', 'erreur');
    return b;
  }

  function champTitre(def, objet, chemin) {
    var id = nouvelId(), b = bloc(def, id);
    var t = el('textarea', { id: id, rows: 2, 'aria-describedby': id + '-aide', autocomplete: 'off' });
    var apercu = el('div', { class: 'titre-apercu', 'aria-hidden': 'true' });
    function dessine() {
      apercu.innerHTML = '';
      String(t.value).split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 4).forEach(function (l) { apercu.appendChild(el('span', null, l)); });
      apercu.hidden = !apercu.childNodes.length;
    }
    t.value = String(O.lire(objet, chemin) || '');
    t.addEventListener('input', function () { O.ecrire(objet, chemin, t.value); dessine(); changement(); });
    b.appendChild(t);
    b.appendChild(apercu);
    autoHauteur(t);
    dessine();
    return b;
  }

  function champPrix(def, objet, chemin) {
    var id = nouvelId(), b = bloc(def, id);
    var boite = el('div', { class: 'champ__suffixe' });
    var input = el('input', { id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0,00' });
    var v = O.lire(objet, chemin);
    input.value = v == null || v === '' ? '' : String(v).replace('.', ',');
    input.addEventListener('input', function () {
      var t = input.value.trim().replace(/\s/g, '').replace('€', '').replace(',', '.');
      if (t === '') O.ecrire(objet, chemin, null);
      else if (/^\d+(\.\d{0,2})?$/.test(t)) O.ecrire(objet, chemin, Math.round(parseFloat(t) * 100) / 100);
      else O.ecrire(objet, chemin, input.value);   // valeur incorrecte : signalée à l'enregistrement
      changement();
    });
    boite.appendChild(input);
    boite.appendChild(el('span', { 'aria-hidden': 'true' }, '€'));
    b.appendChild(boite);
    return b;
  }

  function champDate(def, objet, chemin) {
    var id = nouvelId(), b = bloc(def, id);
    var input = el('input', { id: id, type: 'date' });
    input.value = O.lire(objet, chemin) || '';
    input.addEventListener('input', function () { O.ecrire(objet, chemin, input.value); changement(); });
    b.appendChild(input);
    return b;
  }

  function champChoix(def, objet, chemin) {
    var id = nouvelId(), b = bloc(def, id);
    var options = typeof def.options === 'function' ? def.options(objet) : def.options;
    var s = el('select', { id: id }, options.map(function (o) { return el('option', { value: o[0] }, o[1]); }));
    var v = O.lire(objet, chemin);
    if (v != null && options.some(function (o) { return o[0] === v; })) s.value = v;
    else if (options.length) { s.value = options[0][0]; O.ecrire(objet, chemin, options[0][0]); }
    s.addEventListener('change', function () { O.ecrire(objet, chemin, s.value); changement(); });
    b.appendChild(s);
    return b;
  }

  function champCase(def, objet, chemin) {
    var id = nouvelId();
    var input = el('input', { id: id, type: 'checkbox', role: 'switch' });
    input.checked = !!O.lire(objet, chemin);
    input.addEventListener('change', function () { O.ecrire(objet, chemin, input.checked); changement(); });
    return el('label', { class: 'bascule', for: id }, [
      input, el('span', { class: 'bascule__piste', 'aria-hidden': 'true' }),
      el('span', { class: 'bascule__texte' }, [el('strong', null, def.label), def.aide ? el('span', null, def.aide) : null])
    ]);
  }

  /* ---------- Photos : choix, réduction automatique, envoi ---------- */
  function decoder(fichier) {
    var essai = window.createImageBitmap ? createImageBitmap(fichier, { imageOrientation: 'from-image' }).catch(function () { return null; }) : Promise.resolve(null);
    return essai.then(function (bmp) {
      if (bmp) return bmp;
      return new Promise(function (ok, ko) {
        var u = URL.createObjectURL(fichier), i = new Image();
        i.onload = function () { ok(i); setTimeout(function () { URL.revokeObjectURL(u); }, 2000); };
        i.onerror = function () { URL.revokeObjectURL(u); ko(new Error('format')); };
        i.src = u;
      });
    });
  }
  function preparerPhoto(fichier, dims) {
    if (fichier.size > 40 * 1024 * 1024) return Promise.reject(new Error('lourde'));
    return decoder(fichier).then(function (src) {
      var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
      if (!w || !h) throw new Error('format');
      var k = Math.min(1, Math.max(dims[0] / w, dims[1] / h), 2400 / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, cw, ch);
      if (src.close) src.close();
      return new Promise(function (ok, ko) {
        c.toBlob(function (blob) { if (blob) ok({ blob: blob, largeur: cw, hauteur: ch }); else ko(new Error('conversion')); }, 'image/jpeg', 0.86);
      });
    });
  }
  function messagePhoto(e) {
    if (e.message === 'format') return "Cette photo n'a pas pu être lue. Choisissez une photo JPEG ou PNG (sur iPhone, une photo de la pellicule convient).";
    if (e.message === 'lourde') return 'Cette photo est trop lourde (plus de 40 Mo).';
    if (e.statut === 401) return 'Votre session a expiré : reconnectez-vous puis recommencez.';
    if (e.statut === 403) return "Ce compte n'a pas le droit d'envoyer des photos.";
    if (!e.statut) return "L'envoi de la photo a échoué : vérifiez votre connexion internet.";
    return "L'envoi de la photo a échoué (" + e.message + ').';
  }

  function champPhoto(def, objet, chemin) {
    var id = nouvelId(), b = el('div', { class: 'champ' });
    if (def.label) b.appendChild(el('p', { class: 'champ__label' }, def.label));
    if (def.aide) b.appendChild(el('p', { class: 'champ__aide' }, def.aide));
    var cadre = el('div', { class: 'photo__cadre' });
    cadre.style.aspectRatio = def.dims[0] + ' / ' + def.dims[1];
    var img = el('img', { alt: '', loading: 'lazy' });
    cadre.appendChild(img);
    var fichier = el('input', { type: 'file', id: id, class: 'photo__fichier', accept: 'image/*', tabindex: '-1', 'aria-hidden': 'true' });
    var choisir = el('button', { type: 'button', class: 'bouton bouton--noir bouton--petit' }, [icone('photo'), 'Choisir une photo']);
    var origine = O.lire(ORIGINE, chemin);
    var retour = def.chemin && origine ? el('button', { type: 'button', class: 'bouton bouton--contour bouton--petit' }, [icone('retour'), "Photo d'origine"]) : null;
    var info = el('p', { class: 'photo__info' }, 'Format conseillé : ' + def.dims[0] + ' × ' + def.dims[1] + ' px. Les grandes photos sont réduites automatiquement.');
    var droite = el('div', { class: 'photo__droite' }, [el('div', { class: 'photo__boutons' }, [choisir, retour]), info, fichier]);
    if (def.alt) {
      var idAlt = nouvelId();
      var alt = el('input', { id: idAlt, type: 'text', autocomplete: 'off', placeholder: 'Ex. : L\'étal des fruits et légumes' });
      alt.value = O.lire(objet, def.alt) || '';
      alt.addEventListener('input', function () { O.ecrire(objet, def.alt, alt.value); changement(); });
      droite.appendChild(el('div', { class: 'champ' }, [el('label', { for: idAlt }, 'Description de la photo'), el('p', { class: 'champ__aide' }, 'Lue par les malvoyants et par Google.'), alt]));
    }
    b.appendChild(el('div', { class: 'photo' }, [cadre, droite]));

    function montrer() {
      var v = O.lire(objet, chemin);
      if (v) { img.hidden = false; img.src = url(v); } else { img.hidden = true; img.removeAttribute('src'); }
      if (retour) retour.disabled = v === origine;
    }
    img.onerror = function () { img.hidden = true; };
    choisir.addEventListener('click', function () { fichier.click(); });
    if (retour) retour.addEventListener('click', function () {
      O.ecrire(objet, chemin, origine);
      if (def.alt) { var a = O.lire(ORIGINE, def.alt) || ''; O.ecrire(objet, def.alt, a); var champAlt = $('input[type="text"]', droite); if (champAlt) champAlt.value = a; }
      montrer(); changement();
      b.dispatchEvent(new CustomEvent('photo-changee', { bubbles: true }));
    });
    fichier.addEventListener('change', function () {
      var f = fichier.files && fichier.files[0];
      if (!f) return;
      cadre.classList.add('est-occupe');
      choisir.disabled = true;
      var resultat = null;
      preparerPhoto(f, def.dims).then(function (r) {
        resultat = r;
        var nom = (active ? active.id : 'photos') + '/' + slug(def.label || 'photo') + '-' + Date.now().toString(36) + '.jpg';
        return jeton().then(function (j) { return S.envoyerPhoto(j, nom, r.blob, 'image/jpeg'); });
      }).then(function (lien) {
        O.ecrire(objet, chemin, lien);
        montrer();
        changement();
        info.textContent = 'Nouvelle photo : ' + resultat.largeur + ' × ' + resultat.hauteur + ' px (' + Math.max(1, Math.round(resultat.blob.size / 1024)) + ' Ko). Pensez à enregistrer.';
        b.dispatchEvent(new CustomEvent('photo-changee', { bubbles: true }));
      }).catch(function (e) {
        toast(messagePhoto(e), true);
      }).then(function () {
        cadre.classList.remove('est-occupe');
        choisir.disabled = false;
        fichier.value = '';
      });
    });
    montrer();
    return b;
  }

  /* ---------- Listes : ajouter, ouvrir, réordonner, supprimer ---------- */
  function champListe(def, objet, chemin) {
    var b = el('div', { class: 'liste' });
    var compte = el('span', { class: 'liste__compte' });
    b.appendChild(el('div', { class: 'liste__tete' }, [def.label ? el('h3', { class: 'carte__titre' }, def.label) : el('span'), compte]));
    if (def.aide) b.appendChild(el('p', { class: 'champ__aide' }, def.aide));
    var ol = el('ol', { class: 'liste__elements' });
    var ajouter = el('button', { type: 'button', class: 'ajouter' }, [icone('plus'), 'Ajouter ' + def.element]);
    b.appendChild(ol);
    b.appendChild(ajouter);
    var ouverts = def.__ouverts || (def.__ouverts = new WeakSet());

    function tableau() {
      var t = O.lire(objet, chemin);
      if (!Array.isArray(t)) { t = []; O.ecrire(objet, chemin, t); }
      return t;
    }
    function resume(item, i) { var r = def.resume ? def.resume(item) : ''; return r && String(r).trim() ? r : (i === -1 ? 'Nouveau' : 'Sans titre ' + (i + 1)); }
    function dessiner() {
      var t = tableau();
      compte.textContent = t.length + ' ' + (t.length > 1 ? def.pluriel : def.singulier);
      ol.innerHTML = '';
      t.forEach(function (item, i) { ol.appendChild(element(item, i, t)); });
      ajouter.hidden = !!(def.max && t.length >= def.max);
    }
    function element(item, i, t) {
      var ouvert = ouverts.has(item);
      var li = el('li', { class: 'element' + (ouvert ? ' est-ouvert' : '') });
      var corpsId = nouvelId();
      var vignette = def.vignette ? el('img', { class: 'element__vignette', alt: '' }) : null;
      if (vignette) { if (item[def.vignette]) vignette.src = url(item[def.vignette]); vignette.onerror = function () { vignette.removeAttribute('src'); }; }
      var titreEl = el('span', { class: 'element__titre' }, resume(item, i));
      var fleche = icone('bas'); fleche.classList.add('element__fleche');
      var ouvrir = el('button', { type: 'button', class: 'element__ouvrir', 'aria-expanded': String(ouvert), 'aria-controls': corpsId }, [vignette, titreEl, fleche]);
      function action(ic, libelle, inactif, classe) {
        var a = el('button', { type: 'button', class: 'element__action' + (classe ? ' ' + classe : ''), 'aria-label': libelle + ' : ' + resume(item, i), title: libelle }, icone(ic));
        a.disabled = !!inactif;
        return a;
      }
      var haut = action('haut', 'Monter', i === 0), bas = action('bas', 'Descendre', i === t.length - 1), suppr = action('corbeille', 'Supprimer', false, 'element__action--suppr');
      li.appendChild(el('div', { class: 'element__tete' }, [ouvrir, el('div', { class: 'element__actions' }, [haut, bas, suppr])]));
      var corps = el('div', { class: 'element__corps', id: corpsId });
      corps.hidden = !ouvert;
      if (ouvert) def.champs.forEach(function (d) { corps.appendChild(champ(d, item, d.cle)); });
      li.appendChild(corps);

      function majTitre() { titreEl.textContent = resume(item, i); }
      corps.addEventListener('input', majTitre);
      corps.addEventListener('change', majTitre);
      corps.addEventListener('photo-changee', function () { if (vignette) { if (item[def.vignette]) vignette.src = url(item[def.vignette]); else vignette.removeAttribute('src'); } });
      ouvrir.addEventListener('click', function () {
        if (ouverts.has(item)) ouverts.delete(item); else ouverts.add(item);
        var nouveau = element(item, i, t);
        li.replaceWith(nouveau);
        $('.element__ouvrir', nouveau).focus();
      });
      haut.addEventListener('click', function () { var x = t[i - 1]; t[i - 1] = t[i]; t[i] = x; changement(); dessiner(); var btn = $$('.element__ouvrir', ol)[i - 1]; if (btn) btn.focus(); });
      bas.addEventListener('click', function () { var x = t[i + 1]; t[i + 1] = t[i]; t[i] = x; changement(); dessiner(); var btn = $$('.element__ouvrir', ol)[i + 1]; if (btn) btn.focus(); });
      suppr.addEventListener('click', function () {
        confirmer('Supprimer ' + def.element + ' ?', '« ' + resume(item, i) + " » sera retiré du site dès que vous aurez enregistré.", 'Supprimer').then(function (oui) {
          if (!oui) return;
          t.splice(i, 1);
          changement();
          dessiner();
        });
      });
      return li;
    }
    ajouter.addEventListener('click', function () {
      var t = tableau(), n = def.nouveau(travail);
      t.push(n);
      ouverts.add(n);
      changement();
      dessiner();
      var dernier = ol.lastElementChild;
      if (dernier) {
        dernier.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var premier = $('.element__corps input, .element__corps textarea', dernier);
        if (premier) setTimeout(function () { premier.focus({ preventScroll: true }); }, 350);
      }
    });
    dessiner();
    return b;
  }

  /* ---------- Horaires de la semaine ---------- */
  function champHoraires(def, objet, chemin) {
    var H = O.lire(objet, chemin);
    if (!H || typeof H !== 'object') { H = {}; O.ecrire(objet, chemin, H); }
    var b = el('div', { class: 'horaires' });
    var memo = {};
    O.ORDRE.forEach(function (j) {
      var id = nouvelId(), ligne = el('div', { class: 'horaires__jour', 'data-jour': j });
      var caseOuvert = el('input', { id: id, type: 'checkbox', role: 'switch' });
      var bascule = el('label', { class: 'bascule', for: id }, [caseOuvert, el('span', { class: 'bascule__piste', 'aria-hidden': 'true' }), el('span', { class: 'bascule__texte' }, el('strong', null, 'Ouvert'))]);
      var o = el('input', { type: 'time', 'aria-label': j + ' : ouverture', step: '300' });
      var f = el('input', { type: 'time', 'aria-label': j + ' : fermeture', step: '300' });
      var heures = el('div', { class: 'horaires__heures' }, [o, el('span', { 'aria-hidden': 'true' }, '–'), f]);
      var ferme = el('p', { class: 'horaires__ferme' }, 'Fermé toute la journée');
      ligne.appendChild(el('span', { class: 'horaires__nom' }, j));
      ligne.appendChild(bascule);
      ligne.appendChild(heures);
      ligne.appendChild(ferme);
      function montrer() {
        var x = H[j], ouvert = !!(x && x.ouverture);
        caseOuvert.checked = ouvert;
        heures.hidden = !ouvert;
        ferme.hidden = ouvert;
        if (ouvert) { o.value = x.ouverture; f.value = x.fermeture || ''; memo[j] = { ouverture: x.ouverture, fermeture: x.fermeture }; }
      }
      caseOuvert.addEventListener('change', function () {
        H[j] = caseOuvert.checked ? (memo[j] || { ouverture: '09:00', fermeture: '19:00' }) : null;
        montrer(); changement();
      });
      o.addEventListener('input', function () { if (H[j]) { H[j].ouverture = o.value; changement(); } });
      f.addEventListener('input', function () { if (H[j]) { H[j].fermeture = f.value; changement(); } });
      montrer();
      b.appendChild(ligne);
    });
    var copier = el('button', { type: 'button', class: 'lien' }, 'Appliquer les horaires du lundi du mardi au samedi');
    copier.addEventListener('click', function () {
      ['mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].forEach(function (j) { H[j] = H.lundi ? { ouverture: H.lundi.ouverture, fermeture: H.lundi.fermeture } : null; });
      changement(); rendre();
      toast('Horaires du lundi appliqués du mardi au samedi.');
    });
    b.appendChild(el('div', null, copier));
    return b;
  }

  /* ---------- Période d'une promo ---------- */
  function champPeriode(def, item) {
    var b = el('div', { class: 'champ' });
    b.appendChild(el('p', { class: 'champ__label' }, def.label || 'Période'));
    var nom = nouvelId();
    var rDates = el('input', { type: 'radio', name: nom, value: 'dates' }), rSemaine = el('input', { type: 'radio', name: nom, value: 'semaine' });
    b.appendChild(el('div', { class: 'choix-ligne' }, [el('label', null, [rDates, 'Entre deux dates']), el('label', null, [rSemaine, 'Chaque semaine, sans fin'])]));
    var idD = nouvelId(), idF = nouvelId();
    var debut = el('input', { id: idD, type: 'date' }), fin = el('input', { id: idF, type: 'date' });
    var cette = el('button', { type: 'button', class: 'lien' }, 'Cette semaine'), prochaine = el('button', { type: 'button', class: 'lien' }, 'La semaine prochaine');
    var dates = el('div', null, [
      el('div', { class: 'groupe' }, [el('div', { class: 'champ' }, [el('label', { for: idD }, 'Du'), debut]), el('div', { class: 'champ' }, [el('label', { for: idF }, 'Au (inclus)'), fin])]),
      el('div', { class: 'choix-ligne' }, [cette, prochaine])
    ]);
    var aide = el('p', { class: 'champ__aide' });
    b.appendChild(dates);
    b.appendChild(aide);
    function montrer() {
      var sem = item.debut === 'semaine' || item.fin === 'semaine';
      rSemaine.checked = sem; rDates.checked = !sem; dates.hidden = sem;
      if (!sem) { debut.value = item.debut || ''; fin.value = item.fin || ''; }
      aide.textContent = sem ? "La promo s'affiche chaque semaine, du lundi au dimanche, jusqu'à ce que vous la supprimiez."
        : (item.fin ? 'La promo disparaîtra toute seule du site après le ' + O.dateLongue(item.fin) + '.' : '');
    }
    function regler(s) { item.debut = s.lundi; item.fin = s.dimanche; montrer(); changement(); }
    rSemaine.addEventListener('change', function () { item.debut = 'semaine'; item.fin = 'semaine'; montrer(); changement(); });
    rDates.addEventListener('change', function () { regler(semaine(0)); });
    cette.addEventListener('click', function () { regler(semaine(0)); });
    prochaine.addEventListener('click', function () { regler(semaine(1)); });
    debut.addEventListener('input', function () { item.debut = debut.value; montrer(); changement(); });
    fin.addEventListener('input', function () { item.fin = fin.value; montrer(); changement(); });
    montrer();
    return b;
  }

  /* ---------- Fermeture exceptionnelle ---------- */
  function champException(def, item) {
    var id = nouvelId(), b = el('div', { class: 'groupe' });
    var mode = el('select', { id: id }, [el('option', { value: 'ferme' }, 'Fermé toute la journée'), el('option', { value: 'horaires' }, 'Horaires spéciaux')]);
    var o = el('input', { type: 'time', step: '300', 'aria-label': 'Ouverture' }), f = el('input', { type: 'time', step: '300', 'aria-label': 'Fermeture' });
    var heures = el('div', { class: 'champ' }, [el('p', { class: 'champ__label' }, 'Horaires ce jour-là'), el('div', { class: 'horaires__heures' }, [o, el('span', { 'aria-hidden': 'true' }, '–'), f])]);
    b.appendChild(el('div', { class: 'champ' }, [el('label', { for: id }, 'Ce jour-là'), mode]));
    b.appendChild(heures);
    function montrer() {
      var sp = !item.ferme;
      mode.value = sp ? 'horaires' : 'ferme';
      heures.hidden = !sp;
      if (sp) { o.value = item.ouverture || ''; f.value = item.fermeture || ''; }
    }
    mode.addEventListener('change', function () {
      if (mode.value === 'ferme') { item.ferme = true; delete item.ouverture; delete item.fermeture; }
      else { delete item.ferme; item.ouverture = item.ouverture || '09:00'; item.fermeture = item.fermeture || '13:00'; }
      montrer(); changement();
    });
    o.addEventListener('input', function () { item.ouverture = o.value; changement(); });
    f.addEventListener('input', function () { item.fermeture = f.value; changement(); });
    montrer();
    return b;
  }

  /* =================================================================
     VÉRIFICATION AVANT ENREGISTREMENT
     ================================================================= */
  function erreurs(defs, objet, contexte) {
    var liste = [];
    defs.forEach(function (d) {
      if (d.type === 'groupe') { liste = liste.concat(erreurs(d.champs, objet, contexte)); return; }
      var chemin = d.chemin || d.cle, v = chemin ? O.lire(objet, chemin) : undefined, nom = contexte + (d.label ? '« ' + d.label + ' »' : '');
      if (d.requis && d.type !== 'photo' && d.type !== 'liste' && vide(v)) liste.push(nom + ' ne peut pas être vide.');
      if (d.type === 'photo' && d.requis && vide(v)) liste.push(contexte + 'il manque la photo.');
      if (d.type === 'prix' && !vide(v) && !(typeof v === 'number' && v >= 0)) liste.push(nom + ' : prix incorrect (exemple : 1,99).');
      if (d.type === 'url' && !vide(v) && !/^https?:\/\/\S+$/i.test(v)) liste.push(nom + " : l'adresse doit commencer par https://");
      if (d.type === 'lieu' && v && !vide(v.texte)) {
        var L = O.lieuMaps(v.texte);
        if (!L.valide) liste.push(nom + ' : ce n’est pas un lien Google Maps (fiche du magasin, « Partager », « Copier le lien »).');
        else if (L.precision === 'centre') liste.push(nom + ' : ce lien montre une zone de la carte, pas le magasin. Copiez le lien de la fiche du magasin.');
      }
      if (d.type === 'email' && !vide(v) && !/^\S+@\S+\.\S+$/.test(v)) liste.push(nom + ' : adresse e-mail incorrecte.');
      if (d.type === 'periode' && objet.debut !== 'semaine') {
        if (!objet.debut || !objet.fin) liste.push(contexte + 'indiquez les dates de début et de fin.');
        else if (objet.fin < objet.debut) liste.push(contexte + 'la date de fin est avant la date de début.');
      }
      if (d.type === 'exception' && !objet.ferme && (!objet.ouverture || !objet.fermeture || objet.fermeture <= objet.ouverture)) liste.push(contexte + "les horaires spéciaux sont incomplets (l'heure de fermeture doit suivre l'heure d'ouverture).");
      if (d.type === 'horaires') {
        O.ORDRE.forEach(function (j) {
          var x = (v || {})[j];
          if (x && (!x.ouverture || !x.fermeture || x.fermeture <= x.ouverture)) liste.push('Horaires du ' + j + " : l'heure de fermeture doit suivre l'heure d'ouverture.");
        });
      }
      if (d.type === 'liste') {
        (Array.isArray(v) ? v : []).forEach(function (item, i) {
          var r = d.resume ? d.resume(item) : '';
          liste = liste.concat(erreurs(d.champs, item, (r && String(r).trim() ? '« ' + r + ' »' : d.singulier.charAt(0).toUpperCase() + d.singulier.slice(1) + ' n°' + (i + 1)) + ' : '));
        });
      }
    });
    return liste;
  }

  /* =================================================================
     AFFICHAGE D'UNE RUBRIQUE
     ================================================================= */
  function derniereModif(r) {
    var d = null, par = '';
    r.cles.forEach(function (c) { var x = infos[c]; if (x && x.le && (!d || x.le > d)) { d = x.le; par = x.par; } });
    return d ? { le: d, par: par } : null;
  }
  function tete(r) {
    var m = derniereModif(r);
    var meta = el('div', { class: 'panneau__meta' }, [
      el('span', null, m ? 'Dernière modification : ' + dateHeure(m.le) : "Contenu d'origine, jamais modifié"),
      el('a', { class: 'lien', href: '../index.html#' + r.ancre, target: '_blank', rel: 'noopener' }, 'Voir sur le site'),
      el('button', { type: 'button', class: 'lien lien--discret', 'data-precedente': '' }, 'Version précédente'),
      el('button', { type: 'button', class: 'lien lien--discret', 'data-origine': '' }, "Contenu d'origine")
    ]);
    return el('div', { class: 'panneau__tete' }, [el('h1', { class: 'panneau__titre' }, r.nom), el('p', { class: 'panneau__intro' }, r.intro), meta]);
  }
  function rendre() {
    var r = active, p = $('#panneau');
    p.innerHTML = '';
    var interieur = el('div', { class: 'panneau__interieur' });
    interieur.appendChild(tete(r));
    var carte = el('section', { class: 'carte' });
    r.champs.forEach(function (def) {
      if (def.type === 'carte') {
        if (carte.childNodes.length) interieur.appendChild(carte);
        carte = el('section', { class: 'carte' });
        if (def.titre) carte.appendChild(el('h2', { class: 'carte__titre' }, def.titre));
        if (def.aide) carte.appendChild(el('p', { class: 'carte__aide' }, def.aide));
        return;
      }
      carte.appendChild(champ(def, travail, def.chemin));
    });
    if (carte.childNodes.length) interieur.appendChild(carte);
    p.appendChild(interieur);
    $('[data-precedente]', p).addEventListener('click', versionPrecedente);
    $('[data-origine]', p).addEventListener('click', contenuOrigine);
    majBarre();
  }
  function ouvrirRubrique(id) {
    active = RUB[id] || RUB.promos;
    try { history.replaceState(null, '', '#' + active.id); } catch (e) { /* page locale */ }
    $$('[data-rubrique]').forEach(function (b) {
      if (b.getAttribute('data-rubrique') === active.id) { b.setAttribute('aria-current', 'page'); if (b.scrollIntoView && window.innerWidth < 960) b.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      else b.removeAttribute('aria-current');
    });
    document.title = active.nom + ' · Espace admin · BIG MARKET 38';
    rendre();
    window.scrollTo(0, 0);
    $('#panneau').focus({ preventScroll: true });
  }
  function construireNavigation() {
    var nav = $('#navigation');
    nav.innerHTML = '';
    GROUPES.forEach(function (g) {
      var groupe = el('div', { class: 'navigation__groupe' }, el('p', { class: 'navigation__titre' }, g.titre));
      g.ids.forEach(function (id) {
        var r = RUB[id];
        var b = el('button', { type: 'button', class: 'navigation__lien', 'data-rubrique': id }, [icone(r.icone), el('span', null, r.nom)]);
        b.addEventListener('click', function () { ouvrirRubrique(id); });
        groupe.appendChild(b);
      });
      nav.appendChild(groupe);
    });
    majIndicateurs();
  }

  /* =================================================================
     ENREGISTRER, ANNULER, VERSIONS
     ================================================================= */
  function enregistrer() {
    var r = active, bouton = $('[data-enregistrer]');
    if (!r || !modifiee(r)) return;
    var pb = erreurs(r.champs, travail, '');
    if (pb.length) {
      toast(pb[0] + (pb.length > 1 ? ' (+ ' + (pb.length - 1) + ' autre' + (pb.length > 2 ? 's' : '') + ' point' + (pb.length > 2 ? 's' : '') + ' à corriger)' : ''), true);
      return;
    }
    if (r.avant) r.avant(travail);
    var lignes = r.cles.map(function (c) { return { cle: c, valeur: O.lire(travail, c) }; });
    occupe(bouton, true);
    majBarre('Enregistrement…');
    jeton().then(function (j) { return S.enregistrer(j, lignes); }).then(function (res) {
      (res || []).forEach(function (l) { infos[l.cle] = { le: l.maj_le, par: l.maj_par }; });
      r.reference = etatRubrique(r);
      dernierEnregistrement = Date.now();
      sauverBrouillon();
      occupe(bouton, false);
      majIndicateurs();
      var meta = $('.panneau__meta span');
      var m = derniereModif(r);
      if (meta && m) meta.textContent = 'Dernière modification : ' + dateHeure(m.le);
      toast('Enregistré : les modifications sont en ligne sur le site.');
    }).catch(function (e) {
      occupe(bouton, false);
      majBarre();
      if (e.statut === 401) toast('Votre session a expiré : reconnectez-vous. Vos modifications sont gardées.', true);
      else if (e.statut === 403) toast("Ce compte n'a pas le droit de modifier le site.", true);
      else if (!e.statut) toast("Enregistrement impossible : vérifiez votre connexion internet, puis réessayez.", true);
      else toast('Enregistrement impossible (' + e.message + ').', true);
    });
  }
  function annuler() {
    var r = active;
    if (!r || !modifiee(r)) return;
    confirmer('Annuler les modifications ?', 'La rubrique « ' + r.nom + ' » revient à sa dernière version enregistrée.', 'Annuler les modifications').then(function (oui) {
      if (!oui) return;
      var valeurs = JSON.parse(r.reference);
      r.cles.forEach(function (c, i) { O.ecrire(travail, c, valeurs[i]); });
      changement(); rendre();
      toast('Modifications annulées.');
    });
  }
  function versionPrecedente() {
    var r = active;
    jeton().then(function (j) { return S.historique(j, r.cles); }).then(function (lignes) {
      if (!lignes || !lignes.length) { toast("Pas encore de version précédente : elle apparaît après un deuxième enregistrement de cette rubrique."); return; }
      var parCle = {}, date = '';
      lignes.forEach(function (l) { if (!parCle[l.cle]) { parCle[l.cle] = l; if (l.enregistre_le > date) date = l.enregistre_le; } });
      return confirmer('Revenir à la version précédente ?', 'La rubrique « ' + r.nom + ' » reprend sa version du ' + dateHeure(date) + '. Vérifiez-la, puis cliquez sur « Enregistrer » pour la remettre en ligne.', 'Charger cette version').then(function (oui) {
        if (!oui) return;
        Object.keys(parCle).forEach(function (c) { O.ecrire(travail, c, O.fusion(O.cloner(O.lire(ORIGINE, c)), parCle[c].valeur)); });
        changement(); rendre();
        toast('Version précédente chargée : cliquez sur « Enregistrer » pour la publier.');
      });
    }).catch(function (e) { toast('Impossible de lire les versions précédentes (' + e.message + ').', true); });
  }
  function contenuOrigine() {
    var r = active;
    confirmer("Revenir au contenu d'origine ?", 'Les textes, photos et réglages de « ' + r.nom + " » reprennent leur version de départ. Cliquez ensuite sur « Enregistrer » pour la publier.", "Charger le contenu d'origine").then(function (oui) {
      if (!oui) return;
      r.cles.forEach(function (c) { O.ecrire(travail, c, O.cloner(O.lire(ORIGINE, c))); });
      changement(); rendre();
      toast("Contenu d'origine chargé : cliquez sur « Enregistrer » pour le publier.");
    });
  }

  /* =================================================================
     SESSION ET CONNEXION
     ================================================================= */
  function memoriser(d) {
    session = {
      jeton: d.access_token, renouvellement: d.refresh_token,
      expire: d.expires_at ? d.expires_at * 1000 : Date.now() + (d.expires_in || 3600) * 1000,
      email: (d.user && d.user.email) || (session && session.email) || ''
    };
    try { localStorage.setItem(CLE_SESSION, JSON.stringify(session)); } catch (e) { /* navigation privée */ }
  }
  function oublier() {
    session = null;
    try { localStorage.removeItem(CLE_SESSION); } catch (e) { /* rien */ }
  }
  var renouvellementEnCours = null;
  function jeton() {
    if (!session) { var e = new Error('Session expirée'); e.statut = 401; return Promise.reject(e); }
    if (session.expire - Date.now() > 120000) return Promise.resolve(session.jeton);
    renouvellementEnCours = renouvellementEnCours || S.rafraichir(session.renouvellement).then(function (d) {
      memoriser(d);
      return session.jeton;
    }, function (err) {
      if (err.statut) { oublier(); afficherAcces('connexion', 'Votre session a expiré : reconnectez-vous. Vos modifications non enregistrées sont gardées.'); err.statut = 401; }
      throw err;
    }).then(function (j) { renouvellementEnCours = null; return j; }, function (err) { renouvellementEnCours = null; throw err; });
    return renouvellementEnCours;
  }

  var VUES = ['connexion', 'creation', 'oubli'];
  function afficherAcces(vue, message) {
    $('#chargement').hidden = true;
    $('#tableau').hidden = true;
    $('#acces').hidden = false;
    VUES.forEach(function (v) { $('#form-' + v).hidden = v !== vue; });
    $('#vue-code').hidden = vue !== 'code';
    var f = $('#form-' + vue);
    if (f) {
      erreurForm(f, message || '');
      var email = $('input[type="email"]', f);
      if (email && !email.value) { var autre = $$('.acces input[type="email"]').filter(function (x) { return x.value; })[0]; if (autre) email.value = autre.value; }
      var premier = $$('input', f).filter(function (x) { return !x.value; })[0];
      if (premier) premier.focus();
    }
  }
  function erreurForm(f, message) {
    var p = $('.formulaire__erreur', f);
    if (!p) return;
    p.textContent = message;
    p.hidden = !message;
  }
  function messageConnexion(e) {
    if (e.statut === 400 || e.statut === 401) return /confirm/i.test(e.message) ? "Cette adresse n'est pas encore confirmée." : 'Adresse e-mail ou mot de passe incorrect.';
    if (e.statut === 429) return 'Trop de tentatives : patientez quelques minutes avant de réessayer.';
    if (!e.statut) return 'Connexion impossible : vérifiez votre connexion internet.';
    return 'Connexion impossible pour le moment (' + e.message + ').';
  }
  function messageFonction(e) {
    if (!e.statut) return 'Service injoignable : vérifiez votre connexion internet.';
    return e.message || 'Une erreur est survenue. Réessayez.';
  }
  function verifierNouveau(mdp, mdp2) {
    if (mdp.length < 10) return 'Le mot de passe doit contenir au moins 10 caractères.';
    if (mdp.length > 72) return 'Le mot de passe doit contenir au plus 72 caractères.';
    if (mdp !== mdp2) return 'Les deux mots de passe ne sont pas identiques.';
    return '';
  }
  function montrerCode(code, ensuite) {
    if (!code) { ensuite(); return; }
    afficherAcces('code');
    var p = $('#code-secours');
    p.textContent = code;
    $('[data-code-note]').onclick = function () { p.textContent = ''; ensuite(); };
    $('[data-copier-code]').onclick = function () { copier(code); };
    $('[data-code-note]').focus();
  }
  function copier(texte) {
    var ok = function () { toast('Code copié.'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texte).then(ok, function () { toast('Copie impossible : notez le code à la main.', true); });
    else {
      var t = el('textarea', { readonly: '' }); t.value = texte; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('Copie impossible : notez le code à la main.', true); }
      t.remove();
    }
  }

  function brancherAcces() {
    $$('[data-vue]').forEach(function (b) { b.addEventListener('click', function () { afficherAcces(b.getAttribute('data-vue')); }); });
    $$('[data-voir]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = $('input', b.parentNode), visible = i.type === 'password';
        i.type = visible ? 'text' : 'password';
        b.setAttribute('aria-pressed', String(visible));
        b.setAttribute('aria-label', visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      });
    });

    $('#form-connexion').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget, email = f.email.value.trim().toLowerCase(), mdp = f.mdp.value, bouton = $('[type="submit"]', f);
      if (!email || !mdp) { erreurForm(f, 'Saisissez votre adresse e-mail et votre mot de passe.'); return; }
      erreurForm(f, '');
      occupe(bouton, true);
      S.connexion(email, mdp).then(function (d) {
        memoriser(d);
        f.mdp.value = '';
        return ouvrirTableau();
      }).catch(function (err) { erreurForm(f, messageConnexion(err)); }).then(function () { occupe(bouton, false); });
    });

    $('#form-creation').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget, email = f.email.value.trim().toLowerCase(), mdp = f.mdp.value, bouton = $('[type="submit"]', f);
      if (!/^\S+@\S+\.\S+$/.test(email)) { erreurForm(f, "Saisissez l'adresse e-mail de l'administrateur."); return; }
      var pb = verifierNouveau(mdp, f.mdp2.value);
      if (pb) { erreurForm(f, pb); return; }
      erreurForm(f, '');
      occupe(bouton, true);
      var code = null;
      S.fonction('acces-admin', { action: 'creer', email: email, motDePasse: mdp }).then(function (r) {
        code = r && r.codeSecours;
        return S.connexion(email, mdp);
      }).then(function (d) {
        memoriser(d);
        f.mdp.value = ''; f.mdp2.value = '';
        montrerCode(code, ouvrirTableau);
      }).catch(function (err) {
        erreurForm(f, messageFonction(err));
        if (err.statut === 409) $('#cx-email').value = email;
      }).then(function () { occupe(bouton, false); });
    });

    $('#form-oubli').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget, email = f.email.value.trim().toLowerCase(), code = f.code.value.trim(), mdp = f.mdp.value, bouton = $('[type="submit"]', f);
      if (!email || !code) { erreurForm(f, 'Saisissez votre adresse e-mail et votre code de secours.'); return; }
      var pb = verifierNouveau(mdp, f.mdp2.value);
      if (pb) { erreurForm(f, pb); return; }
      erreurForm(f, '');
      occupe(bouton, true);
      var nouveauCode = null;
      S.fonction('acces-admin', { action: 'reinitialiser', email: email, codeSecours: code, motDePasse: mdp }).then(function (r) {
        nouveauCode = r && r.codeSecours;
        return S.connexion(email, mdp);
      }).then(function (d) {
        memoriser(d);
        f.code.value = ''; f.mdp.value = ''; f.mdp2.value = '';
        montrerCode(nouveauCode, ouvrirTableau);
      }).catch(function (err) { erreurForm(f, messageFonction(err)); }).then(function () { occupe(bouton, false); });
    });
  }

  /* ---------- Mon compte ---------- */
  function brancherCompte() {
    var d = $('#fenetre-compte');
    $('[data-compte]').addEventListener('click', function () {
      $$('form', d).forEach(function (f) { f.reset(); erreurForm(f, ''); });
      var p = $('#form-code .code-secours'); p.hidden = true; p.textContent = '';
      d.showModal();
    });
    $('[data-fermer]', d).addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });

    $('#form-changer').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget, bouton = $('[type="submit"]', f);
      var pb = verifierNouveau(f.mdp.value, f.mdp2.value);
      if (!f.actuel.value) pb = 'Saisissez votre mot de passe actuel.';
      if (pb) { erreurForm(f, pb); return; }
      erreurForm(f, '');
      occupe(bouton, true);
      jeton().then(function (j) { return S.fonction('acces-admin', { action: 'changer', motDePasseActuel: f.actuel.value, motDePasse: f.mdp.value }, j); }).then(function () {
        f.reset();
        toast('Mot de passe changé.');
        d.close();
      }).catch(function (err) { erreurForm(f, messageFonction(err)); }).then(function () { occupe(bouton, false); });
    });

    $('#form-code').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget, bouton = $('[type="submit"]', f), p = $('.code-secours', f);
      if (!f.actuel.value) { erreurForm(f, 'Saisissez votre mot de passe actuel.'); return; }
      erreurForm(f, '');
      occupe(bouton, true);
      jeton().then(function (j) { return S.fonction('acces-admin', { action: 'code', motDePasseActuel: f.actuel.value }, j); }).then(function (r) {
        f.actuel.value = '';
        p.textContent = r.codeSecours;
        p.hidden = false;
        toast('Nouveau code créé : notez-le, il ne sera plus affiché.');
      }).catch(function (err) { erreurForm(f, messageFonction(err)); }).then(function () { occupe(bouton, false); });
    });

    $('[data-deconnexion]').addEventListener('click', function () {
      var suite = auMoinsUneModifiee()
        ? confirmer('Se déconnecter ?', "Des modifications n'ont pas été enregistrées. Elles seront perdues.", 'Se déconnecter')
        : Promise.resolve(true);
      suite.then(function (oui) {
        if (!oui) return;
        var j = session && session.jeton;
        if (j) S.deconnexion(j).catch(function () { /* déjà expirée */ });
        oublier();
        try { localStorage.removeItem(CLE_BROUILLON); } catch (err) { /* rien */ }
        RUBRIQUES.forEach(function (r) { r.reference = undefined; });
        d.close();
        afficherAcces('connexion');
        toast('Vous êtes déconnecté.');
      });
    });
  }

  /* =================================================================
     OUVERTURE DU TABLEAU DE BORD
     ================================================================= */
  function ouvrirTableau() {
    $('#chargement').hidden = false;
    return jeton().then(function (j) {
      return S.requete('/rest/v1/contenu?select=cle,valeur,maj_le,maj_par', { jeton: j, delai: 20000 });
    }).then(function (lignes) {
      travail = O.cloner(ORIGINE);
      infos = {};
      (lignes || []).forEach(function (l) {
        O.ecrire(travail, l.cle, O.fusion(O.cloner(O.lire(ORIGINE, l.cle)), l.valeur));
        infos[l.cle] = { le: l.maj_le, par: l.maj_par };
      });
      RUBRIQUES.forEach(function (r) { r.reference = etatRubrique(r); });
      var repris = reprendreBrouillon();
      $$('[data-email]').forEach(function (x) { x.textContent = session.email || 'Mon compte'; });
      $('#acces').hidden = true;
      $('#chargement').hidden = true;
      $('#tableau').hidden = false;
      construireNavigation();
      ouvrirRubrique((location.hash || '').slice(1));
      if (repris) toast('Vos modifications non enregistrées ont été récupérées.');
    }).catch(function (e) {
      $('#chargement').hidden = true;
      if (e.statut === 401 || !session) { oublier(); afficherAcces('connexion', 'Votre session a expiré : reconnectez-vous.'); return; }
      afficherAcces('connexion', !e.statut ? 'Impossible de joindre Supabase : vérifiez votre connexion internet.' : 'Le contenu du site ne peut pas être chargé (' + e.message + ').');
    });
  }

  function demarrer() {
    if (!S || !O) { $('#chargement').innerHTML = '<p>Fichiers du site manquants : vérifiez le dossier assets/js.</p>'; return; }
    brancherAcces();
    brancherCompte();
    $('[data-enregistrer]').addEventListener('click', enregistrer);
    $('[data-annuler]').addEventListener('click', annuler);
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !$('#tableau').hidden) { e.preventDefault(); enregistrer(); }
    });
    window.addEventListener('beforeunload', function (e) {
      if (!$('#tableau').hidden && auMoinsUneModifiee()) { sauverBrouillon(); e.preventDefault(); e.returnValue = ''; }
    });
    if (!S.actif) { afficherAcces('connexion', "Supabase n'est pas configuré (fichier assets/js/config.js)."); return; }
    try { session = JSON.parse(localStorage.getItem(CLE_SESSION) || 'null'); } catch (e) { session = null; }
    if (session && session.jeton) { ouvrirTableau(); return; }
    S.fonction('acces-admin', { action: 'etat' }).then(function (r) {
      afficherAcces(r && r.accesCree === false ? 'creation' : 'connexion');
    }, function () { afficherAcces('connexion'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
