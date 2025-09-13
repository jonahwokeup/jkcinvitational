import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Jonah McGowan (admin)
    if (session.user.email !== 'jonah@jkc.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const gameweekId = searchParams.get('gameweekId')
    const competitionId = searchParams.get('competitionId')

    if (!gameweekId || !competitionId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Get fixtures for the specified gameweek
    const fixtures = await prisma.fixture.findMany({
      where: {
        gameweekId,
        gameweek: {
          competitionId
        }
      },
      orderBy: { kickoff: 'asc' }
    })

    return NextResponse.json({
      success: true,
      fixtures
    })

  } catch (error) {
    console.error('Error fetching fixtures:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
