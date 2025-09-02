import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isBeforeLock } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: competitionId } = await params

    // Get the competition with gameweeks and current round
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        rounds: {
          where: { endedAt: null },
          include: {
            entries: {
              where: { userId: session.user.id },
              include: {
                picks: {
                  include: {
                    gameweek: true,
                  },
                },
                exactoPredictions: true,
              },
            },
          },
        },
        gameweeks: {
          orderBy: { gameweekNumber: 'asc' },
          include: {
            fixtures: {
              orderBy: { kickoff: 'asc' }
            }
          }
        },
      },
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    const currentRound = competition.rounds[0]
    if (!currentRound) {
      return NextResponse.json({ error: 'No active round found' }, { status: 404 })
    }

    const userEntry = currentRound.entries[0]
    if (!userEntry) {
      return NextResponse.json({ error: 'User not found in competition' }, { status: 404 })
    }

    // Find the next gameweek (scheduled gameweek)
    const scheduledGameweek = competition.gameweeks.find(gw => 
      isBeforeLock(gw.lockTime) && 
      !gw.isSettled && 
      (!gw.fixtures || gw.fixtures.every(fixture => new Date(fixture.kickoff) >= new Date()))
    )

    if (!scheduledGameweek) {
      return NextResponse.json({ error: 'No scheduled gameweek found' }, { status: 404 })
    }

    // Get teams the user has previously picked in this round
    const previouslyPickedTeams = userEntry.picks.map(pick => pick.team)

    // Filter fixtures to exclude those involving previously picked teams
    const availableFixtures = scheduledGameweek.fixtures.filter(fixture => 
      !previouslyPickedTeams.includes(fixture.homeTeam) && 
      !previouslyPickedTeams.includes(fixture.awayTeam)
    )

    // Get existing Exacto prediction if any
    const existingPrediction = userEntry.exactoPredictions[0] || null;

    return NextResponse.json({
      gameweek: {
        id: scheduledGameweek.id,
        number: scheduledGameweek.gameweekNumber,
        lockTime: scheduledGameweek.lockTime,
      },
      fixtures: availableFixtures.map(fixture => ({
        id: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        kickoff: fixture.kickoff,
      })),
      previouslyPickedTeams,
      existingPrediction: existingPrediction ? {
        fixtureId: existingPrediction.fixtureId,
        homeScore: existingPrediction.homeScore,
        awayScore: existingPrediction.awayScore,
        // Include all fixtures so we can find the one for the existing prediction
        allFixtures: scheduledGameweek.fixtures.map(fixture => ({
          id: fixture.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          kickoff: fixture.kickoff,
        })),
      } : null,
    })

  } catch (error) {
    console.error('Exacto API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: competitionId } = await params
    const { fixtureId, homeScore, awayScore } = await request.json()

    // Validate input
    if (!fixtureId || typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      return NextResponse.json({ error: 'Invalid prediction data' }, { status: 400 })
    }

    if (homeScore < 0 || awayScore < 0 || homeScore > 10 || awayScore > 10) {
      return NextResponse.json({ error: 'Scores must be between 0 and 10' }, { status: 400 })
    }

    // Get the competition and current round
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        rounds: {
          where: { endedAt: null },
          include: {
            entries: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    const currentRound = competition.rounds[0]
    if (!currentRound) {
      return NextResponse.json({ error: 'No active round found' }, { status: 404 })
    }

    const userEntry = currentRound.entries[0]
    if (!userEntry) {
      return NextResponse.json({ error: 'User not found in competition' }, { status: 404 })
    }

    // Check if user has already used Exacto - if so, allow editing
    if (userEntry.usedExacto) {
      // Find existing prediction and update it
      const existingPrediction = await prisma.exactoPrediction.findUnique({
        where: { entryId: userEntry.id }
      });

      if (existingPrediction) {
        // Update existing prediction
        const updatedPrediction = await prisma.exactoPrediction.update({
          where: { id: existingPrediction.id },
          data: {
            fixtureId: fixtureId,
            homeScore: homeScore,
            awayScore: awayScore,
          },
        });

        return NextResponse.json({
          success: true,
          prediction: updatedPrediction,
          message: 'Exacto prediction updated successfully'
        });
      }
    }

    // Create new Exacto prediction
    const exactoPrediction = await prisma.exactoPrediction.create({
      data: {
        entryId: userEntry.id,
        fixtureId: fixtureId,
        homeScore: homeScore,
        awayScore: awayScore,
      },
    })

    // Mark that the user has used their Exacto
    await prisma.entry.update({
      where: { id: userEntry.id },
      data: { usedExacto: true },
    })

    return NextResponse.json({
      success: true,
      prediction: exactoPrediction,
    })

  } catch (error) {
    console.error('Exacto prediction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
