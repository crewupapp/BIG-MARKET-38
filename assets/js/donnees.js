/* =====================================================================
   BIG MARKET 38 — ACCÈS AUX DONNÉES
   ---------------------------------------------------------------------
   Toutes les sections lisent leurs données ici, jamais directement.
   1. contenu.js donne le contenu d'origine (et sert de secours).
   2. Le contenu enregistré dans l'espace admin (Supabase, table
      « contenu ») le remplace, rubrique par rubrique.
   3. Si Supabase ne répond pas, la dernière version reçue (gardée
      dans le navigateur) est utilisée, sinon le contenu d'origine.
   ===================================================================== */
window.BM = window.BM || {};

(function (BM) {
  'use strict';

  var FUSEAU = 'Europe/Paris';
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  var JOURS_EN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function C() { return window.BM_CONTENU || {}; }

  /* ---------- Contenu enregistré dans l'espace admin (Supabase) ---------- */
  var ORIGINE = null, pret = null, source = 'local';
  var CACHE = 'bm-contenu';
  function cloner(x) { return JSON.parse(JSON.stringify(x == null ? null : x)); }
  function estObjet(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  // Fusion : les champs enregistrés remplacent ceux d'origine, les champs absents gardent leur valeur d'origine
  function fusion(a, b) {
    if (b === undefined) return a;
    if (!estObjet(a) || !estObjet(b)) return b;
    var r = Object.assign({}, a);
    Object.keys(b).forEach(function (k) { r[k] = fusion(a[k], b[k]); });
    return r;
  }
  function lire(o, chemin) { return chemin.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
  function ecrire(o, chemin, v) {
    var p = chemin.split('.'), x = o;
    for (var i = 0; i < p.length - 1; i++) { if (!estObjet(x[p[i]])) x[p[i]] = {}; x = x[p[i]]; }
    x[p[p.length - 1]] = v;
  }
  function appliquer(lignes) {
    var c = cloner(ORIGINE);
    (Array.isArray(lignes) ? lignes : []).forEach(function (l) {
      if (l && typeof l.cle === 'string' && /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)?$/.test(l.cle) && l.valeur != null) {
        ecrire(c, l.cle, fusion(lire(ORIGINE, l.cle), l.valeur));
      }
    });
    window.BM_CONTENU = c;
  }
  function charger() {
    ORIGINE = cloner(window.BM_CONTENU || {});
    var S = BM.supabase;
    if (!S || !S.actif) return Promise.resolve(source);
    return S.lireContenu(3000).then(function (lignes) {
      appliquer(lignes);
      source = 'supabase';
      try { localStorage.setItem(CACHE, JSON.stringify(lignes || [])); } catch (e) { /* navigation privée */ }
      return source;
    }).catch(function () {
      var l = null;
      try { l = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) { l = null; }
      if (l) { appliquer(l); source = 'cache'; }
      return source;
    });
  }
  function pretes() { return pret || (pret = charger()); }
  function apres(f) { return function () { return pretes().then(f); }; }

  /* ---------- Outils dates (toujours à l'heure de Paris) ---------- */
  function maintenant(d) {
    d = d || new Date();
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short'
    }).formatToParts(d);
    var v = {};
    parts.forEach(function (p) { v[p.type] = p.value; });
    var h = parseInt(v.hour, 10) % 24;
    return { iso: v.year + '-' + v.month + '-' + v.day, jour: JOURS_EN[v.weekday], minutes: h * 60 + parseInt(v.minute, 10), annee: v.year };
  }
  function dateUTC(iso) { var p = iso.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)); }
  function isoPlus(iso, n) { var d = dateUTC(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function jourDe(iso) { return dateUTC(iso).getUTCDay(); }
  function enMinutes(h) { var p = String(h).split(':').map(Number); return p[0] * 60 + (p[1] || 0); }
  function heure(h) { var p = String(h).split(':'); return (p[0].length < 2 ? '0' + p[0] : p[0]) + 'h' + (p[1] || '00'); }
  function dateLongue(iso, avecJour) {
    var d = dateUTC(iso);
    var opts = { timeZone: 'UTC', day: 'numeric', month: 'long' };
    if (avecJour !== false) opts.weekday = 'long';
    var txt = new Intl.DateTimeFormat('fr-FR', opts).format(d);
    return d.getUTCDate() === 1 ? txt.replace(/(^|\s)1(\s)/, '$11er$2') : txt;
  }
  function periode(debut, fin) {
    var d1 = dateUTC(debut), d2 = dateUTC(fin);
    var memeMois = d1.getUTCMonth() === d2.getUTCMonth();
    var a = memeMois
      ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric' }).format(d1)
      : dateLongue(debut);
    if (d1.getUTCDate() === 1) a = a.replace(/(\s)1$/, '$11er').replace(/(\s)1(\s)/, '$11er$2');
    return 'Du ' + a + ' au ' + dateLongue(fin);
  }

  /* ---------- Horaires ---------- */
  function horairesDu(iso) {
    var ex = (C().exceptions || []).filter(function (e) { return e.date === iso; })[0];
    if (ex) {
      if (ex.ferme) return { ferme: true, message: ex.message || '', exception: true };
      if (ex.ouverture && ex.fermeture) return { ouverture: ex.ouverture, fermeture: ex.fermeture, message: ex.message || '', exception: true };
    }
    var h = (C().horaires || {})[JOURS[jourDe(iso)]];
    return h && h.ouverture && h.fermeture ? { ouverture: h.ouverture, fermeture: h.fermeture } : { ferme: true };
  }

  // Regroupe les jours consécutifs ayant les mêmes horaires
  function groupesHoraires() {
    var H = C().horaires || {}, groupes = [];
    ORDRE.forEach(function (j) {
      var h = H[j], cle = h ? h.ouverture + '-' + h.fermeture : 'ferme';
      var dernier = groupes[groupes.length - 1];
      if (dernier && dernier.cle === cle) dernier.jours.push(j);
      else groupes.push({ cle: cle, jours: [j], h: h });
    });
    return groupes.map(function (g) {
      var j = g.jours, nom = j.length === 1 ? j[0] : (j.length === 2 ? j[0] + ' et ' + j[1] : j[0] + ' au ' + j[j.length - 1]);
      return {
        jours: j, libelle: nom.charAt(0).toUpperCase() + nom.slice(1), ferme: !g.h,
        texte: g.h ? heure(g.h.ouverture) + ' – ' + heure(g.h.fermeture) : 'Fermé',
        ouverture: g.h && g.h.ouverture, fermeture: g.h && g.h.fermeture
      };
    });
  }

  // Phrase complète : « du lundi au samedi de 09h00 à 19h00 et le dimanche de 09h00 à 13h00 »
  function phraseHoraires() {
    var morceaux = groupesHoraires().filter(function (g) { return !g.ferme; }).map(function (g) {
      var j = g.jours;
      var quand = j.length === 1 ? 'le ' + j[0] : (j.length === 2 ? 'le ' + j[0] + ' et le ' + j[1] : 'du ' + j[0] + ' au ' + j[j.length - 1]);
      return quand + ' de ' + heure(g.ouverture) + ' à ' + heure(g.fermeture);
    });
    if (!morceaux.length) return '';
    return morceaux.length === 1 ? morceaux[0] : morceaux.slice(0, -1).join(', ') + ' et ' + morceaux[morceaux.length - 1];
  }

  function joursOuverts() {
    var H = C().horaires || {};
    return ORDRE.filter(function (j) { return H[j] && H[j].ouverture; }).length;
  }

  function statut(d) {
    var n = maintenant(d), h = horairesDu(n.iso);
    var r = { etat: 'ferme', court: 'Fermé', long: '', titre: 'Fermé', detail: '', jourTexte: '' };
    r.jourTexte = h.ferme ? "Aujourd'hui : fermé" : "Aujourd'hui : " + heure(h.ouverture) + ' – ' + heure(h.fermeture);
    if (!h.ferme) {
      var o = enMinutes(h.ouverture), f = enMinutes(h.fermeture);
      if (n.minutes >= o && n.minutes < f) {
        var reste = f - n.minutes;
        r.etat = reste <= 45 ? 'bientot' : 'ouvert';
        r.court = reste <= 45 ? 'Ferme bientôt' : 'Ouvert';
        r.titre = 'Ouvert';
        r.long = "Ouvert aujourd'hui jusqu'à " + heure(h.fermeture);
        r.detail = "Jusqu'à " + heure(h.fermeture) + " aujourd'hui." + (reste <= 45 ? ' Fermeture dans ' + reste + ' min.' : '');
        if (h.message) r.detail += ' ' + h.message;
        return r;
      }
      if (n.minutes < o) {
        r.etat = (o - n.minutes) <= 45 ? 'bientot' : 'ferme';
        r.court = 'Fermé';
        r.long = "Fermé, ouvre aujourd'hui à " + heure(h.ouverture);
        r.detail = "Ouverture aujourd'hui à " + heure(h.ouverture) + '.';
        return r;
      }
    }
    for (var i = 1; i <= 21; i++) {
      var iso = isoPlus(n.iso, i), hh = horairesDu(iso);
      if (!hh.ferme) {
        var quand = i === 1 ? 'demain' : JOURS[jourDe(iso)] + (i > 6 ? ' ' + dateLongue(iso, false) : '');
        r.long = 'Fermé, ouvre ' + quand + ' à ' + heure(hh.ouverture);
        r.detail = 'Réouverture ' + quand + ' à ' + heure(hh.ouverture) + '.' + (h.message ? ' ' + h.message : '');
        return r;
      }
    }
    r.long = 'Fermé';
    return r;
  }

  /* ---------- Promotions ---------- */
  function preparerPromotions(p) {
    p = p || { liste: [] };
    var n = maintenant();
    var lundi = isoPlus(n.iso, -((n.jour + 6) % 7)), dimanche = isoPlus(lundi, 6);
    var liste = (p.liste || []).map(function (x) {
      var y = Object.assign({}, x);
      y.debut = x.debut === 'semaine' ? lundi : x.debut;
      y.fin = x.fin === 'semaine' ? dimanche : x.fin;
      return y;
    }).filter(function (x) {
      return (!x.fin || x.fin >= n.iso) && (!x.debut || x.debut <= n.iso);
    });
    var debuts = liste.map(function (x) { return x.debut + '|' + x.fin; });
    var commune = liste.length && debuts.every(function (d) { return d === debuts[0]; }) && liste[0].debut && liste[0].fin;
    return {
      demo: !!p.demo, liste: liste,
      periode: commune ? periode(liste[0].debut, liste[0].fin) : (liste.length ? 'Offres valables aux dates indiquées' : '')
    };
  }

  /* ---------- Lien Google Maps : fiche (lien court ou long), coordonnées ou code « Intégrer une carte » ----------
     Renvoie ce qu'on peut en tirer : lien à ouvrir, adresse de carte intégrée, texte de recherche
     (nom + adresse donnés par Google) et coordonnées, avec leur précision. */
  var NB = '(-?\\d{1,3}(?:\\.\\d+)?)';
  function lieuMaps(texte) {
    var t = String(texte || '').trim();
    var r = { valide: false, court: false, lien: '', integration: '', requete: '', latitude: null, longitude: null, precision: '' };
    if (!t) return r;
    var iframe = /<iframe[^>]+src\s*=\s*["']([^"']+)["']/i.exec(t);
    var adresse = (iframe ? iframe[1] : t).replace(/&amp;/g, '&').trim();
    if (!/^https?:\/\/\S+$/i.test(adresse)) return r;
    var u;
    try { u = new URL(adresse); } catch (e) { return r; }
    var hote = u.hostname.replace(/^www\./, '').toLowerCase();
    var court = hote === 'maps.app.goo.gl' || (hote === 'goo.gl' && /^\/maps/.test(u.pathname));
    if (!court && !/^(maps\.)?google\.[a-z.]{2,6}$/.test(hote)) return r;
    if (!court && !/^\/maps/.test(u.pathname) && !/^maps\./.test(hote)) return r;   // une page Google qui n'est pas une carte
    r.valide = true;
    r.court = court;
    u.protocol = 'https:';
    if (/^\/maps\/embed/.test(u.pathname)) r.integration = 'https://www.google.com' + u.pathname + u.search;
    else r.lien = u.href;
    var s = u.href, m;
    try { s = decodeURIComponent(u.href); } catch (e) { /* lien partiellement encodé */ }
    if ((m = new RegExp('!3d' + NB + '!4d' + NB).exec(s))) { r.latitude = +m[1]; r.longitude = +m[2]; r.precision = 'lieu'; }              // fiche : position exacte du lieu
    else if ((m = new RegExp('!2d' + NB + '!3d' + NB).exec(s))) { r.longitude = +m[1]; r.latitude = +m[2]; r.precision = 'lieu'; }         // code d'intégration
    else if ((m = new RegExp('[?&](?:q|query|ll|destination|daddr)=' + NB + ',\\s*' + NB + '(?:&|$)').exec(s))) { r.latitude = +m[1]; r.longitude = +m[2]; r.precision = 'lieu'; }
    else if ((m = new RegExp('@' + NB + ',' + NB).exec(s))) { r.latitude = +m[1]; r.longitude = +m[2]; r.precision = 'centre'; }       // simple centre de la carte
    if (r.latitude == null || Math.abs(r.latitude) > 90 || Math.abs(r.longitude) > 180 || (r.latitude === 0 && r.longitude === 0)) { r.latitude = null; r.longitude = null; r.precision = ''; }
    var q = ['q', 'query', 'destination', 'daddr'].map(function (k) { return u.searchParams.get(k); }).filter(Boolean)[0] || '';
    if (q && !new RegExp('^' + NB + ',\\s*' + NB + '$').test(q.trim())) r.requete = q.replace(/\s+/g, ' ').trim().slice(0, 200);
    var lieu = /\/maps\/place\/([^\/@]+)/.exec(u.pathname);
    if (!r.requete && lieu) { try { r.requete = decodeURIComponent(lieu[1].replace(/\+/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 200); } catch (e) { /* nom illisible */ } }
    if (r.requete && !r.precision) r.precision = 'recherche';
    if (r.integration && !r.precision) r.precision = 'integration';
    return r;
  }
  function position(m) {
    var c = (m && m.carte) || {};
    var lat = Number(c.latitude), lng = Number(c.longitude);
    return c.latitude != null && c.longitude != null && isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat: lat, lng: lng } : null;
  }

  BM.outils = {
    lieuMaps: lieuMaps, position: position,
    maintenant: maintenant, horairesDu: horairesDu, heure: heure, dateLongue: dateLongue, periode: periode,
    groupesHoraires: groupesHoraires, phraseHoraires: phraseHoraires, joursOuverts: joursOuverts,
    isoPlus: isoPlus, jourDe: jourDe, JOURS: JOURS, ORDRE: ORDRE,
    fusion: fusion, lire: lire, ecrire: ecrire, cloner: cloner, preparerPromotions: preparerPromotions
  };

  /* ---------- Fonctions de données (asynchrones) ---------- */
  BM.donnees = {
    pret: pretes,
    source: function () { return source; },
    textes: apres(function () { return C().textes || {}; }),
    photos: apres(function () { return C().photos || {}; }),
    magasin: apres(function () { return C().magasin || {}; }),
    horaires: apres(function () { return { semaine: C().horaires || {}, exceptions: C().exceptions || [] }; }),
    rayons: apres(function () { return C().rayons || []; }),
    maghreb: apres(function () { return C().maghreb || []; }),
    promotions: apres(function () { return preparerPromotions(C().promotions); }),
    galerie: apres(function () { return C().galerie || { categories: [], photos: [] }; }),
    tiktok: apres(function () { return C().tiktok || { demo: false, videos: [] }; }),
    bonASavoir: apres(function () { return C().bonASavoir || []; }),
    faq: apres(function () { return C().faq || []; }),
    statut: statut
  };
})(window.BM);
