# Complete Lovable Prompt for TeamOps Platform

Build a Team Operations Management Platform called "TeamOps" with Next.js 14 (App Router), Prisma ORM with SQLite, and TypeScript. This is a smart display dashboard (iPad/Alexa aesthetic) with a powerful AI assistant called JARVIS.

## Tech Stack
- Next.js 14 with App Router
- TypeScript
- Prisma ORM with SQLite
- TailwindCSS
- Framer Motion for animations
- Web Speech API for voice input/output

## Design System

### Colors & Theme (Dark Glassmorphism)
```css
:root {
  /* Background gradient */
  --bg-gradient: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1f 100%);

  /* Glass cards */
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: blur(20px);

  /* Accent gradient */
  --accent-gradient: linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899);

  /* Text */
  --text-primary: rgba(255, 255, 255, 0.9);
  --text-secondary: rgba(255, 255, 255, 0.6);
  --text-muted: rgba(255, 255, 255, 0.4);

  /* Status colors */
  --status-online: #10B981;
  --status-away: #F59E0B;
  --status-busy: #EF4444;
  --status-meeting: #6366F1;
  --status-offline: #71717A;

  /* Priority colors */
  --priority-p0: linear-gradient(135deg, #FEE2E2, #FECACA);
  --priority-p1: #FEF3C7;
  --priority-p2: #EEF2FF;
  --priority-p3: #F4F4F5;
}
```

### Typography
- Font: Inter (Google Fonts)
- Letter spacing: -0.02em for headings
- Hero time: 5rem, font-weight: 200
- Titles: 1.5rem, font-weight: 600
- Body: 0.9375rem
- Captions: 0.8125rem

### Spacing & Radius
- Card border-radius: 24px
- Button border-radius: 16px
- Small elements: 12px
- Card padding: 24px
- Grid gap: 20px

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// ==================== TEAM MEMBERS ====================
model Member {
  id                String   @id @default(cuid())
  name              String
  email             String   @unique
  phone             String?
  role              String
  timezone          String   @default("EST")
  checkinFrequency  String   @default("DAILY") // HOURLY, DAILY
  isActive          Boolean  @default(true)
  hourlyRate        Float    @default(100)
  avatarUrl         String?
  notifyOnOverdue   Boolean  @default(true)
  notifyOnMeeting   Boolean  @default(true)
  notifyOnMention   Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Skills & Capacity
  skillTags         String?  // Comma-separated: "Sales,Web,AI,Ops,Design,Legal,Finance"
  seniorityLevel    Int      @default(2) // 1=Junior, 2=Mid, 3=Senior, 4=Lead, 5=Director
  maxConcurrentTasks Int     @default(5)
  isManager         Boolean  @default(false)

  // Morning Focus
  morningFocusEnabled Boolean @default(true)
  morningFocusTime    String  @default("09:00")
  emailSummaryEnabled Boolean @default(false)

  // Virtual Office
  avatarStyle       String   @default("default")
  avatarColor       String   @default("#6366F1")
  avatarAccessories String?
  deskDecorations   String?
  officeStatus      String   @default("OFFLINE") // ONLINE, AWAY, BUSY, IN_MEETING, OFFLINE
  statusMessage     String?
  lastSeenAt        DateTime?
  currentZone       String   @default("desk")
  positionX         Int      @default(0)
  positionY         Int      @default(0)

  // Relations
  tasks             Task[]
  timeEntries       TimeEntry[]
  meetingResponses  MeetingResponse[]
  meetingsCreated   Meeting[]
  monthlyReports    MonthlyReport[]
  notifications     Notification[]
  sentNotifications Notification[]    @relation("SentBy")
  aiCheckins        AICheckin[]
  jarvisConversations JarvisConversation[]
  dailySummaries    DailySummary[]
  pinnedFocusItems  PinnedFocusItem[]
  workspot          Workspot?
  officeMessages    OfficeMessage[]   @relation("SentMessages")
  receivedMessages  OfficeMessage[]   @relation("ReceivedMessages")
}

