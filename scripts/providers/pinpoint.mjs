// Pinpoint public postings feed. slug: the subdomain, as in <slug>.pinpointhq.com; every Pinpoint
// site serves its open postings at /postings.json as {data: [...]}.
export default async function board(slug, net) {
  const d = await net.json(`https://${slug}.pinpointhq.com/postings.json`);
  const list = d && (Array.isArray(d) ? d : d.data);
  if (!Array.isArray(list)) return null;
  return list.map((p) => {
    const loc = p.location || {};
    return { title: (p.title || "").trim(),
      location: [[loc.city, loc.name].filter(Boolean).join(", "), p.workplace_type_text].filter(Boolean).join(" · "),
      url: p.url };
  });
}

// Is one posting still open? A closed posting leaves the feed.
export async function live(url, net) {
  const m = url.match(/\/\/([\w-]+)\.pinpointhq\.com\/(?:[a-z]{2}\/)?postings\/([0-9a-f-]{36})/i);
  if (!m) return null;
  const d = await net.json(`https://${m[1]}.pinpointhq.com/postings.json`);
  const list = d && (Array.isArray(d) ? d : d.data);
  if (!Array.isArray(list)) return null;
  return list.some((p) => String(p.url || "").includes(m[2])) ? "open" : "closed";
}
