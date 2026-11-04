// Gem job board API. slug: the board name, as in jobs.gem.com/<slug>. The job pages render in
// the browser, so a plain fetch of one sees no posting; the board API carries every post with
// its full text. Measured 4 Nov 2026.
const posts = (slug, net) => net.json(`https://api.gem.com/job_board/v0/${slug}/job_posts/`);

export default async function board(slug, net) {
  const d = await posts(slug, net);
  if (!Array.isArray(d)) return null;
  return d.map((j) => ({ title: j.title, location: [(j.location || {}).name, j.location_type].filter(Boolean).join(" / "), url: j.absolute_url }));
}

// Is one posting still open? A post leaves the board list when it closes, and Gem has no
// per-post endpoint, so a post missing from a list that answered is closed.
export async function live(url, net) {
  const m = url.match(/jobs\.gem\.com\/([^/?#]+)\/([\w-]+)/i);
  if (!m) return null;
  const d = await posts(m[1], net);
  if (!Array.isArray(d)) return null;
  return d.some((j) => j.id === m[2]) ? "open" : "closed";
}

// The posting itself, for scripts/posting.mjs.
export async function posting(url, net) {
  const m = url.match(/jobs\.gem\.com\/([^/?#]+)\/([\w-]+)/i);
  if (!m) return null;
  const d = await posts(m[1], net);
  const j = Array.isArray(d) ? d.find((x) => x.id === m[2]) : null;
  if (!j) return null;
  return { title: j.title, location: [(j.location || {}).name, j.location_type].filter(Boolean).join(" / "),
    html: j.content || "", text: j.content_plain || "" };
}
