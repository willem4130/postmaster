import Database from 'better-sqlite3'
import { join } from 'path'
import { randomUUID } from 'crypto'

// Path to the database
const dbPath = join(
  process.env.HOME || '',
  'Library/Application Support/postmaster/data/postmaster.db'
)

console.log('Opening database at:', dbPath)
const db = new Database(dbPath)

// Helper to generate IDs
const uuid = () => randomUUID()

// Clear existing mock data
db.prepare('DELETE FROM emails').run()
db.prepare('DELETE FROM threads').run()
db.prepare('DELETE FROM accounts WHERE email = ?').run('willem@scex.nl')
db.prepare('DELETE FROM tags').run()
db.prepare('DELETE FROM perspectives').run()

// Create mock account
const accountId = uuid()
db.prepare(`
  INSERT INTO accounts (id, provider, email, display_name, sync_status, color, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(accountId, 'MICROSOFT_365', 'willem@scex.nl', 'Willem van den Berg', 'SYNCED', '#6366f1', 1)

console.log('Created mock account:', accountId)

// Sample senders with realistic details
const senders = {
  sarah: { email: 'sarah.chen@techventures.io', name: 'Sarah Chen' },
  michael: { email: 'michael.roberts@globalfinance.com', name: 'Michael Roberts' },
  emma: { email: 'emma.wilson@designstudio.co', name: 'Emma Wilson' },
  david: { email: 'david.kumar@cloudservices.net', name: 'David Kumar' },
  jessica: { email: 'jessica.martinez@lawfirm.legal', name: 'Jessica Martinez' },
  github: { email: 'notifications@github.com', name: 'GitHub' },
  stripe: { email: 'receipts@stripe.com', name: 'Stripe' },
  linear: { email: 'notifications@linear.app', name: 'Linear' },
  aws: { email: 'no-reply@aws.amazon.com', name: 'Amazon Web Services' },
  hr: { email: 'hr@scex.nl', name: 'HR Department' },
  ceo: { email: 'thomas.anderson@scex.nl', name: 'Thomas Anderson' },
  client: { email: 'jennifer.blake@nexusindustries.com', name: 'Jennifer Blake' },
  recruiter: { email: 'talent@toptech-recruiting.com', name: 'Marcus Thompson' },
  newsletter: { email: 'digest@techcrunch.com', name: 'TechCrunch' },
  bank: { email: 'alerts@ing.nl', name: 'ING Bank' },
}

// Realistic email threads with multiple messages
interface EmailData {
  subject: string
  messages: {
    from: { email: string; name: string }
    to: { email: string; name: string }
    body: string
    bodyHtml: string
    date: Date
    isRead: boolean
  }[]
  isStarred: boolean
  folder: 'inbox' | 'sent' | 'drafts' | 'archived'
}

const mockThreads: EmailData[] = [
  // Thread 1: Important client negotiation
  {
    subject: 'Re: Q1 2025 Enterprise Contract Renewal - Nexus Industries',
    messages: [
      {
        from: senders.client,
        to: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        body: `Hi Willem,

I hope this email finds you well. I wanted to follow up on our discussion from last week regarding the enterprise contract renewal for Nexus Industries.

After reviewing the proposal with our executive team, we have a few points we'd like to discuss:

1. **Pricing Structure**: The proposed 15% increase from €45,000/year to €51,750/year is higher than we anticipated. Given our 3-year partnership and consistent payment history, we were hoping for more favorable terms. Could we explore a multi-year commitment in exchange for a reduced rate?

2. **Additional Seats**: We're planning to expand our engineering team by 25 people in Q2. The current per-seat pricing of €150/month would add €3,750/month to our costs. Is there a volume discount available for organizations with 100+ seats?

3. **SLA Improvements**: Our CTO, Marcus Chen, has expressed concerns about the current 99.5% uptime SLA. For mission-critical operations, we'd need 99.9% with clearly defined compensation terms. The recent outage on January 15th (approximately 4 hours of downtime) caused significant disruption to our deployment pipeline.

4. **Data Residency**: With the new EU regulations coming into effect, we need confirmation that all data will be stored within EU data centers. Can you provide documentation on your data handling practices?

I've attached our counter-proposal document for your review. We value our partnership with SCEX and hope to reach an agreement that works for both parties. Our budget approval deadline is February 28th, so we'd appreciate a response by end of next week.

Would you be available for a call on Thursday, February 6th at 2:00 PM CET to discuss these points?

Best regards,
Jennifer Blake
VP of Engineering
Nexus Industries
+31 20 555 0123

---
Nexus Industries B.V.
Herengracht 500, 1017 CB Amsterdam
www.nexusindustries.com`,
        bodyHtml: `<p>Hi Willem,</p>

<p>I hope this email finds you well. I wanted to follow up on our discussion from last week regarding the enterprise contract renewal for Nexus Industries.</p>

<p>After reviewing the proposal with our executive team, we have a few points we'd like to discuss:</p>

<ol>
<li><strong>Pricing Structure</strong>: The proposed 15% increase from €45,000/year to €51,750/year is higher than we anticipated. Given our 3-year partnership and consistent payment history, we were hoping for more favorable terms. Could we explore a multi-year commitment in exchange for a reduced rate?</li>

<li><strong>Additional Seats</strong>: We're planning to expand our engineering team by 25 people in Q2. The current per-seat pricing of €150/month would add €3,750/month to our costs. Is there a volume discount available for organizations with 100+ seats?</li>

<li><strong>SLA Improvements</strong>: Our CTO, Marcus Chen, has expressed concerns about the current 99.5% uptime SLA. For mission-critical operations, we'd need 99.9% with clearly defined compensation terms. The recent outage on January 15th (approximately 4 hours of downtime) caused significant disruption to our deployment pipeline.</li>

<li><strong>Data Residency</strong>: With the new EU regulations coming into effect, we need confirmation that all data will be stored within EU data centers. Can you provide documentation on your data handling practices?</li>
</ol>

<p>I've attached our counter-proposal document for your review. We value our partnership with SCEX and hope to reach an agreement that works for both parties. Our budget approval deadline is <strong>February 28th</strong>, so we'd appreciate a response by end of next week.</p>

<p>Would you be available for a call on <strong>Thursday, February 6th at 2:00 PM CET</strong> to discuss these points?</p>

<p>Best regards,<br>
Jennifer Blake<br>
VP of Engineering<br>
Nexus Industries<br>
+31 20 555 0123</p>

<hr>
<p><em>Nexus Industries B.V.<br>
Herengracht 500, 1017 CB Amsterdam<br>
www.nexusindustries.com</em></p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        isRead: false,
      },
    ],
    isStarred: true,
    folder: 'inbox',
  },

  // Thread 2: Technical discussion with multiple replies
  {
    subject: 'Re: Production Database Migration Plan - URGENT',
    messages: [
      {
        from: senders.david,
        to: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        body: `Team,

We need to schedule the PostgreSQL 14 to 16 migration for the production database cluster. Based on our testing in staging, here's the proposed plan:

**Migration Window**: Saturday, February 8th, 02:00 - 06:00 CET
**Expected Downtime**: 45-60 minutes
**Rollback Window**: Until Sunday 18:00 CET

Pre-migration checklist:
- [ ] Full backup completed (estimated 2.5 hours for 850GB)
- [ ] Replica sync verified
- [ ] Application connection pooling configured
- [ ] Monitoring alerts updated
- [ ] Customer notification sent (48h advance notice)

The main concerns are:
1. Table "user_events" has 2.3 billion rows - we'll need to use pg_dump with parallel jobs
2. Several deprecated extensions need replacement (pg_trgm syntax changes)
3. Connection string updates across 12 microservices

I've created a detailed runbook in Confluence: https://scex.atlassian.net/wiki/spaces/OPS/pages/migration-pg16

Can everyone confirm availability for the migration window? We need at least 3 engineers on-call.

David Kumar
Senior Database Administrator
SCEX Infrastructure Team`,
        bodyHtml: `<p>Team,</p>

<p>We need to schedule the PostgreSQL 14 to 16 migration for the production database cluster. Based on our testing in staging, here's the proposed plan:</p>

<p><strong>Migration Window</strong>: Saturday, February 8th, 02:00 - 06:00 CET<br>
<strong>Expected Downtime</strong>: 45-60 minutes<br>
<strong>Rollback Window</strong>: Until Sunday 18:00 CET</p>

<p>Pre-migration checklist:</p>
<ul>
<li>☐ Full backup completed (estimated 2.5 hours for 850GB)</li>
<li>☐ Replica sync verified</li>
<li>☐ Application connection pooling configured</li>
<li>☐ Monitoring alerts updated</li>
<li>☐ Customer notification sent (48h advance notice)</li>
</ul>

<p>The main concerns are:</p>
<ol>
<li>Table "user_events" has 2.3 billion rows - we'll need to use pg_dump with parallel jobs</li>
<li>Several deprecated extensions need replacement (pg_trgm syntax changes)</li>
<li>Connection string updates across 12 microservices</li>
</ol>

<p>I've created a detailed runbook in Confluence: <a href="https://scex.atlassian.net/wiki/spaces/OPS/pages/migration-pg16">Migration Runbook</a></p>

<p>Can everyone confirm availability for the migration window? We need at least 3 engineers on-call.</p>

<p>David Kumar<br>
Senior Database Administrator<br>
SCEX Infrastructure Team</p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
        isRead: true,
      },
      {
        from: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        to: senders.david,
        body: `David,

I can confirm my availability for the migration window. I'll handle the application-side connection string updates and coordinate with the frontend team for the maintenance page.

A few questions:
1. Should we pre-warm the connection pools after migration, or let them scale naturally?
2. What's our communication channel during the migration - Slack #incidents or a dedicated bridge?
3. Have we tested the new JSON path queries that were refactored for PG16 compatibility?

I'll update the service deployment configs today and have them ready for review by EOD tomorrow.

Willem`,
        bodyHtml: `<p>David,</p>

<p>I can confirm my availability for the migration window. I'll handle the application-side connection string updates and coordinate with the frontend team for the maintenance page.</p>

<p>A few questions:</p>
<ol>
<li>Should we pre-warm the connection pools after migration, or let them scale naturally?</li>
<li>What's our communication channel during the migration - Slack #incidents or a dedicated bridge?</li>
<li>Have we tested the new JSON path queries that were refactored for PG16 compatibility?</li>
</ol>

<p>I'll update the service deployment configs today and have them ready for review by EOD tomorrow.</p>

<p>Willem</p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        isRead: true,
      },
      {
        from: senders.david,
        to: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        body: `Willem,

Great questions:

1. Let's pre-warm with a gradual ramp-up script I've prepared. It simulates 50% → 75% → 100% load over 15 minutes. This helped us catch a connection leak in staging.

2. We'll use a dedicated Zoom bridge for voice + Slack #db-migration-feb8 for async updates. I'll send calendar invites with both links.

3. Good catch - the JSON path queries are tested but we should add them to the smoke test suite. Can you add the 5 critical queries from the analytics service to the post-migration verification script?

Also, Thomas mentioned he wants a status update every 30 minutes during the migration window. Can you handle the stakeholder comms while I focus on the technical execution?

Thanks,
David`,
        bodyHtml: `<p>Willem,</p>

<p>Great questions:</p>

<ol>
<li>Let's pre-warm with a gradual ramp-up script I've prepared. It simulates 50% → 75% → 100% load over 15 minutes. This helped us catch a connection leak in staging.</li>

<li>We'll use a dedicated Zoom bridge for voice + Slack #db-migration-feb8 for async updates. I'll send calendar invites with both links.</li>

<li>Good catch - the JSON path queries are tested but we should add them to the smoke test suite. Can you add the 5 critical queries from the analytics service to the post-migration verification script?</li>
</ol>

<p>Also, Thomas mentioned he wants a status update every 30 minutes during the migration window. Can you handle the stakeholder comms while I focus on the technical execution?</p>

<p>Thanks,<br>
David</p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        isRead: false,
      },
    ],
    isStarred: true,
    folder: 'inbox',
  },

  // Thread 3: Invoice/Finance
  {
    subject: 'Invoice #INV-2025-0892 - AWS Services January 2025',
    messages: [
      {
        from: senders.aws,
        to: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        body: `Dear SCEX B.V.,

Your AWS invoice for January 2025 is now available.

═══════════════════════════════════════════════════
INVOICE SUMMARY
═══════════════════════════════════════════════════

Invoice Number: INV-2025-0892
Invoice Date: February 1, 2025
Due Date: February 15, 2025
Account ID: 4521-8834-2201

───────────────────────────────────────────────────
SERVICE BREAKDOWN
───────────────────────────────────────────────────

Amazon EC2
  - m6i.2xlarge (eu-west-1): 744 hrs × €0.384    €285.70
  - r6g.xlarge (eu-west-1): 744 hrs × €0.201    €149.54
  - Data Transfer Out: 2,847 GB × €0.09         €256.23
  Subtotal:                                      €691.47

Amazon RDS
  - db.r6g.2xlarge PostgreSQL: 744 hrs × €0.82  €610.08
  - Storage (850 GB): €0.115/GB                  €97.75
  - Backup Storage (1.2 TB)                      €24.00
  Subtotal:                                      €731.83

Amazon S3
  - Standard Storage (12.5 TB)                  €287.50
  - GET Requests (45M)                           €18.00
  - PUT Requests (2.3M)                          €11.50
  Subtotal:                                      €317.00

Amazon CloudFront
  - Data Transfer (8.2 TB)                      €688.80
  - HTTPS Requests (125M)                        €125.00
  Subtotal:                                      €813.80

Other Services
  - Amazon SES (185,000 emails)                  €18.50
  - AWS Lambda (4.2M invocations)                €12.60
  - Amazon CloudWatch                            €45.20
  Subtotal:                                       €76.30

───────────────────────────────────────────────────
TOTAL (excl. VAT):                            €2,630.40
VAT (21%):                                      €552.38
───────────────────────────────────────────────────
TOTAL DUE:                                    €3,182.78
═══════════════════════════════════════════════════

Payment Method: Auto-pay enabled (SEPA Direct Debit)
Payment will be collected on February 12, 2025

View detailed invoice: https://console.aws.amazon.com/billing/home#/bills

Cost optimization recommendations available in AWS Cost Explorer.

Thank you for using Amazon Web Services.

Amazon Web Services, Inc.
P.O. Box 81226
Seattle, WA 98108-1226`,
        bodyHtml: `<p>Dear SCEX B.V.,</p>

<p>Your AWS invoice for January 2025 is now available.</p>

<table style="border-collapse: collapse; width: 100%; font-family: monospace;">
<tr style="background: #232f3e; color: white;"><th colspan="2" style="padding: 10px;">INVOICE SUMMARY</th></tr>
<tr><td style="padding: 5px;">Invoice Number:</td><td>INV-2025-0892</td></tr>
<tr><td style="padding: 5px;">Invoice Date:</td><td>February 1, 2025</td></tr>
<tr><td style="padding: 5px;">Due Date:</td><td><strong>February 15, 2025</strong></td></tr>
<tr><td style="padding: 5px;">Account ID:</td><td>4521-8834-2201</td></tr>
</table>

<h3>Service Breakdown</h3>

<table style="width: 100%; border-collapse: collapse;">
<tr style="background: #f5f5f5;"><td style="padding: 8px;"><strong>Amazon EC2</strong></td><td style="text-align: right;">€691.47</td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 8px;"><strong>Amazon RDS</strong></td><td style="text-align: right;">€731.83</td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 8px;"><strong>Amazon S3</strong></td><td style="text-align: right;">€317.00</td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 8px;"><strong>Amazon CloudFront</strong></td><td style="text-align: right;">€813.80</td></tr>
<tr style="background: #f5f5f5;"><td style="padding: 8px;"><strong>Other Services</strong></td><td style="text-align: right;">€76.30</td></tr>
<tr style="border-top: 2px solid #232f3e;"><td style="padding: 8px;"><strong>TOTAL (excl. VAT)</strong></td><td style="text-align: right;"><strong>€2,630.40</strong></td></tr>
<tr><td style="padding: 8px;">VAT (21%)</td><td style="text-align: right;">€552.38</td></tr>
<tr style="background: #232f3e; color: white;"><td style="padding: 10px;"><strong>TOTAL DUE</strong></td><td style="text-align: right;"><strong>€3,182.78</strong></td></tr>
</table>

<p><strong>Payment Method:</strong> Auto-pay enabled (SEPA Direct Debit)<br>
Payment will be collected on <strong>February 12, 2025</strong></p>

<p><a href="https://console.aws.amazon.com/billing/home#/bills">View detailed invoice</a></p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        isRead: true,
      },
    ],
    isStarred: false,
    folder: 'inbox',
  },

  // Thread 4: GitHub PR notification
  {
    subject: '[scex/platform] Pull Request #1247: feat: Implement real-time collaboration cursors',
    messages: [
      {
        from: senders.github,
        to: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        body: `emma-wilson requested your review on: #1247 feat: Implement real-time collaboration cursors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

scex/platform #1247
feat: Implement real-time collaboration cursors

@emma-wilson wants to merge 23 commits into main from feature/collab-cursors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary

This PR implements real-time cursor presence for collaborative document editing, allowing users to see where other participants are working in real-time.

## Changes

### New Features
- WebSocket-based cursor position broadcasting
- Cursor rendering with user avatars and names
- Smooth cursor animations with 60fps interpolation
- Idle cursor fade-out after 30 seconds
- Mobile touch position support

### Technical Details
- Added \`CursorPresenceProvider\` React context
- Implemented \`useCursorBroadcast\` hook for position updates
- Created \`CollaboratorCursor\` component with CSS animations
- WebSocket message batching (50ms debounce) to reduce server load
- Cursor positions stored in Redis with 60s TTL

### Performance
- Benchmarked with 50 concurrent cursors: < 2ms render time
- WebSocket payload: ~120 bytes per cursor update
- Memory footprint: ~2KB per active collaborator

## Screenshots

[cursor-demo.gif] - Shows 3 users editing simultaneously

## Testing

- [x] Unit tests for cursor interpolation logic
- [x] Integration tests for WebSocket reconnection
- [x] E2E test with Playwright (3 browser instances)
- [x] Manual testing on Chrome, Firefox, Safari
- [x] Mobile testing on iOS Safari and Chrome Android

## Checklist

- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Documentation updated
- [x] No console warnings or errors
- [x] Backwards compatible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

+2,847 −234 in 47 files

View PR: https://github.com/scex/platform/pull/1247
Review requested: @willem-vdb, @david-kumar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're receiving this because your review was requested.
Reply to this email directly or view it on GitHub.`,
        bodyHtml: `<p><strong>emma-wilson</strong> requested your review on: <a href="https://github.com/scex/platform/pull/1247">#1247 feat: Implement real-time collaboration cursors</a></p>

<hr>

<h2>scex/platform #1247</h2>
<h3>feat: Implement real-time collaboration cursors</h3>

<p><code>@emma-wilson</code> wants to merge <strong>23 commits</strong> into <code>main</code> from <code>feature/collab-cursors</code></p>

<hr>

<h2>Summary</h2>
<p>This PR implements real-time cursor presence for collaborative document editing, allowing users to see where other participants are working in real-time.</p>

<h2>Changes</h2>

<h3>New Features</h3>
<ul>
<li>WebSocket-based cursor position broadcasting</li>
<li>Cursor rendering with user avatars and names</li>
<li>Smooth cursor animations with 60fps interpolation</li>
<li>Idle cursor fade-out after 30 seconds</li>
<li>Mobile touch position support</li>
</ul>

<h3>Technical Details</h3>
<ul>
<li>Added <code>CursorPresenceProvider</code> React context</li>
<li>Implemented <code>useCursorBroadcast</code> hook for position updates</li>
<li>Created <code>CollaboratorCursor</code> component with CSS animations</li>
<li>WebSocket message batching (50ms debounce) to reduce server load</li>
<li>Cursor positions stored in Redis with 60s TTL</li>
</ul>

<p><strong>+2,847 −234</strong> in 47 files</p>

<p><a href="https://github.com/scex/platform/pull/1247">View PR on GitHub</a></p>`,
        date: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
        isRead: false,
      },
    ],
    isStarred: false,
    folder: 'inbox',
  },

  // Thread 5: Legal/Contract review
  {
    subject: 'CONFIDENTIAL: Employment Agreement Amendment - Annual Review 2025',
    messages: [
      {
        from: senders.hr,
        to: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        body: `Dear Willem,

Following your annual performance review and the compensation committee's decision, please find below the proposed amendments to your employment agreement, effective March 1, 2025.

═══════════════════════════════════════════════════════════
COMPENSATION ADJUSTMENT
═══════════════════════════════════════════════════════════

Current Base Salary:     €95,000 per annum
Proposed Base Salary:    €108,000 per annum
Adjustment:              +€13,000 (13.7% increase)

───────────────────────────────────────────────────────────
VARIABLE COMPENSATION
───────────────────────────────────────────────────────────

Annual Bonus Target:     15% of base salary (€16,200)
Stock Options:           2,500 additional options vesting over 4 years
                         (Strike price: €12.50, current FMV: €18.20)

───────────────────────────────────────────────────────────
ADDITIONAL BENEFITS
───────────────────────────────────────────────────────────

• Professional Development Budget: €3,000/year (increased from €2,000)
• Home Office Allowance: €100/month (new)
• Additional PTO: 2 days (total: 28 days)

═══════════════════════════════════════════════════════════

This offer reflects your exceptional contributions to the platform team, particularly:
- Leading the API v3 migration (completed 2 weeks ahead of schedule)
- Mentoring 3 junior developers
- 99.97% uptime achievement for critical services

Please review the attached formal amendment document. If you agree to the terms, sign electronically via DocuSign by February 14, 2025.

Should you have any questions, please don't hesitate to reach out to me directly or schedule time with your manager, Thomas Anderson.

Congratulations on your well-deserved recognition!

Best regards,

Lisa van der Berg
HR Business Partner
SCEX B.V.
+31 20 555 0100

───────────────────────────────────────────────────────────
CONFIDENTIALITY NOTICE: This email contains confidential
information intended only for the named recipient. If you
received this in error, please delete it immediately.
───────────────────────────────────────────────────────────`,
        bodyHtml: `<p>Dear Willem,</p>

<p>Following your annual performance review and the compensation committee's decision, please find below the proposed amendments to your employment agreement, effective <strong>March 1, 2025</strong>.</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<tr style="background: #1a365d; color: white;"><th colspan="2" style="padding: 12px; text-align: left;">COMPENSATION ADJUSTMENT</th></tr>
<tr style="background: #f7fafc;"><td style="padding: 10px; border: 1px solid #e2e8f0;">Current Base Salary</td><td style="padding: 10px; border: 1px solid #e2e8f0;">€95,000 per annum</td></tr>
<tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Proposed Base Salary</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>€108,000 per annum</strong></td></tr>
<tr style="background: #c6f6d5;"><td style="padding: 10px; border: 1px solid #e2e8f0;">Adjustment</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>+€13,000 (13.7% increase)</strong></td></tr>
</table>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<tr style="background: #1a365d; color: white;"><th colspan="2" style="padding: 12px; text-align: left;">VARIABLE COMPENSATION</th></tr>
<tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Annual Bonus Target</td><td style="padding: 10px; border: 1px solid #e2e8f0;">15% of base salary (€16,200)</td></tr>
<tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Stock Options</td><td style="padding: 10px; border: 1px solid #e2e8f0;">2,500 additional options vesting over 4 years<br><em>Strike price: €12.50, current FMV: €18.20</em></td></tr>
</table>

<p>Please review the attached formal amendment document. If you agree to the terms, sign electronically via DocuSign by <strong>February 14, 2025</strong>.</p>

<p>Congratulations on your well-deserved recognition!</p>

<p>Best regards,</p>
<p><strong>Lisa van der Berg</strong><br>HR Business Partner<br>SCEX B.V.</p>

<p style="background: #fef3c7; padding: 10px; border-left: 4px solid #d97706; font-size: 12px;"><strong>CONFIDENTIALITY NOTICE:</strong> This email contains confidential information intended only for the named recipient.</p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        isRead: true,
      },
    ],
    isStarred: true,
    folder: 'inbox',
  },

  // Thread 6: Bank notification
  {
    subject: 'ING Zakelijk: Betaling ontvangen - €12.450,00',
    messages: [
      {
        from: senders.bank,
        to: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        body: `Beste Willem van den Berg,

Er is een betaling binnengekomen op uw zakelijke rekening.

════════════════════════════════════════════════
TRANSACTIEDETAILS
════════════════════════════════════════════════

Bedrag:           €12.450,00
Van:              Nexus Industries B.V.
IBAN afzender:    NL91 ABNA 0417 1643 00
Omschrijving:     Factuur 2025-0034 / Consultancy Dec 2024
Datum:            30 januari 2025, 14:32
Referentie:       TRX-8834521-EU

────────────────────────────────────────────────
UW REKENING
────────────────────────────────────────────────

Rekening:         NL02 INGB 0001 2345 67
Nieuw saldo:      €47.892,34

════════════════════════════════════════════════

Bekijk uw transactieoverzicht in de ING Business App of via
Mijn ING Zakelijk: https://mijn.ing.nl/business

Met vriendelijke groet,
ING Bank N.V.

────────────────────────────────────────────────
Dit is een automatisch gegenereerd bericht.
Heeft u vragen? Bel 020 22 888 00 (ma-vr 8:00-18:00)`,
        bodyHtml: `<p>Beste Willem van den Berg,</p>

<p>Er is een betaling binnengekomen op uw zakelijke rekening.</p>

<table style="width: 100%; border-collapse: collapse; background: #ff6200; color: white; margin: 20px 0;">
<tr><th colspan="2" style="padding: 15px; text-align: left; font-size: 18px;">TRANSACTIEDETAILS</th></tr>
</table>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
<tr><td style="padding: 10px; border-bottom: 1px solid #eee; width: 150px;"><strong>Bedrag</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 24px; color: #22c55e;"><strong>€12.450,00</strong></td></tr>
<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Van</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">Nexus Industries B.V.</td></tr>
<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>IBAN afzender</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace;">NL91 ABNA 0417 1643 00</td></tr>
<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Omschrijving</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">Factuur 2025-0034 / Consultancy Dec 2024</td></tr>
<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Datum</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">30 januari 2025, 14:32</td></tr>
</table>

<table style="width: 100%; border-collapse: collapse; background: #f5f5f5; margin: 20px 0;">
<tr><td style="padding: 15px;"><strong>Nieuw saldo:</strong></td><td style="padding: 15px; text-align: right; font-size: 20px;"><strong>€47.892,34</strong></td></tr>
</table>

<p><a href="https://mijn.ing.nl/business" style="background: #ff6200; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Bekijk transactieoverzicht</a></p>

<p>Met vriendelijke groet,<br><strong>ING Bank N.V.</strong></p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 10), // 10 hours ago
        isRead: true,
      },
    ],
    isStarred: false,
    folder: 'inbox',
  },

  // Thread 7: CEO message
  {
    subject: 'All Hands Meeting - Q1 Kickoff & Major Announcement',
    messages: [
      {
        from: senders.ceo,
        to: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        body: `Dear Team,

I hope this message finds you well as we embark on what promises to be a transformative year for SCEX.

I'm writing to invite you to our Q1 All Hands Meeting, where I'll be sharing some exciting news about our company's future.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Q1 ALL HANDS MEETING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date:      Friday, February 7, 2025
Time:      15:00 - 16:30 CET
Location:  Main Conference Room (Amsterdam HQ)
           + Zoom for remote participants

Zoom Link: https://scex.zoom.us/j/892456123
Passcode:  Q1Kickoff25

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

15:00 - Welcome & 2024 Retrospective
15:15 - Financial Performance Review (CFO - Maria Santos)
15:30 - Product Roadmap 2025 (CPO - Alex Müller)
15:45 - 🎉 MAJOR ANNOUNCEMENT 🎉
16:00 - Q1 OKRs & Team Goals
16:15 - Q&A Session
16:30 - Closing & Networking

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Without revealing too much, I can share that the announcement relates to a significant milestone we've been working toward for the past 18 months. This will have positive implications for our growth trajectory, our team, and our customers.

2024 was a remarkable year:
• Revenue grew 47% YoY to €12.3M ARR
• Customer base expanded to 850+ organizations
• Team grew from 45 to 72 people
• Platform uptime: 99.98%

I'm incredibly proud of what we've built together, and I believe 2025 will be even more exciting.

Please mark your calendars and submit any questions in advance via the #all-hands-q1 Slack channel.

See you on Friday!

Thomas Anderson
CEO & Co-Founder
SCEX B.V.

"Building the future of collaborative work"`,
        bodyHtml: `<p>Dear Team,</p>

<p>I hope this message finds you well as we embark on what promises to be a transformative year for SCEX.</p>

<p>I'm writing to invite you to our <strong>Q1 All Hands Meeting</strong>, where I'll be sharing some exciting news about our company's future.</p>

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; margin: 20px 0;">
<h2 style="margin: 0 0 15px 0;">📅 Q1 ALL HANDS MEETING</h2>
<table style="color: white;">
<tr><td style="padding: 5px 20px 5px 0;"><strong>Date:</strong></td><td>Friday, February 7, 2025</td></tr>
<tr><td style="padding: 5px 20px 5px 0;"><strong>Time:</strong></td><td>15:00 - 16:30 CET</td></tr>
<tr><td style="padding: 5px 20px 5px 0;"><strong>Location:</strong></td><td>Main Conference Room + Zoom</td></tr>
</table>
</div>

<h3>AGENDA</h3>
<ul>
<li>15:00 - Welcome & 2024 Retrospective</li>
<li>15:15 - Financial Performance Review</li>
<li>15:30 - Product Roadmap 2025</li>
<li><strong>15:45 - 🎉 MAJOR ANNOUNCEMENT 🎉</strong></li>
<li>16:00 - Q1 OKRs & Team Goals</li>
<li>16:15 - Q&A Session</li>
</ul>

<div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
<h4 style="margin: 0 0 10px 0;">2024 Highlights</h4>
<ul style="margin: 0;">
<li>Revenue grew <strong>47% YoY</strong> to €12.3M ARR</li>
<li>Customer base expanded to <strong>850+ organizations</strong></li>
<li>Team grew from 45 to <strong>72 people</strong></li>
<li>Platform uptime: <strong>99.98%</strong></li>
</ul>
</div>

<p>See you on Friday!</p>

<p><strong>Thomas Anderson</strong><br>CEO & Co-Founder<br>SCEX B.V.</p>

<p><em>"Building the future of collaborative work"</em></p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 28), // 28 hours ago
        isRead: true,
      },
    ],
    isStarred: true,
    folder: 'inbox',
  },

  // Thread 8: Recruiter outreach
  {
    subject: 'Opportunity: VP of Engineering at Series B Startup (€180-220k + equity)',
    messages: [
      {
        from: senders.recruiter,
        to: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        body: `Hi Willem,

I hope this email finds you well. I came across your profile on LinkedIn and was impressed by your background in building scalable platforms at SCEX.

I'm reaching out because I'm working with a stealth-mode Series B startup that's revolutionizing enterprise communication. They've just closed a €45M round led by Sequoia and are looking for a VP of Engineering to build out their technical leadership team.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE OPPORTUNITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Role:              VP of Engineering
Company:           [Stealth - details under NDA]
Location:          Amsterdam (hybrid, 2 days in office)
Team Size:         Currently 25 engineers, scaling to 60 by EOY

Compensation:
• Base Salary:     €180,000 - €220,000
• Equity:          0.5% - 0.8% (4-year vest, 1-year cliff)
• Signing Bonus:   €25,000
• Annual Bonus:    20% target

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY THIS ROLE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Category-defining product with 300% YoY growth
• Technical co-founder from Stripe, engineering team from Google/Meta
• Clear path to IPO within 3-4 years
• Full ownership of engineering org, reporting to CEO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on your experience leading platform teams and your track record with distributed systems, I believe you'd be an excellent fit.

Would you be open to a confidential 20-minute call this week to learn more? I can share the company name and detailed job spec under NDA.

Available times (CET):
• Tuesday, Feb 4: 10:00 or 14:00
• Wednesday, Feb 5: 11:00 or 16:00
• Thursday, Feb 6: 09:00 or 15:00

Let me know if any of these work, or suggest an alternative.

Best regards,

Marcus Thompson
Senior Partner
TopTech Executive Recruiting

📧 marcus@toptech-recruiting.com
📱 +31 6 1234 5678
🔗 linkedin.com/in/marcusthompson

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
We specialize in placing technical leaders at Europe's
fastest-growing startups. 200+ successful placements since 2019.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        bodyHtml: `<p>Hi Willem,</p>

<p>I hope this email finds you well. I came across your profile on LinkedIn and was impressed by your background in building scalable platforms at SCEX.</p>

<p>I'm reaching out because I'm working with a stealth-mode Series B startup that's revolutionizing enterprise communication. They've just closed a <strong>€45M round led by Sequoia</strong> and are looking for a VP of Engineering.</p>

<div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="margin: 0 0 15px 0; color: #60a5fa;">THE OPPORTUNITY</h3>
<table style="color: white; width: 100%;">
<tr><td style="padding: 8px 0;"><strong>Role:</strong></td><td>VP of Engineering</td></tr>
<tr><td style="padding: 8px 0;"><strong>Location:</strong></td><td>Amsterdam (hybrid)</td></tr>
<tr><td style="padding: 8px 0;"><strong>Base Salary:</strong></td><td style="color: #4ade80;"><strong>€180,000 - €220,000</strong></td></tr>
<tr><td style="padding: 8px 0;"><strong>Equity:</strong></td><td>0.5% - 0.8%</td></tr>
<tr><td style="padding: 8px 0;"><strong>Signing Bonus:</strong></td><td>€25,000</td></tr>
</table>
</div>

<h3>Why This Role?</h3>
<ul>
<li>Category-defining product with <strong>300% YoY growth</strong></li>
<li>Technical co-founder from Stripe</li>
<li>Clear path to IPO within 3-4 years</li>
<li>Full ownership of engineering org</li>
</ul>

<p>Would you be open to a confidential 20-minute call this week?</p>

<p><strong>Available times (CET):</strong></p>
<ul>
<li>Tuesday, Feb 4: 10:00 or 14:00</li>
<li>Wednesday, Feb 5: 11:00 or 16:00</li>
<li>Thursday, Feb 6: 09:00 or 15:00</li>
</ul>

<p>Best regards,</p>
<p><strong>Marcus Thompson</strong><br>Senior Partner<br>TopTech Executive Recruiting</p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        isRead: true,
      },
    ],
    isStarred: false,
    folder: 'archived',
  },

  // Thread 9: Sent email
  {
    subject: 'Re: Design Review - Mobile App v2.0',
    messages: [
      {
        from: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        to: senders.emma,
        body: `Hi Emma,

Thanks for sharing the updated mockups! The new design direction looks fantastic. Here's my feedback:

**What I love:**
✅ The new navigation pattern is much more intuitive
✅ Color palette works great in both light and dark mode
✅ Micro-animations feel polished without being distracting
✅ Accessibility improvements (contrast ratios, touch targets)

**Suggestions for consideration:**

1. **Inbox zero state**: Could we add a celebratory animation when users clear their inbox? Something subtle like the checkmark animation in Things 3.

2. **Thread grouping**: The visual hierarchy for threaded conversations could be stronger. Maybe indent replies slightly or use a connecting line?

3. **Compose button**: On the prototype, the FAB sometimes overlaps content. Consider a hide-on-scroll behavior?

4. **Loading states**: The skeleton screens look good, but the shimmer animation might be too fast. Try 1.5s instead of 0.8s?

I've added more detailed comments directly in Figma: https://figma.com/file/SCEX-mobile-v2/comments

Overall, this is a huge improvement over v1. I think we're ready for user testing once we address the threading hierarchy.

Let's sync tomorrow during standup to prioritize these changes.

Great work! 🎨

Willem`,
        bodyHtml: `<p>Hi Emma,</p>

<p>Thanks for sharing the updated mockups! The new design direction looks fantastic. Here's my feedback:</p>

<h3>What I love:</h3>
<ul>
<li>✅ The new navigation pattern is much more intuitive</li>
<li>✅ Color palette works great in both light and dark mode</li>
<li>✅ Micro-animations feel polished without being distracting</li>
<li>✅ Accessibility improvements (contrast ratios, touch targets)</li>
</ul>

<h3>Suggestions for consideration:</h3>

<ol>
<li><strong>Inbox zero state</strong>: Could we add a celebratory animation when users clear their inbox?</li>
<li><strong>Thread grouping</strong>: The visual hierarchy for threaded conversations could be stronger.</li>
<li><strong>Compose button</strong>: The FAB sometimes overlaps content. Consider a hide-on-scroll behavior?</li>
<li><strong>Loading states</strong>: The skeleton shimmer animation might be too fast. Try 1.5s instead of 0.8s?</li>
</ol>

<p>I've added more detailed comments directly in <a href="https://figma.com/file/SCEX-mobile-v2/comments">Figma</a>.</p>

<p>Great work! 🎨</p>

<p>Willem</p>`,
        date: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
        isRead: true,
      },
    ],
    isStarred: false,
    folder: 'sent',
  },

  // Thread 10: Draft
  {
    subject: 'Draft: Proposal for Engineering Blog Series',
    messages: [
      {
        from: { email: 'willem@scex.nl', name: 'Willem van den Berg' },
        to: senders.ceo,
        body: `Hi Thomas,

I wanted to propose starting a technical blog series to showcase our engineering culture and attract talent. Here's my initial outline:

**Proposed Topics:**

1. "How We Scaled to 1 Million WebSocket Connections"
   - Our real-time architecture journey
   - Lessons learned from production incidents

2. "Building a Design System at Scale"
   - Component library evolution
   - Collaboration between design and engineering

3. "Our Journey to Zero-Downtime Deployments"
   - Blue-green deployment strategy
   - Feature flags and gradual rollouts

4. "Remote Engineering Culture at SCEX"
   - Async communication best practices
   - Tools and rituals that work for us

**Timeline:**
- February: Topic 1 (I can write this one)
- March: Topic 2 (Emma could lead)
- April: Topic 3 (David's expertise)
- May: Topic 4 (HR collaboration)

**Resources needed:**
- Technical writer review: ~€500/post
- Illustrations: ~€300/post
- Dev time: ~8 hours per post

[DRAFT - need to add ROI metrics and competitive analysis]

Let me know your thoughts!

Willem`,
        bodyHtml: `<p>Hi Thomas,</p>

<p>I wanted to propose starting a technical blog series to showcase our engineering culture and attract talent.</p>

<p><strong>[DRAFT - need to add ROI metrics and competitive analysis]</strong></p>

<p>Willem</p>`,
        date: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        isRead: true,
      },
    ],
    isStarred: false,
    folder: 'drafts',
  },
]

// Insert threads and emails
const insertThread = db.prepare(`
  INSERT INTO threads (
    id, external_id, account_id, subject, snippet, participant_emails,
    inbox_status, sent_status, draft_status, starred_status, archived_status,
    unread_count, message_count, has_attachments, last_message_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const insertEmail = db.prepare(`
  INSERT INTO emails (
    id, external_id, thread_id, account_id, from_address, from_name,
    to_addresses, subject, body_text, body_html, snippet,
    is_read, is_starred, is_draft, sent_at, received_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

for (const thread of mockThreads) {
  const threadId = uuid()
  const lastMessage = thread.messages[thread.messages.length - 1]
  const firstMessage = thread.messages[0]

  const isInbox = thread.folder === 'inbox'
  const isSent = thread.folder === 'sent'
  const isDraft = thread.folder === 'drafts'
  const isArchived = thread.folder === 'archived'

  const participants = JSON.stringify([
    ...new Set(thread.messages.flatMap((m) => [m.from.email, m.to.email])),
  ])

  const unreadCount = thread.messages.filter((m) => !m.isRead).length

  insertThread.run(
    threadId,
    `ext_${threadId}`,
    accountId,
    thread.subject,
    firstMessage.body.substring(0, 150).replace(/\n/g, ' '),
    participants,
    isInbox ? 1 : 0,
    isSent ? 1 : 0,
    isDraft ? 1 : 0,
    thread.isStarred ? 1 : 0,
    isArchived ? 1 : 0,
    unreadCount,
    thread.messages.length,
    0,
    lastMessage.date.toISOString()
  )

  for (const message of thread.messages) {
    const emailId = uuid()
    const toAddresses = JSON.stringify([{ address: message.to.email, name: message.to.name }])

    insertEmail.run(
      emailId,
      `ext_${emailId}`,
      threadId,
      accountId,
      message.from.email,
      message.from.name,
      toAddresses,
      thread.subject,
      message.body,
      message.bodyHtml,
      message.body.substring(0, 150).replace(/\n/g, ' '),
      message.isRead ? 1 : 0,
      thread.isStarred ? 1 : 0,
      isDraft ? 1 : 0,
      message.date.toISOString(),
      message.date.toISOString()
    )
  }

  console.log('Created thread:', thread.subject.substring(0, 50) + '...')
}

// Create tags
const tags = [
  { name: 'Work', color: '#3b82f6' },
  { name: 'Personal', color: '#22c55e' },
  { name: 'Finance', color: '#f59e0b' },
  { name: 'Urgent', color: '#ef4444' },
  { name: 'Clients', color: '#8b5cf6' },
  { name: 'Recruiting', color: '#ec4899' },
]

const insertTag = db.prepare(`
  INSERT INTO tags (id, name, color, position) VALUES (?, ?, ?, ?)
`)

tags.forEach((tag, i) => {
  insertTag.run(uuid(), tag.name, tag.color, i)
  console.log('Created tag:', tag.name)
})

// Create perspectives
const insertPerspective = db.prepare(`
  INSERT INTO perspectives (id, name, icon, color, filters, view_type, position)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

insertPerspective.run(
  uuid(),
  'Client Inbox',
  'briefcase',
  '#8b5cf6',
  JSON.stringify({ tags: ['Clients'], unreadOnly: false }),
  'list',
  0
)
console.log('Created perspective: Client Inbox')

insertPerspective.run(
  uuid(),
  'Needs Reply',
  'reply',
  '#ef4444',
  JSON.stringify({ unreadOnly: true, hasActionItems: true }),
  'list',
  1
)
console.log('Created perspective: Needs Reply')

db.close()
console.log('\n✅ Realistic mock data seeded successfully!')
console.log('Restart the app to see the new data.')
