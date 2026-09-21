# Creative Studio — Documentary Development 0.1

Branch: `creative-studio-0.1`

## Purpose

Documentary YouTube episodes now start inside Creative Studio instead of beginning as an empty production project.

Primary path:

**Idea Lab → Research Desk → Greenlight → Episode Project → Production**

The channel uses three editorial lanes:

- **HOW IT WORKS / Engineering**
- **MANUFACTURING / Made**
- **BUSINESS / Money**

Shared documentary formula:

**WHY → HOW → MADE → MONEY → FUTURE**

## Idea Lab

Idea Lab is a persistent local backlog stored in browser state.

Seeded pilot slate:

1. **P01 / How It Works** — What Actually Happens After You Flush? (already Greenlit)
2. **Manufacturing pilot** — The Factory With Almost No Human Workers
3. **Business pilot** — Inside the Business of Data Centers

Every idea stores:
- primary lane
- HOW / MADE / MONEY mix
- hook
- story angle
- central documentary question
- WHY/HOW/MADE/MONEY/FUTURE structure
- status
- Research dossier
- linked Episode ID after Greenlight

## Documentary Director

The first Director Generator is local-first and zero-spend.

Given a topic, it can create:
- a How It Works angle
- a Manufacturing angle
- a Business angle

It does **not** invent facts or claim that generated ideas are researched.

## Research Desk

Research Desk contains:
- central documentary question
- story angle
- research questions
- verified facts
- source entries
- unknown / unverified claims
- visual-proof plan
- business layer
- future layer
- accuracy / limitation notes

`Build research plan` generates only a research structure. It never fills the verified-facts field and it does not auto-fill the Sources field.

## Greenlight rule

A new documentary idea cannot be Greenlit until:
- central question exists
- story angle exists
- at least two real source entries have been added
- Research is explicitly marked READY

Greenlight creates the next `Pxx` Episode Project in the existing YouTube Workspace and preserves the originating Idea ID, editorial mix, angle, formula and Research dossier.

## Existing P01

P01 is represented in Idea Lab as an already-Greenlit pilot and continues into the existing P01 guided production flow.

## Cost / AI behavior

No external AI provider is called automatically.

The current Director Generator is deterministic/local. A future connected research or AI agent can be added behind explicit provider/cost controls without changing the Idea/Research/Greenlight data model.
