# BlooReview SaaS - Step-by-Step Implementation Plan

## Prerequisites & Setup

### Step 1: Repository & Project Setup
1. Create new GitHub repository: `blooreview-saas`
2. Clone repository locally
3. Create new Vercel project: `blooreview-saas`
4. Connect GitHub repository to Vercel project
5. Configure domain `blooreview.com` in Vercel
6. Set up environment variables in Vercel:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `JWT_SECRET` (for token signing)
   - `STRIPE_SECRET_KEY` (Stripe API key)
   - `STRIPE_WEBHOOK_SECRET` (for webhook verification)
   - `SYNC_SECRET_TOKEN` (shared secret for .app sync)
   - `GOOGLE_MAPS_API_KEY` (for business lookup)
   - `GITHUB_TOKEN` (for config.js updates)
   - `GITHUB_REPO` (owner/repo for .app project)

### Step 2: Database Setup
1. Set up PostgreSQL database (Vercel Postgres, Supabase, or Railway)
2. Get connection string
3. Create database schema:
   - Users table
   - Businesses table
   - Reviews table
   - Subscriptions table
4. Set up database migrations (optional: use Prisma or similar)
5. Test database connection

### Step 3: Existing Project Preparation
1. In `BlooReview` repository (blooreview.app):
   - Create `api/sync/config.js` endpoint
   - Add `SYNC_SECRET_TOKEN` to environment variables
   - Test endpoint accessibility

---

## Phase 1: Foundation (Week 1)

### Step 4: Authentication System
1. Install dependencies:
   ```bash
   npm install jsonwebtoken bcryptjs cookie
   ```
2. Create `api/auth/register.js`:
   - Validate email/password
   - Hash password with bcrypt
   - Create user in database
   - Return JWT token
3. Create `api/auth/login.js`:
   - Verify credentials
   - Generate JWT token
   - Set httpOnly cookie
   - Return user data
4. Create `api/auth/verify.js`:
   - Verify JWT from cookie
   - Return user data if valid
5. Create `api/auth/logout.js`:
   - Clear auth cookie
6. Create auth middleware utility:
   - Function to verify JWT in protected routes
   - Extract user from token

### Step 5: Landing Page
1. Create `public/index.html`:
   - Hero section
   - Features section
   - Pricing section
   - CTA buttons
2. Create `public/landing.css`:
   - Modern, minimalist design
   - Responsive layout
   - Smooth animations
3. Create `public/landing.js`:
   - Smooth scroll navigation
   - CTA button handlers
4. Test landing page on `blooreview.com`

### Step 6: Auth Pages
1. Create `public/auth/login.html`:
   - Email/password form
   - "Forgot Password" link
   - "Sign Up" link
   - Error message display
2. Create `public/auth/register.html`:
   - Email/password form
   - Password strength indicator
   - Terms acceptance checkbox
   - Error message display
3. Create `public/auth/auth.css`:
   - Clean form styling
   - Responsive design
4. Create `public/auth/auth.js`:
   - Form validation
   - API calls to auth endpoints
   - Redirect on success
   - Error handling
5. Test login/register flow

---

## Phase 2: Onboarding Flow (Week 2)

### Step 7: Business Selection
1. Create `public/onboarding/business.html`:
   - Google Maps URL input
   - "Fetch Business" button
   - Business preview section
   - "Continue" button
2. Create `api/business/maps.js`:
   - Reuse logic from `api/admin/maps.js`
   - Return business details
3. Create `public/onboarding/onboarding.css`:
   - Step indicator
   - Form styling
   - Preview card styling
4. Create `public/onboarding/onboarding.js`:
   - Fetch business details
   - Display preview
   - Store in session/localStorage
   - Navigate to next step

### Step 8: Payment Integration
1. Install Stripe:
   ```bash
   npm install stripe
   ```
2. Create `api/payment/create-checkout.js`:
   - Create Stripe Checkout session
   - Set success/cancel URLs
   - Return session URL
3. Create `public/onboarding/payment.html`:
   - Pricing plan selection
   - Plan comparison table
   - "Continue to Payment" button
4. Create `api/payment/webhook.js`:
   - Verify webhook signature
   - Handle `checkout.session.completed`
   - Update user subscription in database
5. Create `public/onboarding/payment.js`:
   - Plan selection handler
   - Redirect to Stripe Checkout
   - Handle return from Stripe
6. Test payment flow with Stripe test mode

### Step 9: Configuration Page
1. Create `public/onboarding/configure.html`:
   - Discount settings form
   - Referral campaign toggle
   - Review threshold selector
   - Google Sheets URL input
   - Preview section
   - "Save & Continue" button
2. Create `api/business/create.js`:
   - Validate user subscription limits
   - Generate slug from business name
   - Handle slug collisions
   - Save to database
   - Call sync API to `.app` project
   - Return business data
