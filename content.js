// Plume — contenu pédagogique (lecture en français, niveau CP → CE1).
//
// Écriture des mots et des phrases :
//   - les syllabes sont séparées par un tiret   : « la-pin »
//   - les lettres muettes sont entre parenthèses : « lou(p) », « jou(ent) »
// L'appli s'en sert pour la coloration syllabique et pour griser les lettres muettes.
// Les mots ont un emoji qui doit être unique (sauf pour un même mot répété dans deux étapes).

const WORLDS = [
  { id: 'w1', name: 'Les premières lettres', e: '🌱', color: '#6BBF8A' },
  { id: 'w2', name: 'Les sons qui chantent', e: '🎵', color: '#F2A65A' },
  { id: 'w3', name: 'Les sons malins', e: '✨', color: '#8C7AE6' },
  { id: 'w4', name: 'Les sons experts (CE1)', e: '🏅', color: '#4FA3D1' },
];

// g   : graphies à surligner dans les mots
// say : phrase de présentation dite par Plume
// ear : fin de la question « Est-ce que tu entends … ? »
// x   : un mot contenant ces lettres ne peut pas servir d'exemple « non » (je n'entends pas)
// syl : syllabes à écouter / choisir (facultatif)
// words : [mot découpé, emoji]
// sentences : [phrase découpée, question, [bonne réponse, autre, autre]]
const STEPS = [
  { id: 'l', world: 'w1', title: 'l', g: ['l'], x: /l/,
    say: "La lettre l. On l'entend dans : lune, lit, lama.", ear: 'le son de la lettre l',
    syl: ['la', 'li', 'lo', 'lu', 'lé', 'lou'],
    words: [['lu-ne', '🌙'], ['li(t)', '🛏️'], ['la-ma', '🦙'], ['li-on', '🦁'], ['la-pin', '🐰'], ['li-vre', '📖']],
    sentences: [
      ['Le la-ma li(t) un li-vre.', 'Qui lit ?', ['🦙', '🦁', '🐰']],
      ['La lu-ne bril-le sur le li(t).', "Qu'est-ce qui brille ?", ['🌙', '🦁', '📖']],
    ] },
  { id: 'm', world: 'w1', title: 'm', g: ['m'], x: /m/,
    say: "La lettre m. On l'entend dans : moto, melon, mur.", ear: 'le son de la lettre m',
    syl: ['ma', 'mi', 'mo', 'mu', 'mé', 'mou'],
    words: [['mo-to', '🏍️'], ['mur', '🧱'], ['me-lon', '🍈'], ['pom-me', '🍎'], ['plu-me', '🪶'], ['mou-ton', '🐑']],
    sentences: [
      ['Ma-man a u-ne mo-to.', "Qu'a maman ?", ['🏍️', '🍎', '🐑']],
      ['Le mou-ton man-ge u-ne pom-me.', 'Que mange le mouton ?', ['🍎', '🍈', '🪶']],
    ] },
  { id: 'r', world: 'w1', title: 'r', g: ['r'], x: /r/,
    say: "La lettre r. On l'entend dans : rat, rose, robe.", ear: 'le son de la lettre r',
    syl: ['ra', 'ri', 'ro', 'ru', 'ré', 'rou'],
    words: [['ra(t)', '🐀'], ['ro-se', '🌹'], ['ro-be', '👗'], ['ri(z)', '🍚'], ['re-nar(d)', '🦊'], ['ra-di-o', '📻']],
    sentences: [
      ['Le re-nar(d) a u-ne ro-se.', 'Qui a une rose ?', ['🦊', '🐀', '🦁']],
      ['Le ra(t) man-ge du ri(z).', 'Que mange le rat ?', ['🍚', '🌹', '🍎']],
    ] },
  { id: 's', world: 'w1', title: 's', g: ['s'], x: /s|c[eiéèy]|ç|x|z/,
    say: "La lettre s. On l'entend dans : sac, salade, sapin.", ear: 'le son de la lettre s',
    syl: ['sa', 'si', 'so', 'su', 'sé', 'sou'],
    words: [['sac', '🎒'], ['sa-la-de', '🥗'], ['sel', '🧂'], ['si-rè-ne', '🧜‍♀️'], ['sa-pin', '🎄'], ['ser-pen(t)', '🐍']],
    sentences: [
      ['Le ser-pen(t) est dans le sac.', 'Où est le serpent ?', ['🎒', '🎄', '🥗']],
      ['La si-rè-ne man-ge u-ne sa-la-de.', 'Qui mange ?', ['🧜‍♀️', '🐍', '🦊']],
    ] },
  { id: 'p', world: 'w1', title: 'p', g: ['p'], x: /p/,
    say: "La lettre p. On l'entend dans : panda, pirate, poule.", ear: 'le son de la lettre p',
    syl: ['pa', 'pi', 'po', 'pu', 'pé', 'pou'],
    words: [['pan-da', '🐼'], ['pi-ra-te', '🏴‍☠️'], ['pou-le', '🐔'], ['pie(d)', '🦶'], ['pi-a-no', '🎹'], ['pa-ra-plui(e)', '☂️']],
    sentences: [
      ['Le pan-da jou(e) du pi-a-no.', 'Qui joue du piano ?', ['🐼', '🐔', '🏴‍☠️']],
      ['La pou-le est sous le pa-ra-plui(e).', 'Où est la poule ?', ['☂️', '🎹', '🦶']],
    ] },
  { id: 't', world: 'w1', title: 't', g: ['t'], x: /t/,
    say: "La lettre t. On l'entend dans : tortue, tomate, tigre.", ear: 'le son de la lettre t',
    syl: ['ta', 'ti', 'to', 'tu', 'té', 'tou'],
    words: [['tor-tu(e)', '🐢'], ['to-ma-te', '🍅'], ['tas-se', '☕'], ['ti-gre', '🐯'], ['ten-te', '⛺'], ['té-lé-pho-ne', '📞']],
    sentences: [
      ['La tor-tu(e) est dans la ten-te.', 'Où est la tortue ?', ['⛺', '☕', '📞']],
      ['Le ti-gre man-ge u-ne to-ma-te.', 'Que mange le tigre ?', ['🍅', '☕', '🍎']],
    ] },
  { id: 'v', world: 'w1', title: 'v', g: ['v'], x: /v|w/,
    say: "La lettre v. On l'entend dans : vache, vélo, valise.", ear: 'le son de la lettre v',
    syl: ['va', 'vi', 'vo', 'vu', 'vé', 'vou'],
    words: [['va-che', '🐄'], ['vé-lo', '🚲'], ['va-li-se', '🧳'], ['vol-can', '🌋'], ['vi-o-lon', '🎻'], ['a-vi-on', '✈️']],
    sentences: [
      ['La va-che est sur un vé-lo.', 'Qui est sur le vélo ?', ['🐄', '🐯', '🐼']],
      ["Lé-a pren(d) l'a-vi-on a-vec sa va-li-se.", 'Que prend Léa ?', ['✈️', '🚲', '🌋']],
    ] },
  { id: 'f', world: 'w1', title: 'f', g: ['f', 'ph'], x: /f|ph/,
    say: "La lettre f. On l'entend dans : feu, fusée, fée.", ear: 'le son de la lettre f',
    syl: ['fa', 'fi', 'fo', 'fu', 'fé', 'fou'],
    words: [['feu', '🔥'], ['fu-sée', '🚀'], ['fée', '🧚'], ['frai-se', '🍓'], ['fleur', '🌸'], ['four-mi', '🐜']],
    sentences: [
      ['La fée a u-ne fleur.', "Qu'a la fée ?", ['🌸', '🍓', '🔥']],
      ['La four-mi man-ge u-ne frai-se.', 'Qui mange la fraise ?', ['🐜', '🧚', '🚀']],
    ] },

  { id: 'ou', world: 'w2', title: 'ou', g: ['ou', 'où'], x: /ou|où/,
    say: "Le son ou. On l'entend dans : loup, poule, roue.", ear: 'le son ou',
    syl: ['lou', 'mou', 'chou', 'fou', 'sou', 'pou'],
    words: [['lou(p)', '🐺'], ['pou-le', '🐔'], ['roue', '🛞'], ['mou-che', '🪰'], ['bou-che', '👄'], ['(h)i-bou', '🦉']],
    sentences: [
      ['Le (h)i-bou re-gar-de le lou(p).', 'Qui regarde le loup ?', ['🦉', '🐔', '🪰']],
      ['La mou-che est sur la roue.', 'Où est la mouche ?', ['🛞', '👄', '🐺']],
    ] },
  { id: 'on', world: 'w2', title: 'on', g: ['on', 'om'], x: /on|om/,
    say: "Le son on. On l'entend dans : mouton, ballon, pont.", ear: 'le son on',
    syl: ['lon', 'mon', 'ron', 'ton', 'bon', 'son'],
    words: [['mou-ton', '🐑'], ['bal-lon', '🎈'], ['pon(t)', '🌉'], ['bon-bon', '🍬'], ['ci-tron', '🍋'], ['li-on', '🦁']],
    sentences: [
      ['Le mou-ton jou(e) au bal-lon.', 'Avec quoi joue le mouton ?', ['🎈', '🍬', '🍋']],
      ['Le li-on man-ge un bon-bon.', 'Qui mange un bonbon ?', ['🦁', '🐑', '🐼']],
    ] },
  { id: 'an', world: 'w2', title: 'an en', g: ['an', 'am', 'en', 'em'], x: /an|am|en|em/,
    say: "Le son an. On l'écrit a, n, ou bien e, n. On l'entend dans : dent, éléphant, pantalon.", ear: 'le son an',
    syl: ['lan', 'man', 'ran', 'pan', 'ten', 'ven'],
    words: [['den(t)', '🦷'], ['é-lé-phan(t)', '🐘'], ['pan-ta-lon', '👖'], ['ser-pen(t)', '🐍'], ['en-fan(t)', '🧒'], ['an-ge', '👼']],
    sentences: [
      ["L'é-lé-phan(t) a u-ne gran-de den(t).", 'Qui a une grande dent ?', ['🐘', '🐍', '👼']],
      ["L'en-fan(t) me(t) son pan-ta-lon.", "Que met l'enfant ?", ['👖', '🦷', '🎒']],
    ] },
  { id: 'ch', world: 'w2', title: 'ch', g: ['ch'], x: /ch|sh/,
    say: 'Les lettres c et h, ensemble, font le son de : chat, chien, cheval.', ear: 'le même son que dans chat',
    syl: ['cha', 'chi', 'cho', 'chu', 'ché', 'chou'],
    words: [['cha(t)', '🐱'], ['chien', '🐶'], ['che-val', '🐴'], ['chaus-su-re', '👟'], ['cho-co-la(t)', '🍫'], ['co-chon', '🐷']],
    sentences: [
      ['Le cha(t) et le chien man-g(ent) du cho-co-la(t).', 'Que mangent-ils ?', ['🍫', '🍎', '🍚']],
      ['Le co-chon est sur le che-val.', 'Où est le cochon ?', ['🐴', '👟', '🐱']],
    ] },
  { id: 'b', world: 'w2', title: 'b', g: ['b'], x: /b/,
    say: "La lettre b. On l'entend dans : bateau, bébé, ballon.", ear: 'le son de la lettre b',
    syl: ['ba', 'bi', 'bo', 'bu', 'bé', 'bou'],
    words: [['ba-teau', '⛵'], ['bé-bé', '👶'], ['bal-lon', '🎈'], ['bi-be-ron', '🍼'], ['bus', '🚌'], ['ba-na-ne', '🍌']],
    sentences: [
      ['Le bé-bé boi(t) son bi-be-ron.', 'Qui boit ?', ['👶', '🐱', '🐼']],
      ['Il y a u-ne ba-na-ne dans le bus.', 'Que voit-on dans le bus ?', ['🍌', '🎈', '⛵']],
    ] },
  { id: 'd', world: 'w2', title: 'd', g: ['d'], x: /d/,
    say: "La lettre d. On l'entend dans : dauphin, dé, dragon.", ear: 'le son de la lettre d',
    syl: ['da', 'di', 'do', 'du', 'dé', 'dou'],
    words: [['dau-phin', '🐬'], ['dé', '🎲'], ['dra-gon', '🐉'], ['di-no-sau-re', '🦕'], ['ca-deau', '🎁'], ['dou-che', '🚿']],
    sentences: [
      ['Le dra-gon ou-vre un ca-deau.', 'Qui ouvre le cadeau ?', ['🐉', '🐬', '🦕']],
      ['Le dau-phin jou(e) a-vec un dé.', 'Avec quoi joue le dauphin ?', ['🎲', '🎁', '🚿']],
    ] },
  { id: 'oi', world: 'w2', title: 'oi', g: ['oi'], x: /oi|oy/,
    say: 'Les lettres o et i, ensemble, font le son de : roi, poisson, étoile.', ear: 'le même son que dans roi',
    syl: ['loi', 'moi', 'roi', 'toi', 'poi', 'voi'],
    words: [['roi', '🤴'], ['pois-son', '🐟'], ['é-toi-le', '⭐'], ['voi-tu-re', '🚗'], ['oi-seau', '🐦'], ['poi-re', '🍐']],
    sentences: [
      ['Le roi a u-ne voi-tu-re.', "Qu'a le roi ?", ['🚗', '🐟', '⭐']],
      ["L'oi-seau re-gar-de les é-toi-le(s).", "Que regarde l'oiseau ?", ['⭐', '🍐', '🤴']],
    ] },

  { id: 'e', world: 'w3', title: 'é è', g: ['é', 'è', 'ê'], x: /[eéèêë]|ai|ei/,
    say: "Les sons é et è. On les entend dans : épée, fusée, chèvre, zèbre.", ear: 'le son é ou le son è',
    syl: ['bé', 'fé', 'té', 'lè', 'mè', 'chè'],
    words: [['é-pée', '🗡️'], ['fu-sée', '🚀'], ['é-toi-le', '⭐'], ['chè-vre', '🐐'], ['zè-bre', '🦓'], ['flè-che', '🏹']],
    sentences: [
      ['Le zè-bre et la chè-vre re-gar-d(ent) la fu-sée.', 'Que regardent-ils ?', ['🚀', '🏹', '🗡️']],
      ['Le pi-ra-te a u-ne é-pée.', "Qu'a le pirate ?", ['🗡️', '🏹', '⭐']],
    ] },
  { id: 'au', world: 'w3', title: 'au eau', g: ['eau', 'au'], x: /o|au|ô/,
    say: "Le son o peut s'écrire a, u, ou bien e, a, u. On l'entend dans : bateau, gâteau, chapeau.", ear: 'le son o',
    syl: ['lau', 'mau', 'peau', 'teau', 'deau', 'chau'],
    words: [['ba-teau', '⛵'], ['gâ-teau', '🎂'], ['cha-peau', '🎩'], ['ca-deau', '🎁'], ['jau-ne', '🟡'], ['châ-teau', '🏰']],
    sentences: [
      ['Il y a un gâ-teau dans le châ-teau.', 'Que voit-on dans le château ?', ['🎂', '🎩', '⛵']],
      ['Le cha-peau est jau-ne.', 'De quelle couleur est le chapeau ?', ['🟡', '🔵', '🔴']],
    ] },
  { id: 'in', world: 'w3', title: 'in ain', g: ['ain', 'ein', 'in', 'im'], x: /in|im|ain|ein|un|um/,
    say: 'Les lettres i et n font le son de : lapin, sapin, pain.', ear: 'le même son que dans lapin',
    syl: ['lin', 'pin', 'rain', 'main', 'sin', 'vin'],
    words: [['la-pin', '🐰'], ['sa-pin', '🎄'], ['pain', '🍞'], ['main', '✋'], ['train', '🚆'], ['rai-sin', '🍇']],
    sentences: [
      ['Le la-pin man-ge du pain.', 'Que mange le lapin ?', ['🍞', '🍇', '🎄']],
      ['Ma main tien(t) du rai-sin.', 'Que tient la main ?', ['🍇', '🍞', '🚆']],
    ] },
  { id: 'eu', world: 'w3', title: 'eu', g: ['œu', 'eu'], x: /e|œ/,
    say: 'Les lettres e et u font le son de : feu, fleur, cœur.', ear: 'le même son que dans feu',
    syl: ['feu', 'peu', 'jeu', 'bleu', 'deux', 'nœud'],
    words: [['feu', '🔥'], ['fleur', '🌸'], ['cœur', '❤️'], ['œuf', '🥚'], ['bleu', '🔵'], ['deu(x)', '2️⃣']],
    sentences: [
      ['Le cœur est rou-ge et la fleur est bleu(e).', 'De quelle couleur est la fleur ?', ['🔵', '🔴', '🟡']],
      ['La pou-le a fai(t) un œuf.', "Qu'a fait la poule ?", ['🥚', '🔥', '🌸']],
    ] },
  { id: 'gn', world: 'w3', title: 'gn', g: ['gn'], x: /gn|ni/,
    say: 'Les lettres g et n, ensemble, font le son de : montagne, araignée, champignon.', ear: 'le même son que dans montagne',
    syl: ['gna', 'gne', 'gno', 'gnon', 'gni', 'gnée'],
    words: [['mon-ta-gne', '⛰️'], ['a-rai-gnée', '🕷️'], ['cham-pi-gnon', '🍄'], ['cy-gne', '🦢'], ['pei-gne', '🪮'], ['a-gneau', '🐏']],
    sentences: [
      ["L'a-rai-gnée est sur le cham-pi-gnon.", "Où est l'araignée ?", ['🍄', '⛰️', '🦢']],
      ['Le cy-gne na-ge prè(s) de la mon-ta-gne.', 'Qui nage ?', ['🦢', '🕷️', '🐏']],
    ] },
  { id: 'ill', world: 'w3', title: 'ill eil', g: ['ill', 'eil', 'euil'], x: /il|y|i[aeéèoou]/,
    say: "Les lettres i, l, l font le son qu'on entend dans : abeille, soleil, papillon.", ear: 'le même son que dans abeille',
    syl: null,
    words: [['a-bei-lle', '🐝'], ['so-leil', '☀️'], ['pa-pi-llon', '🦋'], ['che-ni-lle', '🐛'], ['feui-lle', '🍃'], ['o-rei-lle', '👂']],
    sentences: [
      ["L'a-bei-lle et le pa-pi-llon ai-m(ent) le so-leil.", 'Qui aime le soleil ?', ['🐝', '🐛', '👂']],
      ['La che-ni-lle man-ge u-ne feui-lle.', 'Que mange la chenille ?', ['🍃', '☀️', '🍎']],
    ] },

  { id: 'c', world: 'w4', title: 'ce ci ç', g: ['ç', 'ce', 'ci', 'cé'], x: null,
    say: 'Devant e et i, la lettre c fait le son s. Avec une cédille, ç fait aussi le son s : citron, glaçon, cerise.', ear: null,
    syl: ['ca', 'ça', 'ce', 'ci', 'co', 'cé'],
    words: [['ci-tron', '🍋'], ['gla-çon', '🧊'], ['ce-ri-se', '🍒'], ['gar-çon', '👦'], ['pou-ce', '👍'], ['gla-ce', '🍦']],
    sentences: [
      ['Le gar-çon man-ge u-ne gla-ce.', 'Que mange le garçon ?', ['🍦', '🍒', '🍋']],
      ['Il y a un gla-çon dans le ci-tron.', 'Que voit-on dans le citron ?', ['🧊', '👍', '🍦']],
    ] },
  { id: 'g', world: 'w4', title: 'ge gi', g: ['ge', 'gi', 'gé'], x: null,
    say: 'Devant e et i, la lettre g fait le son j : girafe, orange, bougie.', ear: null,
    syl: ['ga', 'ge', 'gi', 'go', 'gu', 'gé'],
    words: [['gi-ra-fe', '🦒'], ['o-ran-ge', '🍊'], ['ma-gi-cien', '🧙'], ['bou-gie', '🕯️'], ['nei-ge', '❄️'], ['plon-geur', '🤿']],
    sentences: [
      ['La gi-ra-fe man-ge u-ne o-ran-ge.', 'Que mange la girafe ?', ['🍊', '🕯️', '🍋']],
      ['Le ma-gi-cien al-lu-me u-ne bou-gie.', 'Qui allume la bougie ?', ['🧙', '🦒', '🤿']],
    ] },
  { id: 'z', world: 'w4', title: 's = z', g: ['s'], x: /s|z/,
    say: 'Entre deux voyelles, la lettre s fait le son z : maison, chaise, vase.', ear: 'le son z',
    syl: ['sa', 'za', 'so', 'zo', 'si', 'zi'],
    words: [['mai-son', '🏠'], ['chai-se', '🪑'], ['va-se', '🏺'], ['ci-seau(x)', '✂️'], ['ro-se', '🌹'], ['oi-seau', '🐦']],
    sentences: [
      ["L'oi-seau est sur la chai-se.", "Où est l'oiseau ?", ['🪑', '🏠', '🏺']],
      ['Il y a u-ne ro-se dans le va-se.', 'Que voit-on dans le vase ?', ['🌹', '✂️', '🐦']],
    ] },
  { id: 'er', world: 'w4', title: 'er ez et', g: ['er', 'ez', 'et'], x: /[eéèêë]|ai/,
    say: "À la fin d'un mot, e, r, ou bien e, z, ou bien e, t, font souvent le son é : panier, nez, jouet.", ear: 'le son é',
    syl: null,
    words: [['pa-nier', '🧺'], ['nez', '👃'], ['ro-cher', '🪨'], ['ca-hier', '📓'], ['jou-et', '🧸'], ['clo-cher', '⛪']],
    sentences: [
      ['Le jou-et est dans le pa-nier.', 'Où est le jouet ?', ['🧺', '📓', '🪨']],
      ['Le ca-hier est sur le ro-cher.', "Qu'y a-t-il sur le rocher ?", ['📓', '🧸', '👃']],
    ] },
];

