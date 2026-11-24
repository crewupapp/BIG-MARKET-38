/* =====================================================================
   BIG MARKET 38 — ANIMATIONS AU DÉFILEMENT
   Un seul moteur (requestAnimationFrame) qui ne calcule que les scènes
   visibles, et uniquement avec des transformations (fluide sur mobile).
   Le défilement reste natif : rien ne bloque la navigation.
   ===================================================================== */
window.BM = window.BM || {};

(function (BM) {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var sortie = function (t) { return 1 - Math.pow(1 - t, 3); };
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var html = document.documentElement;

  var vh = window.innerHeight, vw = window.innerWidth;
  var y = window.scrollY, yPrec = y, vitesse = 0, enBoucle = false, repos = 0, hauteurDoc = 0;
  var taches = [];

  /* ---------- Moteur ---------- */
  var io = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) { (e.target.__taches || []).forEach(function (t) { t.actif = e.isIntersecting; }); });
    reveiller();
  }, { rootMargin: '30% 0px 30% 0px' });

  // cible : élément suivi ; maj(rect, lu) : écritures ; lire() : mesures supplémentaires (faites avant toute écriture)
  function tache(cible, maj, toujours, lire) {
    var t = { cible: cible, maj: maj, lire: lire || null, actif: !!toujours, toujours: !!toujours, rect: null, lu: null };
    taches.push(t);
    if (!toujours && cible) { (cible.__taches = cible.__taches || []).push(t); io.observe(cible); }
    return t;
  }
  function image() {
    y = window.scrollY;
    var dy = y - yPrec; yPrec = y;
    vitesse = lerp(vitesse, dy, 0.14);
    var actives = taches.filter(function (t) { return t.actif; });
    // 1. lecture : aucune écriture avant la fin des mesures, donc aucun recalcul de mise en page forcé
    hauteurDoc = document.documentElement.scrollHeight;
    actives.forEach(function (t) { t.rect = t.cible ? t.cible.getBoundingClientRect() : null; t.lu = t.lire ? t.lire() : null; });
    // 2. écriture
    var encore = false;
    actives.forEach(function (t) { if (t.maj(t.rect, t.lu) === true) encore = true; });
    if (encore || Math.abs(vitesse) > 0.06 || repos-- > 0) window.requestAnimationFrame(image);
    else enBoucle = false;
  }
  function reveiller() {
    repos = 30;
    if (!enBoucle) { enBoucle = true; window.requestAnimationFrame(image); }
  }
  function progression(rect, debut, fin) { return clamp((debut - rect.top) / (debut - fin)); }

  /* ---------- Découpage des textes ---------- */
  function decouperLettres(bulle, k) {
    var texte = bulle.getAttribute('data-texte') || bulle.textContent;
    var titre = bulle.closest('.titre');
    if (titre && !titre.hasAttribute('aria-label')) titre.setAttribute('aria-label', titre.textContent.replace(/\s+/g, ' ').trim());
    var j = 0;
    bulle.innerHTML = Array.prototype.map.call(texte, function (c) {
      if (c === ' ') return '<span class="bulle__espace"> </span>';
      var e = c.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      return '<span class="bulle__l" data-texte="' + e + '" style="--j:' + (j++) + ';--k:' + k + '">' + e + '</span>';
    }).join('');
    bulle.classList.add('est-decoupe');
    bulle.setAttribute('aria-hidden', 'true');
  }
  function decouperTitres() {
    $$('.bulle[data-decoupe="lettres"]').forEach(function (b) {
      var ligne = b.closest('.titre__ligne');
      var k = ligne ? Array.prototype.indexOf.call(ligne.parentNode.querySelectorAll('.titre__ligne'), ligne) : 0;
      decouperLettres(b, k);
    });
  }
  function decouperMots(el) {
    var mots = el.textContent.trim().split(/\s+/);
    el.innerHTML = mots.map(function (m) { return '<span class="mot">' + m.replace(/</g, '&lt;') + '</span>'; }).join(' ');
    return $$('.mot', el);
  }
  function decouperEnLettres(el) {
    var t = el.textContent;
    el.setAttribute('aria-label', t);
    el.innerHTML = Array.prototype.map.call(t, function (c) { return c === ' ' ? '<span class="lettre">&nbsp;</span>' : '<span class="lettre">' + c + '</span>'; }).join('');
    return $$('.lettre', el);
  }

  /* ---------- Apparitions ----------
     Un élément apparaît quand son haut arrive vers 85 % de la hauteur de l'écran.
     Ce qui apparaît en même temps apparaît en cascade, dans l'ordre de lecture.
     Dans une bande qui défile à l'horizontale (cartes, téléphones sur mobile),
     toutes les cartes apparaissent ensemble, même celles encore hors de l'écran. */
  var ioRevele = null;
  function observerRevelations() {
    if (!ioRevele) {
      ioRevele = new IntersectionObserver(function (entrees) {
        var lot = [];
        entrees.forEach(function (e) {
          if (!e.isIntersecting) return;
          var groupe = e.target.closest('[data-revele-groupe]');
          (groupe ? $$('[data-revele]', groupe) : [e.target]).forEach(function (el) {
            if (!el.classList.contains('est-visible') && lot.indexOf(el) < 0) lot.push(el);
          });
        });
        lot.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
        lot.forEach(function (el, rang) {
          if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', Math.min(rang, 5));
          el.classList.add('est-visible');
          ioRevele.unobserve(el);
          setTimeout(function () { el.classList.add('revele-fini'); }, 1700);   // apparition terminée
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    }
    $$('[data-revele]:not(.est-visible)').forEach(function (el) {
      if (reduit) el.classList.add('est-visible', 'revele-fini'); else ioRevele.observe(el);
    });
  }

  /* ---------- 1. En-tête (ton clair/sombre, masquage), lien actif, progression, barre mobile ---------- */
  function interfaceDefilement() {
    var zones = $$('main > .scene[data-fond], footer.pied[data-fond]');
    var entete = $('#entete'), liensNav = $$('.entete__nav a'), barre = $('.barre-mobile'), prog = $('.progression');
    var memo = {};
    tache(null, function (_, rects) {
      var sous = 0, centre = 0;
      for (var k = 0; k < rects.length; k++) { if (rects[k].top <= 44) sous = k; if (rects[k].top <= vh * 0.5) centre = k; }
      var ton = zones[sous].getAttribute('data-fond') === 'blanc' ? 'clair' : 'sombre';
      if (memo.ton !== ton) { memo.ton = ton; entete.setAttribute('data-ton', ton); prog.setAttribute('data-ton', ton); }
      var defile = y > 30;
      if (memo.defile !== defile) { memo.defile = defile; entete.classList.toggle('est-defile', defile); }
      if (!html.classList.contains('menu-ouvert')) {
        if (vitesse > 4 && y > vh * 0.9) entete.classList.add('est-cache');
        else if (vitesse < -3 || y < vh * 0.5) entete.classList.remove('est-cache');
      }
      var id = zones[centre].id;
      if (memo.id !== id) { memo.id = id; liensNav.forEach(function (a) { a.classList.toggle('est-actif', a.getAttribute('href') === '#' + id); }); }
      var total = hauteurDoc - vh, p = total > 0 ? (y / total).toFixed(4) : '0';
      if (memo.p !== p) { memo.p = p; prog.style.setProperty('--p', p); }
      if (barre) {
        var visible = y > vh * 0.7 && !html.classList.contains('menu-ouvert');
        if (memo.barre !== visible) { memo.barre = visible; barre.classList.toggle('est-visible', visible); }
      }
    }, true, function () { return zones.map(function (z) { return z.getBoundingClientRect(); }); });
  }

  /* ---------- 2. Accueil : recul de la scène au défilement ---------- */
  function hero() {
    var contenu = $('[data-hero]'), cadre = $('[data-hero-cadre]'), badge = $('[data-badge]');
    if (!contenu) return;
    var animBadge = null, imgCadre = $('img', cadre), memo = {};
    // La scène recule sans jamais passer sous le bandeau noir : le recul est limité à l'espace libre au-dessus de lui
    var ruban = $('.ruban', contenu.parentNode), grille = $('.hero__grille', contenu), espace = 0;
    function mesurer() {
      espace = ruban && grille ? Math.max(0, ruban.offsetTop - (contenu.offsetTop + grille.offsetTop + grille.offsetHeight) - 36) : vh;
    }
    mesurer();
    BM.anim._mesures.push(mesurer);
    if (window.ResizeObserver) new ResizeObserver(function () { mesurer(); reveiller(); }).observe(contenu);
    tache(contenu.parentNode, function () {
      var p = clamp(y / vh);
      var hy = grand() ? Math.min(p * vh * 0.16, espace).toFixed(1) + 'px' : '0px', hs = grand() ? (1 - p * 0.07).toFixed(4) : '1';
      if (memo.hy !== hy) { memo.hy = hy; contenu.style.setProperty('--hy', hy); }
      if (memo.hs !== hs) { memo.hs = hs; contenu.style.setProperty('--hs', hs); }
      var z = (1 + p * 0.22).toFixed(4);
      if (imgCadre && memo.z !== z) { memo.z = z; imgCadre.style.setProperty('--zoom', z); }
      if (badge) {
        animBadge = animBadge || (badge.getAnimations && badge.getAnimations()[0]);
        if (animBadge) animBadge.playbackRate = 1 + Math.min(Math.abs(vitesse) * 0.35, 6);
      }
    });
  }

  /* ---------- 3. Grands mots de fond et parallaxe des photos ---------- */
  function defilements() {
    $$('[data-defile]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-defile')) || 0.3, parent = el.parentNode;
      tache(parent, function (r) {
        var d = (r.top + r.height / 2 - vh / 2);
        el.style.setProperty('--dx', (d * s).toFixed(1) + 'px');
      });
    });
    $$('[data-parallaxe]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-parallaxe')) || 0.1, parent = el.parentNode;
      tache(parent, function (r) {
        var d = (r.top + r.height / 2 - vh / 2) * s * (grand() ? 1 : 0.6);
        var max = r.height * 0.085;
        el.style.setProperty('--py', clamp(d, -max, max).toFixed(1) + 'px');
      });
    });
  }

  /* ---------- 4. Bandeaux : vitesse et inclinaison selon le défilement ---------- */
  function rubans() {
    $$('[data-ruban]').forEach(function (piste) {
      if (!piste.__double) { piste.insertAdjacentHTML('beforeend', piste.innerHTML); piste.__double = true; }
      var bande = piste.parentNode, sens = parseFloat(piste.getAttribute('data-sens')) || 1;
      var anim = piste.getAnimations ? piste.getAnimations()[0] : null;
      if (anim) anim.playbackRate = sens;
      var taux = sens, dir = 1;
      tache(bande, function () {
        if (vitesse > 0.6) dir = 1; else if (vitesse < -0.6) dir = -1;
        var cible = sens * dir * (1 + Math.min(Math.abs(vitesse) * 0.22, 5));
        taux = lerp(taux, cible, 0.12);
        if (anim) anim.playbackRate = taux;
        bande.style.setProperty('--skew', clamp(-vitesse * 0.18, -9, 9).toFixed(2) + 'deg');
        return Math.abs(taux - cible) > 0.02;
      });
    });
  }

  /* ---------- 5. Texte qui s'allume mot à mot ---------- */
  function texteLumiere() {
    $$('[data-lumiere]').forEach(function (p) {
      var mots = decouperMots(p), allumes = -1;
      tache(p, function (r) {
        var t = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.3));
        var n = Math.round(t * mots.length * 1.12);
        if (n !== allumes) { allumes = n; mots.forEach(function (m, i) { m.classList.toggle('est-allume', i < n); }); }
      });
    });
  }

  /* ---------- 6. Rayons : défilement horizontal (grand écran) / cartes empilées (mobile) ---------- */
  var rayonsEtat = { distance: 0, course: 1, panneaux: [], largeurs: [] };
  function rayons() {
    var section = $('#rayons'), piste = $('[data-piste]'), liste = $('#liste-rayons');
    if (!section || !piste || !liste) return;
    var compteur = $('[data-compteur]'), barre = $('[data-barre]'), plan = $('#plan-rayons');
    var items = $$('.rayon', liste), cartes = items.map(function (li) { return $('.rayon__carte', li); });
    var mots = items.map(function (li) { return $('.rayon__fond-mot', li); }), images = items.map(function (li) { return $('.rayon__visuel img', li); });
    var dernierIndex = -1;

    function mesurer() {
      var horizontal = grand() && !reduit;
      section.classList.toggle('rayons--horizontal', horizontal);
      if (horizontal) {
        liste.style.setProperty('--x', '0px');
        var largeur = liste.scrollWidth;
        rayonsEtat.distance = Math.max(0, largeur - vw);
        // Chaque rayon défile en 0,8 écran : on traverse les 7 rayons sans longueur
        rayonsEtat.course = Math.max(vh, Math.round((items.length - 1) * vh * 0.8));
        piste.style.setProperty('--piste-h', (rayonsEtat.course + vh) + 'px');
        rayonsEtat.panneaux = items.map(function (li) { return { gauche: li.offsetLeft, largeur: li.offsetWidth }; });
        images.forEach(function (img) { img.loading = 'eager'; });
      } else {
        piste.style.removeProperty('--piste-h');
        cartes.forEach(function (c) { c.style.removeProperty('--rot'); c.style.removeProperty('--sc'); c.style.removeProperty('--voile'); });
      }
    }
    mesurer();
    BM.anim._mesures.push(mesurer);

    if (plan) plan.addEventListener('click', function (e) {
      var b = e.target.closest('[data-aller]');
      if (!b) return;
      var i = parseInt(b.getAttribute('data-aller'), 10);
      if (section.classList.contains('rayons--horizontal')) {
        var haut = piste.getBoundingClientRect().top + window.scrollY;
        var pn = rayonsEtat.panneaux[i];
        var p = clamp((pn.gauche + pn.largeur / 2 - vw / 2) / (rayonsEtat.distance || 1));
        window.scrollTo({ top: haut + p * (piste.offsetHeight - vh) + 2, behavior: reduit ? 'auto' : 'smooth' });
      } else { items[i].scrollIntoView({ behavior: 'smooth' }); }
    });

    tache(piste, function (r, rects) {
      if (section.classList.contains('rayons--horizontal')) {
        var p = clamp(-r.top / Math.max(1, rayonsEtat.course));
        var x = -p * rayonsEtat.distance;
        liste.style.setProperty('--x', x.toFixed(1) + 'px');
        if (barre) barre.parentNode.style.setProperty('--p', p.toFixed(4));
        var milieu = vw / 2, proche = 0, ecart = Infinity;
        rayonsEtat.panneaux.forEach(function (pn, i) {
          var centre = pn.gauche + x + pn.largeur / 2, d = (centre - milieu) / vw;
          if (Math.abs(d) < ecart) { ecart = Math.abs(d); proche = i; }
          if (Math.abs(d) < 1.4) {
            cartes[i].style.setProperty('--rot', (d * -3).toFixed(2) + 'deg');
            cartes[i].style.setProperty('--sc', (1 - Math.min(Math.abs(d), 1) * 0.08).toFixed(4));
            cartes[i].style.setProperty('--voile', Math.min(Math.abs(d) * 0.75, 0.55).toFixed(3));
            mots[i].style.setProperty('--mx', (d * -260).toFixed(1) + 'px');
            images[i].style.setProperty('--ix', (d * -70).toFixed(1) + 'px');
          }
        });
        if (proche !== dernierIndex) {
          dernierIndex = proche;
          if (compteur) compteur.textContent = String(proche + 1).padStart(2, '0');
          if (plan) $$('button', plan).forEach(function (b, i) { b.setAttribute('aria-current', String(i === proche)); });
        }
      } else {
        // Mobile : la carte recouverte recule et s'assombrit
        if (!rects) return;
        for (var i = 0; i < items.length - 1; i++) {
          var cov = clamp((rects[i].bottom - rects[i + 1].top) / Math.max(1, rects[i].height));
          cartes[i].style.setProperty('--couvert', cov.toFixed(3));
        }
      }
    }, false, function () {
      return section.classList.contains('rayons--horizontal') ? null : items.map(function (li) { return li.getBoundingClientRect(); });
    });
  }

  /* ---------- 7. Fraîcheur : zoom à travers le mot ---------- */
  function fraicheur() {
    var zoom = $('[data-zoom]'), mot = $('[data-mot]'), fenetre = $('[data-fenetre]');
    if (!zoom || !mot || !fenetre || reduit) return;
    var collant = zoom.firstElementChild, legende = $('.fraicheur__legende', collant), img = $('img', fenetre), lettres = decouperEnLettres(mot), n = lettres.length;
    img.loading = 'eager';
    tache(zoom, function (r) {
      // 0 → 62 % : la photo s'ouvre en plein écran ; 52 → 72 % : la légende arrive ; ensuite on a le temps de la lire
      var p = clamp(-r.top / Math.max(1, r.height - vh));
      var e = sortie(clamp(p / 0.62));
      var s0 = vw < 700 ? 0.56 : 0.36;
      fenetre.style.setProperty('--s', lerp(s0, 1.03, e).toFixed(4));
      img.style.setProperty('--si', lerp(1.35, 1, e).toFixed(4));
      var fond = clamp((p - 0.1) / 0.4);
      lettres.forEach(function (l, j) {
        var off = n > 1 ? (j - (n - 1) / 2) / ((n - 1) / 2) : 0;
        l.style.setProperty('--lx', (off * e * vw * 0.62).toFixed(1) + 'px');
        l.style.setProperty('--ly', (-Math.abs(off) * e * vh * 0.12).toFixed(1) + 'px');
        l.style.setProperty('--lr', (off * e * 24).toFixed(2) + 'deg');
        l.style.setProperty('--lo', (1 - fond).toFixed(3));
      });
      var o = clamp((p - 0.52) / 0.2).toFixed(3);
      if (legende) legende.style.setProperty('--o', o);
      fenetre.style.setProperty('--o', o);
    });
  }

  /* ---------- 8. Maghreb : la photo s'ouvre, les cartes glissent ---------- */
  function maghreb() {
    var vedette = $('[data-vedette]'), cartes = $('[data-derive]');
    if (vedette) {
      var repere = vedette.offsetParent || vedette.parentNode, decalage = 0;
      var mesurerVedette = function () { decalage = vedette.offsetTop; };
      mesurerVedette();
      BM.anim._mesures.push(mesurerVedette);
      tache(repere, function (r) {
        var haut = r.top + decalage;   // position de la photo, sans l'effet d'échelle
        var p = sortie(clamp((vh - haut) / (vh * 0.6)));
        vedette.style.setProperty('--sv', lerp(0.86, 1, p).toFixed(4));
        vedette.style.setProperty('--rv', lerp(-5, 0, p).toFixed(2) + 'deg');
      });
    }
    if (cartes) {
      tache(cartes, function (r) {
        if (!grand()) return;
        var d = (r.top + r.height / 2 - vh / 2) * 0.22;
        cartes.style.setProperty('--dx', clamp(d, -140, 140).toFixed(1) + 'px');
      });
    }
  }

  /* ---------- 9. Promos : l'auvent rayé défile ---------- */
  function auvent() {
    var a = $('[data-auvent]');
    if (!a) return;
    tache(a.parentNode, function () { a.style.setProperty('--bx', ((y * 0.35) % 108).toFixed(1) + 'px'); });
  }

  /* ---------- 10. Galerie : colonnes à vitesses différentes ---------- */
  var galerieTache = null, colsGalerie = [];
  function galerie() {
    var grille = $('#grille-galerie');
    if (!grille) return;
    var VIT = [-0.1, 0.07, -0.04];
    colsGalerie = $$('.galerie__col', grille);
    galerieTache = tache(grille, function (r) {
      var cols = colsGalerie, d = (r.top + r.height / 2 - vh / 2);
      cols.forEach(function (c, k) {
        var s = (VIT[k] || 0) * (grand() ? 1 : 0.55);
        c.style.setProperty('--py', clamp(d * s, -50, 50).toFixed(1) + 'px');
      });
    });
  }
  function rafraichirGalerie() { var g = $('#grille-galerie'); if (g) colsGalerie = $$('.galerie__col', g); reveiller(); }

  /* ---------- 11. TikTok : les téléphones montent à des vitesses différentes ---------- */
  function tiktok() {
    var liste = $('#liste-tiktok');
    if (!liste) return;
    var VIT = [0.12, -0.06, 0.16, -0.03], ROT = [-4, 3, -2, 4], tels = $$('.telephone', liste);
    tache(liste, function (r) {
      if (!tels.length || !tels[0].isConnected) tels = $$('.telephone', liste);
      if (!grand()) { tels.forEach(function (t) { t.style.removeProperty('--py'); t.style.removeProperty('--rot'); }); return; }
      var d = (r.top + r.height / 2 - vh / 2), e = clamp(1 - Math.abs(d) / vh);
      tels.forEach(function (t, i) {
        t.style.setProperty('--py', (d * (VIT[i] || 0.05)).toFixed(1) + 'px');
        t.style.setProperty('--rot', ((ROT[i] || 0) * (1 - e)).toFixed(2) + 'deg');
      });
    });
  }

  /* ---------- 12. Pied de page : les lettres géantes montent ---------- */
  function pied() {
    var g = $('[data-pied-geant]');
    if (!g) return;
    var lettres = decouperEnLettres(g), n = lettres.length;
    g.style.overflow = 'hidden';
    tache(g, function (r) {
      // Terminé quand le mot est entièrement visible, ou au plus tard en bas de la page
      var bas = hauteurDoc - vh;
      var finHaut = Math.max(r.top + (bas - y), vh * 0.9 - r.height);
      var p = clamp((vh - r.top) / Math.max(1, vh - finHaut));
      lettres.forEach(function (l, j) {
        var t = sortie(clamp(p * 1.4 - (j / n) * 0.4));
        l.style.setProperty('--ly', ((1 - t) * 105).toFixed(1) + '%');
      });
    });
  }

  /* ---------- Entrée du site : le rideau du magasin se lève ----------
     1re visite de la session : le rideau (affiché dès le 1er dessin grâce au script du <head>) reste
     baissé le temps que le logo se colle et que polices + contenu soient prêts, puis il se déverrouille,
     remonte, le logo file à sa place dans l'en-tête et l'accueil s'anime dessous.
     Un clic, une touche ou un geste de défilement accélère la levée. */
  function attendre(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function intro() {
    try { sessionStorage.setItem('bm-intro', '1'); } catch (e) { /* navigation privée stricte */ }
    var polices = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var boite = $('.intro'), rideau = $('.intro__rideau'), logo = $('.intro__logo');
    if (!html.classList.contains('intro-active') || reduit || !boite || !rideau || !rideau.animate) {
      html.classList.remove('intro-active');
      Promise.race([polices, attendre(450)]).then(function () { html.classList.add('est-pret'); });
      return;
    }
    var parti = false, fini = false;
    var gestes = ['pointerdown', 'keydown', 'wheel', 'touchmove'];
    function passer() { lever(true); }
    gestes.forEach(function (g) { window.addEventListener(g, passer, { passive: true }); });

    function fin() {
      if (fini) return;
      fini = true;
      gestes.forEach(function (g) { window.removeEventListener(g, passer); });
      html.classList.add('est-pret', 'intro-pose');
      html.classList.remove('intro-active', 'intro-fin');
      setTimeout(function () { html.classList.remove('intro-pose'); }, 50);
    }
    function lever(vite) {
      if (parti) return;
      parti = true;
      html.classList.add('intro-fin');
      var duree = vite ? 640 : 1100;
      // 1. le rideau se déverrouille (petit à-coup vers le bas) puis remonte d'un trait
      var monte = rideau.animate([
        { transform: 'translate3d(0, 0, 0)', easing: 'cubic-bezier(.3, 0, .3, 1)' },
        { transform: 'translate3d(0, 16px, 0)', offset: vite ? 0.06 : 0.13, easing: 'cubic-bezier(.72, 0, .18, 1)' },
        { transform: 'translate3d(0, -114%, 0)' }
      ], { duration: duree, fill: 'forwards' });
      // 2. le logo quitte le rideau et rejoint sa place dans l'en-tête
      var vol = Promise.resolve();
      var cible = $('.entete__logo .autocollant--mini');
      if (logo && cible && cible.offsetWidth) {
        var a = logo.getBoundingClientRect(), b = cible.getBoundingClientRect();
        var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        var e = cible.offsetWidth / logo.offsetWidth;
        logo.style.animation = 'none';
        vol = logo.animate([
          { transform: 'rotate(-6deg)' },
          { transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + e.toFixed(4) + ') rotate(-5deg)' }
        ], { duration: vite ? 560 : 920, delay: vite ? 0 : 140, easing: 'cubic-bezier(.65, 0, .2, 1)', fill: 'forwards' }).finished;
      }
      // 3. l'accueil s'anime pendant que le rideau dégage l'écran ; l'en-tête apparaît quand le logo est posé
      setTimeout(function () { html.classList.add('est-pret'); }, vite ? 60 : 320);
      vol.then(function () { html.classList.add('intro-pose'); }, function () {});
      Promise.all([monte.finished, vol]).then(function () { setTimeout(fin, 60); }, fin);
      setTimeout(fin, duree + 1500);   // sécurité
    }
    // Le rideau reste baissé au moins le temps que le logo soit collé (≈ 0,9 s après l'ouverture de la page)
    var depuis = window.performance && performance.now ? performance.now() : 0;
    Promise.all([Promise.race([polices, attendre(900)]), attendre(Math.max(150, 950 - depuis))]).then(function () { lever(false); });
  }

  function grand() { return vw >= 1024; }

  /* ---------- Démarrage ---------- */
  function init() {
    decouperTitres();
    observerRevelations();
    intro();
    interfaceDefilement();
    if (!reduit) {          // mouvement réduit demandé : contenu affiché sans animation
      hero();
      defilements();
      rubans();
      texteLumiere();
      rayons();
      fraicheur();
      maghreb();
      auvent();
      galerie();
      tiktok();
      pied();
    }
    window.addEventListener('scroll', reveiller, { passive: true });
    var minuteur = null;
    window.addEventListener('resize', function () {
      clearTimeout(minuteur);
      minuteur = setTimeout(function () {
        var largeurAvant = vw;
        vw = window.innerWidth; vh = window.innerHeight;
        BM.anim._mesures.forEach(function (f) { f(); });
        if ((largeurAvant >= 900) !== (vw >= 900) && BM.rendu) BM.rendu.galerie(null, null, false);
        reveiller();
      }, 120);
    });
    window.addEventListener('load', function () { BM.anim._mesures.forEach(function (f) { f(); }); reveiller(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { BM.anim._mesures.forEach(function (f) { f(); }); reveiller(); });
    reveiller();
  }

  BM.anim = { init: init, reveiller: reveiller, observerRevelations: observerRevelations, rafraichirGalerie: rafraichirGalerie, _mesures: [] };
})(window.BM);
