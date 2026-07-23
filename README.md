# Promach Digital Service Reports

A responsive Next.js application for reviewing source-backed Promach service
records and generating structured report PDFs.

## Current verified dataset

- Changi General Hospital report 4122 from the supplied 9-page scan
- Tuas Power Generation report 3930 from the supplied service-report image
- Seven equipment service records
- Checklist results, readings, technicians, acknowledgements, and follow-up
- Original source-document access
- Per-report PDF generation
- Explicit transcription-review notes where handwriting is unclear

Previous demonstration customers, reports, equipment, people, and measurements
have been removed. The application contains only facts transcribed from the
supplied source files.

## Implementation plan

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the detailed
phase plan, architecture, data model, acceptance criteria, security controls,
testing strategy, and production rollout.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

Run source checks:

```bash
npx tsc --noEmit
npm run lint
node --test tests/rendered-html.test.mjs
```

## Technology

- Next.js / React / TypeScript
- Tailwind CSS build pipeline with project CSS design tokens
- Vinext and Cloudflare Workers-compatible output
- Lucide interface icons
