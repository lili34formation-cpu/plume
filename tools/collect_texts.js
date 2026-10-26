#!/usr/bin/env node
// Liste tout ce que Plume peut lire à voix haute → tools/texts.json : [[« fr-FR », texte], ...]
// Usage : node tools/collect_texts.js
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const src = ['content.js', 'conj.js', 'math.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
eval(src + '\nObject.assign(globalThis, { STEPS, STORIES, PAIRS, VOICE, CHEERS, OOPS, HUNT_LETTERS, CONJ, CONJ_VOICE, MATH, MATH_VOICE, OP_NAME, TENSES, PRONOUNS, plain, sayTokens, earSay, huntSay, pairSyllables, conjSentence, conjBare, formOf, subject, cap, personsOf, mathAnswerSay });');

const out = new Set();
const add = t => { if (t && String(t).trim()) out.add(String(t).trim()); };
const addText = (m, raw) => { add(plain(m, raw)); sayTokens(m, raw).forEach(add); };

Object.values(VOICE).forEach(add); CHEERS.forEach(add); OOPS.forEach(add);
add("Oui, c'est ça !");
for (const st of STEPS) {
  add(st.say); if (st.ear) add(earSay(st));
  (st.syl || []).forEach(add);
  st.words.forEach(([m]) => add(plain(m)));
  st.sentences.forEach(([m, q]) => { addText(m); add(q); });
}
for (const s of STORIES) { s.lines.forEach(l => addText(l, s.raw)); s.questions.forEach(([q, a]) => { add(q); a.filter(x => /[a-zà-ü]/i.test(x)).forEach(add); }); }
PAIRS.forEach(p => pairSyllables(p).flat().forEach(add));
HUNT_LETTERS.forEach(set => add(huntSay(set[0])));
['Le la-pin man-ge du pain. La pou-le est sous le pa-ra-plui(e).'].forEach(m => addText(m));

Object.values(CONJ_VOICE).forEach(add);
for (const l of CONJ) for (const v of l.verbs) for (const t of l.tenses) for (const i of personsOf(l)) {
  add(conjSentence(v, t, i));
  if (l.kinds.includes('tense')) add(conjBare(v, t, i));
  const f = formOf(v, t, i); add(t === 'ip' ? cap(f) + ' !' : subject(i, f) + f);
}
Object.values(MATH_VOICE).forEach(add);
Object.values(OP_NAME).forEach(n => add(`Oui, c'est ${n} !`));
for (const lv of Object.keys(MATH)) for (const p of MATH[lv]) { add(p[0]); sayTokens(p[0], true).forEach(add); add(mathAnswerSay(p)); }

const list = [...out].map(t => ['fr-FR', t]);
fs.writeFileSync(path.join(root, 'tools', 'texts.json'), JSON.stringify(list));
console.log(list.length, 'textes');