// ==================== TASKS ====================
model Task {
  id              String   @id @default(cuid())
  title           String
  description     String?
  ownerId         String
  priority        String   @default("P2") // P0, P1, P2, P3
  status          String   @default("NOT_STARTED") // NOT_STARTED, IN_PROGRESS, BLOCKED, DONE
  progressPercent Int      @default(0)
  dueDate         DateTime?
  blockerNotes    String?
  currentFocus    Boolean  @default(false)
  lastCheckinAt   DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 4-Factor Prioritization Grid
  urgencyLevel       Int      @default(3) // 1-5
  importanceLevel    Int      @default(3) // 1-5
  internalDeadline   DateTime?
  externalClientDeadline DateTime?
  estimatedDuration  String   @default("M") // XS (<1h), S (1-4h), M (4-8h), L (1-3d), XL (3d+)
  durabilityCategory String   @default("SHORT") // SHORT, MEDIUM, LONG

  // Complexity & Assignment
  complexityLevel    Int      @default(3) // 1-5
  skillTags          String?
  reviewerIds        String?
  collaboratorIds    String?
  requiresMultiHand  Boolean  @default(false)

  // AI Assignment Recommendation
  recommendedOwnerId    String?
  recommendedCadence    String?
  recommendedPlan       String?
  assignmentConfidence  Float?

  // Manager Flags
  flaggedImmediate      Boolean  @default(false)
  pinnedByManager       Boolean  @default(false)
  managerNotes          String?

  // Relations
  owner           Member   @relation(fields: [ownerId], references: [id])
  timeEntries     TimeEntry[]
  meetingResponses MeetingResponse[]
  aiCheckins      AICheckin[]
}

// ==================== MEETINGS ====================
model Meeting {
  id           String   @id @default(cuid())
  type         String   // DAILY_STANDUP, WEEKLY_PLANNING, MONTHLY_REVIEW
  title        String?
  startTime    DateTime @default(now())
  endTime      DateTime?
  createdById  String
  notesSummary String?
  status       String   @default("SCHEDULED") // SCHEDULED, IN_PROGRESS, COMPLETED
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  createdBy    Member   @relation(fields: [createdById], references: [id])
  responses    MeetingResponse[]
}

model MeetingResponse {
  id                    String   @id @default(cuid())
  meetingId             String
  memberId              String
  whatImDoingNow        String?
  topPriorityTaskId     String?
  statusUpdate          String?
  progressPercentUpdate Int?
  blockers              String?
  nextActions           String?
  confidence            Int?     // 1-5
  submittedAt           DateTime @default(now())

  meeting               Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  member                Member   @relation(fields: [memberId], references: [id])
  topPriorityTask       Task?    @relation(fields: [topPriorityTaskId], references: [id])
}

// ==================== TIME TRACKING ====================
model TimeEntry {
  id              String   @id @default(cuid())
  memberId        String
  taskId          String?
  date            DateTime
  durationMinutes Int
  category        String   @default("INTERNAL") // CLIENT_WORK, INTERNAL, SALES, R_AND_D, ADMIN
  billable        Boolean  @default(false)
  hourlyRate      Float?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  member          Member   @relation(fields: [memberId], references: [id])
  task            Task?    @relation(fields: [taskId], references: [id])
}

// ==================== PERFORMANCE ====================
model MonthlyReport {
  id                  String   @id @default(cuid())
  month               String   // YYYY-MM
  memberId            String
  totalHours          Float    @default(0)
  billableHours       Float    @default(0)
  valueGenerated      Float    @default(0)
  tasksCompleted      Int      @default(0)
  tasksAssigned       Int      @default(0)
  onTimeRate          Float    @default(0)
  deliveryScore       Float    @default(0)
  progressScore       Float    @default(0)
  improvementScore    Float    @default(0)
  performanceScore    Float    @default(0)
  bonusAmount         Float    @default(0)
  rank                Int?
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  member              Member   @relation(fields: [memberId], references: [id])

  @@unique([month, memberId])
}

// ==================== NOTIFICATIONS ====================
model Notification {
  id          String   @id @default(cuid())
  memberId    String
  type        String   // OVERDUE_ALERT, MEETING_REMINDER, PROGRESS_UPDATE, ACHIEVEMENT, LEADERBOARD
  channel     String   // SMS, EMAIL, IN_APP
  subject     String
  message     String
  status      String   @default("PENDING") // PENDING, SENT, FAILED
  sentAt      DateTime?
  sentById    String?
  createdAt   DateTime @default(now())

  member      Member   @relation(fields: [memberId], references: [id])
  sentBy      Member?  @relation("SentBy", fields: [sentById], references: [id])
}

// ==================== SETTINGS ====================
model Setting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  description String?
  category    String   @default("general")
  updatedAt   DateTime @updatedAt
}

