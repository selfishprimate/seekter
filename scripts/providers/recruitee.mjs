// Recruitee offers API. slug: the subdomain, as in <slug>.recruitee.com.
export default async function board(slug, net) {
  const d = await net.json(`https://${slug}.recruitee.com/api/offers/`);
  if (!d || !Array.isArray(d.offers)) return null;
  return d.offers.map((o) => ({ title: o.title,
    location: [o.location, o.remote ? "remote" : ""].filter(Boolean).join(" "), url: o.careers_url }));
}

// Is one posting still open? The offer page answers 404 once it is unpublished. Not the offers
// list: an open offer can be left out of it.
export async function live(url, net) {
  const m = url.match(/\/\/([\w-]+)\.recruitee\.com\/o\/([\w-]+)/i);
  if (!m) return null;
  const r = await net.status(`https://${m[1]}.recruitee.com/o/${m[2]}`);
  return r.status === 200 ? "open" : r.status === 404 ? "closed" : null;
}

// The posting itself, for scripts/posting.mjs: the offer endpoint carries description and
// requirements as HTML.
export async function posting(url, net) {
  const m = url.match(/\/\/([\w-]+)\.recruitee\.com\/o\/([\w-]+)/i);
  if (!m) return null;
  const d = await net.json(`https://${m[1]}.recruitee.com/api/offers/${m[2]}`);
  const o = d && d.offer;
  if (!o || !o.title) return null;
  return { title: o.title, location: [o.location, o.remote ? "remote" : ""].filter(Boolean).join(" "),
    html: `${o.description || ""}${o.requirements || ""}` };
}
