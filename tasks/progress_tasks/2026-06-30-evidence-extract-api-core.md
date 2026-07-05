# 2026-06-30 EvidenceCard V1.1 extract-api-core

## Scope

- Added unified backend endpoint `POST /api/v1/evidence-cards/extract`.
- No frontend page, no portrait/image button work.
- No network search, vector database, ContentMission, EntityGraph, or platform contribution scoring.

## Business Rules

- `sourceType` supports only `manual`, `portrait`, and `image`.
- `manual` requests must provide `text`.
- `portrait` and `image` requests must provide `sourceId`.
- `save` defaults to `false`.
- `save=false` returns candidates only and does not write EvidenceCard rows.
- `save=true` saves extracted candidates as draft EvidenceCards.
- The extract endpoint must never create `verified` EvidenceCards directly.
- Saved EvidenceCard `content` remains capped at 5000 characters per card.
- `keywords` and `articleTypes` continue to be normalized in the service layer before persistence.

## Implementation Notes

- Manual extraction uses deterministic text splitting for V1.1 baseline stability.
- Portrait extraction reads `KnowledgePortrait.title` and `KnowledgePortrait.content`.
- Image extraction reads `KnowledgeImage.title` and `KnowledgeImage.description`; it does not perform image understanding yet.
- The extraction service returns `{ candidates, saved, warnings }`.

## Verification

- `npx.cmd tsc -p tsconfig.api.json --noEmit`: passed.
- `npm.cmd run build:api`: blocked by local Prisma client DLL rename `EPERM` during `prisma generate`.
- `pnpm test`: not executed by instruction.
