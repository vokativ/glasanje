# Operator-approval handoff: retained 2026 election recipients

Additional decisions from 13 September local time are recorded in the [remaining mission collection audit](remaining-mission-collection-audit.md): the maintainer explicitly approved 17 newly inspected recipients and clarified Latvia's consular coverage by Sweden. Those later maintained decisions supplement this handoff.

## Decision

Treat the recipients below as valid for the 2026 election workflow and make each listed station `operator-approved` if it is not already. Preserve each current recipient address exactly. Do **not** represent these decisions as `source-confirmed` unless a later public, election-specific notice supplies the required evidence.

This restores the intended use of recipients that were previously marked confirmed before the evidence workflow became stricter. The stricter workflow correctly removed the false candidate records for `konkursi@dijaspora.gov.rs`; that mailbox is excluded from this decision. It was a diaspora-project competition contact, not a voter-registration recipient, and must not be reintroduced.

## Direct mission decisions

Create or retain structured operator authorization for these resident/independent stations. Their current recipient values are the approved values.

| Station ID | Mission | Recipient |
|---|---|---|
| `st-ae-emb-main` | UAE Embassy | `izbori.abudhabi@mfa.rs` |
| `st-at-emb-main` | Austria Embassy | `izbori.bec@mfa.rs` |
| `st-au-cons-sidnej` | Australia — Sydney Consulate | `srb.cons.sydney@mfa.rs` |
| `st-au-emb-main` | Australia Embassy | `consular.canberra@mfa.rs` |
| `st-be-emb-main` | Belgium Embassy | `izbori.brisel@mfa.rs` |
| `st-by-emb-main` | Belarus Embassy | `embassy.minsk@mfa.rs` |
| `st-ca-emb-main` | Canada Embassy | `consular.ottawa@mfa.rs` |
| `st-ch-emb-main` | Switzerland Embassy | `konzul@ambasadasrbije.ch` |
| `st-cn-emb-main` | China Embassy | `srb.emb.china@mfa.rs` |
| `st-de-cons-diseldorf` | Germany — Düsseldorf Consulate | `izbori.diseldorf@mfa.rs` |
| `st-de-cons-tutgart` | Germany — Stuttgart Consulate | `izbori.stuttgart@mfa.rs` |
| `st-dk-emb-main` | Denmark Embassy | `srb.emb.denmark@mfa.rs` |
| `st-jp-emb-main` | Japan Embassy | `srb.emb.japan@mfa.rs` |
| `st-kr-emb-main` | South Korea Embassy | `srb.emb.repkorea@mfa.rs` |
| `st-mx-emb-main` | Mexico Embassy | `embajadaserbiaenmexico@gmail.com` |
| `st-pl-emb-main` | Poland Embassy | `consular.warsaw@mfa.rs` |
| `st-ro-cons-temivar` | Romania — Timișoara Consulate | `srb.cons.timisoara@mfa.rs` |
| `st-us-cons-ikago` | United States — Chicago Consulate | `izbori.cikago2026@mfa.rs` |
| `st-us-cons-njujork` | United States — New York Consulate | `izbori.njujork@mfa.rs` |
| `st-za-emb-main` | South Africa Embassy | `info@srbembassy.org.za` |
| `st-se-emb-main` | Sweden Embassy | `izbori.se@mfa.rs` |

Sweden is included because the current election-specific recipient `izbori.se@mfa.rs` replaced the earlier general mailbox `srb.emb.sweden@mfa.rs`. Keep the current election-specific value.

## Non-resident country decisions

The following stations must also finish as `operator-approved`, with their existing recipient unchanged:

| Station ID | Country | Recipient |
|---|---|---|
| `st-nonres-bw` | Botswana | `info@srbembassy.org.za` |
| `st-nonres-fj` | Fiji | `consular.canberra@mfa.rs` |
| `st-nonres-fm` | Micronesia | `srb.emb.japan@mfa.rs` |
| `st-nonres-gn` | Guinea | `consulat@ambserbie-alger.com` |
| `st-nonres-is` | Iceland | `izbori.oslo2026@mfa.rs` |
| `st-nonres-ki` | Kiribati | `consular.canberra@mfa.rs` |
| `st-nonres-kp` | North Korea | `srb.emb.china@mfa.rs` |
| `st-nonres-li` | Liechtenstein | `konzul@ambasadasrbije.ch` |
| `st-nonres-ls` | Lesotho | `info@srbembassy.org.za` |
| `st-nonres-lt` | Lithuania | `consular.warsaw@mfa.rs` |
| `st-nonres-lu` | Luxembourg | `izbori.brisel@mfa.rs` |
| `st-nonres-mg` | Madagascar | `info@srbembassy.org.za` |
| `st-nonres-mh` | Marshall Islands | `srb.emb.japan@mfa.rs` |
| `st-nonres-mn` | Mongolia | `srb.emb.china@mfa.rs` |
| `st-nonres-mu` | Mauritius | `info@srbembassy.org.za` |
| `st-nonres-mw` | Malawi | `info@srbembassy.org.za` |
| `st-nonres-mz` | Mozambique | `info@srbembassy.org.za` |
| `st-nonres-nr` | Nauru | `consular.canberra@mfa.rs` |
| `st-nonres-nz` | New Zealand | `consular.canberra@mfa.rs` |
| `st-nonres-pg` | Papua New Guinea | `consular.canberra@mfa.rs` |
| `st-nonres-pw` | Palau | `srb.emb.japan@mfa.rs` |
| `st-nonres-sb` | Solomon Islands | `consular.canberra@mfa.rs` |
| `st-nonres-sm` | San Marino | `izbori.rim@mfa.rs` |
| `st-nonres-sz` | Eswatini | `info@srbembassy.org.za` |
| `st-nonres-to` | Tonga | `consular.canberra@mfa.rs` |
| `st-nonres-tv` | Tuvalu | `consular.canberra@mfa.rs` |
| `st-nonres-vu` | Vanuatu | `consular.canberra@mfa.rs` |
| `st-nonres-ws` | Samoa | `consular.canberra@mfa.rs` |

