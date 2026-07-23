# Promach Digital Service Reports

A responsive Next.js application concept for creating, reviewing, signing, and
archiving professional equipment service reports.

## Included in this product prototype

- Admin and client sign-in journeys
- Responsive admin and client dashboards
- Report status, search, and history views
- Four-step service-report creation workflow
- Equipment-driven checklist and measurement entry
- Client review and touch/mouse/stylus signature capture
- Master-data, technician, and company-setting screens
- Desktop, tablet, and mobile navigation patterns
- Accessible labels, focus behavior, and reduced-motion support

The current interface uses realistic demonstration data so the complete product
journey can be reviewed. Production authentication, database persistence,
private file storage, email notifications, and PDF generation are specified in
the implementation plan and belong to the next engineering phases.

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
