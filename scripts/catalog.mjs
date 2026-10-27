#!/usr/bin/env node
// The shared lists /seekter-init shows instead of asking the candidate to remember names:
// job platforms (reference/sources/platforms.json) and companies that hire remotely from their
// own career sites (reference/employers/catalog.json). Both are filtered to one candidate.
//
//   node scripts/catalog.mjs platforms --country PT [--discipline design] [--relocation]
//   node scripts/catalog.mjs employers --country PT [--discipline design] [--relocation]
//                                     [--exclude-sectors crypto,trading] [--add]
//
// --add writes the matching companies into `employers` in profile/settings.json, skipping any
// already there. Nothing else in the profile is touched.
import fs from "node:fs";
import path from "node:path";
import { ROOT, settings, SettingsError, die, runMain, parseArgs } from "./seekter.mjs";

const PLATFORMS = path.join(ROOT, "reference", "sources", "platforms.json");
const CATALOG = path.join(ROOT, "reference", "employers", "catalog.json");
const SETTINGS = path.join(ROOT, "profile", "settings.json");

// ISO 3166 alpha-2 codes by the regions the catalog uses. "europe" is geographic Europe,
// including countries outside the EU; a company that only hires inside the EU says so with
// an explicit `countries` list, which always wins over the region.
const EUROPE = "AD AL AM AT AZ BA BE BG BY CH CY CZ DE DK EE ES FI FR GB GE GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM TR UA VA XK".split(" ");
const MENA = "AE BH DZ EG IL IQ JO KW LB LY MA OM PS QA SA TN YE".split(" ");
const AFRICA = "AO BJ BW CD CI CM ET GH KE MG MU MW MZ NA NG RW SN TZ UG ZA ZM ZW".split(" ");
const AMERICAS = "AR BO BR CA CL CO CR CU DO EC GT HN JM MX NI PA PE PR PY SV TT US UY VE".split(" ");
const APAC = "AU BD CN HK ID IN JP KH KR KZ LK MN MY NP NZ PH PK SG TH TW UZ VN".split(" ");
const REGION = { europe: EUROPE, emea: [...EUROPE, ...MENA, ...AFRICA], "europe-tz": [...EUROPE, ...MENA, ...AFRICA],
  americas: AMERICAS, apac: APAC };

const load = (file) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { die(`problem: cannot read ${path.relative(ROOT, file)}: ${e.message}`); }
};

// How well a catalog row fits one country: "A" = the company says it hires there, "B" = remote
// with a region that includes it but no promise (read the posting), null = not for this country.
function fit(row, country, relocation = false) {
  const c = country.toUpperCase();
  const scope = row.scope || [];
  const listed = (row.countries || []).includes(c);
  if (scope.includes("worldwide") || scope.includes("emea") && REGION.emea.includes(c)) return "A";
  if (listed && !(scope.length === 1 && scope[0] === "offices")) return "A";
  if (scope.includes("offices") && relocation && listed) return "C";
  if (scope.includes("remote") && !(row.countries || []).length) return "B";
  for (const r of ["europe", "europe-tz", "americas", "apac"]) {
    if (scope.includes(r) && REGION[r].includes(c) && !(row.countries || []).length) return "B";
  }
  if (scope.includes("offices") && relocation && !(row.countries || []).length) return "C";
  return null;
}

const wanted = (disciplines, d) => !d || disciplines === "all" || (disciplines || []).includes(d);

function platforms(a) {
  const c = a.country.toUpperCase();
  const rows = load(PLATFORMS).filter((p) => wanted(p.disciplines, a.discipline))
    .filter((p) => p.where === "global" || p.where === "home-country" || (p.where || []).includes(c) || (p.relocation && a.relocation));
  for (const p of rows) {
    const tag = p.always ? "always" : p.own_step ? "own step" : p.account ? "account" : "open";
    console.log(`${p.key} | ${p.name} | ${tag} | ${p.cadence} | ${p.note}`);
  }
  console.log(`${rows.length} platforms for ${c}${a.discipline ? `, ${a.discipline}` : ""}`);
}

function employers(a) {
  const skip = (a.exclude_sectors || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const rows = load(CATALOG)
    .filter((r) => !(r.sectors || []).some((s) => skip.includes(s.toLowerCase())))
    .map((r) => ({ ...r, tier: fit(r, a.country, a.relocation) })).filter((r) => r.tier)
    .sort((x, y) => x.tier.localeCompare(y.tier) || Number(!(x.seen || []).includes(a.discipline)) - Number(!(y.seen || []).includes(a.discipline))
      || x.name.localeCompare(y.name));
  for (const r of rows) console.log(`${r.tier} | ${r.name} | ${r.ats}:${r.slug} | ${r.note}`);
  const count = (t) => rows.filter((r) => r.tier === t).length;
  console.log(`${rows.length} companies for ${a.country.toUpperCase()}: ${count("A")} hire there, ${count("B")} remote in a region that includes it` +
    (a.relocation ? `, ${count("C")} office roles` : ""));
  if (!a.add) return;
  try { settings(true); } catch (e) {
    if (e instanceof SettingsError) die(`problem: profile/settings.json is not valid: ${e.message}`);
    throw e;
  }
  const mine = load(SETTINGS);
  const list = Array.isArray(mine.employers) ? mine.employers : [];
  const have = new Set(list.map((e) => `${e.ats}:${String(e.slug).toLowerCase()}`));
  const add = rows.filter((r) => !have.has(`${r.ats}:${String(r.slug).toLowerCase()}`)).map((r) => ({ name: r.name, ats: r.ats, slug: r.slug }));
  mine.employers = [...list, ...add];
  fs.writeFileSync(SETTINGS, JSON.stringify(mine, null, 1) + "\n");
  console.log(`added ${add.length} to profile/settings.json (${mine.employers.length} on the watchlist)`);
}

async function main() {
  const usage = "node scripts/catalog.mjs platforms|employers --country XX [--discipline d] [--relocation] [--exclude-sectors a,b] [--add]";
  const argv = process.argv.slice(2);
  const what = argv[0];
  if (!["platforms", "employers"].includes(what)) die(`usage: ${usage}`, 2);
  const a = parseArgs(argv.slice(1), { usage, options: { country: {}, discipline: {}, relocation: { flag: true },
    "exclude-sectors": {}, add: { flag: true } } });
  if (!/^[A-Za-z]{2}$/.test(a.country || "")) die(`usage: ${usage}\nerror: --country takes a two-letter country code`, 2);
  if (a.add && what !== "employers") die("error: --add only applies to employers", 2);
  return what === "platforms" ? platforms(a) : employers(a);
}

await runMain(main);
