# Makster AI 5.3.0 — Growth Autopilot + Owner Approval

## Core behavior
Growth Autopilot now evaluates every PLANNED/ACTIVE campaign and proposes one of:
- SCALE
- HOLD
- REDUCE
- PAUSE

Recommendations use:
- spend
- leads
- qualified leads
- lead quality
- won deals
- attributed revenue
- ROAS
- cost per qualified lead
- real Makster Project revenue
- real Makster Project profit when available

Real project profit has higher decision weight than vanity metrics.

## Safety model
Autopilot mode is `recommend_only`.

Non-HOLD decisions automatically generate an Owner Approval.
No budget/channel decision executes before approval.

After approval:
- Makster internal campaign plan may change
- internal PAUSE can move the campaign to PAUSED
- external Google/Meta/TikTok mutation is NOT falsely claimed
- provider state is explicitly `pending_provider_sync` or `pending_connection`

This preserves the operating rule:
AI recommends → Owner approves → provider adapter executes only when a real authorized provider connection exists.

## Decision examples
- meaningful spend + zero qualified leads → PAUSE
- low lead quality → REDUCE
- ROAS < 1 after meaningful spend → REDUCE
- ROAS >= 3 + acceptable lead quality → cautious SCALE
- confirmed real project revenue/profit → stronger SCALE
- no spend/data → HOLD

## UI
AI Office now includes:
Growth Autopilot · Owner Decisions

It shows:
- action
- confidence
- current/proposed budget
- real project revenue
- real project profit
- ROAS
- lead quality
- provider execution state
- Approve / Reject

## Verification
5.3 tests: 5/5 PASS
Full regression: 59/59 PASS
Runtime:
Weak Meta campaign → PAUSE, confidence 90%
Owner approval → internal campaign PAUSED
externalProviderMutation = false
providerExecution = pending_provider_sync
