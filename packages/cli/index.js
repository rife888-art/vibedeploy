#!/usr/bin/env node
import { program } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import Anthropic from '@anthropic-ai/sdk'
import { execSync, spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { glob } from 'glob'
import { createPatch } from 'diff'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Config ────────────────────────────────────────────────────────────────────

const CONFIG_FILE = 'vibedeploy.config.json'
const VERSION = '0.1.0'
const DEFAULT_API_URL = 'https://web-seven-delta-81.vercel.app'

function loadConfig() {
  if (existsSync(CONFIG_FILE)) {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
  }
  return null
}

function saveConfig(config) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

async function ensureConfig() {
  let config = loadConfig()

  if (!config) {
    console.log()
    console.log(chalk.dim('  No vibedeploy.config.json found. Let\'s set things up.\n'))

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'anthropicKey',
        message: 'Anthropic API key:',
        mask: '•',
        validate: (v) => v.startsWith('sk-ant-') ? true : 'Should start with sk-ant-',
      },
      {
        type: 'password',
        name: 'vercelToken',
        message: 'Vercel token (from vercel.com/account/tokens):',
        mask: '•',
        validate: (v) => v.length > 10 ? true : 'Enter a valid token',
      },
      {
        type: 'password',
        name: 'cliToken',
        message: 'VibeDeploy CLI token (from dashboard Settings):',
        mask: '•',
        default: '',
      },
    ])

    config = {
      anthropicKey: answers.anthropicKey,
      vercelToken: answers.vercelToken,
      cliToken: answers.cliToken || null,
      apiUrl: DEFAULT_API_URL,
    }

    saveConfig(config)
    console.log()
    console.log(chalk.dim('  Config saved to vibedeploy.config.json'))
    console.log(chalk.yellow('  ⚠  Add vibedeploy.config.json to .gitignore!\n'))
  }

  return config
}

// ─── File reader ────────────────────────────────────────────────────────────────

const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.next/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '*.min.js',
  '*.min.css',
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.svg',
  '*.ico',
  '*.woff',
  '*.woff2',
  '*.ttf',
  '*.eot',
  '*.pdf',
  '*.zip',
]

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java',
  '.env', '.env.example', '.env.local', '.env.production',
  '.json', '.yaml', '.yml', '.toml',
  '.sh', '.bash',
])

async function readRepo(cwd = '.') {
  const files = await glob('**/*', {
    cwd,
    ignore: IGNORE_PATTERNS,
    nodir: true,
    dot: true,
  })

  const fileMap = {}
  let totalSize = 0
  const MAX_SIZE = 80000 // ~80KB of code

  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (!CODE_EXTENSIONS.has(ext) && !file.includes('.env')) continue

    try {
      const content = readFileSync(path.join(cwd, file), 'utf8')
      if (totalSize + content.length > MAX_SIZE) break
      fileMap[file] = content
      totalSize += content.length
    } catch {
      // skip unreadable files
    }
  }

  return fileMap
}

function bundleCode(fileMap) {
  return Object.entries(fileMap)
    .map(([file, content]) => `// FILE: ${file}\n${content}`)
    .join('\n\n' + '─'.repeat(60) + '\n\n')
}

// ─── Analyzer ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a production readiness checker for vibe-coded apps. Analyze this codebase and return JSON with:
{
  "issues": [
    {
      "severity": "critical" or "warning",
      "type": string,
      "file": string,
      "line": number or null,
      "description": string,
      "fix": string
    }
  ]
}

Focus ONLY on:
1. API keys or secrets hardcoded in non-.env files (e.g. OPENAI_API_KEY="sk-..." in a .ts file)
2. Supabase RLS disabled (look for createClient without RLS policies, or comments about RLS)
3. API endpoints or routes with no authentication check
4. SQL queries or database calls using unsanitized user input

