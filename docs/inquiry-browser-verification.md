# Inquiry and country-entry browser verification

Checked on 14 September 2026 using the existing Chrome 152 profile with remote debugging on port 9222 and the production build served locally on port 4174. Browser interaction used a separate task tab through the Chrome DevTools Protocol.

The status page was exercised for all 195 countries at 390 px and 1280 px, in Cyrillic and Latin. This checked all 83 unconfirmed station entries in each combination: 332 inquiry checks, covering 43 distinct published recipients. Each rendered email link was decoded and checked for the exact existing station recipient, selected country's name, subject and body script, and application deadline. Resident missions, separate consulates and non-resident coverage were included. All 140 approved entries omitted the inquiry action in each combination. No horizontal overflow or browser exceptions were found. Mobile screenshots in both scripts and the final desktop screen were visually inspected.

The initial browser run exposed a navigation bug: choosing Latin on the status page and following the selected-country link reset the form to Cyrillic. Internal links now carry the explicit Latin preference, including the return links between the wizard and status page. Missing or ambiguous script hints retain the Cyrillic default; no browser storage is used.

The corrected build passed the entire matrix and a complete Singapore → Jakarta application flow using dummy data and the paper-signature option. Country entry opened step 2 without marking the voter-register step complete. The inquiry on both the destination and final screens changed between Cyrillic and Latin when the interface changed, retaining Singapore in its text and Jakarta's listed recipient. Latin also survived wizard → status → ordinary entry navigation. The final voter-register reminder remained visible.

These checks inspect generated drafts and application behavior; they do not test delivery or re-establish the real-world validity of the maintained recipients. No mailto links were opened and no messages were sent. The maintained station data and approvals were unchanged.

Validation: `bun run check`, all 79 Bun tests, `bun run build`, and `git diff --check` passed. The existing PDF chunk-size build warning remains. Dataset-wide checks for both scripts and the country-entry script regression are retained in `tests/country-entry-and-inquiry.test.ts`.
