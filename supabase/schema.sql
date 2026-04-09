-- VibeDeploy Supabase Schema
-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deploys table
CREATE TABLE IF NOT EXISTS deploys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_name TEXT,
  issues_found INTEGER DEFAULT 0,
  issues_fixed INTEGER DEFAULT 0,
  deploy_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deploy_id UUID NOT NULL REFERENCES deploys(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning')),
  type TEXT,
  file TEXT,
  line INTEGER,
  description TEXT,
  fixed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings (encrypted API keys)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS deploys_user_id_idx ON deploys(user_id);
CREATE INDEX IF NOT EXISTS deploys_created_at_idx ON deploys(created_at DESC);
CREATE INDEX IF NOT EXISTS issues_deploy_id_idx ON issues(deploy_id);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deploys ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Note: The web app uses the service key (bypasses RLS).
-- These policies protect direct client access.

CREATE POLICY "Users read own data"
  ON users FOR SELECT USING (auth.uid()::text = github_id);

CREATE POLICY "Users read own deploys"
  ON deploys FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE github_id = auth.uid()::text)
  );

CREATE POLICY "Users read own issues"
  ON issues FOR SELECT USING (
    deploy_id IN (
      SELECT id FROM deploys WHERE user_id IN (
        SELECT id FROM users WHERE github_id = auth.uid()::text
      )
    )
  );