Rules:
- Return max 10 issues total
- Critical: hardcoded secrets, exposed keys, no auth on sensitive endpoints
- Warning: missing RLS, potential injection, missing validation
- If no issues found, return {"issues": []}
- Return ONLY valid JSON. No markdown. No explanation. No backticks.`

async function analyzeCode(code, config, repoName) {
  const client = new Anthropic({ apiKey: config.anthropicKey })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze this codebase (repo: ${repoName}):\n\n${code}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'

  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { issues: [] }
  }
}

// ─── Fixes ─────────────────────────────────────────────────────────────────────

function applyFixes(issues, fileMap, cwd) {
  const fixed = []

  for (const issue of issues) {
    if (issue.severity !== 'critical') continue

    try {
      if (issue.type?.toLowerCase().includes('secret') || issue.type?.toLowerCase().includes('key')) {
        const result = fixHardcodedSecret(issue, fileMap, cwd)
        if (result) fixed.push(result)
      } else if (issue.type?.toLowerCase().includes('rls')) {
        const result = createRlsMigration(issue, cwd)
        if (result) fixed.push(result)
      }
    } catch (err) {
      // Skip fix if it fails
    }
  }

  return fixed
}

function fixHardcodedSecret(issue, fileMap, cwd) {
  if (!issue.file || !fileMap[issue.file]) return null

  const content = fileMap[issue.file]

  // Pattern: find KEY="value" or KEY='value' or KEY=`value`
  const secretPatterns = [
    /([A-Z_]{5,}(?:KEY|SECRET|TOKEN|PASSWORD|API_KEY|API_SECRET))\s*=\s*["'`]([^"'`]{8,})["'`]/g,
  ]

  let modified = content
  const replacements = []

  for (const pattern of secretPatterns) {
    modified = modified.replace(pattern, (match, keyName, keyValue) => {
      replacements.push({ keyName, keyValue })
      return `${keyName}=process.env.${keyName}`
    })
  }

  if (replacements.length === 0) return null

  // Write fixed file
  writeFileSync(path.join(cwd, issue.file), modified)

  // Append to .env if not already there
  const envPath = path.join(cwd, '.env')
  let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''

  for (const { keyName, keyValue } of replacements) {
    if (!envContent.includes(keyName)) {
      envContent += `\n${keyName}=${keyValue}`
    }
  }

  writeFileSync(envPath, envContent.trim() + '\n')

  // Ensure .gitignore has .env
  ensureGitignore(cwd, '.env')

  return {
    file: issue.file,
    description: `Moved ${replacements.map(r => r.keyName).join(', ')} to .env`,
  }
}

function createRlsMigration(issue, cwd) {
  const migrationsDir = path.join(cwd, 'supabase', 'migrations')
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true })
  }

  const timestamp = Date.now()
  const migrationFile = path.join(migrationsDir, `${timestamp}_enable_rls.sql`)

  const sql = `-- VibeDeploy: Enable RLS
-- Generated at ${new Date().toISOString()}

-- Enable Row Level Security on all tables
-- TODO: Review and customize these policies for your app

ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read/write only their own data
CREATE POLICY IF NOT EXISTS "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
`

  writeFileSync(migrationFile, sql)

  return {
    file: `supabase/migrations/${timestamp}_enable_rls.sql`,
    description: 'Created RLS migration — review and run with: supabase db push',
  }
}

