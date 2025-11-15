# BlooReview SaaS - User Flow & Architecture Plan

## Overview
Transform BlooReview from an admin-only tool to a self-service SaaS platform where business owners can register, pay, and configure their own review pages.

---

## User Flow Architecture

### 1. **Landing Page** (`/`)
**Purpose**: Marketing page to attract new users

**Content**:
- Hero section with value proposition
- Features showcase (QR codes, review management, discount campaigns)
- Pricing tiers
- "Get Started" / "Sign Up" CTA
- Social proof (testimonials, usage stats)

**User Actions**:
- Click "Get Started" → Navigate to `/register`
- Click "Sign In" → Navigate to `/login`
- View pricing → Scroll to pricing section

---

### 2. **Registration** (`/register`)
**Purpose**: New user account creation

**Flow**:
1. User enters:
   - Email address
   - Password (with strength indicator)
   - Business name (optional at this stage)
2. Email verification (optional but recommended)
3. After registration → Redirect to `/onboarding` or `/dashboard`

**Alternative**: Social login (Google, Facebook) for faster onboarding

---

### 3. **Login** (`/login`)
**Purpose**: Existing user authentication

**Flow**:
1. User enters email + password
2. Optional: "Forgot Password" flow
3. After login → Redirect to `/dashboard`

**State Management**:
- Store auth token in localStorage/sessionStorage
- Protected routes check authentication

---

### 4. **Onboarding Flow** (First-time users)
**Purpose**: Guide new users through setup

**Step 1: Business Selection** (`/onboarding/business`)
- Enter Google Maps URL
- Fetch business details via existing `/api/admin/maps` endpoint
- Display business preview (name, category, hero image)
- Confirm or search again

**Step 2: Payment** (`/onboarding/payment`)
- Select pricing plan:
  - **Free Tier**: 1 business, basic features
  - **Pro Tier**: Multiple businesses, advanced features, custom branding
  - **Enterprise**: Custom pricing
- Enter payment details (Stripe integration)
- Process payment
- On success → Redirect to `/onboarding/configure`

**Step 3: Review Page Configuration** (`/onboarding/configure`)
- Configure review page settings:
  - Discount settings (enable/disable, percentage, validity)
  - Referral campaign (enable/disable)
  - Review threshold (stars required for Google redirect)
  - Custom messages/translations
  - Google Sheets integration (optional)
- Preview review page
- Save configuration

**Step 4: Success** (`/onboarding/success`)
- Display review page URL
- Generate and display QR code
- Download QR code option
- "Go to Dashboard" button

---

### 5. **Dashboard** (`/dashboard`)
**Purpose**: Main hub for managing businesses

**Content**:
- List of user's businesses (cards with preview)
- Quick stats per business:
  - Total reviews received
  - Average rating
  - Recent activity
- "Add New Business" button
- Account settings link
- Billing/subscription info

**User Actions**:
- Click business card → Navigate to `/business/[slug]/settings`
- Click "Add New Business" → Navigate to `/business/new`
- View analytics → Navigate to `/business/[slug]/analytics`

---

### 6. **Add New Business** (`/business/new`)
**Purpose**: Register additional businesses (if plan allows)

**Flow**:
1. Check subscription limits (free tier = 1 business)
2. If limit reached → Show upgrade prompt
3. If allowed:
   - Enter Google Maps URL
   - Fetch business details
   - Preview and confirm
   - Generate review page (similar to onboarding)
   - Redirect to dashboard

---

### 7. **Business Settings** (`/business/[slug]/settings`)
**Purpose**: Configure existing business review page

**Sections**:
- **General**:
  - Business name (editable)
  - Google Maps URL (editable, re-fetch if changed)
  - Hero image (upload custom or use Google Maps image)
  - Category
  
- **Review Settings**:
  - Review threshold (stars for Google redirect)
  - Minimum rating for discount eligibility
  
- **Discount Campaign**:
  - Enable/disable discounts
  - Discount percentage
  - Validity period (days)
  
- **Referral Campaign**:
  - Enable/disable referrals
  - Custom referral message
  
- **Integrations**:
  - Google Sheets script URL (for review submissions)
  
- **Customization**:
  - Custom messages/translations
  - Branding colors (future enhancement)
  
- **Preview**:
  - Live preview of review page
  - Test review flow

**Actions**:
- Save changes → Update config via API
- Delete business → Confirmation modal → Remove from account
- View review page → Open in new tab

---

### 8. **Analytics** (`/business/[slug]/analytics`)
**Purpose**: View review statistics and insights

**Content**:
- Review count over time (chart)
- Rating distribution (pie chart)
- Recent reviews list
- Feedback analysis (sentiment, common themes)
- Export data (CSV)

---

### 9. **Account Settings** (`/account`)
**Purpose**: Manage user account

**Sections**:
- **Profile**:
  - Email (editable)
  - Password change
  - Name/Company name
  
- **Subscription**:
  - Current plan
  - Usage (businesses created / plan limit)
  - Upgrade/Downgrade options
  - Billing history
  - Payment method management
  
- **Notifications**:
  - Email preferences
  - Review alerts
  
- **API Access** (future):
  - API keys
  - Webhooks

---

## Technical Architecture

### Frontend Structure
```
/public/
├── index.html              # Landing page
├── app.js                  # Review page logic (existing)
├── styles.css              # Review page styles (existing)
├── config.js               # Business configs (existing)
│
/dashboard/                  # New dashboard app
├── index.html
├── dashboard.js
├── dashboard.css
│
/auth/                       # Auth pages
├── login.html
├── register.html
│
/onboarding/                 # Onboarding flow
├── business.html
├── payment.html
├── configure.html
├── success.html
```

