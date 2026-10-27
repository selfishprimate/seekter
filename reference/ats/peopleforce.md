# PeopleForce

Company-branded career sites (`careers.<company>.com/v/<id>-<slug>`, "Powered by PeopleForce" in the footer); the form is at `…/a/new`. No account. First measured 27 Oct 2026.

- Fields: full name (one field), email, phone (intl-tel picker; typing the full `+<code>` number sets the flag), a cover letter, resume (plain `input[type=file]`, `find` + `file_upload` works), links (free text), an optional messenger handle, location (free text), desired base compensation (a number plus a currency select that defaults to USD), and a required GDPR consent checkbox. reCAPTCHA is invisible.
- **The cover letter is a rich-text editor over a hidden textarea.** The native setter on `career_application_form_cover_letter` fills the textarea but leaves the visible editor empty; focus the `[contenteditable=true]` element from JS and type for real, then check both lengths match.
- **Focus fields from JS, not by coordinates.** The page scrolls while you type into the editor, and coordinate clicks taken from an earlier screenshot landed on other fields; one landed on the consent checkbox. Read `checked` on the consent box before handing over.
