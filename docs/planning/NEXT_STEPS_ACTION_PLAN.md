# Next Steps - Production Deployment Action Plan

**Current Status:** 75% Production Ready
**Target:** 100% Production Ready
**Timeline:** 2-3 weeks
**Last Updated:** March 18, 2026

---

## 🚀 Quick Reference

### ✅ Completed (5/13)
1. Strong JWT Secret
2. Webhook Signature Verification
3. Guest Email Privacy
4. Seed Script Protection
5. Email Service Infrastructure

### ⏳ Remaining (8/13)
6. Credential Rotation
7. Email Configuration
8. Geocoding Service
9. Auto-Refunds
10. Proper Logging
11. PayChangu Webhook Secret
12. PayChangu Refund Permissions
13. Shipping Labels

---

## 📅 Week-by-Week Plan

### Week 1: Critical Security & Email (Must Do)

#### Day 1-2: Credential Rotation & Email Setup
**Priority:** 🔴 URGENT - Do First!

**Tasks:**
- [ ] Rotate MongoDB password (30 min)
  ```bash
  # 1. Go to MongoDB Atlas
  # 2. Database Access → Edit User → Change Password
  # 3. Update MONGODB_URI in .env
  # 4. Restart backend
  # 5. Test connection
  ```

- [ ] Regenerate Cloudinary API key (30 min)
  ```bash
  # 1. Go to Cloudinary Dashboard
  # 2. Settings → Security → API Keys → Regenerate
  # 3. Update .env with new credentials
  # 4. Test image upload
  ```

- [ ] Replace PayChangu test keys (30 min)
  ```bash
  # 1. Login to PayChangu Dashboard
  # 2. Get production keys (pub-live-..., sec-live-...)
  # 3. Update PAYCHANGU_API_KEY and PAYCHANGU_API_SECRET
  # 4. Test payment flow
  ```

- [ ] Check git history (15 min)
  ```bash
  git log --all --full-history -- backend/.env
  # If .env was ever committed, rotate ALL credentials
  ```

- [ ] Configure email service (2 hours)
  ```bash
  # Option 1: SendGrid (Recommended)
  # 1. Create SendGrid account (free tier)
  # 2. Create API key
  # 3. Verify sender identity
  # 4. Update .env:
  EMAIL_HOST=smtp.sendgrid.net
  EMAIL_PORT=587
  EMAIL_USER=apikey
  EMAIL_PASS=SG.xxxxx
  EMAIL_FROM=AutoTek <noreply@autotek.mw>

  # 5. Test password reset email
  # 6. Test order confirmation email
  # 7. Check SendGrid dashboard for delivery
  ```

**Reference:** `EMAIL_SERVICE_SETUP.md`

---

#### Day 3-4: Geocoding Service
**Priority:** 🟠 HIGH

**Tasks:**
- [ ] Choose geocoding provider (1 hour)
  ```bash
  # Option 1: Google Maps Geocoding API
  # - Cost: ~$10/month
  # - Best accuracy
  # - Sign up: https://console.cloud.google.com/

  # Option 2: OpenStreetMap Nominatim
  # - Free
  # - Good enough for Malawi
  # - No signup needed
  ```

- [ ] Implement geocoding utility (1 hour)
  ```typescript
  // Create backend/src/utils/geocoding.ts
  // See PRODUCTION_READINESS_REPORT.md for code
  ```

- [ ] Update all controllers (2 hours)
  ```bash
  # Update 8 locations in:
  # - towingServiceController.ts (6 places)
  # - carServiceController.ts (2 places)
  # Replace:
  #   latitude: 0,
  #   longitude: 0,
  # With:
  #   const coords = await geocodeAddress(address);
  #   latitude: coords.latitude,
  #   longitude: coords.longitude,
  ```

- [ ] Test with real addresses (30 min)
  ```bash
  # Book towing service with Lilongwe address
  # Verify coordinates are correct on map
  ```

---

#### Day 5: Auto-Refunds & PayChangu Setup
**Priority:** 🟠 HIGH

**Tasks:**
- [ ] Implement auto-refunds (1.5 hours)
  ```typescript
  // In orderController.ts cancelOrder function:
  // 1. Check if payment completed
  // 2. Call processPayChanguRefund()
  // 3. Update order refund status
  // 4. Send confirmation email

  // See PRODUCTION_READINESS_REPORT.md for code
  ```

- [ ] Contact PayChangu support (30 min)
  ```
  Email: support@paychangu.com
  Subject: Enable Refund API Access + Webhook Secret

  Body:
  Hello,

  We need:
  1. Refund API access enabled for our merchant account
  2. Webhook secret for signature verification

  Merchant Details:
  - Business Name: AutoTek
  - API Key: pub-live-xxxxx
  - Use Case: E-commerce refunds for returned products

  Thank you!
  ```

