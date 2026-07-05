# 2026-06-30 EvidenceCard V1.1 extract-api-core

- Backend endpoint: `POST /api/v1/evidence-cards/extract`.
- Service entry: `extractEvidenceCards(request, actorUserId)`.
- Response shape: `{ candidates, saved, warnings }`.
- Supported extraction sources: `manual`, `portrait`, `image`.
- Manual extraction is fully usable with deterministic text splitting in this baseline.
- `save=false` returns candidates only and does not write EvidenceCard rows.
- `save=true` saves draft EvidenceCards only.
- Portrait extraction reads `KnowledgePortrait.title` and `KnowledgePortrait.content`.
- Image extraction reads `KnowledgeImage.title` and `KnowledgeImage.description`; no image understanding is implemented yet.
- The extraction path does not call LLM, network search, vector DB, ContentMission, EntityGraph, or platform scoring.
- Saved candidates still pass through service normalization for `keywords` and `articleTypes`.
