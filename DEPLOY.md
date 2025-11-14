# Deploy Guide for Vercel

## Prerequisites

- Vercel account
- PostgreSQL database (recommended: Vercel Postgres)

## Deploy Steps

### 1. Create Database

On Vercel Dashboard:
1. Go to your project
2. Select "Storage" → "Create Database"
3. Choose "Postgres"
4. Copy the generated `DATABASE_URL`

### 2. Configure Environment Variables

In your Vercel project, go to Settings → Environment Variables and add:

```
DATABASE_URL=postgres://...
```

### 3. Deploy

#### Option A: Deploy from GitHub

1. Connect GitHub repository to Vercel
2. Vercel will automatically deploy

#### Option B: Deploy from CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### 4. Initialize Database

After first deploy, run migrations:

```bash
# From your local machine, with DATABASE_URL configured
npx prisma db push
```

Or use Vercel CLI:

```bash
vercel env pull .env.local
npx prisma db push
```

## Required Environment Variables

### `DATABASE_URL` (Required)

PostgreSQL database connection URL.

**Example for Vercel Postgres:**
```
postgres://username:password@host:5432/database
```

**Example for local development with SQLite:**
```
file:./dev.db
```
(Note: to use SQLite, modify `prisma/schema.prisma` changing `provider = "postgresql"` to `provider = "sqlite"`)

## Local Development

### With PostgreSQL

1. Install PostgreSQL locally
2. Create a database: `createdb pastaa`
3. Copy `.env.example` to `.env`
4. Modify `DATABASE_URL` in `.env` file
5. Run migrations: `npm run db:push`
6. Start server: `npm run dev`

### With SQLite (simpler)

1. Modify `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
2. Run: `npx prisma generate`
3. Run: `npm run db:push`
4. Start: `npm run dev`

## Important Notes

- ⚠️ **SQLite is not supported on Vercel** (only for local development)
- ✅ For production always use **PostgreSQL** or other cloud DB
- 🔒 All data is encrypted end-to-end client-side
- 🔑 Encryption keys are never sent to the server
- 🗑️ Pastes with "burn after reading" are automatically deleted after first view

## Useful Commands

```bash
# Development
npm run dev

# Local build
npm run build

# Prisma Studio (GUI for database)
npm run db:studio

# Push schema to database
npm run db:push

# Generate Prisma Client
npx prisma generate
```

## Troubleshooting

### Error: "Can't reach database server"

- Verify that `DATABASE_URL` is correct
- Check that database is accessible
- On Vercel, make sure variable is configured

### Build error on Vercel

- Verify that `postinstall` script is present in `package.json`
- Check build logs for specific errors

### Database not synchronized

```bash
# Complete database reset (⚠️ DELETES ALL DATA)
npx prisma db push --force-reset
```
