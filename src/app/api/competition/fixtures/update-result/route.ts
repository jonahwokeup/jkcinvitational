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

    const { fixtureId, homeGoals, awayGoals } = await request.json()

    if (!fixtureId || homeGoals === undefined || awayGoals === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update the fixture result
    const updatedFixture = await prisma.fixture.update({
      where: { id: fixtureId },
      data: { 
        homeGoals: parseInt(homeGoals),
        awayGoals: parseInt(awayGoals),
        status: 'FINISHED'
      }
    })

    return NextResponse.json({ success: true, fixture: updatedFixture })
  } catch (error) {
    console.error('Error updating fixture result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
