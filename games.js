'use strict';
// Plume — les jeux : varier les plaisirs pour que l'enfant ait envie de revenir chaque jour.
// Les jeux de lecture utilisent les sons déjà travaillés (+ le prochain son du chemin).

const GV = {
  memory: 'Retourne deux cartes : trouve le mot qui va avec chaque image.',
  bulles: 'Écoute la syllabe, et éclate la bonne bulle !',
  manque: 'Il manque une syllabe. Écoute le mot, et trouve-la !',
  fusee: "Calcule, et fais monter la fusée jusqu'à la lune !",
  quiparle: 'Qui parle ? Touche le bon pronom.',
  moon: 'Bravo, la fusée est arrivée sur la lune !',
  end: 'Bravo, tu as fini le jeu !',
};
const intrusSay = st => `Trouve l'intrus : le mot où on n'entend pas ${st.ear}.`;

const GAMES = [
  { id: 'memory', e: '🃏', name: 'Le memory des mots', desc: 'Retrouve le mot de chaque image', cat: 'Lire', run: () => gMemory() },
  { id: 'bulles', e: '🫧', name: 'Les bulles de syllabes', desc: 'Écoute et éclate la bonne bulle', cat: 'Lire', run: () => gBulles() },
  { id: 'intrus', e: '🕵️', name: 'Le mot intrus', desc: "Trouve le mot qui n'a pas le son", cat: 'Lire', run: () => gIntrus() },
  { id: 'manque', e: '🧩', name: 'La syllabe perdue', desc: 'Remets la syllabe qui manque', cat: 'Lire', run: () => gManque() },
  { id: 'fusee', e: '🚀', name: 'La fusée du calcul', desc: 'Calcule pour aller sur la lune', cat: 'Compter', run: () => gFusee() },
  { id: 'quiparle', e: '🗣️', name: 'Qui parle ?', desc: 'Trouve le pronom du verbe', cat: 'Conjuguer', run: () => gQui() },
  { id: 'hunt', e: '🔍', name: 'La chasse aux lettres', desc: 'Trouve toutes les lettres cachées', cat: 'Attention', run: () => hunt() },
  { id: 'simon', e: '🧠', name: 'La suite de Plume', desc: "Retiens l'ordre et refais-le", cat: 'Attention', run: () => simon() },
  { id: 'breathe', e: '🫧', name: 'La bulle de calme', desc: 'Respirer pour mieux se concentrer', cat: 'Attention', run: () => breathe() },
];
const DAILY_IDS = ['memory', 'bulles', 'intrus', 'manque', 'fusee', 'quiparle'];
const GAME_BY_ID = Object.fromEntries(GAMES.map(g => [g.id, g]));

// Chapeaux de Plume, débloqués avec les plumes gagnées.
const HATS = [[0, '', 'Sans chapeau'], [25, '🎀', 'Le nœud'], [50, '🧢', 'La casquette'], [90, '🎩', 'Le chapeau magique'], [140, '👑', 'La couronne'],
  [200, '🎓', 'Le chapeau de savant'], [270, '🌸', 'La fleur'], [350, '👒', 'Le chapeau de paille'], [440, '⭐', "L'étoile"]];
const owlHTML = () => { const h = P() && P().hat; return `🦉${h ? `<span class="hat">${h}</span>` : ''}`; };

