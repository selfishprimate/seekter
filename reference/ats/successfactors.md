# SAP SuccessFactors (`career<N>.successfactors.eu/careers?company=<co>`, reached from a company careers site's "Apply now")

An account wall: the candidate signs in or creates the profile. Once signed in, the whole application is one long page that Seekter can fill. Measured 4 Nov 2026 on one bank's tenant.

- **"Expand all sections" first.** Documents, candidate information, work experience, education, languages, certifications, geographic mobility and the employer's questionnaire are collapsible sections; some fields only render once expanded.
- **Documents:** each tile's small "+" button opens a menu with "Upload from Device", which opens a dialog holding a real `input[type=file]`. `find` it and use `file_upload`; never click a native picker.
- **Picklists are typeahead comboboxes** (nationality, gender, phone type, industry, degree, language, proficiency, questionnaire answers). A ref click opens the list, but it toggles: after one successful pick the next ref click on another picklist often closes instead of opening. What worked every time: triple-click the field, **type part of the option**, wait a second, then pick the visible `[role=listbox] [role=menuitem]` whose text matches by dispatching mousedown, mouseup and click on it. Country-like lists use the native spelling ("Türkiye"); the English name finds neighbours instead.
- **Plain text inputs take the native value setter** (input, keyup, change, then blur); the values survived a Save.
- **Date fields are UI5-style inputs inside shadow roots** (`MM/DD/YYYY`). They are invisible to `document.querySelectorAll`; read them with a recursive walk through `shadowRoot`s. Fill them by ref click and real typing. Work rows and education rows require a From Date; with only a month known, the 1st of the month is the convention; with only a year known, say so in the record so the candidate can correct it.
- **Repeating rows** ("Add new row") can be added in bulk by clicking the same ref repeatedly; the new rows append in order.
- **Save stores a draft without applying** ("The draft application was saved successfully"). Use it to confirm the values registered before the hand-off.
- The questionnaire ends with a required privacy-policy checkbox next to Apply: the candidate ticks it and presses Apply.
