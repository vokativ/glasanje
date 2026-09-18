# Maintained recipient decisions

This page explains exceptions future maintenance must preserve. Current emails, approvals, notice URLs and source dates belong in [overrides](../data/overrides.json), [official coverage relationships](../data/official_coverage_relationships.json) and the generated public dataset. Do not maintain another full recipient table or restore statuses from old audits.

Structured operator authorizations record decisions already supplied by the maintainer. Preserve them without asking another AI to approve them again. For new decisions use [AGENTS.md](../AGENTS.md) and the [operations procedure](election-contact-operations.md).

## Covering missions and separate offices

An approved embassy normally supplies its recipient and notice to established non-resident countries. Independent consulates remain separate. A shared website/mailbox alone does not establish jurisdiction.

| Case | Maintained decision |
| --- | --- |
| Georgia / Armenia | Both `st-nonres-ge` and `st-am-emb-main` are unconfirmed for election registration. The maintainer explicitly withdrew Georgia's approval. Preserve `embserbia.yerevan@gmail.com` as general contact and Georgia's Yerevan relationship. The [Georgia](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/gruzija/ambasade-konzulati) and [Armenia](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/jermenija-republika/ambasade-konzulati) entries establish jurisdiction, not election instructions. |
| Latvia / Sweden | The [MFA entry](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/letonija/ambasade-konzulati) assigns consular work to Sweden. Preserve both Latvian IDs as non-resident for this tool and resolve them to Stockholm; retain original contacts as provenance. |
| Singapore / Jakarta | Use approved `consular.jakarta@mfa.rs` for Jakarta's established coverage. The maintainer selects this first address from four in the image notice. See the [MFA relationship](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/singapur/ambasade-konzulati) and maintained Jakarta notice metadata. |
| Ireland / London | The [MFA entry](https://www.mfa.gov.rs/spoljna-politika/bilateralna-saradnja/irska/ambasade-konzulati) assigns non-resident coverage to London; no separate Irish announcement is required. |
| Rome / Malta | The [joint notice](https://roma.mfa.gov.rs/mediji/najave-i-obavestenja/prijavljivanje-za-glasanje-na-izborima-25-oktobra-2026-godine-10-septembar-2026-godine) names `izbori.rim@mfa.rs` for Rome and `srb.office.valletta@mfa.rs` for Malta. Keep Malta's distinct office recipient and station ID. |
| Mostar / Drvar | The MFA identifies Drvar as Mostar's office. The [notice](https://mostar.mfa.gov.rs/mediji/najave-i-obavestenja/odluka-o-raspisivanju-izbora-za-narodne-poslanike) addresses residents of Bosnia and Herzegovina; the maintainer approves shared `gk.mostar@mfa.rs` for Drvar. |
| Mexico | Maintained `embajadaserbiaenmexico@gmail.com` approval includes resolved covered countries. A notice without a text-extracted mailbox does not revoke that authorization. |
| Paris / Nairobi | Current approvals/notices supersede former absence decisions. Review every dependent when updating either parent; do not restore old unconfirmed values or treat former dependent-only approvals as precedent. |
| Libya / Tripoli | The [official notice](https://tripoli.mfa.gov.rs/mediji/aktivnosti/obavestenje-za-drzavljane-republike-srbije-koji-borave-u-drzavi-libiji-o-ostvarivanju-birackog-prava-na-izborima-koji-ce-biti-odrzani-25-oktobra-2026) directs eligible applicants in Libya to submit through the Embassy in Tripoli and gives its physical address, but does not print a submission email. The maintainer explicitly authorizes the mission's normal mailbox, `srb.emb.libya@mfa.rs`, as an `operator-approved` recipient. Preserve `emailStatus: "no-email-extracted"` and do not treat this station-specific decision as source confirmation or a blanket rule for similar notices. |
| Generic 2026 notices without email | Tirana (`st-al-emb-main`), Brasilia (`st-br-emb-main`), Havana (`st-cu-emb-main`), Ankara (`st-tr-emb-main`), Istanbul (`st-tr-cons-istanbul`), Vukovar (`st-hr-cons-vukovar`), Herceg Novi (`st-me-cons-hercegnovi`), and Tunis (`st-tn-emb-main`) published official 2026 election announcements that relay generic ministry text, physical addresses, or blank forms without designated submission emails (`emailStatus: "no-email-extracted"`). Havana's notice propagates to its covered dependents (`st-nonres-do`, `st-nonres-jm`, `st-nonres-ht`). These 11 stations are presented in the derived yellow fallback state (`notice-no-email`), offering their general contact as an unguaranteed fallback attempt with explicit receipt-confirmation instructions. |

## Excluded contacts and source discrepancies

- `info@ccserbie.com` belongs to the Serbian Cultural Centre in Paris, not consular/citizen services. Keep both Centre-derived rows excluded and retain real Paris/Monaco IDs and jurisdiction.
- `konkursi@dijaspora.gov.rs` is a competition contact, not an election recipient.
- Mostar displays `gk.mostar@mfa.rs` but linked to Skopje's `konzularno@srbija.com.mk`. Rijeka displays `izboririjeka2026@gmail.com` but linked to `gmial.com`. Approved maintained recipients use the visible addresses; broken targets must not replace them.
- Shanghai and Luanda notices contain copied references to other missions. Read their operative submission sections and maintained source pointers before interpreting scope.
- Banja Luka/Trebinje have separate named recipients in one notice. Canberra/Sydney and Rome/Malta can also share a publication without merging station identities.
- Article slugs can be reused and FAQ pages can contain election instructions. Read titles, navigation and content. Inspect the actual rendered image source when lazy loading shows a placeholder.
- Zimbabwe's maintained contact must not be overwritten from an old Pretoria reference on a bilateral overview. The maintainer supplied [the mission's X account](https://x.com/SRBinZimbabwe); a previous absence finding does not prove it remains unchanged.

## Maintaining this reference

Keep decisions and reasons affecting current behavior. Store exact notice URLs and real observation times in station metadata, preserving election/year. Update this page when an exception might otherwise be misinterpreted.

Crawl attempts, pass counts, availability snapshots and deployment hashes belong in local artifacts or Git history. Removing reports must not delete structured approvals, evidence/source snapshots used by validators or the current deployed baseline.
