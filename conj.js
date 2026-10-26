// Plume — conjugaison (CE1 → CM2) : moteur de conjugaison + leçons.
// Les verbes réguliers (-er, -ir comme finir) sont calculés, les verbes irréguliers sont décrits à la main.

const PRONOUNS = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];
const END = {
  imp: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
  fut: ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
  cond: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
};
// pr : présent · fs : radical du futur · is : radical de l'imparfait · ps : passé simple · pp : participe passé
const IRREG = {
  'être': { pr: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], fs: 'ser', is: 'ét', ps: ['fus', 'fus', 'fut', 'fûmes', 'fûtes', 'furent'], pp: 'été', ip: ['sois', 'soyons', 'soyez'] },
  avoir: { pr: ['ai', 'as', 'a', 'avons', 'avez', 'ont'], fs: 'aur', is: 'av', ps: ['eus', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent'], pp: 'eu', ip: ['aie', 'ayons', 'ayez'] },
  aller: { pr: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'], fs: 'ir', is: 'all', ps: ['allai', 'allas', 'alla', 'allâmes', 'allâtes', 'allèrent'], pp: 'allé', ip: ['va', 'allons', 'allez'] },
  faire: { pr: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'], fs: 'fer', is: 'fais', ps: ['fis', 'fis', 'fit', 'fîmes', 'fîtes', 'firent'], pp: 'fait' },
  dire: { pr: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'], fs: 'dir', is: 'dis', ps: ['dis', 'dis', 'dit', 'dîmes', 'dîtes', 'dirent'], pp: 'dit' },
  venir: { pr: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'], fs: 'viendr', is: 'ven', ps: ['vins', 'vins', 'vint', 'vînmes', 'vîntes', 'vinrent'], pp: 'venu' },
  pouvoir: { pr: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'], fs: 'pourr', is: 'pouv', ps: ['pus', 'pus', 'put', 'pûmes', 'pûtes', 'purent'], pp: 'pu' },
  voir: { pr: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'], fs: 'verr', is: 'voy', ps: ['vis', 'vis', 'vit', 'vîmes', 'vîtes', 'virent'], pp: 'vu' },
  vouloir: { pr: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'], fs: 'voudr', is: 'voul', ps: ['voulus', 'voulus', 'voulut', 'voulûmes', 'voulûtes', 'voulurent'], pp: 'voulu' },
  prendre: { pr: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'], fs: 'prendr', is: 'pren', ps: ['pris', 'pris', 'prit', 'prîmes', 'prîtes', 'prirent'], pp: 'pris' },
};
const WITH_ETRE = ['aller', 'venir', 'arriver', 'tomber'];
// Complément utilisé pour faire une vraie phrase avec chaque verbe.
const VERB_CPL = {
  'être': 'à la maison', avoir: 'un chat', chanter: 'une chanson', jouer: 'au ballon', parler: 'avec Plume', danser: 'dans le salon',
  regarder: 'les étoiles', aller: "à l'école", faire: 'un gâteau', dire: 'bonjour', venir: 'à la fête', pouvoir: 'sauter très haut',
  voir: 'la mer', vouloir: 'un bonbon', prendre: 'le bus', finir: 'le dessin', grandir: 'très vite', choisir: 'un livre',
  arriver: 'en avance', tomber: 'dans la neige',
};
const TENSES = {
  pr: { name: 'présent', when: "Aujourd'hui,", time: 'present' },
  fut: { name: 'futur', when: 'Demain,', time: 'future' },
  imp: { name: 'imparfait', when: 'Autrefois,', time: 'past' },
  pc: { name: 'passé composé', when: 'Hier,', time: 'past' },
  ps: { name: 'passé simple', when: 'Il y a très longtemps,', time: 'past' },
  pqp: { name: 'plus-que-parfait', when: 'La veille,', time: 'past' },
  fa: { name: 'futur antérieur', when: 'Avant ce soir,', time: 'future' },
  cond: { name: 'conditionnel présent', when: 'Avec plus de temps,', time: null },
  ip: { name: 'impératif', when: '', time: null },
};

const group = v => (IRREG[v] ? 3 : v.endsWith('er') ? 1 : 2);
function simple(v, t) {
  const irr = IRREG[v], g = group(v), r = v.slice(0, -2);
  if (t === 'pr') return irr ? irr.pr : g === 1 ? ['e', 'es', 'e', 'ons', 'ez', 'ent'].map(e => r + e) : ['is', 'is', 'it', 'issons', 'issez', 'issent'].map(e => r + e);
  if (t === 'imp') return END.imp.map(e => (irr ? irr.is : g === 1 ? r : r + 'iss') + e);
  if (t === 'fut' || t === 'cond') return END[t].map(e => (irr ? irr.fs : v) + e);
  if (t === 'ps') return irr ? irr.ps : g === 1 ? ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'].map(e => r + e) : ['is', 'is', 'it', 'îmes', 'îtes', 'irent'].map(e => r + e);
  if (t === 'ip') {
    if (irr && irr.ip) return irr.ip;
    const pr = simple(v, 'pr');
    return [g === 1 ? pr[1].replace(/s$/, '') : pr[1], pr[3], pr[4]];
  }
  return null;
}
const participle = v => (IRREG[v] ? IRREG[v].pp : group(v) === 1 ? v.slice(0, -2) + 'é' : v.slice(0, -2) + 'i');
// Formes conjuguées sans pronom, pour les 6 personnes (3 pour l'impératif : tu, nous, vous).
function conjugate(v, t) {
  const auxT = { pc: 'pr', pqp: 'imp', fa: 'fut' }[t];
  if (!auxT) return simple(v, t);
  const etre = WITH_ETRE.includes(v), aux = simple(etre ? 'être' : 'avoir', auxT), pp = participle(v);
  return aux.map((a, i) => `${a} ${pp}${etre && i >= 3 ? 's' : ''}`);
}
const IP_PERSONS = [1, 3, 4];
// « je » devient « j' » devant une voyelle.
const subject = (i, form) => (i === 0 && /^[aeéèêiouyh]/i.test(form) ? "j'" : PRONOUNS[i] + ' ');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
// Phrase complète, par exemple « Demain, nous chanterons une chanson. »
function conjSentence(v, t, i) {
  const forms = conjugate(v, t);
  if (t === 'ip') return `${cap(forms[IP_PERSONS.indexOf(i)])} ${VERB_CPL[v]} !`;
  const f = forms[i], when = TENSES[t].when;
  const core = subject(i, f) + f + ' ' + VERB_CPL[v] + '.';
  return when ? `${when} ${core}` : cap(core);
}
// Même phrase sans le mot de temps (« Nous chanterons une chanson. »), pour reconnaître le temps.
function conjBare(v, t, i) { const f = formOf(v, t, i); return cap(subject(i, f) + f + ' ' + VERB_CPL[v] + '.'); }
const formOf = (v, t, i) => (t === 'ip' ? conjugate(v, t)[IP_PERSONS.indexOf(i)] : conjugate(v, t)[i]);
const personsOf = l => l.persons || (l.tenses.includes('ip') ? IP_PERSONS : [0, 1, 2, 3, 4, 5]);

// Leçons, rangées par classe. kinds : form (choisir la forme), ending (choisir la terminaison), tense (reconnaître le temps).
const CONJ = [
  { id: 'c1', level: 'CE1', title: 'Être et avoir au présent', verbs: ['être', 'avoir'], tenses: ['pr'], kinds: ['form'] },
  { id: 'c2', level: 'CE1', title: 'Les verbes en -er au présent', verbs: ['chanter', 'jouer', 'parler', 'danser', 'regarder'], tenses: ['pr'], kinds: ['form', 'ending'] },
  { id: 'c3', level: 'CE1', title: 'Aller, faire, dire, venir au présent', verbs: ['aller', 'faire', 'dire', 'venir'], tenses: ['pr'], kinds: ['form'] },
  { id: 'c4', level: 'CE1', title: 'Le futur', verbs: ['chanter', 'jouer', 'être', 'avoir'], tenses: ['fut'], kinds: ['form', 'ending'] },
  { id: 'c5', level: 'CE1', title: 'Le passé composé avec avoir', verbs: ['chanter', 'jouer', 'regarder'], tenses: ['pc'], kinds: ['form'] },
  { id: 'c6', level: 'CE1', title: 'Passé, présent ou futur ?', verbs: ['chanter', 'jouer', 'être', 'avoir'], tenses: ['pr', 'fut', 'pc'], kinds: ['tense'], timeline: true },
  { id: 'c7', level: 'CE2', title: 'Pouvoir, voir, vouloir, prendre au présent', verbs: ['pouvoir', 'voir', 'vouloir', 'prendre'], tenses: ['pr'], kinds: ['form'] },
  { id: 'c8', level: 'CE2', title: 'Les verbes comme finir au présent', verbs: ['finir', 'grandir', 'choisir'], tenses: ['pr'], kinds: ['form', 'ending'] },
  { id: 'c9', level: 'CE2', title: "L'imparfait", verbs: ['chanter', 'finir', 'être', 'avoir', 'faire'], tenses: ['imp'], kinds: ['form', 'ending'] },
  { id: 'c10', level: 'CE2', title: 'Le futur des verbes fréquents', verbs: ['finir', 'aller', 'faire', 'venir', 'pouvoir', 'voir'], tenses: ['fut'], kinds: ['form'] },
  { id: 'c11', level: 'CE2', title: 'Le passé composé avec être', verbs: ['aller', 'venir', 'arriver', 'tomber'], tenses: ['pc'], kinds: ['form'] },
  { id: 'c12', level: 'CE2', title: 'Passé, présent ou futur ? (CE2)', verbs: ['finir', 'faire', 'aller', 'prendre'], tenses: ['pr', 'imp', 'fut', 'pc'], kinds: ['tense'], timeline: true },
  { id: 'c13', level: 'CM1', title: 'Le passé simple (il, ils)', verbs: ['chanter', 'finir', 'être', 'avoir', 'faire', 'prendre'], tenses: ['ps'], persons: [2, 5], kinds: ['form'] },
  { id: 'c14', level: 'CM1', title: "L'impératif", verbs: ['chanter', 'jouer', 'finir', 'faire', 'prendre', 'venir', 'aller', 'être'], tenses: ['ip'], kinds: ['form'] },
  { id: 'c15', level: 'CM1', title: 'Quel temps ? (CM1)', verbs: ['chanter', 'finir', 'faire', 'prendre'], tenses: ['pr', 'imp', 'fut', 'pc'], kinds: ['tense'] },
  { id: 'c16', level: 'CM2', title: 'Le passé simple (toutes les personnes)', verbs: ['chanter', 'finir', 'être', 'avoir', 'faire', 'venir'], tenses: ['ps'], kinds: ['form'] },
  { id: 'c17', level: 'CM2', title: 'Le plus-que-parfait', verbs: ['chanter', 'finir', 'faire', 'aller', 'prendre'], tenses: ['pqp'], kinds: ['form'] },
  { id: 'c18', level: 'CM2', title: 'Le futur antérieur', verbs: ['chanter', 'finir', 'faire', 'venir', 'prendre'], tenses: ['fa'], kinds: ['form'] },
  { id: 'c19', level: 'CM2', title: 'Le conditionnel présent', verbs: ['chanter', 'finir', 'être', 'avoir', 'vouloir', 'pouvoir'], tenses: ['cond'], kinds: ['form', 'ending'] },
  { id: 'c20', level: 'CM2', title: 'Quel temps ? (grand mélange)', verbs: ['chanter', 'finir', 'faire', 'venir'], tenses: ['imp', 'ps', 'pc', 'pqp', 'fut', 'fa', 'cond'], kinds: ['tense'] },
];
const LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];
const CONJ_VOICE = {
  form: 'Choisis la bonne forme du verbe.',
  ending: 'Choisis la bonne terminaison.',
  timeline: 'Cette phrase parle du passé, du présent ou du futur ?',
  tense: 'À quel temps est le verbe ?',
  table: 'Voici le tableau. Touche une ligne pour l\'écouter.',
};
