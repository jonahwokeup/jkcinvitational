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
        fixtures: true
      }
    })

    if (!gameweek) {
      return NextResponse.json({ success: false, error: 'Gameweek not found' }, { status: 404 })
    }

    // Get user's entry to check teams already used
    const userEntry = await prisma.entry.findFirst({
      where: {
        userId: session.user.id,
        competitionId
      },
      include: {
        picks: {
          include: {
            gameweek: true
          }
        }
      }
    })

    if (!userEntry) {
      return NextResponse.json({ success: false, error: 'User entry not found' }, { status: 404 })
    }

    // Get teams already used in this round (including losing picks, but only from gameweeks where user survived)
    // Only consider picks from the current round by filtering based on round start time
    
    // Get the current round to determine when it started
    const currentRound = await prisma.round.findFirst({
      where: {
        competitionId,
        endedAt: null, // Current active round
      },
    })
    
    if (!currentRound) {
      return NextResponse.json({ success: false, error: 'No active round found' }, { status: 404 })
    }
    
    // Filter picks to only include those made after the current round started
    const usedTeams = userEntry.picks
      .filter(pick => {
        // Only include picks made after the current round started
        if (pick.createdAt < currentRound.createdAt) {
          return false
        }
        
        // Only include picks from gameweeks where the user actually survived
        // If user was eliminated in GW3, don't include their GW4 pick in "teams used"
        const pickGameweek = pick.gameweek
        const eliminatedInGw = userEntry.eliminatedAtGw
        
        // If user was eliminated, only include picks from gameweeks before elimination
        // But include the pick from the gameweek they were eliminated in
        if (eliminatedInGw && pickGameweek.gameweekNumber > eliminatedInGw) {
          return false
        }
        
        return pick.gameweek.competitionId === competitionId
      })
      .map(pick => pick.team)

    // Filter out fixtures involving teams already used
    const availableFixtures = gameweek.fixtures.filter(fixture => 
      !usedTeams.includes(fixture.homeTeam) && !usedTeams.includes(fixture.awayTeam)
    )

    return NextResponse.json({
      success: true,
      fixtures: availableFixtures,
      teamsUsed: usedTeams
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
    const { entryId, gameweekId, fixtureId, homeGoals, awayGoals, overwrite } = body

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

    // Check if user has already used their exacto in this round
    if (entry.usedExacto && !overwrite) {
      return NextResponse.json({ 
        success: false, 
        error: 'You have already used your exacto prediction for this round. You can only submit one exacto per round.' 
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

    // Mark that the user has used their exacto for this round
    await prisma.entry.update({
      where: { id: entryId },
      data: { usedExacto: true }
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

export async function DELETE(
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
    const { entryId, gameweekId } = body

    if (!entryId || !gameweekId) {
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

    // Check if the gameweek is locked (first fixture has started)
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

    // Delete the Exacto prediction
    await prisma.exactoPrediction.deleteMany({
      where: {
        entryId,
        gameweekId
      }
    })

    // Reset the usedExacto flag since user revoked their exacto
    await prisma.entry.update({
      where: { id: entryId },
      data: { usedExacto: false }
    })

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Error revoking Exacto prediction:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
