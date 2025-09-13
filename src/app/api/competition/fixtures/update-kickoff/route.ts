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

    const { fixtureId, kickoff } = await request.json()

    if (!fixtureId || !kickoff) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Parse the kickoff time
    const kickoffDate = new Date(kickoff)
    
    if (isNaN(kickoffDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Update the fixture kickoff time
    const updatedFixture = await prisma.fixture.update({
      where: { id: fixtureId },
      data: { 
        kickoff: kickoffDate,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      fixture: updatedFixture,
      message: 'Fixture kickoff time updated successfully'
    })
  } catch (error) {
    console.error('Error updating fixture kickoff:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
