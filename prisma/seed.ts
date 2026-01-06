import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data (order matters for foreign keys)
  await prisma.officeActivity.deleteMany()
  await prisma.officeMessage.deleteMany()
  await prisma.workspot.deleteMany()
  await prisma.officeZone.deleteMany()
  await prisma.pinnedFocusItem.deleteMany()
  await prisma.dailySummary.deleteMany()
  await prisma.checkinAttachment.deleteMany()
  await prisma.aICheckin.deleteMany()
  await prisma.jarvisConversation.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.monthlyReport.deleteMany()
  await prisma.timeEntry.deleteMany()
  await prisma.meetingResponse.deleteMany()
  await prisma.meeting.deleteMany()
  await prisma.task.deleteMany()
  await prisma.member.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.autoAlert.deleteMany()

  // Create settings
  const settings = [
    { key: 'bonus_rate_per_hour', value: '25', description: 'Base bonus rate per billable hour ($)', category: 'bonus' },
    { key: 'delivery_score_weight', value: '40', description: 'Max points for on-time delivery', category: 'scoring' },
    { key: 'progress_score_weight', value: '40', description: 'Max points for progress', category: 'scoring' },
    { key: 'improvement_score_weight', value: '20', description: 'Max points for improvement', category: 'scoring' },
    { key: 'checkin_alert_hours', value: '24', description: 'Hours before check-in alert', category: 'alerts' },
    { key: 'due_soon_days', value: '2', description: 'Days for due soon warning', category: 'alerts' },
  ]

  for (const s of settings) {
    await prisma.setting.create({ data: s })
  }
  console.log('✓ Settings created')

  // Create 5 team members with virtual office data
  const avatarColors = ['#6366F1', '#8B5CF6', '#EC4899', '#22C55E', '#F97316']
  const officeStatuses = ['ONLINE', 'ONLINE', 'AWAY', 'ONLINE', 'BUSY']

  const members = await Promise.all([
    prisma.member.create({
      data: {
        name: 'Sarah Chen', email: 'sarah@company.com', phone: '+1555000001',
        role: 'Project Lead', timezone: 'EST', hourlyRate: 150,
        checkinFrequency: 'DAILY',
        // Skills & Assignment
        skillTags: 'Ops,Design,Sales',
        seniorityLevel: 4,
        isManager: true,
        // Virtual Office
        avatarColor: avatarColors[0],
        officeStatus: officeStatuses[0],
        statusMessage: 'Trabajando en presentación Q4',
        lastSeenAt: new Date(),
        positionX: 0, positionY: 0
      }
    }),
    prisma.member.create({
      data: {
        name: 'Marcus Johnson', email: 'marcus@company.com', phone: '+1555000002',
        role: 'Senior Analyst', timezone: 'EST', hourlyRate: 125,
        checkinFrequency: 'HOURLY',
        skillTags: 'AI,Finance,Web',
        seniorityLevel: 3,
        avatarColor: avatarColors[1],
        officeStatus: officeStatuses[1],
        statusMessage: 'Análisis de datos',
        lastSeenAt: new Date(),
        positionX: 2, positionY: 0
      }
    }),
    prisma.member.create({
      data: {
        name: 'Elena Rodriguez', email: 'elena@company.com', phone: '+1555000003',
        role: 'Consultant', timezone: 'CST', hourlyRate: 100,
        checkinFrequency: 'DAILY',
        skillTags: 'Sales,Ops,Legal',
        seniorityLevel: 3,
        avatarColor: avatarColors[2],
        officeStatus: officeStatuses[2],
        statusMessage: 'Almuerzo - vuelvo en 30 min',
        lastSeenAt: new Date(Date.now() - 15 * 60 * 1000),
        positionX: 0, positionY: 2
      }
    }),
    prisma.member.create({
      data: {
        name: "James O'Brien", email: 'james@company.com', phone: '+1555000004',
        role: 'Associate', timezone: 'PST', hourlyRate: 85,
        checkinFrequency: 'HOURLY',
        skillTags: 'Web,Design',
        seniorityLevel: 2,
        avatarColor: avatarColors[3],
        officeStatus: officeStatuses[3],
        lastSeenAt: new Date(),
        positionX: 2, positionY: 2
      }
    }),
    prisma.member.create({
      data: {
        name: 'Priya Sharma', email: 'priya@company.com', phone: '+1555000005',
        role: 'Analyst', timezone: 'EST', hourlyRate: 75,
        checkinFrequency: 'DAILY',
        skillTags: 'Finance,AI',
        seniorityLevel: 2,
        avatarColor: avatarColors[4],
        officeStatus: officeStatuses[4],
        statusMessage: 'En reunión con cliente',
        lastSeenAt: new Date(),
        currentZone: 'Sala de Reuniones A',
        positionX: 9, positionY: 1
      }
    }),
  ])
  console.log('✓ 5 team members created')

  // Create workspots for each member
  for (let i = 0; i < members.length; i++) {
    await prisma.workspot.create({
      data: {
        memberId: members[i].id,
        gridX: (i % 4) * 2,
        gridY: Math.floor(i / 4) * 2,
        deskStyle: ['modern', 'creative', 'minimal', 'classic', 'modern'][i],
        nameplate: members[i].name.split(' ')[0]
      }
    })
  }
  console.log('✓ Workspots created')

  // Create office zones
  const zones = [
    { name: 'Área de Trabajo', type: 'WORK_AREA', gridX: 0, gridY: 0, width: 8, height: 6, icon: '💻', color: '#F0F9FF' },
    { name: 'Sala de Reuniones A', type: 'MEETING_ROOM', gridX: 9, gridY: 0, width: 4, height: 3, icon: '🎯', color: '#FEF3C7', isBookable: true },
    { name: 'Sala de Reuniones B', type: 'MEETING_ROOM', gridX: 9, gridY: 4, width: 4, height: 3, icon: '📊', color: '#DBEAFE', isBookable: true },
    { name: 'Lounge', type: 'LOUNGE', gridX: 0, gridY: 7, width: 5, height: 3, icon: '☕', color: '#FCE7F3' },
    { name: 'Área de Café', type: 'BREAK_ROOM', gridX: 6, gridY: 7, width: 3, height: 3, icon: '🍵', color: '#D1FAE5' },
    { name: 'Lobby', type: 'LOBBY', gridX: 10, gridY: 8, width: 3, height: 2, icon: '🚪', color: '#E0E7FF' }
  ]
  await prisma.officeZone.createMany({ data: zones })
  console.log('✓ Office zones created')

  const now = new Date()
  const day = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

  // Create 12 tasks with 4-factor prioritization
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Client Presentation Deck', description: 'Finalize Q4 strategy presentation',
        ownerId: members[0].id, priority: 'P0', status: 'IN_PROGRESS',
        progressPercent: 75, dueDate: day(1), currentFocus: true, lastCheckinAt: now,
        // 4-Factor Grid
        urgencyLevel: 5, importanceLevel: 5,
        internalDeadline: day(1), externalClientDeadline: day(1),
        estimatedDuration: 'L', durabilityCategory: 'SHORT',
        complexityLevel: 4, skillTags: 'Design,Sales',
        flaggedImmediate: true, requiresMultiHand: true
      }
    }),
    prisma.task.create({
      data: {
        title: 'Revenue Model Analysis', description: 'Complete revenue forecasting model',
        ownerId: members[1].id, priority: 'P1', status: 'IN_PROGRESS',
        progressPercent: 60, dueDate: day(-1), blockerNotes: 'Waiting for Q3 data from finance',
        currentFocus: true, lastCheckinAt: day(-1),
        urgencyLevel: 4, importanceLevel: 5,
        internalDeadline: day(-1),
        estimatedDuration: 'L', durabilityCategory: 'MEDIUM',
        complexityLevel: 5, skillTags: 'Finance,AI',
        flaggedImmediate: true
      }
    }),
    prisma.task.create({
      data: {
        title: 'Stakeholder Interviews', description: 'Conduct 5 stakeholder interviews',
        ownerId: members[2].id, priority: 'P1', status: 'IN_PROGRESS',
        progressPercent: 40, dueDate: day(3), lastCheckinAt: now,
        urgencyLevel: 3, importanceLevel: 4,
        internalDeadline: day(3),
        estimatedDuration: 'XL', durabilityCategory: 'MEDIUM',
        complexityLevel: 3, skillTags: 'Sales,Ops'
      }
    }),
    prisma.task.create({
      data: {
        title: 'Competitive Analysis', description: 'Research competitor positioning',
        ownerId: members[3].id, priority: 'P2', status: 'NOT_STARTED',
        progressPercent: 0, dueDate: day(5),
        urgencyLevel: 2, importanceLevel: 3,
        internalDeadline: day(5),
        estimatedDuration: 'M', durabilityCategory: 'SHORT',
        complexityLevel: 2, skillTags: 'Web'
      }
    }),
    prisma.task.create({
      data: {
        title: 'Financial Model Updates', description: 'Update DCF with new assumptions',
        ownerId: members[4].id, priority: 'P0', status: 'IN_PROGRESS',
        progressPercent: 85, dueDate: day(0), currentFocus: true, lastCheckinAt: now,
        urgencyLevel: 5, importanceLevel: 5,
        internalDeadline: day(0), externalClientDeadline: day(1),
        estimatedDuration: 'M', durabilityCategory: 'SHORT',
        complexityLevel: 4, skillTags: 'Finance',
        flaggedImmediate: true
      }
    }),
    prisma.task.create({
      data: {
        title: 'Team Training Session', description: 'Prepare training on methodology',
        ownerId: members[0].id, priority: 'P2', status: 'DONE',
        progressPercent: 100, dueDate: day(-3), completedAt: day(-3),
        urgencyLevel: 2, importanceLevel: 3,
        estimatedDuration: 'S', durabilityCategory: 'SHORT',
        complexityLevel: 2, skillTags: 'Ops'
      }
    }),
    prisma.task.create({
      data: {
        title: 'Client Workshop Prep', description: 'Prepare workshop materials',
        ownerId: members[1].id, priority: 'P1', status: 'BLOCKED',
        progressPercent: 30, dueDate: day(2), blockerNotes: 'Need client attendee list',
        urgencyLevel: 4, importanceLevel: 4,
        internalDeadline: day(2), externalClientDeadline: day(3),
        estimatedDuration: 'M', durabilityCategory: 'SHORT',
        complexityLevel: 3, skillTags: 'Sales,Design'
      }
    }),
    prisma.task.create({
      data: {
        title: 'Knowledge Base Update', description: 'Document lessons learned',
        ownerId: members[2].id, priority: 'P3', status: 'NOT_STARTED',
        progressPercent: 0, dueDate: day(10),
        urgencyLevel: 1, importanceLevel: 2,
        internalDeadline: day(10),
        estimatedDuration: 'S', durabilityCategory: 'LONG',
        complexityLevel: 1, skillTags: 'Ops'
      }
    }),
    prisma.task.create({
      data: {
        title: 'Process Mapping', description: 'Map current state processes',
        ownerId: members[3].id, priority: 'P1', status: 'IN_PROGRESS',
        progressPercent: 55, dueDate: day(1), currentFocus: true, lastCheckinAt: now,
        urgencyLevel: 4, importanceLevel: 4,
        internalDeadline: day(1),
        estimatedDuration: 'L', durabilityCategory: 'MEDIUM',
        complexityLevel: 4, skillTags: 'Ops,Design',
        requiresMultiHand: true
      }
    }),
    prisma.task.create({
      data: {
        title: 'Benchmark Research', description: 'Compile industry benchmarks',
        ownerId: members[4].id, priority: 'P2', status: 'DONE',
        progressPercent: 100, dueDate: day(-2), completedAt: day(-2),
        urgencyLevel: 2, importanceLevel: 3,
        estimatedDuration: 'M', durabilityCategory: 'SHORT',
        complexityLevel: 2, skillTags: 'Finance'
      }
    }),
    prisma.task.create({
      data: {
        title: 'Executive Summary Draft', description: 'Draft executive summary for board',
        ownerId: members[0].id, priority: 'P1', status: 'IN_PROGRESS',
        progressPercent: 25, dueDate: day(4),
        urgencyLevel: 3, importanceLevel: 5,
        internalDeadline: day(4),
        estimatedDuration: 'M', durabilityCategory: 'MEDIUM',
        complexityLevel: 4, skillTags: 'Sales,Design'
      }
    }),
    prisma.task.create({
      data: {
        title: 'Data Validation', description: 'Validate all data sources',
        ownerId: members[1].id, priority: 'P2', status: 'IN_PROGRESS',
        progressPercent: 45, dueDate: day(6),
        urgencyLevel: 2, importanceLevel: 3,
        internalDeadline: day(6),
        estimatedDuration: 'L', durabilityCategory: 'MEDIUM',
        complexityLevel: 3, skillTags: 'AI,Finance'
      }
    }),
  ])
  console.log('✓ 12 tasks created with 4-factor prioritization')

  // Create 30+ time entries
  const timeEntries = []
  const categories = ['CLIENT_WORK', 'INTERNAL', 'SALES', 'R_AND_D', 'ADMIN']

  for (let i = 0; i < 7; i++) { // Last 7 days
    for (const member of members) {
      // 1-3 entries per day per member
      const numEntries = Math.floor(Math.random() * 3) + 1
      for (let j = 0; j < numEntries; j++) {
        const category = categories[Math.floor(Math.random() * categories.length)]
        const billable = category === 'CLIENT_WORK' || (category === 'R_AND_D' && Math.random() > 0.5)
        const duration = (Math.floor(Math.random() * 4) + 1) * 60 // 1-4 hours

        timeEntries.push({
          memberId: member.id,
          taskId: tasks[Math.floor(Math.random() * tasks.length)].id,
          date: day(-i),
          durationMinutes: duration,
          category,
          billable,
          hourlyRate: billable ? member.hourlyRate : null,
          notes: `Work entry ${j + 1} for day -${i}`
        })
      }
    }
  }

  await prisma.timeEntry.createMany({ data: timeEntries })
  console.log(`✓ ${timeEntries.length} time entries created`)

  // Create meetings
  const dailyMeeting = await prisma.meeting.create({
    data: {
      type: 'DAILY_STANDUP',
      title: 'Daily Standup - Today',
      createdById: members[0].id,
      status: 'IN_PROGRESS'
    }
  })

  const weeklyMeeting = await prisma.meeting.create({
    data: {
      type: 'WEEKLY_PLANNING',
      title: 'Weekly Planning',
      startTime: day(-3),
      createdById: members[0].id,
      status: 'COMPLETED'
    }
  })

  const monthlyMeeting = await prisma.meeting.create({
    data: {
      type: 'MONTHLY_REVIEW',
      title: 'Monthly Review',
      startTime: day(-15),
      createdById: members[0].id,
      status: 'COMPLETED'
    }
  })
  console.log('✓ 3 meetings created')

  // Add meeting responses
  const responses = [
    { meetingId: dailyMeeting.id, memberId: members[0].id, whatImDoingNow: 'Finalizing presentation', topPriorityTaskId: tasks[0].id, progressPercentUpdate: 75, blockers: '', nextActions: 'Review with client', confidence: 4 },
    { meetingId: dailyMeeting.id, memberId: members[1].id, whatImDoingNow: 'Revenue model', topPriorityTaskId: tasks[1].id, progressPercentUpdate: 60, blockers: 'Missing Q3 data', nextActions: 'Follow up with finance', confidence: 3 },
    { meetingId: dailyMeeting.id, memberId: members[2].id, whatImDoingNow: 'Scheduling interviews', topPriorityTaskId: tasks[2].id, progressPercentUpdate: 40, blockers: '', nextActions: '2 more interviews', confidence: 4 },
    { meetingId: dailyMeeting.id, memberId: members[3].id, whatImDoingNow: 'Process mapping', topPriorityTaskId: tasks[8].id, progressPercentUpdate: 55, blockers: '', nextActions: 'Complete diagrams', confidence: 4 },
    { meetingId: dailyMeeting.id, memberId: members[4].id, whatImDoingNow: 'Financial model', topPriorityTaskId: tasks[4].id, progressPercentUpdate: 85, blockers: '', nextActions: 'Final validation', confidence: 5 },
  ]

  await prisma.meetingResponse.createMany({ data: responses })
  console.log('✓ Meeting responses created')

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      { memberId: members[1].id, type: 'OVERDUE_ALERT', channel: 'SMS', subject: 'Task Overdue', message: '⚠️ Your task "Revenue Model Analysis" is overdue!', status: 'SENT', sentAt: now },
      { memberId: members[0].id, type: 'MEETING_REMINDER', channel: 'SMS', subject: 'Meeting', message: '📅 Daily Standup starting in 5 minutes', status: 'SENT', sentAt: now },
      { memberId: members[4].id, type: 'ACHIEVEMENT', channel: 'SMS', subject: 'Achievement', message: '🎉 Great job completing "Benchmark Research"!', status: 'SENT', sentAt: day(-2) },
    ]
  })
  console.log('✓ Sample notifications created')

  console.log('\n✅ Database seeded successfully!')
  console.log(`
Summary:
- 5 team members
- 12 tasks (with varied statuses and priorities)
- ${timeEntries.length} time entries
- 3 meetings with responses
- Sample notifications
  `)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
