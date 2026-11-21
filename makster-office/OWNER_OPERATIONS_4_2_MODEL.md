# Owner Operations 4.2 — Operating Model

The management loop is now:

Project Revision
→ Engineering
→ BOM
→ Owner Queue
→ Warehouse Allocation
→ Shortage
→ Supplier Quote Comparison
→ Procurement Award
→ Project Purchase Order
→ Purchasing Commitment
→ Company Cash Commitment
→ Payment Calendar
→ Receiving
→ Actual Cost
→ Production Capacity
→ Installation Target
→ Margin / Cash / Deadline risk

Three quantities must remain distinct:

1. Physical stock
   What is actually in the warehouse.

2. Reserved stock
   Physical stock locked to a specific project.

3. Procurement shortage
   BOM demand not covered by existing project reservation or allocatable free stock.

And three financial quantities must remain distinct:

1. Purchase Commitment
   Value of approved/ordered project supplier orders.

2. Cash Commitment
   Future company payment obligations with due dates.

3. Actual Cost
   Cost already realized through receiving/manual actual entries.

Makster 4.2 intentionally keeps these separate so the dashboard does not confuse
"we ordered it", "we must pay it", and "we have actually consumed/received it".
