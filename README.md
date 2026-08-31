# Promach Digital Service Reports

Promach Digital Service Reports is a self-hosted Next.js application for
maintaining master data, creating equipment service reports, securely sharing a
single report with a client, collecting a digital signature, and downloading
the completed signed PDF.

All operational data is persisted in AWS DynamoDB (25 GB Always-Free Tier):

- company profile
- clients and sites
- equipment
- checklist templates and measurement definitions
- technicians
- service types
- service reports, compressed service images, secure-link state, signatures,
  and audit trails
- user profiles, roles, and salted password hashes

The application no longer contains Cloudflare Workers, D1, Vinext, or OpenAI
Sites deployment configuration.

## Local setup

Requirements:

- Node.js 22.13 or newer
- AWS credentials or EC2 IAM role with DynamoDB and S3 permissions

Copy `.env.example` to `.env.local` and configure:

```dotenv
APP_URL=http://localhost:3000
AWS_REGION=ap-southeast-1
S3_BUCKET=digi-repo-gen
ADMIN_USERNAME=promach-admin
ADMIN_PASSWORD=use-a-long-random-password
AUTH_SECRET=use-at-least-32-random-characters
ADMIN_NAME=Promach Administrator
ADMIN_EMAIL=admin@example.com
```

Then install, initialize the database, and start the application:

```bash
npm install
npm run seed
npm run dev
```

Open `http://localhost:3000` and enter the configured administrator username
and password. The seed is idempotent: it creates the initial operational
records only when they do not already exist, so it does not overwrite later
master-data or report changes.

The `ADMIN_*` values create the first database-backed Administrator account
when the DynamoDB users table is empty. Further accounts are managed inside the
application:

- **Administrator** — complete access, including users and roles
- **Operations Manager** — master data and complete report workflow
- **Service Technician** — report creation and processing
- **Viewer** — read-only dashboard and report access

Passwords are stored as salted scrypt hashes and are never returned to the
browser.

## Verification

```bash
npx tsc --noEmit
npm run lint
npm test
```

Regenerate the checked sample PDFs:

```bash
npm run generate:pdfs
```

## EC2 build

Build a self-contained Next.js server:

```bash
npm ci
npm run build:ec2
```

The deployable application is written to `.next/standalone`. Copy that
directory to `/opt/promach-dsr` on EC2. Create `/etc/promach-dsr.env` using the
same variables as `.env.example`; never copy `.env.local` into source control or
an AMI.

Example systemd and nginx files are provided in:

- `deploy/promach-dsr.service.example`
- `deploy/nginx-promach.conf.example`

Before exposing the server, replace the example administrator password,
terminate HTTPS at nginx or an AWS load balancer, and restrict inbound security-group
ports to SSH plus HTTP/HTTPS.

## Report signing

The admin workspace uses a branded sign-in page and a signed, HTTP-only
12-hour session cookie. Eight unsuccessful sign-in attempts from one address
temporarily lock further attempts for 15 minutes. A generated client signing
URL remains public but contains a random, single-report token. Only the token
hash is stored in the database. Issuing a replacement link invalidates the previous
link. A completed report is locked and retains the signer identity, timestamp,
consent text, signature image, channel, and audit trail.

See `docs/IMPLEMENTATION_PLAN.md` for the broader workflow and data model.
