# TeamOps Platform v2.0

A complete team operations management system with SMS notifications, performance tracking, and competitive leaderboards.

## Prerequisites

1. **Install Node.js** (v18 or higher):
   - Download from https://nodejs.org/
   - Or use Homebrew: `brew install node`

2. **Verify installation**:
   ```bash
   node --version  # Should show v18.x or higher
   npm --version   # Should show 9.x or higher
   ```

## Quick Start

```bash
cd teamops-app

# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Create database and seed with sample data
npm run db:push
npm run db:seed

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

### Dashboard
- Executive overview with key metrics
- Overdue/blocked/due-soon alerts
- Team summary table
- Leaderboard preview
- Current focus tracking

### Tasks Management
- Full CRUD operations
- Priority levels: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- Status: Not Started, In Progress, Blocked, Done
- Progress bars with inline editing
- Filters: All, Urgent, Overdue, Blocked
- Current focus toggle

### Meetings
- **Daily Standup**: Quick 15-min sync
- **Weekly Planning**: Plan the week ahead
- **Monthly Review**: Performance and bonuses
- Quick standup form per member:
  - What are you doing now?
  - Top priority task
  - Progress update
  - Blockers
  - Next actions
  - Confidence level (1-5)

### Time Tracking
- Real-time timer with start/stop
- Manual entry with hours/minutes
- Categories: Client Work, Internal, Sales, R&D, Admin
- Billable vs non-billable tracking
- Value calculation (hours × rate)
- Monthly summaries

### Leaderboard & Performance
- Performance scoring (0-100):
  - Delivery Score (0-40): On-time completion rate
  - Progress Score (0-40): Tasks completed + P0/P1 focus
  - Improvement Score (0-20): Month-over-month trend
- Bonus calculation: `billable_hours × $25 × (1 + score/100)`
- Podium view for top 3
- Full rankings table

### Team Management
- Add/edit team members
- Set hourly rates
- Configure timezone
- Check-in frequency (hourly/daily)
- SMS notification preferences

### SMS Notifications
- Automated alerts:
  - Overdue task reminders
  - Meeting notifications
  - Achievement celebrations
  - Leaderboard updates
  - Blocker alerts
- Manual notifications to individuals or team
- Notification history log

### Settings
- Bonus rate configuration
- Scoring weights
- Alert thresholds
- Formula reference

## SMS Setup (Twilio)

To enable real SMS notifications:

1. Create account at https://console.twilio.com
2. Get your Account SID, Auth Token, and Phone Number
3. Add to `.env`:

```
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

Without Twilio credentials, notifications are logged but not sent (demo mode).

## Performance Formula

```
Performance Score (0-100)
├── Delivery Score (0-40)
│   └── = On-Time Completion Rate × 0.4
├── Progress Score (0-40)
│   └── = min(40, Tasks×5 + P0/P1×5 + BillableHours/4)
└── Improvement Score (0-20)
    └── = Month-over-month trend (compared to previous month)

Bonus = Billable Hours × $25 × (1 + Performance Score / 100)

Example:
- 40 billable hours
- 80 performance score
- Bonus = 40 × $25 × 1.80 = $1,800
```

## Workflow Guide

### Daily
1. Morning: Start Daily Standup
2. Each member submits their update (< 1 min)
3. Log time as you work
4. Update task progress
5. Check dashboard for alerts

### Weekly
1. Monday: Weekly Planning meeting
2. Prioritize tasks for the week
3. Friday: Review team progress

### Monthly
1. Click "Generate Reports" on Leaderboard
2. Review performance scores
3. Send leaderboard notifications
4. Discuss bonuses in Monthly Review meeting

## Database

Using SQLite for simplicity. Data stored in `prisma/dev.db`.

Commands:
- `npm run db:studio` - Open Prisma Studio (database viewer)
- `npm run db:reset` - Reset and re-seed database

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite + Prisma ORM
- **SMS**: Twilio (optional)

## File Structure

```
teamops-app/
├── app/
│   ├── api/           # API routes
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── meetings/
│   │   ├── notifications/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── tasks/
│   │   └── time/
│   ├── leaderboard/   # Leaderboard page
│   ├── meetings/      # Meetings page
│   ├── notifications/ # Notifications page
│   ├── settings/      # Settings page
│   ├── tasks/         # Tasks page
│   ├── team/          # Team page
│   ├── time/          # Time tracking page
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout with sidebar
│   └── page.tsx       # Dashboard (home)
├── lib/
│   ├── db.ts          # Prisma client
│   ├── sms.ts         # Twilio SMS service
│   └── utils.ts       # Utility functions
├── prisma/
│   ├── schema.prisma  # Database schema
│   └── seed.ts        # Sample data
└── package.json
```
