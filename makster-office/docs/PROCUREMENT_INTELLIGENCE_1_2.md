# Makster 1.2 — Supplier Intelligence & Procurement

## Goal
Turn a READY outsource Production Pack into an auditable multi-supplier sourcing decision without re-entering project data.

## Flow

Production Pack → eligible suppliers → RFQ → supplier quotes → transparent comparison → award → Supplier Order → Receiving/Rework.

## Supplier capability gate
A supplier is invited only when it supports every service requested by the Production Pack, supports the RFQ currency, is active, and (when required) can deliver rather than pickup-only.

## RFQ binding
Every RFQ is frozen to:
- project id
- revision
- Production Pack id
- Production Pack manifest SHA-256
- requested services
- currency

If the pack changes after RFQ creation, `assertRfqMatchesPack` fails. A new RFQ must be issued.

## Strategies
Scores are deterministic and visible. AI may explain a result, but it does not choose hidden weights.

- Balanced: price 35%, lead time 20%, quality 25%, service fit 10%, logistics 10%
- Cheapest: price 65%, lead time 10%, quality 10%, service fit 10%, logistics 5%
- Fastest: price 15%, lead time 55%, quality 15%, service fit 10%, logistics 5%
- Quality First: price 15%, lead time 15%, quality 50%, service fit 10%, logistics 10%

Lead-time utility uses a diminishing penalty from the fastest valid quote, so a 2-day quote does not automatically dominate a good 5-day quote under Balanced.

## Quality history
Supplier quality uses previous Makster Receiving data:
- completed orders
- on-time orders
- received units
- problem units
- orders requiring rework

Current quality score weights:
- 55% defect-free receiving
- 35% on-time performance
- 10% absence of rework

Suppliers with fewer than three completed historical orders show `limited_quality_history`.

## Award
A quote can be awarded only when:
- it belongs to the exact RFQ;
- supplier was invited;
- currency matches;
- all required services are included;
- delivery requirement is satisfied;
- supplier minimum order is respected;
- RFQ still matches the exact Production Pack manifest.

Award creates the existing Makster 1.1 Supplier Order, so Receiving and Rework continue unchanged.
