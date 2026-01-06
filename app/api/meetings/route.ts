import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyMeetingParticipants } from '@/lib/sms'

export async function GET() {
  const meetings = await prisma.meeting.findMany({
    include: {
      createdBy: { select: { id: true, name: true } },
      responses: {
        include: {
          member: { select: { id: true, name: true } },
          topPriorityTask: { select: { id: true, title: true, priority: true } }
        }
      }
    },
    orderBy: { startTime: 'desc' },
    take: 50
  })
  return NextResponse.json(meetings)
}

export async function POST(req: NextRequest) {
  const data = await req.json()

  const meeting = await prisma.meeting.create({
    data: {
      type: data.type,
      title: data.title || `${data.type.replace(/_/g, ' ')} - ${new Date().toLocaleDateString()}`,
      createdById: data.createdById,
      startTime: new Date()
    },
    include: { createdBy: { select: { id: true, name: true } } }
  })

  // Notify all team members
  if (data.sendNotifications) {
    await notifyMeetingParticipants(meeting.id)
  }

  return NextResponse.json(meeting, { status: 201 })
}

// Submit meeting response
export async function PUT(req: NextRequest) {
  const data = await req.json()

  const response = await prisma.meetingResponse.upsert({
    where: {
      meetingId_memberId: { meetingId: data.meetingId, memberId: data.memberId }
    },
    update: {
      whatImDoingNow: data.whatImDoingNow,
      topPriorityTaskId: data.topPriorityTaskId,
      statusUpdate: data.statusUpdate,
      progressPercentUpdate: data.progressPercentUpdate,
      blockers: data.blockers,
      nextActions: data.nextActions,
      confidence: data.confidence,
      submittedAt: new Date()
    },
    create: {
      meetingId: data.meetingId,
      memberId: data.memberId,
      whatImDoingNow: data.whatImDoingNow,
      topPriorityTaskId: data.topPriorityTaskId,
      statusUpdate: data.statusUpdate,
      progressPercentUpdate: data.progressPercentUpdate,
      blockers: data.blockers,
      nextActions: data.nextActions,
      confidence: data.confidence
    },
    include: {
      member: { select: { id: true, name: true } },
      topPriorityTask: { select: { id: true, title: true } }
    }
  })

  // Update task progress if provided
  if (data.topPriorityTaskId && data.progressPercentUpdate !== undefined) {
    await prisma.task.update({
      where: { id: data.topPriorityTaskId },
      data: {
        progressPercent: data.progressPercentUpdate,
        lastCheckinAt: new Date(),
        currentFocus: true
      }
    })
  }

  return NextResponse.json(response)
}
