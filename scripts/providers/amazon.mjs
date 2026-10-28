// amazon.jobs, Amazon's own career site (all its businesses, AWS included). It searches rather
// than lists, so it runs one search per profile query, 100 results a page, three pages at most.
// slug: "amazon" (the site is one board for every Amazon team).
//
// The same role is often posted once per office ("Sr. Product Designer, AWS Search" in Seattle
// and in Santa Clara, two ids). Those copies are merged into one entry, with every location
// listed, so the sweep shows the role once; the first id found is the one to apply through.
const PAGE = 100, PAGES = 3;
const BASE = "https://www.amazon.jobs";
const key = (title) => String(title || "").toLowerCase().replace(/\s+/g, " ").trim();

export default async function board(slug, net) {
  if (String(slug).toLowerCase() !== "amazon") return null;
  const roles = new Map();
  let reachable = false;
  for (const q of net.queries.length ? net.queries : [""]) {
    for (let page = 0; page < PAGES; page++) {
      const d = await net.json(`${BASE}/en/search.json?base_query=${encodeURIComponent(q)}&result_limit=${PAGE}&offset=${page * PAGE}&sort=relevant`);
      if (!d || !Array.isArray(d.jobs)) break;
      reachable = true;
      for (const j of d.jobs) {
        if (!j.job_path) continue;
        const k = key(j.title), where = j.normalized_location || j.location || "";
        const seen = roles.get(k);
        if (seen) { if (where && !seen.places.includes(where)) seen.places.push(where); continue; }
        roles.set(k, { title: String(j.title || "").trim(), places: where ? [where] : [], url: `${BASE}${j.job_path}` });
      }
      if ((page + 1) * PAGE >= (d.hits ?? 0)) break;
    }
  }
  return reachable ? [...roles.values()].map((r) => ({ title: r.title, location: r.places.join(" / "), url: r.url })) : null;
}

// Is one posting still open? amazon.jobs/en/jobs/<id> redirects to the posting's own page while
// it is open and answers 404 once it is gone.
export async function live(url, net) {
  const m = url.match(/amazon\.jobs\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?jobs\/(\d+)/i);
  if (!m) return null;
  const r = await net.status(`${BASE}/en/jobs/${m[1]}`);
  if (r.status === 200 || r.status === 301 || r.status === 302) return "open";
  if (r.status === 404) return "closed";
  return null;
}
