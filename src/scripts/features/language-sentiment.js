const EN_W = [
  "the",
  "is",
  "are",
  "you",
  "i",
  "my",
  "for",
  "please",
  "help",
  "how",
  "why",
  "can",
  "want",
  "need",
  "bill",
  "account",
  "service",
  "thank",
  "yes",
  "no",
  "good",
  "hello",
  "this",
  "that",
  "have",
];
const TL_W = [
  "ako",
  "ang",
  "ng",
  "sa",
  "po",
  "opo",
  "hindi",
  "oo",
  "salamat",
  "paano",
  "bakit",
  "magkano",
  "kailangan",
  "gusto",
  "ayaw",
  "meron",
  "wala",
  "kasi",
  "pero",
  "yung",
  "naman",
  "lang",
  "talaga",
  "sige",
  "mataas",
  "bayad",
  "reklamo",
  "tulong",
  "ninyo",
  "namin",
];
const CEB_W = [
  "ako",
  "ang",
  "sa",
  "og",
  "ug",
  "nako",
  "nimo",
  "niya",
  "unsa",
  "asa",
  "kinsa",
  "ngano",
  "pila",
  "gusto",
  "dili",
  "oo",
  "palihug",
  "salamat",
  "kaayo",
  "naa",
  "wala",
  "kay",
  "lang",
  "gyud",
  "jud",
  "bayad",
  "tabang",
  "maayo",
  "unsaon",
];
const HIL_W = [
  "ako",
  "ang",
  "sang",
  "sa",
  "kag",
  "niya",
  "ano",
  "diin",
  "ngaa",
  "pila",
  "gusto",
  "indi",
  "huo",
  "palihug",
  "salamat",
  "gid",
  "ini",
  "may",
  "wala",
  "kay",
  "lang",
  "bayad",
  "bulig",
  "maayo",
  "kamusta",
  "subong",
  "ikaw",
];
const ILO_W = [
  "siak",
  "ti",
  "iti",
  "ken",
  "dagiti",
  "haan",
  "saan",
  "wen",
  "agyaman",
  "kasano",
  "apay",
  "mano",
  "kayat",
  "tulong",
  "ania",
  "sadino",
  "adda",
  "awan",
  "daytoy",
  "ditoy",
  "naimbag",
  "dakkel",
  "bayad",
  "apo",
];
const WAR_W = [
  "ako",
  "an",
  "han",
  "ha",
  "ngan",
  "diri",
  "oo",
  "salamat",
  "kumusta",
  "ano",
  "hain",
  "tagpira",
  "karuyag",
  "bulig",
  "ini",
  "adto",
  "maupay",
  "dako",
  "bayad",
  "waray",
  "hin",
  "nga",
  "kay",
];
let sPos = 0,
  sNeu = 0,
  sNeg = 0,
  negStreak = 0;
