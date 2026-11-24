/* =====================================================================
   BIG MARKET 38 — INTERFACE
   Menu, statut ouvert/fermé en direct, visionneuse, carte, FAQ...
   ===================================================================== */
window.BM = window.BM || {};

(function (BM) {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Message éphémère ---------- */
  var minuteurToast = null;
  function toast(message) {
    var t = $('.toast');
    if (!t) return;
    t.textContent = message;
    t.classList.add('est-visible');
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(function () { t.classList.remove('est-visible'); }, 2600);
  }

  /* ---------- Menu mobile ---------- */
  function menu() {
    var bouton = $('.burger'), panneau = $('#menu'), main = $('main');
    if (!bouton || !panneau) return;
    function ouvrir() {
      panneau.hidden = false;
      html.classList.add('menu-ouvert');
      bouton.setAttribute('aria-expanded', 'true');
      bouton.setAttribute('aria-label', 'Fermer le menu');
      if (main) main.inert = true;
      requestAnimationFrame(function () { panneau.classList.add('est-ouvert'); });
      var premier = $('a', panneau);
      if (premier) premier.focus({ preventScroll: true });
    }
    function fermer(retourFocus) {
      panneau.classList.remove('est-ouvert');
      html.classList.remove('menu-ouvert');
      bouton.setAttribute('aria-expanded', 'false');
      bouton.setAttribute('aria-label', 'Ouvrir le menu');
      if (main) main.inert = false;
      panneau.hidden = true;
      if (retourFocus) bouton.focus();
    }
    bouton.addEventListener('click', function () { bouton.getAttribute('aria-expanded') === 'true' ? fermer(true) : ouvrir(); });
    panneau.addEventListener('click', function (e) { if (e.target.closest('a')) fermer(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panneau.hidden) fermer(true); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1180 && !panneau.hidden) fermer(false); });
  }

  /* ---------- Statut ouvert / fermé (heure de Paris) ---------- */
  function statut() {
    function maj() {
      var s = BM.donnees.statut();
      $$('[data-bm="statut-court"]').forEach(function (el) { el.textContent = s.court; });
      $$('[data-bm="statut-long"]').forEach(function (el) { el.textContent = s.long; });
      $$('[data-bm="statut-etat"]').forEach(function (el) { el.textContent = s.titre; });
      $$('[data-bm="statut-detail"]').forEach(function (el) { el.textContent = s.detail; });
      $$('[data-bm="horaire-jour"]').forEach(function (el) { el.textContent = s.jourTexte; });
      $$('[data-etat]').forEach(function (el) { el.setAttribute('data-etat', s.etat); });
      var n = BM.outils.maintenant();
      $$('[data-bm="date-jour"]').forEach(function (el) { el.textContent = BM.outils.dateLongue(n.iso); });
    }
    maj();
    setInterval(maj, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) maj(); });
  }

  /* ---------- Galerie : filtres et visionneuse ---------- */
  function galerie() {
    var filtres = $('#filtres-galerie'), grille = $('#grille-galerie'), dlg = $('#visionneuse');
    if (filtres) filtres.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filtre]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      BM.rendu.galerie(null, b.getAttribute('data-filtre'), !reduit);
    });
    if (!grille || !dlg) return;
    var img = $('img', dlg), legende = $('figcaption', dlg), compteur = $('.visionneuse__compteur', dlg);
    var index = 0, declencheur = null;
    function afficher(i) {
      var photos = BM.rendu.etat.photosFiltrees;
      if (!photos.length) return;
      index = (i + photos.length) % photos.length;
      var p = photos[index];
      img.classList.remove('est-change');
      void img.offsetWidth;
      img.src = p.image;
      img.alt = p.alt || p.legende || '';
      img.classList.add('est-change');
      legende.textContent = p.legende || '';
      compteur.textContent = (index + 1) + ' / ' + photos.length;
    }
    grille.addEventListener('click', function (e) {
      var v = e.target.closest('.vignette');
      if (!v) return;
      declencheur = v;
      afficher(parseInt(v.getAttribute('data-index'), 10));
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      html.classList.add('visionneuse-ouverte');
    });
    $('[data-prec]', dlg).addEventListener('click', function () { afficher(index - 1); });
    $('[data-suiv]', dlg).addEventListener('click', function () { afficher(index + 1); });
    $('[data-fermer]', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { html.classList.remove('visionneuse-ouverte'); if (declencheur) declencheur.focus(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') afficher(index - 1);
      if (e.key === 'ArrowRight') afficher(index + 1);
    });
    var x0 = null;
    dlg.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    dlg.addEventListener('pointerup', function (e) {
      if (x0 == null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) afficher(index + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- Carte Google Maps (chargée seulement au clic) ---------- */
  function carte() {
    var b = $('[data-charger-carte]'), cadre = $('#cadre-carte');
    if (!b || !cadre) return;
    b.addEventListener('click', function () {
      var adr = BM.rendu.adresseComplete(BM.rendu.etat.magasin);
      var f = document.createElement('iframe');
      f.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(BM.rendu.etat.magasin.nom + ', ' + adr) + '&z=16&output=embed';
      f.title = 'Carte Google Maps : ' + BM.rendu.etat.magasin.nom;
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.allowFullscreen = true;
      cadre.appendChild(f);
      b.closest('.carte-plan').classList.add('est-chargee');
    });
  }

  /* ---------- Copier l'adresse ---------- */
  function copier() {
    var b = $('[data-copier-adresse]');
    if (!b) return;
    b.addEventListener('click', function () {
      var m = BM.rendu.etat.magasin, texte = m.nom + ', ' + BM.rendu.adresseComplete(m);
      function ok() { toast('Adresse copiée'); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texte).then(ok, secours);
      else secours();
      function secours() {
        var t = document.createElement('textarea');
        t.value = texte; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); ok(); } catch (e) { toast(texte); }
        document.body.removeChild(t);
      }
    });
  }

  /* ---------- FAQ : ouverture animée ---------- */
  function faq() {
    var box = $('#faq');
    if (!box) return;
    box.addEventListener('click', function (e) {
      var s = e.target.closest('summary');
      if (!s || reduit) return;
      var d = s.parentNode, rep = $('.question__reponse', d);
      if (!rep || !rep.animate) return;
      e.preventDefault();
      if (d.open) {
        var h = rep.scrollHeight;
        rep.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' })
          .onfinish = function () { d.open = false; };
      } else {
        d.open = true;
        var h2 = rep.scrollHeight;
        rep.animate([{ height: '0px', opacity: 0 }, { height: h2 + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  }

  /* ---------- Mode repérage des images (?images dans l'adresse) ---------- */
  function modeImages() {
    if (!/[?&]images\b/.test(location.search)) return;
    $$('img').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if (src.indexOf('assets/images/') !== 0 || src.indexOf('/logo/') > -1 && !img.closest('.hero__visuel, .pied__marque')) return;
      var parent = img.parentNode;
      if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
      var l = document.createElement('span');
      l.className = 'repere-image';
      l.textContent = src;
      parent.appendChild(l);
    });
    toast('Mode repérage des images activé');
  }

  /* ---------- Démarrage ---------- */
  function demarrer() {
    BM.toast = toast;
    var pret = BM.rendu && BM.rendu.tout ? BM.rendu.tout() : Promise.resolve();
    pret.catch(function (e) { console.error('BIG MARKET 38 : erreur d\'affichage', e); }).then(function () {
      html.classList.add('contenu-pret');
      menu();
      statut();
      galerie();
      carte();
      copier();
      faq();
      if (BM.anim) BM.anim.init();
      modeImages();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})(window.BM);
