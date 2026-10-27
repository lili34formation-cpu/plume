'use strict';
// Plume — comptes des adultes et sauvegarde en ligne (Supabase, base partagée avec LinguaPop, tables plume_*).
// Les enfants restent des profils dans le compte du parent. Un parent peut partager un enfant
// avec un professionnel (orthophoniste, enseignant(e)) grâce à un code.
// Les données restent aussi sur l'appareil (localStorage) pour jouer hors connexion.

// Informations publiques du projet (la sécurité repose sur les règles RLS de supabase/schema.sql)
const SB_URL = 'https://ygebxzosjxzagumhkkek.supabase.co';
const SB_KEY = 'sb_publishable_oyis0FR_8YsY5BIdiPPw4w_y83yqn1K';
const sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'plume-auth' } }) : null;
let acctUser = null, acctTimer = null, acctSynced = null, acctBusy = false;

const acctName = u => (u && u.user_metadata && u.user_metadata.name) || (u && u.email ? u.email.split('@')[0] : '');
const ACCT_ERR = [
  [/invalid login/i, 'E-mail ou mot de passe incorrect.'],
  [/already registered|already exists/i, 'Un compte existe déjà avec cet e-mail : connectez-vous (c\'est peut-être votre compte LinguaPop).'],
  [/at least 6|password.*short|weak/i, 'Le mot de passe doit faire au moins 6 caractères.'],
  [/valid email|invalid.*email/i, "L'adresse e-mail n'est pas valide."],
  [/rate limit|too many/i, 'Trop d\'essais : patientez une minute.'],
  [/fetch|network/i, 'Pas de connexion internet.'],
  [/code inconnu/i, 'Ce code ne correspond à aucun enfant. Vérifiez-le avec le parent.'],
  [/propre compte/i, 'Ce code vient de votre propre compte : il sert à le donner à quelqu\'un d\'autre.'],
  [/accès refusé/i, 'Vous n\'avez plus accès à cet enfant (le parent a peut-être retiré le partage).'],
];
const acctErr = e => { const m = (e && e.message) || String(e); const f = ACCT_ERR.find(([r]) => r.test(m)); return f ? f[1] : m; };

// ---------- Synchronisation ----------
// Chaque modification locale date le profil (t) ; un programme modifié a sa propre date (prog.t).
const _saveLocal = save;
save = function () { const p = P(); if (p) p.t = Date.now(); _saveLocal(); acctSchedule(); };

function mergeProfile(a, b) {
  if (!a) return b; if (!b) return a;
  const base = JSON.parse(JSON.stringify((a.t || 0) >= (b.t || 0) ? a : b));
  // notes : on garde celles des deux côtés (un professionnel a pu en ajouter)
  const seen = new Set(), notes = [];
  [...(a.notes || []), ...(b.notes || [])].forEach(n => { const k = n.d + '|' + n.text; if (!seen.has(k)) { seen.add(k); notes.push(n); } });
  base.notes = notes.sort((x, y) => (x.d < y.d ? -1 : 1));
  const pa = a.prog || null, pb = b.prog || null;
  base.prog = !pa ? pb : !pb ? pa : ((pa.t || 0) >= (pb.t || 0) ? pa : pb);
  return base;
}
function acctMerge(remote) {
  const byId = new Map((remote.profiles || []).map(p => [p.id, p]));
  DB.profiles.forEach(lp => byId.set(lp.id, mergeProfile(lp, byId.get(lp.id))));
  const profiles = [...byId.values()].filter(p => !(remote.deleted || []).includes(p.id) && !(DB.deleted || []).includes(p.id));
  return { ...DB, profiles, current: profiles.some(p => p.id === DB.current) ? DB.current : (profiles[0] ? profiles[0].id : null),
    deleted: [...new Set([...(remote.deleted || []), ...(DB.deleted || [])])], owner: acctUser.id };
}
function acctSchedule() { if (!acctUser) return; clearTimeout(acctTimer); acctTimer = setTimeout(acctPush, 2000); }
// Lire → fusionner → écrire, pour ne pas écraser ce qu'un professionnel a ajouté entre-temps.
async function acctPush() {
  if (!acctUser || acctBusy) return;
  clearTimeout(acctTimer); acctBusy = true;
  try {
    const { data } = await sb.from('plume_data').select('data').eq('user_id', acctUser.id).maybeSingle();
    if (data && data.data && Array.isArray(data.data.profiles)) DB = acctMerge(data.data);
    _saveLocal();
    const { role, ...rest } = DB;
    const { error } = await sb.from('plume_data').upsert({ user_id: acctUser.id, data: rest, updated_at: new Date().toISOString() });
    if (!error) acctSynced = Date.now();
  } finally { acctBusy = false; }
}
async function acctLoad() {
  const { data, error } = await sb.from('plume_data').select('data').eq('user_id', acctUser.id).maybeSingle();
  if (error) { toast('⚠️ Sauvegarde en ligne indisponible pour le moment'); return; }
  // Données locales d'un autre compte (appareil partagé) : on ne les mélange pas
  if (DB.owner && DB.owner !== acctUser.id) DB = { profiles: [], current: null, role: DB.role };
  DB = data && data.data && Array.isArray(data.data.profiles) ? acctMerge(data.data) : Object.assign(DB, { owner: acctUser.id });
  const r = acctUser.user_metadata && acctUser.user_metadata.plume_role; if (r && !DB.role) DB.role = r;
  _saveLocal(); await acctPush();
}
async function acctStart() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  if (data && data.session) { acctUser = data.session.user; await acctLoad(); refreshScreen(); }
  sb.auth.onAuthStateChange((ev, session) => { acctUser = session ? session.user : null; });
  // Au retour sur l'appli (autre appareil utilisé entre-temps), on récupère les nouveautés.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && acctUser) acctPush(); });
}
// Redessine l'écran courant après la synchronisation (accueil ou espace adultes).
function refreshScreen() {
  if (document.querySelector('.home')) home();
  else if (!document.querySelector('.screen')) P() ? home() : profiles();
}

