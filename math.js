// Plume — mathématiques : petits problèmes (énoncés simples), du CP au CM2.
// Démarche : 1) lire ou écouter l'énoncé, 2) choisir l'opération, 3) calculer et taper la réponse.
// [énoncé, emoji, opération, a, b, unité de la réponse]
const MATH = {
  CP: [
    ['Léo a 3 billes. Il en gagne 2. Combien de billes a-t-il maintenant ?', '🔵', '+', 3, 2, 'billes'],
    ["Il y a 7 oiseaux sur un arbre. 3 oiseaux s'envolent. Combien d'oiseaux reste-t-il ?", '🐦', '−', 7, 3, 'oiseaux'],
    ['Nina a 4 bonbons rouges et 5 bonbons verts. Combien de bonbons a-t-elle en tout ?', '🍬', '+', 4, 5, 'bonbons'],
    ['Dans un panier, il y a 10 pommes. Maman en prend 4. Combien de pommes reste-t-il ?', '🍎', '−', 10, 4, 'pommes'],
    ['Tom a 6 petites voitures. Son ami lui en donne 6. Combien de voitures a-t-il ?', '🚗', '+', 6, 6, 'voitures'],
    ["Il y a 9 enfants dans le bus. 2 enfants descendent. Combien d'enfants reste-t-il ?", '🧒', '−', 9, 2, 'enfants'],
  ],
  CE1: [
    ['Une boîte contient 25 crayons. On en ajoute 13. Combien y a-t-il de crayons dans la boîte ?', '✏️', '+', 25, 13, 'crayons'],
    ['Lila a 50 centimes. Elle achète un bonbon à 20 centimes. Combien lui reste-t-il ?', '🪙', '−', 50, 20, 'centimes'],
    ['Il y a 3 tables. Sur chaque table, il y a 4 gâteaux. Combien de gâteaux y a-t-il en tout ?', '🧁', '×', 3, 4, 'gâteaux'],
    ["Dans la classe, il y a 14 filles et 12 garçons. Combien d'élèves y a-t-il ?", '🎒', '+', 14, 12, 'élèves'],
    ['Le livre de Paul a 30 pages. Il en a déjà lu 18. Combien de pages lui reste-t-il à lire ?', '📖', '−', 30, 18, 'pages'],
    ["Une poule pond 2 œufs par jour. Combien d'œufs pond-elle en 5 jours ?", '🥚', '×', 2, 5, 'œufs'],
  ],
  CE2: [
    ["Une école a 4 classes de 25 élèves. Combien d'élèves y a-t-il dans l'école ?", '🏫', '×', 4, 25, 'élèves'],
    ['Sami a 120 images. Il en donne 45 à sa sœur. Combien lui en reste-t-il ?', '🃏', '−', 120, 45, 'images'],
    ['On partage 24 bonbons entre 4 enfants. Combien de bonbons chaque enfant reçoit-il ?', '🍬', '÷', 24, 4, 'bonbons'],
    ['Un livre coûte 8 euros. Combien coûtent 6 livres ?', '📚', '×', 8, 6, 'euros'],
    ["Le matin, un fermier ramasse 136 œufs. L'après-midi, il en ramasse 58. Combien d'œufs a-t-il ramassés dans la journée ?", '🧺', '+', 136, 58, 'œufs'],
    ['Un train part avec 250 voyageurs. À la gare, 80 voyageurs descendent. Combien de voyageurs reste-t-il ?', '🚆', '−', 250, 80, 'voyageurs'],
  ],
  CM1: [
    ['Un cinéma a 18 rangées de 12 fauteuils. Combien de fauteuils y a-t-il ?', '🎬', '×', 18, 12, 'fauteuils'],
    ['Un fleuriste a 96 roses. Il fait des bouquets de 8 roses. Combien de bouquets peut-il faire ?', '🌹', '÷', 96, 8, 'bouquets'],
    ['Emma avait 1250 euros. Elle dépense 380 euros. Combien lui reste-t-il ?', '💶', '−', 1250, 380, 'euros'],
    ['Une randonnée fait 14 kilomètres le premier jour et 17 kilomètres le deuxième jour. Quelle distance a-t-on parcourue ?', '🥾', '+', 14, 17, 'kilomètres'],
    ['Un paquet de jus de fruits coûte 9 euros. Combien coûtent 5 paquets ?', '🧃', '×', 9, 5, 'euros'],
    ['Une classe de 28 élèves part en sortie. On fait des groupes de 4. Combien de groupes y a-t-il ?', '👥', '÷', 28, 4, 'groupes'],
  ],
  CM2: [
    ['Un avion transporte 245 passagers à chaque vol. Il fait 4 vols par jour. Combien de passagers transporte-t-il par jour ?', '✈️', '×', 245, 4, 'passagers'],
    ['Une bibliothèque a 1500 livres. 375 livres sont empruntés. Combien de livres restent sur les étagères ?', '📚', '−', 1500, 375, 'livres'],
    ['On range 144 œufs dans des boîtes de 12. Combien de boîtes remplit-on ?', '🥚', '÷', 144, 12, 'boîtes'],
    ['Un vélo coûte 320 euros et un casque coûte 45 euros. Combien paie-t-on pour les deux ?', '🚲', '+', 320, 45, 'euros'],
    ['Une voiture roule à 90 kilomètres par heure. Quelle distance parcourt-elle en 3 heures ?', '🚗', '×', 90, 3, 'kilomètres'],
    ['Trois amis se partagent 75 euros en parts égales. Combien chacun reçoit-il ?', '💶', '÷', 75, 3, 'euros'],
  ],
};
const MATH_OPS = { CP: ['+', '−'], CE1: ['+', '−', '×'], CE2: ['+', '−', '×', '÷'], CM1: ['+', '−', '×', '÷'], CM2: ['+', '−', '×', '÷'] };
const OP_NAME = { '+': 'une addition', '−': 'une soustraction', '×': 'une multiplication', '÷': 'une division' };
const mathResult = (op, a, b) => ({ '+': a + b, '−': a - b, '×': a * b, '÷': a / b })[op];
const mathAnswerSay = p => `La réponse est ${mathResult(p[2], p[3], p[4])} ${p[5]}.`;
const MATH_VOICE = {
  op: 'Lis bien le problème. Quelle opération faut-il faire ?',
  calc: 'Calcule, puis tape ta réponse.',
  opHint: "Relis le problème : est-ce qu'on ajoute, qu'on enlève, qu'on répète ou qu'on partage ?",
};
