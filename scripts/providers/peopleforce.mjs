// PeopleForce career sites. slug: the career site's host (careers.<company>.com); every PeopleForce
// site serves its open vacancies as a JSON array at /v.json. The posting URLs carry a ?source= tag
// that only says which board sent the visitor, so it is cut.
const host = (slug) => slug.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const clean = (u) => String(u || "").replace(/[?#].*$/, "");

export default async function board(slug, net) {
  const list = await net.json(`https://${host(slug)}/v.json`);
  if (!Array.isArray(list)) return null;
  return list.map((v) => ({
    title: v.title || "",
    location: [v.location && (v.location.name || v.location), v.work_type].filter(Boolean).join(" / "),
    url: clean(v.vacancy_url),
  }));
}

// Is one posting still open? The vacancy leaves /v.json when it closes. Any host can be a
// PeopleForce site, so the host has to serve the array first.
export async function live(url, net) {
  const m = url.match(/\/\/([^/]+)\/v\/(\d+)-/);
  if (!m) return null;
  const list = await net.json(`https://${m[1]}/v.json`);
  if (!Array.isArray(list)) return null;
  return list.some((v) => String(v.id) === m[2]) ? "open" : "closed";
}
