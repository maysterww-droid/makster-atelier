# Creative Studio 0.3

## Production object model

`CreativeBrief -> Concept -> ScriptBeat[] -> StoryboardFrame[] -> Shot[] -> Take[] -> selectedTake`

A take cannot be selected unless it has passed QA. References are registered through the brand-scoped Asset Registry; cross-brand retrieval throws a brand-isolation violation. Creative Memory is append-only and queryable only within the requested brand/project scope.

## QA flow

Each subsystem emits named checks and findings. `buildQaReport()` aggregates them through Premium QA. Any blocking finding prevents the project from reaching Human Approval.

## Provider policy

0.3 does not call external generation providers. This permits end-to-end orchestration and QA testing without consuming paid credits.
