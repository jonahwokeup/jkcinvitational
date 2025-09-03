import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { id: competitionId } = await params
    const { searchParams } = new URL(request.url)
    const gameweekId = searchParams.get('gameweekId')

    if (!gameweekId) {
      return NextResponse.json({ success: false, error: 'Gameweek ID required' }, { status: 400 })
    }

    // Get the gameweek and its fixtures
    const gameweek = await prisma.gameweek.findUnique({
      where: { id: gameweekId },
      include: {
        fixtures: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      }
    })

    if (!gameweek) {
      return NextResponse.json({ success: false, error: 'Gameweek not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      fixtures: gameweek.fixtures
    })

  } catch (error) {
    console.error('Error fetching Exacto fixtures:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { id: competitionId } = await params
    const body = await request.json()
    const { entryId, gameweekId, fixtureId, homeGoals, awayGoals } = body

    if (!entryId || !gameweekId || !fixtureId || homeGoals === undefined || awayGoals === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Verify the entry belongs to the current user
    const entry = await prisma.entry.findFirst({
      where: {
        id: entryId,
        userId: session.user.id,
        competitionId
      }
    })

    if (!entry) {
      return NextResponse.json({ 
        success: false, 
        error: 'Entry not found or access denied' 
      }, { status: 404 })
    }

    // Check if user is eliminated (required for Exacto)
    if (entry.livesRemaining > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Exacto is only available for eliminated players' 
      }, { status: 400 })
    }

    // Check if the gameweek is locked (picks can't be changed)
    const gameweek = await prisma.gameweek.findUnique({
      where: { id: gameweekId }
    })

    if (!gameweek) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gameweek not found' 
      }, { status: 404 })
    }

    // Check if picks are locked (first fixture has started)
    const firstFixture = await prisma.fixture.findFirst({
      where: { gameweekId },
      orderBy: { kickoff: 'asc' }
    })

    if (firstFixture && new Date(firstFixture.kickoff) <= new Date()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Exacto submissions are locked - first fixture has started' 
      }, { status: 400 })
    }

    // Create or update Exacto prediction
    const exactoPrediction = await prisma.exactoPrediction.upsert({
      where: {
        entryId_gameweekId: {
          entryId,
          gameweekId
        }
      },
      update: {
        fixtureId,
        homeGoals,
        awayGoals,
        updatedAt: new Date()
      },
      create: {
        entryId,
        gameweekId,
        fixtureId,
        homeGoals,
        awayGoals
      }
    })

    return NextResponse.json({
      success: true,
      exactoPrediction
    })

  } catch (error) {
    console.error('Error submitting Exacto prediction:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
