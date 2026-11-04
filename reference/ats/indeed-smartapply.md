# Indeed SmartApply

- **URLs:** `smartapply.indeed.com` (opened in a new tab by Glassdoor Easy Apply; Glassdoor itself needs sign-in — human does it).
- **Flow:** Resume (38%) → employer questions (50%) → consent (88%) → Review → "Submit your application" → back on posting with "Your application was sent!" / `smart-apply-action POST_APPLY` in URL. Upload the current CV; don't reuse an old stored one.
- **A "Security Check - Indeed.com" title on the first SmartApply tab can clear itself.** Measured 3 Nov 2026: Glassdoor Easy Apply opened a new tab titled "Security Check - Indeed.com"; without any action it moved on to the resume step within about ten seconds (a self-solving check). Wait and re-read the tab before calling it a hand-off; if a visible challenge stays, it is the user's.
- **The review step's submit button carries a terms acceptance.** The text above it reads "By pressing apply: 1) you agree to Indeed's Terms ... and Glassdoor's Terms of Use". Seekter never accepts terms for the user, so the run stops at the review page and the user presses "Submit your application".
- **"Resume options" is the way to replace the stored CV:** click it, then expose `input[type=file]` as below; the uploaded file becomes the selected resume and its two-page preview replaces the old one.
- **File upload:**
  ```js
  document.querySelector('input[type=file]').id='cvupload';
  ```
  then `find` "hidden file input with id cvupload" → `file_upload`.
- **Traps:** Hangs on "Preparing review" → `navigate` to `smartapply.indeed.com/beta/indeedapply/form/review-module`; flow restarts at 38% with answers remembered; Continue ×3 → Submit appears. Don't refill.