function detectLang(text) {
  const mode = (document.getElementById("liveLangMode") || {}).value;
  if (mode && mode !== "auto") return mode;
  const t = (text || "").toLowerCase();
  const w = t.split(/[^a-zñ'-]+/).filter(Boolean);
  if (!w.length) return "en";
  let en = 0,
    tl = 0,
    ceb = 0,
    hil = 0,
    ilo = 0,
    war = 0;
  w.forEach((x) => {
    if (EN_W.includes(x)) en++;
    if (TL_W.includes(x)) tl++;
    if (CEB_W.includes(x)) ceb++;
    if (HIL_W.includes(x)) hil++;
    if (ILO_W.includes(x)) ilo++;
    if (WAR_W.includes(x)) war++;
  });
  const iloMk = (
    t.match(/\b(agyaman|apay|kasano|siak|daytoy|naimbag|adda|awan|apo)\b/g) ||
    []
  ).length;
  const warMk = (
    t.match(/\b(maupay|karuyag|tagpira|waray|hain|bulig|kumusta)\b/g) || []
  ).length;
  const cebMk = (
    t.match(/\b(gyud|jud|kaayo|unsa|asa|palihug|dili|nimo|nako)\b/g) || []
  ).length;
  const hilMk = (t.match(/\b(gid|sang|indi|ngaa|diin|subong|bulig)\b/g) || [])
    .length;
  const fil = Math.max(tl, ceb, hil, ilo, war);
  const total = en + fil || 1;
  const filR = fil / total;
  if (en >= 1 && fil >= 1 && filR > 0.15 && filR < 0.85) return "taglish";
  if (filR < 0.5) return "en";
  const scores = [
    ["ilo", ilo + iloMk * 2],
    ["war", war + warMk * 2],
    ["ceb", ceb + cebMk * 2],
    ["hil", hil + hilMk * 2],
    ["tl", tl],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 ? scores[0][0] : "tl";
}
function langLabel(l) {
  return (
    {
      tl: "TAGALOG",
      ceb: "CEBUANO",
      hil: "HILIGAYNON",
      ilo: "ILOKANO",
      war: "WARAY",
      taglish: "TAGLISH",
      en: "ENGLISH",
    }[l] || "ENGLISH"
  );
}
const END_RE =
  /\b(bye|goodbye|hang up|end the call|that'?s all|nothing else|no more|i'?m done|im done|paalam|tapos na|wala na( po)?|tama na|okay na( po)?|ok na( po)?|human na|amo na|maupay nga adlaw,? paalam|agyaman.{0,6}paalam)\b/i;
function detectEndIntent(text) {
  return END_RE.test((text || "").trim());
}
const LINES = {
  greeting: {
    en: (t) => "Hello and welcome to " + t + "! How may I help you today?",
    tl: (t) =>
      "Kumusta po at maligayang pagtawag sa " +
      t +
      "! Paano po kita matutulungan?",
    ceb: (t) =>
      "Maayong adlaw ug malipayong pagtawag sa " +
      t +
      "! Unsa may ikatabang nako?",
    hil: (t) =>
      "Maayong adlaw kag malipayon nga pagtawag sa " +
      t +
      "! Ano ang mabuligan ko?",
    ilo: (t) =>
      "Naimbag nga aldaw ken naragsak a panagtawag iti " +
      t +
      "! Ania ti matulongak?",
    war: (t) =>
      "Maupay nga adlaw ngan malipayon nga pagtawag ha " +
      t +
      "! Ano an mabulig ko?",
    taglish: (t) =>
      "Hello po, welcome sa " + t + "! How can I help you today po?",
  },
  apology: {
    en: "I sincerely apologize for the inconvenience.",
    tl: "Humihingi po ako ng paumanhin sa abala.",
    ceb: "Pasaylo-a ko kaayo sa kahasol.",
    hil: "Nagapangayo ako sang pasaylo sa kahasol.",
    ilo: "Dispensarenak iti nairugit a napasamak.",
    war: "Pasaylo-a ako han kasamok nga natabo.",
    taglish: "Sorry po talaga sa inconvenience.",
  },
  empathy: {
    en: "I completely understand how frustrating this is, and I'm here to help.",
    tl: "Lubos ko pong nauunawaan ito, at nandito po ako para tumulong.",
    ceb: "Nasabtan gyud nako ni, ug ania ko aron motabang.",
    hil: "Nabatyagan ko gid ini, kag ari ako agud magbulig.",
    ilo: "Maawatak ti rigat a marikriknayo, ken addaak ditoy tapno tumulong.",
    war: "Nasabtan ko an kabudlay, ngan ari ako para bumulig.",
    taglish:
      "Naiintindihan ko po how frustrating this is, nandito po ako to help.",
  },
  clarify: {
    en: "Could you tell me a little more so I can help right away?",
    tl: "Pwede po bang idetalye pa ninyo para matulungan ko kayo agad?",
    ceb: "Pwede ba nimo idugang pa aron matabangan tika dayon?",
    hil: "Pwede mo bala isugid pa agud mabuligan ko ikaw dayon?",
    ilo: "Mabalin kadi nga inayonyo pay tapno matulongankayo a dagus?",
    war: "Puydi mo ba isumat pa agud mabuligan ko dayon?",
    taglish: "Pwede po bang i-explain more para ma-help ko kayo agad?",
  },
  closing: {
    en: "You're most welcome! Anything else I can help you with?",
    tl: "Walang anuman po! May iba pa po ba kayong kailangan?",
    ceb: "Walay sapayan! Naa pa bay lain nga ikatabang?",
    hil: "Wala sing kaso! May iban pa nga mabuligan ko?",
    ilo: "Awan aniaman! Adda pay kadi sabali a matulongak?",
    war: "Waray sapayan! May iba pa nga mabuligan ko?",
    taglish: "You're welcome po! May iba pa po ba kayong need?",
  },
  endack: {
    en: "Thank you for calling! Have a great day. Goodbye. 👋",
    tl: "Salamat po sa pagtawag! Ingat po. Paalam. 👋",
    ceb: "Salamat sa pagtawag! Amping kanunay. Babay. 👋",
    hil: "Salamat sa pagtawag! Halong permi. Paalam. 👋",
    ilo: "Agyamanak iti panagtawagyo! Naimbag nga aldaw. Paalam. 👋",
    war: "Salamat han pagtawag! Maupay nga adlaw. Paalam. 👋",
    taglish: "Salamat po sa pagtawag! Have a great day po. Paalam. 👋",
  },
};
function localize(text, lang) {
  if (lang === "en") return text;
  const lead =
    {
      tl: "Sige po, ",
      ceb: "Sige, ",
      hil: "Sige, ",
      ilo: "Wen, ",
      war: "Sige, ",
      taglish: "Sure po, ",
    }[lang] || "";
  const tail =
    {
      tl: " Sana po nakatulong ito.",
      ceb: " Sana nakatabang ni.",
      hil: " Sana nakabulig ini.",
      ilo: " Sapay koma a nakatulong daytoy.",
      war: " Sana nakabulig ini.",
      taglish: " Hope this helps po.",
    }[lang] || "";
  return lead + text + tail;
}
const POS = [
  "thank",
  "salamat",
  "great",
  "good",
  "happy",
  "perfect",
  "nice",
  "ok",
  "okay",
  "yes",
  "sige",
  "maganda",
  "galing",
  "ayos",
  "maayo",
  "huo",
  "oo",
  "agyaman",
  "naimbag",
  "maupay",
];
const NEG = [
  "angry",
  "bad",
  "terrible",
  "worst",
  "hate",
  "slow",
  "broken",
  "problem",
  "complaint",
  "refund",
  "cancel",
  "galit",
  "pangit",
  "ayaw",
  "reklamo",
  "sobra",
  "budlay",
  "lisod",
  "hinay",
  "akig",
  "masuko",
];
function scoreSentiment(t) {
  t = t.toLowerCase();
  let p = POS.reduce((a, w) => a + (t.includes(w) ? 1 : 0), 0),
    n = NEG.reduce((a, w) => a + (t.includes(w) ? 1 : 0), 0);
  if (n > p) return "neg";
  if (p > n) return "pos";
  return "neu";
}
function updateSenti() {
  const tot = sPos + sNeu + sNeg || 1,
    pp = Math.round((sPos / tot) * 100),
    nn = Math.round((sNeg / tot) * 100),
    up = 100 - pp - nn;
  const P = document.getElementById("sPos"),
    N = document.getElementById("sNeu"),
    G = document.getElementById("sNeg");
  if (!P) return;
  P.style.width = pp + "%";
  P.textContent = pp + "%";
  N.style.width = up + "%";
  N.textContent = up + "%";
  G.style.width = nn + "%";
  G.textContent = nn + "%";
}