function dailyGame() {
  let h = 0; for (const c of dayKey()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GAME_BY_ID[DAILY_IDS[h % DAILY_IDS.length]];
}
const dailyDone = () => { const p = P(); return !!(p.daily && p.daily.d === dayKey()); };

function gamesHub() {
  const dg = dailyGame(), done = dailyDone();
  const cats = [['Lire', '📖 Pour lire'], ['Logique', '🧩 Pour réfléchir'], ['Compter', '🔢 Pour compter'], ['Conjuguer', '✏️ Pour conjuguer'], ['Attention', '🎯 Pour se concentrer']];
  screen(`${topBar('Les jeux')}
    <button class="daily ${done ? 'done' : ''}" data-g="${dg.id}"><span class="d-e">${dg.e}</span><span><b>Défi du jour ${done ? '✓' : ''}</b><small>${esc(dg.name)}${done ? ' — réussi !' : ' — plumes ×2'}</small></span></button>
    <button class="btn alt" data-surprise>🎲 Jeu surprise</button>
    ${cats.map(([c, l]) => `<h2 class="lvl">${l}</h2><div class="list">${GAMES.filter(g => g.cat === c).map(g => `
      <button class="row" data-g="${g.id}"><span class="r-e">${g.e}</span><span class="r-t">${esc(g.name)}<small>${esc(g.desc)}</small></span></button>`).join('')}</div>`).join('')}`);
  $$('[data-g]').forEach(b => b.onclick = () => GAME_BY_ID[b.dataset.g].run());
  $('[data-surprise]').onclick = () => GAME_BY_ID[pick(DAILY_IDS)].run();
}

// Fin de jeu commune : étoiles, plumes (doublées pour le défi du jour), rejouer.
function endGame(id, { n, text, gain }) {
  const p = P(), g = GAME_BY_ID[id];
  const before = friend(p.plumes);
  const bonus = dailyGame().id === id && !dailyDone() ? gain : 0;
  if (bonus) p.daily = { d: dayKey() };
  p.plumes += gain + bonus;
  p.games[id] = Math.max(p.games[id] || 0, n);
  p.games[id + '_n'] = (p.games[id + '_n'] || 0) + 1;
  track(60000); save();
  const after = friend(p.plumes);
  screen(`
    <div class="center-col end">
      <div class="big-emoji">${g.e}</div>
      <h1 class="title">${esc(g.name)}</h1>
      <div class="end-stars">${[1, 2, 3].map(k => `<span class="st ${k <= n ? 'on' : ''}" style="animation-delay:${0.25 + k * 0.3}s">★</span>`).join('')}</div>
      <p class="lead">${text}</p>
      <p class="lead">+${gain} plume${gain > 1 ? 's' : ''} 🪶${bonus ? ` <b>+${bonus} défi du jour !</b>` : ''}</p>
      <button class="btn" data-again>Rejouer</button>
      <button class="btn ghost" data-more>Autres jeux</button>
    </div>`);
  beep('win'); confetti(n === 3 ? 70 : 40); speak(GV.end);
  if (bonus) setTimeout(() => toast('🎲 Défi du jour réussi !'), 700);
  if (after !== before) setTimeout(() => toast(`${after[1]} ${esc(after[2])} arrive dans le nid !`), 1800);
  $('[data-again]').onclick = () => g.run();
  $('[data-more]').onclick = gamesHub;
}
const starsFrom = (good, total) => (good / total >= 0.85 ? 3 : good / total >= 0.6 ? 2 : 1);

function gameSteps() {
  const st = doneSteps(), nx = nextStep();
  if (nx) st.push(nx);
  for (const s of STEPS) { if (st.length >= 4) break; if (!st.includes(s)) st.push(s); }
  return st;
}
function gameWords(filter = () => true) {
  const seen = new Set();
  return gameSteps().flatMap(s => s.W).filter(w => filter(w) && !seen.has(w.p) && seen.add(w.p));
}
// En-tête de jeu : manche en cours + bouton retour.
const gameTop = (title, i, total) => `${topBar(title, gamesHub)}<div class="bar"><i style="width:${Math.round(i / total * 100)}%"></i></div>`;

// ---------- Le memory des mots ----------
function gMemory() {
  const words = shuffle(gameWords(w => w.p.length <= 8)).slice(0, 6);
  const cards = shuffle(words.flatMap((w, i) => [{ i, kind: 'e', w }, { i, kind: 'w', w }]));
  let open = [], found = 0, tries = 0, lock = false;
  screen(`${topBar('Le memory des mots', gamesHub)}
    <p class="inst">${esc(GV.memory)}</p>
    <div class="mem">${cards.map((c, k) => `<button class="mcard" data-k="${k}"><span class="back">🪶</span><span class="face ${c.kind === 'w' ? 'rd word' : 'emo'}">${c.kind === 'e' ? c.w.e : sylHTML(c.w.m)}</span></button>`).join('')}</div>
    <p class="hunt-count">Essais : <b data-t>0</b></p>`);
  speak(GV.memory);
  $$('.mcard').forEach(b => b.onclick = () => {
    if (lock || b.classList.contains('open')) return;
    b.classList.add('open'); beep('tap'); open.push(b);
    if (open.length < 2) return;
    tries++; $('[data-t]').textContent = tries;
    const pair = open; open = [];
    const [x, y] = pair.map(o => cards[+o.dataset.k]);
    if (x.i === y.i) {
      found++; pair.forEach(o => o.classList.add('found')); beep('ok'); floatText(pair[1], '+1 🪶'); speak(x.w.p); stat(x.w.p, true);
      if (found === words.length) setTimeout(() => endGame('memory', { n: tries <= 9 ? 3 : tries <= 13 ? 2 : 1, text: `Tu as trouvé les ${found} paires en <b>${tries}</b> essais.`, gain: found }), 1300);
    } else {
      lock = true;
      setTimeout(() => { pair.forEach(o => o.classList.remove('open')); lock = false; }, 1100);
    }
  });
}

// ---------- Les bulles de syllabes ----------
function gBulles(round = 0, sc = { good: 0 }, pool = null) {
  const TOTAL = 10;
  pool = pool || [...new Set([...gameSteps().flatMap(s => s.syl || []), ...STEPS[0].syl])];
  if (round >= TOTAL) return endGame('bulles', { n: starsFrom(sc.good, TOTAL), text: `<b>${sc.good}</b> bulles éclatées du premier coup sur ${TOTAL}.`, gain: sc.good });
  const target = pick(pool);
  const opts = shuffle([target, ...shuffle(pool.filter(s => s !== target)).slice(0, 3)]);
  let first = true;
  screen(`${gameTop('Les bulles de syllabes', round, TOTAL)}
    <div class="bub-head"><p class="inst">${esc(GV.bulles)}</p>${playBtn('🔊')}</div>
    <div class="bub-area">${opts.map((o, k) => `<button class="bub rd" data-o="${esc(o)}" style="--x:${2 + k * 24}%;--y:${k % 2 ? 18 : 58}%;--dur:${6 + Math.random() * 3}s;--delay:-${(Math.random() * 5).toFixed(1)}s">${esc(o)}</button>`).join('')}</div>`);
  const play = async () => { if (round === 0 && !(await speak(GV.bulles))) return; speak(target); };
  $('[data-play]').onclick = () => speak(target);
  $$('.bub').forEach(b => b.onclick = () => {
    if (b.dataset.o === target) {
      b.classList.add('popped'); beep('ok'); if (first) { sc.good++; floatText(b, '+1 🪶'); }
      $$('.bub').forEach(x => { x.disabled = true; });
      setTimeout(() => gBulles(round + 1, sc, pool), 700);
    } else { first = false; b.classList.remove('wob'); void b.offsetWidth; b.classList.add('wob'); beep('ko'); speak(target); }
  });
  play();
}

// ---------- Le mot intrus ----------
function gIntrus(round = 0, sc = { good: 0 }) {
  const TOTAL = 8;
  if (round >= TOTAL) return endGame('intrus', { n: starsFrom(sc.good, TOTAL), text: `<b>${sc.good}</b> intrus démasqués du premier coup sur ${TOTAL}.`, gain: sc.good });
  let steps = gameSteps().filter(s => s.ear && s.x);
  if (!steps.length) steps = STEPS.filter(s => s.ear && s.x).slice(0, 3);
  const st = pick(steps);
  const yes = shuffle(st.W).slice(0, 3);
  const no = pick(ALL_WORDS.filter(w => !st.x.test(w.p.toLowerCase()) && !yes.some(y => y.e === w.e)));
  const cards = shuffle([...yes, no]);
  let first = true;
  screen(`${gameTop('Le mot intrus', round, TOTAL)}
    <p class="inst">${esc(intrusSay(st))} <button class="mini" data-play aria-label="Écouter">🔊</button></p>
    <div class="intrus">${cards.map((w, k) => `<div class="icard" data-k="${k}"><span class="emo">${w.e}</span><span class="rd">${sylHTML(w.m)}</span><button class="mini" data-say="${k}" aria-label="Écouter le mot">🔊</button></div>`).join('')}</div>`);
  $('[data-play]').onclick = () => speak(intrusSay(st));
  $$('[data-say]').forEach(b => b.onclick = e => { e.stopPropagation(); speak(cards[+b.dataset.say].p); });
  $$('.icard').forEach(c => c.onclick = () => {
    const w = cards[+c.dataset.k];
    if (w === no) {
      c.classList.add('ok'); beep('ok'); if (first) { sc.good++; floatText(c, '+1 🪶'); }
      $$('.icard').forEach((o, k) => { if (cards[k] !== no) o.querySelector('.rd').innerHTML = hlHTML(cards[k].p, st.g); o.style.pointerEvents = 'none'; });
      speak(no.p).then(() => setTimeout(() => gIntrus(round + 1, sc), 900));
    } else { first = false; c.classList.remove('ko'); void c.offsetWidth; c.classList.add('ko'); beep('ko'); speak(w.p); }
  });
  speak(intrusSay(st));
}

// ---------- La syllabe perdue ----------
function gManque(round = 0, sc = { good: 0 }) {
  const TOTAL = 10;
  if (round >= TOTAL) return endGame('manque', { n: starsFrom(sc.good, TOTAL), text: `<b>${sc.good}</b> syllabes retrouvées du premier coup sur ${TOTAL}.`, gain: sc.good });
  const w = pick(gameWords(x => x.sy.length >= 2));
  const k = Math.floor(Math.random() * w.sy.length), good = w.sy[k];
  const opts = [good];
  for (let t = 0; t < 20 && opts.length < 3; t++) { const d = distractorSyl(w); if (!opts.includes(d)) opts.push(d); }
  let first = true;
  screen(`${gameTop('La syllabe perdue', round, TOTAL)}
    <p class="inst">${esc(GV.manque)}</p>
    <button class="pic small" data-play><span>${w.e}</span><small>🔊</small></button>
    <div class="slots rd">${w.sy.map((s, j) => j === k ? '<span class="slot" data-hole>?</span>' : `<span class="slot filled">${sylHTML(s, { n: j })}</span>`).join('')}</div>
    <div class="tiles-row">${shuffle(opts).map(o => `<button class="tile-syl rd" data-o="${esc(o)}">${sylHTML(o, { n: k })}</button>`).join('')}</div>`);
  $('[data-play]').onclick = () => speak(w.p);
  $$('.tile-syl').forEach(b => b.onclick = () => {
    if (b.dataset.o === good) {
      const hole = $('[data-hole]'); hole.innerHTML = sylHTML(good, { n: k }); hole.classList.add('filled');
      $('.slots').classList.add('ok'); b.classList.add('used'); beep('ok'); stat(w.p, first);
      if (first) { sc.good++; floatText(hole, '+1 🪶'); }
      $$('.tile-syl').forEach(x => { x.disabled = true; });
      speak(w.p).then(() => setTimeout(() => gManque(round + 1, sc), 500));
    } else { first = false; b.classList.remove('ko'); void b.offsetWidth; b.classList.add('ko'); beep('ko'); }
  });
  (round === 0 ? speak(GV.manque).then(ok => ok && speak(w.p)) : speak(w.p));
}

// ---------- La fusée du calcul (calcul mental) ----------
function mathQ(lv) {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const make = {
    CP: [() => { const a = r(1, 9); return [a, '+', r(1, 10 - a)]; }, () => { const a = r(2, 10); return [a, '−', r(1, a)]; }],
    CE1: [() => { const a = r(5, 15); return [a, '+', r(2, 20 - a)]; }, () => { const a = r(8, 20); return [a, '−', r(2, a - 2)]; }, () => [pick([2, 5, 10]), '×', r(1, 10)]],
    CE2: [() => [r(12, 60), '+', r(5, 39)], () => { const a = r(30, 99); return [a, '−', r(5, a - 10)]; }, () => [r(2, 5), '×', r(2, 10)], () => { const b = r(2, 5); return [b * r(2, 10), '÷', b]; }],
    CM1: [() => [r(100, 500), '+', r(15, 99)], () => [r(2, 9), '×', r(2, 10)], () => { const b = r(2, 9); return [b * r(2, 10), '÷', b]; }, () => [r(2, 99), '×', 10]],
    CM2: [() => [r(6, 9), '×', r(6, 12)], () => [r(2, 99), '×', pick([10, 100])], () => { const b = r(3, 9); return [b * r(3, 12), '÷', b]; }, () => { const a = r(200, 999); return [a, '−', r(50, 199)]; }],
  }[lv];
  const [a, op, b] = pick(make)();
  const res = mathResult(op, a, b);
  const opts = [res];
  for (const d of shuffle([1, -1, 2, -2, 10, -10, b, -b])) { const v = res + d; if (v >= 0 && !opts.includes(v)) opts.push(v); if (opts.length === 3) break; }
  return { a, op, b, res, opts: shuffle(opts) };
}
function gFusee(lv = null, round = 0, sc = { good: 0 }) {
  const TOTAL = 10, p = P();
  lv = lv || (p.level && p.level !== 'CP' ? p.level : 'CP');
  if (round >= TOTAL) {
    const r = $('.rocket'); if (r) r.classList.add('launch');
    speak(GV.moon);
    return setTimeout(() => endGame('fusee', { n: starsFrom(sc.good, TOTAL), text: `<b>${sc.good}</b> calculs justes du premier coup sur ${TOTAL} (${lv}).`, gain: sc.good }), 1400);
  }
  const q = mathQ(lv);
  let first = true, misses = 0;
  screen(`${topBar('La fusée du calcul', gamesHub)}
    ${round === 0 ? `<div class="seg lv">${LEVELS.map(l => `<button class="${l === lv ? 'on' : ''}" data-lv="${l}">${l}</button>`).join('')}</div>` : ''}
    <div class="sky"><span class="moon">🌙</span><span class="stars-bg">✦ · ✧ · ✦</span><span class="rocket" style="bottom:${Math.round(round / TOTAL * 78)}%">🚀</span></div>
    <div class="calc rd big">${q.a} ${q.op} ${q.b} = <span class="ans">?</span></div>
    <div class="opts">${q.opts.map(o => `<button class="card rd" data-o="${o}">${o}</button>`).join('')}</div>`);
  if (round === 0) speak(GV.fusee);
  $$('[data-lv]').forEach(b => b.onclick = () => gFusee(b.dataset.lv, 0, { good: 0 }));
  const all = $$('.card');
  all.forEach(b => b.onclick = () => {
    if (+b.dataset.o === q.res) {
      b.classList.add('ok'); all.forEach(x => { x.disabled = true; }); beep('ok');
      $('.ans').textContent = q.res; $('.ans').classList.add('good');
      if (first) { sc.good++; floatText(b, '+1 🪶'); }
      const rk = $('.rocket'); rk.style.bottom = Math.round((round + 1) / TOTAL * 78) + '%';
      setTimeout(() => gFusee(lv, round + 1, sc), 900);
    } else {
      first = false; misses++; b.classList.add('ko'); b.disabled = true; beep('ko');
      const rk = $('.rocket'); rk.classList.remove('shake'); void rk.offsetWidth; rk.classList.add('shake');
      if (misses >= 2) all.find(x => +x.dataset.o === q.res).classList.add('hint');
    }
  });
}

// ---------- Qui parle ? (conjugaison) ----------
function gQui(round = 0, sc = { good: 0 }, combos = null) {
  const TOTAL = 10;
  if (!combos) {
    const max = Math.max(1, LEVELS.indexOf(P().level || 'CE1'));
    combos = CONJ.filter(l => LEVELS.indexOf(l.level) <= max && !l.kinds.includes('tense') && !l.tenses.includes('ip'))
      .flatMap(l => l.verbs.flatMap(v => l.tenses.flatMap(t => personsOf(l).map(i => ({ v, t, i })))));
  }
  if (round >= TOTAL) return endGame('quiparle', { n: starsFrom(sc.good, TOTAL), text: `<b>${sc.good}</b> bonnes réponses du premier coup sur ${TOTAL}.`, gain: sc.good });
  const c = pick(combos), form = formOf(c.v, c.t, c.i);
  const goods = [0, 1, 2, 3, 4, 5].filter(j => formOf(c.v, c.t, j) === form);
  const LABELS = ["je / j'", 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
  let first = true;
  screen(`${gameTop('Qui parle ?', round, TOTAL)}
    <p class="inst">${esc(GV.quiparle)}</p>
    <div class="qform rd">… <b>${esc(form)}</b></div>
    <p class="note center"><span class="verb-tag">${esc(c.v)} · ${esc(TENSES[c.t].name)}</span></p>
    <div class="pronouns">${LABELS.map((l, j) => `<button class="card txt" data-j="${j}">${esc(l)}</button>`).join('')}</div>`);
  if (round === 0) speak(GV.quiparle);
  const all = $$('.pronouns .card');
  all.forEach(b => b.onclick = () => {
    const j = +b.dataset.j;
    if (goods.includes(j)) {
      b.classList.add('ok'); all.forEach(x => { x.disabled = true; }); beep('ok');
      if (first) { sc.good++; floatText(b, '+1 🪶'); }
      $('.qform').innerHTML = `${esc(subject(j, form))}<b>${esc(form)}</b>`;
      speak(conjLine(c.v, c.t, j)).then(() => setTimeout(() => gQui(round + 1, sc, combos), 500));
    } else { first = false; b.classList.add('ko'); b.disabled = true; beep('ko'); }
  });
}

// ======================= Jeux de logique =======================
Object.assign(GV, {
  suites: "Regarde bien la suite. Qu'est-ce qui vient après ?",
  monstre: "Glouton le monstre ne mange que l'intrus ! Trouve celui qui n'est pas de la même famille.",
  robot: "Aide le robot à aller jusqu'à sa pile. Choisis les flèches, puis appuie sur Go !",
  robotOops: "Oups ! Le robot n'est pas arrivé. Essaie encore !",
  robotWin: 'Bravo, le robot a trouvé sa pile !',
  sudoku: 'Chaque animal doit être une seule fois dans chaque ligne, chaque colonne et chaque carré.',
  sudokuWin: 'Grille terminée, bravo !',
});
const FAMILIES = {
  fruits: ['des fruits', ['🍎', '🍌', '🍇', '🍓', '🍐', '🍒', '🍑', '🍍']],
  legumes: ['des légumes', ['🥕', '🥦', '🌽', '🥒', '🍆', '🥔', '🧅', '🫑']],
  animaux: ['des animaux', ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐸']],
  mer: ['des animaux de la mer', ['🐟', '🐙', '🐬', '🦀', '🐳', '🦈', '🦑', '🐠']],
  ferme: ['des animaux de la ferme', ['🐄', '🐖', '🐑', '🐔', '🐴', '🦆', '🐐', '🐓']],
  vehicules: ['des véhicules', ['🚗', '🚌', '🚲', '✈️', '🚀', '🚂', '🛵', '⛵']],
  habits: ['des vêtements', ['👕', '👖', '👗', '🧦', '🧢', '👟', '🧤', '🧣']],
  ciel: ['des choses du ciel', ['☀️', '🌙', '⭐', '☁️', '🌈', '⚡', '🪐', '🌧️']],
  musique: ['des instruments de musique', ['🎸', '🎹', '🥁', '🎺', '🎻', '🪗', '🪘', '🎷']],
  sport: ['des ballons de sport', ['⚽', '🏀', '🎾', '🏈', '🏐', '🎱', '⚾', '🏉']],
};
// Familles proches (plus difficiles) pour la fin de la partie.
const CLOSE = [['fruits', 'legumes'], ['mer', 'ferme'], ['animaux', 'ferme'], ['animaux', 'mer']];
const familySay = k => `Les autres sont ${FAMILIES[k][0]}.`;

GAMES.splice(6, 0,
  { id: 'suites', e: '🔁', name: 'Les suites rigolotes', desc: 'Devine ce qui vient après', cat: 'Logique', run: () => gSuites() },
  { id: 'monstre', e: '👾', name: 'Glouton le monstre', desc: "Donne-lui l'intrus à manger", cat: 'Logique', run: () => gMonstre() },
  { id: 'robot', e: '🤖', name: 'Le robot perdu', desc: "Guide-le jusqu'à sa pile", cat: 'Logique', run: () => gRobot() },
  { id: 'sudoku', e: '🐾', name: 'Le sudoku des animaux', desc: 'Un animal par ligne et par colonne', cat: 'Logique', run: () => gSudoku() });
GAME_BY_ID.suites = GAMES[6]; GAME_BY_ID.monstre = GAMES[7]; GAME_BY_ID.robot = GAMES[8]; GAME_BY_ID.sudoku = GAMES[9];
DAILY_IDS.push('suites', 'monstre', 'robot', 'sudoku');

// ---------- Les suites rigolotes ----------
const SUITE_SETS = [['🍎', '🍌', '🍇', '🍓'], ['🐶', '🐱', '🐭', '🐰'], ['🔴', '🔵', '🟡', '🟢'], ['⭐', '🌙', '☀️', '☁️'], ['🚗', '🚲', '✈️', '🚀'], ['🐸', '🦋', '🐝', '🐞']];
function gSuites(round = 0, sc = { good: 0 }) {
  const TOTAL = 8;
  if (round >= TOTAL) return endGame('suites', { n: starsFrom(sc.good, TOTAL), text: `<b>${sc.good}</b> suites trouvées du premier coup sur ${TOTAL}.`, gain: sc.good });
  // Motifs de plus en plus difficiles : AB → ABC / AAB → ABB / ABCD → AABB / ABAC
  const units = [[[0, 1]], [[0, 1, 2], [0, 0, 1]], [[0, 1, 1], [0, 1, 2, 3]], [[0, 0, 1, 1], [0, 1, 0, 2], [0, 1, 2, 2]]][Math.min(3, Math.floor(round / 2))];
  const unit = pick(units), set = shuffle(pick(SUITE_SETS));
  const len = Math.max(6, unit.length * 2 + 1 + (round % 2));
  const seq = Array.from({ length: len + 1 }, (_, k) => set[unit[k % unit.length]]);
  const answer = seq[len], shown = seq.slice(0, len);
  const used = [...new Set(unit)].map(k => set[k]);
  const opts = shuffle([...new Set([...used, ...set])].slice(0, Math.max(3, used.length)));
  let first = true;
  screen(`${gameTop('Les suites rigolotes', round, TOTAL)}
    <p class="inst">${esc(GV.suites)}</p>
    <div class="suite">${shown.map((e, k) => `<span style="animation-delay:${k * 0.08}s">${e}</span>`).join('')}<span class="q-mark">?</span></div>
    <div class="opts emo">${opts.map(e => `<button class="card emo" data-o="${e}">${e}</button>`).join('')}</div>`);
  if (round === 0) speak(GV.suites);
  const all = $$('.card');
  all.forEach(b => b.onclick = () => {
    if (b.dataset.o === answer) {
      b.classList.add('ok'); all.forEach(x => { x.disabled = true; }); beep('ok');
      const q = $('.q-mark'); q.textContent = answer; q.classList.add('found');
      if (first) { sc.good++; floatText(b, '+1 🪶'); }
      setTimeout(() => gSuites(round + 1, sc), 1000);
    } else { first = false; b.classList.add('ko'); b.disabled = true; beep('ko'); }
  });
}

// ---------- Glouton le monstre ----------
function gMonstre(round = 0, sc = { good: 0 }) {
  const TOTAL = 8;
  if (round >= TOTAL) return endGame('monstre', { n: starsFrom(sc.good, TOTAL), text: `Glouton a mangé <b>${sc.good}</b> intrus du premier coup sur ${TOTAL}. Miam !`, gain: sc.good });
  const keys = Object.keys(FAMILIES);
  const [a, b] = round >= 5 ? shuffle(pick(CLOSE)) : shuffle(keys).slice(0, 2);
  const three = shuffle(FAMILIES[a][1]).slice(0, 3), odd = pick(FAMILIES[b][1]);
  const items = shuffle([...three, odd]);
  let first = true;
  screen(`${gameTop('Glouton le monstre', round, TOTAL)}
    <p class="inst">${esc(GV.monstre)}</p>
    <div class="monster"><span class="mouth">👾</span><span class="m-bubble">J'ai faim !</span></div>
    <div class="opts emo four">${items.map(e => `<button class="card emo" data-o="${e}">${e}</button>`).join('')}</div>
    <p class="fam rd"></p>`);
  if (round === 0) speak(GV.monstre);
  const all = $$('.card');
  all.forEach(bt => bt.onclick = () => {
    if (bt.dataset.o === odd) {
      all.forEach(x => { x.disabled = true; }); beep('ok');
      if (first) { sc.good++; floatText(bt, '+1 🪶'); }
      bt.classList.add('eaten');
      const m = $('.monster'); m.classList.add('chomp'); $('.m-bubble').textContent = 'Miam miam !';
      $('.fam').textContent = familySay(a);
      speak(familySay(a)).then(() => setTimeout(() => gMonstre(round + 1, sc), 500));
    } else {
      first = false; bt.classList.add('ko'); bt.disabled = true; beep('ko');
      $('.m-bubble').textContent = 'Beurk, pas ça !';
    }
  });
}

// ---------- Le robot perdu (programmer avec des flèches) ----------
const DIRS = { up: [0, -1, '⬆️'], down: [0, 1, '⬇️'], left: [-1, 0, '⬅️'], right: [1, 0, '➡️'] };
function robotLevel(k) {
  const N = 5;
  for (let t = 0; t < 500; t++) {
    const rocks = new Set(), cell = () => [Math.floor(Math.random() * N), Math.floor(Math.random() * N)];
    const s = cell(), g = cell();
    for (let r = 0; r < 3 + k; r++) { const c = cell(); rocks.add(c.join(',')); }
    rocks.delete(s.join(',')); rocks.delete(g.join(','));
    // plus court chemin (parcours en largeur)
    const dist = { [s.join(',')]: 0 }, q = [s];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || rocks.has(key) || key in dist) continue;
        dist[key] = dist[x + ',' + y] + 1; q.push([nx, ny]);
      }
    }
    const d = dist[g.join(',')];
    if (d >= k + 2 && d <= k + 4) return { N, s, g, rocks, best: d };
  }
  return robotLevel(Math.max(0, k - 1));
}
function gRobot(level = 0, sc = { misses: 0 }) {
  const TOTAL = 5;
  if (level >= TOTAL) {
    const n = sc.misses <= 1 ? 3 : sc.misses <= 4 ? 2 : 1;
    return endGame('robot', { n, text: `Le robot a trouvé ${TOTAL} piles${sc.misses ? ` (${sc.misses} essai${sc.misses > 1 ? 's' : ''} raté${sc.misses > 1 ? 's' : ''})` : ' sans se tromper'} !`, gain: 8 - Math.min(4, sc.misses) });
  }
  const L = robotLevel(level), prog = [];
  let running = false;
  screen(`${gameTop('Le robot perdu', level, TOTAL)}
    <p class="inst">${esc(GV.robot)}</p>
    <div class="rgrid">${Array.from({ length: L.N * L.N }, (_, k) => { const x = k % L.N, y = Math.floor(k / L.N), key = x + ',' + y;
      return `<span class="rc">${L.rocks.has(key) ? '🪨' : x === L.g[0] && y === L.g[1] ? '🔋' : ''}</span>`; }).join('')}
      <span class="robot" style="--x:${L.s[0]};--y:${L.s[1]}">🤖</span></div>
    <div class="prog" data-prog><span class="ph">Ton programme : touche les flèches</span></div>
    <div class="arrows">${Object.entries(DIRS).map(([k, d]) => `<button class="key" data-d="${k}">${d[2]}</button>`).join('')}
      <button class="key" data-undo aria-label="Effacer">↩️</button><button class="key okk" data-go>Go !</button></div>`);
  if (level === 0) speak(GV.robot);
  const robot = $('.robot'), progEl = $('[data-prog]');
  const draw = () => { progEl.innerHTML = prog.length ? prog.map(d => `<span>${DIRS[d][2]}</span>`).join('') : '<span class="ph">Ton programme : touche les flèches</span>'; };
  const place = ([x, y]) => { robot.style.setProperty('--x', x); robot.style.setProperty('--y', y); };
  $$('[data-d]').forEach(b => b.onclick = () => { if (running || prog.length >= 14) return; prog.push(b.dataset.d); beep('tap'); draw(); });
  $('[data-undo]').onclick = () => { if (running) return; prog.pop(); draw(); };
  $('[data-go]').onclick = async () => {
    if (running || !prog.length) return;
    running = true;
    let [x, y] = L.s, crash = false;
    const chips = [...progEl.children];
    for (let k = 0; k < prog.length; k++) {
      chips.forEach((c, j) => c.classList.toggle('now', j === k));
      const [dx, dy] = DIRS[prog[k]], nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= L.N || ny >= L.N || L.rocks.has(nx + ',' + ny)) { crash = true; break; }
      x = nx; y = ny; place([x, y]); beep('pad' + (k % 4));
      await new Promise(r => setTimeout(r, 380));
      if (!document.body.contains(robot)) return;
    }
    if (!crash && x === L.g[0] && y === L.g[1]) {
      beep('win'); robot.classList.add('happy'); confetti(25);
      if (prog.length === L.best) toast('⚡ Chemin le plus court !');
      speak(GV.robotWin).then(() => gRobot(level + 1, sc));
    } else {
      sc.misses++; beep('ko'); robot.classList.remove('shake'); void robot.offsetWidth; robot.classList.add('shake');
      speak(GV.robotOops);
      setTimeout(() => { place(L.s); chips.forEach(c => c.classList.remove('now')); running = false; }, 900);
    }
  };
}