3. Create `public/onboarding/configure.js`:
   - Form handling
   - Preview generation
   - API call to create business
   - Navigate to success page
4. Test business creation and sync

### Step 10: Success Page
1. Create `public/onboarding/success.html`:
   - Review page URL display
   - QR code canvas
   - "Copy URL" button
   - "Download QR" button
   - "Go to Dashboard" button
2. Create `api/admin/qrcode.js` (if not exists):
   - Generate QR code from URL
   - Return data URL
3. Create `public/onboarding/success.js`:
   - Generate QR code
   - Copy URL functionality
   - Download QR code
   - Navigation handlers
4. Test complete onboarding flow

---

## Phase 3: Dashboard (Week 3)

### Step 11: Dashboard Layout
1. Create `public/dashboard/index.html`:
   - Header with user menu
   - Sidebar navigation (optional)
   - Main content area
   - Business cards grid
2. Create `api/user/businesses.js`:
   - Get user ID from JWT
   - Query businesses from database
   - Return business list with stats
3. Create `public/dashboard/dashboard.css`:
   - Modern card-based layout
   - Responsive grid
   - Clean typography
4. Create `public/dashboard/dashboard.js`:
   - Fetch businesses on load
   - Render business cards
   - Handle navigation
   - Loading states

### Step 12: Business Cards & Stats
1. Enhance business cards:
   - Business name and category
   - Hero image thumbnail
   - Quick stats (review count, avg rating)
   - "Settings" and "Analytics" buttons
2. Create `api/business/stats.js`:
   - Calculate review statistics
   - Return aggregated data
3. Add stats to business cards:
   - Total reviews
   - Average rating
   - Recent activity indicator
4. Test dashboard display

### Step 13: Add New Business
1. Create `public/business/new.html`:
   - Reuse onboarding business selection
   - Check subscription limits
   - Show upgrade prompt if needed
2. Update `api/business/create.js`:
   - Check user's business count
   - Validate subscription tier limits
   - Return appropriate error if limit reached
3. Test adding multiple businesses

---

## Phase 4: Business Management (Week 4)

### Step 14: Business Settings Page
1. Create `public/business/[slug]/settings.html`:
   - Dynamic route handling
   - Tabbed interface:
     - General
     - Review Settings
     - Discount Campaign
     - Referral Campaign
     - Integrations
     - Customization
   - Preview section
   - "Save Changes" button
2. Create `api/business/[slug]/get.js`:
   - Get business by slug
   - Verify user ownership
   - Return business config
3. Create `api/business/[slug]/update.js`:
   - Validate ownership
   - Update database
   - Call sync API to `.app`
   - Return updated business
4. Create `public/business/settings.js`:
   - Load business data
   - Form handling
   - Live preview
   - Save functionality
5. Test settings update and sync

### Step 15: Business Deletion
1. Add delete button to settings page
2. Create confirmation modal
3. Create `api/business/[slug]/delete.js`:
   - Verify ownership
   - Delete from database
   - Call sync API to remove from `.app`
4. Test deletion flow

### Step 16: Preview Functionality
1. Create preview iframe or new tab
2. Load review page from `.app` domain
3. Pass preview mode parameter
4. Style preview to show it's a preview

---

## Phase 5: Sync Implementation (Week 4-5)

### Step 17: Sync API on .app Project
1. In `BlooReview` repository:
   - Create `api/sync/config.js`:
     - Verify `SYNC_SECRET_TOKEN`
     - Accept create/update/delete actions
     - Read existing `config.js` from GitHub
     - Update configs object
     - Write back to GitHub via API
     - Return success/error
2. Test sync endpoint manually

### Step 18: Sync API on .com Project
1. Create `api/sync/push.js`:
   - Format business config
   - Call `.app` sync endpoint
   - Handle errors
   - Retry logic (optional)
2. Integrate into:
   - `api/business/create.js`
   - `api/business/[slug]/update.js`
   - `api/business/[slug]/delete.js`
3. Test sync after each operation

### Step 19: Sync Error Handling
1. Add retry mechanism
2. Log sync failures
3. Create admin view to see sync status
4. Manual sync trigger (optional)

---

## Phase 6: Analytics (Week 5)

### Step 20: Reviews Data Collection
1. Update `.app` project review submission:
   - Store reviews in database (or keep Google Sheets)
   - Send review data to `.com` API (optional)
2. Create `api/reviews/submit.js` on `.com`:
   - Accept review data from `.app`
   - Store in Reviews table
   - Link to business

### Step 21: Analytics API
1. Create `api/business/[slug]/analytics.js`:
   - Get reviews for business
   - Calculate statistics:
     - Total reviews
     - Average rating
     - Rating distribution
     - Reviews over time
     - Recent reviews
   - Return aggregated data

