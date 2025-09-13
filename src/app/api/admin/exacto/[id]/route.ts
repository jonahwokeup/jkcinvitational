import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
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

    const { id: predictionId } = await params
    const { entryId, gameweekId, fixtureId, homeGoals, awayGoals, competitionId } = await request.json()

    if (!entryId || !gameweekId || !fixtureId || homeGoals === undefined || awayGoals === undefined || !competitionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the exacto prediction exists
    const existingPrediction = await prisma.exactoPrediction.findUnique({
      where: { id: predictionId },
      include: {
        entry: true
      }
    })

    if (!existingPrediction) {
      return NextResponse.json({ error: 'Exacto prediction not found' }, { status: 404 })
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

    // Update the exacto prediction
    const updatedPrediction = await prisma.exactoPrediction.update({
      where: { id: predictionId },
      data: {
        entryId,
        gameweekId,
        fixtureId,
        homeGoals,
        awayGoals,
        updatedAt: new Date()
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
      exactoPrediction: updatedPrediction
    })

  } catch (error) {
    console.error('Error updating admin exacto prediction:', error)
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
    const session = await getServerSession(authOptions) as any

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Jonah McGowan (admin)
    if (session.user.email !== 'jonah@jkc.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: predictionId } = await params

    // Verify the exacto prediction exists
    const existingPrediction = await prisma.exactoPrediction.findUnique({
      where: { id: predictionId }
    })

    if (!existingPrediction) {
      return NextResponse.json({ error: 'Exacto prediction not found' }, { status: 404 })
    }

    // Delete the exacto prediction
    await prisma.exactoPrediction.delete({
      where: { id: predictionId }
    })

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Error deleting admin exacto prediction:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
