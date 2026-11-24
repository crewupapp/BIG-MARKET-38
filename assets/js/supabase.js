/* =====================================================================
   BIG MARKET 38 — ÉCHANGES AVEC SUPABASE
   Petit client sans bibliothèque externe (API REST de Supabase) :
   lecture du contenu pour le site, et pour l'espace admin connexion,
   enregistrement, historique et envoi des photos.
   ===================================================================== */
window.BM = window.BM || {};

(function (BM) {
  'use strict';

  var C = window.BM_CONFIG || {};
  var BASE = String(C.supabaseUrl || '').replace(/\/+$/, '');
  var CLE = String(C.supabaseCle || '');
  var SEAU = C.dossierPhotos || 'photos';

  function Erreur(message, statut, code) {
    var e = new Error(message);
    e.statut = statut || 0;
    e.code = code || '';
    return e;
  }
  function messageDe(corps, statut) {
    if (corps && typeof corps === 'object') return corps.erreur || corps.msg || corps.message || corps.error_description || corps.error || ('Erreur ' + statut);
    return corps ? String(corps).slice(0, 200) : 'Erreur ' + statut;
  }

  function requete(chemin, o) {
    o = o || {};
    if (!BASE || !CLE) return Promise.reject(Erreur('Supabase n\'est pas configuré', 0, 'config'));
    var h = { apikey: CLE };
    if (o.jeton) h.Authorization = 'Bearer ' + o.jeton;
    if (o.json !== undefined) h['Content-Type'] = 'application/json';
    Object.keys(o.entetes || {}).forEach(function (k) { h[k] = o.entetes[k]; });
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null, minuteur = null;
    if (ctrl && o.delai) minuteur = setTimeout(function () { ctrl.abort(); }, o.delai);
    return fetch(BASE + chemin, {
      method: o.methode || 'GET', headers: h, cache: 'no-store',
      body: o.json !== undefined ? JSON.stringify(o.json) : o.corps,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var corps = null;
        try { corps = t ? JSON.parse(t) : null; } catch (e) { corps = t; }
        if (minuteur) clearTimeout(minuteur);
        if (!r.ok) throw Erreur(messageDe(corps, r.status), r.status, corps && typeof corps === 'object' ? (corps.error_code || corps.code || corps.error || '') : '');
        return corps;
      });
    }, function (e) {
      if (minuteur) clearTimeout(minuteur);
      var delai = e && e.name === 'AbortError';
      throw Erreur(delai ? 'Supabase ne répond pas' : 'Connexion à Supabase impossible', 0, delai ? 'delai' : 'reseau');
    });
  }
  function liste(cles) { return encodeURIComponent('(' + cles.map(function (c) { return '"' + c + '"'; }).join(',') + ')'); }

  BM.supabase = {
    actif: !!(BASE && CLE),
    url: BASE,
    requete: requete,

    /* Site : lecture du contenu publié */
    lireContenu: function (delai) { return requete('/rest/v1/contenu?select=cle,valeur,maj_le', { delai: delai }); },

    /* Espace admin */
    connexion: function (email, motDePasse) { return requete('/auth/v1/token?grant_type=password', { methode: 'POST', json: { email: email, password: motDePasse }, delai: 20000 }); },
    rafraichir: function (jetonRenouvellement) { return requete('/auth/v1/token?grant_type=refresh_token', { methode: 'POST', json: { refresh_token: jetonRenouvellement }, delai: 20000 }); },
    deconnexion: function (jeton) { return requete('/auth/v1/logout', { methode: 'POST', jeton: jeton, json: {}, delai: 8000 }); },
    enregistrer: function (jeton, lignes) {
      return requete('/rest/v1/contenu?on_conflict=cle', { methode: 'POST', jeton: jeton, json: lignes, delai: 30000, entetes: { Prefer: 'resolution=merge-duplicates,return=representation' } });
    },
    supprimer: function (jeton, cles) { return requete('/rest/v1/contenu?cle=in.' + liste(cles), { methode: 'DELETE', jeton: jeton, delai: 30000, entetes: { Prefer: 'return=representation' } }); },
    historique: function (jeton, cles) {
      return requete('/rest/v1/contenu_historique?select=id,cle,valeur,enregistre_le,enregistre_par&cle=in.' + liste(cles) + '&order=id.desc&limit=100', { jeton: jeton, delai: 20000 });
    },
    envoyerPhoto: function (jeton, chemin, fichier, type) {
      return requete('/storage/v1/object/' + SEAU + '/' + chemin, {
        methode: 'POST', jeton: jeton, corps: fichier, delai: 120000,
        entetes: { 'Content-Type': type || fichier.type || 'image/jpeg', 'x-upsert': 'true', 'cache-control': 'max-age=31536000' }
      }).then(function () { return BASE + '/storage/v1/object/public/' + SEAU + '/' + chemin; });
    },
    fonction: function (nom, corps, jeton) { return requete('/functions/v1/' + nom, { methode: 'POST', jeton: jeton, json: corps, delai: 30000 }); }
  };
})(window.BM);
