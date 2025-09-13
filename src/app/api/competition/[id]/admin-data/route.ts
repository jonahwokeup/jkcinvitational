import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as any

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Jonah McGowan (admin)
    if (session.user.email !== 'jonah@jkc.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: competitionId } = await params

    // Get competition data
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        entries: {
          include: {
            user: true
          }
        },
        gameweeks: {
          orderBy: { gameweekNumber: 'desc' },
          include: {
            fixtures: true
          }
        }
      }
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    // Get all Exacto predictions
    const allExactoPredictions = await prisma.exactoPrediction.findMany({
      where: {
        entry: {
          competitionId
        }
      },
      include: {
        entry: {
          include: {
            user: true
          }
        },
        gameweek: true,
        fixture: true
      },
      orderBy: [
        { gameweek: { gameweekNumber: 'desc' } },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      entries: competition.entries,
      gameweeks: competition.gameweeks,
      existingPredictions: allExactoPredictions
    })

  } catch (error) {
    console.error('Error fetching admin data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
