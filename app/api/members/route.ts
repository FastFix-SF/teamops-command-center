import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const members = await prisma.member.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { tasks: true, timeEntries: true } }
    }
  })
  return NextResponse.json(members)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const member = await prisma.member.create({ data })
  return NextResponse.json(member, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()
  const member = await prisma.member.update({ where: { id }, data })
  return NextResponse.json(member)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.member.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
