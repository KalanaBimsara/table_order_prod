# Architecture rules

- Dispatch totals use scanned quantities from the date-filtered gate-pass records, not full order quantities; keep the calculation in a pure tested helper to prevent overcounting partially scanned orders.
- Transport manufacturing units use the tested pending-minus-dispatched helper, with paginated pending orders and gate-pass scans under the same selected time and order-number filters, to avoid truncated totals.