// Petites histoires pour lire à voix haute (fluence) puis répondre.
const STORIES = [
  { id: 'h1', level: 'CP', title: 'Plume et la lune', e: '🌙',
    lines: [
      'Plu-me est u-ne pe-ti-te chou-et-te.',
      'La nui(t), el-le re-gar-de la lu-ne.',
      'La lu-ne est ron-de et blan-che.',
      "Plu-me vo-le jus-qu'à la lu-ne.",
      'Mais la lu-ne est trop loin !',
      'Plu-me ren-tre dans son ar-bre et fai(t) do-do.',
    ],
    questions: [['Qui est Plume ?', ['🦉', '🐱', '🐰']], ['Que regarde Plume ?', ['🌙', '☀️', '🌈']]] },
  { id: 'h2', level: 'CP', title: 'Le gâteau de Léo', e: '🎂',
    lines: [
      "Lé-o a sep(t) ans au-jour-d'hui.",
      'Sa ma-man fai(t) un gro(s) gâ-teau.',
      'Il y a des frai-se(s) et du cho-co-la(t).',
      'Lé-o souf-fle les bou-gie(s).',
      'Tous ses a-mis chan-t(ent).',
      'Quel-le bel-le fê-te !',
    ],
    questions: [['Que fait maman ?', ['🎂', '🍕', '🍞']], ['Quel âge a Léo ?', ['7️⃣', '5️⃣', '9️⃣']]] },
  { id: 'h3', level: 'CP', title: 'Le chat et la souris', e: '🐭',
    lines: [
      'Un pe-ti(t) cha(t) gri(s) dor(t) sur le ta-pi(s).',
      'U-ne sou-ri(s) pas-se sans brui(t).',
      'Le cha(t) ou-vre un œil.',
      'La sou-ri(s) cour(t) vi-te dans son trou.',
      'Le cha(t) se ren-dor(t).',
    ],
    questions: [['Qui passe sans bruit ?', ['🐭', '🐱', '🐶']], ['Où va la souris ?', ['🕳️', '🌳', '🏠']]] },
  { id: 'h4', level: 'CE1', title: 'À la plage', e: '🏖️',
    lines: [
      'Il fai(t) chau(d).',
      'Ni-na va à la pla-ge.',
      'El-le na-ge dans la mer bleu(e).',
      'Puis el-le fai(t) un châ-teau de sa-ble.',
      'U-ne va-gue ar-ri-ve…',
      'Oups ! Le châ-teau a dis-pa-ru !',
    ],
    questions: [['Que fait Nina avec le sable ?', ['🏰', '🎂', '🚗']], ['Quel temps fait-il ?', ['☀️', '🌧️', '❄️']]] },
  { id: 'h5', level: 'CE1', title: 'Le dragon gentil', e: '🐲',
    lines: [
      'Dans la mon-ta-gne vi(t) un dra-gon ver(t).',
      'Il ne cra-che pas de feu.',
      'Il ai-me les fleur(s) et les pa-pi-llon(s).',
      'Les en-fan(ts) jou(ent) a-vec lui.',
      "C'est le dra-gon le plu(s) gen-til du mon-de !",
    ],
    questions: [['Où vit le dragon ?', ['⛰️', '🌊', '🏙️']], ["Qu'aime le dragon ?", ['🌸', '🔥', '🍕']]] },
  { id: 'h6', level: 'CE1', title: 'La course', e: '🐢',
    lines: [
      'La tor-tu(e) et le la-pin fon(t) u-ne cour-se.',
      'Le la-pin cour(t) trè(s) vi-te.',
      "Il s'ar-rê-te pour dor-mir sous un ar-bre.",
      'La tor-tu(e) a-van-ce dou-ce-men(t).',
      'El-le pas-se la li-gne la pre-miè-re !',
      'Bra-vo, la tor-tu(e) !',
    ],
    questions: [["Qui dort sous l'arbre ?", ['🐰', '🐢', '🦉']], ['Qui gagne la course ?', ['🐢', '🐰', '🦊']]] },

  // À partir du CE2 : textes plus longs, sans découpage (les mots sont colorés un sur deux).
  { id: 'h7', level: 'CE2', raw: true, title: 'Le secret du grenier', e: '🗝️',
    lines: [
      'Chez sa grand-mère, Tom monte au grenier.',
      'Il fait sombre et ça sent la poussière.',
      'Au fond, sous une vieille couverture, il trouve une malle en bois.',
      "Tom soulève le couvercle avec précaution.",
      "Dedans, il découvre des lettres, une boussole et une photo d'un garçon qui lui ressemble beaucoup.",
      "Grand-mère sourit : « C'est ton grand-père, quand il avait ton âge. »",
    ],
    questions: [
      ['Où se passe l\'histoire ?', ['Dans un grenier', 'Dans une cave', 'À l\'école']],
      ['Que trouve Tom dans la malle ?', ['Des lettres, une boussole et une photo', 'Des jouets et des livres', 'Des vêtements']],
      ['Qui est le garçon sur la photo ?', ['Le grand-père de Tom', 'Le frère de Tom', 'Un voisin']],
    ] },
  { id: 'h8', level: 'CE2', raw: true, title: 'Mila et le chien perdu', e: '🐕',
    lines: [
      'En rentrant de l\'école, Mila entend un petit gémissement derrière une haie.',
      'Elle s\'approche doucement et découvre un chien tout mouillé.',
      'Il porte un collier rouge avec un numéro de téléphone.',
      'Mila court chez elle et demande à son papa d\'appeler.',
      'Une heure plus tard, une dame arrive en pleurant de joie.',
      '« Merci ! Cela fait trois jours que je cherche Biscuit ! »',
    ],
    questions: [
      ['Pourquoi Mila s\'approche-t-elle de la haie ?', ['Elle entend un gémissement', 'Elle cherche son ballon', 'Elle veut se cacher']],
      ['Comment retrouve-t-on la maîtresse du chien ?', ['Grâce au numéro sur le collier', 'Grâce à une affiche', 'Par hasard dans la rue']],
      ['Comment s\'appelle le chien ?', ['Biscuit', 'Caramel', 'Mila']],
    ] },
  { id: 'h9', level: 'CM1', raw: true, title: 'La tempête', e: '⛈️',
    lines: [
      'Ce soir-là, le vent soufflait si fort que les volets claquaient contre les murs.',
      'Inès et son petit frère s\'étaient réfugiés sous la grande table de la cuisine.',
      'Soudain, toutes les lumières s\'éteignirent.',
      'Leur mère alluma une lampe de poche et sortit un vieux jeu de cartes.',
      '« Puisque la tempête ne veut pas dormir, nous non plus ! » dit-elle en riant.',
      'Ils jouèrent jusqu\'à minuit, et Inès ne pensa plus du tout à avoir peur.',
      'Le lendemain matin, le jardin était couvert de branches, mais le ciel était bleu.',
    ],
    questions: [
      ['Pourquoi les lumières s\'éteignent-elles ?', ['À cause de la tempête', 'Parce que la mère les éteint', 'Parce qu\'il est minuit']],
      ['Que propose la mère ?', ['De jouer aux cartes', 'D\'aller dormir', 'De sortir dans le jardin']],
      ['Comment se sent Inès à la fin de la soirée ?', ['Elle n\'a plus peur', 'Elle est très en colère', 'Elle pleure']],
    ] },
  { id: 'h10', level: 'CM1', raw: true, title: "L'invention de Sacha", e: '🔧',
    lines: [
      'Sacha en avait assez de ranger sa chambre chaque samedi.',
      'Un jour, il décida de construire une machine pour le faire à sa place.',
      'Il assembla un vieux balai, une boîte à chaussures et le moteur d\'une petite voiture.',
      'Quand il appuya sur le bouton, la machine se mit à tourner dans tous les sens.',
      'Elle renversa la poubelle, fit tomber les livres et éparpilla les crayons !',
      'Sacha éclata de rire : sa chambre n\'avait jamais été aussi en désordre.',
      'Ce samedi-là, il rangea plus longtemps que d\'habitude… mais il avait déjà une nouvelle idée.',
    ],
    questions: [
      ['Pourquoi Sacha construit-il une machine ?', ['Pour ranger sa chambre', 'Pour gagner un concours', 'Pour jouer avec son chat']],
      ['Que fait la machine ?', ['Elle met encore plus de désordre', 'Elle range parfaitement', 'Elle ne démarre pas']],
      ['Que montre la dernière phrase sur Sacha ?', ['Il ne se décourage pas', 'Il est triste', 'Il ne veut plus inventer']],
    ] },
  { id: 'h11', level: 'CM2', raw: true, title: "Le carnet de l'explorateur", e: '🧭',
    lines: [
      "Le 3 mars. Depuis notre départ, nous remontons le fleuve sur une étroite pirogue.",
      "La forêt est si dense que la lumière du soleil atteint à peine l'eau.",
      "Ce matin, notre guide nous a fait signe de nous taire : un jaguar buvait sur la rive.",
      "Nous sommes restés immobiles pendant de longues minutes, le cœur battant.",
      "L'animal nous a observés, puis il a disparu entre les arbres sans un bruit.",
      "J'ai noté chaque détail dans ce carnet, car personne ne me croira à mon retour.",
      "Demain, si la pluie le permet, nous atteindrons enfin le village que nous cherchons.",
    ],
    questions: [
      ['Comment les explorateurs voyagent-ils ?', ['En pirogue sur un fleuve', 'À cheval', 'En avion']],
      ['Pourquoi le guide demande-t-il le silence ?', ['Un jaguar boit sur la rive', 'Il entend un orage', 'Il veut dormir']],
      ['Pourquoi l\'explorateur écrit-il tout dans son carnet ?', ['Il pense qu\'on ne le croira pas', 'Son professeur le lui demande', 'Il a perdu son appareil photo']],
    ] },
  { id: 'h12', level: 'CM2', raw: true, title: 'Une nuit au musée', e: '🏛️',
    lines: [
      "Pour la sortie de fin d'année, la classe de CM2 avait obtenu un privilège rare : dormir au musée d'histoire naturelle.",
      "Après la visite, les élèves déroulèrent leurs sacs de couchage sous l'immense squelette d'un dinosaure.",
      "Vers minuit, Jade fut réveillée par un léger grincement.",
      "Elle alluma sa lampe et aperçut une ombre qui se déplaçait lentement entre les vitrines.",
      "Retenant son souffle, elle s'approcha… et découvrit le gardien, qui faisait sa ronde en chaussons.",
      "Le lendemain, toute la classe rit de l'aventure, mais Jade jura qu'elle avait eu très peur.",
    ],
    questions: [
      ['Où dorment les élèves ?', ['Au musée, sous un squelette de dinosaure', 'Dans un camping', 'À l\'école']],
      ['Qui était l\'ombre ?', ['Le gardien du musée', 'Un dinosaure', 'La maîtresse']],
      ['Que ressent Jade pendant la nuit ?', ['De la peur', 'De la colère', "De l'ennui"]],
    ] },
];

