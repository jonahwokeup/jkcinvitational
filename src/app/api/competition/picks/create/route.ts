import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Jonah McGowan (admin)
    if (session.user.email !== 'jonah@jkc.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { entryId, fixtureId, team } = await request.json()

    if (!entryId || !fixtureId || !team) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the fixture to find the gameweek
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: { gameweek: true }
    })

    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 400 })
    }

    // Check if pick already exists for this entry and gameweek
    const existingPick = await prisma.pick.findFirst({
      where: {
        entryId,
        gameweekId: fixture.gameweekId,
      },
    })

    if (existingPick) {
      return NextResponse.json({ error: 'Pick already exists for this gameweek' }, { status: 400 })
    }

    // Create the pick
    const pick = await prisma.pick.create({
      data: {
        entryId,
        gameweekId: fixture.gameweekId,
        fixtureId,
        team,
      },
      include: {
        entry: {
          include: {
            user: true,
          },
        },
        fixture: true,
      },
    })

    return NextResponse.json({ success: true, pick })
  } catch (error) {
    console.error('Error creating pick:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