---

### Week 2: Testing & Refinements

#### Day 6-7: Logging & Testing
**Priority:** 🟡 MEDIUM

**Tasks:**
- [ ] Install Winston logging (1 hour)
  ```bash
  npm install winston

  # Create backend/src/utils/logger.ts
  # Replace console.log in key files
  # Set up log rotation
  ```

- [ ] Test complete user journey (2 hours)
  ```bash
  # 1. Browse products
  # 2. Add to cart
  # 3. Checkout with PayChangu
  # 4. Receive order confirmation email
  # 5. Request return
  # 6. Admin approve
  # 7. Process refund
  # 8. Receive refund email
  ```

- [ ] Test all email types (1 hour)
  ```bash
  # Test:
  # - Password reset
  # - Order confirmation
  # - Refund processed
  # Verify:
  # - Emails delivered
  # - Not in spam
  # - Correct formatting
  ```

---

#### Day 8-9: Production Environment Setup
**Priority:** 🔴 CRITICAL

**Tasks:**
- [ ] Set up production server (2 hours)
  ```bash
  # Options:
  # - DigitalOcean Droplet ($20/month)
  # - AWS EC2 ($10-30/month)
  # - Heroku ($25/month)

  # Install:
  # - Node.js 18+
  # - PM2 process manager
  # - Nginx reverse proxy
  ```

- [ ] Configure production .env (1 hour)
  ```bash
  # All variables with production values
  NODE_ENV=production
  # Strong JWT secret
  # MongoDB production cluster
  # PayChangu live keys
  # SendGrid API key
  # etc.
  ```

- [ ] Set up SSL/HTTPS (1 hour)
  ```bash
  # Using Let's Encrypt
  sudo apt install certbot
  sudo certbot --nginx -d autotek.mw -d www.autotek.mw
  ```

---

#### Day 10: Monitoring & Final Checks
**Priority:** 🔴 CRITICAL

**Tasks:**
- [ ] Set up Sentry error tracking (1 hour)
  ```bash
  npm install @sentry/node

  # Configure in backend
  # Test error reporting
  ```

- [ ] Configure PayChangu production webhooks (30 min)
  ```bash
  # In PayChangu dashboard:
  # Set webhook URL: https://autotek.mw/api/payments/webhook/paychangu
  # Test webhook delivery
  # Verify signature verification works
  ```

- [ ] Final security audit (1 hour)
  ```bash
  # Check:
  # - No exposed credentials
  # - CORS configured
  # - Rate limiting enabled
  # - HTTPS only
  # - Secure cookies
  ```

---

### Week 3: Launch Preparation

#### Day 11-12: Load Testing
**Priority:** 🟠 HIGH

**Tasks:**
- [ ] Load test API endpoints (2 hours)
  ```bash
  # Use Apache Bench or k6
  # Test:
  # - Product listing
  # - Order creation
  # - Payment webhooks
  # Target: 100 concurrent users
  ```

- [ ] Monitor performance (1 hour)
  ```bash
  # Check:
  # - Response times < 500ms
  # - No memory leaks
  # - Database queries optimized
  ```

---

#### Day 13-14: Documentation & Training
**Priority:** 🟡 MEDIUM

**Tasks:**
- [ ] Admin user guide (2 hours)
  ```bash
  # Document:
  # - How to approve returns
  # - How to process refunds
  # - How to manage products
  ```

- [ ] Deployment runbook (1 hour)
  ```bash
  # Document:
  # - How to deploy updates
  # - How to rollback
  # - Common issues and fixes
  ```

---

#### Day 15: Soft Launch
**Priority:** 🔴 CRITICAL

**Tasks:**
- [ ] Deploy to production (2 hours)
  ```bash
  # 1. Build frontend: npm run build
  # 2. Build backend: npm run build
  # 3. Copy to server
  # 4. Start with PM2
  # 5. Verify all services running
  ```

- [ ] Smoke testing (2 hours)
  ```bash
  # Test all critical paths:
  # - Registration
  # - Login
  # - Product purchase
  # - Payment
  # - Return request
  # - Refund
  ```

- [ ] Monitor first 24 hours (ongoing)
  ```bash
  # Watch:
  # - Error logs
  # - Email delivery
  # - Payment webhooks
  # - User signups
  ```

---

## 🎯 Prioritized Task List

### Do Today (Critical):
1. [ ] Rotate MongoDB password
2. [ ] Regenerate Cloudinary API key
3. [ ] Replace PayChangu test keys
4. [ ] Configure SendGrid email