// Lettres jumelles : sons que l'on confond souvent.
const PAIRS = [
  { id: 'bd', a: 'b', b: 'd', vowels: ['a', 'i', 'o', 'u', 'é', 'ou', 'on'] },
  { id: 'pb', a: 'p', b: 'b', vowels: ['a', 'i', 'o', 'u', 'é', 'ou', 'on'] },
  { id: 'td', a: 't', b: 'd', vowels: ['a', 'i', 'o', 'u', 'é', 'ou', 'on'] },
  { id: 'fv', a: 'f', b: 'v', vowels: ['a', 'i', 'o', 'u', 'é', 'ou', 'on'] },
  { id: 'chj', a: 'ch', b: 'j', vowels: ['a', 'o', 'u', 'é', 'ou', 'on'] },
  { id: 'mn', a: 'm', b: 'n', vowels: ['a', 'i', 'o', 'u', 'é', 'ou', 'on'] },
  { id: 'ouon', a: 'ou', b: 'on', cons: ['l', 'm', 'b', 't', 's', 'p'] },
  { id: 'anon', a: 'an', b: 'on', cons: ['l', 'm', 'b', 't', 's', 'p'] },
];
const pairSyllables = p => p.vowels
  ? p.vowels.map(v => [p.a + v, p.b + v])
  : p.cons.map(c => [c + p.a, c + p.b]);

