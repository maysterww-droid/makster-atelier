# Creative Studio 0.5 — Provider infrastructure

ProviderRegistry discovers adapters by capability rather than hard-coding vendors. GenerationJob supports ordered fallback and bounded attempts. BudgetGuard blocks a generation before spending when projected project cost exceeds policy. ProvenanceLog records provider/model/prompt version/references/input assets/output/cost for every generation.

A zero-cost MockProvider exercises the same adapter path as future Runway, HeyGen, voice and Veo integrations. External providers remain disconnected in 0.5, so tests and orchestration can run without paid generation.

Next gate: persistence/API/workspace integration, then provider credentials/adapters only after explicit connection work begins.
