#!/usr/bin/env node
// Read a posting before anyone judges it: fetch its text from the application system's own API,
// save it, and flag the sentences that close the door or need a careful read. This is the
// mechanical half of triage (seekter-run §2, location and language); fit stays a judgement.
//
//   node scripts/posting.mjs <url> [<url> ...]        # or "url | company" lines on stdin
//   node scripts/posting.mjs --file <text file> [--url <url>]   # text saved from elsewhere (LinkedIn)
//   options: --out <dir> (default runs/<today>/post)
//
// One line per posting:
//   CLOSER   an explicit sentence ends it: posting in another language, a required language
//            outside the profile's, no sponsorship, a clearance, a remote country list without
//            the home country. The quote is the skip reason.
//   CHECK    sentences about residence, right to work or time zones that need reading.
//   CLEAR    no restricting sentence at all, which is a tier-B apply, not a skip. The location
//            in brackets still decides an office role (a single city in a region the profile
//            does not relocate to is the profile's call, not a sentence this script can quote).
//   NOTEXT   no text could be read (LinkedIn is never fetched; save its text and use --file).
// The text goes to <out>/<slug>.txt with the findings on top, for the run and for claims.mjs
// --posting. Nothing here decides fit, and nothing here is a reason to skip without the quote.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, TODAY, runMain, isMainModule, settings } from "./seekter.mjs";
import { getJson, getText, htmlText } from "./_shared.mjs";

const PROVIDERS = path.join(path.dirname(fileURLToPath(import.meta.url)), "providers");

// ---------------------------------------------------------------------------------- reading

// Each provider that exports posting(url, net) answers for its own URLs and null for others.
export async function readPosting(url, net) {
  if (/linkedin\.com/i.test(url)) return null;
  for (const f of fs.readdirSync(PROVIDERS).filter((x) => x.endsWith(".mjs")).sort()) {
    const mod = await import(pathToFileURL(path.join(PROVIDERS, f)).href);
    if (typeof mod.posting !== "function") continue;
    let p = null;
    try { p = await mod.posting(url, net); } catch { p = null; }
    if (p) return { by: f.replace(/\.mjs$/, ""), ...p, text: [p.text, htmlText(p.html)].filter(Boolean).sort((a, b) => b.length - a.length)[0] || "" };
  }
  // Any other page: its visible text, which is noisier (menus, cookie banners) but still has
  // the posting's sentences in it.
  const html = await net.text(url);
  const text = htmlText(html);
  return text.length > 200 ? { by: "page", title: (html.match(/<title[^>]*>([^<]*)/i) || [])[1] || "", location: "", text } : null;
}

// --------------------------------------------------------------------------------- analysis

// Short, common words that mostly belong to one language. Counted, not parsed: enough to tell
// a posting written in German from an English one with a German company name in it.
const STOP = {
  en: ["the", "and", "with", "you", "our", "for", "are", "will", "your"],
  de: ["und", "die", "der", "mit", "wir", "für", "sie", "ist", "bei"],
  fr: ["les", "des", "vous", "pour", "nous", "une", "est", "avec", "dans"],
  es: ["los", "las", "con", "para", "nuestro", "una", "del", "por", "como"],
  nl: ["het", "van", "een", "wij", "voor", "zijn", "met", "jouw", "naar"],
  pl: ["w", "z", "na", "do", "się", "jest", "oraz", "dla", "nie", "jako", "przez"],
  pt: ["os", "das", "com", "para", "uma", "não", "você", "nossa", "pelo"],
  it: ["il", "di", "per", "che", "una", "con", "sono", "nel", "della"],
  tr: ["ve", "bir", "ile", "için", "olarak", "bu", "da", "çok", "veya"],
  sv: ["och", "att", "det", "som", "för", "med", "är", "på", "vår"],
  da: ["og", "at", "det", "som", "for", "med", "er", "på", "vores"],
  fi: ["ja", "on", "että", "se", "ovat", "kanssa", "tai", "meidän", "sinä"],
  cs: ["se", "na", "je", "pro", "že", "ve", "jsme", "nebo", "práce"],
  hu: ["és", "az", "hogy", "egy", "nem", "van", "csapat", "valamint", "számára"],
};

export function textLanguage(text) {
  const words = String(text).toLowerCase().split(/[^\p{L}]+/u);
  const score = Object.entries(STOP).map(([lang, list]) => [lang, words.filter((w) => list.includes(w)).length])
    .sort((a, b) => b[1] - a[1]);
  const [[top, n], [, second]] = score;
  return n >= 8 && n >= second * 1.5 ? top : "";
}

const LANGUAGE_CODES = ["en", "de", "fr", "es", "nl", "pl", "pt", "it", "tr", "sv", "da", "fi", "no", "cs", "hu", "el",
  "ro", "lt", "lv", "et", "sk", "sl", "hr", "bg", "ru", "uk", "ar", "he", "ja", "ko", "zh"];
