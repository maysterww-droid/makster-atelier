# Makster Creative Studio — Guided Production Flow 1.2

Branch: `creative-studio-0.1`

## Goal

Make P01 feel like one production task instead of a collection of technical panels.

Primary path:

**Visual media → Review → Master assembly / VO → Human Approval → Local Render → Watch / Download MP4**

## Production Flow

A compact `P01 PRODUCTION FLOW` panel appears in:

- Shots & Takes
- Timeline
- QA
- Approval
- Exports

It reads the real project state and exposes one primary **Continue** action.

Rules:

1. Missing visual media → Media Inbox.
2. Visual media present but unreviewed → open next Take Review.
3. Takes accepted but EN VO incomplete → Voice Track.
4. Master / QA incomplete → Timeline or QA.
5. Master clean but not approved → Human Approval.
6. Approved Master not rendered → Render Center.
7. `MASTER_READY` → Watch Master / Download MP4.

## Single source of truth

Timeline no longer toggles readiness manually.

Shot status is derived from:
- actual media attachment
- real Accept / Reject review status

Clicking a non-accepted Timeline shot opens its real review. Clicking a missing shot goes to Media Inbox.

## Finished Master

Local Render Agent now serves completed outputs through:

- `GET /output/<file>`
- HTTP Range support for browser video seeking
- `?download=1` for attachment download

When render reaches `MASTER_READY`, Studio displays:

- inline Master player
- Watch Master
- Download MP4
- Post-QA status
- version and zero-external-spend state

The render output URL is stored with the P01 render job so the result remains visible after normal UI navigation/reload while Local Render Agent is available.

## Local Render Agent

The updated agent must be restarted once after pulling this branch so the new output streaming endpoint is active.

Existing start command remains:
`local-render-agent/START_RENDER_AGENT.cmd`

## Usability behavior

Production Flow refreshes after:
- batch ingest
- Cloud restore
- Accept / Reject
- VO replacement
- Approval / Request changes
- render state changes
- final local render completion

This prevents stale "next step" instructions.
