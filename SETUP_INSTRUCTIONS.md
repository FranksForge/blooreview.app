# BlooReview MVP Setup Instructions

## Step 1: Install Dependencies

Run in your project root:
```bash
npm install
```

This will install:
- `@vercel/postgres` - PostgreSQL client
- `jsonwebtoken` - JWT token handling
- `bcryptjs` - Password hashing
- `cookie` - Cookie parsing
- `stripe` - Payment processing

## Step 2: Set Up Database

### Option A: Vercel Postgres (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Create Database** → **Postgres**
3. Create a new database
4. Copy the connection string (it will be in format: `postgres://...`)
5. Add to environment variables as `POSTGRES_URL`

### Option B: Supabase

1. Create account at supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy connection string
5. Add to environment variables as `POSTGRES_URL`

### Option C: Railway

1. Create account at railway.app
2. Create new PostgreSQL database
3. Copy connection string
4. Add to environment variables as `POSTGRES_URL`

## Step 3: Run Database Schema

1. Connect to your database (use Vercel dashboard SQL editor, Supabase SQL editor, or psql)
2. Open `database/schema.sql`
3. Copy and paste the entire SQL file
4. Run it to create all tables

Or use the Vercel CLI:
```bash
vercel env pull .env.local
psql $POSTGRES_URL < database/schema.sql
```

## Step 4: Set Up Environment Variables

Add these to your Vercel project (Settings → Environment Variables):

### Required:
- `POSTGRES_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Random secret string for JWT signing (generate with: `openssl rand -base64 32`)

### For Payment (Phase 3):
- `STRIPE_SECRET_KEY` - Stripe secret key (get from Stripe dashboard)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (set up webhook first)

### Existing (keep these):
- `GOOGLE_MAPS_API_KEY` - Your existing Google Maps API key
- `GITHUB_TOKEN` - For config.js updates (if still using)
- `GITHUB_REPO` - Your GitHub repo (if still using)

## Step 5: Test Authentication

Once everything is set up, you can test the auth endpoints:

### Register a user:
```bash
curl -X POST https://your-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Login:
```bash
curl -X POST https://your-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Verify token:
```bash
curl -X GET https://your-domain.vercel.app/api/auth/verify \
  -H "Cookie: auth_token=YOUR_TOKEN_HERE"
```

## Next Steps

After completing setup:
1. ✅ Phase 1 is complete (Authentication)
2. Next: Phase 2 - Create signup/onboarding flow
3. Then: Phase 3 - Payment integration
4. Then: Phase 4 - Dashboard

## Troubleshooting

### Database connection issues:
- Make sure `POSTGRES_URL` is set correctly
- Check that your database allows connections from Vercel IPs
- For Vercel Postgres, this is automatic

### JWT errors:
- Make sure `JWT_SECRET` is set
- Use a strong random string (at least 32 characters)

### Module not found errors:
- Run `npm install` again
- Make sure you're using Node.js 18+ in Vercel

