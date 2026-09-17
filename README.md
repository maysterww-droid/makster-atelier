# Creative Studio — Shared AI Production

Shared creative-production infrastructure for Makster Atelier and VYTA.

Status: architecture bootstrap. Provider integrations are intentionally disabled until the core, brand isolation, QA, approval and cost/provenance contracts are in place.

## Core pipeline

Creative Request → Creative Brief → Concept → Script → Storyboard → Shot Director → Production → Assembly → Brand QA → Quality QA → Human Approval → Variants → Delivery

## Architecture rules

- One shared production backend, separate brand workspaces.
- `brand_id` is mandatory and immutable for every Creative Project.
- Makster Atelier and VYTA assets, prompts, memories and brand rules must never cross-contaminate.
- AI providers are adapters, not the studio architecture.
- No automatic publishing in v0.x; human approval is mandatory.
- Every generation records provider/model, prompt version, references, generation/take version and cost.
- Rejected and approved work feeds Creative Memory without silently changing immutable historical project records.
- Premium QA blocks obvious AI artifacts, product drift, continuity errors, invalid typography, brand violations and low-quality output before human approval.

## Planned packages

- `core/` — orchestration and project state machine
- `brands/makster-atelier/` — Makster Brand Brain
- `brands/vyta/` — VYTA Brand Brain
- `memory/` — Creative Memory contracts
- `providers/` — image/video/voice/music/SFX adapters
- `qa/` — Brand, Realism, Product, Continuity, Copy and Premium QA
- `contracts/` — versioned shared schemas
- `docs/` — architecture and integration documentation

## Integration direction

Makster Office → Creative Director → Creative Studio ← Creative Director ← VYTA Office

Makster Growth Director remains owner of the marketing/growth process. Creative Studio is its production supplier, not a second growth agent.