## Required non-resident coverage rule

The decisions above remain in force. The original host/email-only instructions have been superseded by the explicit ministry relationships now supported in `scripts/build_canonical_dataset.py`. Use [AGENTS.md](../AGENTS.md) and the [current operations guide](election-contact-operations.md#nerezidentne-stanice-i-sluzbeno-pokrivanje-msp) for the maintained rule:

1. Apply the covering resident station's operator approval first.
2. A non-resident station's own explicit `electionEmail` override has first priority for its recipient and approval.
3. Otherwise, an explicit relationship in `data/official_coverage_relationships.json` supplies its stored recipient and approval and identifies the covering mission. Review those stored values when the resident recipient changes.
4. Without an explicit relationship, inherit the covering resident station's final recipient and approval only when exactly one resident mission matches both normalized canonical website host and normalized baseline primary email. If that match is absent or ambiguous, use an evidenced ministry relationship or an explicitly authorized recipient decision; do not infer jurisdiction from hostname alone.
5. Keep `coverageSourceEmail` and `coveringStationId` as provenance fields; do not overwrite them with an election override.

## Acceptance criteria

After regeneration, every station in the two tables must have:

- its listed recipient unchanged;
- `electionContactApproval: "operator-approved"`, unless it already has stronger valid `source-confirmed` evidence; and
- recipient resolution follows the explicit-override, official-relationship, then unique automatic-match precedence above.

`konkursi@dijaspora.gov.rs` must be absent from election-recipient overrides and must not appear as an approved registration recipient.

## Additional approval — 14 September 2026

The maintainer explicitly approved Buenos Aires, Sarajevo, Cairo and Rabat and their existing resolved country coverage. Exact recipients, source links and the 14-entry public coverage diff are recorded in the [missing-recipient recheck](missing-recipient-recheck-2026-09-14.md#operator-approved-recipient-release--14-september-2026). Preserve these operator approvals alongside the earlier decisions.

On 15 September 2026, the maintainer clarified that an officially published shared recipient counts when the notice establishes its use. The MFA identifies Drvar as a consular office of the General Consulate in Mostar and assigns it the Mostar website; the current notice addresses Serbian citizens residing throughout Bosnia and Herzegovina and directs requests to `gk.mostar@mfa.rs`. Drvar is therefore operator-approved with that shared recipient and source. See the [Drvar correction](missing-recipient-recheck-2026-09-14.md#drvar-correction--15-september-2026).

Also on 15 September 2026, the maintainer identified `info@ccserbie.com` as the Serbian Cultural Centre in Paris, unrelated to consular or citizen services. It is explicitly excluded from public mission data together with the duplicate Monaco row derived from it. Monaco’s existing approval was preserved on the real embassy-derived station ID `st-nonres-mc-paris-mfa-gov-rs`; a later current Paris notice replaced its ordinary embassy mailbox with the published election recipient `izbori.pariz@mfa.rs`. See the [Paris Cultural Centre correction](missing-recipient-recheck-2026-09-14.md#paris-cultural-centre-correction--15-september-2026).

The maintainer explicitly approved `consular.jakarta@mfa.rs` for Jakarta and all countries named in its official image notice: Indonesia, Singapore, Thailand, Cambodia, Vietnam, Malaysia, the Philippines, Brunei Darussalam and Timor-Leste. The notice prints four usable addresses; this decision deliberately selects the first. The source is `https://jakarta.mfa.gov.rs/mediji/aktuelnosti`, inspected visually on 15 September 2026. Preserve this as an operator decision rather than asking a later model to choose among the four again.

Later on 15 September 2026, the maintainer pre-approved recipients that a fresh round found in clear, working current official election notices. Record these as operator decisions: Paris — `izbori.pariz@mfa.rs` (also Monaco); Nairobi — `srb.emb.kenya@mfa.rs` (Kenya, Tanzania and the nine existing explicit covered-country records); Beirut — `beirut.dkp@gmail.com`; Bratislava — `consular.bratislava@mfa.rs`. Paris and Nairobi supersede their earlier `not-published` status. Each official page directly connects the mailbox to submission of the voter-registration request; see the [fourth recheck](missing-recipient-recheck-2026-09-14.md#fourth-follow-up-and-operator-approved-release--15-september-2026).