const languageName = (c) => { try { return new Intl.DisplayNames(["en"], { type: "language" }).of(c); } catch { return c; } };
// Countries whose English name changed, so a posting can use either.
const COUNTRY_ALIASES = { TR: ["Turkey", "Türkiye", "Turkiye"], CZ: ["Czech Republic", "Czechia"], NL: ["Netherlands", "Holland"],
  GB: ["United Kingdom", "UK", "Great Britain", "England"], US: ["United States", "USA", "U.S."], AE: ["United Arab Emirates", "UAE"] };
export function countryNames(code) {
  if (!code) return [];
  const c = code.toUpperCase();
  let name = c;
  try { name = new Intl.DisplayNames(["en"], { type: "region" }).of(c); } catch { name = c; }
  return [...new Set([name, ...(COUNTRY_ALIASES[c] || [])])];
}

// Lines first (bullets and headings end without a full stop), then sentences inside a line.
const sentences = (text) => String(text).split(/\n+/).flatMap((l) => l.replace(/\s+/g, " ").split(/(?<=[.!?;])\s+(?=[A-Z0-9])|\s+\|\s+/))
  .map((s) => s.trim()).filter(Boolean);
// Every country name the runtime knows, to catch "from within Poland" and "based in Spain"
// without a list per candidate.
let ALL_COUNTRIES;
function allCountries() {
  if (ALL_COUNTRIES) return ALL_COUNTRIES;
  const names = new Set();
  let dn = null;
  try { dn = new Intl.DisplayNames(["en"], { type: "region" }); } catch { dn = null; }
  for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b);
    let n = code;
    try { n = dn ? dn.of(code) : code; } catch { n = code; }
    if (n && n !== code && !/Unknown|Region/.test(n)) names.add(n);
  }
  for (const list of Object.values(COUNTRY_ALIASES)) for (const n of list) names.add(n);
  return (ALL_COUNTRIES = [...names]);
}
const quote = (s) => (s.length > 180 ? `${s.slice(0, 177)}...` : s);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The findings for one posting. `languages` are the profile's language codes, `home` its
// country code; `locations` an explicit country list when the system gave one.
export function analyze(text, { languages = ["en"], home = "", locations = [], remote = false } = {}) {
  const findings = [];
  const add = (kind, level, s) => { if (!findings.some((f) => f.kind === kind && f.quote === quote(s))) findings.push({ kind, level, quote: quote(s) }); };
  const homeNames = countryNames(home);
  const homeRe = homeNames.length ? new RegExp(`\\b(${homeNames.map(escape).join("|")})\\b`, "i") : null;

  const lang = textLanguage(text);
  if (lang && !languages.includes(lang)) add("language", "closer", `posting written in ${languageName(lang)}`);

  const foreign = LANGUAGE_CODES.filter((c) => !languages.includes(c)).map(languageName);
  const nameRe = `(${foreign.map(escape).join("|")})`;
  const needRe = new RegExp(`(fluen\\w*|native|proficien\\w*|command of|business[- ]level|\\bC1\\b|\\bC2\\b|\\bB2\\b|speak\\w*|written and spoken)[^.]{0,60}\\b${nameRe}\\b|\\b${nameRe}\\b[^.]{0,40}(required|is a must|mandatory|essential|fluen\\w*|native|\\bC1\\b|\\bC2\\b|\\bB2\\b)`, "i");
  const optional = /\b(plus|nice to have|bonus|advantage|preferred|desirable|beneficial|not required)\b/i;
  const sponsor = /\b(not|unable to|cannot|can't|do not|does not|don't|will not|won't)\b[^.]{0,30}\bsponsor|\bno (visa )?sponsorship|sponsorship is not (available|offered|possible)/i;
  const clearance = /security clearance|\bSC clearance|\bITAR\b|export control|U\.S\. person|active clearance|\bTS\/SCI\b/i;
  const residence = /\b(based in|located in|reside(nt)? in|must live|live in|living in|right to (live and )?work in|authori[sz]ed to work|eligible to work|work permit|anywhere in the (U\.?S\.?|United States|UK|EU|US)\b|within the (EU|EEA|UK|US))/i;
  const zone = /\b(time ?zones?|CET|CEST|GMT|UTC|EST|PST|overlap)\b/;
  const others = allCountries().filter((n) => !homeNames.includes(n));
  const onlyIn = new RegExp(`\\b(within|only (in|from)|from|based in|located in|resident in|reside in|living in)\\s+(the\\s+)?(${others.map(escape).join("|")})\\b`, "i");
  const noMove = /\b(do not|don't|cannot|can't|unable to)\b[^.]{0,20}\boffer\b[^.]{0,20}\b(relocation|remote)|\bno relocation\b|relocation (is )?not (offered|available|possible)/i;

  for (const s of sentences(text)) {
    if (needRe.test(s)) add("language-required", optional.test(s) ? "check" : "closer", s);
    if (sponsor.test(s)) add("sponsorship", "closer", s);
    if (clearance.test(s)) add("clearance", "closer", s);
    if (residence.test(s)) add(homeRe && homeRe.test(s) ? "home-listed" : "residence", homeRe && homeRe.test(s) ? "note" : "check", s);
    else if (homeRe && homeRe.test(s)) add("home-listed", "note", s);
    if (zone.test(s)) add("timezone", "check", s);
    if (onlyIn.test(s) && !(homeRe && homeRe.test(s))) add("country-scope", "check", s);
    if (noMove.test(s)) add("no-relocation", "check", s);
  }

  // Boards that list languages as structured fields (justjoin.it, rocketjobs.pl: a language code
  // on one line, its level on the next) say it outside any sentence. Measured 4 Nov 2026: an
  // English-language posting with "pl / B2" under its tech stack.
  for (const m of String(text).matchAll(/(?:^|\n)\s*([a-z]{2})\s*\n\s*(A1|A2|B1|B2|C1|C2)\b/g))
    if (LANGUAGE_CODES.includes(m[1]) && !languages.includes(m[1]) && !/^A/.test(m[2])) add("language-required", "closer", `${languageName(m[1])} ${m[2]} listed as a requirement`);

  // A list of three or more places with the home country missing is the country-list trap: the
  // single most common closer for a remote role. Fewer places are an office location, which
  // the relocation track decides, not this.
  if (homeRe && locations.length >= 3 && !locations.some((l) => homeRe.test(l)) && !locations.some((l) => /anywhere|worldwide|global/i.test(l)))
    add("country-list", remote ? "closer" : "check", `locations: ${locations.join(", ")}`);
  else if (homeRe && locations.some((l) => homeRe.test(l))) add("home-listed", "note", `locations: ${locations.join(", ")}`);

  const verdict = findings.some((f) => f.level === "closer") ? "CLOSER" : findings.some((f) => f.level === "check") ? "CHECK" : "CLEAR";
  return { lang, verdict, findings };
}

// ------------------------------------------------------------------------------------- main

function profileOptions() {
  try {
    const s = settings();
    return { languages: s.languages || ["en"], home: (s.freehire || {}).home_country || "" };
  } catch {
    return { languages: ["en"], home: "" };
  }
}

const slugOf = (url, title) => (String(title || url).toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "posting");

function save(outDir, n, url, p, a) {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${String(n).padStart(2, "0")}-${slugOf(url, p.title)}.txt`);
  const head = [`URL ${url}`, `TITLE ${p.title || ""}`, `LOCATION ${p.location || ""}`, `READ BY ${p.by || "file"}`,
    `VERDICT ${a.verdict}${a.lang ? `  (language: ${a.lang})` : ""}`,
    ...a.findings.map((f) => `  ${f.level.toUpperCase()} ${f.kind}: ${f.quote}`),
    ...(p.questions && p.questions.length ? ["QUESTIONS", ...p.questions.map((q) => `  - ${q}`)] : []), "---"];
  fs.writeFileSync(file, `${head.join("\n")}\n${p.text}\n`);
  return path.relative(ROOT, file);
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : null; };
  const outDir = path.resolve(ROOT, opt("--out") || path.join("runs", TODAY, "post"));
  const file = opt("--file");
  const fileUrl = opt("--url");
  const prof = profileOptions();
  const net = { json: (u, post = null) => getJson(u, 30, null, post), text: (u) => getText(u, 30) };

  const jobs = [];
  if (file) jobs.push({ url: fileUrl || file, local: fs.readFileSync(file, "utf8") });
  let urls = argv.filter((a) => !a.startsWith("--"));
  if (!urls.length && !file) {
    let input = "";
    try { input = fs.readFileSync(0, "utf8"); } catch { input = ""; }
    urls = input.split(/\r?\n/).map((l) => l.split("|")[0].trim()).filter(Boolean);
  }
  for (const u of urls) jobs.push({ url: u });
  if (!jobs.length) { console.error("usage: node scripts/posting.mjs <url> [<url> ...] | --file <text> [--url <url>] [--out <dir>]"); return 2; }

  let n = 0;
  for (const j of jobs) {
    n++;
    const p = j.local != null ? { by: "file", title: "", location: "", text: j.local } : await readPosting(j.url, net);
    if (!p || !p.text) { console.log(`${"NOTEXT".padEnd(7)} ${j.url}${/linkedin\.com/i.test(j.url) ? "  (LinkedIn is never fetched: save the text, use --file)" : ""}`); continue; }
    const a = analyze([p.text, ...(p.questions || [])].join("\n"), { ...prof, locations: p.locations || [], remote: !!p.remote });
    const top = a.findings.find((f) => f.level === "closer") || a.findings.find((f) => f.level === "check") || a.findings.find((f) => f.level === "note");
    const saved = save(outDir, n, j.url, p, a);
    const where = p.location ? `  (${p.location.length > 70 ? `${p.location.slice(0, 67)}...` : p.location})` : "";
    console.log(`${a.verdict.padEnd(7)} ${j.url}${where}  [${saved}]${top ? `\n        ${top.kind}: "${top.quote}"` : ""}`);
  }
  return 0;
}

if (isMainModule(import.meta.url)) await runMain(main);
