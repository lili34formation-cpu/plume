'use strict';
// Plume — appli de lecture pour les enfants en difficulté (dyslexie, attention). Interface en français.

// ---------- Utilitaires ----------
const app = document.getElementById('app');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const $ = sel => app.querySelector(sel);
const $$ = sel => [...app.querySelectorAll(sel)];

// ---------- Contenu indexé ----------
const STEP_BY_ID = {};
const ALL_WORDS = [];
STEPS.forEach(st => {
  STEP_BY_ID[st.id] = st;
  st.W = st.words.map(([m, e]) => ({ m, e, p: plain(m), sy: m.split('-'), step: st }));
  st.S = st.sentences.map(([m, q, a]) => ({ m, q, a, step: st }));
  st.W.forEach(w => { if (!ALL_WORDS.some(o => o.p === w.p)) ALL_WORDS.push(w); });
});
const STORY_BY_ID = Object.fromEntries(STORIES.map(s => [s.id, s]));
const PAIR_BY_ID = Object.fromEntries(PAIRS.map(p => [p.id, p]));
const FRIENDS = [
  [0, '🦉', 'Plume'], [15, '🐤', 'Pioupiou'], [40, '🐦', 'Azur'], [70, '🦜', 'Coco'], [110, '🐧', 'Pingo'],
  [160, '🦆', 'Caramel'], [220, '🦢', 'Neige'], [290, '🦩', 'Rosie'], [370, '🦚', 'Paon-Paon'], [460, '🦅', 'Altaïr'], [560, '🕊️', 'Douce'],
];
const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🦄', '🐵', '🐨', '🐙', '🦁', '🐧', '🐰', '🐲', '🐻', '🐱', '🐶', '🦖'];

// ---------- Profils et sauvegarde (dans le navigateur) ----------
const STORE = 'plume-v1';
const DEFAULTS = { font: 'andika', size: 1, spacing: 1, syl: true, mute: true, focus: true, rate: 0.95, session: 10, flash: 1500, sound: true, calm: false };
let DB = loadDB();
function loadDB() {
  try { const d = JSON.parse(localStorage.getItem(STORE)); if (d && Array.isArray(d.profiles)) return d; } catch (e) { /* */ }
  return { profiles: [], current: null };
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) { /* */ } }
const P = () => DB.profiles.find(p => p.id === DB.current) || null;
const S = () => Object.assign({}, DEFAULTS, P() && P().settings);
function newProfile(name, avatar, level) {
  const p = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, avatar, level, plumes: 0, steps: {}, twins: {}, conj: {}, stories: {}, words: {}, fluence: [], days: {}, sessions: 0, games: {}, settings: {} };
  DB.profiles.push(p); DB.current = p.id; save(); return p;
}
function setSetting(k, v) { const p = P(); if (!p) return; p.settings[k] = v; save(); applySettings(); }

const FONTS = { andika: "'Andika', sans-serif", lexend: "'Lexend', sans-serif", atkinson: "'Atkinson Hyperlegible', sans-serif" };
function applySettings() {
  const s = S(), r = document.documentElement.style;
  r.setProperty('--rd-font', FONTS[s.font] || FONTS.andika);
  r.setProperty('--rd-size', [22, 26, 31, 37][s.size] + 'px');
  r.setProperty('--rd-ls', ['0.02em', '0.07em', '0.13em'][s.spacing]);
  r.setProperty('--rd-ws', ['0.15em', '0.35em', '0.6em'][s.spacing]);
  r.setProperty('--rd-lh', ['1.6', '1.9', '2.25'][s.spacing]);
  document.body.classList.toggle('syl-on', s.syl);
  document.body.classList.toggle('mute-on', s.mute);
  document.body.classList.toggle('calm', s.calm);
}

function track(ms) {
  const p = P(); if (!p) return;
  const k = dayKey();
  p.days[k] = (p.days[k] || 0) + Math.round(Math.min(ms, 60000) / 1000);
}
function stat(word, ok) {
  const p = P(); if (!p || !word) return;
  const w = p.words[word] || (p.words[word] = { ok: 0, ko: 0 });
  ok ? w.ok++ : w.ko++;
}

// ---------- Voix ----------
// Voix enregistrées dans audio/ (même clé que tools/generate_audio.py), sinon la voix de l'appareil.
let AUDIO_INDEX = null;
fetch('audio/index.json').then(r => (r.ok ? r.json() : [])).then(l => { AUDIO_INDEX = new Set(l); }).catch(() => { AUDIO_INDEX = new Set(); });
function audioKey(text) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode('fr-FR|' + text.trim())) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
let frVoice = null;
function loadVoices() {
  try { const v = speechSynthesis.getVoices() || []; frVoice = v.find(x => /fr[-_]FR/i.test(x.lang)) || v.find(x => /^fr/i.test(x.lang)) || null; } catch (e) { /* */ }
}
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
const player = new Audio();
let speakEnd = null;
function stopSpeak() {
  try { player.onended = player.onerror = null; player.pause(); } catch (e) { /* */ }
  try { speechSynthesis.cancel(); } catch (e) { /* */ }
  if (speakEnd) { const f = speakEnd; speakEnd = null; f(false); }
}
// Renvoie une promesse : true si la phrase a été dite jusqu'au bout, false si elle a été coupée.
function speak(text) {
  stopSpeak();
  return new Promise(resolve => {
    let done = false;
    const end = ok => { if (done) return; done = true; if (speakEnd === end) speakEnd = null; resolve(ok); };
    speakEnd = end;
    const key = audioKey(text);
    if (AUDIO_INDEX && AUDIO_INDEX.has(key)) {
      player.src = `audio/${key}.mp3`;
      player.playbackRate = S().rate;
      player.preservesPitch = true;
      player.onended = () => end(true);
      player.onerror = () => { if (!done) tts(text, end); };
      player.play().catch(() => { if (!done) tts(text, end); });
    } else tts(text, end);
  });
}
function tts(text, end) {
  if (!('speechSynthesis' in window)) { setTimeout(() => end(true), 400); return; }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; if (frVoice) u.voice = frVoice;
    u.rate = 0.85 * S().rate;
    u.onend = () => end(true); u.onerror = () => end(true);
    speechSynthesis.speak(u);
  } catch (e) { end(true); }
}
async function sayAll(list) { for (const t of list) if (!(await speak(t))) return false; return true; }

let actx = null;
function beep(kind) {
  if (!S().sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok: [660, 880], ko: [247], win: [523, 659, 784, 1046], tap: [520], pad0: [392], pad1: [494], pad2: [587], pad3: [698] }[kind] || [440];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.11;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.32);
    });
  } catch (e) { /* */ }
}

// ---------- Affichage du texte (syllabes en couleur, lettres muettes en gris) ----------
function sylHTML(markup, counter = { n: 0 }) {
  return markup.split('-').map(s => {
    let h = '';
    s.replace(/\(([^)]*)\)|([^()]+)/g, (_, mu, t) => { h += mu != null ? `<span class="mu">${esc(mu)}</span>` : esc(t); return ''; });
    return `<span class="sy s${counter.n++ % 2}">${h}</span>`;
  }).join('');
}
function textHTML(markup, raw) {
  const c = { n: 0 };
  return markup.split(' ').map(tok => {
    const { pre, core, post } = splitTok(tok);
    if (!core) return esc(tok);
    const inner = raw ? `<span class="sy s${c.n++ % 2}">${esc(core)}</span>` : sylHTML(core, c);
    return `${esc(pre)}<span class="w" data-say="${esc(plain(core, raw))}">${inner}</span>${esc(post)}`;
  }).join(' ');
}
function hlHTML(word, g) {
  const re = new RegExp('(' + g.slice().sort((a, b) => b.length - a.length).join('|') + ')', 'gi');
  return esc(word).replace(re, '<b class="hl">$1</b>');
}
// Toucher un mot dans une phrase le fait lire.
app.addEventListener('click', e => {
  const w = e.target.closest('.tap .w');
  if (!w) return;
  w.classList.remove('said'); void w.offsetWidth; w.classList.add('said');
  speak(w.dataset.say);
});