function ensureGitignore(cwd, entry) {
  const gitignorePath = path.join(cwd, '.gitignore')
  let content = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : ''
  if (!content.split('\n').some(l => l.trim() === entry)) {
    content += `\n${entry}\n`
    writeFileSync(gitignorePath, content)
  }
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function displayIssues(issues) {
  if (issues.length === 0) {
    console.log(chalk.green('  ✓ No issues found'))
    return
  }

  const critical = issues.filter(i => i.severity === 'critical')
  const warnings = issues.filter(i => i.severity === 'warning')

  if (critical.length > 0) {
    console.log()
    for (const issue of critical) {
      const loc = issue.file ? chalk.dim(`  ${issue.file}${issue.line ? `:${issue.line}` : ''}`) : ''
      console.log(chalk.red(`  ✗ [CRITICAL] ${issue.description}`))
      if (loc) console.log(loc)
    }
  }

  if (warnings.length > 0) {
    console.log()
    for (const issue of warnings) {
      const loc = issue.file ? chalk.dim(`  ${issue.file}${issue.line ? `:${issue.line}` : ''}`) : ''
      console.log(chalk.yellow(`  ⚠  [WARNING] ${issue.description}`))
      if (loc) console.log(loc)
    }
  }
}

function displayFixes(fixes) {
  if (fixes.length === 0) return
  console.log()
  for (const fix of fixes) {
    console.log(chalk.green(`  ✓ ${fix.description}`))
    console.log(chalk.dim(`    → ${fix.file}`))
  }
}

function header() {
  console.log()
  console.log(
    chalk.bold('  VibeDeploy') +
    chalk.dim(` v${VERSION}`) +
    chalk.dim(' — Ship vibe code without getting burned')
  )
  console.log()
}

function divider() {
  console.log(chalk.dim('  ' + '─'.repeat(50)))
}

// ─── Main deploy flow ──────────────────────────────────────────────────────────

async function runDeploy({ checkOnly = false, fixOnly = false } = {}) {
  header()

  const cwd = process.cwd()
  const repoName = path.basename(cwd)

  // 1. Config
  const config = await ensureConfig()

  // 2. Read repo
  const spinner = ora({ text: chalk.dim('  Reading repo...'), prefixText: '' }).start()

  let fileMap
  try {
    fileMap = await readRepo(cwd)
    spinner.succeed(chalk.dim(`  Read ${Object.keys(fileMap).length} files`))
  } catch (err) {
    spinner.fail(chalk.red('  Failed to read repo'))
    process.exit(1)
  }

  // 3. Analyze
  const analyzeSpinner = ora({ text: chalk.dim('  Checking repo...') }).start()
  const code = bundleCode(fileMap)
  let result

  try {
    result = await analyzeCode(code, config, repoName)
    analyzeSpinner.stop()
  } catch (err) {
    analyzeSpinner.fail(chalk.red('  Analysis failed: ' + err.message))
    process.exit(1)
  }

  const issues = result.issues || []
  const critical = issues.filter(i => i.severity === 'critical')

  divider()

  if (issues.length === 0) {
    console.log(chalk.green('\n  ✓ Repo looks clean. No issues found.\n'))
  } else {
    console.log(
      chalk.bold(`\n  Found ${chalk.red(critical.length + ' critical')} and ${chalk.yellow((issues.length - critical.length) + ' warning')} issues:\n`)
    )
    displayIssues(issues)
  }

  if (checkOnly) {
    console.log()
    divider()
    console.log()
    process.exit(issues.length > 0 ? 1 : 0)
  }

  // 4. Offer to fix
  let fixes = []
  if (critical.length > 0) {
    console.log()
    const { shouldFix } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldFix',
        message: `  Fix ${critical.length} critical issue${critical.length > 1 ? 's' : ''} automatically?`,
        default: true,
      },
    ])

    if (shouldFix) {
      const fixSpinner = ora({ text: chalk.dim('  Applying fixes...') }).start()
      fixes = applyFixes(issues, fileMap, cwd)
      fixSpinner.succeed(chalk.dim(`  Applied ${fixes.length} fix${fixes.length !== 1 ? 'es' : ''}`))
      displayFixes(fixes)
    }
  }

  if (fixOnly) {
    console.log()
    divider()
    console.log()
    process.exit(0)
  }

  // 5. Deploy
  console.log()
  const { shouldDeploy } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldDeploy',
      message: '  Deploy to Vercel?',
      default: true,
    },
  ])

  if (!shouldDeploy) {
    console.log()
    console.log(chalk.dim('  Deploy skipped.'))
    console.log()
    process.exit(0)
  }

  // 6. Run vercel
  console.log()
  const deploySpinner = ora({ text: chalk.dim('  Deploying to Vercel...') }).start()

  try {
    const output = execSync(
      `npx vercel --prod --token="${config.vercelToken}" --yes`,
      { cwd, encoding: 'utf8', timeout: 120000, stdio: 'pipe' }
    )

    const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/)
    const deployUrl = urlMatch ? urlMatch[0] : null

    deploySpinner.stop()

    divider()
    console.log()
    console.log(chalk.green('  ✓ Live at ') + chalk.bold.white(deployUrl || 'your Vercel dashboard'))

    // Report to dashboard
    const reported = await reportToDashboard(config, {
      repoName,
      issues,
      fixes,
      deployUrl,
    })

    if (reported) {
      console.log(chalk.dim('  ✓ Reported to dashboard'))
    }

    console.log()
    console.log(
      chalk.bold.green('  Clean deploy.') +
      (fixes.length > 0 ? chalk.dim(` ${fixes.length} issue${fixes.length > 1 ? 's' : ''} fixed.`) : '') +
      chalk.dim(' Done.')
    )
    console.log()

  } catch (err) {
    deploySpinner.fail(chalk.red('  Deploy failed'))
    console.log(chalk.dim('\n  ' + err.message))
    console.log()
    process.exit(1)
  }
}

// ─── Report to dashboard ──────────────────────────────────────────────

async function reportToDashboard(config, { repoName, issues, fixes, deployUrl }) {
  if (!config.cliToken) return null

  const apiUrl = config.apiUrl || DEFAULT_API_URL
  const fixedFiles = new Set(fixes.map(f => f.file))

  try {
    const res = await fetch(`${apiUrl}/api/cli/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.cliToken}`,
      },
      body: JSON.stringify({
        repo_name: repoName,
        issues_found: issues.length,
        issues_fixed: fixes.length,
        deploy_url: deployUrl,
        issues: issues.map(i => ({
          severity: i.severity,
          type: i.type,
          file: i.file,
          line: i.line,
          description: i.description,
          fixed: fixedFiles.has(i.file),
        })),
      }),
    })

    if (res.ok) return await res.json()
    return null
  } catch {
    return null
  }
}

// ─── CLI setup ─────────────────────────────────────────────────────────────────

program
  .name('vibedeploy')
  .description('Ship vibe code without getting burned')
  .version(VERSION)
  .option('--check', 'Check only — no fixes, no deploy')
  .option('--fix', 'Fix only — no deploy')
  .action(async (options) => {
    await runDeploy({
      checkOnly: options.check,
      fixOnly: options.fix,
    })
  })

program.parse()