### Do This Week (High):
5. [ ] Implement geocoding service
6. [ ] Add auto-refunds
7. [ ] Contact PayChangu support
8. [ ] Set up production server

### Do Next Week (Medium):
9. [ ] Install Winston logging
10. [ ] Set up Sentry monitoring
11. [ ] Load testing
12. [ ] Admin documentation

### Do Before Launch (Must):
13. [ ] Final security audit
14. [ ] SSL/HTTPS setup
15. [ ] Production webhooks configured
16. [ ] Smoke testing complete

---

## 📋 Quick Checklists

### Pre-Deployment Checklist:
- [ ] All credentials rotated
- [ ] Email service configured and tested
- [ ] Geocoding implemented
- [ ] Auto-refunds working
- [ ] PayChangu production keys active
- [ ] PayChangu webhook secret set
- [ ] Webhook signature verification tested
- [ ] SSL certificate installed
- [ ] Production .env complete
- [ ] Error tracking configured
- [ ] Load testing passed
- [ ] Smoke tests passed

### Launch Day Checklist:
- [ ] Backup database
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify all services running
- [ ] Test critical user journeys
- [ ] Monitor error logs
- [ ] Watch email delivery
- [ ] Check payment webhooks
- [ ] Verify SSL working
- [ ] Test on mobile devices

### Post-Launch Checklist:
- [ ] Monitor for 24 hours
- [ ] Check email deliverability
- [ ] Verify payment processing
- [ ] Review error logs
- [ ] Collect user feedback
- [ ] Fix any urgent issues
- [ ] Update documentation
- [ ] Plan next iteration

---

## 💰 Budget Estimates

### One-Time Costs:
- Domain (autotek.mw): $15/year
- SSL Certificate: Free (Let's Encrypt)

### Monthly Costs:
- **Server (DigitalOcean):** $20-50/month
- **MongoDB Atlas (M10):** $57/month
- **SendGrid (Essentials):** $20/month
- **Cloudinary (Plus):** $99/month or Free tier
- **Google Maps API:** ~$10/month
- **Sentry (Free tier):** $0/month

**Total Minimum:** ~$100-150/month (using free tiers)
**Total Recommended:** ~$200/month (paid tiers for reliability)

---

## 📞 Support Contacts

### PayChangu:
- Email: support@paychangu.com
- Dashboard: https://dashboard.paychangu.com/
- Docs: https://developer.paychangu.com/

### SendGrid:
- Support: https://support.sendgrid.com/
- Status: https://status.sendgrid.com/

### MongoDB Atlas:
- Support: https://www.mongodb.com/cloud/atlas/support
- Docs: https://docs.atlas.mongodb.com/

### Cloudinary:
- Support: https://support.cloudinary.com/
- Status: https://status.cloudinary.com/

---

## 🚨 Emergency Contacts

If something goes wrong after launch:

### Critical Issues:
1. **Site Down:** Check server, PM2, Nginx
2. **Payments Not Working:** Check PayChangu dashboard, webhook logs
3. **Emails Not Sending:** Check SendGrid dashboard, activity feed
4. **Database Issues:** Check MongoDB Atlas, connection string

### Rollback Plan:
```bash
# Keep previous version ready
# If issues:
pm2 stop autotek
mv autotek autotek-new
mv autotek-old autotek
pm2 start autotek
```

---

## 📚 Reference Documents

1. **PRODUCTION_READINESS_REPORT.md** - Complete audit findings
2. **FIXES_COMPLETED.md** - What's been fixed
3. **EMAIL_SERVICE_SETUP.md** - Email configuration
4. **SESSION_SUMMARY_MARCH_18.md** - Detailed session log
5. **This document** - Action plan

---

## ✅ Success Criteria

### Minimum Viable Launch:
- ✅ Users can browse products
- ✅ Users can place orders
- ✅ Payments process successfully
- ✅ Emails are delivered
- ✅ Returns can be requested
- ✅ Refunds can be processed
- ✅ No security vulnerabilities
- ✅ Site is stable

### Ideal Launch:
- All of the above, plus:
- ✅ Service locations accurate (geocoding)
- ✅ Auto-refunds working
- ✅ Professional logging
- ✅ Error tracking active
- ✅ Performance optimized
- ✅ Documentation complete

---

**Current Progress:** 75% → Target: 100%
**Remaining Work:** ~40-50 hours
**Timeline:** 2-3 weeks
**Next Action:** Rotate credentials + configure email

---

*Good luck with the launch! 🚀*

**Last Updated:** March 18, 2026
