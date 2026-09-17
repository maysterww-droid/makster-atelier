# Creative Studio 0.8 — Host integration contract

Creative Studio remains a shared backend/module, not a third office. Makster Office and VYTA Office each expose a `Creative` entry that launches the same studio with a locked brand context. Cross-host brand substitution is rejected.

The office adapter defines the handoff boundary: Growth/Marketing submits campaign intent and requested deliverables; Creative Studio returns only human-approved, QA-passed assets. Auto-publishing remains disabled.

Repository discovery note: the connected GitHub installation currently exposes only `maysterww-droid/makster-atelier` and `maysterww-droid/brand-hunter`. The Makster Office/Makster Pro and VYTA Office frontend repositories are not exposed as separate connected repositories, so 0.8 implements the portable host contract here rather than pretending to patch an unavailable host UI. Once a host repository is connected, its navigation can bind directly to `creativeEntry()` / `launchCreativeStudio()` without changing Studio core.
