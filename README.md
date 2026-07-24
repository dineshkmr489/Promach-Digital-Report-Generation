# Promach Digital Service Reports

A responsive operational application for maintaining Promach master data,
creating equipment service reports, securely sharing one report with a client,
collecting a digital signature, and generating the locked signed PDF.

## Implemented workflow

- Durable master data for clients, sites, equipment, checklist templates,
  measurement definitions, and technicians
- Guided report creation from reusable master records
- Per-equipment Yes / No / N/A checklist results, remarks, readings, and notes
- Draft, awaiting-signature, and locked-completed report states
- Cryptographically random one-report client signing links
- Client review and signature from a phone, tablet, or desktop
- Client signature capture directly on a Promach admin device
- Signature channel, signer identity, timestamp, consent, and report audit trail
- Signed PDF generation with signature image and signing metadata
- Original Changi General Hospital report 4122 and Tuas Power report 3930
  preserved as source-backed completed records

The admin application requires authenticated access. Client links expose only
the assigned report and remain usable after signing so the client can download
the completed copy. Issuing a replacement link invalidates the previous link.

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

Run verification:

```bash
npx tsc --noEmit
npm run lint
node --test tests/rendered-html.test.mjs
```

Regenerate the two checked PDF samples from the verified records:

```bash
npm run generate:pdfs
```

## Technology

- Next.js / React / TypeScript
- Tailwind CSS build pipeline with project CSS design tokens
- Vinext and Cloudflare Workers-compatible output
- Lucide interface icons
