# Employer catalog

`catalog.json` is a shared list of companies that hire from their own career sites on a system Seekter can read (`scripts/providers/`). `/seekter-init` shows the part of it that fits the candidate's country, and the candidate keeps all of it or trims it, so nobody has to remember company names. The picked rows go to `employers` in `profile/settings.json`, and every run reads those boards (`reference/sources/direct-employer.md`).

```bash
node scripts/catalog.mjs employers --country PT --discipline design            # show
node scripts/catalog.mjs employers --country PT --exclude-sectors crypto --add  # write to the watchlist
```

## A row

```json
{"name": "Supabase", "ats": "ashby", "slug": "supabase", "scope": ["worldwide"],
 "sectors": ["software"], "seen": ["engineering"], "note": "Remote, global", "verified": "2026-10-27"}
```

| Field | Meaning |
|---|---|
| `name`, `ats`, `slug` | Exactly what a watchlist row needs. `ats` is a file name in `scripts/providers/`; the slug's shape is in that file's first comment |
| `scope` | Where the company hires: `worldwide`, `emea`, `europe` (geographic Europe), `europe-tz` (a time-zone rule rather than a country rule), `americas`, `apac`, `remote` (remote with no region stated), `offices` (office or hybrid roles only) |
| `countries` | ISO 3166 alpha-2 codes, when the company names its countries. **A list always wins over the region**: a company with `europe` and a list of eight EU countries does not fit a candidate living anywhere else in Europe |
| `tz` | A time-zone rule, as the company writes it (`CET±3`, `GMT-3..GMT+3`) |
| `sectors` | Plain tags (`crypto`, `fintech`, `health`, `trading`…), so init can drop the sectors a candidate never applies to |
| `seen` | Functions with open roles on the day it was verified. A hint for ordering, never a filter: a company with no design role today may post one tomorrow |
| `note` | The sentence behind the scope, in a few words |
| `verified` | The date someone last read the company's own board |

`scripts/catalog.mjs` turns scope and countries into a fit for one country: **A** the company says it hires there, **B** remote in a region that includes it but without a promise, **C** office roles, shown only with `--relocation`. The run still reads every posting's own location line; the catalog only decides which boards are worth reading.

## What may go in

- **Public facts only.** A company is listed because its own board, careers page or a public directory shows that it hires remotely, and the `note` says what that is. Never why a particular person knows of it: no application status, no dates, no "rejected", nothing from anyone's `applications/` or `runs/`.
- **A board Seekter can read.** Add the row only after `scripts/providers/<ats>.mjs` returns its postings. A slug that answers with nothing is a wrong slug more often than an empty board (`direct-employer.md`).
- **No sector judgement.** Tag the sector and let each candidate's profile decide. Companies whose product is adult content, gambling or betting stay out altogether, because no profile would want them and the rows would only be noise.
- **Re-verify instead of deleting.** When a sweep reports `problem: <name>: no board`, find the new slug or system first; drop the row only when the company no longer hires remotely or no longer exists.

## Finding more

Three sources fed the first version (27 Oct 2026): the remoteintech.company directory filtered to fully remote and worldwide, `site:` searches of the systems' job domains (`site:jobs.ashbyhq.com "product designer" remote EMEA`, the same for Greenhouse, Lever, Workable and Pinpoint), and companies seen hiring remotely in day-to-day runs. Search results are often months old; they are good for finding companies and poor for finding open roles, so verify the board before adding a row.