// ==================== AI CHECK-INS ====================
model AICheckin {
  id                String   @id @default(cuid())
  memberId          String
  taskId            String?
  type              String   // VOICE, VIDEO, TEXT
  mediaUrl          String?
  thumbnailUrl      String?
  durationSeconds   Int?
  transcription     String?
  aiSummary         String?
  aiReport          String?
  extractedProgress Int?
  extractedBlockers String?
  extractedNextSteps String?
  sentiment         String?  // POSITIVE, NEUTRAL, NEGATIVE
  confidence        Float?
  processedAt       DateTime?
  createdAt         DateTime @default(now())

  member            Member   @relation(fields: [memberId], references: [id])
  task              Task?    @relation(fields: [taskId], references: [id])
  attachments       CheckinAttachment[]
}

model CheckinAttachment {
  id          String   @id @default(cuid())
  checkinId   String
  type        String   // IMAGE, SCREENSHOT, DOCUMENT
  url         String
  caption     String?
  aiAnalysis  String?
  createdAt   DateTime @default(now())

  checkin     AICheckin @relation(fields: [checkinId], references: [id], onDelete: Cascade)
}

// ==================== JARVIS CONVERSATIONS ====================
model JarvisConversation {
  id          String   @id @default(cuid())
  memberId    String?
  sessionId   String
  role        String   // USER, ASSISTANT, SYSTEM
  content     String
  audioUrl    String?
  functionCall String?
  functionResult String?
  createdAt   DateTime @default(now())

  member      Member?  @relation(fields: [memberId], references: [id])
}

