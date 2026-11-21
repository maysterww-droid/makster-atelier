# BUSINESS_TRUTH_5_0

Makster AI 5.0 uses explicit source ownership.

| Fact | Authoritative source |
| --- | --- |
| Project stage | ProjectModel.jobControl.stage |
| Technical revision | ProjectModel.revision |
| Client contract/received cumulative amount | ProjectModel.jobControl.money |
| Production execution | OwnerOperations.productionOperations |
| Project purchase orders | ProjectModel.purchaseOrders |
| Material RFQ state | OwnerOperations.materialRfqs |
| Supplier award state | OwnerOperations.procurementAwards |
| Project cost/margin | Engineering Costing |
| Period management P&L | Finance Ledger + Project/Cash data |
| Treasury / future cash | treasuryBalances + cashEvents |
| Installation handover | ProjectModel.installationHandover |
| Punch/site issues | ProjectModel installation closeout data |

Rule:
Derived dashboards may calculate and explain these facts.
They must not create an independent competing copy of the same business truth.
