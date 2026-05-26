# Privacy Policy — legal review TODO

Items extracted from inline HTML comments in `privacy.html` so they
don't ship in View Source. Each one should be reviewed/confirmed by a
lawyer (UK GDPR + EU GDPR + UAE law) before significant promotion.

## 1. Publication date

**Where:** section 1 (top of policy)
**Action:** keep `Last updated: <date>` accurate. Bump every time
substantive policy language changes (typo fixes don't count).

## 2. Data collection scope

**Where:** section 3 — "What data we collect"
**Action:** confirm with the tech owner that nothing else is stored
beyond the form fields (email, first name, stage, industry, country,
source) plus the row's `created_at` / `enriched_at` timestamps. If
analytics or anything else starts capturing more, the list in the
policy must reflect that.

## 3. Legal basis under UK GDPR / EU GDPR / UAE law

**Where:** section 4 — "Why we collect it and our legal basis"
**Action:** lawyer to confirm legal basis under each applicable
regime is correctly stated (consent for marketing; legitimate
interest for operating the waitlist itself).

## 4. Cross-border transfer language

**Where:** section 6 — "International transfers and applicable law"
**Action:** lawyer to draft proper cross-border transfer language
covering UAE → UK / EU → UK flows and name the applicable legal
regimes (UK adequacy decisions, SCCs, etc.).

## 5. Maximum retention period

**Where:** section 7 — "How long we keep it"
**Action:** lawyer to confirm a specific maximum retention period
(currently vague — needs a concrete window, e.g. "until you ask us
to delete, or 3 years after your last interaction").

## 6. Right to complain / supervisory authority

**Where:** section 8 — "Your rights"
**Action:** lawyer to add right-to-complain wording and name the
supervisory authority for each jurisdiction (ICO for UK, the
relevant EU member-state DPA, UAE's Data Office).