### Backend API Structure
```
/api/
├── auth/                    # Authentication
│   ├── register.js          # POST /api/auth/register
│   ├── login.js             # POST /api/auth/login
│   ├── logout.js            # POST /api/auth/logout
│   └── verify.js            # GET /api/auth/verify
│
├── user/                    # User management
│   ├── profile.js           # GET/PUT /api/user/profile
│   └── businesses.js        # GET /api/user/businesses
│
├── business/                # Business management
│   ├── create.js            # POST /api/business/create
│   ├── update.js            # PUT /api/business/[slug]
│   ├── delete.js            # DELETE /api/business/[slug]
│   └── analytics.js         # GET /api/business/[slug]/analytics
│
├── payment/                 # Payment processing
│   ├── create-checkout.js   # POST /api/payment/create-checkout
│   ├── webhook.js           # POST /api/payment/webhook (Stripe)
│   └── subscription.js      # GET /api/payment/subscription
│
├── admin/                   # Existing endpoints (keep for compatibility)
│   ├── maps.js              # POST /api/admin/maps (existing)
│   └── generate.js          # POST /api/admin/generate (existing)
│
└── index.js                 # Root handler (existing)
```

### Database Schema (Recommended: PostgreSQL or MongoDB)

**Users Table**:
```sql
- id (UUID)
- email (string, unique)
- password_hash (string)
- name (string)
- created_at (timestamp)
- email_verified (boolean)
- subscription_tier (enum: free, pro, enterprise)
- subscription_status (enum: active, cancelled, expired)
- stripe_customer_id (string, nullable)
```

**Businesses Table**:
```sql
- id (UUID)
- user_id (UUID, foreign key)
- slug (string, unique)
- place_id (string)
- name (string)
- category (string)
- google_maps_url (string)
- hero_image (string)
- config (JSON) {
    discount_enabled: boolean
    discount_percentage: number
    discount_valid_days: number
    referral_enabled: boolean
    review_threshold: number
    sheet_script_url: string
  }
- created_at (timestamp)
- updated_at (timestamp)
```

**Reviews Table** (for analytics):
```sql
- id (UUID)
- business_id (UUID, foreign key)
- rating (number)
- name (string, nullable)
- comments (text, nullable)
- discount_code (string, nullable)
- submitted_at (timestamp)
```

**Subscriptions Table**:
```sql
- id (UUID)
- user_id (UUID, foreign key)
- stripe_subscription_id (string)
- plan (enum: free, pro, enterprise)
- status (enum: active, cancelled, expired)
- current_period_start (timestamp)
- current_period_end (timestamp)
- created_at (timestamp)
```

---

## Payment Integration

### Stripe Integration
1. **Checkout Session**:
   - Create Stripe Checkout session on `/onboarding/payment`
   - Redirect to Stripe hosted checkout
   - On success, Stripe redirects to `/onboarding/configure?session_id=xxx`

2. **Webhook Handler**:
   - Listen for `checkout.session.completed`
   - Update user subscription in database
   - Activate business creation limits

3. **Subscription Management**:
   - Monthly/Annual billing
   - Upgrade/Downgrade flows
   - Cancel subscription option

### Pricing Tiers
- **Free**: 1 business, basic features, BlooReview branding
- **Pro ($9.99/month)**: 5 businesses, advanced features, custom branding
- **Enterprise (Custom)**: Unlimited businesses, white-label, API access

---

## Authentication & Security

### JWT Tokens
- Issue JWT on login
- Store in httpOnly cookies (more secure) or localStorage
- Include: `userId`, `email`, `subscriptionTier`
- Expire after 7 days (refresh token for longer sessions)

### Protected Routes
- Middleware to verify JWT on protected endpoints
- Redirect to `/login` if unauthorized

### Rate Limiting
- Limit API calls per user
- Prevent abuse of Maps API

---

## Data Migration Strategy

### Existing Businesses
1. Create "system" user account for existing businesses
2. Migrate existing configs to database
3. Maintain backward compatibility with `config.js` file
4. Gradually migrate to database-only approach

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Landing page redesign
- [ ] Authentication system (register/login)
- [ ] User database schema
- [ ] Protected routes middleware

### Phase 2: Onboarding
- [ ] Business selection flow
- [ ] Payment integration (Stripe)
- [ ] Configuration page
- [ ] Success page with QR code

### Phase 3: Dashboard
- [ ] Dashboard UI
- [ ] Business list view
- [ ] Business settings page
- [ ] Update business API

### Phase 4: Analytics
- [ ] Review analytics page
- [ ] Data visualization
- [ ] Export functionality

### Phase 5: Enhancements
- [ ] Multiple businesses per account
- [ ] Advanced customization
- [ ] Email notifications
- [ ] API access

---

## Key Decisions Needed

1. **Database Choice**: PostgreSQL (SQL) vs MongoDB (NoSQL)?
2. **Hosting**: Keep Vercel or move to full-stack platform?
3. **Payment Provider**: Stripe (recommended) or alternative?
4. **Email Service**: SendGrid, Mailgun, or AWS SES?
5. **File Storage**: Where to store custom hero images? (S3, Cloudinary, etc.)

---

## User Experience Considerations

### Progressive Disclosure
- Show only what's needed at each step
- Don't overwhelm users with all options upfront

### Clear Value Proposition
- Landing page should immediately communicate value
- Show examples of review pages

### Mobile Responsiveness
- All pages must work on mobile
- Dashboard should be touch-friendly

### Error Handling
- Clear error messages
- Helpful guidance when things go wrong
- Graceful degradation

### Loading States
- Show loading indicators during API calls
- Optimistic UI updates where possible

---

## Next Steps

1. Review and approve this plan
2. Choose tech stack (database, payment provider)
3. Set up development environment
4. Begin Phase 1 implementation
5. Create design mockups for key pages