// ---------- Onglet « Compte » de l'espace adultes ----------
function compteHTML() {
  if (!sb) return '<p class="note">La sauvegarde en ligne n\'a pas pu se charger (pas de connexion ?). Réessayez plus tard.</p>';
  if (!acctUser) return `
    <div class="acct-intro">
      <p><b>Pourquoi un compte ?</b></p>
      <ul>
        <li>La progression est sauvegardée en ligne et suit l'enfant sur tous ses appareils.</li>
        <li>Un parent peut <b>partager un enfant</b> avec son orthophoniste ou son enseignant(e) grâce à un code.</li>
        <li>Les professionnels voient le bilan depuis chez eux, ajoutent des notes et adaptent le programme.</li>
      </ul>
      <p class="note">Les comptes sont réservés aux adultes : les enfants n'ont ni e-mail ni mot de passe. Si vous avez déjà un compte LinguaPop, il marche aussi ici.</p>
    </div>
    <div class="seg" data-mode><button class="on" data-v="login">Se connecter</button><button data-v="signup">Créer un compte</button></div>
    <div class="acct-form">
      <label class="field signup-only hidden">Votre prénom ou nom<input data-f="name" autocomplete="name"></label>
      <label class="field">E-mail<input data-f="email" type="email" autocomplete="email" inputmode="email"></label>
      <label class="field">Mot de passe (6 caractères minimum)<input data-f="pw" type="password" autocomplete="current-password"></label>
      <button class="btn" data-go>Se connecter</button>
      <p class="acct-msg" data-msg></p>
    </div>`;
  const kids = DB.profiles;
  return `
    <div class="acct-box">
      <p>☁️ Connecté(e) : <b>${esc(acctName(acctUser))}</b> <span class="note">(${esc(acctUser.email)})</span></p>
      <p class="note">${acctSynced ? `Dernière synchronisation à ${new Date(acctSynced).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.` : 'Synchronisation en cours…'}</p>
      <div class="b-actions"><button class="btn small" data-sync>🔄 Synchroniser</button><button class="btn small ghost" data-out>Se déconnecter</button></div>
    </div>

    <h3>📥 Suivre un enfant avec un code</h3>
    <p class="note">Pour les orthophonistes et enseignant(e)s : saisissez le code donné par le parent.</p>
    <div class="code-row"><input class="gate code" data-code maxlength="12" autocomplete="off" placeholder="EX. K7PM4Q"><button class="btn small" data-redeem>Ajouter</button></div>
    <p class="acct-msg" data-msg2></p>
    <div data-shared><p class="note">Chargement…</p></div>

    ${kids.length ? `<h3>🔗 Partager un enfant</h3>
    <p class="note">Créez un code et donnez-le au professionnel (par écrit, par SMS…). Vous pouvez retirer l'accès à tout moment.</p>
    <div data-sharing><p class="note">Chargement…</p></div>` : ''}

    <h3>🗑️ Données en ligne</h3>
    <p class="note">Efface la sauvegarde en ligne de Plume et les partages. Les données restent sur cet appareil. Votre compte (commun avec LinguaPop) n'est pas supprimé.</p>
    <button class="btn small ghost danger-t" data-wipe>Effacer mes données Plume en ligne</button>`;
}

function bindCompte() {
  if (!sb) return;
  if (!acctUser) {
    let mode = 'login';
    const msg = $('[data-msg]'), go = $('[data-go]');
    $$('[data-mode] button').forEach(b => b.onclick = () => {
      mode = b.dataset.v; $$('[data-mode] button').forEach(x => x.classList.toggle('on', x === b));
      $$('.signup-only').forEach(x => x.classList.toggle('hidden', mode !== 'signup'));
      go.textContent = mode === 'signup' ? 'Créer mon compte' : 'Se connecter'; msg.textContent = '';
    });
    go.onclick = async () => {
      const f = k => $(`[data-f="${k}"]`).value.trim();
      const email = f('email'), password = $('[data-f="pw"]').value;
      if (!email || !password) { msg.textContent = 'Remplissez l\'e-mail et le mot de passe.'; return; }
      go.disabled = true; msg.textContent = '…';
      try {
        const r = mode === 'signup'
          ? await sb.auth.signUp({ email, password, options: { data: { name: f('name') || email.split('@')[0], role: DB.role === 'parent' ? 'parent' : 'prof', plume_role: DB.role } } })
          : await sb.auth.signInWithPassword({ email, password });
        if (r.error) throw r.error;
        if (!r.data.session) { msg.textContent = 'Compte créé : connectez-vous maintenant.'; go.disabled = false; return; }
        acctUser = r.data.session.user;
        await acctLoad();
        toast('☁️ Connecté(e) : progression sauvegardée en ligne');
        adult('compte');
      } catch (e) { msg.textContent = acctErr(e); go.disabled = false; }
    };
    return;
  }
  $('[data-sync]').onclick = async () => { await acctPush(); toast('🔄 Synchronisé'); adult('compte'); };
  $('[data-out]').onclick = async () => { await acctPush(); await sb.auth.signOut(); acctUser = null; toast('Déconnecté(e)'); adult('compte'); };
  $('[data-wipe]').onclick = async () => {
    if (!confirm('Effacer la sauvegarde en ligne de Plume et tous les partages ? (Les données restent sur cet appareil.)')) return;
    await sb.from('plume_links').delete().eq('owner', acctUser.id);
    await sb.from('plume_shares').delete().eq('owner', acctUser.id);
    await sb.from('plume_data').delete().eq('user_id', acctUser.id);
    delete DB.owner; _saveLocal(); await sb.auth.signOut(); acctUser = null;
    toast('Données en ligne effacées'); adult('compte');
  };
  $('[data-redeem]').onclick = async () => {
    const m = $('[data-msg2]'), code = $('[data-code]').value.trim().toUpperCase();
    if (!code) return;
    const { error } = await sb.rpc('plume_redeem', { p_code: code });
    if (error) { m.textContent = acctErr(error); return; }
    m.textContent = '✓ Enfant ajouté.'; $('[data-code]').value = ''; loadShared();
  };
  loadShared(); loadSharing();
}

// Côté professionnel : la liste des enfants partagés.
let SHARED = [];
async function loadShared() {
  const box = $('[data-shared]'); if (!box) return;
  const { data, error } = await sb.rpc('plume_shared');
  if (error) { box.innerHTML = `<p class="note">${esc(acctErr(error))}</p>`; return; }
  SHARED = (data || []).filter(r => r.profile);
  box.innerHTML = SHARED.length ? `<div class="list">${SHARED.map((r, i) => `<button class="row" data-sh="${i}"><span class="r-e">${r.profile.avatar || '🧒'}</span><span class="r-t">${esc(r.profile.name)} <small>${esc(r.profile.level || '')} · partagé par ${esc(r.owner_name || '')}</small></span><span>›</span></button>`).join('')}</div>`
    : '<p class="note">Aucun enfant partagé avec vous pour le moment.</p>';
  $$('[data-sh]').forEach(b => b.onclick = () => sharedView(SHARED[+b.dataset.sh]));
}

// Côté parent : codes de partage et personnes qui ont accès.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => CODE_CHARS[b % CODE_CHARS.length]).join('');
async function loadSharing() {
  const box = $('[data-sharing]'); if (!box) return;
  const [{ data: codes }, { data: links }] = await Promise.all([
    sb.from('plume_shares').select('*').eq('owner', acctUser.id),
    sb.from('plume_links').select('*').eq('owner', acctUser.id),
  ]);
  box.innerHTML = DB.profiles.map(k => {
    const c = (codes || []).filter(x => x.profile_id === k.id), l = (links || []).filter(x => x.profile_id === k.id);
    return `<div class="share-card">
      <p><b>${k.avatar} ${esc(k.name)}</b></p>
      ${c.map(x => `<p class="code-show"><span class="rd">${esc(x.code)}</span> <button class="mini" data-cdel="${esc(x.code)}">Supprimer le code</button></p>`).join('') || `<button class="btn small" data-cnew="${k.id}">Créer un code de partage</button>`}
      ${l.length ? `<p class="note">Ont accès :</p><ul class="notes-list">${l.map(x => `<li>${esc(x.viewer_name || 'Professionnel')} <span class="note">${esc(ROLES[x.viewer_role] ? ROLES[x.viewer_role][1] : '')}</span> <button class="mini danger" data-ldel="${x.viewer}|${k.id}">Retirer l'accès</button></li>`).join('')}</ul>` : ''}
    </div>`;
  }).join('');
  $$('[data-cnew]').forEach(b => b.onclick = async () => {
    await acctPush();
    for (let t = 0; t < 5; t++) { const { error } = await sb.from('plume_shares').insert({ code: newCode(), owner: acctUser.id, profile_id: b.dataset.cnew }); if (!error) break; }
    loadSharing();
  });
  $$('[data-cdel]').forEach(b => b.onclick = async () => { await sb.from('plume_shares').delete().eq('code', b.dataset.cdel); loadSharing(); });
  $$('[data-ldel]').forEach(b => b.onclick = async () => {
    const [viewer, pid] = b.dataset.ldel.split('|');
    if (!confirm('Retirer l\'accès à cette personne ?')) return;
    await sb.from('plume_links').delete().match({ owner: acctUser.id, viewer, profile_id: pid }); loadSharing();
  });
}

// ---------- Vue d'un enfant partagé (professionnel) ----------
function sharedView(r, tab = 'bilan') {
  const p = r.profile;
  ['steps', 'twins', 'conj', 'math', 'stories', 'words', 'fluence', 'days', 'games', 'notes'].forEach(k => { if (p[k] == null) p[k] = k === 'fluence' || k === 'notes' ? [] : {}; });
  const patch = async (kind, value) => {
    const { error } = await sb.rpc('plume_patch_shared', { p_owner: r.owner, p_profile_id: r.profile_id, p_kind: kind, p_value: value });
    if (error) { toast('⚠️ ' + acctErr(error)); return false; }
    return true;
  };
  const tabs = [['bilan', '📊 Bilan'], ['programme', '🎯 Programme'], ['notes', '📝 Notes']];
  screen(`${topBar(`${p.name} (partagé)`, () => adult('compte'))}
    <p class="note no-print">Partagé par ${esc(r.owner_name || 'le parent')} · données du ${new Date(r.updated_at).toLocaleDateString('fr-FR')} ${new Date(r.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
    <div class="tabs scroll no-print">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    <div class="panel">${tab === 'bilan' ? bilanHTML(p) : tab === 'programme' ? programmeHTML(p, { shared: true }) : notesHTML(p, { shared: true })}</div>`, 'adult');
  $$('[data-t]').forEach(b => b.onclick = () => sharedView(r, b.dataset.t));
  if (tab === 'bilan') bindBilan(p);
  if (tab === 'programme') bindProgramme(p, { onChange: async () => { const y = window.scrollY; p.prog.t = Date.now(); if (await patch('prog', p.prog)) toast('✓ Programme mis à jour pour l\'enfant'); sharedView(r, 'programme'); window.scrollTo(0, y); } });
  if (tab === 'notes') bindNotes(p, { onAdd: async note => { if (await patch('note', note)) { p.notes.push(note); toast('✓ Note envoyée au parent'); } sharedView(r, 'notes'); } });
}

acctStart();
