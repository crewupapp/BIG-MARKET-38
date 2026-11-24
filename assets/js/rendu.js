/* =====================================================================
   BIG MARKET 38 — AFFICHAGE
   Construit les sections à partir des données (donnees.js).
   ===================================================================== */
window.BM = window.BM || {};

(function (BM) {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function icone(id) { return '<svg class="icone" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  function prix(n) {
    var t = Number(n).toFixed(2).split('.');
    return { html: t[0] + '<sup>,' + t[1] + '</sup>&nbsp;€', texte: t[0] + ',' + t[1] + ' €' };
  }
  function adresseComplete(m) { return m.adresse + ', ' + m.codePostal + ' ' + m.ville; }

  var etat = { magasin: {}, galerie: null, filtre: 'tout', photosFiltrees: [], colonnes: 0, textes: {} };
  function valeur(o, chemin) { return chemin.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }

  /* ---------- Textes modifiables depuis l'espace admin ---------- */
  // Largeur d'un texte en « em » dans la police des titres, pour que tout titre tienne dans sa colonne
  var mesureur = null;
  function largeurEm(texte) {
    mesureur = mesureur || document.createElement('canvas').getContext('2d');
    mesureur.font = '400 100px "Archivo Black", "Arial Black", sans-serif';
    var t = texte.toUpperCase();
    return mesureur.measureText(t).width / 100 - 0.012 * t.length;
  }
  function ajusterTitre(h, lignes) {
    function calcul() {
      var w = Math.max.apply(null, lignes.map(largeurEm));
      if (w > 0) h.style.setProperty('--k', Math.max(4.2, w * 1.025 + 0.15).toFixed(2));
    }
    calcul();
    if (document.fonts && document.fonts.load) document.fonts.load('100px "Archivo Black"').then(calcul, function () {});
  }
  function titre(h, texte) {
    var lignes = String(texte).split(/\n+/).map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(Boolean).slice(0, 4);
    if (!lignes.length) return;
    var actuelles = $$('.titre__ligne .bulle', h).map(function (b) { return b.getAttribute('data-texte'); });
    if (actuelles.join('\n') === lignes.join('\n')) return;
    var modele = $('.bulle', h), decoupe = modele && modele.getAttribute('data-decoupe');
    h.innerHTML = lignes.map(function (l) {
      return '<span class="titre__ligne"><span class="bulle" data-texte="' + esc(l) + '"' + (decoupe ? ' data-decoupe="' + esc(decoupe) + '"' : '') + '>' + esc(l) + '</span></span>';
    }).join('');
    if (h.id === 'hero-titre') h.setAttribute('aria-label', 'BIG MARKET 38 à Échirolles : ' + lignes.join(' ').toLowerCase());
    else h.removeAttribute('aria-label');
    ajusterTitre(h, lignes);
  }
  function ruban(piste, texte) {
    var mots = String(texte).split(/[,\n]+/).map(function (m) { return m.trim(); }).filter(Boolean);
    if (!mots.length) return;
    var sep = $('.ruban__sep use', piste), href = sep ? sep.getAttribute('href') : '#i-etoile';
    var suite = mots.slice();
    while (suite.length < 8 || suite.join('').length < 70) suite = suite.concat(mots);   // assez long pour boucler sans trou
    piste.innerHTML = suite.map(function (m) { return '<span>' + esc(m) + '</span><svg class="ruban__sep"><use href="' + esc(href) + '"/></svg>'; }).join('');
  }
  function textes(T) {
    etat.textes = T || {};
    $$('[data-txt]').forEach(function (el) {
      var v = valeur(etat.textes, el.getAttribute('data-txt'));
      if (typeof v !== 'string') return;
      if (!v.trim()) { if (!el.hasAttribute('data-txt-requis')) el.hidden = true; return; }
      el.hidden = false;
      if (el.textContent !== v) el.textContent = v;
    });
    $$('[data-titre-cle]').forEach(function (h) {
      var v = valeur(etat.textes, h.getAttribute('data-titre-cle'));
      if (typeof v === 'string' && v.trim()) titre(h, v);
    });
    $$('[data-ruban-cle]').forEach(function (piste) {
      var v = valeur(etat.textes, piste.getAttribute('data-ruban-cle'));
      if (typeof v === 'string' && v.trim()) ruban(piste, v);
    });
  }
  function texte(chemin, defaut) { var v = valeur(etat.textes, chemin); return typeof v === 'string' && v.trim() ? v : defaut; }

  /* ---------- Photos fixes des rubriques ---------- */
  function photos(P) {
    $$('img[data-photo]').forEach(function (img) {
      var x = (P || {})[img.getAttribute('data-photo')];
      if (!x || !x.image) return;
      if (img.getAttribute('src') !== x.image) img.setAttribute('src', x.image);
      if (typeof x.alt === 'string' && x.alt.trim()) img.alt = x.alt;
    });
  }

  /* ---------- Textes liés (data-bm) et liens (data-lien) ---------- */
  function lier(cle, valeur) {
    $$('[data-bm="' + cle + '"]').forEach(function (el) { el.textContent = valeur; });
  }
  function liens(m) {
    var adr = adresseComplete(m);
    var dest = encodeURIComponent(adr);
    var url = {
      itineraire: 'https://www.google.com/maps/dir/?api=1&destination=' + dest,
      waze: 'https://waze.com/ul?q=' + encodeURIComponent(adr.normalize('NFD').replace(/[̀-ͯ]/g, '')) + '&navigate=yes',
      plans: 'https://maps.apple.com/?daddr=' + dest,
      tiktok: (m.reseaux && m.reseaux.tiktok) || '',
      telephone: m.telephone ? 'tel:' + m.telephone.replace(/[^\d+]/g, '').replace(/^0/, '+33') : '',
      email: m.email ? 'mailto:' + m.email : ''
    };
    $$('[data-lien]').forEach(function (a) {
      var type = a.getAttribute('data-lien'), href = url[type];
      if (!href) return;
      if (type === 'itineraire' && a.dataset.mode) href += '&travelmode=' + a.dataset.mode;
      a.setAttribute('href', href);
    });
    $$('[data-si]').forEach(function (el) {
      var cle = el.getAttribute('data-si');
      el.hidden = !m[cle];
    });
  }

  function magasin(m) {
    etat.magasin = m;
    lier('adresse-courte', m.adresse + ', ' + m.codePostal + ' ' + m.ville);
    $$('[data-bm="adresse-bloc"]').forEach(function (el) {
      el.innerHTML = esc(m.nom) + '<br>' + esc(m.adresse) + '<br>' + esc(m.codePostal + ' ' + m.ville);
    });
    lier('tiktok-pseudo', (m.reseaux && m.reseaux.tiktokPseudo) || '');
    lier('telephone', m.telephone || '');
    lier('email', m.email || '');
    liens(m);
    // Réseaux supplémentaires (Instagram, Facebook, Snapchat) si renseignés
    var r = m.reseaux || {}, ul = $('#pied-reseaux');
    if (ul) {
      [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['snapchat', 'Snapchat']].forEach(function (x) {
        if (r[x[0]]) ul.insertAdjacentHTML('beforeend', '<li><a href="' + esc(r[x[0]]) + '" target="_blank" rel="noopener">' + x[1] + '</a></li>');
      });
    }
    $$('[data-annee]').forEach(function (el) { el.textContent = BM.outils.maintenant().annee; });
  }

  /* ---------- Horaires ---------- */
  function horaires(h) {
    var O = BM.outils, n = O.maintenant();
    var ul = $('#liste-horaires');
    if (ul) {
      ul.innerHTML = O.ORDRE.map(function (j) {
        var x = h.semaine[j], auj = O.JOURS[n.jour] === j;
        return '<li class="' + (auj ? 'est-aujourdhui ' : '') + (x ? '' : 'est-ferme') + '"><span>' + j.charAt(0).toUpperCase() + j.slice(1) + (auj ? " (aujourd'hui)" : '') + '</span><b>' + (x ? O.heure(x.ouverture) + ' – ' + O.heure(x.fermeture) : 'Fermé') + '</b></li>';
      }).join('');
    }
    var pied = $('#pied-horaires');
    if (pied) pied.innerHTML = O.groupesHoraires().map(function (g) { return '<li>' + esc(g.libelle) + ' : ' + esc(g.texte) + '</li>'; }).join('');
    var nb = O.joursOuverts();
    lier('jours-ouverture', nb === 7 ? '7 jours sur 7' : nb + ' jours sur 7');
    // Exceptions à venir (14 jours)
    var proches = (h.exceptions || []).filter(function (e) { return e.date >= n.iso && e.date <= O.isoPlus(n.iso, 14); });
    var note = $('[data-bm="exceptions"]');
    if (note && proches.length) {
      note.hidden = false;
      note.textContent = proches.map(function (e) {
        return O.dateLongue(e.date) + ' : ' + (e.message || (e.ferme ? 'fermé' : O.heure(e.ouverture) + ' – ' + O.heure(e.fermeture)));
      }).join(' · ');
    }
  }

  /* ---------- Rayons ---------- */
  function rayons(liste) {
    var ol = $('#liste-rayons');
    if (!ol) return;
    var total = String(liste.length).padStart(2, '0');
    ol.innerHTML = liste.map(function (r, i) {
      return '<li class="rayon rayon--' + esc(r.theme || 'rouge') + '" id="rayon-' + esc(r.id) + '" style="--i:' + i + '">' +
        '<article class="rayon__carte">' +
          '<p class="rayon__fond-mot" aria-hidden="true">' + esc(r.nom) + '</p>' +
          '<div class="rayon__texte">' +
            '<span class="rayon__index" aria-hidden="true">' + String(i + 1).padStart(2, '0') + ' / ' + total + '</span>' +
            '<h3 class="rayon__nom">' + esc(r.nom) + '</h3>' +
            '<p class="rayon__accroche">' + esc(r.accroche) + '</p>' +
            '<p class="rayon__desc">' + esc(r.description) + '</p>' +
          '</div>' +
          '<figure class="rayon__visuel"><img src="' + esc(r.image) + '" alt="' + esc(r.alt || r.nom) + '" width="1200" height="1500" loading="lazy" decoding="async"></figure>' +
        '</article>' +
      '</li>';
    }).join('');
    var plan = $('#plan-rayons');
    if (plan) plan.innerHTML = liste.map(function (r, i) { return '<button type="button" data-aller="' + i + '"' + (i === 0 ? ' aria-current="true"' : '') + '>' + esc(r.nom) + '</button>'; }).join('');
    $$('[data-total]').forEach(function (el) { el.textContent = total; });
    lier('nb-rayons', String(liste.length));
    etat.rayons = liste;
  }

  /* ---------- Maghreb ---------- */
  function maghreb(cartes) {
    var ul = $('#cartes-maghreb');
    if (!ul) return;
    ul.innerHTML = cartes.map(function (c, i) {
      return '<li class="carte-maghreb"><div data-revele style="--i:' + i + '"><div class="carte-maghreb__lien">' +
        '<div class="carte-maghreb__visuel"><img src="' + esc(c.image) + '" alt="' + esc(c.alt || c.titre) + '" width="1200" height="1200" loading="lazy" decoding="async"></div>' +
        '<h3>' + esc(c.titre) + '</h3><p>' + esc(c.texte) + '</p></div></div></li>';
    }).join('');
  }

  /* ---------- Promotions ---------- */
  function promotions(p) {
    var ul = $('#liste-promos');
    if (!ul) return;
    var O = BM.outils;
    var demo = $('[data-promos-demo]');
    if (demo) demo.hidden = !(p.demo && p.liste.length);
    var per = $('.promos__periode');
    if (per) { per.hidden = !p.periode; lier('periode-promos', p.periode); }
    if (!p.liste.length) {
      ul.innerHTML = '<li class="promos__vide">' + esc(texte('promos.vide', 'Les nouvelles promotions arrivent bientôt. En attendant, retrouvez nos bons plans en vidéo sur TikTok.')) + '</li>';
      return;
    }
    ul.innerHTML = p.liste.map(function (x, i) {
      var px = prix(x.prix);
      var avant = x.prixAvant ? '<p class="promo__avant">Au lieu de <s>' + prix(x.prixAvant).texte + '</s></p>' : '';
      var fin = x.fin ? '<p class="promo__validite">' + icone('calendrier') + "Jusqu'au " + esc(O.dateLongue(x.fin)) + '</p>' : '';
      return '<li class="promo" data-revele style="--i:' + (i % 3) + '"><article class="promo__carte">' +
        (p.demo ? '<span class="promo__tampon">Exemple</span>' : '') +
        '<figure class="promo__visuel"><img src="' + esc(x.image) + '" alt="' + esc(x.alt || x.produit) + '" width="1000" height="1000" loading="lazy" decoding="async"></figure>' +
        '<p class="promo__prix" aria-label="Prix : ' + esc(px.texte + ' ' + (x.unite || '')) + '"><span class="promo__montant" aria-hidden="true">' + px.html + '</span><span class="promo__unite" aria-hidden="true">' + esc(x.unite || '') + '</span></p>' +
        '<div class="promo__corps"><h3 class="promo__nom">' + esc(x.produit) + '</h3>' +
        (x.detail ? '<p class="promo__detail">' + esc(x.detail) + '</p>' : '') + avant + fin + '</div>' +
      '</article></li>';
    }).join('');
  }

  /* ---------- Galerie ---------- */
  var RATIOS = { portrait: '4 / 5', paysage: '4 / 3', carre: '1 / 1' };
  var HAUTEURS = { portrait: 1.25, paysage: 0.75, carre: 1 };
  function filtres(g) {
    var box = $('#filtres-galerie');
    if (!box) return;
    var utiles = g.categories.filter(function (c) { return g.photos.some(function (p) { return p.categorie === c.id; }); });
    box.innerHTML = '<button class="filtre" type="button" data-filtre="tout" aria-pressed="true">Tout</button>' +
      utiles.map(function (c) { return '<button class="filtre" type="button" data-filtre="' + esc(c.id) + '" aria-pressed="false">' + esc(c.nom) + '</button>'; }).join('');
  }
  function galerie(g, filtre, anime) {
    etat.galerie = g || etat.galerie;
    if (!etat.galerie) return;
    etat.filtre = filtre || etat.filtre;
    var grille = $('#grille-galerie');
    if (!grille) return;
    var photos = etat.galerie.photos.filter(function (p) { return etat.filtre === 'tout' || p.categorie === etat.filtre; });
    etat.photosFiltrees = photos;
    var n = window.innerWidth >= 900 ? 3 : 2;
    etat.colonnes = n;
    var cols = [], hauteurs = [];
    for (var k = 0; k < n; k++) { cols.push([]); hauteurs.push(0); }
    photos.forEach(function (p, i) {
      var c = hauteurs.indexOf(Math.min.apply(null, hauteurs));
      // Au défilement : apparition colonne par colonne ; après un filtre : entrée dans l'ordre des photos
      cols[c].push('<button class="vignette' + (anime ? ' est-entree' : '') + '" type="button"' + (anime ? '' : ' data-revele') + ' data-index="' + i + '" style="--ratio:' + (RATIOS[p.format] || RATIOS.portrait) + ';--i:' + c + ';--n:' + i + '" aria-label="Agrandir : ' + esc(p.legende || p.alt) + '">' +
        '<img src="' + esc(p.image) + '" alt="' + esc(p.alt || p.legende) + '" loading="lazy" decoding="async">' +
        (p.legende ? '<span class="vignette__legende" aria-hidden="true">' + esc(p.legende) + '</span>' : '') + '</button>');
      hauteurs[c] += HAUTEURS[p.format] || 1.25;
    });
    grille.innerHTML = cols.map(function (c, k) { return '<div class="galerie__col" data-col="' + k + '">' + c.join('') + '</div>'; }).join('');
    $$('.filtre').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filtre === etat.filtre)); });
    if (!anime && BM.anim && BM.anim.observerRevelations) BM.anim.observerRevelations();
    if (BM.anim && BM.anim.rafraichirGalerie) BM.anim.rafraichirGalerie();
  }

  /* ---------- TikTok ---------- */
  function tiktok(t) {
    var ul = $('#liste-tiktok');
    if (!ul) return;
    var profil = (etat.magasin.reseaux && etat.magasin.reseaux.tiktok) || '#tiktok';
    var note = $('[data-tiktok-demo]');
    if (note) note.hidden = !t.demo;
    ul.innerHTML = (t.videos || []).map(function (v, i) {
      return '<li class="telephone" style="--i:' + i + '"><a class="telephone__cadre" data-revele style="--i:' + i + '" href="' + esc(v.lien || profil) + '" target="_blank" rel="noopener" aria-label="' + esc(v.titre) + ' (vidéo TikTok)">' +
        '<span class="telephone__ecran"><img src="' + esc(v.image) + '" alt="" width="720" height="1280" loading="lazy" decoding="async">' +
        (t.demo ? '<span class="telephone__exemple">Exemple</span>' : '') +
        '<span class="telephone__lecture">' + icone('lecture') + '</span>' +
        '<span class="telephone__legende">' + esc(v.titre) + '</span></span></a></li>';
    }).join('');
  }

  /* ---------- Bon à savoir ---------- */
  function bonASavoir(perso, rayonsListe) {
    var ul = $('#bon-a-savoir');
    if (!ul) return;
    var O = BM.outils, H = (window.BM_CONTENU || {}).horaires || {}, nb = O.joursOuverts();
    var m = etat.magasin, pseudo = (m.reseaux && m.reseaux.tiktokPseudo) || '';
    var items = [];
    var phrase = O.phraseHoraires();
    items.push({ icone: 'horloge', titre: nb === 7 ? 'Ouvert 7 jours sur 7' : 'Ouvert ' + nb + ' jours sur 7', texte: phrase.charAt(0).toUpperCase() + phrase.slice(1) + '.' });
    if (H.dimanche) items.push({ icone: 'calendrier', titre: 'Le dimanche aussi', texte: 'Ouvert le dimanche de ' + O.heure(H.dimanche.ouverture) + ' à ' + O.heure(H.dimanche.fermeture) + '.' });
    if (rayonsListe.length) items.push({ icone: 'chariot', titre: rayonsListe.length + ' rayons', texte: listeRayons(rayonsListe) + '.' });
    // Informations saisies dans l'espace admin (rubrique Infos pratiques)
    items = items.concat((perso || []).filter(function (x) { return x && (x.titre || x.texte); }));
    if (pseudo) items.push({ icone: 'tiktok', titre: 'Les promos en vidéo', texte: 'Suivez ' + pseudo + ' sur TikTok.' });
    items.push({ icone: 'itineraire', titre: 'Itinéraire en un clic', texte: 'Google Maps, Waze ou Plans : en voiture, en transports, à pied ou à vélo.' });
    if (m.telephone) items.push({ icone: 'tel', titre: 'Par téléphone', texte: m.telephone });
    ul.innerHTML = items.map(function (x, i) {
      return '<li class="savoir" data-revele style="--i:' + (i % 4) + '"><span class="savoir__icone">' + icone(ICONES.indexOf(x.icone) > -1 ? x.icone : 'valide') + '</span><div><strong>' + esc(x.titre || '') + '</strong><span>' + esc(x.texte || '') + '</span></div></li>';
    }).join('');
  }
  var ICONES = ['valide', 'etiquette', 'chariot', 'horloge', 'pin', 'tel', 'etoile', 'calendrier', 'tiktok', 'itineraire', 'carte', 'voiture', 'tram', 'pied', 'velo'];
  function listeRayons(l, minuscule) {
    var noms = l.map(function (r, i) { return i === 0 && !minuscule ? r.nom : r.nom.charAt(0).toLowerCase() + r.nom.slice(1); });
    return noms.length > 1 ? noms.slice(0, -1).join(', ') + ' et ' + noms[noms.length - 1] : noms[0];
  }

  /* ---------- FAQ ---------- */
  function faq(liste, rayonsListe) {
    var box = $('#faq');
    if (!box) return;
    var O = BM.outils, H = (window.BM_CONTENU || {}).horaires || {}, m = etat.magasin;
    var jetons = {
      horaires: O.phraseHoraires(),
      dimanche: H.dimanche ? 'Oui, le dimanche de ' + O.heure(H.dimanche.ouverture) + ' à ' + O.heure(H.dimanche.fermeture) + '.' : 'Non, le magasin est fermé le dimanche.',
      adresse: adresseComplete(m),
      rayons: listeRayons(rayonsListe, true),
      nbRayons: String(rayonsListe.length),
      telephone: m.telephone ? ' ou de nous appeler au ' + m.telephone : '',
      tiktok: (m.reseaux && m.reseaux.tiktokPseudo) || 'TikTok'
    };
    box.innerHTML = liste.map(function (q, i) {
      var rep = String(q.reponse).replace(/\{\{(\w+)\}\}/g, function (_, k) { return jetons[k] != null ? jetons[k] : ''; });
      return '<details class="question" data-revele style="--i:' + (i % 4) + '"><summary>' + esc(q.question) + '<span class="question__signe" aria-hidden="true">' + icone('plus') + '</span></summary><div class="question__reponse"><p>' + esc(rep) + '</p></div></details>';
    }).join('');
  }

  /* ---------- Données structurées (référencement local Google) ---------- */
  function donneesStructurees(m) {
    var H = (window.BM_CONTENU || {}).horaires || {};
    var EN = { lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday', jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday' };
    var spec = Object.keys(EN).filter(function (j) { return H[j]; }).map(function (j) {
      return { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/' + EN[j], opens: H[j].ouverture, closes: H[j].fermeture };
    });
    var base = location.href.split('#')[0].split('?')[0].replace(/index\.html$/, '');
    var data = {
      '@context': 'https://schema.org', '@type': 'GroceryStore', name: m.nom, alternateName: m.signature,
      url: base, image: base + 'assets/images/partage/og-image.jpg', logo: base + 'assets/images/logo/logo.png',
      address: { '@type': 'PostalAddress', streetAddress: m.adresse, postalCode: m.codePostal, addressLocality: m.ville, addressCountry: 'FR' },
      openingHoursSpecification: spec,
      sameAs: [m.reseaux && m.reseaux.tiktok, m.reseaux && m.reseaux.instagram, m.reseaux && m.reseaux.facebook].filter(Boolean)
    };
    if (m.telephone) data.telephone = m.telephone;
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  /* ---------- Tout afficher ---------- */
  function tout() {
    var D = BM.donnees;
    return Promise.all([D.magasin(), D.horaires(), D.rayons(), D.maghreb(), D.promotions(), D.galerie(), D.tiktok(), D.bonASavoir(), D.faq(), D.textes(), D.photos()])
      .then(function (r) {
        textes(r[9]);
        photos(r[10]);
        magasin(r[0]);
        horaires(r[1]);
        rayons(r[2]);
        maghreb(r[3]);
        promotions(r[4]);
        filtres(r[5]);
        galerie(r[5], 'tout');
        tiktok(r[6]);
        bonASavoir(r[7], r[2]);
        faq(r[8], r[2]);
        donneesStructurees(r[0]);
      });
  }

  BM.rendu = { tout: tout, galerie: galerie, etat: etat, esc: esc, adresseComplete: adresseComplete, largeurEm: largeurEm };
})(window.BM);
