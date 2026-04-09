# VibeDeploy

**AI-powered security auditor for web applications.** Connect your GitHub repo, get an instant security report with a grade (A–F), and fix vulnerabilities before they reach production.

🌊 Live: [web-seven-delta-81.vercel.app](https://web-seven-delta-81.vercel.app)

---

## What It Does

VibeDeploy reads your codebase directly from GitHub and runs it through Claude AI to detect security issues — hardcoded secrets, missing auth, SQL injection, XSS, insecure configs, and more.

### How It Works

1. **Sign in** with GitHub (OAuth with `repo` scope)
2. **Select a repository** from your GitHub account
3. **Get a security report** — grade A–F, score 0–100, detailed findings with fix suggestions
4. **Review findings** — each issue shows severity (critical/warning/info), affected file, line number, and how to fix it

### Features

- **Instant code audits** — analyzes up to 30 files per repo via GitHub API
- **Security grading** — A through F based on severity of findings
- **Detailed reports** — each finding includes file path, description, and fix recommendation
- **Private repos supported** — OAuth grants access to both public and private repositories
- **Fast** — audits complete in 15–30 seconds

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, Server Components) |
| Auth | NextAuth.js + GitHub OAuth |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Hosting | Vercel |
| Styling | Tailwind CSS (dark theme, teal accent) |
| CLI | Node.js (published on npm as `vibedeploy`) |

---

## Project Structure

```
vibedeploy/
├── apps/
│   └── web/                    # Next.js web application
│       ├── app/
│       │   ├── api/
│       │   │   ├── audits/     # POST: start audit, GET: list audits
│       │   │   ├── github/     # GET: list user's GitHub repos
│       │   │   ├── analyze/    # POST: Claude code analysis
│       │   │   ├── cli/        # POST: CLI deploy reports
│       │   │   ├── settings/   # GET/POST: user settings
│       │   │   └── auth/       # NextAuth endpoints
│       │   ├── dashboard/
│       │   │   ├── audits/     # Audit list, new audit, audit detail pages
│       │   │   ├── deploy/     # Deploy detail page
│       │   │   └── settings/   # Settings page
│       │   └── auth/
│       │       └── signin/     # Custom sign-in page
│       ├── components/
│       │   ├── dashboard/      # Sidebar, Header
│       │   ├── Nav.tsx         # Landing page nav
│       │   └── Footer.tsx      # Landing page footer
│       └── lib/
│           ├── auth.ts         # NextAuth config with GitHub OAuth
│           ├── supabase.ts     # Supabase clients (admin + anon)
│           └── utils.ts        # Utility functions
├── packages/
│   └── cli/                    # CLI tool (npm: vibedeploy)
│       ├── index.js            # Main CLI entry point
│       └── package.json
└── supabase/
    └── schema.sql              # Database schema
```

---

## Database Schema

### Tables

- **users** — GitHub-authenticated users (id, github_id, email, plan)
- **audits** — Security audit records (id, user_id, repo_name, grade, score, status, summary)
- **audit_findings** — Individual findings per audit (id, audit_id, severity, type, file, line, description, fix)
- **deploys** — CLI deploy records (id, user_id, repo_name, issues_found, deploy_url)
- **issues** — CLI-reported issues per deploy
- **user_settings** — Key-value settings per user (CLI tokens, etc.)

---

## Environment Variables

Create `apps/web/.env.local`:

```env
# Anthropic / Claude
ANTHROPIC_API_KEY=sk-ant-...

# GitHub OAuth (create at github.com/settings/developers)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# NextAuth
NEXTAUTH_SECRET=...          # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- A GitHub OAuth App
- An Anthropic API key

### Setup

```bash
# Clone the repo
git clone https://github.com/rife888-art/vibedeploy.git
cd vibedeploy

# Install dependencies
npm install

# Set up the database
# Copy supabase/schema.sql into your Supabase SQL Editor and run it

# Configure environment
cp apps/web/.env.local.example apps/web/.env.local
# Fill in your keys

# Run locally
cd apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/github/repos` | List authenticated user's GitHub repos |
| POST | `/api/audits` | Start a new security audit on a repo |
| GET | `/api/audits` | List user's audits |
| GET | `/api/audits/[id]` | Get audit details + findings |
| POST | `/api/analyze` | Run Claude analysis on raw code |
| POST | `/api/cli/report` | Accept deploy report from CLI |
| GET/POST | `/api/settings` | Manage user settings |

---

## CLI Tool

The CLI is also published on npm as `vibedeploy`. It scans a local project, runs security analysis, and deploys to Vercel.

```bash
npx vibedeploy
```

---

## Deployment

The app is deployed on Vercel. To deploy your own:

```bash
cd apps/web
npx vercel --prod
```

Make sure all environment variables are set in Vercel project settings.

---

## Security Model

- All API routes require authentication via NextAuth session
- Supabase uses service role key server-side (bypasses RLS)
- GitHub access tokens are stored in JWT, never in the database
- CLI authentication uses per-user tokens stored in user_settings
- `.env` files are gitignored

---

## License

MIT