function stars(n, max = 3) { return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(Math.max(0, max - n))}</span></span>`; }
function topBar(title, back = home) {
  setTimeout(() => { const b = $('[data-back]'); if (b) b.onclick = () => { stopSpeak(); back(); }; });
  return `<div class="topbar"><button class="icon-btn" data-back aria-label="Retour">←</button><h1>${esc(title)}</h1><div class="pl">🪶 ${P() ? P().plumes : 0}</div></div>`;
}
function screen(html, cls = '') { stopSpeak(); app.innerHTML = `<div class="screen ${cls}">${html}</div>`; window.scrollTo(0, 0); }

// ---------- Profils ----------
function profiles() {
  if (!DB.profiles.length) return createProfile(true);
  screen(`
    <div class="center-col">
      <div class="logo">🦉</div>
      <h1 class="title">Qui lit aujourd'hui ?</h1>
      <div class="kids">${DB.profiles.map(p => `<button class="kid" data-id="${p.id}"><span>${p.avatar}</span>${esc(p.name)}</button>`).join('')}
        <button class="kid add" data-add><span>＋</span>Ajouter</button></div>
    </div>`);
  $$('.kid[data-id]').forEach(b => b.onclick = () => { DB.current = b.dataset.id; save(); applySettings(); home(); });
  $('[data-add]').onclick = () => createProfile(false);
}
function createProfile(first) {
  let av = AVATARS[0], lv = 'CE2';
  screen(`
    ${first ? '' : topBar('Nouvel enfant', profiles)}
    <div class="center-col">
      ${first ? `<div class="logo">🦉</div><h1 class="title">Bienvenue !</h1><p class="lead">Je suis Plume. Je vais t'aider à lire, un petit peu chaque jour.</p>` : ''}
      <label class="field">Prénom de l'enfant<input id="nm" maxlength="20" autocomplete="off" placeholder="Prénom"></label>
      <p class="label">En quelle classe ?</p>
      <div class="seg lv">${LEVELS.map(l => `<button class="${l === 'CE2' ? 'on' : ''}" data-lv="${l}">${l}</button>`).join('')}</div>
      <p class="label">Choisis ton animal</p>
      <div class="avatars">${AVATARS.map((a, i) => `<button class="av ${i ? '' : 'sel'}" data-a="${a}">${a}</button>`).join('')}</div>
      <button class="btn" id="ok">C'est parti ! ➜</button>
    </div>`);
  $$('[data-lv]').forEach(b => b.onclick = () => { $$('[data-lv]').forEach(x => x.classList.toggle('on', x === b)); lv = b.dataset.lv; });
  $$('.av').forEach(b => b.onclick = () => { $$('.av').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); av = b.dataset.a; });
  $('#ok').onclick = () => {
    const name = $('#nm').value.trim();
    if (!name) { $('#nm').focus(); $('#nm').classList.add('shake'); return; }
    newProfile(name, av, lv); applySettings(); home();
  };
}

// ---------- Accueil ----------
function nextStep() { const p = P(); return STEPS.find(s => !p.steps[s.id]) || null; }
function doneSteps() { const p = P(); return STEPS.filter(s => p.steps[s.id]); }
function friend(pl) { return FRIENDS.filter(f => pl >= f[0]).pop(); }

function home() {
  const p = P(); if (!p) return profiles();
  const nx = nextStep();
  const mins = Math.round((p.days[dayKey()] || 0) / 60);
  screen(`
    <div class="home-top">
      <button class="who" data-switch><span>${p.avatar}</span>${esc(p.name)}</button>
      <div class="pl">🪶 ${p.plumes}</div>
      <button class="icon-btn" data-adult aria-label="Espace adulte">⚙️</button>
    </div>
    <div class="hero">
      <button class="owl" data-owl>🦉</button>
      <div class="bubble">Coucou ${esc(p.name)} !<br>${mins ? `Tu as déjà lu ${mins} min aujourd'hui. Bravo !` : 'On lit ensemble ?'}</div>
    </div>
    <button class="mission" data-mission>
      <span class="m-play">▶</span>
      <span><b>Ma séance du jour</b><small>${nx ? `Le son <span class="rd">${esc(nx.title)}</span>` : 'Révision des sons'}</small></span>
    </button>
    <div class="tiles">
      <button class="tile t1" data-go="path"><span>🗺️</span>Le chemin des sons</button>
      <button class="tile t2" data-go="stories"><span>📚</span>Les histoires</button>
      <button class="tile t3" data-go="twins"><span>👯</span>Les lettres jumelles</button>
      <button class="tile t4" data-go="attention"><span>🎯</span>Jeux d'attention</button>
      <button class="tile t5" data-go="conj"><span>✏️</span>Les verbes</button>
      <button class="tile t6" data-go="maths"><span>🔢</span>Les problèmes</button>
    </div>
    <button class="nest-link" data-go="nest">🪺 Le nid de Plume : ${FRIENDS.filter(f => p.plumes >= f[0]).length} ami(s)</button>
  `, 'home');
  $('[data-owl]').onclick = e => { e.currentTarget.classList.remove('hop'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('hop'); speak(VOICE.hello); };
  $('[data-switch]').onclick = profiles;
  $('[data-adult]').onclick = () => adultGate(adult);
  $('[data-mission]').onclick = () => (nx ? startStep(nx) : startReview());
  $$('[data-go]').forEach(b => b.onclick = () => ({ path, stories, twins, attention, nest, conj: conjList, maths: mathList })[b.dataset.go]());
}

// ---------- Chemin des sons ----------
function path() {
  const p = P(), nx = nextStep(), done = doneSteps();
  screen(`${topBar('Le chemin des sons')}
    ${done.length >= 2 ? `<button class="review" data-review>🔁 Révision : les mots déjà vus</button>` : ''}
    ${WORLDS.map(w => `
      <section class="world" style="--wc:${w.color}">
        <h2>${w.e} ${esc(w.name)}</h2>
        <div class="steps">${STEPS.filter(s => s.world === w.id).map(s => `
          <button class="step ${p.steps[s.id] ? 'done' : ''} ${nx === s ? 'next' : ''}" data-s="${s.id}">
            <span class="rd g">${esc(s.title)}</span>${p.steps[s.id] ? stars(p.steps[s.id]) : nx === s ? '<span class="nxt">À toi !</span>' : '<span class="stars"><span class="off">★★★</span></span>'}
          </button>`).join('')}</div>
      </section>`).join('')}`);
  $$('[data-s]').forEach(b => b.onclick = () => startStep(STEP_BY_ID[b.dataset.s]));
  const r = $('[data-review]'); if (r) r.onclick = startReview;
}

function others(list, n, notSame) { return shuffle(list.filter(x => !notSame(x))).slice(0, n); }
function emojiOptions(w, pool) {
  const opts = [w.e]; for (const o of shuffle(pool)) if (!opts.includes(o.e)) { opts.push(o.e); if (opts.length === 3) break; }
  return shuffle(opts);
}
function wordOptions(w, pool) {
  const opts = [w]; for (const o of shuffle(pool)) if (!opts.some(x => x.p === o.p)) { opts.push(o); if (opts.length === 3) break; }
  return shuffle(opts);
}
function distractorSyl(w) {
  const pool = shuffle([...w.step.W.flatMap(o => o.sy), ...(w.step.syl || [])]).filter(s => !w.sy.includes(s) && plain(s).length <= 5);
  return pool[0] || 'ma';
}
function wordItems(w, types) {
  const pool = w.step.W.filter(o => o.p !== w.p);
  return types.map(t => {
    if (t === 'word') return { type: 'word', w, options: emojiOptions(w, pool) };
    if (t === 'build') return { type: 'build', w, tiles: shuffle([...w.sy, distractorSyl(w)]) };
    return { type: 'flash', w, options: wordOptions(w, pool) };
  });
}

function stepItems(st) {
  const items = [{ type: 'intro', step: st }];
  const noPool = st.x ? ALL_WORDS.filter(w => !st.x.test(w.p.toLowerCase())) : [];
  const ear = !st.ear ? [] : shuffle([...shuffle(st.W).slice(0, 2).map(w => ({ w, yes: true })), ...shuffle(noPool).slice(0, 2).map(w => ({ w, yes: false }))]);
  ear.forEach((e, i) => items.push({ type: 'ear', step: st, w: e.w, yes: e.yes, first: i === 0 }));
  if (st.syl) shuffle(st.syl).slice(0, 3).forEach((s, i) => items.push({ type: 'syl', target: s, options: shuffle([s, ...others(st.syl, 2, x => x === s)]), first: i === 0 }));
  const ws = shuffle(st.W);
  ws.slice(0, 4).forEach((w, i) => items.push({ ...wordItems(w, ['word'])[0], first: i === 0 }));
  ws.filter(w => w.sy.length >= 2).slice(0, 2).forEach((w, i) => items.push({ ...wordItems(w, ['build'])[0], first: i === 0 }));
  shuffle(st.W).slice(0, 3).forEach((w, i) => items.push({ ...wordItems(w, ['flash'])[0], first: i === 0 }));
  st.S.forEach((s, i) => items.push({ type: 'sentence', s, first: i === 0 }));
  return items;
}
function startStep(st) {
  runSession({ items: stepItems(st), onEnd: (stars, early) => { if (!early) { const p = P(); p.steps[st.id] = Math.max(p.steps[st.id] || 0, stars); } } });
}
function startReview() {
  const p = P();
  let done = doneSteps(); if (!done.length) done = STEPS.slice(0, 2);
  const words = done.flatMap(s => s.W);
  const score = w => { const s = p.words[w.p]; return s ? s.ko * 2 - s.ok : 0.5; };
  const hard = words.slice().sort((a, b) => score(b) - score(a) || Math.random() - 0.5).slice(0, 5);
  const rest = shuffle(words.filter(w => !hard.includes(w)));
  const pool = shuffle([...hard, ...rest]);
  const items = [];
  pool.slice(0, 4).forEach((w, i) => items.push({ ...wordItems(w, ['word'])[0], first: i === 0 }));
  pool.filter(w => w.sy.length >= 2).slice(4, 6).forEach((w, i) => items.push({ ...wordItems(w, ['build'])[0], first: i === 0 }));
  pool.slice(6, 9).forEach((w, i) => items.push({ ...wordItems(w, ['flash'])[0], first: i === 0 }));
  shuffle(done.flatMap(s => s.S)).slice(0, 2).forEach((s, i) => items.push({ type: 'sentence', s, first: i === 0 }));
  runSession({ items });
}

// ---------- Séance : une consigne, une tâche à la fois ----------
function runSession(cfg) {
  const st = { i: 0, good: 0, answered: 0, start: Date.now(), last: Date.now(), paused: false };
  const view = () => {
    if (st.i >= cfg.items.length) return finish(false);
    const pauseAfter = S().session * 60000;
    if (!st.paused && Date.now() - st.start > pauseAfter && cfg.items.length - st.i > 2) {
      st.paused = true;
      return pauseScreen(view, () => finish(true));
    }
    const it = cfg.items[st.i];
    screen(`
      <div class="sess-top">
        <button class="icon-btn" data-quit aria-label="Arrêter">✕</button>
        <div class="bar"><i style="width:${Math.round(st.i / cfg.items.length * 100)}%"></i></div>
        <div class="pl">🪶 ${P().plumes + st.good}</div>
      </div>
      <div class="ex" id="ex"></div>`, 'sess');
    $('[data-quit]').onclick = () => { stopSpeak(); (cfg.onQuit || home)(); };
    let misses = 0, helped = false, settled = false;
    const api = {
      get first() { return misses === 0 && !helped; },
      get misses() { return misses; },
      miss() { misses++; },
      help() { helped = true; },
      async next(counted = true, wait) {
        if (settled) return; settled = true;
        if (counted) { st.answered++; if (misses === 0 && !helped) st.good++; }
        track(Date.now() - st.last); st.last = Date.now(); save();
        if (wait) await wait; else await new Promise(r => setTimeout(r, 500));
        st.i++; view();
      },
    };
    EX[it.type]($('#ex'), it, api);
  };
  const finish = early => {
    const p = P();
    const ratio = st.answered ? st.good / st.answered : 0;
    const n = ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : 1;
    const before = friend(p.plumes);
    p.plumes += st.good; p.sessions++;
    if (cfg.onEnd) cfg.onEnd(n, early);
    save();
    const after = friend(p.plumes);
    screen(`
      <div class="center-col end">
        <div class="big-emoji ${S().calm ? '' : 'pop'}">${early ? '🌙' : '🎉'}</div>
        <h1 class="title">${early ? 'Bien joué, à demain !' : 'Séance terminée !'}</h1>
        ${early ? '' : `<div class="end-stars">${stars(n)}</div>`}
        <p class="lead">Tu as gagné <b>${st.good} plume${st.good > 1 ? 's' : ''}</b> 🪶</p>
        ${after !== before ? `<div class="new-friend"><span>${after[1]}</span>Un nouvel ami arrive dans le nid : <b>${esc(after[2])}</b> !</div>` : ''}
        <button class="btn" data-home>Retour à l'accueil</button>
      </div>`);
    if (!early) { beep('win'); speak(VOICE.end); }
    $('[data-home]').onclick = cfg.onQuit || home;
  };
  view();
}

// Réponse à une question à choix : bonne réponse → on passe ; erreur → on réessaie, avec un indice après 2 erreurs.
async function answer(btn, ok, api, { all, correct, word } = {}) {
  if (ok) {
    btn.classList.add('ok'); (all || []).forEach(b => { b.disabled = true; });
    beep('ok');
    if (word) stat(word, api.first);
    api.next(true, api.first ? speak(pick(CHEERS)) : speak('Oui, c\'est ça !'));
  } else {
    btn.classList.add('ko'); btn.disabled = true; beep('ko'); api.miss();
    if (api.misses >= 2 && correct) correct.classList.add('hint');
    speak(pick(OOPS));
  }
}
const playBtn = (label = '🔊', cls = '') => `<button class="play ${cls}" data-play aria-label="Écouter">${label}</button>`;

const EX = {
  intro(box, it, api) {
    const s = it.step;
    box.innerHTML = `
      <div class="intro">
        <button class="big-graph rd" data-play>${esc(s.title)}</button>
        <p class="inst">Touche les images pour écouter.</p>
        <div class="ex-words">${s.W.slice(0, 3).map(w => `<button class="ex-word" data-w="${esc(w.p)}"><span class="emo">${w.e}</span><span class="rd">${hlHTML(w.p, s.g)}</span></button>`).join('')}</div>
        <button class="btn go">C'est parti ! ➜</button>
      </div>`;
    box.querySelector('[data-play]').onclick = () => speak(s.say);
    box.querySelectorAll('.ex-word').forEach(b => b.onclick = () => speak(b.dataset.w));
    box.querySelector('.go').onclick = () => api.next(false, Promise.resolve());
    speak(s.say);
  },

  ear(box, it, api) {
    box.innerHTML = `
      <p class="inst">${esc(earSay(it.step))}</p>
      <button class="pic" data-play><span>${it.w.e}</span><small>🔊</small></button>
      <div class="reveal rd"></div>
      <div class="yn"><button class="btn yes" data-v="1">👂 Oui</button><button class="btn no" data-v="0">✋ Non</button></div>`;
    const play = async () => { if (it.first && !(await speak(earSay(it.step)))) return; speak(it.w.p); };
    box.querySelector('[data-play]').onclick = () => speak(it.w.p);
    const all = [...box.querySelectorAll('.yn .btn')];
    all.forEach(b => b.onclick = () => {
      const ok = (b.dataset.v === '1') === it.yes;
      if (ok) box.querySelector('.reveal').innerHTML = it.yes ? hlHTML(it.w.p, it.step.g) : esc(it.w.p);
      answer(b, ok, api, { all, correct: all.find(x => (x.dataset.v === '1') === it.yes) });
    });
    play();
  },

  syl(box, it, api) {
    box.innerHTML = `
      <p class="inst">${esc(VOICE.listenChoose)}</p>
      ${playBtn('🔊', 'big')}
      <div class="opts">${it.options.map(o => `<button class="card rd" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    const play = async () => { if (it.first && !(await speak(VOICE.listenChoose))) return; speak(it.target); };
    box.querySelector('[data-play]').onclick = () => speak(it.target);
    const all = [...box.querySelectorAll('.card')];
    all.forEach(b => b.onclick = () => answer(b, b.dataset.o === it.target, api, { all, correct: all.find(x => x.dataset.o === it.target) }));
    play();
  },

  word(box, it, api) {
    box.innerHTML = `
      <p class="inst">${esc(VOICE.readWord)}</p>
      <div class="word-big rd">${sylHTML(it.w.m)}</div>
      <div class="opts emo">${it.options.map(e => `<button class="card emo" data-o="${e}">${e}</button>`).join('')}</div>
      <button class="helper" data-help>🔊 Écouter le mot</button>`;
    if (it.first) speak(VOICE.readWord);
    box.querySelector('[data-help]').onclick = () => { api.help(); speak(it.w.p); };
    const all = [...box.querySelectorAll('.card')];
    all.forEach(b => b.onclick = () => answer(b, b.dataset.o === it.w.e, api, { all, correct: all.find(x => x.dataset.o === it.w.e), word: it.w.p }));
  },

  build(box, it, api) {
    const w = it.w;
    box.innerHTML = `
      <p class="inst">${esc(VOICE.build)}</p>
      <button class="pic small" data-play><span>${w.e}</span><small>🔊</small></button>
      <div class="slots rd">${w.sy.map(() => '<span class="slot"></span>').join('')}</div>
      <div class="tiles-row">${it.tiles.map((t, i) => `<button class="tile-syl rd" data-i="${i}">${sylHTML(t, { n: 0 })}</button>`).join('')}</div>`;
    const play = async () => { if (it.first && !(await speak(VOICE.build))) return; speak(w.p); };
    box.querySelector('[data-play]').onclick = () => speak(w.p);
    const slots = [...box.querySelectorAll('.slot')];
    let pos = 0;
    box.querySelectorAll('.tile-syl').forEach(b => b.onclick = () => {
      const t = it.tiles[+b.dataset.i];
      if (t === w.sy[pos]) {
        beep('tap');
        slots[pos].innerHTML = sylHTML(t, { n: pos }); slots[pos].classList.add('filled');
        b.classList.add('used'); b.disabled = true; pos++;
        box.querySelectorAll('.tile-syl.hint').forEach(x => x.classList.remove('hint'));
        if (pos === w.sy.length) {
          beep('ok'); stat(w.p, api.first);
          box.querySelector('.slots').classList.add('ok');
          speak(w.p).then(() => api.next(true, api.first ? speak(pick(CHEERS)) : Promise.resolve()));
        }
      } else {
        b.classList.remove('ko'); void b.offsetWidth; b.classList.add('ko'); beep('ko'); api.miss();
        if (api.misses >= 2) { const good = [...box.querySelectorAll('.tile-syl:not(.used)')].find(x => it.tiles[+x.dataset.i] === w.sy[pos]); if (good) good.classList.add('hint'); }
      }
    });
    play();
  },

  flash(box, it, api) {
    box.innerHTML = `
      <p class="inst">${esc(VOICE.flash)}</p>
      <div class="flash-zone"><button class="btn ready">👀 Je suis prêt !</button></div>
      <div class="opts col hidden">${it.options.map(o => `<button class="card rd wide" data-o="${esc(o.p)}">${sylHTML(o.m)}</button>`).join('')}</div>`;
    if (it.first) speak(VOICE.flash);
    const zone = box.querySelector('.flash-zone'), opts = box.querySelector('.opts');
    const show = () => {
      stopSpeak();
      zone.innerHTML = `<div class="word-big rd flashed">${sylHTML(it.w.m)}</div>`;
      setTimeout(() => {
        zone.innerHTML = `<p class="inst">${esc(VOICE.flashQ)}</p><button class="helper" data-again>↺ Revoir le mot</button>`;
        zone.querySelector('[data-again]').onclick = () => { api.help(); show(); };
        opts.classList.remove('hidden');
        speak(VOICE.flashQ);
      }, S().flash);
    };
    zone.querySelector('.ready').onclick = show;
    const all = [...opts.querySelectorAll('.card')];
    all.forEach(b => b.onclick = () => answer(b, b.dataset.o === it.w.p, api, { all, correct: all.find(x => x.dataset.o === it.w.p), word: it.w.p }));
  },

  sentence(box, it, api) {
    const s = it.s;
    box.innerHTML = `
      <p class="inst">${esc(VOICE.sentence)}</p>
      <div class="sent rd tap">${textHTML(s.m)}</div>
      <button class="helper" data-help>🔊 Écouter la phrase</button>
      <p class="q">${esc(s.q)} <button class="mini" data-q aria-label="Écouter la question">🔊</button></p>
      <div class="opts emo">${shuffle(s.a).map(e => `<button class="card emo" data-o="${e}">${e}</button>`).join('')}</div>`;
    if (it.first) speak(VOICE.sentence);
    box.querySelector('[data-help]').onclick = () => { api.help(); speak(plain(s.m)); };
    box.querySelector('[data-q]').onclick = () => speak(s.q);
    const all = [...box.querySelectorAll('.card')];
    all.forEach(b => b.onclick = () => answer(b, b.dataset.o === s.a[0], api, { all, correct: all.find(x => x.dataset.o === s.a[0]) }));
  },

  twin(box, it, api) {
    box.innerHTML = `
      <p class="inst">${esc(VOICE.twins)}</p>
      ${playBtn('🔊', 'big')}
      <div class="opts two">${shuffle(it.pair).map(o => `<button class="card rd xl" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    const play = async () => { if (it.first && !(await speak(VOICE.twins))) return; speak(it.target); };
    box.querySelector('[data-play]').onclick = () => speak(it.target);
    const all = [...box.querySelectorAll('.card')];
    all.forEach(b => b.onclick = () => answer(b, b.dataset.o === it.target, api, { all, correct: all.find(x => x.dataset.o === it.target) }));
    play();
  },

  storyq(box, it, api) {
    const txt = /[a-zà-ü]/i.test(it.a[0]);
    box.innerHTML = `
      <p class="inst">${esc(VOICE.storyQ)}</p>
      <p class="q big rd">${esc(it.q)} <button class="mini" data-q aria-label="Écouter la question">🔊</button></p>
      <div class="opts ${txt ? 'col' : 'emo'}">${shuffle(it.a).map(e => `<button class="card ${txt ? 'txt rd' : 'emo'}" data-o="${esc(e)}">${esc(e)}${txt ? `<span class="mini" data-say-o="${esc(e)}">🔊</span>` : ''}</button>`).join('')}</div>`;
    box.querySelectorAll('[data-say-o]').forEach(b => b.onclick = e => { e.stopPropagation(); speak(b.dataset.sayO); });
    const play = async () => { if (it.first && !(await speak(VOICE.storyQ))) return; speak(it.q); };
    box.querySelector('[data-q]').onclick = () => speak(it.q);
    const all = [...box.querySelectorAll('.card')];
    all.forEach(b => b.onclick = () => answer(b, b.dataset.o === it.a[0], api, { all, correct: all.find(x => x.dataset.o === it.a[0]) }));
    play();
  },
};

// ---------- Pause et respiration ----------
function breatheHTML() { return `<div class="breathe"><div class="bubble-b"></div><p class="b-txt">Prêt ?</p></div>`; }
function runBreath(cycles, onEnd) {
  const ball = $('.bubble-b'), txt = $('.b-txt');
  let n = 0, alive = true;
  const stepB = async () => {
    if (!alive || !ball || !document.body.contains(ball)) return;
    if (n >= cycles * 2) { txt.textContent = 'Bravo, tu es tout calme.'; if (onEnd) onEnd(); return; }
    const inhale = n % 2 === 0;
    ball.classList.toggle('in', inhale);
    txt.textContent = inhale ? 'Inspire…' : 'Expire…';
    if (n < 4) speak(inhale ? VOICE.breatheIn : VOICE.breatheOut);
    n++;
    setTimeout(stepB, 4000);
  };
  setTimeout(stepB, 600);
  return () => { alive = false; };
}
function pauseScreen(onContinue, onStop) {
  screen(`
    <div class="center-col">
      <h1 class="title">Petite pause</h1>
      <p class="lead">Tu travailles bien ! On respire un peu avec Plume.</p>
      ${breatheHTML()}
      <button class="btn" data-c>Je continue ➜</button>
      <button class="btn ghost" data-s>J'arrête pour aujourd'hui</button>
    </div>`);
  speak(VOICE.pause).then(ok => { if (ok) stop = runBreath(3); });
  let stop = () => {};
  $('[data-c]').onclick = () => { stop(); onContinue(); };
  $('[data-s]').onclick = () => { stop(); onStop(); };
}

// ---------- Histoires (lecture à voix haute) ----------
function stories() {
  const p = P();
  screen(`${topBar('Les histoires')}
    <p class="lead small">Lis l'histoire ligne par ligne. Tu peux toucher un mot pour l'entendre.</p>
    ${LEVELS.filter(l => STORIES.some(s => s.level === l)).map(l => `<h2 class="lvl">${l}${l === p.level ? ' <small>ta classe</small>' : ''}</h2>
    <div class="list">${STORIES.filter(s => s.level === l).map(s => `<button class="row" data-st="${s.id}"><span class="r-e">${s.e}</span><span class="r-t">${esc(s.title)}</span>${p.stories[s.id] ? '<span class="ok-badge">✓</span>' : ''}</button>`).join('')}</div>`).join('')}`);
  $$('[data-st]').forEach(b => b.onclick = () => story(STORY_BY_ID[b.dataset.st]));
}
function story(sto) {
  const focus = S().focus;
  let cur = 0, chrono = null, reading = false;
  screen(`${topBar(sto.title, stories)}
    <div class="story rd tap ${focus ? 'focus' : ''}">${sto.lines.map((l, i) => `<p class="line" data-l="${i}">${textHTML(l, sto.raw)}</p>`).join('')}</div>
    <div class="story-ctl">
      ${focus ? '<button class="icon-btn" data-prev aria-label="Ligne précédente">▲</button><button class="icon-btn" data-next aria-label="Ligne suivante">▼</button>' : ''}
      <button class="btn small" data-line>🔊 Cette ligne</button>
      <button class="btn small alt" data-all>🦉 Écouter l'histoire</button>
    </div>
    <div class="chrono-box">
      <button class="btn small ghost" data-chrono>⏱️ Chrono (adulte)</button>
      <span class="chrono-t"></span>
    </div>
    <button class="btn" data-qs>J'ai fini, aux questions ! ➜</button>`, 'story-screen');
  const lines = $$('.line');
  const setCur = i => {
    cur = Math.max(0, Math.min(lines.length - 1, i));
    lines.forEach((l, k) => l.classList.toggle('cur', k === cur));
    if (focus) lines[cur].scrollIntoView({ block: 'center', behavior: S().calm ? 'auto' : 'smooth' });
  };
  setCur(0);
  lines.forEach((l, i) => l.addEventListener('click', () => { if (focus) setCur(i); }));
  if (focus) { $('[data-prev]').onclick = () => setCur(cur - 1); $('[data-next]').onclick = () => setCur(cur + 1); }
  $('[data-line]').onclick = () => speak(plain(sto.lines[cur], sto.raw));
  $('[data-all]').onclick = async () => {
    if (reading) { reading = false; stopSpeak(); return; }
    reading = true;
    for (let i = 0; i < lines.length && reading; i++) { setCur(i); if (!(await speak(plain(sto.lines[i], sto.raw)))) break; }
    reading = false;
  };
  const tEl = $('.chrono-t');
  $('[data-chrono]').onclick = e => {
    const b = e.currentTarget;
    if (!chrono) {
      stopSpeak(); setCur(0);
      chrono = { start: Date.now(), timer: setInterval(() => { if (!document.body.contains(tEl)) return clearInterval(chrono.timer); tEl.textContent = Math.round((Date.now() - chrono.start) / 1000) + ' s'; }, 250) };
      b.textContent = '⏹️ Fini !'; b.classList.add('rec');
    } else {
      clearInterval(chrono.timer);
      const sec = Math.max(1, (Date.now() - chrono.start) / 1000);
      chrono = null; b.textContent = '⏱️ Chrono (adulte)'; b.classList.remove('rec');
      if (sec < 8) { tEl.textContent = "Trop court : relancez le chrono quand l'enfant commence à lire."; return; }
      fluenceForm(sto, sec, tEl);
    }
  };
  $('[data-qs]').onclick = () => {
    const p = P(); p.stories[sto.id] = (p.stories[sto.id] || 0) + 1; track(60000); save();
    runSession({ items: sto.questions.map(([q, a], i) => ({ type: 'storyq', q, a, first: i === 0 })), onQuit: stories });
  };
}
const wordCount = lines => lines.join(' ').split(' ').filter(t => /[a-zàâçéèêëîïôûùüœ]/i.test(t)).length;
function fluenceForm(sto, sec, el) {
  let errs = 0;
  const words = wordCount(sto.lines);
  el.innerHTML = `<span class="ff">${Math.round(sec)} s · erreurs :
    <button class="mini" data-m>−</button><b data-n>0</b><button class="mini" data-p>＋</button>
    <button class="btn small" data-save>Enregistrer</button></span>`;
  const n = el.querySelector('[data-n]');
  el.querySelector('[data-m]').onclick = () => { errs = Math.max(0, errs - 1); n.textContent = errs; };
  el.querySelector('[data-p]').onclick = () => { errs = Math.min(words, errs + 1); n.textContent = errs; };
  el.querySelector('[data-save]').onclick = () => {
    const wpm = Math.round((words - errs) / (sec / 60));
    P().fluence.push({ d: dayKey(), story: sto.id, sec: Math.round(sec), words, errs, wpm });
    track(sec * 1000); save();
    el.innerHTML = `<b>${wpm}</b> mots lus correctement par minute. Enregistré ✓`;
  };
}

// ---------- Lettres jumelles ----------
function twins() {
  const p = P();
  screen(`${topBar('Les lettres jumelles')}
    <p class="lead small">Des sons qui se ressemblent beaucoup. Écoute bien pour ne pas les confondre !</p>
    <div class="pairs">${PAIRS.map(pr => `<button class="pair" data-p="${pr.id}"><span class="rd">${esc(pr.a)} · ${esc(pr.b)}</span>${stars(p.twins[pr.id] || 0)}</button>`).join('')}</div>`);
  $$('[data-p]').forEach(b => b.onclick = () => {
    const pr = PAIR_BY_ID[b.dataset.p];
    const syls = pairSyllables(pr);
    const items = Array.from({ length: 10 }, (_, i) => { const pair = pick(syls); return { type: 'twin', pair, target: pick(pair), first: i === 0 }; });
    runSession({ items, onQuit: twins, onEnd: (n, early) => { if (!early) { const q = P(); q.twins[pr.id] = Math.max(q.twins[pr.id] || 0, n); } } });
  });
}

// ---------- La fabrique des verbes (conjugaison) ----------
function conjList() {
  const p = P(); p.conj = p.conj || {};
  screen(`${topBar('La fabrique des verbes')}
    <p class="lead small">Un temps à la fois. Le tableau t'aide : la fin du verbe est en couleur.</p>
    ${LEVELS.slice(1).map(l => `<h2 class="lvl">${l}${l === p.level ? ' <small>ta classe</small>' : ''}</h2>
      <div class="list">${CONJ.filter(c => c.level === l).map(c => `<button class="row" data-c="${c.id}"><span class="r-e">${c.kinds.includes('tense') ? '⏳' : '✏️'}</span><span class="r-t">${esc(c.title)}</span>${p.conj[c.id] ? stars(p.conj[c.id]) : ''}</button>`).join('')}</div>`).join('')}`);
  $$('[data-c]').forEach(b => b.onclick = () => startConj(CONJ.find(c => c.id === b.dataset.c)));
}
const commonPrefix = list => { let k = 0; while (list.every(f => f[k] && f[k] === list[0][k])) k++; return list[0].slice(0, k); };
function splitForm(v, t, i) {
  const f = formOf(v, t, i);
  if (['pc', 'pqp', 'fa'].includes(t)) { const sp = f.indexOf(' '); return [f.slice(0, sp + 1), f.slice(sp + 1), true]; }
  const pre = commonPrefix(conjugate(v, t));
  return [pre, f.slice(pre.length), false];
}
function conjItems(l) {
  const items = [{ type: 'ctable', l }];
  const persons = personsOf(l);
  const combos = shuffle(l.verbs.flatMap(v => l.tenses.flatMap(t => persons.map(i => ({ v, t, i })))));
  const seen = new Set();
  for (let k = 0; k < 10; k++) {
    const c = combos[k % combos.length];
    let kind = l.kinds[k % l.kinds.length];
    if (kind === 'ending' && (['pc', 'pqp', 'fa', 'ip'].includes(c.t) || commonPrefix(conjugate(c.v, c.t)).length < 3)) kind = 'form';
    items.push({ type: 'c' + kind, l, ...c, first: !seen.has(kind) });
    seen.add(kind);
  }
  return shuffle(items.slice(1)).reduce((a, x) => (a.push(x), a), [items[0]]);
}
function startConj(l) {
  runSession({ items: conjItems(l), onQuit: conjList, onEnd: (n, early) => { if (!early) { const p = P(); p.conj = p.conj || {}; p.conj[l.id] = Math.max(p.conj[l.id] || 0, n); } } });
}
const conjLine = (v, t, i) => { const f = formOf(v, t, i); return t === 'ip' ? cap(f) + ' !' : subject(i, f) + f; };
function conjTableHTML(v, t) {
  return `<div class="ctab rd">${personsOf({ tenses: [t] }).map(i => {
    const [stem, end, cmp] = splitForm(v, t, i);
    const subj = t === 'ip' ? '' : `<span class="pro">${esc(subject(i, formOf(v, t, i)))}</span>`;
    return `<button class="crow" data-say="${esc(conjLine(v, t, i))}">${subj}${cmp ? `<b class="aux">${esc(stem)}</b>${esc(end)}` : `${esc(stem)}<b class="end">${esc(end)}</b>`}</button>`;
  }).join('')}</div>`;
}
// Réponse en conjugaison : la phrase complète s'affiche puis est lue.
function conjAnswer(btn, ok, api, all, correct, it, fill) {
  if (!ok) return answer(btn, false, api, { all, correct });
  btn.classList.add('ok'); all.forEach(b => { b.disabled = true; }); beep('ok');
  if (fill) fill();
  api.next(true, speak(conjSentence(it.v, it.t, it.i)).then(ok2 => ok2 && api.first ? speak(pick(CHEERS)) : null));
}
function blankSentence(it, inner) {
  const f = formOf(it.v, it.t, it.i), when = TENSES[it.t].when;
  if (it.t === 'ip') return `<span class="pro">(${PRONOUNS[it.i]})</span> ${inner} ${esc(VERB_CPL[it.v])} !`;
  const subj = subject(it.i, f);
  return `${when ? esc(when) + ' ' : ''}${esc(when ? subj : cap(subj))}${inner} ${esc(VERB_CPL[it.v])}.`;
}

Object.assign(EX, {
  ctable(box, it, api) {
    const l = it.l;
    if (l.kinds.includes('tense')) {
      const ts = l.tenses;
      box.innerHTML = `
        <p class="inst">${esc(l.title)}</p>
        <div class="timeline">${l.timeline
          ? `<div><span>⏪</span><b>Passé</b><small>Hier, autrefois…</small></div><div><span>⏺️</span><b>Présent</b><small>Aujourd'hui, maintenant</small></div><div><span>⏩</span><b>Futur</b><small>Demain, plus tard…</small></div>`
          : ts.map(t => `<div><b>${esc(TENSES[t].name)}</b><small class="rd">${esc(conjLine('chanter', t, 3))}</small></div>`).join('')}</div>
        <p class="inst small">Regarde surtout la fin du verbe et les mots comme « hier » ou « demain ».</p>
        <button class="btn go">C'est parti ! ➜</button>`;
      speak(l.timeline ? CONJ_VOICE.timeline : CONJ_VOICE.tense);
    } else {
      const t = l.tenses[0];
      box.innerHTML = `
        <p class="inst">${esc(TENSES[t].name.charAt(0).toUpperCase() + TENSES[t].name.slice(1))} — ${esc(CONJ_VOICE.table)}</p>
        <div class="vtabs">${l.verbs.map((v, k) => `<button class="${k ? '' : 'on'}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>
        <div data-tab>${conjTableHTML(l.verbs[0], t)}</div>
        <button class="btn go">C'est parti ! ➜</button>`;
      const tab = box.querySelector('[data-tab]');
      const bindRows = () => tab.querySelectorAll('.crow').forEach(r => r.onclick = () => speak(r.dataset.say));
      bindRows();
      box.querySelectorAll('.vtabs button').forEach(b => b.onclick = () => {
        box.querySelectorAll('.vtabs button').forEach(x => x.classList.toggle('on', x === b));
        tab.innerHTML = conjTableHTML(b.dataset.v, t); bindRows();
      });
      speak(CONJ_VOICE.table);
    }
    box.querySelector('.go').onclick = () => api.next(false, Promise.resolve());
  },

  cform(box, it, api) {
    const f = formOf(it.v, it.t, it.i);
    const pool = [];
    personsOf(it.l).forEach(j => pool.push(formOf(it.v, it.t, j)));
    ['pr', 'imp', 'fut', 'pc', 'ps', 'cond'].forEach(t => { if (t !== it.t && it.t !== 'ip') pool.push(formOf(it.v, t, it.i)); });
    const opts = [f]; for (const o of pool) if (!opts.includes(o)) { opts.push(o); if (opts.length === 3) break; }
    box.innerHTML = `
      <p class="inst">${esc(CONJ_VOICE.form)} <span class="verb-tag">${esc(it.v)} · ${esc(TENSES[it.t].name)}</span></p>
      <div class="sent rd">${blankSentence(it, '<span class="blank">?</span>')}</div>
      <div class="opts col">${shuffle(opts).map(o => `<button class="card txt rd" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    if (it.first) speak(CONJ_VOICE.form);
    const all = [...box.querySelectorAll('.card')];
    all.forEach(b => b.onclick = () => conjAnswer(b, b.dataset.o === f, api, all, all.find(x => x.dataset.o === f), it,
      () => { box.querySelector('.blank').outerHTML = `<b class="filled-v">${esc(f)}</b>`; }));
  },

  cending(box, it, api) {
    const [stem, end] = splitForm(it.v, it.t, it.i);
    const ends = conjugate(it.v, it.t).map(x => x.slice(stem.length));
    const opts = [end]; for (const o of shuffle(ends)) if (!opts.includes(o)) { opts.push(o); if (opts.length === 3) break; }
    box.innerHTML = `
      <p class="inst">${esc(CONJ_VOICE.ending)} <span class="verb-tag">${esc(it.v)} · ${esc(TENSES[it.t].name)}</span></p>
      <div class="sent rd">${blankSentence(it, `${esc(stem)}<span class="blank">…</span>`)}</div>
      <div class="opts">${shuffle(opts).map(o => `<button class="card rd" data-o="${esc(o)}">-${esc(o)}</button>`).join('')}</div>`;
    if (it.first) speak(CONJ_VOICE.ending);
    const all = [...box.querySelectorAll('.card')];
    all.forEach(b => b.onclick = () => conjAnswer(b, b.dataset.o === end, api, all, all.find(x => x.dataset.o === end), it,
      () => { box.querySelector('.blank').outerHTML = `<b class="end">${esc(end)}</b>`; }));
  },

  ctense(box, it, api) {
    const T = TENSES[it.t];
    let opts, good;
    if (it.l.timeline) {
      opts = [['past', '⏪ Passé'], ['present', '⏺️ Présent'], ['future', '⏩ Futur']]; good = T.time;
    } else {
      const names = [it.t]; for (const t of shuffle([...it.l.tenses, 'pr', 'imp', 'fut', 'pc'])) if (!names.includes(t)) { names.push(t); if (names.length === 3) break; }
      opts = shuffle(names).map(t => [t, TENSES[t].name]); good = it.t;
    }
    const bare = conjBare(it.v, it.t, it.i);
    box.innerHTML = `
      <p class="inst">${esc(it.l.timeline ? CONJ_VOICE.timeline : CONJ_VOICE.tense)}</p>
      <div class="sent rd">${esc(bare)}</div>
      <button class="helper" data-help>🔊 Écouter la phrase</button>
      <div class="opts col">${opts.map(([k, l]) => `<button class="card txt" data-o="${k}">${esc(l)}</button>`).join('')}</div>`;
    if (it.first) speak(it.l.timeline ? CONJ_VOICE.timeline : CONJ_VOICE.tense);
    box.querySelector('[data-help]').onclick = () => speak(bare);
    const all = [...box.querySelectorAll('.card')];
    all.forEach(b => b.onclick = () => conjAnswer(b, b.dataset.o === good, api, all, all.find(x => x.dataset.o === good), it,
      () => { box.querySelector('.sent').textContent = conjSentence(it.v, it.t, it.i); }));
  },
});

// ---------- Les problèmes (maths) ----------
function mathList() {
  const p = P(); p.math = p.math || {};
  screen(`${topBar('Les problèmes')}
    <p class="lead small">Plume lit le problème avec toi. D'abord on choisit l'opération, ensuite on calcule.</p>
    <div class="list">${LEVELS.map(l => `<button class="row" data-m="${l}"><span class="r-e">🔢</span><span class="r-t">Problèmes ${l}${l === p.level ? '<small>ta classe</small>' : ''}</span>${p.math[l] ? stars(p.math[l]) : ''}</button>`).join('')}</div>`);
  $$('[data-m]').forEach(b => b.onclick = () => {
    const lv = b.dataset.m;
    runSession({ items: shuffle(MATH[lv]).map((pb, i) => ({ type: 'math', pb, lv, first: i === 0 })), onQuit: mathList,
      onEnd: (n, early) => { if (!early) { const q = P(); q.math = q.math || {}; q.math[lv] = Math.max(q.math[lv] || 0, n); } } });
  });
}
EX.math = function (box, it, api) {
  const [text, emo, op, a, b, unit] = it.pb, res = mathResult(op, a, b);
  // Aide en images pour les petits nombres (CP, CE1).
  const pics = a <= 12 && b <= 12 && (op === '+' || op === '−');
  box.innerHTML = `
    <div class="pb-emo">${emo}</div>
    <div class="sent rd tap pb">${textHTML(text, true)}</div>
    <button class="helper" data-help>🔊 Écouter le problème</button>
    <div data-phase></div>`;
  box.querySelector('[data-help]').onclick = () => speak(text);
  const phase = box.querySelector('[data-phase]');
  const opPhase = () => {
    phase.innerHTML = `<p class="inst">${esc(MATH_VOICE.op)}</p>
      <div class="opts ops">${MATH_OPS[it.lv].map(o => `<button class="card op" data-o="${o}">${o}</button>`).join('')}</div>`;
    const all = [...phase.querySelectorAll('.card')];
    all.forEach(btn => btn.onclick = () => {
      if (btn.dataset.o !== op) { answer(btn, false, api, { all, correct: all.find(x => x.dataset.o === op) }); if (api.misses === 1) setTimeout(() => speak(MATH_VOICE.opHint), 900); return; }
      btn.classList.add('ok'); beep('ok');
      speak(`Oui, c'est ${OP_NAME[op]} !`).then(ok => { if (ok) speak(MATH_VOICE.calc); });
      calcPhase();
    });
  };
  const calcPhase = () => {
    let val = '', fails = 0;
    phase.innerHTML = `
      ${pics ? `<div class="pics">${`<span>${emo}</span>`.repeat(a)}<b>${op}</b>${`<span class="${op === '−' ? 'cross' : ''}">${emo}</span>`.repeat(b)}</div>` : ''}
      <div class="calc rd">${a} ${op} ${b} = <span class="ans">?</span>${unit ? ` <small>${esc(unit)}</small>` : ''}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map(k => `<button class="key ${k === '✓' ? 'okk' : ''}" data-k="${k}">${k}</button>`).join('')}</div>`;
    if (pics) phase.querySelector('.pics').insertAdjacentHTML('afterend', '<p class="note center">Tu peux compter les images.</p>');
    const ans = phase.querySelector('.ans');
    const show = () => { ans.textContent = val || '?'; };
    phase.querySelectorAll('.key').forEach(k => k.onclick = () => {
      const d = k.dataset.k;
      if (d === '⌫') { val = val.slice(0, -1); return show(); }
      if (d !== '✓') { if (val.length < 5) val += d; beep('tap'); return show(); }
      if (!val) return;
      if (+val === res) {
        ans.classList.add('good'); phase.querySelectorAll('.key').forEach(x => { x.disabled = true; });
        beep('ok');
        api.next(true, speak(mathAnswerSay(it.pb)).then(ok => ok && api.first ? speak(pick(CHEERS)) : null));
      } else {
        fails++; api.miss(); beep('ko'); ans.classList.remove('shake'); void ans.offsetWidth; ans.classList.add('shake');
        val = ''; show();
        if (fails >= 2) { ans.textContent = res; ans.classList.add('hint'); speak(mathAnswerSay(it.pb)); setTimeout(() => api.next(true, Promise.resolve()), 2500); }
        else speak(pick(OOPS));
      }
    });
  };
  speak(text);
  opPhase();
};

// ---------- Jeux d'attention ----------
function attention() {
  screen(`${topBar("Jeux d'attention")}
    <div class="list">
      <button class="row" data-g="hunt"><span class="r-e">🔍</span><span class="r-t">La chasse aux lettres<small>Trouve toutes les lettres cachées</small></span></button>
      <button class="row" data-g="simon"><span class="r-e">🧠</span><span class="r-t">La suite de Plume<small>Retiens l'ordre et refais-le</small></span></button>
      <button class="row" data-g="breathe"><span class="r-e">🫧</span><span class="r-t">La bulle de calme<small>Respirer pour mieux se concentrer</small></span></button>
    </div>`);
  $$('[data-g]').forEach(b => b.onclick = () => ({ hunt: () => hunt(), simon, breathe })[b.dataset.g]());
}

function hunt(round = 0, tot = { found: 0, missed: 0, wrong: 0 }, sets = shuffle(HUNT_LETTERS).slice(0, 3)) {
  const set = sets[round], target = set[0];
  const cells = shuffle([...Array(8).fill(target), ...Array.from({ length: 22 }, () => pick(set.slice(1)))]);
  let found = 0, wrong = 0;
  screen(`${topBar('La chasse aux lettres', attention)}
    <p class="inst">Manche ${round + 1} sur 3 — touche toutes les lettres <button class="target rd" data-say>${esc(target)}</button></p>
    <div class="grid rd">${cells.map((c, i) => `<button class="cell" data-i="${i}">${esc(c)}</button>`).join('')}</div>
    <p class="hunt-count">Trouvées : <b data-f>0</b> / 8</p>
    <button class="btn ghost" data-done>J'ai fini</button>`);
  speak(huntSay(target));
  $('[data-say]').onclick = () => speak(huntSay(target));
  const end = () => {
    const missed = 8 - found;
    $$('.cell').forEach((c, i) => { c.disabled = true; if (cells[i] === target && !c.classList.contains('ok')) c.classList.add('hint'); });
    tot.found += found; tot.missed += missed; tot.wrong += wrong;
    setTimeout(() => {
      if (round < 2) return hunt(round + 1, tot, sets);
      const p = P(), gain = Math.round(tot.found / 3);
      p.plumes += gain; p.games.hunt = Math.max(p.games.hunt || 0, tot.found - tot.wrong); track(90000); save();
      screen(`<div class="center-col end">
        <div class="big-emoji">🔍</div><h1 class="title">Bravo, détective !</h1>
        <p class="lead">Lettres trouvées : <b>${tot.found}</b> / 24<br>Erreurs : <b>${tot.wrong}</b></p>
        <p class="lead">+${gain} plumes 🪶</p>
        <button class="btn" data-again>Rejouer</button><button class="btn ghost" data-back2>Retour</button></div>`);
      beep('win');
      $('[data-again]').onclick = () => hunt();
      $('[data-back2]').onclick = attention;
    }, missed ? 1600 : 700);
  };
  $$('.cell').forEach(c => c.onclick = () => {
    if (cells[+c.dataset.i] === target) {
      if (c.classList.contains('ok')) return;
      c.classList.add('ok'); beep('tap'); found++; $('[data-f]').textContent = found;
      if (found === 8) end();
    } else { c.classList.remove('ko'); void c.offsetWidth; c.classList.add('ko'); beep('ko'); wrong++; }
  });
  $('[data-done]').onclick = end;
}

function simon() {
  const PADS = ['🍓', '🐸', '🐳', '🌻'];
  let seq = [], input = 0, lock = true, best = 0;
  screen(`${topBar('La suite de Plume', attention)}
    <p class="inst" data-msg>${esc(VOICE.simon)}</p>
    <div class="pads">${PADS.map((e, i) => `<button class="pad p${i}" data-i="${i}">${e}</button>`).join('')}</div>
    <p class="hunt-count">Suite : <b data-len>0</b></p>
    <button class="btn" data-start>Commencer</button>`);
  const pads = $$('.pad'), msg = $('[data-msg]');
  const flash = i => new Promise(r => { pads[i].classList.add('lit'); beep('pad' + i); setTimeout(() => { pads[i].classList.remove('lit'); setTimeout(r, 250); }, 550); });
  const playSeq = async () => {
    lock = true; msg.textContent = 'Regarde bien…';
    await new Promise(r => setTimeout(r, 700));
    for (const i of seq) { if (!document.body.contains(msg)) return; await flash(i); }
    msg.textContent = 'À toi !'; input = 0; lock = false;
  };
  const grow = () => { seq.push(Math.floor(Math.random() * 4)); $('[data-len]').textContent = seq.length; playSeq(); };
  $('[data-start]').onclick = e => { e.currentTarget.remove(); stopSpeak(); seq = [Math.floor(Math.random() * 4)]; grow(); };
  speak(VOICE.simon);
  pads.forEach(pd => pd.onclick = () => {
    if (lock) return;
    const i = +pd.dataset.i;
    flash(i);
    if (i !== seq[input]) {
      lock = true; best = seq.length - 1;
      const p = P(); p.plumes += best; p.games.simon = Math.max(p.games.simon || 0, best); track(60000); save();
      msg.innerHTML = `Oups ! Tu as retenu une suite de <b>${best}</b>. +${best} plumes 🪶`;
      beep('ko');
      const again = document.createElement('button'); again.className = 'btn'; again.textContent = 'Rejouer';
      again.onclick = simon; app.querySelector('.screen').appendChild(again);
      return;
    }
    input++;
    if (input === seq.length) { lock = true; msg.textContent = pick(CHEERS); setTimeout(grow, 800); }
  });
}

function breathe() {
  screen(`${topBar('La bulle de calme', attention)}
    <div class="center-col">
      <p class="lead">Suis la bulle : elle grossit quand tu inspires, elle rapetisse quand tu expires.</p>
      ${breatheHTML()}
      <button class="btn ghost" data-stop>Terminer</button>
    </div>`);
  const stop = runBreath(5, () => { const p = P(); p.plumes += 2; track(40000); save(); });
  $('[data-stop]').onclick = () => { stop(); attention(); };
}

// ---------- Le nid (récompenses) ----------
function nest() {
  const p = P();
  const nx = FRIENDS.find(f => f[0] > p.plumes);
  screen(`${topBar('Le nid de Plume')}
    <p class="lead small">Chaque plume gagnée fait venir de nouveaux amis dans le nid.</p>
    <div class="friends">${FRIENDS.map(f => `<div class="friend ${p.plumes >= f[0] ? '' : 'locked'}"><span>${p.plumes >= f[0] ? f[1] : '🥚'}</span>${p.plumes >= f[0] ? esc(f[2]) : `${f[0]} 🪶`}</div>`).join('')}</div>
    ${nx ? `<p class="lead small">Encore <b>${nx[0] - p.plumes}</b> plumes pour le prochain ami !</p>` : '<p class="lead">Tous les amis sont là. Tu es incroyable !</p>'}`);
}

// ---------- Espace adulte ----------
function adultGate(then) {
  const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 6);
  screen(`${topBar('Espace adulte')}
    <div class="center-col">
      <p class="lead">Pour les parents et les enseignants.<br>Combien font <b>${a} × ${b}</b> ?</p>
      <input class="gate" id="g" inputmode="numeric" autocomplete="off">
      <button class="btn" id="ok">Entrer</button>
    </div>`);
  const go = () => { if (+$('#g').value === a * b) then(); else { $('#g').value = ''; $('#g').classList.remove('shake'); void $('#g').offsetWidth; $('#g').classList.add('shake'); } };
  $('#ok').onclick = go;
  $('#g').onkeydown = e => { if (e.key === 'Enter') go(); };
  $('#g').focus();
}

function adult(tab = 'suivi') {
  const p = P();
  const tabs = [['suivi', 'Suivi'], ['reglages', 'Réglages'], ['conseils', 'Conseils'], ['profils', 'Profils']];
  screen(`${topBar('Espace adulte')}
    <div class="tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    <div class="panel">${({ suivi: suiviHTML, reglages: reglagesHTML, conseils: conseilsHTML, profils: profilsHTML })[tab](p)}</div>`, 'adult');
  $$('[data-t]').forEach(b => b.onclick = () => adult(b.dataset.t));
  if (tab === 'reglages') bindReglages();
  if (tab === 'profils') bindProfils();
}

function suiviHTML(p) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
  const mins = days.map(d => Math.round((p.days[dayKey(d)] || 0) / 60));
  const maxM = Math.max(10, ...mins);
  const week = mins.reduce((a, b) => a + b, 0);
  const hard = Object.entries(p.words).filter(([, s]) => s.ko > s.ok || s.ko >= 2).sort((a, b) => (b[1].ko - b[1].ok) - (a[1].ko - a[1].ok)).slice(0, 10);
  const fl = p.fluence.slice(-8).reverse();
  return `
    <h3>${p.avatar} ${esc(p.name)}</h3>
    <div class="kpis">
      <div><b>${week}</b><span>min cette semaine</span></div>
      <div><b>${p.sessions}</b><span>séances</span></div>
      <div><b>${doneSteps().length}/${STEPS.length}</b><span>sons travaillés</span></div>
    </div>
    <h4>Temps de lecture (7 derniers jours)</h4>
    <div class="bars">${days.map((d, i) => `<div class="bcol"><i style="height:${Math.round(mins[i] / maxM * 100)}%"></i><b>${mins[i] || ''}</b><span>${'dlmmjvs'[d.getDay()].toUpperCase()}</span></div>`).join('')}</div>
    <p class="note">Objectif conseillé : 10 à 15 minutes par jour, plutôt que de longues séances.</p>
    <h4>Les sons</h4>
    <div class="sgrid">${STEPS.map(s => `<div class="sg ${p.steps[s.id] ? 'done' : ''}"><span class="rd">${esc(s.title)}</span>${p.steps[s.id] ? stars(p.steps[s.id]) : '—'}</div>`).join('')}</div>
    <h4>Mots à retravailler</h4>
    ${hard.length ? `<div class="chips rd">${hard.map(([w, s]) => `<span class="chip">${esc(w)} <small>${s.ko}✗ ${s.ok}✓</small></span>`).join('')}</div>` : '<p class="note">Rien à signaler pour le moment.</p>'}
    <h4>Lecture à voix haute (chrono)</h4>
    ${fl.length ? `<table class="tbl"><tr><th>Date</th><th>Histoire</th><th>Mots/min</th><th>Erreurs</th></tr>${fl.map(f => `<tr><td>${f.d.slice(8)}/${f.d.slice(5, 7)}</td><td>${esc(STORY_BY_ID[f.story] ? STORY_BY_ID[f.story].title : '')}</td><td><b>${f.wpm}</b></td><td>${f.errs}</td></tr>`).join('')}</table>`
      : `<p class="note">Dans « Les histoires », appuyez sur « Chrono (adulte) » pendant que l'enfant lit à voix haute, puis notez ses erreurs.</p>`}
    <p class="note">Repères indicatifs en fin d'année (mots lus correctement par minute) : CP ≈ 50, CE1 ≈ 70–80, CE2 ≈ 90–100. Ce qui compte surtout, c'est la progression de votre enfant par rapport à lui-même.</p>
    <h4>Conjugaison (classe : ${esc(p.level || '—')})</h4>
    <div class="sgrid wide">${CONJ.map(l => `<div class="sg ${(p.conj || {})[l.id] ? 'done' : ''}"><span>${l.level} · ${esc(l.title)}</span>${(p.conj || {})[l.id] ? stars(p.conj[l.id]) : '—'}</div>`).join('')}</div>
    <h4>Problèmes de maths</h4>
    <div class="sgrid">${LEVELS.map(l => `<div class="sg ${(p.math || {})[l] ? 'done' : ''}"><span>${l}</span>${(p.math || {})[l] ? stars(p.math[l]) : '—'}</div>`).join('')}</div>
    <h4>Lettres jumelles</h4>
    <div class="sgrid">${PAIRS.map(pr => `<div class="sg ${p.twins[pr.id] ? 'done' : ''}"><span class="rd">${esc(pr.a)}·${esc(pr.b)}</span>${p.twins[pr.id] ? stars(p.twins[pr.id]) : '—'}</div>`).join('')}</div>`;
}

function seg(key, opts) {
  const v = S()[key];
  return `<div class="seg" data-k="${key}">${opts.map(([val, l]) => `<button class="${val === v ? 'on' : ''}" data-v='${JSON.stringify(val)}'>${l}</button>`).join('')}</div>`;
}
function reglagesHTML() {
  return `
    <div class="preview rd tap">${textHTML('Le la-pin man-ge du pain. La pou-le est sous le pa-ra-plui(e).')}</div>
    <div class="set"><span>Police</span>${seg('font', [['andika', '<span style="font-family:Andika">Andika</span>'], ['lexend', '<span style="font-family:Lexend">Lexend</span>'], ['atkinson', '<span style="font-family:Atkinson Hyperlegible">Atkinson</span>']])}</div>
    <div class="set"><span>Taille du texte</span>${seg('size', [[0, 'A'], [1, '<big>A</big>'], [2, '<big><big>A</big></big>'], [3, '<big><big><big>A</big></big></big>']])}</div>
    <div class="set"><span>Espacement</span>${seg('spacing', [[0, 'Normal'], [1, 'Large'], [2, 'Très large']])}</div>
    <div class="set"><span>Syllabes en couleur</span>${seg('syl', [[true, 'Oui'], [false, 'Non']])}</div>
    <div class="set"><span>Lettres muettes en gris</span>${seg('mute', [[true, 'Oui'], [false, 'Non']])}</div>
    <div class="set"><span>Histoires ligne par ligne</span>${seg('focus', [[true, 'Oui'], [false, 'Non']])}</div>
    <div class="set"><span>Vitesse de la voix</span>${seg('rate', [[0.8, 'Lente'], [0.95, 'Normale'], [1.1, 'Rapide']])}</div>
    <div class="set"><span>Pause proposée après</span>${seg('session', [[5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min']])}</div>
    <div class="set"><span>Durée du mot flash</span>${seg('flash', [[1000, '1 s'], [1500, '1,5 s'], [2500, '2,5 s']])}</div>
    <div class="set"><span>Petits sons</span>${seg('sound', [[true, 'Oui'], [false, 'Non']])}</div>
    <div class="set"><span>Mode calme (moins d'animations)</span>${seg('calm', [[false, 'Non'], [true, 'Oui']])}</div>`;
}
function bindReglages() {
  $$('.seg').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
    setSetting(g.dataset.k, JSON.parse(b.dataset.v));
    g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  }));
}

function conseilsHTML() {
  return `<div class="tips">
    <p><b>Plume ne remplace pas un professionnel.</b> Si les difficultés de lecture persistent, un bilan chez un(e) orthophoniste (sur prescription du médecin) permet de savoir s'il s'agit d'une dyslexie et d'adapter l'aide. Pour l'attention, parlez-en au médecin ou au pédiatre.</p>
    <h4>Au quotidien</h4>
    <ul>
      <li><b>Peu mais souvent :</b> 10 à 15 minutes par jour valent mieux qu'une heure le week-end.</li>
      <li><b>Toujours finir sur une réussite</b>, même petite. La confiance compte autant que la technique.</li>
      <li><b>Un endroit calme</b>, sans écran allumé autour, tablette posée à plat.</li>
      <li><b>Laisser l'enfant lire à voix haute</b> et ne pas finir les mots à sa place : attendre 3 secondes avant d'aider.</li>
      <li><b>Valoriser l'effort</b> plutôt que le résultat : « Tu as bien découpé ce mot ».</li>
    </ul>
    <h4>Pourquoi l'appli est faite comme ça</h4>
    <ul>
      <li><b>Syllabes en couleur et lettres muettes grisées</b> : aident à découper les mots.</li>
      <li><b>Police lisible et espacement large</b> : moins de lettres qui « se mélangent ».</li>
      <li><b>Une seule consigne à la fois</b>, dite à voix haute : moins de fatigue et de dispersion.</li>
      <li><b>Pauses proposées</b> avec un exercice de respiration.</li>
      <li><b>Le chemin des sons</b> suit l'ordre habituel du CP. Un enfant de CE2 avec un niveau de CP peut commencer au début : les premières étapes vont vite et redonnent confiance.</li>
      <li><b>Les lettres jumelles</b> (b/d, p/b, f/v…) travaillent les confusions fréquentes.</li>
      <li><b>Le mot flash</b> entraîne à reconnaître les mots d'un coup d'œil, ce qui rend la lecture plus fluide.</li>
    </ul>
    <h4>À l'école</h4>
    <p>Pour un enfant dont la lecture freine toutes les matières, on peut demander un <b>PAP</b> (plan d'accompagnement personnalisé) à l'enseignant(e) : consignes lues à voix haute, textes agrandis, moins de copie. Le suivi « Lecture à voix haute » de cet onglet peut servir à montrer les progrès.</p>
  </div>`;
}

function profilsHTML() {
  return `
    <div class="list">${DB.profiles.map(p => `<div class="prow"><span class="pa">${p.avatar}</span><b>${esc(p.name)}</b><span class="note">${p.plumes} 🪶</span>
      <select class="mini" data-lvl="${p.id}">${LEVELS.map(l => `<option ${l === p.level ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="mini" data-ren="${p.id}">Renommer</button><button class="mini danger" data-del="${p.id}">Supprimer</button></div>`).join('')}</div>
    <button class="btn small" data-add>＋ Ajouter un enfant</button>
    <h4>Sauvegarde</h4>
    <p class="note">La progression est enregistrée sur cet appareil. Vous pouvez la copier dans un fichier pour la mettre sur un autre appareil.</p>
    <button class="btn small ghost" data-exp>Télécharger la sauvegarde</button>
    <label class="btn small ghost file">Restaurer une sauvegarde<input type="file" accept="application/json" data-imp hidden></label>`;
}
function bindProfils() {
  $$('[data-ren]').forEach(b => b.onclick = () => {
    const p = DB.profiles.find(x => x.id === b.dataset.ren);
    const n = prompt('Nouveau prénom', p.name); if (n && n.trim()) { p.name = n.trim().slice(0, 20); save(); adult('profils'); }
  });
  $$('[data-lvl]').forEach(sel => sel.onchange = () => { DB.profiles.find(x => x.id === sel.dataset.lvl).level = sel.value; save(); });
  $$('[data-del]').forEach(b => b.onclick = () => {
    const p = DB.profiles.find(x => x.id === b.dataset.del);
    if (!confirm(`Supprimer ${p.name} et toute sa progression ?`)) return;
    DB.profiles = DB.profiles.filter(x => x !== p);
    if (DB.current === p.id) DB.current = DB.profiles[0] ? DB.profiles[0].id : null;
    save(); DB.profiles.length ? adult('profils') : profiles();
  });
  $('[data-add]').onclick = () => createProfile(false);
  $('[data-exp]').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(DB)], { type: 'application/json' }));
    a.download = `plume-sauvegarde-${dayKey()}.json`; a.click();
  };
  $('[data-imp]').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t);
      if (!d || !Array.isArray(d.profiles)) throw new Error();
      if (!confirm('Remplacer la progression de cet appareil par celle du fichier ?')) return;
      DB = d; if (!P()) DB.current = DB.profiles[0] ? DB.profiles[0].id : null;
      save(); applySettings(); home();
    }).catch(() => alert("Ce fichier n'est pas une sauvegarde Plume."));
  };
}

// ---------- Démarrage ----------
applySettings();
P() ? home() : profiles();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
