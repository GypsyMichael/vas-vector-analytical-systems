# VAS - Vector Analytical Systems

## Overview
VAS (Vector Analytical Systems) is an AI-powered predictive intelligence platform and video production studio. It operates in two layers: (1) Intelligence Core - a dataset-agnostic prediction engine with training, drift detection, exploration/exploitation, pattern retirement, and multi-layer signal ingestion for attention migration tracking, and (2) Video Engine - a demonstration layer that creates short-form video ads with AI-generated scripts (GPT-4o), voiceover (TTS-1 onyx), and scene images (gpt-image-1). Targets blue-collar contractor audiences with 10 locked humor categories.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM (28 tables)
- **AI**: OpenAI (GPT-4o for scripts, gpt-image-1 for images, TTS-1 onyx voice)
- **Auth**: JWT-based with bcrypt password hashing
- **Routing**: wouter (frontend), Express (backend)
- **State**: @tanstack/react-query

## Design System: "Dark Steel & Sarcasm"
- Industrial dark theme (dark-first)
- Colors: steel-bg (#1C1F24), steel-surface (#2A2F36), industrial-blue (#4A90D9)
- Typography: JetBrains Mono (headers, uppercase), Inter (body)
- Minimal border-radius (2-4px), no gradients, no emojis
- Logo: VAS logo at `attached_assets/IMG_8151_1771729379736.jpeg`, imported via `@assets/IMG_8151_1771729379736.jpeg`

## Project Structure
```
client/src/
  pages/          - Landing, Auth, Dashboard, Ad Engine, Humor Screener, Copy Assistant, Research, Knowledge Base, Intelligence Core, Settings
  components/     - App Shell, Theme Provider, shadcn UI components
  lib/            - Auth context, Query client utilities
server/
  routes.ts       - All API routes (80+ across 9 subsystems)
  storage.ts      - DatabaseStorage with Drizzle ORM
  db.ts           - Database connection
  intelligence-core/
    feature-engineering.ts  - Pluggable dataset type registry, normalization, video ad extractors
    model-training.ts       - Deterministic multivariate regression (normal equation)
    prediction.ts           - Pre-release prediction & snapshot system (SHA-256 hash)
    exploration.ts          - Epsilon-greedy exploration with AMI-driven adjustment
    drift-detection.ts      - Rolling window drift detection, pattern retirement
    optimization.ts         - Delta simulation and projected lift
    signal-ingestion.ts     - Multi-layer signal tracking (6 layers)
    correlation-engine.ts   - Cross-layer correlation, lag detection, AMI composite score
    signal-sources.ts       - Wikipedia, Google Trends, Reddit, GNews, YouTube, eBay adapters
    routes.ts               - Intelligence Core API routes
shared/
  schema.ts       - 28 Drizzle table definitions
```

## API Subsystems
1. **Auth** - Register, Login, Me (JWT Bearer tokens)
2. **Ad Engine** - Scenario generation, script creation, voiceover, scene images, video render
3. **Humor Screener** - Performance tracking, benchmarks, analytics, AI suggestions
4. **Copy Assistant** - Campaign management, AI conversation workflow
5. **Environment Discovery** - Platform analysis (GPT-4o), profile management with video creation briefs, audience pain points, humor category mapping, emotional triggers, competitor weaknesses, content gaps, seasonal hooks, product inventory. Aggregated via `/api/environment/video-brief` endpoint.
6. **Knowledge Base** - Research queries, knowledge entries, AI insights
7. **Content Strategy** - Strategy generation, calibration, category management
8. **YouTube Research** - Status, scan (YouTube Data API v3), batch analysis (GPT-4o humor insights)
9. **Intelligence Core** - Dataset CRUD, training, prediction, validation, signals, AMI, optimization, drift, exploration

## SEO
- XML sitemap at `/sitemap.xml`, robots.txt at `/robots.txt`
- Open Graph and Twitter Card meta tags in `client/index.html`
- JSON-LD structured data (SoftwareApplication schema)
- Per-page document.title updates via useEffect
- OG image: `client/public/og-image.png`

## Running
- Workflow: `npm run dev` starts Express + Vite on port 5000
- Database: PostgreSQL via DATABASE_URL env var
- Required secrets: SESSION_SECRET, OPENAI_API_KEY (via AI integrations)
