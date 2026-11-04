// Greenhouse job board API. slug: the board token, as in job-boards.greenhouse.io/<slug>.
export default async function board(slug, net) {
  const d = await net.json(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
  if (!d || !Array.isArray(d.jobs)) return null;
  return d.jobs.map((j) => ({ title: j.title, location: (j.location || {}).name ?? "",
    url: `https://job-boards.greenhouse.io/${slug}/jobs/${j.id}` }));
}

// Is one posting still open? Its board API answers 404 "Job not found" once it closes.
// Returns "open", "closed", or null when the URL is not a Greenhouse posting or the answer is unclear.
export async function live(url, net) {
  const m = url.match(/greenhouse\.io\/(?:embed\/job_app\?for=([\w-]+)&token=(\d+)|([\w-]+)\/jobs\/(\d+))/);
  if (!m) return null;
  const [co, id] = m[1] ? [m[1], m[2]] : [m[3], m[4]];
  const r = await net.status(`https://boards-api.greenhouse.io/v1/boards/${co}/jobs/${id}`);
  return r.status === 200 ? "open" : r.status === 404 ? "closed" : null;
}

// The posting itself, for scripts/posting.mjs: its text and the form's question labels, which
// carry knockouts the description leaves out ("authorized to work in the United States?").
export async function posting(url, net) {
  const m = url.match(/greenhouse\.io\/(?:embed\/job_app\?for=([\w-]+)&token=(\d+)|([\w-]+)\/jobs\/(\d+))/);
  if (!m) return null;
  const [co, id] = m[1] ? [m[1], m[2]] : [m[3], m[4]];
  const host = /\.eu\.greenhouse\.io/.test(url) ? "boards-api.eu.greenhouse.io" : "boards-api.greenhouse.io";
  const d = await net.json(`https://${host}/v1/boards/${co}/jobs/${id}?questions=true`);
  if (!d || !d.title) return null;
  return { title: d.title, location: (d.location || {}).name ?? "", html: d.content || "",
    questions: (d.questions || []).map((q) => q.label).filter(Boolean) };
}
