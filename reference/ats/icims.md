# iCIMS

`<tenant>.icims.com/jobs/<id>/job`. Still an account wall (`_core.md`), but only the first screen is: once the candidate has made the account, the rest of the wizard can be filled. First measured 26 Oct 2026 on one tenant, five steps (login, Candidate Profile, Candidate Questions, EEO, final).

- **The candidate's part:** the login screen (email, "I accept" for data processing), then on Candidate Profile the Password / Password (Re-enter) fields, any SMS-consent question, and an hCaptcha if one shows. Fill everything else and hand those back in one message.
- **The form lives in a same-origin iframe.** `find` and `read_page` stop at the iframe; reach the fields with `document.querySelector('iframe').contentDocument`. The iframe's `src` stays on the job page while its content moves on, so don't navigate to it. Ids look like `PersonProfileFields.FirstName`, `-1_PersonProfileFields.PhoneNumber`, `rcf<nnnn>` for custom questions.
- **Values:** the native setter from the iframe's own window (`contentDocument.defaultView.HTMLInputElement.prototype`) plus `input`/`change`/`blur` events held for text fields and native `<select>`s. "Please specify" lists repopulate after the parent select changes; set the parent first.
- **Resume:** add a light-DOM proxy `<input type=file>` on the top page, `file_upload` to it, then copy the file into `PortalProfileFields.Resume_File` with a `DataTransfer` and fire `change`. The page reloads with `uploadResume=1`, parses the CV and keeps the fields already set; the file name shows next to "Replace Resume".
- **The phone field wants "area code + number, no country code"** with a US example. For a number outside the US, entering the country code without `+` or spaces kept it callable and was accepted.
- **Pressing Return inside a native select saves the step** ("Your responses have been saved") and reloads the page. Use Tab after typing the option's first letters instead.
- **A US work-authorization "No" did not end the application** on this tenant: the next step (EEO) opened normally. That is the opposite of an Ashby tenant the same day, where the same answer blocked submission.
- EEO gender and race are marked required. Race is the candidate's to answer.
