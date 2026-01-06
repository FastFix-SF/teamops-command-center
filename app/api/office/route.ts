import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Virtual Office API
 * GET - Get office state (all members with positions, statuses)
 * POST - Update member status/position
 * PUT - Send office message (wave, note, invite)
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const memberId = searchParams.get('memberId')

  // Get office zones
  if (action === 'zones') {
    let zones = await prisma.officeZone.findMany({
      orderBy: { createdAt: 'asc' }
    })

    // Create default zones if none exist
    if (zones.length === 0) {
      const defaultZones = [
        { name: 'Área de Trabajo', type: 'WORK_AREA', gridX: 0, gridY: 0, width: 8, height: 6, icon: '💻', color: '#F0F9FF' },
        { name: 'Sala de Reuniones A', type: 'MEETING_ROOM', gridX: 9, gridY: 0, width: 4, height: 3, icon: '🎯', color: '#FEF3C7', isBookable: true },
        { name: 'Sala de Reuniones B', type: 'MEETING_ROOM', gridX: 9, gridY: 4, width: 4, height: 3, icon: '📊', color: '#DBEAFE', isBookable: true },
        { name: 'Lounge', type: 'LOUNGE', gridX: 0, gridY: 7, width: 5, height: 3, icon: '☕', color: '#FCE7F3' },
        { name: 'Área de Café', type: 'BREAK_ROOM', gridX: 6, gridY: 7, width: 3, height: 3, icon: '🍵', color: '#D1FAE5' },
        { name: 'Lobby', type: 'LOBBY', gridX: 10, gridY: 8, width: 3, height: 2, icon: '🚪', color: '#E0E7FF' }
      ]

      for (const zone of defaultZones) {
        await prisma.officeZone.create({ data: zone })
      }

      zones = await prisma.officeZone.findMany({ orderBy: { createdAt: 'asc' } })
    }

    return NextResponse.json(zones)
  }

  // Get messages for a member
  if (action === 'messages' && memberId) {
    const messages = await prisma.officeMessage.findMany({
      where: { toId: memberId, read: false },
      include: {
        from: { select: { id: true, name: true, avatarStyle: true, avatarColor: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json(messages)
  }

  // Get activity feed
  if (action === 'activity') {
    const activities = await prisma.officeActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(activities)
  }

  // Get single member's workspot
  if (action === 'workspot' && memberId) {
    let workspot = await prisma.workspot.findUnique({
      where: { memberId },
      include: { member: { select: { name: true } } }
    })

    // Create default workspot if doesn't exist
    if (!workspot) {
      const memberCount = await prisma.workspot.count()
      const gridX = (memberCount % 4) * 2
      const gridY = Math.floor(memberCount / 4) * 2

      workspot = await prisma.workspot.create({
        data: { memberId, gridX, gridY },
        include: { member: { select: { name: true } } }
      })
    }

    return NextResponse.json(workspot)
  }

  // Default: Get full office state
  const members = await prisma.member.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      avatarStyle: true,
      avatarColor: true,
      avatarAccessories: true,
      officeStatus: true,
      statusMessage: true,
      lastSeenAt: true,
      currentZone: true,
      positionX: true,
      positionY: true,
      workspot: true
    }
  })

  // Auto-assign workspots to members without one
  for (const member of members) {
    if (!member.workspot) {
      const memberIndex = members.indexOf(member)
      const gridX = (memberIndex % 4) * 2
      const gridY = Math.floor(memberIndex / 4) * 2

      await prisma.workspot.create({
        data: { memberId: member.id, gridX, gridY }
      })
    }
  }

  // Refresh with workspots
  const membersWithWorkspots = await prisma.member.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      avatarStyle: true,
      avatarColor: true,
      avatarAccessories: true,
      officeStatus: true,
      statusMessage: true,
      lastSeenAt: true,
      currentZone: true,
      positionX: true,
      positionY: true,
      workspot: true
    }
  })

  const zones = await prisma.officeZone.findMany()

  // Calculate who's in each zone
  const zoneOccupancy: Record<string, number> = {}
  for (const member of membersWithWorkspots) {
    if (member.officeStatus !== 'OFFLINE') {
      zoneOccupancy[member.currentZone] = (zoneOccupancy[member.currentZone] || 0) + 1
    }
  }

  return NextResponse.json({
    members: membersWithWorkspots,
    zones,
    zoneOccupancy,
    stats: {
      total: membersWithWorkspots.length,
      online: membersWithWorkspots.filter(m => m.officeStatus === 'ONLINE').length,
      away: membersWithWorkspots.filter(m => m.officeStatus === 'AWAY').length,
      busy: membersWithWorkspots.filter(m => m.officeStatus === 'BUSY').length,
      inMeeting: membersWithWorkspots.filter(m => m.officeStatus === 'IN_MEETING').length,
      offline: membersWithWorkspots.filter(m => m.officeStatus === 'OFFLINE').length
    }
  })
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const { memberId, action } = data

  if (!memberId) {
    return NextResponse.json({ error: 'memberId required' }, { status: 400 })
  }

  // Update status
  if (action === 'status') {
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        officeStatus: data.status,
        statusMessage: data.statusMessage,
        lastSeenAt: new Date()
      }
    })

    // Log activity
    await prisma.officeActivity.create({
      data: {
        memberId,
        type: 'STATUS_CHANGE',
        details: JSON.stringify({ status: data.status, message: data.statusMessage })
      }
    })

    return NextResponse.json(member)
  }

  // Move to position
  if (action === 'move') {
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        positionX: data.x,
        positionY: data.y,
        currentZone: data.zone || 'desk',
        lastSeenAt: new Date()
      }
    })

    // Log zone change if moving to a specific zone
    if (data.zone && data.zone !== 'desk') {
      await prisma.officeActivity.create({
        data: {
          memberId,
          type: 'ZONE_ENTER',
          zoneId: data.zoneId,
          zoneName: data.zone
        }
      })
    }

    return NextResponse.json(member)
  }

  // Join office (come online)
  if (action === 'join') {
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        officeStatus: 'ONLINE',
        lastSeenAt: new Date(),
        currentZone: 'desk'
      }
    })

    await prisma.officeActivity.create({
      data: {
        memberId,
        type: 'JOINED',
        details: JSON.stringify({ memberName: member.name })
      }
    })

    return NextResponse.json(member)
  }

  // Leave office (go offline)
  if (action === 'leave') {
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        officeStatus: 'OFFLINE',
        lastSeenAt: new Date()
      }
    })

    await prisma.officeActivity.create({
      data: {
        memberId,
        type: 'LEFT',
        details: JSON.stringify({ memberName: member.name })
      }
    })

    return NextResponse.json(member)
  }

  // Update avatar
  if (action === 'avatar') {
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        avatarStyle: data.style,
        avatarColor: data.color,
        avatarAccessories: data.accessories ? JSON.stringify(data.accessories) : null
      }
    })

    return NextResponse.json(member)
  }

  // Update workspot/desk
  if (action === 'workspot') {
    const workspot = await prisma.workspot.upsert({
      where: { memberId },
      create: {
        memberId,
        deskStyle: data.deskStyle || 'modern',
        wallItems: data.wallItems ? JSON.stringify(data.wallItems) : null,
        deskItems: data.deskItems ? JSON.stringify(data.deskItems) : null,
        nameplate: data.nameplate,
        background: data.background || 'default'
      },
      update: {
        deskStyle: data.deskStyle,
        wallItems: data.wallItems ? JSON.stringify(data.wallItems) : undefined,
        deskItems: data.deskItems ? JSON.stringify(data.deskItems) : undefined,
        nameplate: data.nameplate,
        background: data.background
      }
    })

    return NextResponse.json(workspot)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function PUT(req: NextRequest) {
  const data = await req.json()
  const { fromId, toId, type, message } = data

  if (!fromId || !toId) {
    return NextResponse.json({ error: 'fromId and toId required' }, { status: 400 })
  }

  // Check if recipient is offline (leave message at desk)
  const recipient = await prisma.member.findUnique({
    where: { id: toId },
    select: { officeStatus: true, name: true }
  })

  const officeMessage = await prisma.officeMessage.create({
    data: {
      fromId,
      toId,
      type: type || 'NOTE',
      message: message || (type === 'WAVE' ? '👋' : ''),
      leftAtDesk: recipient?.officeStatus === 'OFFLINE'
    },
    include: {
      from: { select: { id: true, name: true } },
      to: { select: { id: true, name: true } }
    }
  })

  return NextResponse.json(officeMessage)
}

// Mark messages as read
export async function PATCH(req: NextRequest) {
  const { messageIds, memberId } = await req.json()

  if (messageIds && messageIds.length > 0) {
    await prisma.officeMessage.updateMany({
      where: { id: { in: messageIds } },
      data: { read: true, readAt: new Date() }
    })
  } else if (memberId) {
    // Mark all messages for this member as read
    await prisma.officeMessage.updateMany({
      where: { toId: memberId, read: false },
      data: { read: true, readAt: new Date() }
    })
  }

  return NextResponse.json({ success: true })
}
