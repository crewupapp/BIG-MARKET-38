// @ts-nocheck
/* =====================================================================
   BIG MARKET 38 — Accès à l'espace admin (fonction Supabase « acces-admin »)
   ---------------------------------------------------------------------
   - etat           : l'accès administrateur existe-t-il déjà ?
   - creer          : première connexion, l'administrateur choisit son
                      mot de passe (adresse autorisée dans public.admins)
   - reinitialiser  : mot de passe oublié, avec le code de secours
   - changer        : nouveau mot de passe (connecté, mot de passe actuel)
   - code           : nouveau code de secours (connecté, mot de passe actuel)
   Aucun e-mail n'est envoyé. Le code de secours est montré une seule
   fois à l'administrateur ; seule son empreinte est conservée.
   ===================================================================== */

const BASE = Deno.env.get('SUPABASE_URL') || '';

function cle(nomJson, nomAncien) {
  try {
    const j = JSON.parse(Deno.env.get(nomJson) || '{}');
    if (j.default) return j.default;
    const premiere = Object.values(j)[0];
    if (premiere) return premiere;
  } catch (_) { /* clés au format ancien */ }
  return Deno.env.get(nomAncien) || '';
}
const SECRETE = cle('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
const PUBLIQUE = cle('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function reponse(statut, corps) {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
}
function erreur(statut, message) { return reponse(statut, { ok: false, erreur: message }); }

function entetes(k) {
  const h = { apikey: k, 'Content-Type': 'application/json' };
  if (!String(k).startsWith('sb_')) h.Authorization = 'Bearer ' + k;   // anciennes clés (JWT)
  return h;
}
async function appel(chemin, options = {}, k = SECRETE) {
  const r = await fetch(BASE + chemin, { ...options, headers: { ...entetes(k), ...(options.headers || {}) } });
  const texte = await r.text();
  let corps = null;
  try { corps = texte ? JSON.parse(texte) : null; } catch (_) { corps = texte; }
  return { ok: r.ok, statut: r.status, corps };
}

/* ---------- Code de secours ---------- */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function nouveauCode() {
  const octets = crypto.getRandomValues(new Uint8Array(16));
  let s = '';
  for (let i = 0; i < 16; i++) {
    s += ALPHABET[octets[i] % 32];
    if (i % 4 === 3 && i < 15) s += '-';
  }
  return s;
}
function normaliser(code) { return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
async function empreinte(code) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bm38:' + normaliser(code)));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function egal(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Lecture des administrateurs et des comptes ---------- */
async function adminDe(email) {
  if (!email) return null;
  const r = await appel('/rest/v1/admins?select=email,secours_empreinte,creation_avant&email=eq.' + encodeURIComponent(email));
  if (!r.ok) throw new Error('admins ' + r.statut);
  return (r.corps && r.corps[0]) || null;
}
async function compteDe(email) {
  for (let page = 1; page <= 20; page++) {
    const r = await appel('/auth/v1/admin/users?page=' + page + '&per_page=200');
    if (!r.ok) throw new Error('comptes ' + r.statut);
    const liste = (r.corps && r.corps.users) || [];
    const u = liste.find((x) => String(x.email || '').toLowerCase() === email);
    if (u) return u;
    if (liste.length < 200) return null;
  }
  return null;
}
async function enregistrerCode(email) {
  const code = nouveauCode();
  const r = await appel('/rest/v1/admins?email=eq.' + encodeURIComponent(email), {
    method: 'PATCH', body: JSON.stringify({ secours_empreinte: await empreinte(code) }), headers: { Prefer: 'return=minimal' },
  });
  return r.ok ? code : null;
}
function problemeMotDePasse(m) {
  if (typeof m !== 'string' || m.length < 10) return 'Le mot de passe doit contenir au moins 10 caractères.';
  if (m.length > 72) return 'Le mot de passe doit contenir au plus 72 caractères.';
  return '';
}
async function motDePasseValide(email, motDePasse) {
  const r = await appel('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: motDePasse }) }, PUBLIQUE);
  return r.ok;
}
async function compteDuJeton(req) {
  const jeton = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!jeton || jeton.startsWith('sb_')) return null;
  const r = await fetch(BASE + '/auth/v1/user', { headers: { apikey: PUBLIQUE, Authorization: 'Bearer ' + jeton } });
  if (!r.ok) return null;
  return await r.json();
}

/* ---------- Actions ---------- */
async function traiter(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let corps = {};
  if (req.method === 'POST') {
    try { corps = await req.json(); } catch (_) { return erreur(400, 'Requête illisible.'); }
  } else if (req.method !== 'GET') {
    return erreur(405, 'Méthode non autorisée.');
  }
  const action = req.method === 'GET' ? 'etat' : String(corps.action || '');
  const email = String(corps.email || '').trim().toLowerCase();

  if (action === 'etat') {
    const r = await appel('/rest/v1/admins?select=email');
    if (!r.ok) return erreur(500, 'Service indisponible.');
    let cree = false;
    for (const a of r.corps || []) {
      const u = await compteDe(a.email);
      if (u && u.email_confirmed_at) { cree = true; break; }
    }
    return reponse(200, { ok: true, accesCree: cree });
  }

  if (action === 'creer') {
    const pb = problemeMotDePasse(corps.motDePasse);
    if (pb) return erreur(400, pb);
    const admin = await adminDe(email);
    if (!admin) { await pause(700); return erreur(403, "Cette adresse n'est pas autorisée dans l'espace admin."); }
    if (new Date(admin.creation_avant) < new Date()) return erreur(403, "Le délai pour créer l'accès est dépassé : demandez sa réactivation.");
    const existant = await compteDe(email);
    if (existant && existant.email_confirmed_at) return erreur(409, 'Votre accès existe déjà : connectez-vous avec votre mot de passe.');
    if (existant) await appel('/auth/v1/admin/users/' + existant.id, { method: 'DELETE' });   // compte jamais confirmé : remplacé
    const c = await appel('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password: corps.motDePasse, email_confirm: true }) });
    if (!c.ok) {
      if (c.statut === 422) return erreur(409, 'Votre accès existe déjà : connectez-vous avec votre mot de passe.');
      return erreur(500, "La création de l'accès a échoué. Réessayez dans un instant.");
    }
    return reponse(200, { ok: true, codeSecours: await enregistrerCode(email) });
  }

  if (action === 'reinitialiser') {
    const pb = problemeMotDePasse(corps.motDePasse);
    if (pb) return erreur(400, pb);
    const admin = await adminDe(email);
    const attendu = admin && admin.secours_empreinte;
    const fourni = await empreinte(corps.codeSecours);
    if (!attendu || !egal(attendu, fourni)) { await pause(900); return erreur(403, 'Adresse ou code de secours incorrect.'); }
    const u = await compteDe(email);
    if (!u) return erreur(404, "Aucun accès n'existe encore pour cette adresse : créez-le d'abord.");
    const m = await appel('/auth/v1/admin/users/' + u.id, { method: 'PUT', body: JSON.stringify({ password: corps.motDePasse }) });
    if (!m.ok) return erreur(500, 'Le changement de mot de passe a échoué. Réessayez.');
    return reponse(200, { ok: true, codeSecours: await enregistrerCode(email) });
  }

  if (action === 'changer' || action === 'code') {
    const u = await compteDuJeton(req);
    if (!u || !u.email) return erreur(401, 'Votre session a expiré : reconnectez-vous.');
    const mail = String(u.email).toLowerCase();
    if (!(await adminDe(mail))) return erreur(403, 'Accès réservé aux administrateurs.');
    if (!(await motDePasseValide(mail, String(corps.motDePasseActuel || '')))) { await pause(700); return erreur(403, 'Mot de passe actuel incorrect.'); }
    if (action === 'changer') {
      const pb = problemeMotDePasse(corps.motDePasse);
      if (pb) return erreur(400, pb);
      const m = await appel('/auth/v1/admin/users/' + u.id, { method: 'PUT', body: JSON.stringify({ password: corps.motDePasse }) });
      if (!m.ok) return erreur(500, 'Le changement de mot de passe a échoué. Réessayez.');
      return reponse(200, { ok: true });
    }
    const code = await enregistrerCode(mail);
    return code ? reponse(200, { ok: true, codeSecours: code }) : erreur(500, "Le code de secours n'a pas pu être créé.");
  }

  return erreur(400, 'Action inconnue.');
}

Deno.serve(async (req) => {
  try {
    return await traiter(req);
  } catch (e) {
    console.error('acces-admin', e);
    return erreur(500, 'Service momentanément indisponible. Réessayez dans un instant.');
  }
});
