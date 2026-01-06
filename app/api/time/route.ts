import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const month = searchParams.get('month')

  const where: any = {}
  if (memberId) where.memberId = memberId

  if (month) {
    const [year, m] = month.split('-').map(Number)
    where.date = {
      gte: new Date(year, m - 1, 1),
      lt: new Date(year, m, 1)
    }
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      member: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } }
    },
    orderBy: { date: 'desc' }
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const data = await req.json()

  // Get member's hourly rate if not provided
  let rate = data.hourlyRate
  if (rate === undefined && data.billable) {
    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      select: { hourlyRate: true }
    })
    rate = member?.hourlyRate || 100
  }

  const entry = await prisma.timeEntry.create({
    data: {
      memberId: data.memberId,
      taskId: data.taskId || null,
      date: new Date(data.date),
      durationMinutes: data.durationMinutes,
      category: data.category || 'INTERNAL',
      billable: data.billable || false,
      hourlyRate: rate,
      notes: data.notes
    },
    include: {
      member: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } }
    }
  })

  return NextResponse.json(entry, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()
  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined
    }
  })
  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.timeEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
