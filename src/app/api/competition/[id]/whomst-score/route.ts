import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Submit fun Whomst score from minigames
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { score } = await request.json()
    
    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    const competitionId = params.id

    // Get user's current entry for this competition
    const userEntry = await prisma.entry.findFirst({
      where: {
        userId: session.user.id,
        competitionId
      }
    })

    if (!userEntry) {
      return NextResponse.json({ error: 'User not in this competition' }, { status: 404 })
    }

    // Save fun Whomst score
    const whomstScore = await prisma.whomstScore.create({
      data: {
        entryId: userEntry.id,
        competitionId,
        score,
        gameType: 'fun'
      }
    })

    return NextResponse.json({ 
      success: true, 
      score: whomstScore.score,
      id: whomstScore.id
    })
  } catch (error) {
    console.error('Error submitting Whomst score:', error)
    return NextResponse.json({ error: 'Failed to submit Whomst score' }, { status: 500 })
  }
}
