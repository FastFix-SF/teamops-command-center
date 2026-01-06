// SMS Notification Service using Twilio
// Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env

import { prisma } from './db'

const TWILIO_ENABLED = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN

let twilioClient: any = null

if (TWILIO_ENABLED) {
  const twilio = require('twilio')
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

export type NotificationType =
  | 'OVERDUE_ALERT'
  | 'MEETING_REMINDER'
  | 'PROGRESS_UPDATE'
  | 'ACHIEVEMENT'
  | 'LEADERBOARD'
  | 'BLOCKER_ALERT'
  | 'DAILY_SUMMARY'
  | 'WEEKLY_REPORT'

interface SendSMSOptions {
  memberId: string
  type: NotificationType
  message: string
  sentById?: string
}

export async function sendSMS({ memberId, type, message, sentById }: SendSMSOptions): Promise<boolean> {
  // Get member phone
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { phone: true, name: true, notifyOnOverdue: true, notifyOnMeeting: true }
  })

  if (!member?.phone) {
    console.log(`No phone number for member ${memberId}`)
    return false
  }

  // Check notification preferences
  if (type === 'OVERDUE_ALERT' && !member.notifyOnOverdue) return false
  if (type === 'MEETING_REMINDER' && !member.notifyOnMeeting) return false

  // Log notification
  const notification = await prisma.notification.create({
    data: {
      memberId,
      type,
      channel: 'SMS',
      subject: type.replace(/_/g, ' '),
      message,
      status: 'PENDING',
      sentById
    }
  })

  // Send via Twilio if enabled
  if (TWILIO_ENABLED && twilioClient) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: member.phone
      })

      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: new Date() }
      })

      console.log(`SMS sent to ${member.name}: ${message}`)
      return true
    } catch (error) {
      console.error('Twilio error:', error)
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' }
      })
      return false
    }
  } else {
    // Demo mode - just log
    console.log(`[DEMO SMS to ${member.name}]: ${message}`)
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() }
    })
    return true
  }
}

// Notification Templates
export const NotificationTemplates = {
  overdueTask: (memberName: string, taskTitle: string, daysPast: number) =>
    `⚠️ ${memberName}, your task "${taskTitle}" is ${daysPast} day(s) overdue! Please update progress ASAP.`,

  meetingReminder: (meetingType: string, time: string) =>
    `📅 Reminder: ${meetingType} starting at ${time}. Be ready to share your update!`,

  progressCelebration: (memberName: string, taskTitle: string) =>
    `🎉 Great job ${memberName}! You completed "${taskTitle}". Keep crushing it!`,

  leaderboardUpdate: (memberName: string, rank: number, score: number) =>
    `🏆 ${memberName}, you're #${rank} on the leaderboard with ${score} points! ${rank === 1 ? "You're leading the pack!" : "Keep pushing!"}`,

  blockerAlert: (memberName: string, taskTitle: string, blocker: string) =>
    `🚧 ${memberName} is blocked on "${taskTitle}": ${blocker}. Can anyone help?`,

  dailySummary: (memberName: string, tasksCompleted: number, hoursLogged: number) =>
    `📊 Daily Summary for ${memberName}: ${tasksCompleted} tasks done, ${hoursLogged}h logged. Great work today!`,

  weeklyReport: (memberName: string, rank: number, bonus: number) =>
    `📈 Weekly Report: ${memberName}, you're ranked #${rank}. Projected bonus: $${bonus.toFixed(0)}. Keep it up!`,

  noCheckin: (memberName: string, hours: number) =>
    `⏰ ${memberName}, you haven't checked in for ${hours}+ hours. Quick update please!`
}

// Bulk notification functions
export async function notifyTeamOverdueTasks() {
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { not: 'DONE' },
      dueDate: { lt: new Date() }
    },
    include: { owner: true }
  })

  for (const task of overdueTasks) {
    const daysPast = Math.ceil((Date.now() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24))
    await sendSMS({
      memberId: task.ownerId,
      type: 'OVERDUE_ALERT',
      message: NotificationTemplates.overdueTask(task.owner.name, task.title, daysPast)
    })
  }

  return overdueTasks.length
}

export async function notifyMeetingParticipants(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId }
  })

  if (!meeting) return 0

  const members = await prisma.member.findMany({
    where: { isActive: true, notifyOnMeeting: true }
  })

  const time = meeting.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  for (const member of members) {
    await sendSMS({
      memberId: member.id,
      type: 'MEETING_REMINDER',
      message: NotificationTemplates.meetingReminder(meeting.type.replace(/_/g, ' '), time)
    })
  }

  return members.length
}

export async function notifyLeaderboardChanges() {
  const currentMonth = new Date().toISOString().slice(0, 7)

  const reports = await prisma.monthlyReport.findMany({
    where: { month: currentMonth },
    include: { member: true },
    orderBy: { performanceScore: 'desc' }
  })

  for (let i = 0; i < reports.length; i++) {
    const report = reports[i]
    const rank = i + 1

    await sendSMS({
      memberId: report.memberId,
      type: 'LEADERBOARD',
      message: NotificationTemplates.leaderboardUpdate(report.member.name, rank, report.performanceScore)
    })
  }

  return reports.length
}