// Texte découpé → texte normal (« lou(p) » → « loup »). Les textes « raw » ne sont pas découpés.
const plain = (m, raw) => (raw ? m : m.replace(/[-()]/g, ''));
const splitTok = tok => { const r = tok.match(/^([«"]*)(.*?)([.,!?;:»"…]*)$/); return { pre: r[1], core: r[2], post: r[3] }; };
const sayTokens = (m, raw) => m.split(' ').map(t => plain(splitTok(t).core, raw)).filter(t => /[a-zàâçéèêëîïôûùüœ]/i.test(t));

// Tout ce que Plume dit en dehors du contenu (enregistré aussi en audio).
const VOICE = {
  hello: "Coucou ! C'est moi, Plume. On lit ensemble ?",
  listenChoose: 'Écoute, et touche la bonne syllabe.',
  readWord: 'Lis le mot, puis touche la bonne image.',
  build: 'Écoute, et range les syllabes dans le bon ordre.',
  flash: 'Regarde bien le mot. Il va disparaître !',
  flashQ: 'Quel mot as-tu vu ?',
  sentence: 'Lis la phrase, puis réponds à la question.',
  twins: 'Écoute bien, et choisis ce que tu entends.',
  end: 'Bravo ! Tu as fini ta séance !',
  pause: "C'est l'heure d'une petite pause !",
  breatheIn: 'Inspire…',
  breatheOut: 'Expire…',
  simon: 'Regarde bien, puis refais la même suite.',
  storyQ: "Maintenant, réponds aux questions sur l'histoire.",
  yes: 'Oui !', no: 'Non !',
};
const CHEERS = ['Bravo !', 'Super !', 'Très bien !', 'Génial !', 'Parfait !', 'Tu y arrives !'];
const OOPS = ['Essaie encore.', 'Presque ! Regarde bien.', 'Pas grave, on réessaie.'];
const HUNT_LETTERS = [['b', 'd', 'p', 'q'], ['d', 'b', 'p', 'q'], ['p', 'q', 'b', 'd'], ['q', 'p', 'd', 'b'], ['m', 'n', 'u', 'w'], ['n', 'u', 'm', 'h']];
const huntSay = l => `Touche toutes les lettres ${l}.`;
const earSay = st => `Écoute bien. Est-ce que tu entends ${st.ear} ?`;
