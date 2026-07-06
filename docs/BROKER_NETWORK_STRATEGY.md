# Broker Network Strategy

*Saved 2026-07-06, from the strategy discussion following the broker portal v1 ship.*

## End goal

Own the broker ↔ firm connection. But do **not** become an open deal-routing
marketplace: routing one submission to every matching buyer creates auction
dynamics that erode the proprietary deal flow firms pay Dealstash to build.
Value would accrue to the free side (brokers/sellers) while costs land on the
paying side (firms). The off-market segment where routing adds the most value
is exactly the segment brokers guard most closely (procuring cause,
discretion) — see the Brevitas/Biproxi/RealConnex graveyard.

**Principle: connect brokers to firms, but never make the paying customer more
findable than they want to be, or their deals more contested than they'd be
without us. The network is a web of private 1:1 pipes with great plumbing —
not a broadcast tower.**

## Mechanism: three stages

1. **Now — firm-owned portal links (shipped as v1).** Each firm distributes
   its own `/submit/[slug]` link; each firm brings its own brokers. Works at
   n=1 customer; this is the cold-start solution.

2. **Next — submission & relationship layer + buy-box directory.**
   - Passive broker capture: v1 already collects broker name/email/company on
     every submission. Add a "keep me posted" opt-in on the success screen —
     builds the broker graph at zero marketplace risk.
   - Broker accounts: one interface to *their own* Dealstash buyer
     relationships — submission history, and structured feedback from firm
     kill reasons ("passed: price per unit 14% above basis"). Feedback is the
     killer feature nobody gives brokers; firms already generate the data.
   - Searchable buy-box directory (firms opt in): brokers search "who buys
     20–50 unit value-add in Richmond" and submit 1:1. Discovery without
     blast; needs almost no liquidity to be useful. This is the likely v2.

3. **Later, only if data justifies — scarcity-preserving routing.** Broker
   picks max 2–3 firms, or sequential *first-look* windows that firms pay
   for. Sell speed/exclusivity, not reach: the premium product then
   strengthens the customer's edge instead of eroding it.

## Decision gate

Hold the marketplace decision until **broker repeat-submission rate** on v1
portals forces it. Brokers returning unprompted = supply-side pull that
justifies the directory. No repeat usage = rethink the network regardless of
mechanism.

## Monetization guardrails

- Firms pay (for flow, priority, feedback tooling); brokers ride free.
- No transaction/success fees — real-estate licensing territory.
- Firm buy-box criteria used in any cross-firm matching requires explicit
  opt-in ("receive matched deals from the broker network").
