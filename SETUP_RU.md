# VibeDeploy — Инструкция по настройке

## 1. Supabase (база данных)

1. Зайди на https://supabase.com и создай аккаунт (или войди)
2. Нажми **New Project**
3. Введи название: `vibedeploy`, придумай пароль для БД, выбери регион (EU West)
4. Подожди ~2 минуты пока проект создастся
5. Зайди в **SQL Editor** (иконка в левом меню)
6. Скопируй содержимое файла `supabase/schema.sql` и вставь в редактор
7. Нажми **Run** — таблицы создадутся автоматически
8. Зайди в **Project Settings > API** и скопируй:
   - `Project URL` — это твой `SUPABASE_URL`
   - `anon public` ключ — это `SUPABASE_ANON_KEY`
   - `service_role secret` ключ — это `SUPABASE_SERVICE_KEY`

## 2. GitHub OAuth (авторизация)

1. Зайди на https://github.com/settings/developers
2. Нажми **New OAuth App**
3. Заполни:
   - **Application name**: `VibeDeploy`
   - **Homepage URL**: `http://localhost:3000` (потом поменяешь на продакшн URL)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Нажми **Register application**
5. Скопируй **Client ID** — это `GITHUB_CLIENT_ID`
6. Нажми **Generate a new client secret**, скопируй — это `GITHUB_CLIENT_SECRET`

## 3. Anthropic API (анализ кода)

1. Зайди на https://console.anthropic.com
2. Зайди в **API Keys**
3. Нажми **Create Key**
4. Скопируй ключ (начинается с `sk-ant-`) — это `ANTHROPIC_API_KEY`

## 4. Stripe (платежи) — опционально

1. Зайди на https://dashboard.stripe.com
2. Зайди в **Developers > API keys**
3. Скопируй:
   - **Publishable key** (начинается с `pk_`) — это `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (начинается с `sk_`) — это `STRIPE_SECRET_KEY`
4. Для вебхуков: **Developers > Webhooks > Add endpoint**
   - URL: `https://твой-домен.com/api/webhook`
   - Скопируй **Signing secret** — это `STRIPE_WEBHOOK_SECRET`

## 5. Заполни .env.local

```bash
cd /Users/markkrasotin/Downloads/vibedeploy/apps/web
cp .env.example .env.local
```

Открой `.env.local` и вставь все ключи:

```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=любая-случайная-строка-минимум-32-символа
NEXTAUTH_URL=http://localhost:3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Для `NEXTAUTH_SECRET` можешь сгенерировать так:
```bash
openssl rand -base64 32
```

## 6. Запуск локально

```bash
cd /Users/markkrasotin/Downloads/vibedeploy/apps/web
npm run dev
```

Открой http://localhost:3000

## 7. Деплой на Vercel

### Вариант А — через CLI:
```bash
cd /Users/markkrasotin/Downloads/vibedeploy/apps/web
npx vercel
```
Следуй инструкциям, потом добавь env переменные в Vercel Dashboard.

### Вариант Б — через GitHub:
1. Запушь проект на GitHub
2. Зайди на https://vercel.com/new
3. Импортируй репозиторий
4. **Root Directory**: `apps/web`
5. Добавь все переменные окружения из `.env.local`
6. Нажми **Deploy**

После деплоя не забудь обновить:
- `NEXTAUTH_URL` на продакшн URL
- GitHub OAuth callback URL на `https://твой-домен.vercel.app/api/auth/callback/github`

## 8. Публикация CLI на npm

```bash
cd /Users/markkrasotin/Downloads/vibedeploy/packages/cli
npm login
npm publish
```

После этого `npx vibedeploy` будет работать у всех.

---

Если что-то не работает — скинь ошибку, разберемся.