### Step 22: Analytics Dashboard
1. Create `public/business/[slug]/analytics.html`:
   - Charts (use Chart.js or similar)
   - Rating distribution pie chart
   - Reviews over time line chart
   - Recent reviews list
   - Export CSV button
2. Create `public/business/analytics.js`:
   - Fetch analytics data
   - Render charts
   - Handle export
3. Test analytics display

---

## Phase 7: Account Management (Week 6)

### Step 23: Account Settings Page
1. Create `public/account/index.html`:
   - Profile section:
     - Email (editable)
     - Name (editable)
     - Password change form
   - Subscription section:
     - Current plan display
     - Usage stats
     - Upgrade/downgrade buttons
     - Billing history
     - Payment method management
   - Notifications section:
     - Email preferences
     - Review alerts toggle
2. Create `api/user/profile.js`:
   - GET: Return user profile
   - PUT: Update profile
3. Create `api/user/password.js`:
   - Verify current password
   - Update password hash
4. Create `public/account/account.js`:
   - Form handling
   - API calls
   - Success/error messages

### Step 24: Subscription Management
1. Create `api/payment/subscription.js`:
   - GET: Return current subscription
   - POST: Create upgrade/downgrade
2. Integrate Stripe Customer Portal:
   - Generate portal session
   - Redirect to Stripe
3. Add subscription status to dashboard
4. Test subscription changes

---

## Phase 8: Polish & Testing (Week 7)

### Step 25: Error Handling
1. Add error boundaries
2. User-friendly error messages
3. Logging for debugging
4. 404/500 error pages

### Step 26: Loading States
1. Add loading spinners
2. Skeleton screens
3. Optimistic UI updates
4. Progress indicators

### Step 27: Mobile Responsiveness
1. Test all pages on mobile
2. Fix layout issues
3. Optimize touch interactions
4. Test on multiple devices

### Step 28: Performance Optimization
1. Optimize images
2. Lazy loading
3. Code splitting (if using bundler)
4. Caching strategies
5. Database query optimization

### Step 29: Security Audit
1. Review authentication flow
2. Check for SQL injection risks
3. Validate all inputs
4. Review CORS settings
5. Check environment variable security
6. Test rate limiting

### Step 30: Testing
1. Test complete user flows:
   - Registration → Onboarding → Dashboard
   - Login → Add Business → Configure
   - Update Business → Verify Sync
   - View Analytics
2. Test edge cases:
   - Duplicate business names
   - Subscription limits
   - Sync failures
   - Payment failures
3. Load testing (optional)

---

## Phase 9: Migration & Launch (Week 8)

### Step 31: Data Migration
1. Create migration script:
   - Read existing `config.js`
   - Import businesses to database
   - Create "system" user or assign to owners
2. Test migration on staging
3. Run migration on production

### Step 32: DNS Configuration
1. Configure `blooreview.com` DNS:
   - Point to Vercel
   - Set up SSL
2. Verify both domains work
3. Test subdomain routing

### Step 33: Documentation
1. Update README for `.com` project
2. Create user documentation
3. API documentation (if needed)
4. Deployment guide

### Step 34: Launch Preparation
1. Set up monitoring (Vercel Analytics)
2. Set up error tracking (Sentry optional)
3. Prepare launch announcement
4. Test payment with real Stripe account
5. Final security check

### Step 35: Soft Launch
1. Deploy to production
2. Test with real users (beta testers)
3. Gather feedback
4. Fix critical issues
5. Plan public launch

---

## Tools & Libraries Needed

### Backend
- `jsonwebtoken` - JWT token handling
- `bcryptjs` - Password hashing
- `stripe` - Payment processing
- `pg` or `@vercel/postgres` - PostgreSQL client
- `cookie` - Cookie parsing

### Frontend (optional, can use vanilla JS)
- Chart.js or similar - Analytics charts
- QR code library - QR code generation

### Database
- PostgreSQL (Vercel Postgres, Supabase, or Railway)

### Services
- Stripe - Payments
- SendGrid/Mailgun - Email (optional)
- Vercel - Hosting

---

## Estimated Timeline

- **Week 1**: Foundation (Auth, Landing, Setup)
- **Week 2**: Onboarding Flow
- **Week 3**: Dashboard
- **Week 4**: Business Management & Sync
- **Week 5**: Analytics
- **Week 6**: Account Management
- **Week 7**: Polish & Testing
- **Week 8**: Migration & Launch

**Total: ~8 weeks** (adjust based on team size and availability)

---

## Critical Path Items

These must be completed in order:
1. Database setup → Auth system
2. Auth system → Onboarding flow
3. Payment integration → Business creation
4. Business creation → Sync implementation
5. Sync implementation → Dashboard
6. All features → Testing → Launch


