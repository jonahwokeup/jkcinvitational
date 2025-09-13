import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const { entryId, gameweekId, fixtureId, homeGoals, awayGoals, competitionId } = await request.json()

    if (!entryId || !gameweekId || !fixtureId || homeGoals === undefined || awayGoals === undefined || !competitionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the entry exists and belongs to the competition
    const entry = await prisma.entry.findFirst({
      where: {
        id: entryId,
        competitionId
      }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Verify the gameweek exists and belongs to the competition
    const gameweek = await prisma.gameweek.findFirst({
      where: {
        id: gameweekId,
        competitionId
      }
    })

    if (!gameweek) {
      return NextResponse.json({ error: 'Gameweek not found' }, { status: 404 })
    }

    // Verify the fixture exists and belongs to the gameweek
    const fixture = await prisma.fixture.findFirst({
      where: {
        id: fixtureId,
        gameweekId
      }
    })

    if (!fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
    }

    // Check if exacto prediction already exists for this entry and gameweek
    const existingPrediction = await prisma.exactoPrediction.findFirst({
      where: {
        entryId,
        gameweekId
      }
    })

    if (existingPrediction) {
      return NextResponse.json({ error: 'Exacto prediction already exists for this entry and gameweek' }, { status: 400 })
    }

    // Create the exacto prediction
    const exactoPrediction = await prisma.exactoPrediction.create({
      data: {
        entryId,
        gameweekId,
        fixtureId,
        homeGoals,
        awayGoals
      },
      include: {
        entry: {
          include: {
            user: true
          }
        },
        gameweek: true,
        fixture: true
      }
    })

    return NextResponse.json({
      success: true,
      exactoPrediction
    })

  } catch (error) {
    console.error('Error creating admin exacto prediction:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
