# Makster AI 5.1.0 — Business OS + Integrated Makster AI Office

## What changed

Makster AI Office is no longer treated as a separate application.

It is now a first-class tab inside the same Makster AI Business Operating System:

`AI Office`

The same application now contains:
- Design / Engineering
- Owner Command
- Business OS
- Finance
- Procurement
- Production
- Job Control
- Client / Commercial workflows
- Makster AI Office

## AI Office purpose

The Office owns the external growth side of the company:

- marketing strategy
- advertising planning
- content
- social media
- lead generation
- B2B partner acquisition
- campaign analytics
- lead qualification
- Owner Brief
- Approval Center

## 12-agent Growth Department

1. Growth Director
2. Analytics Agent
3. Audience Agent
4. Creative Strategist
5. Content Agent
6. Google Ads Agent
7. Meta Ads Agent
8. Instagram Growth Agent
9. TikTok Growth Agent
10. Lead Qualification Agent
11. Partner Acquisition Agent
12. Owner Brief Agent

The Growth Cycle follows:

Analytics
→ Audience
→ Creative
→ Content
→ Ads
→ Sales Bridge
→ Owner Brief

## Advertising channels

Channels are separate business objects:

- Google Ads
- Facebook Ads
- Instagram Ads
- TikTok Ads
- Instagram Organic
- Facebook Organic
- TikTok Organic
- LinkedIn
- Email
- Website

Instagram remains a separate business channel in reporting even if a future live implementation uses Meta APIs.

## Campaign data

Every campaign stores:

- channel
- objective
- market
- budget
- spend
- impressions
- clicks
- leads
- qualified leads
- won deals
- attributed revenue

Derived metrics include:

- CTR
- Cost per Lead
- Cost per Qualified Lead
- ROAS
- lead → qualified conversion
- qualified → won conversion

## Lead Pipeline

Office leads contain:

- contact / company
- source
- market
- estimated order value
- status
- campaign attribution

Pipeline:

NEW
→ QUALIFIED
→ PROPOSAL
→ WON / LOST

A qualified lead can be converted directly into a real Makster Project.

This is the key integration boundary:

`AI Office Lead → Makster Project → Business OS`

The generated project receives the client's contact data and estimated commercial value.

## Approval Center

AI Office maintains the safety model originally specified for the agent office.

AI may:
- analyze
- draft
- recommend
- create a cycle
- prepare campaigns/content

Owner approval is required for consequential actions such as:
- campaign budget
- campaign launch/change
- content publication
- external messages
- market changes
- discounts

In 5.1, campaign creation automatically creates a budget approval.

Approving that budget moves the campaign from DRAFT to PLANNED.
It does not silently spend money.

## Owner Brief

Every Growth Cycle generates an Owner Brief containing:

- active campaigns
- spend
- leads
- qualified leads
- wins
- attributed revenue
- pending approvals
- priorities
- risks

## Shared persistence

AI Office is persisted inside the same Owner Operations persistence layer.

File-mode and Supabase-mode both support:

- leads
- campaigns
- content
- approvals
- agent runs
- cycles
- Owner Briefs

## Supabase migration

Prepared:

`supabase/migration_source/makster_ai_office_5_1.sql`

Tables:

- makster_office_leads
- makster_office_campaigns
- makster_office_content
- makster_office_approvals
- makster_office_agent_runs
- makster_office_cycles
- makster_office_owner_briefs

## API

GET  `/api/v1/ai-office`

POST `/api/v1/ai-office/campaigns`
POST `/api/v1/ai-office/campaigns/:id/metrics`

POST `/api/v1/ai-office/leads`
POST `/api/v1/ai-office/leads/:id/status`
POST `/api/v1/ai-office/leads/:id/convert-to-project`

POST `/api/v1/ai-office/cycles/run`

POST `/api/v1/ai-office/approvals/:id/approve`
POST `/api/v1/ai-office/approvals/:id/reject`

## Current live-integration boundary

The 5.1 Office architecture and internal operating loop are integrated and functional.

Live advertising network execution is NOT falsely claimed.

Current build does not yet automatically:
- create real Google Ads campaigns
- spend via Meta Ads API
- publish Instagram/TikTok content
- spend TikTok Ads budget

Those require real provider accounts, OAuth/API connections and separate owner-authorized live adapters.

The Office is therefore ready as the common orchestration/data/approval layer for those adapters.
