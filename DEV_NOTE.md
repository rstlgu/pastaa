# ⚠️ Note for Vercel Deploy

## Database Configuration

### Local Development (Current)
- **Provider**: SQLite
- **DATABASE_URL**: `file:./dev.db`
- Configured in `prisma/schema.prisma` as `provider = "sqlite"`

### Before Deploy to Vercel

**IMPORTANT**: Before deploying to Vercel, you must change the database provider:

1. **Modify `prisma/schema.prisma`**:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite" to "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Configure DATABASE_URL on Vercel**:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add: `DATABASE_URL=postgres://...` (URL of your PostgreSQL database)

4. **Deploy**:
   ```bash
   git add .
   git commit -m "Ready for production with PostgreSQL"
   git push
   # or
   vercel --prod
   ```

## Useful Commands

```bash
# For local development (SQLite)
npm run dev

# To test local build
npm run build

# To switch between SQLite and PostgreSQL
# Modify prisma/schema.prisma → provider
# Then run:
npx prisma generate
npx prisma db push
```

## Important Files
- `prisma/schema.prisma` - Database configuration
- `.env` - Local environment variables (don't commit!)
- `env.example` - Template for environment variables