// ==================== AUTO ALERTS ====================
model AutoAlert {
  id          String   @id @default(cuid())
  name        String
  type        String   // TASK_OVERDUE, PROGRESS_STALL, DAILY_REMINDER, WEEKLY_SUMMARY
  conditions  String   // JSON conditions
  message     String
  channels    String   // SMS,EMAIL,IN_APP
  isActive    Boolean  @default(true)
  lastRunAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ==================== DAILY SUMMARY ====================
model DailySummary {
  id                String   @id @default(cuid())
  date              String   // YYYY-MM-DD
  managerId         String
  completedTasks    String?  // JSON array
  completedCount    Int      @default(0)
  progressUpdates   String?
  progressCount     Int      @default(0)
  blockedTasks      String?
  blockedCount      Int      @default(0)
  urgentTomorrow    String?
  urgentCount       Int      @default(0)
  managerActions    String?
  actionsCount      Int      @default(0)
  totalHoursLogged  Float    @default(0)
  billableHours     Float    @default(0)
  memberHours       String?
  narrativeSummary  String?
  generatedAt       DateTime @default(now())
  sentViaEmail      Boolean  @default(false)
  emailSentAt       DateTime?

  manager           Member   @relation(fields: [managerId], references: [id])

  @@unique([date, managerId])
}

// ==================== PINNED FOCUS ITEMS ====================
model PinnedFocusItem {
  id          String   @id @default(cuid())
  memberId    String
  taskId      String?
  focusType   String   // TASK, CLIENT_DEADLINE, BLOCKED_ESCALATION, CROSS_CHECK, CUSTOM
  title       String
  description String?
  priority    Int      @default(1)
  source      String   @default("MANUAL") // MANUAL, AUTO_GENERATED, NIGHTLY_SUMMARY
  remindAt    DateTime?
  reminded    Boolean  @default(false)
  completed   Boolean  @default(false)
  completedAt DateTime?
  createdAt   DateTime @default(now())
  expiresAt   DateTime?

  member      Member   @relation(fields: [memberId], references: [id])
}

// ==================== VIRTUAL OFFICE ====================
model Workspot {
  id          String   @id @default(cuid())
  memberId    String   @unique
  gridX       Int      @default(0)
  gridY       Int      @default(0)
  deskStyle   String   @default("modern") // modern, classic, minimal, creative
  wallItems   String?  // JSON
  deskItems   String?  // JSON
  nameplate   String?
  background  String   @default("default")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  member      Member   @relation(fields: [memberId], references: [id])
}

model OfficeZone {
  id          String   @id @default(cuid())
  name        String
  type        String   // MEETING_ROOM, LOUNGE, WORK_AREA, BREAK_ROOM, LOBBY
  gridX       Int
  gridY       Int
  width       Int      @default(3)
  height      Int      @default(3)
  style       String   @default("default")
  icon        String?
  color       String   @default("#E0E7FF")
  maxOccupants Int     @default(10)
  isBookable  Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model OfficeMessage {
  id          String   @id @default(cuid())
  fromId      String
  toId        String
  message     String
  type        String   @default("NOTE") // NOTE, WAVE, COFFEE_INVITE, QUICK_CHAT
  leftAtDesk  Boolean  @default(false)
  read        Boolean  @default(false)
  readAt      DateTime?
  createdAt   DateTime @default(now())
  expiresAt   DateTime?

  from        Member   @relation("SentMessages", fields: [fromId], references: [id])
  to          Member   @relation("ReceivedMessages", fields: [toId], references: [id])
}

model OfficeActivity {
  id          String   @id @default(cuid())
  memberId    String?
  type        String   // JOINED, LEFT, MOVED, STATUS_CHANGE, ZONE_ENTER, ZONE_EXIT
  details     String?
  zoneId      String?
  zoneName    String?
  createdAt   DateTime @default(now())
}
```

---

## Application Structure

### Layout (app/layout.tsx)
```
├── Sidebar (240px width, white background)
│   ├── Brand: "TeamOps" with gradient icon
│   ├── Main Nav: Home, Office, Tasks, Check-ins, Meetings, Time, Ranking, Team
│   ├── Secondary Nav: Alerts, Settings
│   └── Footer: System status indicator
├── Main Content (flex-1, zinc-50 background)
└── JARVIS Floating Component (fixed bottom-right)
```

### Navigation Items
```typescript
const navItems = [
  { href: '/', label: 'Inicio', icon: '◉' },
  { href: '/office', label: 'Oficina', icon: '◐' },
  { href: '/tasks', label: 'Tareas', icon: '◎' },
  { href: '/checkins', label: 'Check-ins', icon: '◈' },
  { href: '/meetings', label: 'Reuniones', icon: '◇' },
  { href: '/time', label: 'Tiempo', icon: '◌' },
  { href: '/leaderboard', label: 'Ranking', icon: '◆' },
  { href: '/team', label: 'Equipo', icon: '◍' },
]

const secondaryNav = [
  { href: '/notifications', label: 'Alertas', icon: '○' },
  { href: '/settings', label: 'Ajustes', icon: '◔' },
]
```

---

## Page Details

### 1. Dashboard (/) - Smart Display

The main dashboard is a dark, iPad/Alexa-style smart display with glassmorphism widgets.

#### Hero Widget (spans full width)
- Giant time display: 5rem, font-weight 200, white
- Full date in Spanish: "lunes, 6 de enero"
- Time-based greeting: "Buenos días" / "Buenas tardes" / "Buenas noches"
- Animated gradient orbs in background (float animation)

#### Widget Grid (3 columns)
Each widget has:
- Glass background: rgba(255,255,255,0.08)
- Backdrop blur: 20px
- Border: 1px solid rgba(255,255,255,0.1)
- Border-radius: 24px
- Top highlight line gradient

**Quick Actions Widget:**
- 2x2 grid of action buttons
- Icons: 🎤 Check-in, ✅ Tasks, 🏢 Office, ⏱️ Time
- Hover effects with colored backgrounds

**Stats Overview Widget:**
- SVG ring chart showing completed/total tasks
- Mini stats grid: Active, Overdue, Blocked, Billable hours
- Ring progress animation

**Team Presence Widget (clickable → /office):**
- Avatar stack with overlapping circles
- Presence dots (green/amber/red/purple)
- "X online" badge
- Team member names preview

**Alerts Widget:**
- Red/purple indicators for overdue/blocked
- Task title and owner
- Priority badge
- Or success state "Todo en orden" ✨

**Current Focus Widget:**
- List of in-progress tasks
- Avatar with gradient background
- Progress bar with percentage

**Leaderboard Widget (clickable → /leaderboard):**
- Top 3 with medal emojis (🥇🥈🥉)
- Name, billable hours, score
- Gradient backgrounds for ranks

**Hours This Month Widget:**
- Large hour number (3rem, weight 200)
- Progress bar for billable ratio
- Legend with dot indicators

**JARVIS Widget:**
- Rotating gradient glow animation
- Pulsing ring around icon
- "JARVIS Activo" status
- Hint text about voice commands

---

### 2. Virtual Office (/office)

Interactive office floor plan with real-time presence.

#### Header
- Title: "Oficina Virtual"
- Status indicators row (colored dots with counts)
- Current user controls (avatar, customize button)

#### Messages Notification
- Amber banner when unread messages exist
- Wave/message previews
- Mark as read button

#### Main Layout (12-column grid)
**Work Area (8 cols):**
- 4-column desk grid
- Each desk shows:
  - Avatar with color and initials
  - Name and role
  - Status message (italic, quoted)
  - Status indicator (colored dot + label)
  - Desk decoration emoji
  - Wave button on hover (👋)

**Side Zones (4 cols):**
- Meeting Rooms (bookable, colored backgrounds)
- Lounge/Break Room zones
- Occupant avatars and names
- Zone icons and capacity

#### Team Directory
- 6-column avatar grid
- Click to view member details
- Opacity reduction for offline members

#### Modals
**Status Modal:**
- Radio buttons for status: Disponible, Ausente, Ocupado, En reunión
- Status message input
- Save/Cancel buttons

**Avatar Modal:**
- Large preview with initials
- Color palette (12 colors)
- Ring highlight on selected

**Member Detail Modal:**
- Large avatar
- Name, role, status
- Status message
- Wave button

#### Real-time Features
- Poll every 5 seconds for presence updates
- Join office on page load
- Message polling every 10 seconds

---

### 3. Tasks (/tasks)

Task management with advanced prioritization.

#### Features
- Filter by status, priority, owner
- Search by title
- Create task modal
- Inline progress update
- Blocker notes display

#### Task Card Display
- Priority badge (P0 red, P1 amber, P2 indigo, P3 gray)
- Status badge with color coding
- Progress bar
- Owner avatar
- Due date with overdue highlighting
- 4-factor indicators if enabled

#### 4-Factor Prioritization Display
- Urgency: 1-5 scale
- Importance: 1-5 scale
- Deadline type indicator (internal vs client)
- Duration estimate (XS/S/M/L/XL)

---

### 4. Check-ins (/checkins)

Voice/video check-in interface.

#### Recording Interface
- Large microphone button
- Waveform visualization
- Recording timer
- Stop/Submit buttons

#### Check-in Card
- Media player (audio/video)
- Transcription text
- AI-extracted data:
  - Progress percentage
  - Blockers detected
  - Next steps identified
  - Sentiment (positive/neutral/negative)
- Task association

---

### 5. Meetings (/meetings)

Meeting management and standup responses.

#### Meeting Types
- DAILY_STANDUP: Daily sync
- WEEKLY_PLANNING: Planning session
- MONTHLY_REVIEW: Performance review

#### Meeting Card
- Type badge with icon
- Title and status
- Start/end times
- Participant count
- Response submissions

#### Response Form
- What I'm doing now (textarea)
- Top priority task (select)
- Progress update (slider)
- Blockers (textarea)
- Next actions (textarea)
- Confidence (1-5 stars)

---

### 6. Time Tracking (/time)

Time entry management.

#### Time Entry Form
- Member select
- Task select (optional)
- Date picker
- Duration (hours/minutes)
- Category select:
  - CLIENT_WORK
  - INTERNAL
  - SALES
  - R_AND_D
  - ADMIN
- Billable toggle
- Notes textarea

#### Time Log Table
- Date, member, task, duration
- Category badge
- Billable indicator
- Hourly rate (if billable)
- Edit/Delete actions

#### Summary Stats
- Total hours today/week/month
- Billable vs non-billable breakdown
- By category chart

---

### 7. Leaderboard (/leaderboard)

Performance ranking display.

#### Podium (Top 3)
- Large cards with rank styling:
  - 1st: Gold gradient, 🥇
  - 2nd: Silver gradient, 🥈
  - 3rd: Bronze gradient, 🥉
- Large avatar
- Name and role
- Performance score
- Billable hours
- Bonus amount

#### Full Rankings Table
- Rank number
- Member info
- Score breakdown:
  - Delivery score
  - Progress score
  - Improvement score
- Total score
- Billable hours
- Bonus

---

### 8. Team (/team)

Team member management.

#### Member Cards
- Avatar with color
- Name and email
- Role
- Timezone
- Hourly rate
- Active/Inactive toggle
- Edit button

#### Add/Edit Member Modal
- Name, email, phone
- Role selection
- Timezone select
- Hourly rate input
- Skills tags input
- Seniority level (1-5)
- Manager checkbox

---

### 9. Notifications (/notifications)

Notification history and management.

#### Notification Card
- Type icon:
  - OVERDUE_ALERT: ⚠️
  - MEETING_REMINDER: 📅
  - ACHIEVEMENT: 🎉
  - PROGRESS_UPDATE: 📊
- Channel badge (SMS/EMAIL/IN_APP)
- Subject and message
- Timestamp
- Status (Sent/Pending/Failed)

---

### 10. Settings (/settings)

System configuration.

#### Settings Categories
- General
- Bonus (rates, calculations)
- Scoring (weights)
- Alerts (thresholds)

#### Setting Row
- Key name
- Description
- Value input
- Save button

---

## JARVIS AI Assistant

### Floating Button (Closed State)
```jsx
<button className="fixed bottom-8 right-8">
  <div className="relative">
    {/* Glow effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse" />

    {/* Main button */}
    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center">
      <SunIcon /> {/* Custom JARVIS icon */}
    </div>

    {/* Pulse ring */}
    <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />

    {/* Online indicator */}
    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full" />
  </div>
</button>
```

### Chat Panel (Open State)
- Width: 440px (or full-screen when expanded)
- Max height: 85vh
- Background: #0a0a1a
- Border-radius: 24px
- Gradient header with avatar

#### Header
- JARVIS avatar (gradient background)
- Name "JARVIS"
- Status text (Ejecutando/Escuchando/Agente TeamOps)
- Expand/Collapse button
- Close button

#### Quick Actions Bar
```typescript
const quickActions = [
  { icon: '📊', label: 'Resumen', command: 'Dame un resumen del sistema' },
  { icon: '📋', label: 'Tareas', command: 'Mostrar todas las tareas' },
  { icon: '👥', label: 'Equipo', command: 'Mostrar miembros del equipo' },
  { icon: '⚠️', label: 'Alertas', command: 'Mostrar tareas vencidas' }
]
```

#### Messages Area
**User Message:**
- Gradient background (indigo → purple)
- White text
- Right-aligned
- Rounded corners (br small)

**Assistant Message:**
- Action stream (animated slide-in)
- Glass background
- Markdown support (**bold**)

#### Action Stream Display
```typescript
const ACTION_STYLES = {
  thinking: { icon: '🧠', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  reading: { icon: '📖', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  searching: { icon: '🔍', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  creating: { icon: '✨', color: 'text-green-400', bg: 'bg-green-500/20' },
  updating: { icon: '📝', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  deleting: { icon: '🗑️', color: 'text-red-400', bg: 'bg-red-500/20' },
  analyzing: { icon: '📊', color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  success: { icon: '✅', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  error: { icon: '❌', color: 'text-red-400', bg: 'bg-red-500/20' }
}
```

#### Voice Listening State
- Large pulsing microphone
- Concentric animated rings
- Transcript display
- Red/pink gradient

#### Input Area
- Voice button (toggles listening)
- Text input field
- Send button (gradient)
- Hint text

### Voice Features
```typescript
// Speech Recognition (Web Speech API)
const recognition = new SpeechRecognition()
recognition.continuous = true
recognition.interimResults = true
recognition.lang = 'es-ES'

// Speech Synthesis
const utterance = new SpeechSynthesisUtterance(text)
utterance.lang = 'es-ES'
utterance.rate = 1.1
```

---

## JARVIS API Endpoint (/api/jarvis/agent)

### Request
```typescript
POST /api/jarvis/agent
{
  "command": string  // Natural language command in Spanish or English
}
```

### Response
```typescript
interface AgentResponse {
  success: boolean
  message: string      // Human-readable response
  actions: AgentAction[]  // Action stream for UI
  result?: unknown     // Raw data if applicable
  suggestions?: string[]  // Follow-up command suggestions
}

interface AgentAction {
  id: string
  type: 'thinking' | 'reading' | 'creating' | 'updating' | 'deleting' | 'searching' | 'analyzing' | 'executing' | 'success' | 'error' | 'warning' | 'info'
  entity?: string
  description: string
  data?: unknown
  timestamp: number
}
```

### Supported Commands (40+)

#### Task Commands
| Command | Action |
|---------|--------|
| "Mostrar tareas" / "Show tasks" | List all tasks |
| "Mis tareas" / "My tasks" | Tasks for current user |
| "Tareas de [name]" | Tasks for specific member |
| "Tareas vencidas" / "Overdue tasks" | Overdue tasks |
| "Tareas bloqueadas" / "Blocked tasks" | Blocked tasks |
| "Tareas P0" / "Critical tasks" | Tasks by priority |
| "Crear tarea [title]" | Create new task |
| "Crear tarea [title] para [name]" | Create and assign |
| "Actualizar [task] al [N]%" | Update progress |
| "Completar [task]" | Mark as done |
| "Eliminar tarea [task]" | Delete task |
| "Bloquear [task]" | Mark as blocked |
| "Desbloquear [task]" | Remove blocker |

#### Member Commands
| Command | Action |
|---------|--------|
| "Mostrar equipo" / "Show team" | List all members |
| "Agregar miembro [name] como [role]" | Add member |
| "Información de [name]" | Member details |
| "Desactivar [name]" | Deactivate member |

#### Time Commands
| Command | Action |
|---------|--------|
| "Registrar [N] horas para [name]" | Log time |
| "Horas de hoy" | Today's hours |
| "Horas del mes" | Monthly hours |
| "Horas de [name]" | Member's hours |

#### Virtual Office Commands
| Command | Action |
|---------|--------|
| "¿Quién está en línea?" | Online members |
| "Estado de la oficina" | Office status |
| "Cambiar mi estado a [status]" | Update status |
| "Ir a [zone]" | Move to zone |
| "Enviar mensaje a [name]" | Send message |
| "Saludar a [name]" | Wave at member |

#### Meeting Commands
| Command | Action |
|---------|--------|
| "Iniciar standup" | Start daily standup |
| "Terminar reunión" | End current meeting |
| "Programar reunión" | Schedule meeting |
| "Reuniones de hoy" | Today's meetings |

#### Analysis Commands
| Command | Action |
|---------|--------|
| "Resumen del sistema" | System overview |
| "Analizar rendimiento" | Team performance |
| "Estado del proyecto" | Project status |
| "Diagnóstico de salud" | Health check |

#### Bulk Operations
| Command | Action |
|---------|--------|
| "Actualizar tareas vencidas" | Batch update |
| "Notificar al equipo" | Send notifications |

### Natural Language Parsing

The API parses commands using pattern matching:
1. Detect intent keywords (crear, mostrar, actualizar, eliminar, etc.)
2. Identify entity type (tarea, miembro, tiempo, etc.)
3. Extract parameters (names, numbers, dates)
4. Execute appropriate database operation
5. Return formatted response with action stream

```typescript
// Example parsing logic
function parseCommand(command: string): ParsedCommand {
  const lower = command.toLowerCase()

  // Check for task creation
  if (matches(lower, ['crear', 'nueva', 'add'], ['tarea', 'task'])) {
    const title = extractQuoted(command) || extractAfter(command, 'tarea')
    const priority = extractPriority(lower)
    const owner = extractName(command, ['para', 'for'])

    return {
      intent: 'create',
      entity: 'task',
      params: { title, priority, ownerName: owner }
    }
  }

  // ... more patterns
}

// Helper to match keywords with context
function matches(text: string, keywords: string[], context?: string[]): boolean {
  const hasKeyword = keywords.some(k => text.includes(k))
  const hasContext = !context || context.some(c => text.includes(c))
  return hasKeyword && hasContext
}
```

---

## CSS Animations

```css
/* Floating orbs in hero */
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(10px, -10px) scale(1.05); }
  66% { transform: translate(-5px, 5px) scale(0.95); }
}

/* Action items sliding in */
@keyframes slide-in {
  0% { opacity: 0; transform: translateX(-10px); }
  100% { opacity: 1; transform: translateX(0); }
}

/* Skeleton loading */
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* JARVIS button glow */
@keyframes jarvis-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3), 0 0 40px rgba(139,92,246,0.2); }
  50% { box-shadow: 0 0 30px rgba(99,102,241,0.5), 0 0 60px rgba(139,92,246,0.3); }
}

/* Rotating gradient */
@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Soft pulse */
@keyframes pulseSoft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up (modals) */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Voice wave bars */
@keyframes voice-wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}
```

---

## Seed Data

### Team Members (5)
```typescript
const members = [
  {
    name: 'Sarah Chen',
    email: 'sarah@company.com',
    role: 'Project Lead',
    hourlyRate: 150,
    avatarColor: '#6366F1',
    officeStatus: 'ONLINE',
    statusMessage: 'Trabajando en presentación Q4',
    skillTags: 'Ops,Design,Sales',
    seniorityLevel: 4,
    isManager: true
  },
  {
    name: 'Marcus Johnson',
    email: 'marcus@company.com',
    role: 'Senior Analyst',
    hourlyRate: 125,
    avatarColor: '#8B5CF6',
    officeStatus: 'ONLINE',
    statusMessage: 'Análisis de datos',
    skillTags: 'AI,Finance,Web',
    seniorityLevel: 3
  },
  {
    name: 'Elena Rodriguez',
    email: 'elena@company.com',
    role: 'Consultant',
    hourlyRate: 100,
    avatarColor: '#EC4899',
    officeStatus: 'AWAY',
    statusMessage: 'Almuerzo - vuelvo en 30 min',
    skillTags: 'Sales,Ops,Legal',
    seniorityLevel: 3
  },
  {
    name: "James O'Brien",
    email: 'james@company.com',
    role: 'Associate',
    hourlyRate: 85,
    avatarColor: '#22C55E',
    officeStatus: 'ONLINE',
    skillTags: 'Web,Design',
    seniorityLevel: 2
  },
  {
    name: 'Priya Sharma',
    email: 'priya@company.com',
    role: 'Analyst',
    hourlyRate: 75,
    avatarColor: '#F97316',
    officeStatus: 'BUSY',
    statusMessage: 'En reunión con cliente',
    currentZone: 'Sala de Reuniones A',
    skillTags: 'Finance,AI',
    seniorityLevel: 2
  }
]
```

### Tasks (12)
Mix of statuses and priorities:
- 2x P0 (IN_PROGRESS, urgent)
- 3x P1 (IN_PROGRESS, BLOCKED)
- 4x P2 (NOT_STARTED, IN_PROGRESS, DONE)
- 3x P3 (NOT_STARTED, DONE)

Include 4-factor prioritization:
- urgencyLevel: 1-5
- importanceLevel: 1-5
- estimatedDuration: XS/S/M/L/XL
- Client deadlines for some

### Time Entries (30+)
- 7 days of history
- 1-3 entries per day per member
- Random categories
- CLIENT_WORK entries are billable

### Office Zones (6)
```typescript
const zones = [
  { name: 'Área de Trabajo', type: 'WORK_AREA', icon: '💻', color: '#F0F9FF' },
  { name: 'Sala de Reuniones A', type: 'MEETING_ROOM', icon: '🎯', color: '#FEF3C7', isBookable: true },
  { name: 'Sala de Reuniones B', type: 'MEETING_ROOM', icon: '📊', color: '#DBEAFE', isBookable: true },
  { name: 'Lounge', type: 'LOUNGE', icon: '☕', color: '#FCE7F3' },
  { name: 'Área de Café', type: 'BREAK_ROOM', icon: '🍵', color: '#D1FAE5' },
  { name: 'Lobby', type: 'LOBBY', icon: '🚪', color: '#E0E7FF' }
]
```

### Settings (6)
```typescript
const settings = [
  { key: 'bonus_rate_per_hour', value: '25', category: 'bonus' },
  { key: 'delivery_score_weight', value: '40', category: 'scoring' },
  { key: 'progress_score_weight', value: '40', category: 'scoring' },
  { key: 'improvement_score_weight', value: '20', category: 'scoring' },
  { key: 'checkin_alert_hours', value: '24', category: 'alerts' },
  { key: 'due_soon_days', value: '2', category: 'alerts' }
]
```

---

## API Endpoints Summary

| Endpoint | Methods | Description |
|----------|---------|-------------|
| /api/dashboard | GET | Dashboard stats and widgets data |
| /api/members | GET, POST, PUT, DELETE | Team member CRUD |
| /api/tasks | GET, POST, PUT, DELETE | Task CRUD |
| /api/time | GET, POST, PUT, DELETE | Time entry CRUD |
| /api/meetings | GET, POST, PUT | Meeting management |
| /api/reports | GET | Monthly reports |
| /api/notifications | GET, POST | Notification history |
| /api/settings | GET, PUT | System settings |
| /api/office | GET, POST, PUT, PATCH | Virtual office operations |
| /api/jarvis/agent | POST | JARVIS AI command processing |

---

## Important Implementation Notes

1. **SQLite Limitations**: Don't use `mode: 'insensitive'` for searches. Fetch records and filter in JavaScript:
```typescript
async function findMemberByName(name: string) {
  const members = await prisma.member.findMany({ where: { isActive: true } })
  return members.find(m => m.name.toLowerCase().includes(name.toLowerCase()))
}
```

2. **Spanish UI**: All user-facing text should be in Spanish (labels, messages, greetings).

3. **Real-time Presence**: Poll every 5 seconds for office presence updates.

4. **Voice Support**: Use Web Speech API with `lang: 'es-ES'` for Spanish voice recognition and synthesis.

5. **Action Streaming**: JARVIS responses should stream actions with animated delays (300-500ms between each).

6. **Responsive Design**: Dashboard grid adjusts from 3 → 2 → 1 columns on smaller screens.

---

This prompt provides complete specifications to rebuild TeamOps on Lovable.ai with all features, styling, and functionality intact.
