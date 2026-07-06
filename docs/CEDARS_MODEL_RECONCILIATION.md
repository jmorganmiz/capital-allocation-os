# Cedars Equity Book Reconciliation

Source: `Power & Light at Cedars_equity book.xlsm` supplied by the product owner on July 6, 2026.

## Purpose

Use the workbook as an institutional reference for Dealstash model v0.3, not as executable production code. The source file remains read-only. Dealstash will not import its VBA project, external workbook links, or broken legacy formulas.

## Workbook architecture

- 31 worksheets.
- Active monthly and annual operating schedules.
- Construction budget and interest-during-construction logic.
- Refinance sizing with a 1.25x minimum DSCR.
- Exit-cap valuation.
- Class A, Class C1, Class C2, and PFC waterfall schedules.
- Preferred equity and three multiple-hurdle tiers.
- VBA macros and approximately 36 external workbook links.

## Cached headline outputs

| Metric | Cedars cached value | Active reference |
| --- | ---: | --- |
| Project IRR | 20.6005% | `Summary!L5 -> Monthly!D299` |
| Project multiple | 3.7334x | `Summary!L6 -> Economics!O43` |
| LP IRR | 15.8620% | `Summary!L31 -> Economics!Q52` |
| LP multiple | 2.7723x | `Summary!L32 -> Economics!Q51` |
| Refinance rate | 5.50% | `Summary!L25 -> Master Inputs!J34` |
| Exit cap rate | 5.00% | `Summary!L26 -> Master Inputs!J22` |
| Minimum DSCR | 1.25x | `Economics!F25` |

## Reliability exceptions

The workbook is not a clean golden model in its current state:

- `_Debt` contains cached `#REF!` formulas.
- `Exit` contains cached `#REF!` lookup paths.
- `Waterfall (3)` contains cached `#VALUE!` hurdle outputs.
- The PFC waterfall contains a cached `#NUM!` XIRR output.
- External links make recalculation non-portable and can hang while Excel attempts to refresh unavailable sources.

These cells cannot be used as authoritative reconciliation targets. Active headline paths must be traced to self-contained inputs before comparison.

## Dealstash comparison

Already represented in model v0.5:

- Monthly operating schedule.
- Renovation timing and downtime.
- Construction/capital draws and interest carry.
- Acquisition debt, refinance, LTV and DSCR constraints.
- Property-tax reassessment and optional investor tax estimates.
- Return of capital, preferred return, GP catch-up, and two promote tiers.
- Project, LP, and GP return outputs.
- Multiple simultaneous equity classes whose capital shares reconcile to 100%.
- Arbitrary ascending promote tiers per class.
- Explicit operating-reserve funding, monthly lease-up-deficit draws, and unused-reserve release at exit.

## Recovered equity-class terms

The active `Economics` sheet exposes the following self-contained tier definitions:

| Layer | Hurdles | Promote bands |
| --- | --- | --- |
| PFC | 8% | 15% of cash flow above the hurdle |
| Class A | 12% preference | 0% before the preference; 20% residual promote |
| Class C1 | 7%, 12%, 16%, residual | 0%, 25%, 35%, 45% |
| Class C2 | 8%, 12%, residual | 0%, 25%, 35% |

These terms validate the need for a configurable class engine. They are reference terms only; Dealstash does not silently apply them to a user deal.

Still required for Cedars-level parity:

- A self-contained formula-driven Excel export with no macros or external links.

The Excel handoff remains blocked in this environment because the approved spreadsheet artifact runtime is unavailable. The attached `.xlsm` will not be copied or automated as a fallback because it contains VBA, external links, and cached formula errors.

## Reconciliation standard

1. Reconstruct only source inputs that are visible and self-contained.
2. Compare monthly NOI, debt balance, construction interest, refinance proceeds, and project cash flow before comparing IRR.
3. Require cash-flow agreement within $1 per month for deterministic schedules.
4. Require return agreement within 1 basis point and equity-multiple agreement within 0.001x.
5. Treat broken or externally linked formulas as exceptions, not expected values.
6. Preserve every difference with a stated timing or convention explanation.