// ---------- Le sudoku des animaux (4 × 4) ----------
const SUDOKU_ANIMALS = ['🐶', '🐱', '🐰', '🐸'];
function sudokuGrid() {
  let g = [[0, 1, 2, 3], [2, 3, 0, 1], [1, 0, 3, 2], [3, 2, 1, 0]];
  const perm = shuffle([0, 1, 2, 3]);
  g = g.map(r => r.map(v => perm[v]));
  if (Math.random() < 0.5) g = [g[1], g[0], g[2], g[3]];
  if (Math.random() < 0.5) g = [g[0], g[1], g[3], g[2]];
  if (Math.random() < 0.5) g = [g[2], g[3], g[0], g[1]];
  if (Math.random() < 0.5) g = g[0].map((_, c) => g.map(r => r[c]));
  if (Math.random() < 0.5) g = g.map(r => [r[1], r[0], r[2], r[3]]);
  return g;
}
function sudokuSolutions(cells, limit = 2) {
  const i = cells.indexOf(null);
  if (i < 0) return 1;
  const r = Math.floor(i / 4), c = i % 4;
  let n = 0;
  for (let v = 0; v < 4 && n < limit; v++) {
    let ok = true;
    for (let k = 0; k < 4 && ok; k++) {
      if (cells[r * 4 + k] === v || cells[k * 4 + c] === v) ok = false;
      const br = Math.floor(r / 2) * 2 + Math.floor(k / 2), bc = Math.floor(c / 2) * 2 + (k % 2);
      if (cells[br * 4 + bc] === v) ok = false;
    }
    if (ok) { cells[i] = v; n += sudokuSolutions(cells, limit - n); cells[i] = null; }
  }
  return n;
}
function gSudoku(round = 0, sc = { errs: 0 }) {
  const TOTAL = 3, HOLES = [5, 7, 9];
  if (round >= TOTAL) {
    const n = sc.errs <= 1 ? 3 : sc.errs <= 4 ? 2 : 1;
    return endGame('sudoku', { n, text: `${TOTAL} grilles terminées avec <b>${sc.errs}</b> erreur${sc.errs > 1 ? 's' : ''}.`, gain: 9 - Math.min(5, sc.errs) });
  }
  const sol = sudokuGrid().flat();
  let cells;
  for (let t = 0; t < 50; t++) {
    cells = sol.slice();
    shuffle([...Array(16).keys()]).slice(0, HOLES[round]).forEach(k => { cells[k] = null; });
    if (sudokuSolutions(cells.slice()) === 1) break;
  }
  let sel = cells.indexOf(null);
  screen(`${gameTop('Le sudoku des animaux', round, TOTAL)}
    <p class="inst small">${esc(GV.sudoku)}</p>
    <div class="sudoku">${cells.map((v, k) => `<button class="sc ${v === null ? 'empty' : 'given'}" data-k="${k}" ${v === null ? '' : 'disabled'}>${v === null ? '' : SUDOKU_ANIMALS[v]}</button>`).join('')}</div>
    <div class="opts emo four">${SUDOKU_ANIMALS.map((a, v) => `<button class="card emo" data-v="${v}">${a}</button>`).join('')}</div>`);
  if (round === 0) speak(GV.sudoku);
  const btns = $$('.sc');
  const mark = () => btns.forEach((b, k) => b.classList.toggle('sel', k === sel));
  mark();
  btns.forEach(b => b.onclick = () => { sel = +b.dataset.k; beep('tap'); mark(); });
  $$('[data-v]').forEach(b => b.onclick = () => {
    if (sel < 0 || cells[sel] !== null) return;
    const v = +b.dataset.v, cell = btns[sel];
    if (v === sol[sel]) {
      cells[sel] = v; cell.textContent = SUDOKU_ANIMALS[v]; cell.disabled = true; cell.classList.remove('empty', 'sel'); cell.classList.add('ok'); beep('ok');
      sel = cells.indexOf(null); mark();
      if (sel < 0) { beep('win'); confetti(30); speak(GV.sudokuWin).then(() => gSudoku(round + 1, sc)); }
    } else {
      sc.errs++; beep('ko'); cell.textContent = SUDOKU_ANIMALS[v]; cell.classList.remove('shake'); void cell.offsetWidth; cell.classList.add('shake', 'bad');
      setTimeout(() => { if (cells[sel] === null) { cell.textContent = ''; cell.classList.remove('bad'); } }, 700);
    }
  });
}
