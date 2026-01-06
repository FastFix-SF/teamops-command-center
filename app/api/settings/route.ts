import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const settings = await prisma.setting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }]
  })
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const { key, value } = await req.json()

  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value, category: 'general' }
  })

  return NextResponse.json(setting)
}

export async function POST(req: NextRequest) {
  const { settings } = await req.json() // Array of { key, value, description, category }

  const results = []
  for (const s of settings) {
    const setting = await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description, category: s.category },
      create: { key: s.key, value: s.value, description: s.description, category: s.category || 'general' }
    })
    results.push(setting)
  }

  return NextResponse.json(results)
}
