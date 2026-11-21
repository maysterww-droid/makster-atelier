# Makster 1.8 — Client Change Order & Approval

> **2.4 integration note:** This module is now merged into Unified Business + CAD 2.4 and adapted to the active Commercial 1.6 `BuiltCommercialPackage` / `client_commercial_quotes` model. The conceptual trust rules below are preserved.

## Purpose
A changed project revision cannot silently replace the commercial agreement. Makster 1.8 binds customer approval to the exact project revision, requote fingerprint, change-report fingerprint and agreed customer total.

## Flow
1. An accepted commercial quote creates the project commercial contract.
2. A newer Project Revision is engineered and requoted.
3. Change Intelligence creates an immutable Change Impact Report.
4. Makster creates a customer-safe Change Order.
5. Sending the Change Order issues a 256-bit random approval token; only its SHA-256 hash is stored.
6. Customer view/decision requires the token and is time-bounded by `validUntil` when supplied.
7. Acceptance updates the contract to the new revision and quote, rebalances only unpaid installments and creates an immutable Client Revision Authorization.
8. Manufacturing Approval Request checks the commercial gate before technical approval can begin.

## Trust rules
- Old accepted quote remains immutable and becomes `superseded` after accepted change.
- New quote cannot become the contractual quote without customer acceptance.
- Already paid installments never change amount.
- Contract total cannot be reduced below money already paid.
- Client-facing Change Order never contains cost basis, markup or gross profit.
- Approval token raw value is not persisted; only SHA-256 is stored in a server-only/private table.
- Acceptance fingerprint includes the exact binding and decision identity/time.

## Production gate
Projects without a commercial contract retain the legacy workflow. Once a commercial contract exists:
- the initial contracted revision is eligible;
- any later changed revision requires a matching `client_revision_authorization`;
- a stale/other revision is blocked before Manufacturing Approval Request.

This is a commercial authorization gate, not a substitute for Engineering, Release Trust, technologist approval or CNC/machine gates.
