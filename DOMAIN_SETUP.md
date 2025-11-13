# Domain Setup Guide for BlooReview

This guide will help you connect your Namecheap domain (`blooreview.app`) to Vercel and configure wildcard subdomains for multi-tenant review pages.

## Overview

Your app uses subdomains for each business:
- Main domain: `blooreview.app`
- Admin panel: `admin.blooreview.app` (or `blooreview.app/admin`)
- Business pages: `[slug].blooreview.app` (e.g., `bodenseebaer.blooreview.app`)

## Step 1: Add Domain to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter your domain: `blooreview.app`
5. Click **Add**
6. Vercel will show you DNS configuration instructions

## Step 2: Add Wildcard Subdomain to Vercel

1. Still in **Settings** → **Domains**
2. Click **Add Domain** again
3. Enter: `*.blooreview.app`
4. Click **Add**

## Step 3: Configure DNS in Namecheap

### Option A: Using CNAME (Recommended - Easier)

1. Log in to Namecheap
2. Go to **Domain List** → Click **Manage** next to `blooreview.app`
3. Go to **Advanced DNS** tab
4. Remove any existing A records for `@` if present
5. Add these records:

#### For Root Domain:
```
Type: CNAME Record
Host: @
Value: cname.vercel-dns.com
TTL: Automatic (or 30 min)
```

#### For Wildcard Subdomains:
```
Type: CNAME Record
Host: *
Value: cname.vercel-dns.com
TTL: Automatic (or 30 min)
```

#### For www (Optional):
```
Type: CNAME Record
Host: www
Value: cname.vercel-dns.com
TTL: Automatic (or 30 min)
```

### Option B: Using A Records (Alternative)

If CNAME doesn't work for root domain, use A records:

1. In Vercel, check the **Domains** page for the IP addresses
2. In Namecheap, add:

```
Type: A Record
Host: @
Value: 76.76.21.21 (or IP from Vercel)
TTL: Automatic
```

And still add the CNAME for wildcard:
```
Type: CNAME Record
Host: *
Value: cname.vercel-dns.com
TTL: Automatic
```

## Step 4: Verify Domain in Vercel

1. Wait 5-10 minutes for DNS propagation
2. Go back to Vercel **Settings** → **Domains**
3. Click **Refresh** next to your domain
4. Status should show "Valid Configuration" ✅

## Step 5: Test Your Setup

Once DNS is propagated:

1. **Test main domain:**
   - Visit: `https://blooreview.app`
   - Should show the review page

2. **Test admin panel:**
   - Visit: `https://blooreview.app/admin`
   - Should show admin interface

3. **Test subdomain:**
   - Visit: `https://bodenseebaer.blooreview.app` (or any slug from your config)
   - Should show that business's review page

## Troubleshooting

### Domain not verifying?
- Wait up to 48 hours for DNS propagation (usually faster)
- Double-check DNS records match exactly
- Make sure you removed conflicting records

### Subdomains not working?
- Verify wildcard CNAME (`*`) is set correctly
- Check that `*.blooreview.app` is added in Vercel
- Wait for DNS propagation

### SSL Certificate issues?
- Vercel automatically provisions SSL certificates
- May take a few minutes after domain verification
- Check Vercel dashboard for certificate status

## DNS Propagation Check

You can check if DNS has propagated using:
- https://dnschecker.org
- Enter: `blooreview.app` and `*.blooreview.app`
- Check for CNAME records pointing to `cname.vercel-dns.com`

## Important Notes

- **DNS Propagation**: Can take 5 minutes to 48 hours (usually 10-30 minutes)
- **Wildcard Subdomains**: The `*` CNAME record enables all subdomains automatically
- **SSL Certificates**: Vercel automatically provisions SSL for all domains/subdomains
- **No Manual Subdomain Creation**: Once wildcard is set, all subdomains work automatically

