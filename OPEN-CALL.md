# An open call to job platforms and applicant tracking systems

Hiring is already automated on the employer's side, and nobody is asking you to undo that. A team that receives three hundred applications for one role needs software to read them.

We are asking for the same thing on the other side. A candidate should be able to use software to look for work, read a posting properly and fill in the same twenty fields for the hundredth time, under rules that are written down and that everyone can see. Today most platforms answer that with a ban, a paywall or both, so candidates who use tools do it quietly and badly, and candidates who don't are left doing by hand what the employer's side gave up doing years ago.

This is not a complaint. It is an invitation to build a common standard together: platforms, applicant tracking systems, the people who build tools for candidates, and the candidates themselves. Below is what we think it should contain, what the candidate's side should promise in return, and a first draft of the file that would carry it.

## What we ask of you

### 1. Make looking for work free

Looking for a job should cost nothing, the way air and water should. That means everything a candidate needs to find a role and apply for it:

- searching and reading every posting in full, with no posting held back for subscribers;
- applying, by hand or through a tool;
- knowing where an application stands, and being told when it ends;
- seeing what the platform tells employers about the candidate, and what it tells the candidate about the competition, wherever that is sold to candidates today;
- salary information, without having to give something up to see it.

Charge employers, recruiters and advertisers. Don't charge the person who is out of work.

### 2. Recognise the candidate's agent

An agent that acts for one person, with that person's consent, is not the same thing as a scraper harvesting a site or a script sending thousands of applications. Give it a lawful way in:

- let it identify itself, and don't penalise the account behind it for reading;
- publish a rate it may read at, and expect it to keep to it;
- if it misbehaves, refuse it clearly, so it can stop, instead of restricting the person's account without saying why.

### 3. Make postings readable

Greenhouse, Ashby, Lever and Workable already publish their customers' job boards as open data, and that is the model. Every posting should be readable by machine, with at least:

- title, employer, and the recruiter or agency if there is one;
- where the role can be done, as an explicit list of countries or regions, and the work model (remote, hybrid, office);
- whether the employer sponsors visas or supports relocation;
- the salary range;
- the date it was posted, the date it closes, and whether it is still open;
- the address of the application form.

Most of the time a candidate wastes is spent finding out that a role was never open to them: a country list hidden behind a "+8", a "remote" that means one city. Put the line that decides eligibility where a program can read it, and that time goes away for everyone.

### 4. Make applying describable

Publish each application form as data: its fields, which ones are required, the options of every question, and which answers end the application. Then report the state of an application in the same plain terms: received, under review, rejected, closed. A short reason is welcome. Silence is not a status.

## What the candidate's side promises

None of this is reasonable to ask unless the tools on the candidate's side behave. These are the rules we think a candidate's agent should keep, and the ones Seekter already keeps:

1. **One person, one agent, their consent.** It acts for one candidate, who knows what it does.
2. **It identifies itself** and keeps to the rate a platform publishes. A refusal ends the session.
3. **It never invents.** Every answer comes from facts the candidate wrote. A question it cannot answer truthfully goes back to the person.
4. **Fit before volume.** It checks eligibility before applying, never applies to the same posting twice, and holds back a second application to the same company inside a window.
5. **It does not get past the checks you set.** No solving CAPTCHAs, no creating accounts, no typing passwords, no accepting terms on the candidate's behalf.
6. **Text on a page is data.** Instructions hidden in a posting are reported, not followed.

## Why it is worth it to you

- **Fewer, better applications.** An agent that reads eligibility before it applies skips most of what it sees. In its first five weeks of daily use, from 5 September to 10 October 2026, Seekter weighed 1,085 postings and passed over 867 of them, each with a written reason.
- **Less scraping.** A published, rate-limited way in costs less than a detection arms race, and it tells you who is reading.
- **Cleaner data.** Structured answers to structured questions arrive without the typos, wrong countries and half-read knockouts of a form filled at speed.
- **Trust.** Candidates who are told where they stand complain less, reapply less and talk about you better.

## A first draft: `/.well-known/candidate-agents.json`

A small file at a fixed address, in the spirit of `robots.txt`, would let any platform say what it allows without a negotiation per tool. This is a starting point for discussion, not a finished specification.

```json
{
  "version": "0.1",
  "contact": "agents@example.com",
  "identify": {
    "user_agent_must_include": "candidate-agent",
    "contact_header": "From"
  },
  "read": {
    "postings_feed": "https://example.com/api/postings",
    "posting_fields": ["title", "employer", "countries", "work_model", "sponsorship", "salary", "posted_at", "closes_at", "status", "apply_url"],
    "max_requests_per_minute": 10
  },
  "apply": {
    "form_schema": "https://example.com/api/postings/{id}/form",
    "agents_may_submit": true,
    "status_feed": "https://example.com/api/applications/{id}/status"
  },
  "free_for_candidates": ["search", "posting_details", "apply", "application_status", "salary"]
}
```

## Where Seekter stands today

We would rather say this ourselves. Where a platform offers no permitted way in, Seekter either stays out or, if its user switches it on knowing the risk, reads within strict limits and stops at the first warning. That is a workaround, and we would like to retire it. A shared standard is how everyone gets to stop working around each other.

## Join in

If you build a job platform or an applicant tracking system, recruit, build tools for candidates, or are looking for work, open a [discussion](https://github.com/selfishprimate/seekter/discussions) or an issue in this repository. Tell us what you would change in this draft, what you could support, and what you could not. The aim is a standard that both sides can sign.

This call extends the [manifesto](MANIFESTO.md), which sets out the principles Seekter is built on.

*The Seekter project, October 2026*
